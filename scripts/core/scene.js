import { MEDIA } from "./constants.js";
import { assert, clone, extension, walk, setAt, jsonParse, jsonBytes, safePath } from "./util.js";

function singleFlagPath(value) {
  if (/[|<>\r\n]/.test(value)) return false;
  if (/^https?:\/\//i.test(value)) {
    try { return !/\s/.test(value) && Boolean(new URL(value)); } catch { return false; }
  }
  try { safePath(value); return true; } catch { return false; }
}

// Native Scene data remains authoritative. This only validates its outer shape.
export function validateScene(value) {
  const scene = jsonParse(jsonBytes(value));
  assert(scene && !Array.isArray(scene) && typeof scene === "object", "Keine Szenendaten.");
  assert(typeof scene.name === "string" && scene.name.trim().length > 0, "Szenenname fehlt.");
  assert(scene.type !== "Actor" && !scene.system, "Diese JSON-Datei ist keine native Szene.");
  assert(Array.isArray(scene.levels) || Number.isFinite(scene.width) || scene.background,
    "Keine erkennbare native Foundry-Szene. Andere Dokumenttypen werden nicht importiert.");
  for (const key of ["levels", "walls", "lights", "tiles", "regions", "drawings", "sounds", "tokens", "notes"]) {
    assert(scene[key] === undefined || Array.isArray(scene[key]), `Szenenfeld ${key} muss eine Liste sein.`);
  }
  for (const { key, value, path } of walk(scene)) {
    assert(!/^(password|accessToken|refreshToken|clientSecret|apiKey|authorization)$/i.test(key) || !value,
      `Mögliche Zugangsdaten in ${path.join(".")}; vor der Archivierung entfernen.`);
    if (/^https?:/i.test(value)) {
      let url;
      try { url = new URL(value); } catch { continue; }
      assert(!url.username && !url.password && ![...url.searchParams.keys()].some(k => /token|signature|credential|secret|api.?key/i.test(k)),
        `Geheime oder signierte URL in ${path.join(".")}; vor der Archivierung ersetzen.`);
    }
  }
  return scene;
}

export function assetsOf(scene) {
  const found = new Map();
  for (const { path, key, value } of walk(scene)) {
    // Tokens are never recreated. Their media are not necessary map assets.
    if (path.includes("tokens") || key === "thumb" || key === "thumbnail") continue;
    const ext = extension(value);
    if (!MEDIA[ext] && !["gif", "avif", "bmp", "m4v", "flac", "aac", "woff", "woff2"].includes(ext)) continue;
    const nativeAssetKey = /(?:src|img|image|icon|texture|background|foreground|path|file|sound|video|audio)$/i.test(key);
    const opaqueFlag = path.includes("flags") && !/^(name|text|label|description|url|href|source)$/i.test(key);
    if (!nativeAssetKey && !opaqueFlag) continue;
    // Arbitrary module flags may contain labels or expressions ending in .svg.
    // Keep those fields verbatim instead of fetching them as a single filename.
    if (path.includes("flags") && !singleFlagPath(value)) continue;
    if (!found.has(value)) found.set(value, { source: value, mime: MEDIA[ext] || null, extension: ext, paths: [] });
    found.get(value).paths.push(path);
  }
  return [...found.values()];
}

export function imageSource(scene, levelId) {
  const level = scene.levels?.find(l => l._id === levelId) ?? scene.levels?.[0];
  return level?.background?.src || scene.background?.src || "";
}

export function rewriteAssets(scene, replacements) {
  const copy = clone(scene);
  for (const asset of assetsOf(copy)) if (replacements.has(asset.source)) {
    for (const path of asset.paths) setAt(copy, path, replacements.get(asset.source));
  }
  return copy;
}

