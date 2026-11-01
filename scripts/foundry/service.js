import { ID, VERSION, LIMITS } from "../core/constants.js";
import { assert, uid, jsonBytes, jsonParse, sha256, safePath, publicSourceURL, abort, clone, walk, setAt } from "../core/util.js";
import { validateScene, assetsOf, imageSource, rewriteAssets, prepareWorldCopy, sceneWarnings } from "../core/scene.js";
import { mediaType, imageInfo, archiveAssetFilename } from "../core/media.js";
import { exportPackage } from "../core/package.js";
import { ROOT, requireGM } from "./storage.js";

// Foundry Collection's default iterator yields Module objects, not Map entries.
const activeModuleIds = () => new Set(Array.from(globalThis.game?.modules?.values() ?? [])
  .filter(module => module.active).map(module => module.id));

export class LibraryService {
  constructor(storage, { permission = requireGM, imageInspector = imageInfo } = {}) {
    this.storage = storage; this.permission = permission; this.imageInspector = imageInspector;
  }
  async plan(candidate, { signal, progress = () => {} } = {}) {
    this.permission();
    const scene = validateScene(candidate.scene);
    const bytes = jsonBytes(scene), hash = await sha256(bytes);
    const assets = []; let total = bytes.length;
    const references = assetsOf(scene);
    for (const [index, asset] of references.entries()) {
      abort(signal);
      let payload = candidate.mappings?.get(asset.source), reason;
      try {
        if (!payload) {
          safePath(asset.source); // No external or inline fetch, no redirected local requests.
          payload = { name: asset.source, bytes: await this.storage.read(asset.source, signal) };
        }
        const mime = mediaType(payload.bytes, asset.source);
        total += payload.bytes.length; assert(total <= LIMITS.expanded, "Karte überschreitet das Arbeitsspeicherlimit von 256 MiB.");
        assets.push({ ...asset, bytes: payload.bytes, mime, hash: await sha256(payload.bytes) });
      } catch (error) {
        abort(signal);
        reason = error.message;
        assets.push({ ...asset, bytes: null, reason });
      }
      progress(index + 1, Math.max(1, references.length));
    }
    const source = imageSource(scene), main = assets.find(a => a.source === source && a.bytes && a.mime.startsWith("image/"));
    let info = candidate.info ?? null;
    if (!info && main) {
      try { info = await this.imageInspector(main.bytes, main.source); }
      catch { /* A thumbnail failure never discards an otherwise valid scene. */ }
    }
    const warnings = sceneWarnings(scene, {
      modules: activeModuleIds(),
      sceneIds: new Set(globalThis.game?.scenes?.map(s => s.id) ?? [])
    });
    for (const asset of assets.filter(a => !a.bytes)) warnings.push({ code: "asset", message: `Asset nicht gesichert: ${asset.source} (${asset.reason})` });
    return { scene, bytes, hash, assets, info, warnings, metadata: candidate.metadata ?? {}, name: candidate.name ?? scene.name, total };
  }
  async archive(plan, metadata, { signal, allowMissing = false, allowDuplicate = false, updateId = null, expectedRevision = null, progress = () => {} } = {}) {
    this.permission(); abort(signal);
    assert(allowMissing || plan.assets.every(a => a.bytes), "Fehlende Assets ausdrücklich bestätigen oder zuordnen.");
    const { catalog } = await this.storage.load();
    const existing = updateId ? catalog.entries.find(e => e.id === updateId) : null;
    assert(!updateId || existing && !existing.archived && existing.revision === expectedRevision, "Vorlage wurde verändert oder gelöscht; neue Revision vor dem Speichern prüfen.");
    assert(allowDuplicate || updateId || !catalog.entries.some(e => !e.archived && e.hash === plan.hash), "Identische Szenendaten sind bereits archiviert. Dublette ausdrücklich bestätigen.");
    assert(catalog.categories.some(c => c.id === metadata.category), "Kategorie existiert nicht.");
    const id = existing?.id ?? uid(), revision = uid(), folder = `${ROOT}/maps/${id}/${revision}`;
    const record = {
      id, revision, name: String(metadata.name || plan.name).slice(0, 300),
      description: String(metadata.description || "").slice(0, 10000),
      tags: [...new Set(String(metadata.tags || "").split(",").map(t => t.trim()).filter(Boolean))].slice(0, 100),
      author: String(metadata.author || "").slice(0, 300), source: publicSourceURL(metadata.source || ""),
      license: String(metadata.license || "").slice(0, 1000), category: metadata.category,
      scene: `${folder}/scene.json`, hash: plan.hash, assets: [], thumbnail: null,
      width: plan.scene.width ?? plan.info?.width ?? null, height: plan.scene.height ?? plan.info?.height ?? null,
      grid: clone(plan.scene.grid ?? {}), levels: plan.scene.levels?.length ?? 0,
      bytes: plan.total, created: existing?.created ?? new Date().toISOString(), updated: new Date().toISOString(),
      favorite: existing?.favorite ?? false, profile: "local", moduleVersion: VERSION,
      foundryVersion: globalThis.game?.version ?? "unknown",
      history: existing ? [...(existing.history ?? []), { revision: existing.revision, scene: existing.scene, hash: existing.hash,
        assets: existing.assets, thumbnail: existing.thumbnail, updated: existing.updated }] : [],
      warnings: plan.warnings.map(w => ({ code: w.code, message: w.message }))
    };
    // Every write has a fresh revision path. Failure leaves unreferenced files,
    // never an overwritten scene. Catalog commit is the only visibility point.
    await this.storage.upload(record.scene, plan.bytes);
    const uploaded = new Map();
    for (const [index, asset] of plan.assets.entries()) {
      abort(signal); this.permission();
      let path = null;
      if (asset.bytes) {
        const key = `${asset.hash}.${asset.extension}`;
        path = uploaded.get(key);
        if (!path) {
          path = `${folder}/assets/${archiveAssetFilename(asset.source, asset.hash)}`;
          await this.storage.upload(path, asset.bytes, asset.mime); uploaded.set(key, path);
        }
      }
      record.assets.push({ source: asset.source, path, hash: asset.hash ?? null, extension: asset.extension,
        mime: asset.mime, bytes: asset.bytes?.length ?? 0, missing: !path });
      progress(index + 1, Math.max(1, plan.assets.length));
    }
    if (plan.info?.thumbnail) {
      record.thumbnail = `${folder}/thumbnail.webp`;
      await this.storage.upload(record.thumbnail, plan.info.thumbnail, "image/webp");
    }
    abort(signal);
    await this.storage.upload(`${folder}/metadata.json`, jsonBytes(record));
    await this.storage.transaction(current => {
      abort(signal); this.permission();
      const index = current.entries.findIndex(e => e.id === id);
      if (existing) {
        assert(index >= 0 && !current.entries[index].archived && current.entries[index].revision === expectedRevision, "Zwischenzeitliche Vorlagenänderung erkannt. Neue Dateien sind unverknüpft erhalten.");
        current.entries[index] = record;
      } else {
        assert(allowDuplicate || !current.entries.some(e => !e.archived && e.hash === plan.hash), "Zwischenzeitlich wurde dieselbe Szene archiviert.");
        current.entries.push(record);
      }
      return current;
    });
    return record;
  }
  async preflight(record, { signal } = {}) {
    this.permission();
    const bytes = await this.storage.read(record.scene, signal, LIMITS.json);
    assert(await sha256(bytes) === record.hash, "Szenendatei verändert oder beschädigt. Weltimport abgebrochen.");
    const scene = validateScene(jsonParse(bytes));
    const warnings = sceneWarnings(scene, {
      modules: activeModuleIds(),
      sceneIds: new Set(game.scenes.map(s => s.id))
    });
    for (const asset of record.assets) {
      if (!asset.path) { warnings.push({ code: "asset", message: `Asset fehlt: ${asset.source}` }); continue; }
      try {
        const payload = await this.storage.read(asset.path, signal);
        assert(await sha256(payload) === asset.hash, "Prüfsumme abweichend");
      } catch (error) {
        abort(signal); warnings.push({ code: "asset", message: `Asset unlesbar oder verändert: ${asset.source} (${error.message})` });
      }
    }
    return { scene, warnings };
  }
  async importToWorld(record, { includeModuleFlags = false, reviewedAutomation = false, allowMissing = false, signal } = {}) {
    this.permission();
    assert(!includeModuleFlags || reviewedAutomation, "Drittanbieter-Daten vor der Übernahme ausdrücklich prüfen.");
    const { scene, warnings } = await this.preflight(record, { signal });
    assert(allowMissing || !warnings.some(w => w.code === "asset"), "Fehlende/beschädigte Assets vor dem Import bestätigen.");
    const rewritten = rewriteAssets(scene, new Map(record.assets.filter(a => a.path).map(a => [a.source, a.path])));
    const data = prepareWorldCopy(rewritten, { id: record.id, revision: record.revision, name: record.name, includeModuleFlags, reviewedAutomation });
    // A new root ID, stable embedded IDs: preserve Level and Region relationships.
    const newId = foundry.utils.randomID();
    if (scene._id) for (const item of walk(data)) {
      const prefix = `Scene.${scene._id}`;
      if (item.value === prefix || item.value.startsWith(`${prefix}.`)) setAt(data, item.path, `Scene.${newId}${item.value.slice(prefix.length)}`);
      else if (/sceneId$/i.test(item.key) && item.value === scene._id) setAt(data, item.path, newId);
    }
    data._id = newId;
    abort(signal); this.permission();
    const created = await CONFIG.Scene.documentClass.create(data, { keepId: true, keepEmbeddedIds: true, renderSheet: false });
    assert(created, "Foundry hat die Szene nicht erstellt; Validierung oder ein anderer Modul-Hook hat den Import abgebrochen.");
    return created;
  }
  async updateMetadata(ids, changes) {
    this.permission();
    const allowed = ["category", "favorite", "name", "description", "author", "source", "license", "tags"];
    assert(Object.keys(changes).every(k => allowed.includes(k)), "Unzulässige Metadatenänderung.");
    if (changes.source) changes = { ...changes, source: publicSourceURL(changes.source) };
    return this.storage.transaction(catalog => {
      for (const id of ids) {
        const entry = catalog.entries.find(e => e.id === id); assert(entry, "Eintrag nicht gefunden.");
        Object.assign(entry, clone(changes), { updated: new Date().toISOString() });
      }
      return catalog;
    });
  }
  async setDeleted(records, deleted, { signal } = {}) {
    this.permission(); abort(signal);
    assert(records.length && new Set(records.map(r => r.id)).size === records.length, "Keine eindeutige Kartenauswahl.");
    assert(typeof deleted === "boolean", "Ungültiger Papierkorbstatus.");
    return this.storage.transaction(catalog => {
      this.permission(); abort(signal);
      // Validate the whole selection before changing any entry. A dialog must
      // never delete a revision that was replaced while the dialog was open.
      const entries = records.map(record => {
        const entry = catalog.entries.find(e => e.id === record.id);
        assert(entry && entry.revision === record.revision && entry.updated === record.updated &&
          Boolean(entry.archived) === Boolean(record.archived), "Karte wurde zwischenzeitlich geändert. Bibliothek neu laden und Auswahl prüfen.");
        assert(Boolean(entry.archived) !== deleted, "Karte befindet sich bereits im gewünschten Zustand.");
        return entry;
      });
      const now = new Date().toISOString();
      for (const entry of entries) {
        entry.archived = deleted; entry.updated = now;
        if (deleted) entry.deletedAt = now; else delete entry.deletedAt;
      }
      // Assets can be referenced by existing world scenes and older snapshots.
      // Retain all bytes; this is an explicit, reversible catalog deletion.
      return catalog;
    });
  }
  async export(catalog, records, options) {
    this.permission();
    return exportPackage(catalog, records, (path, signal) => this.storage.read(path, signal), options);
  }
}
