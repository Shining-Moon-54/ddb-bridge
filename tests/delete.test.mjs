import test from "node:test";
import assert from "node:assert/strict";
import { LibraryService } from "../scripts/foundry/service.js";
import { queryCatalog } from "../scripts/core/catalog.js";
import { MemoryStorage, runtime, png } from "./helpers.mjs";

async function setup() {
  runtime(); const storage = new MemoryStorage(), service = new LibraryService(storage, { imageInspector: async () => null });
  const scene = { name: "Synthetic map", width: 1, height: 1, levels: [{ background: { src: "maps/one.png" } }] };
  const plan = await service.plan({ scene, mappings: new Map([["maps/one.png", { name: "one.png", bytes: png }]]) });
  const record = await service.archive(plan, { category: "uncategorized" });
  return { storage, service, record, plan };
}

test("deletion hides cards, retains all assets and history, and is reversible", async () => {
  const { storage, service, record, plan } = await setup();
  const updated = await service.archive(plan, { category: "uncategorized" }, { updateId: record.id, expectedRevision: record.revision });
  const files = new Map(storage.files);
  await service.setDeleted([updated], true);
  assert.equal(queryCatalog(storage.catalog).total, 0);
  const trash = queryCatalog(storage.catalog, { archived: true }); assert.equal(trash.total, 1);
  assert(trash.entries[0].deletedAt); assert.deepEqual(storage.files, files);
  assert.deepEqual(trash.entries[0].history, updated.history);
  const preflight = await service.preflight(trash.entries[0]); assert(!preflight.warnings.some(w => w.code === "asset"));
  await service.setDeleted(trash.entries, false);
  assert.equal(queryCatalog(storage.catalog).total, 1); assert.equal(queryCatalog(storage.catalog, { archived: true }).total, 0);
  assert.equal(storage.catalog.entries[0].deletedAt, undefined); assert.deepEqual(storage.files, files);
});

test("stale revisions, metadata and duplicate IDs cannot delete a selection", async () => {
  const { storage, service, record } = await setup(); const before = structuredClone(storage.catalog);
  for (const records of [[{ ...record, revision: "stale" }], [{ ...record, updated: "old" }], [record, record], [record, { ...record, id: "missing" }]]) {
    await assert.rejects(() => service.setDeleted(records, true), /geändert|Kartenauswahl/);
    assert.deepEqual(storage.catalog, before);
  }
});

test("delete and restore enforce GM rights, cancellation and expected state", async () => {
  const { storage, service, record } = await setup();
  game.user.isGM = false; await assert.rejects(() => service.setDeleted([record], true), /Spielleitungen/);
  game.user.isGM = true; await assert.rejects(() => service.setDeleted([record], true, { signal: AbortSignal.abort() }), /abort/i);
  assert.equal(storage.catalog.entries[0].archived, undefined);
  await service.setDeleted([record], true);
  await assert.rejects(() => service.setDeleted([record], true), /geändert/);
  await assert.rejects(() => service.setDeleted(storage.catalog.entries, true), /bereits/);
});

test("trash does not block rearchiving and cannot be overwritten from an old update dialog", async () => {
  const { storage, service, record, plan } = await setup(); await service.setDeleted([record], true);
  await assert.rejects(() => service.archive(plan, { category: "uncategorized" }, { updateId: record.id, expectedRevision: record.revision }), /gelöscht/);
  const second = await service.archive(plan, { category: "uncategorized" }); assert.notEqual(second.id, record.id);
  assert.equal(queryCatalog(storage.catalog).total, 1); assert.equal(queryCatalog(storage.catalog, { archived: true }).total, 1);
});
