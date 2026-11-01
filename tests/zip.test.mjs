import test from "node:test";
import assert from "node:assert/strict";
import { zipSync } from "../vendor/fflate.js";
import { inspectZip, unpackZip, packZip, crc32 } from "../scripts/core/zip.js";
import { inspectPackage } from "../scripts/core/package.js";
import { jsonBytes, utf8 } from "../scripts/core/util.js";
import { LIMITS } from "../scripts/core/constants.js";
import { fixture, png } from "./helpers.mjs";

test("stored and deflated ZIPs roundtrip and CRC32 matches a known vector", async () => {
  const files = new Map([["Map-Library/library.json", jsonBytes({ test: true })], ["Map-Library/map.png", png]]);
  const zip = packZip(files); const result = await unpackZip(zip);
  assert.deepEqual(result, files); assert.equal(crc32(utf8("123456789")), 0xcbf43926);
});
test("ZIP traversal, absolute paths and platform ambiguities are refused", () => {
  for (const name of ["../escape.png", "/etc/file", "C:\\file", "a/%2e%2e/file"]) {
    assert.throws(() => inspectZip(zipSync({ [name]: png })), /pfad|Archiv/i);
  }
  assert.throws(() => inspectZip(zipSync({ "map.png": png, "MAP.PNG": png })), /Doppelte/);
});
test("ZIP bombs, file count and total size limits are applied before decompression", () => {
  const bomb = zipSync({ "zeros.bin": new Uint8Array(1024 * 1024) }, { level: 9 });
  assert.throws(() => inspectZip(bomb), /Bomben/);
  const zip = zipSync({ "a.txt": utf8("a"), "b.txt": utf8("b") });
  assert.throws(() => inspectZip(zip, { ...LIMITS, files: 1 }), /viele/);
  assert.throws(() => inspectZip(zip, { ...LIMITS, expanded: 1 }), /Entpacklimit/);
});
test("tampered stored file fails its CRC even with matching size", async () => {
  const bytes = zipSync({ "a.txt": [utf8("hello"), { level: 0 }] });
  const view = new DataView(bytes.buffer); const at = 30 + view.getUint16(26, true) + view.getUint16(28, true);
  bytes[at] ^= 1;
  await assert.rejects(() => unpackZip(bytes), /Prüfsumme/);
});
test("central and local filename disagreement is refused", () => {
  const bytes = zipSync({ "a.txt": utf8("test") }); bytes[30] = 98;
  assert.throws(() => inspectZip(bytes), /widersprechen/);
});
test("truncated and encrypted archives are refused", () => {
  const bytes = zipSync({ "a.txt": utf8("test") });
  assert.throws(() => inspectZip(bytes.subarray(0, bytes.length - 3)), /Verzeichnis/);
  const end = bytes.length - 22, view = new DataView(bytes.buffer), dir = view.getUint32(end + 16, true);
  view.setUint16(dir + 8, 1, true); assert.throws(() => inspectZip(bytes), /Verschlüssel/);
});
test("foreign ZIP uses unique relative matches and leaves ambiguous basenames unresolved", async () => {
  const scene = { name: "Foreign", width: 10, height: 10, levels: [{ background: { src: "map.png" }, foreground: { src: "tile.png" } }] };
  const result = await inspectPackage(zipSync({ "nested/scene.json": jsonBytes(scene), "nested/map.png": png,
    "a/tile.png": png, "b/tile.png": png, "tools/run.js": utf8("throw new Error('never execute');") }));
  assert.equal(result.candidates.length, 1); assert(result.candidates[0].mappings.has("map.png"));
  assert(!result.candidates[0].mappings.has("tile.png")); assert(result.ignored.includes("tools/run.js"));
});
test("cancellation stops decompression before any import", async () => {
  const signal = AbortSignal.abort();
  await assert.rejects(() => unpackZip(zipSync({ "a.txt": utf8("test") }), { signal }), /abort/i);
});
