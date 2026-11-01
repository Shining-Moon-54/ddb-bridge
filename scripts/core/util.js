import { LIMITS } from "./constants.js";

export const clone = value => structuredClone(value);
export const uid = () => crypto.randomUUID().replaceAll("-", "");
export const utf8 = value => new TextEncoder().encode(value);
export const jsonBytes = value => utf8(JSON.stringify(value));
export const hex = bytes => [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
export async function sha256(bytes) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}
export function assert(condition, message) { if (!condition) throw new Error(message); }
export function abort(signal) { signal?.throwIfAborted(); }
export function safeId(id) {
  assert(typeof id === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(id), "Ungültige Kennung.");
  return id;
}
export function safePath(path) {
  assert(typeof path === "string" && path.length > 0 && path.length <= 1024, "Ungültiger Dateipfad.");
  let decoded;
  try { decoded = decodeURIComponent(path); } catch { throw new Error("Ungültige Pfadkodierung."); }
  for (const candidate of [path, decoded]) {
    assert(!/[\\:\x00-\x1f\x7f]/.test(candidate) && !candidate.startsWith("/"), "Absoluter oder unsicherer Dateipfad.");
    const parts = candidate.replace(/\/$/, "").split("/");
    assert(parts.every(p => p && p !== "." && p !== ".." && p === p.trim()), "Pfad verlässt das Archiv.");
  }
  return path;
}
export function extension(path) { return String(path).split(/[?#]/)[0].split(".").pop().toLowerCase(); }
export function basename(path) { return String(path).split(/[?#]/)[0].split("/").pop(); }
export function jsonParse(bytes, max = LIMITS.json) {
  const text = typeof bytes === "string" ? bytes : new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  assert(utf8(text).length <= max, "JSON überschreitet das Größenlimit.");
  const data = JSON.parse(text);
  let nodes = 0;
  const stack = [[data, 0]];
  while (stack.length) {
    const [item, depth] = stack.pop();
    assert(++nodes <= LIMITS.nodes && depth <= LIMITS.depth, "JSON ist zu tief verschachtelt oder zu komplex.");
    if (item && typeof item === "object") for (const [key, value] of Object.entries(item)) {
      assert(!["__proto__", "prototype", "constructor"].includes(key), "Unsicherer Schlüssel im JSON.");
      stack.push([value, depth + 1]);
    }
  }
  return data;
}
export function* walk(value, path = []) {
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    const next = [...path, key];
    if (typeof item === "string") yield { path: next, key, value: item };
    else if (item && typeof item === "object") yield* walk(item, next);
  }
}
export function setAt(object, path, value) {
  let cursor = object;
  for (const key of path.slice(0, -1)) cursor = cursor[key];
  cursor[path.at(-1)] = value;
}
export function publicSourceURL(value) {
  if (!value) return "";
  const url = new URL(value);
  assert(["https:", "http:"].includes(url.protocol) && !url.username && !url.password,
    "Die Quellenangabe muss eine öffentliche HTTP(S)-Adresse ohne Zugangsdaten sein.");
  assert(![...url.searchParams.keys()].some(k => /token|signature|credential|secret|api.?key/i.test(k)),
    "Keine signierten oder geheimen URLs als Quellenangabe speichern.");
  return url.href;
}
