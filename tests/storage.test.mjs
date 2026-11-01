import test from "node:test";
import assert from "node:assert/strict";
import { FoundryStorage, ROOT, localURL } from "../scripts/foundry/storage.js";
import { emptyCatalog } from "../scripts/core/catalog.js";
import { jsonBytes } from "../scripts/core/util.js";
import { LibraryService } from "../scripts/foundry/service.js";
import { inspectPackage } from "../scripts/core/package.js";
import { png, runtime } from "./helpers.mjs";

function setup() {
  globalThis.document = { baseURI: "https://foundry.example/vtt/game" };
  const files = new Map(), directories = new Set(["modules/ddb-bridge"]);
  let permitted = true;
  const picker = {
    async browse(source, path) {
      if (!directories.has(path)) throw new Error("Missing directory");
      return { files: [...files.keys()].filter(p => p.slice(0, p.lastIndexOf("/")) === path) };
    },
    async createDirectory(source, path) { directories.add(path); return { path }; },
    async uploadPersistent(id, folder, file) { const path = `${ROOT}/${folder ? folder + "/" : ""}${file.name}`; files.set(path, new Uint8Array(await file.arrayBuffer())); return { path }; }
  };
  const fetcher = async url => {
    // A static file server decodes the request path once before looking it up.
    const path = decodeURIComponent(new URL(url).pathname.slice("/vtt/".length));
    return files.has(path) ? new Response(files.get(path)) : new Response(null, { status: 404 });
  };
  const storage = new FoundryStorage({ picker: () => picker, fetcher, permission: () => { if (!permitted) throw new Error("Denied"); } });
  return { storage, files, picker, deny: () => { permitted = false; } };
}

