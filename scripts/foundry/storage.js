import { ID, LIMITS } from "../core/constants.js";
import { safePath, safeId, assert, uid, jsonBytes, jsonParse, abort } from "../core/util.js";
import { emptyCatalog, validateCatalog } from "../core/catalog.js";

export const ROOT = `modules/${ID}/storage`;
export function requireGM() { assert(game.user?.isGM, "Nur Spielleitungen dürfen die Bibliothek verwalten."); }
export function localURL(path) {
  safePath(path);
  const base = new URL(document.baseURI);
  // Scene paths may already contain URI escapes such as %20. Decode each
  // component once before encoding it, preserving escapes without doubling %.
  const encoded = path.split("/").map(part => encodeURIComponent(decodeURIComponent(part))).join("/");
  return new URL(encoded, base).href;
}

export class FoundryStorage {
  constructor({ picker = () => foundry.applications.apps.FilePicker.implementation,
    fetcher = (...args) => fetch(...args), permission = requireGM } = {}) {
    this.picker = picker; this.fetcher = fetcher; this.permission = permission;
    this.pending = Promise.resolve();
  }
  async directory(path) {
    this.permission(); safePath(path);
    try { await this.picker().browse("data", path); }
    catch {
      try { await this.picker().createDirectory("data", path, { notify: false }); }
      catch (error) {
        try { await this.picker().browse("data", path); }
        catch { throw new Error(`Ordner nicht verfügbar: ${path}. ${error.message || "Rechte prüfen."}`); }
      }
    }
  }
  async init() {
    this.permission();
    await this.directory(ROOT);
    await this.directory(`${ROOT}/catalogs`);
    await this.directory(`${ROOT}/maps`);
  }
  async read(path, signal, max = LIMITS.file) {
    this.permission(); safePath(path); abort(signal);
    const controller = new AbortController();
    const onAbort = () => controller.abort(signal.reason);
    signal?.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(new Error("Zeitlimit beim Dateilesen erreicht.")), 60000);
    try {
      const response = await this.fetcher(localURL(path), { cache: "no-store", credentials: "same-origin", signal: controller.signal, redirect: "error" });
      assert(response.ok, `Datei nicht lesbar (${response.status}): ${path}`);
      assert(Number(response.headers.get("content-length") || 0) <= max, "Datei überschreitet das Größenlimit.");
      assert(response.body, "Leere Dateiantwort.");
      const reader = response.body.getReader(), chunks = []; let total = 0;
      try {
        while (true) {
          const { value, done } = await reader.read(); if (done) break;
          abort(signal); total += value.length;
          assert(total <= max, "Tatsächliche Dateigröße überschreitet das Limit."); chunks.push(value);
        }
      } catch (error) { await reader.cancel().catch(() => {}); throw error; }
      const bytes = new Uint8Array(total); let at = 0;
      for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; }
      return bytes;
    } finally { clearTimeout(timer); signal?.removeEventListener("abort", onAbort); }
  }
  async upload(path, bytes, mime = "application/json") {
    this.permission(); safePath(path);
    assert(path.startsWith(`${ROOT}/`), "Schreiben ist nur im eigenen persistenten Modulordner erlaubt.");
    assert(bytes.length <= LIMITS.file, "Datei überschreitet das Uploadlimit.");
    const relative = path.slice(ROOT.length + 1).split("/"), name = relative.pop();
    let parent = ROOT;
    for (const part of relative) { parent += `/${part}`; await this.directory(parent); }
    this.permission();
    const result = await this.picker().uploadPersistent(ID, relative.join("/"), new File([bytes], name, { type: mime }), {}, { notify: false });
    assert(result && !result.error && typeof result.path === "string", "Foundry hat den Datei-Upload abgelehnt.");
    const actual = decodeURIComponent(result.path).replace(/^\//, "");
    assert(actual === path, "Foundry hat den Uploadpfad verändert. Katalog wird nicht aktualisiert.");
    return path;
  }
  async heads() {
    this.permission();
    const result = await this.picker().browse("data", `${ROOT}/catalogs`);
    assert(Array.isArray(result.files), "Foundry hat keine Dateiliste geliefert.");
    const snapshots = result.files.map(path => decodeURIComponent(path).split("/").pop())
      .map(name => ({ name, match: /^c\.([a-f0-9]{32})\.(root|[a-f0-9]{32})\.json$/.exec(name) })).filter(s => s.match);
    const parents = new Set(snapshots.map(s => s.match[2]));
    return snapshots.filter(s => !parents.has(s.match[1]));
  }
  async load() {
    const heads = await this.heads();
    assert(heads.length <= 1, "Katalogkonflikt: mehrere gleichzeitige Revisionen. Keine Daten überschrieben. Wiederherstellung: docs/RECOVERY.md.");
    if (!heads.length) return { catalog: emptyCatalog(), head: "root" };
    const data = jsonParse(await this.read(`${ROOT}/catalogs/${heads[0].name}`, undefined, LIMITS.json));
    assert(data.revision === heads[0].match[1] && data.parent === heads[0].match[2], "Katalogrevision stimmt nicht mit dem Dateinamen überein.");
    return { catalog: validateCatalog(data.catalog), head: data.revision };
  }
  transaction(mutate) {
    const run = async () => {
      this.permission();
      const { catalog, head } = await this.load();
      const next = validateCatalog(await mutate(structuredClone(catalog)));
      const current = await this.heads();
      assert(current.length === (head === "root" ? 0 : 1) && (head === "root" || current[0].match[1] === head),
        "Katalog wurde zwischenzeitlich geändert. Bitte neu laden.");
      const revision = safeId(uid());
      const bytes = jsonBytes({ revision, parent: head, created: new Date().toISOString(), catalog: next });
      assert(bytes.length <= LIMITS.json, "Katalog überschreitet das Alpha-Limit von 16 MiB. Kein Katalog wurde geschrieben.");
      await this.upload(`${ROOT}/catalogs/c.${revision}.${head}.json`, bytes);
      const after = await this.heads();
      assert(after.length === 1, "Gleichzeitige Schreibvorgänge erkannt. Beide Revisionen sind erhalten; Konflikt vor weiterer Bearbeitung auflösen.");
      return next;
    };
    const task = this.pending.then(() => globalThis.navigator?.locks ?
      navigator.locks.request("ddb-bridge-catalog", run) : run());
    this.pending = task.catch(() => {});
    return task;
  }
}
