import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStorage, fixture, png, svg, runtime } from "./helpers.mjs";
import { LibraryService } from "../scripts/foundry/service.js";
import { assetsOf } from "../scripts/core/scene.js";
import { inspectPackage } from "../scripts/core/package.js";
import { utf8 } from "../scripts/core/util.js";

function setup() {
  runtime(); const storage = new MemoryStorage();
  const service = new LibraryService(storage, { imageInspector: async () => ({ width: 1, height: 1, thumbnail: null }) });
  const scene = fixture(); scene.levels = scene.levels.map(l => ({ ...l, foreground: { src: "" } })); scene.sounds = [];
  const mappings = new Map(assetsOf(scene).map(a => [a.source, { name: a.source, bytes: png }]));
  return { storage, service, scene, mappings };
}
const meta = { name: "Test map", category: "dungeons", tags: "tower, test" };

test("core and module SVG icons survive archival, portable export and a new world copy", async () => {
  runtime(); const storage = new MemoryStorage();
  const service = new LibraryService(storage, { imageInspector: async () => null });
  const core = "icons/svg/book.svg", module = "modules/vendor/assets/stair.svg";
  const label = "IA: icons/svg/sun.svg|icons/svg/sleep.svg";
  storage.files.set("worlds/test/map.png", png); storage.files.set(core, svg); storage.files.set(module, svg);
  const scene = { name: "Synthetic icon scene", width: 20, levels: [{ background: { src: "worlds/test/map.png" } }],
    tiles: [{ texture: { src: module } }], flags: { vendor: { icon: core, choice: label } } };
  const before = structuredClone(scene), plan = await service.plan({ scene });
  assert.equal(plan.assets.length, 3); assert(!plan.warnings.some(w => w.code === "asset"));
  const record = await service.archive(plan, meta);
  for (const asset of record.assets.filter(a => a.extension === "svg")) {
    assert.equal(asset.mime, "image/svg+xml"); assert(asset.path.endsWith(".svg"));
    assert.deepEqual(storage.files.get(asset.path), svg);
  }
  const exported = await inspectPackage(await service.export(storage.catalog, [record]));
  const candidate = exported.candidates[0];
  assert.deepEqual(candidate.mappings.get(core).bytes, svg); assert.deepEqual(candidate.mappings.get(module).bytes, svg);
  const fresh = new LibraryService(new MemoryStorage(), { imageInspector: async () => null });
  const freshPlan = await fresh.plan(candidate); assert(!freshPlan.warnings.some(w => w.code === "asset"));
  globalThis.CONFIG = { Scene: { documentClass: { create: async data => data } } };
  const world = await service.importToWorld(record, { includeModuleFlags: true, reviewedAutomation: true });
  assert.equal(world.tiles[0].texture.src, record.assets.find(a => a.source === module).path);
  assert.equal(world.flags.vendor.icon, record.assets.find(a => a.source === core).path);
  assert.equal(world.flags.vendor.choice, label); assert.deepEqual(scene, before);
});