test("local asset URLs respect reverse proxy route prefix", () => {
  setup(); assert.equal(localURL("modules/ddb-bridge/storage/maps/test.png"), "https://foundry.example/vtt/modules/ddb-bridge/storage/maps/test.png");
});
test("local URLs encode spaces, Unicode and reserved filename characters exactly once", () => {
  setup();
  for (const [path, encoded] of [
    ["worlds/test/Test Scene/Map 01.png", "worlds/test/Test%20Scene/Map%2001.png"],
    ["worlds/test/Test%20Scene/Map%2001.png", "worlds/test/Test%20Scene/Map%2001.png"],
    ["worlds/test/Test%20Scene/Map 01.png", "worlds/test/Test%20Scene/Map%2001.png"],
    ["worlds/test/Höhle/Grüner Wald.png", "worlds/test/H%C3%B6hle/Gr%C3%BCner%20Wald.png"],
    ["worlds/test/H%C3%B6hle/Gr%C3%BCner%20Wald.png", "worlds/test/H%C3%B6hle/Gr%C3%BCner%20Wald.png"],
    ["worlds/test/Room #1 + roof?.png", "worlds/test/Room%20%231%20%2B%20roof%3F.png"],
    ["worlds/test/Room%20%231%20%2B%20roof%3F.png", "worlds/test/Room%20%231%20%2B%20roof%3F.png"],
    ["worlds/test/100%25%20map.png", "worlds/test/100%25%20map.png"],
    ["worlds/test/literal%2520name.png", "worlds/test/literal%2520name.png"]
  ]) assert.equal(localURL(path), `https://foundry.example/vtt/${encoded}`, path);
});
test("URL normalization still rejects unsafe paths and malformed escapes", () => {
  setup();
  for (const path of ["../map.png", "worlds/%2e%2e/%2e%2e/map.png", "%2Fetc/map.png", "worlds/a%5Cb.png",
    "https://example.org/map.png", "//example.org/map.png", "worlds/a%00.png", "worlds/%E0%A4%A.png"]) {
    assert.throws(() => localURL(path), /pfad|Archiv|kodierung/i, path);
  }
});
test("encoded server filenames survive archive, portable export and world import", async () => {
  runtime(); const { storage, files } = setup(); await storage.init();
  const source = "worlds/test/Test%20Scene/Map%2001.png";
  files.set("worlds/test/Test Scene/Map 01.png", png);
  const scene = { name: "Synthetic map", width: 1, height: 1, levels: [{ background: { src: source } }], tokens: [] };
  const original = structuredClone(scene);
  const service = new LibraryService(storage, { imageInspector: async () => null });
  const plan = await service.plan({ scene });
  assert.deepEqual(plan.assets[0].bytes, png);
  assert(!plan.warnings.some(w => w.code === "asset"));
  const record = await service.archive(plan, { name: scene.name, category: "uncategorized" });
  assert.match(record.assets[0].path, /\/Map_01_[a-f0-9]{64}\.png$/);
  assert(!/\s|%20/i.test(record.assets[0].path));
  assert.deepEqual(files.get("worlds/test/Test Scene/Map 01.png"), png);
  const exported = await inspectPackage(await service.export((await storage.load()).catalog, [record]));
  assert.equal(exported.candidates[0].scene.levels[0].background.src, source);
  assert.deepEqual(exported.candidates[0].mappings.get(source).bytes, png);
  assert.match(exported.candidates[0].metadata.assets[0].path, /\/Map_01_[a-f0-9]{64}\.png$/);
  globalThis.CONFIG = { Scene: { documentClass: { create: async data => data } } };
  const imported = await service.importToWorld(record);
  assert.equal(imported.levels[0].background.src, record.assets[0].path);
  assert.deepEqual(scene, original);
});
test("persistent storage initializes and serializes queued catalog changes", async () => {
  const { storage, files } = setup(); await storage.init();
  assert.equal((await storage.load()).head, "root");
  await Promise.all([storage.transaction(c => { c.categories[0].name = "First"; return c; }), storage.transaction(c => { c.categories[1].name = "Second"; return c; })]);
  const result = await storage.load(); assert.equal(result.catalog.categories[0].name, "First"); assert.equal(result.catalog.categories[1].name, "Second");
  assert.equal(files.size, 2); assert.equal((await storage.heads()).length, 1);
});
test("concurrent catalog forks are detected and both immutable snapshots survive", async () => {
  const { storage, files } = setup(); await storage.init();
  for (const revision of ["a".repeat(32), "b".repeat(32)]) files.set(`${ROOT}/catalogs/c.${revision}.root.json`, jsonBytes({ revision, parent: "root", catalog: emptyCatalog() }));
  await assert.rejects(() => storage.load(), /Katalogkonflikt/); assert.equal(files.size, 2);
});
test("tampered snapshot identity is refused", async () => {
  const { storage, files } = setup(); await storage.init();
  files.set(`${ROOT}/catalogs/c.${"a".repeat(32)}.root.json`, jsonBytes({ revision: "b".repeat(32), parent: "root", catalog: emptyCatalog() }));
  await assert.rejects(() => storage.load(), /Dateinamen/);
});
test("writes outside module storage and denied effective operations are refused", async () => {
  const { storage, deny } = setup(); await storage.init();
  await assert.rejects(() => storage.upload("worlds/test/file.json", jsonBytes({})), /eigenen/);
  deny(); await assert.rejects(() => storage.read(`${ROOT}/maps/file.png`), /Denied/);
  await assert.rejects(() => storage.upload(`${ROOT}/maps/file.json`, jsonBytes({})), /Denied/);
});
test("redirects and bounded streaming reads are enforced at the fetch boundary", async () => {
  const { picker } = setup(); let options;
  const storage = new FoundryStorage({ picker: () => picker, permission: () => {}, fetcher: async (url, opts) => { options = opts; return new Response(new Uint8Array(100)); } });
  await assert.rejects(() => storage.read("worlds/test/map.png", undefined, 10), /Dateigröße/);
  assert.equal(options.redirect, "error"); assert.equal(options.credentials, "same-origin");
});
