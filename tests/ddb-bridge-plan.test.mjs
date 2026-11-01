import test from "node:test";
import assert from "node:assert/strict";
import { planBookImport, sourceKey } from "../scripts/ddb-bridge/book-plan.js";

const book = (entries, overrides = {}) => ({
  provider: "dndbeyond", bookId: "example-book", title: "Example Book",
  edition: "2024", access: "confirmed", entries, ...overrides
});

test("plan covers monsters, spells, classes and book journals without exposing payload", () => {
  const privatePayload = { secretBookText: "Never leak this" };
  const plan = planBookImport(book([
    { sourceId: "m1", kind: "monster", payload: privatePayload },
    { sourceId: "c1", kind: "class", payload: {} },
    { sourceId: "s1", kind: "spell", payload: {} },
    { sourceId: "j1", kind: "journal", payload: {} }
  ]));
  assert.equal(plan.planned, 4);
  assert.deepEqual(plan.categories, { actors: 1, "character-options": 1, journals: 1, spells: 1 });
  assert.equal(JSON.stringify(plan).includes("Never leak this"), false);
});

test("distinct 2014 and 2024 content has distinct stable keys", () => {
  const one = { provider: "dndbeyond", bookId: "x", kind: "spell", sourceId: "42" };
  assert.notEqual(sourceKey({ ...one, edition: "2014" }), sourceKey({ ...one, edition: "2024" }));
});

test("duplicate keys do not make a second item", () => {
  const plan = planBookImport(book([
    { sourceId: "same", kind: "monster", payload: {} },
    { sourceId: "same", kind: "monster", payload: {} }
  ]));
  assert.equal(plan.entries.length, 1);
  assert.equal(plan.skipped, 1);
  assert.equal(plan.warnings[0].code, "duplicate-source-key");
});

test("no plan without entitlement declaration from a source connector", () => {
  assert.throws(() => planBookImport(book([], { access: "unknown" })), /not confirmed/);
});

test("missing payload is not described as a finished import", () => {
  const plan = planBookImport(book([{ sourceId: "x", kind: "monster" }]));
  assert.equal(plan.planned, 0);
  assert.equal(plan.unsupported, 1);
  assert.equal(plan.entries[0].status, "unsupported");
});
