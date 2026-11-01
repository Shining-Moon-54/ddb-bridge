import { Unzip, UnzipInflate, zipSync } from "../../vendor/fflate.js";
import { LIMITS } from "./constants.js";
import { assert, safePath, abort } from "./util.js";

const table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ c >>> 1 : c >>> 1;
  table[n] = c >>> 0;
}
export function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = table[(c ^ byte) & 255] ^ c >>> 8;
  return (c ^ 0xffffffff) >>> 0;
}

// Inspect the central directory BEFORE any decompression. ZIP64, split archives,
// encryption, duplicate normalized names and unsupported compression are refused.
export function inspectZip(bytes, limits = LIMITS) {
  assert(bytes.length <= limits.archive && bytes.length >= 22, "ZIP-Größenlimit oder ungültiges ZIP.");
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65557); p--) {
    if (v.getUint32(p, true) === 0x06054b50 && p + 22 + v.getUint16(p + 20, true) === bytes.length) { end = p; break; }
  }
  assert(end >= 0, "ZIP-Verzeichnis fehlt.");
  const count = v.getUint16(end + 10, true);
  const offset = v.getUint32(end + 16, true);
  const size = v.getUint32(end + 12, true);
  assert(v.getUint16(end + 4, true) === 0 && v.getUint16(end + 6, true) === 0 && v.getUint16(end + 8, true) === count,
    "Mehrteilige ZIPs werden nicht unterstützt.");
  assert(count < 65535 && offset !== 0xffffffff && size !== 0xffffffff && offset + size === end,
    "ZIP64 oder ungültiges ZIP-Verzeichnis.");
  assert(count <= limits.files, "ZIP enthält zu viele Dateien.");
  const entries = new Map();
  const normalized = new Set();
  let total = 0;
  let cursor = offset;
  for (let i = 0; i < count; i++) {
    assert(cursor + 46 <= end && v.getUint32(cursor, true) === 0x02014b50, "Beschädigter ZIP-Eintrag.");
    const flags = v.getUint16(cursor + 8, true), method = v.getUint16(cursor + 10, true);
    const compressed = v.getUint32(cursor + 20, true), expanded = v.getUint32(cursor + 24, true);
    const length = v.getUint16(cursor + 28, true), extra = v.getUint16(cursor + 30, true), comment = v.getUint16(cursor + 32, true);
    const local = v.getUint32(cursor + 42, true);
    assert(cursor + 46 + length + extra + comment <= end && local + 30 <= offset, "Ungültige ZIP-Offsets.");
    assert(!(flags & 1) && [0, 8].includes(method), "Verschlüsseltes oder nicht unterstütztes ZIP.");
    assert((v.getUint32(cursor + 38, true) >>> 16 & 0xf000) !== 0xa000, "Symlinks im ZIP sind nicht erlaubt.");
    const name = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(cursor + 46, cursor + 46 + length));
    safePath(name);
    const key = name.normalize("NFKC").toLocaleLowerCase("en");
    assert(!normalized.has(key), "Doppelte ZIP-Dateinamen."); normalized.add(key);
    assert(expanded <= limits.file && expanded <= Math.max(1024, compressed * limits.ratio), "ZIP-Bombenlimit überschritten.");
    total += expanded; assert(total <= limits.expanded, "Entpacklimit überschritten.");
    assert(v.getUint32(local, true) === 0x04034b50 && v.getUint16(local + 8, true) === method,
      "Lokaler ZIP-Header ist ungültig.");
    const localLen = v.getUint16(local + 26, true), localExtra = v.getUint16(local + 28, true);
    assert(local + 30 + localLen + localExtra + compressed <= offset, "ZIP-Dateidaten außerhalb des Archivs.");
    const localName = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(local + 30, local + 30 + localLen));
    assert(localName === name && !(v.getUint16(local + 6, true) & 1), "ZIP-Header widersprechen einander.");
    entries.set(name, { name, compressed, expanded, method, crc: v.getUint32(cursor + 16, true) });
    cursor += 46 + length + extra + comment;
  }
  assert(cursor === end, "Unerwartete Daten im ZIP-Verzeichnis.");
  return entries;
}

export async function unpackZip(bytes, { limits = LIMITS, signal, progress = () => {} } = {}) {
  const expected = inspectZip(bytes, limits);
  const files = new Map(), seen = new Set();
  let total = 0, failure;
  const unzip = new Unzip(file => {
    try {
      const meta = expected.get(file.name);
      assert(meta && !seen.has(file.name), "Nicht inventarisierter ZIP-Eintrag."); seen.add(file.name);
      const chunks = []; let length = 0;
      file.ondata = (error, data, final) => {
        if (failure) return;
        try {
          if (error) throw error;
          abort(signal);
          length += data.length; total += data.length;
          assert(length <= meta.expanded && length <= limits.file && total <= limits.expanded, "Tatsächliches Entpacklimit überschritten.");
          chunks.push(data);
          if (final) {
            assert(length === meta.expanded, "ZIP-Dateigröße stimmt nicht.");
            const joined = new Uint8Array(length); let position = 0;
            for (const chunk of chunks) { joined.set(chunk, position); position += chunk.length; }
            assert(crc32(joined) === meta.crc, "ZIP-Prüfsumme stimmt nicht.");
            if (!file.name.endsWith("/")) files.set(file.name, joined);
          }
        } catch (e) { failure = e; file.terminate?.(); }
      };
      file.start();
    } catch (e) { failure = e; file.terminate?.(); }
  });
  unzip.register(UnzipInflate);
  for (let p = 0; p < bytes.length; p += 16384) {
    abort(signal); if (failure) throw failure;
    unzip.push(bytes.subarray(p, p + 16384), p + 16384 >= bytes.length);
    progress(Math.min(bytes.length, p + 16384), bytes.length);
    if (p % (1024 * 1024) === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }
  if (failure) throw failure;
  assert(seen.size === expected.size && files.size === [...expected.keys()].filter(n => !n.endsWith("/")).length, "Unvollständiges ZIP.");
  return files;
}

export function packZip(files) {
  let total = 0;
  assert(files.size <= LIMITS.files, "Zu viele Dateien für einen Browserexport.");
  const input = Object.create(null);
  for (const [path, bytes] of files) {
    safePath(path); total += bytes.length;
    assert(bytes.length <= LIMITS.file && total <= LIMITS.archive - 1024 * 1024, "Exportlimit von 128 MiB erreicht; Auswahl verkleinern.");
    // Store portable packages without compression so even repetitive legitimate
    // Scene JSON cannot exceed our own decompression-ratio protection on reimport.
    input[path] = [bytes, { level: 0 }];
  }
  const result = zipSync(input);
  assert(result.length <= LIMITS.archive, "Export überschreitet das ZIP-Limit.");
  return result;
}