test("reported SVG style patterns archive all dependencies of a four-level scene", async () => {
  runtime(); const storage = new MemoryStorage(), service = new LibraryService(storage);
  // Synthetic graphics with the reported paths/styles; no vendor artwork is used.
  const sources = ["icons/svg/book.svg", "icons/svg/daze.svg", "icons/svg/sun.svg", "icons/svg/explosion.svg",
    "modules/tychmaps-dotmm/assets/tiles/rope-coil.svg"];
  const media = new Map(sources.map((source, i) => [source, utf8(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style="${i === 4 ? "height:100%;width:100%" : "touch-action:none"}"><path fill="#fff" d="M0 0H${10 + i}V20H0Z"/></svg>`
  )]));
  for (const [source, bytes] of media) storage.files.set(source, bytes);
  const scene = { name: "Synthetic four-level style regression", width: 20,
    levels: sources.slice(0, 4).map(src => ({ background: { src } })), tiles: [{ texture: { src: sources[4] } }] };
  const before = structuredClone(scene), plan = await service.plan({ scene });
  assert.equal(plan.assets.length, 5); assert(!plan.warnings.some(w => w.code === "asset"));
  const record = await service.archive(plan, meta);
  for (const asset of record.assets) assert.deepEqual(storage.files.get(asset.path), media.get(asset.source));
  const exported = await inspectPackage(await service.export(storage.catalog, [record]));
  const candidate = exported.candidates[0];
  for (const [source, bytes] of media) assert.deepEqual(candidate.mappings.get(source).bytes, bytes);
  const freshStorage = new MemoryStorage(), fresh = new LibraryService(freshStorage);
  const freshPlan = await fresh.plan(candidate); assert(!freshPlan.warnings.some(w => w.code === "asset"));
  const copied = await fresh.archive(freshPlan, meta);
  globalThis.CONFIG = { Scene: { documentClass: { create: async data => data } } };
  const world = await fresh.importToWorld(copied);
  assert.equal(world.levels.length, 4);
  assert.deepEqual(assetsOf(world).map(a => a.source).sort(), copied.assets.map(a => a.path).sort());
  for (const asset of copied.assets) assert.deepEqual(freshStorage.files.get(asset.path), media.get(asset.source));
  assert.deepEqual(scene, before);
});

test("SVG rejected by the static profile cannot be uploaded by ordinary archival", async () => {
  runtime(); const storage = new MemoryStorage(), service = new LibraryService(storage);
  const source = "worlds/test/active.svg";
  storage.files.set(source, new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'));
  const scene = { name: "Unsafe SVG", width: 20, levels: [{ background: { src: source } }] };
  const plan = await service.plan({ scene });
  assert.equal(plan.assets[0].bytes, null); assert(plan.warnings.some(w => w.code === "asset" && /SVG/.test(w.message)));
  await assert.rejects(() => service.archive(plan, meta), /Fehlende Assets/);
  assert.equal(storage.uploadCount, 0); assert.equal(storage.catalog.entries.length, 0);
});

test("Foundry Collection values support preview, archival and import preflight", async () => {
  const { service, scene, mappings } = setup();
  game.modules.set("vendor", { id: "vendor", active: true });
  game.modules.set("disabled", { id: "disabled", active: false });
  scene.flags.disabled = { test: true };
  scene.flags.missing = { test: true };
  assert.equal([...game.modules][0].id, "ddb-bridge");

  const plan = await service.plan({ scene, mappings });
  const record = await service.archive(plan, meta);
  const imported = await service.preflight(record);
  for (const result of [plan, imported]) {
    const warning = scope => result.warnings.find(w => w.code === "module" && w.scope === scope);
    assert.equal(warning("vendor").message, "Drittanbieter-Daten: vendor");
    assert.match(warning("disabled").message, /Modul nicht aktiv/);
    assert.match(warning("missing").message, /Modul nicht aktiv/);
  }
});

test("archive + portable ZIP + independent library + new world copy preserves native data", async () => {
  const { storage, service, scene, mappings } = setup();
  const original = structuredClone(scene);
  const plan = await service.plan({ scene, mappings }); const record = await service.archive(plan, meta);
  assert.deepEqual(scene, original); assert.equal(storage.catalog.entries.length, 1);
  assert.equal(new Set(record.assets.filter(a => a.extension === "png").map(a => a.path)).size, 1);
  const zip = await service.export(storage.catalog, [record]); const parsed = await inspectPackage(zip);
  assert(parsed.own); assert.equal(parsed.candidates.length, 1);
  const fresh = new MemoryStorage(); const next = new LibraryService(fresh, { imageInspector: async () => null });
  const nextPlan = await next.plan(parsed.candidates[0]); const copied = await next.archive(nextPlan, meta);
  let createData, options;
  globalThis.CONFIG = { Scene: { documentClass: { create: async (d, opts) => { createData = d; options = opts; return { ...d, id: d._id }; } } } };
  const created = await next.importToWorld(copied, { includeModuleFlags: true, reviewedAutomation: true });
  assert.equal(created.id, "NewWorldScene001"); assert.equal(options.keepEmbeddedIds, true);
  assert.equal(createData.levels.length, 32); assert.equal(createData.tokens.length, 0);
  assert.equal(createData.regions[0]._id, scene.regions[0]._id); assert(createData.flags.vendor);
  assert(createData.levels[0].background.src.startsWith("modules/ddb-bridge/storage/"));
  assert.deepEqual(scene, original);
});
test("failed upload leaves existing archive and catalog intact", async () => {
  const { storage, service, scene, mappings } = setup(); const plan = await service.plan({ scene, mappings });
  const first = await service.archive(plan, meta); const before = structuredClone(storage.catalog);
  storage.failAt = storage.uploadCount + 2;
  await assert.rejects(() => service.archive(plan, meta, { updateId: first.id, expectedRevision: first.revision }), /Synthetic/);
  assert.deepEqual(storage.catalog, before); assert(storage.files.has(first.scene));
});
test("duplicate detection and explicit version update never overwrite old files", async () => {
  const { storage, service, scene, mappings } = setup(); const plan = await service.plan({ scene, mappings });
  const first = await service.archive(plan, meta);
  await assert.rejects(() => service.archive(plan, meta), /Identische/);
  const updated = await service.archive(plan, meta, { updateId: first.id, expectedRevision: first.revision });
  assert.equal(updated.history[0].scene, first.scene); assert.notEqual(updated.scene, first.scene);
  await assert.rejects(() => service.archive(plan, meta, { updateId: first.id, expectedRevision: first.revision }), /verändert/);
});
test("missing/remote assets are reported and require explicit acceptance", async () => {
  const { service, scene } = setup(); scene.levels[0].background.src = "https://example.org/map.png";
  const plan = await service.plan({ scene });
  assert(plan.warnings.some(w => w.code === "asset")); await assert.rejects(() => service.archive(plan, meta), /Fehlende/);
  const record = await service.archive(plan, meta, { allowMissing: true }); assert(record.assets.some(a => !a.path));
});
test("checksum tampering blocks scene import and reports changed assets", async () => {
  const { storage, service, scene, mappings } = setup(); const record = await service.archive(await service.plan({ scene, mappings }), meta);
  storage.files.get(record.assets[0].path)[0] ^= 1;
  const result = await service.preflight(record); assert(result.warnings.some(w => w.code === "asset"));
  storage.files.get(record.scene)[0] ^= 1; await assert.rejects(() => service.preflight(record), /Szenendatei/);
});
test("GM enforcement applies to service mutations even when bypassing UI", async () => {
  const { service, scene, mappings } = setup(); game.user.isGM = false;
  await assert.rejects(() => service.plan({ scene, mappings }), /Spielleitungen/);
  await assert.rejects(() => service.updateMetadata([], {}), /Spielleitungen/);
});
test("aborted archival never commits a catalog entry", async () => {
  const { storage, service, scene, mappings } = setup(); const plan = await service.plan({ scene, mappings });
  await assert.rejects(() => service.archive(plan, meta, { signal: AbortSignal.abort() }), /abort/i);
  assert.equal(storage.catalog.entries.length, 0); assert.equal(storage.uploadCount, 0);
});
test("world self-references follow new root ID and external targets stay intact", async () => {
  const { service, scene, mappings } = setup(); scene.regions[0].behaviors[0].system.destination = `Scene.${scene._id}.Region.Region0000000001`;
  const record = await service.archive(await service.plan({ scene, mappings }), meta);
  globalThis.CONFIG = { Scene: { documentClass: { create: async d => d } } };
  const result = await service.importToWorld(record);
  assert.equal(result.regions[0].behaviors[0].system.destination, "Scene.NewWorldScene001.Region.Region0000000001");
});
