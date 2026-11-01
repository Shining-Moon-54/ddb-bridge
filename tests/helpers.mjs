import { emptyCatalog, validateCatalog } from "../scripts/core/catalog.js";
import { DOMParser as XMLDOMParser } from "@xmldom/xmldom";
export const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aP9sAAAAASUVORK5CYII=", "base64"));
export const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Synthetic icon</title><path fill="#fff" d="M1 1H19V19H1Z"/></svg>');
export function fixture() {
  return {
    _id: "OriginalScene001", name: "Synthetic tower", width: 2400, height: 1600,
    grid: { type: 1, size: 100, distance: 5, units: "ft" },
    active: true, navigation: true, folder: "OldFolder0000001", ownership: { default: 0 },
    _stats: { coreVersion: "14.368" }, initialLevel: "Level00000000000",
    levels: Array.from({ length: 32 }, (_, i) => ({ _id: `Level${String(i).padStart(11, "0")}`,
      name: `Level ${i}`, elevation: { bottom: i * 10, top: (i + 1) * 10 },
      background: { src: `worlds/test/level-${i}.png`, offsetX: 7 },
      foreground: { src: `worlds/test/roof-${i}.webp` }, visibility: { levels: [] }, flags: { vendor: { level: i } } })),
    walls: [{ _id: "Wall000000000001", c: [0, 0, 100, 100], door: 1, ds: 0 }],
    lights: [{ _id: "Light00000000001", x: 120, y: 130, config: { dim: 15, bright: 5 } }],
    tiles: [{ _id: "Tile000000000001", texture: { src: "worlds/test/tile.png" }, roof: true }],
    drawings: [{ _id: "Drawing000000001", texture: "worlds/test/pattern.png", text: "Room A" }],
    regions: [{ _id: "Region0000000001", shapes: [{ type: "rectangle", x: 0, y: 0, width: 100, height: 100 }],
      behaviors: [{ _id: "Behavior00000001", type: "teleportToken", system: { destination: "Scene.MissingScene0001.Region.Destination00001" } }] }],
    tokens: [{ _id: "Token00000000001", actorId: "Actor00000000001", texture: { src: "worlds/test/actor.png" } }],
    flags: { core: { test: true }, vendor: { required: true, picture: "worlds/test/flag.png" } },
    sounds: [{ path: "worlds/test/ambience.ogg" }], fog: { mode: 1, reset: null }, tokenVision: true
  };
}
export class MemoryStorage {
  constructor() { this.files = new Map(); this.catalog = emptyCatalog(); this.uploadCount = 0; this.failAt = Infinity; }
  async init() {}
  async load() { return { catalog: structuredClone(this.catalog), head: "root" }; }
  async upload(path, bytes) {
    if (++this.uploadCount === this.failAt) throw new Error("Synthetic upload failure");
    if (this.files.has(path)) throw new Error("Attempted overwrite");
    this.files.set(path, bytes.slice()); return path;
  }
  async read(path) { if (!this.files.has(path)) throw new Error("Missing file"); return this.files.get(path).slice(); }
  async transaction(fn) { this.catalog = validateCatalog(await fn(structuredClone(this.catalog))); return this.catalog; }
}
// Foundry Collection iterates values, unlike Map's [key, value] pairs.
// Model this documented contract so a non-empty runtime exposes API mistakes.
export class FoundryCollection extends Map {
  [Symbol.iterator]() { return this.values(); }
  map(transform) { return Array.from(this.values(), transform); }
}
export function runtime() {
  // Match the browser's strict XML contract using a Node-only test parser.
  globalThis.DOMParser = class extends XMLDOMParser {
    constructor() { super({ onError: () => { throw new Error("Malformed XML"); } }); }
    // Native DOMParser treats image/svg+xml as ordinary XML. xmldom adds a
    // default SVG namespace for that MIME, so use its ordinary XML mode here.
    parseFromString(source) { return super.parseFromString(source, "application/xml"); }
  };
  globalThis.game = { user: { isGM: true }, version: "14.368", release: { generation: 14 },
    modules: new FoundryCollection([["ddb-bridge", { id: "ddb-bridge", active: true }]]), scenes: new FoundryCollection() };
  globalThis.foundry = { utils: { randomID: () => "NewWorldScene001" } };
}
