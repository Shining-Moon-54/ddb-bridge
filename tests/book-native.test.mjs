import test from "node:test";
import assert from "node:assert/strict";
import { prepareNativeBook, importPreparedBook } from "../scripts/ddb-bridge/book-native.js";

const spell = (id = "s1", edition) => ({
  sourceId: id, kind: "spell", ...(edition ? { edition } : {}),
  payload: {
    format: "foundry-dnd5e-v6", name: "Testlicht", type: "spell",
    system: { level: 0, school: "evo", description: { value: "synthetic text" } }
  }
});
const book = (entries = [spell()], overrides = {}) => ({
  provider: "fixture", bookId: "example-book", title: "Beispielbuch",
  edition: "2024", access: "confirmed", entries, ...overrides
});

function fakeRuntime() {
  const packs = new Map();
  let createdPacks = 0, writes = 0;
  const runtime = {
    requireGM() {}, systemId: "dnd5e", generation: 14,
    packs, get writes() { return writes; }, get createdPacks() { return createdPacks; },
    async createCompendium(metadata) {
      createdPacks++;
      const docs = [];
      const collection = "world." + metadata.name;
      const pack = {
        collection, metadata, documentName: metadata.type, locked: false,
        async getDocuments() { return docs; },
        documentClass: {
          async createDocuments(sources, opts) {
            assert.equal(opts.pack, collection);
            const result = sources.map(data => ({
              getFlag(module, field) { return data.flags[module][field]; }
            }));
            writes += sources.length;
            docs.push(...result);
            return result;
          }
        }
      };
      packs.set(collection, pack);
      return pack;
    }
  };
  return runtime;
}

test("native fixture produces a real Item candidate without leaking payload in summary", () => {
  const prepared = prepareNativeBook(book([spell(), {
    sourceId: "monster1", kind: "monster", payload: { name: "Monster" }
  }]));
  assert.equal(prepared.summary.ready, 1);
  assert.equal(prepared.summary.omitted, 1);
  assert.equal(prepared.candidates[0].document.type, "spell");
  assert.equal(prepared.candidates[0].document.system.level, 0);
  assert.equal(JSON.stringify(prepared.summary).includes("synthetic text"), false);
  assert.equal(prepared.candidates[0].document.flags["ddb-bridge"].completeness, "unverified");
});

test("rejects D&D Beyond provider until a verified adapter actually exists", () => {
  assert.throws(() => prepareNativeBook(book([], { provider: "dndbeyond" })), /D&D-Beyond/);
});

test("missing native schema, absent level and unsafe payload never produce documents", () => {
  const unsafe = JSON.parse('{"__proto__":{"poison":true}}');
  const entries = [
    { sourceId: "x", kind: "item", payload: { name: "Unconverted", type: "equipment", system: {} } },
    { sourceId: "y", kind: "spell", payload: { format: "foundry-dnd5e-v6", name: "No Level", type: "spell", system: {} } },
    { sourceId: "z", kind: "item", payload: { format: "foundry-dnd5e-v6", name: "Bad", type: "equipment", system: unsafe } }
  ];
  const prepared = prepareNativeBook(book(entries));
  assert.equal(prepared.candidates.length, 0);
  assert.deepEqual(prepared.summary.warnings.map(x => x.reason), [
    "native-format-required", "spell-level-required", "unsafe-or-large-payload"
  ]);
});

test("duplicate source key is never written twice", () => {
  const prepared = prepareNativeBook(book([spell(), spell()]));
  assert.equal(prepared.candidates.length, 1);
  assert.equal(prepared.summary.duplicateOrInvalid, 1);
});

test("writing twice creates only a dedicated world pack and does not duplicate entries", async () => {
  const prepared = prepareNativeBook(book());
  const runtime = fakeRuntime();
  const first = await importPreparedBook(prepared, runtime);
  const again = await importPreparedBook(prepared, runtime);
  assert.deepEqual([first.created, first.existing, first.failed], [1, 0, 0]);
  assert.deepEqual([again.created, again.existing, again.failed], [0, 1, 0]);
  assert.equal(runtime.createdPacks, 1);
  assert.equal(runtime.writes, 1);
  assert.match(first.packs[0], /^world\.ddb-bridge-/);
});

test("2014/2024 have separate source identities and isolated pack names", () => {
  const a = prepareNativeBook(book([spell()], { edition: "2014" }));
  const b = prepareNativeBook(book([spell()], { edition: "2024" }));
  assert.notEqual(a.candidates[0].sourceKey, b.candidates[0].sourceKey);
  assert.notEqual(a.candidates[0].pack.name, b.candidates[0].pack.name);
});

test("mixed-edition entries in the same book create separate packs", async () => {
  const prepared = prepareNativeBook(book([spell("same", "2014"), spell("same", "2024")]));
  assert.equal(prepared.candidates.length, 2);
  assert.notEqual(prepared.candidates[0].pack.name, prepared.candidates[1].pack.name);
  const runtime = fakeRuntime();
  const report = await importPreparedBook(prepared, runtime);
  assert.equal(report.created, 2);
  assert.equal(report.packs.length, 2);
  assert.equal(runtime.createdPacks, 2);
});

test("never writes when system/version is unsupported or an existing pack collides", async () => {
  const prepared = prepareNativeBook(book());
  const runtime = fakeRuntime();
  runtime.generation = 13;
  await assert.rejects(() => importPreparedBook(prepared, runtime), /Foundry V14/);
  assert.equal(runtime.createdPacks, 0);
  runtime.generation = 14;
  runtime.packs.set("world." + prepared.candidates[0].pack.name, {
    collection: "world." + prepared.candidates[0].pack.name,
    metadata: { label: "Another user's pack" },
    documentName: "Item", locked: false
  });
  await assert.rejects(() => importPreparedBook(prepared, runtime), /fremd/);
  assert.equal(runtime.writes, 0);
});

test("permission is rechecked before creating each document", async () => {
  const prepared = prepareNativeBook(book([spell("a"), spell("b")]));
  const runtime = fakeRuntime();
  let calls = 0;
  runtime.requireGM = () => { if (++calls > 3) throw Error("permission-revoked"); };
  await assert.rejects(() => importPreparedBook(prepared, runtime), /permission-revoked/);
  assert.equal(runtime.writes, 1);
});
