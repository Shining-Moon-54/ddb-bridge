import test from "node:test";
import assert from "node:assert/strict";
import { emptyCatalog, setCategory, queryCatalog, categoryPath } from "../scripts/core/catalog.js";

test("nested categories can be renamed and moved without changing map storage paths", () => {
  let c = setCategory(emptyCatalog(), { id: "deep", name: "Deep", parent: "dungeons" });
  assert.equal(categoryPath(c, "deep"), "Dungeons & Verliese / Deep");
  c = setCategory(c, { id: "deep", name: "Tower", parent: "interiors" });
  assert.equal(categoryPath(c, "deep"), "Gebäude & Innenräume / Tower");
});
test("category cycles and nonexistent parents are refused", () => {
  let c = setCategory(emptyCatalog(), { id: "deep", name: "Deep", parent: "dungeons" });
  assert.throws(() => setCategory(c, { id: "dungeons", name: "Dungeon", parent: "deep" }), /Kreisbezug/);
  assert.throws(() => setCategory(c, { id: "x", name: "x", parent: "missing" }), /hierarchie/);
});
test("5000 metadata entries search and page without loading Scene documents", () => {
  const c = emptyCatalog();
  c.entries = Array.from({ length: 5000 }, (_, i) => ({ id: `map-${i}`, name: `Karte ${i}`, description: "Natur", category: i % 2 ? "dungeons" : "nature", tags: ["WALD"], favorite: i % 3 === 0, updated: "2026-10-24" }));
  const result = queryCatalog(c, { search: "natur wald", category: "nature", page: 4 });
  assert.equal(result.total, 2500); assert.equal(result.entries.length, 48); assert.equal(result.page, 4);
  assert(queryCatalog(c, { favorites: true }).total > 1600);
});