export function sceneWarnings(scene, { modules = new Set(), sceneIds = new Set() } = {}) {
  const warnings = [];
  const scopes = new Set();
  for (const { path, value, key } of walk(scene)) {
    const flag = path.indexOf("flags");
    if (flag >= 0 && path[flag + 1] && !["core", "ddb-bridge"].includes(path[flag + 1])) scopes.add(path[flag + 1]);
    if ((/script|command|macro|execute/i.test(key) || /script|macro|execute/i.test(value) && path.includes("behaviors")) && value) {
      warnings.push({ code: "executable", path: path.join("."), message: `Ausführbare oder unbekannte Automatisierung: ${path.join(".")}` });
    }
    const match = value.match(/^Scene\.([a-zA-Z0-9]+)(?:\.|$)/);
    if (match && match[1] !== scene._id && !sceneIds.has(match[1])) {
      warnings.push({ code: "reference", path: path.join("."), message: `Nicht auflösbares Szenenziel: ${value}` });
    }
    if (/sceneId$/i.test(key) && value !== scene._id && !sceneIds.has(value)) {
      warnings.push({ code: "reference", path: path.join("."), message: `Nicht auflösbare Szenenkennung: ${value}` });
    }
  }
  // Flag scopes may contain empty objects; include them as well.
  const visit = item => {
    if (!item || typeof item !== "object") return;
    for (const scope of Object.keys(item.flags ?? {})) if (!["core", "ddb-bridge"].includes(scope)) scopes.add(scope);
    for (const [key, value] of Object.entries(item)) if (key !== "flags" && value && typeof value === "object") {
      if (key === "behaviors" && Array.isArray(value)) for (const b of value) {
        if (!SAFE_BEHAVIORS.has(b.type)) warnings.push({ code: "executable", path: "regions.behaviors", message: `Region-Verhalten muss geprüft werden: ${b.type || "unbekannt"}` });
      }
      visit(value);
    }
  };
  visit(scene);
  for (const scope of scopes) warnings.push({
    code: "module", scope, message: `Drittanbieter-Daten: ${scope}${modules.has(scope) ? "" : " (Modul nicht aktiv)"}`
  });
  if (scene.tokens?.length) warnings.push({ code: "tokens", message: `${scene.tokens.length} Tokens im Original; Weltkopie wird ohne Tokens erstellt.` });
  if (scene.journal || scene.playlist || scene.notes?.length) warnings.push({
    code: "world", message: "Journal-/Playlist-Verweise und Notizen können weltabhängige Ziele besitzen. Sie bleiben erhalten; Zielprüfung in Foundry erforderlich."
  });
  return warnings;
}

// Deliberately conservative. Unknown types require explicit review, too.
const SAFE_BEHAVIORS = new Set(["adjustDarknessLevel", "pauseGame", "suppressWeather", "teleportToken", "changeScene"]);

export function prepareWorldCopy(original, { id, revision, name, includeModuleFlags = false, reviewedAutomation = false } = {}) {
  const data = validateScene(original);
  const warnings = sceneWarnings(data);
  assert(reviewedAutomation || !warnings.some(w => w.code === "executable"), "Automatisierungen müssen vor dem Weltimport ausdrücklich geprüft und bestätigt werden.");
  for (const key of ["_id", "_stats", "folder", "ownership", "thumb"]) delete data[key];
  data.active = false;
  data.navigation = false;
  if (name) data.name = name;
  const clean = item => {
    if (!item || typeof item !== "object") return;
    if (Array.isArray(item.tokens)) item.tokens = [];
    if (!includeModuleFlags && item.flags && typeof item.flags === "object") {
      item.flags = Object.fromEntries(Object.entries(item.flags).filter(([k]) => ["core", "ddb-bridge"].includes(k)));
    }
    for (const [key, value] of Object.entries(item)) if (key !== "flags" && value && typeof value === "object") clean(value);
  };
  clean(data);
  data.flags ??= {};
  data.flags["ddb-bridge"] = { ...data.flags["ddb-bridge"], entryId: id, revision };
  // Embedded IDs, levels, regions and references are intentionally retained.
  return data;
}

export function simpleScene({ name, path, width, height, grid = { type: 1, size: 100, distance: 5, units: "ft" } }) {
  assert(Number.isSafeInteger(width) && width > 0 && Number.isSafeInteger(height) && height > 0, "Ungültige Bildabmessungen.");
  return { name, width, height, padding: 0, grid: clone(grid), active: false, navigation: false,
    levels: [{ name: "Kartenebene", background: { src: path }, elevation: { bottom: 0, top: 10 } }],
    tokens: [], walls: [], lights: [], tiles: [], regions: [], flags: {} };
}
