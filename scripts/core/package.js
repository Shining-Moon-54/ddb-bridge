import { FORMAT, MEDIA } from "./constants.js";
import { assert, safePath, jsonParse, jsonBytes, sha256, basename, extension, abort } from "./util.js";
import { assetsOf, validateScene, simpleScene } from "./scene.js";
import { mediaType, imageInfo, archiveAssetFilename } from "./media.js";
import { packZip, unpackZip } from "./zip.js";

export async function exportPackage(catalog, records, read, { signal, progress = () => {} } = {}) {
  assert(records.length, "Keine Karten ausgewählt.");
  const files = new Map(), entries = [];
  let retained = 0;
  const add = (path, bytes) => {
    if (files.has(`Map-Library/${path}`)) return;
    retained += bytes.length;
    assert(retained < 127 * 1024 * 1024, "Exportlimit erreicht; Auswahl verkleinern.");
    files.set(`Map-Library/${path}`, bytes);
  };
  for (const [index, record] of records.entries()) {
    abort(signal);
    const folder = `maps/${record.id}/${record.revision}`;
    const scene = await read(record.scene, signal);
    assert(await sha256(scene) === record.hash, "Szenen-Prüfsumme stimmt nicht; Export abgebrochen.");
    const portable = { ...record, scene: `${folder}/scene.json`, thumbnail: null, assets: [] };
    add(portable.scene, scene);
    const assetPaths = new Map();
    for (const asset of record.assets) {
      abort(signal);
      if (!asset.path) { portable.assets.push({ ...asset, path: null }); continue; }
      const bytes = await read(asset.path, signal);
      assert(await sha256(bytes) === asset.hash, "Asset-Prüfsumme stimmt nicht; Export abgebrochen.");
      const key = `${asset.hash}.${asset.extension}`;
      const path = assetPaths.get(key) ?? `${folder}/assets/${archiveAssetFilename(asset.source, asset.hash)}`;
      assetPaths.set(key, path);
      add(path, bytes); portable.assets.push({ ...asset, path });
    }
    if (record.thumbnail) {
      portable.thumbnail = `${folder}/thumbnail.webp`;
      add(portable.thumbnail, await read(record.thumbnail, signal));
    }
    add(`${folder}/metadata.json`, jsonBytes(portable)); entries.push(portable);
    progress(index + 1, records.length);
  }
  add("library.json", jsonBytes({ format: FORMAT, exportedAt: new Date().toISOString(), categories: catalog.categories, entries }));
  add("categories.json", jsonBytes(catalog.categories));
  const checksums = Object.create(null);
  for (const [path, bytes] of files) checksums[path.slice(12)] = await sha256(bytes);
  add("checksums.json", jsonBytes(checksums));
  return packZip(files);
}

export async function inspectPackage(bytes, options = {}) {
  const files = await unpackZip(bytes, options);
  const own = files.has("Map-Library/library.json");
  if (own) {
    const library = jsonParse(files.get("Map-Library/library.json"));
    assert(library?.format === FORMAT && Array.isArray(library.entries) && Array.isArray(library.categories), "Unbekanntes Paketformat.");
    assert(files.has("Map-Library/checksums.json"), "Paket-Prüfsummen fehlen.");
    const sums = jsonParse(files.get("Map-Library/checksums.json"));
    for (const [path, hash] of Object.entries(sums)) {
      safePath(path); const data = files.get(`Map-Library/${path}`);
      assert(data && await sha256(data) === hash, `Prüfsummenfehler: ${path}`);
    }
    for (const path of files.keys()) assert(path === "Map-Library/checksums.json" ||
      path.startsWith("Map-Library/") && Object.hasOwn(sums, path.slice(12)), `Ungeprüfte Paketdatei: ${path}`);
    const candidates = library.entries.map(record => {
      safePath(record.scene);
      const data = files.get(`Map-Library/${record.scene}`); assert(data, "Szenendatei fehlt im Paket.");
      const scene = validateScene(jsonParse(data));
      const mappings = new Map();
      for (const asset of record.assets || []) if (asset.path) {
        safePath(asset.path);
        const payload = files.get(`Map-Library/${asset.path}`); assert(payload, "Paket-Asset fehlt.");
        mappings.set(asset.source, { bytes: payload, name: `Map-Library/${asset.path}` });
      }
      return { name: record.name || scene.name, scene, mappings, metadata: record, sourceFile: record.scene };
    });
    return { own, candidates, files, categories: library.categories, ignored: [] };
  }
  // Foreign ZIP: exact relative references first, a basename only if unique.
  const candidates = [], usedImages = new Set(), ignored = [];
  for (const [path, data] of files) if (extension(path) === "json") {
    let scene;
    try { scene = validateScene(jsonParse(data)); } catch { ignored.push(path); continue; }
    const mappings = new Map();
    const directory = path.split("/").slice(0, -1).join("/");
    for (const asset of assetsOf(scene)) {
      const relative = [directory, asset.source].filter(Boolean).join("/");
      let matches = files.has(relative) ? [relative] : files.has(asset.source) ? [asset.source] :
        [...files.keys()].filter(name => basename(name) === basename(asset.source));
      if (matches.length === 1) {
        const name = matches[0]; mappings.set(asset.source, { bytes: files.get(name), name }); usedImages.add(name);
      }
    }
    candidates.push({ name: scene.name, scene, mappings, metadata: {}, sourceFile: path });
  }
  const images = [...files.keys()].filter(name => ["png", "jpg", "jpeg", "webp"].includes(extension(name)) && !usedImages.has(name));
  for (const path of files.keys()) if (!MEDIA[extension(path)] && extension(path) !== "json") ignored.push(path);
  return { own, candidates, images, files, categories: [], ignored };
}

export async function imageCandidate(bytes, name) {
  mediaType(bytes, name);
  const info = await imageInfo(bytes, name);
  const title = basename(name).replace(/\.[^.]+$/, "");
  return { name: title, scene: simpleScene({ name: title, path: name, ...info }),
    mappings: new Map([[name, { bytes, name }]]), metadata: {}, info, sourceFile: name };
}
