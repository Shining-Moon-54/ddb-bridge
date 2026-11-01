import test from "node:test";
import assert from "node:assert/strict";
import { archiveAssetFilename } from "../scripts/core/media.js";

test("archive filenames replace every raw or encoded space with an underscore", () => {
  const hash = "a".repeat(64);
  for (const source of ["worlds/test/Alternate Manor Map.JPG", "worlds/test/Alternate%20Manor%20Map.JPG"]) {
    assert.equal(archiveAssetFilename(source, hash), `Alternate_Manor_Map_${hash}.jpg`);
  }
  assert.equal(archiveAssetFilename("maps/Two  spaces.png", hash), `Two__spaces_${hash}.png`);
  assert.equal(archiveAssetFilename("maps/Süd%20Dach.webp", hash), `Süd_Dach_${hash}.webp`);
});

test("archive filenames are bounded path components with content-specific names", () => {
  const source = `maps/${"𐐀 ".repeat(200)}roof.png`;
  const first = archiveAssetFilename(source, "a".repeat(64));
  const second = archiveAssetFilename(source, "b".repeat(64));
  assert.notEqual(first, second);
  assert(new TextEncoder().encode(first).length <= 255);
  assert(!/[\s/\\:%]/u.test(first));
  assert(first.endsWith(".png"));
  assert.throws(() => archiveAssetFilename("map.png", "../outside"), /Prüfsumme/);
});
