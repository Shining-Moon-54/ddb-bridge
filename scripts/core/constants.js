export const ID = "ddb-bridge";
export const VERSION = "0.1.0-alpha.1";
export const FORMAT = "map-library/1";
export const MiB = 1024 * 1024;
export const LIMITS = Object.freeze({
  archive: 128 * MiB, expanded: 256 * MiB, file: 64 * MiB,
  json: 16 * MiB, svg: 2 * MiB, files: 5000, ratio: 200, depth: 80, nodes: 500000
});
export const MEDIA = Object.freeze({
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", svg: "image/svg+xml",
  webm: "video/webm", mp4: "video/mp4", ogg: "audio/ogg",
  mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4"
});
export const DEFAULT_CATEGORIES = Object.freeze([
  { id: "uncategorized", name: "Ohne Kategorie", parent: null },
  { id: "dungeons", name: "Dungeons & Verliese", parent: null },
  { id: "nature", name: "Natur & Wildnis", parent: null },
  { id: "settlements", name: "Städte & Siedlungen", parent: null },
  { id: "interiors", name: "Gebäude & Innenräume", parent: null }
]);
