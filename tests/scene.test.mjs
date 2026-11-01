import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers.mjs";
import { assetsOf, validateScene, rewriteAssets, prepareWorldCopy, sceneWarnings, simpleScene } from "../scripts/core/scene.js";
import { jsonParse, safePath, sha256 } from "../scripts/core/util.js";

test("32 native levels, embedded IDs, region shapes, roofs and flags survive archival validation", () => {
  const original = fixture(), copy = validateScene(original);
  assert.deepEqual(copy, original); assert.equal(copy.levels.length, 32);
  copy.levels[0].name = "changed"; assert.notEqual(original.levels[0].name, "changed");
});
test("asset discovery covers all levels, roofs, tiles, drawings, media flags and actual audio", () => {
  const assets = assetsOf(fixture());
  assert.equal(assets.length, 68); assert(!assets.some(a => a.source.endsWith("actor.png")));
  assert(assets.some(a => a.source.endsWith("flag.png"))); assert(assets.some(a => a.source.endsWith("ambience.ogg")));
});
test("module labels and composite icon expressions are not mistaken for individual files", () => {
  const scene = { name: "Synthetic scene", width: 10, levels: [{ background: { src: "maps/base.png" } }],
    flags: { vendor: { value: "IA: icons/svg/sun.svg|icons/svg/sleep.svg", image: "IA: icons/svg/sun.svg|icons/svg/sleep.svg",
      choices: "icons/svg/sun.svg|icons/svg/sleep.svg", picture: "icons/svg/book.svg", asset: "maps/My map.svg" } } };
  const before = structuredClone(scene), assets = assetsOf(scene);
  assert.deepEqual(assets.map(a => a.source), ["maps/base.png", "icons/svg/book.svg", "maps/My map.svg"]);
  const copy = rewriteAssets(scene, new Map([["icons/svg/book.svg", "modules/ddb-bridge/storage/book.svg"]]));
  assert.equal(copy.flags.vendor.picture, "modules/ddb-bridge/storage/book.svg");
  assert.equal(copy.flags.vendor.image, scene.flags.vendor.image); assert.deepEqual(scene, before);
});
test("only a working copy is remapped; all usages of a repeated asset are changed", () => {
  const scene = fixture(); scene.tiles[0].texture.src = scene.levels[0].background.src;
  const mapped = rewriteAssets(scene, new Map([[scene.levels[0].background.src, "modules/ddb-bridge/storage/asset.png"]]));
  assert.equal(mapped.tiles[0].texture.src, mapped.levels[0].background.src);
  assert.notEqual(scene.tiles[0].texture.src, mapped.tiles[0].texture.src);
});
test("world copy excludes tokens and world ownership but preserves all levels, native regions and IDs", () => {
  const source = fixture(); const data = prepareWorldCopy(source, { id: "test", revision: "v1", includeModuleFlags: true, reviewedAutomation: true });
  assert.equal(data._id, undefined); assert.equal(data._stats, undefined); assert.equal(data.folder, undefined);
  assert.equal(data.active, false); assert.equal(data.navigation, false); assert.deepEqual(data.tokens, []);
  assert.deepEqual(data.regions, source.regions); assert.deepEqual(data.levels, source.levels);
  assert.equal(source.tokens.length, 1); assert.equal(source.active, true); assert(data.flags.vendor);
});
test("foreign flags are optional at every document depth and originals remain intact", () => {
  const scene = fixture(); const data = prepareWorldCopy(scene);
  assert.equal(data.flags.vendor, undefined); assert.equal(data.levels[0].flags.vendor, undefined);
  assert(data.flags.core); assert(scene.flags.vendor);
});
test("unknown automation and macro commands require review", () => {
  const scene = fixture(); scene.regions[0].behaviors.push({ type: "thirdPartyExecute", system: { script: "alert('never execute')" } });
  assert.throws(() => prepareWorldCopy(scene), /geprüft/);
  assert.doesNotThrow(() => prepareWorldCopy(scene, { reviewedAutomation: true }));
});
test("missing scene targets and inactive module scopes are reported without deletion", () => {
  const scene = fixture(); const warnings = sceneWarnings(scene);
  assert(warnings.some(w => w.code === "reference")); assert(warnings.some(w => w.code === "module"));
  assert.equal(scene.regions.length, 1);
});
test("JSON pollution, excessive nesting, wrong document types and secrets are refused", () => {
  assert.throws(() => jsonParse('{"__proto__":{"polluted":true}}'), /Unsicher/);
  assert.throws(() => jsonParse("[".repeat(90) + "0" + "]".repeat(90)), /verschachtelt/);
  assert.throws(() => validateScene({ name: "actor", system: {}, width: 10 }), /keine native/);
  const scene = fixture(); scene.flags.vendor.accessToken = "private"; assert.throws(() => validateScene(scene), /Zugangsdaten/);
  scene.flags.vendor.accessToken = ""; scene.levels[0].background.src = "https://example.org/map.png?token=private";
  assert.throws(() => validateScene(scene), /signierte/);
});
test("safe paths reject traversal, encoded traversal, drive paths and control characters", () => {
  for (const path of ["../secret", "/etc/passwd", "C:\\map.png", "a/%2e%2e/x", "a//x", "a/\u0000x", "a/%2fx"]) assert.throws(() => safePath(path));
  assert.equal(safePath("maps/category/file.webp"), "maps/category/file.webp");
});
test("SHA-256 matches a standard known-answer vector", async () => {
  assert.equal(await sha256(new TextEncoder().encode("abc")), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});
test("new image scene uses native v14 levels", () => {
  const scene = simpleScene({ name: "image", path: "map.png", width: 2000, height: 1500 });
  assert.equal(scene.levels[0].background.src, "map.png"); assert.equal(scene.background, undefined);
});
