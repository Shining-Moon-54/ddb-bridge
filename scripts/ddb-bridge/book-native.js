/**
 * Narrow alpha importer for locally supplied, Foundry-native-compatible test
 * fixtures. It is NOT a D&D Beyond source adapter or entitlement verifier.
 *
 * All mapping/validation stays independent of Foundry for Node testability.
 */
import { sourceKey, planBookImport } from "./book-plan.js";
import { ID } from "../core/constants.js";

const PROVIDERS = new Set(["fixture", "local"]);
const ITEM_TYPES = new Set(["equipment", "weapon", "consumable", "loot", "tool", "container"]);

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function text(value) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 240;
}
function inspect(value, depth = 0) {
  if (depth > 32) throw Error("nested-data-limit");
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (["__proto__", "prototype", "constructor"].includes(key)) throw Error("unsafe-object-key");
      inspect(child, depth + 1);
    }
  }
}
function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 25) || "book";
}
function hash(value) {
  // Stable non-security hash to avoid common slug collisions.
  let state = 2166136261;
  for (const byte of new TextEncoder().encode(value)) {
    state = Math.imul(state ^ byte, 16777619) >>> 0;
  }
  return state.toString(16).padStart(8, "0");
}
function packInfo(book, kind) {
  const group = kind === "spell" ? "spells" : "items";
  const identity = JSON.stringify([book.provider, book.bookId, book.edition]);
  return {
    name: "ddb-bridge-" + slug(book.bookId) + "-" + hash(identity) + "-" + group,
    label: "DDB Bridge | " + book.title.slice(0, 75) + " | " + book.edition + " | " + group,
    type: "Item"
  };
}

/** Convert only local fixture payloads explicitly marked as native-compatible. */
export function prepareNativeBook(book) {
  const plan = planBookImport(book);
  if (!PROVIDERS.has(book.provider)) {
    throw Error("Nur lokale oder synthetische Quellen erlaubt; D&D-Beyond-Zugriff ist nicht angebunden.");
  }
  if (book.entries.length > 250) throw Error("Alpha-Limit: maximal 250 Einträge pro Import.");
  const planned = new Set(plan.entries.filter(e => e.status === "planned").map(e => e.sourceKey));
  const seen = new Set(), candidates = [], omitted = [];
  for (const entry of book.entries) {
    let key;
    try {
      key = sourceKey({
        provider: book.provider, bookId: book.bookId, kind: entry.kind,
        sourceId: entry.sourceId, edition: entry.edition ?? book.edition,
        variant: entry.variant ?? "default"
      });
    } catch {
      omitted.push({ reason: "invalid-entry" });
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    if (!planned.has(key)) {
      omitted.push({ sourceKey: key, reason: "no-importable-payload" });
      continue;
    }
    if (!["spell", "item"].includes(entry.kind)) {
      omitted.push({ sourceKey: key, reason: "document-converter-not-implemented" });
      continue;
    }
    const payload = entry.payload;
    const type = entry.kind === "spell" ? "spell" : payload?.type;
    if (!record(payload) || payload.format !== "foundry-dnd5e-v6" ||
        !text(payload.name) || !record(payload.system) ||
        (entry.kind === "item" && !ITEM_TYPES.has(type)) ||
        (entry.kind === "spell" && payload.type !== "spell")) {
      omitted.push({ sourceKey: key, reason: "native-format-required" });
      continue;
    }
    if (entry.kind === "spell" &&
        (!Number.isInteger(payload.system.level) || payload.system.level < 0 || payload.system.level > 9)) {
      omitted.push({ sourceKey: key, reason: "spell-level-required" });
      continue;
    }
    try {
      inspect(payload.system);
      if (JSON.stringify(payload.system).length > 65536) throw Error("large-data");
    } catch {
      omitted.push({ sourceKey: key, reason: "unsafe-or-large-payload" });
      continue;
    }
    const pack = packInfo(book, entry.kind);
    candidates.push({
      sourceKey: key,
      pack,
      document: {
        name: payload.name.trim(),
        type,
        system: structuredClone(payload.system),
        flags: {
          [ID]: {
            sourceKey: key, provider: book.provider, bookId: book.bookId,
            edition: entry.edition ?? book.edition, kind: entry.kind,
            completeness: "unverified"
          }
        }
      }
    });
  }
  return {
    summary: {
      title: plan.title, provider: book.provider, edition: book.edition,
      total: plan.total, ready: candidates.length,
      omitted: omitted.length, duplicateOrInvalid: plan.skipped,
      warnings: omitted
    },
    candidates
  };
}

/**
 * Writes only new documents in dedicated world compendiums. No world directory
 * documents, existing premium packs, or existing compendium documents are changed.
 * No raw payloads are returned in reports or logged.
 */
export async function importPreparedBook(prepared, runtime) {
  runtime.requireGM();
  if (runtime.systemId !== "dnd5e" || runtime.generation !== 14) {
    throw Error("Benötigt Foundry V14 mit dem Spielsystem dnd5e.");
  }
  const report = { created: 0, existing: 0, failed: 0, errors: [], packs: [] };
  const groups = new Map();
  for (const candidate of prepared.candidates) {
    if (!groups.has(candidate.pack.name)) groups.set(candidate.pack.name, []);
    groups.get(candidate.pack.name).push(candidate);
  }
  for (const candidates of groups.values()) {
    runtime.requireGM();
    const descriptor = candidates[0].pack;
    const id = "world." + descriptor.name;
    let pack = runtime.packs.get(id);
    if (!pack) {
      pack = await runtime.createCompendium({
        name: descriptor.name, label: descriptor.label,
        type: "Item", package: "world", system: "dnd5e"
      });
    }
    if (pack.collection !== id || pack.metadata?.label !== descriptor.label ||
        pack.documentName !== "Item" || pack.locked) {
      throw Error("Kompendium ist fremd, gesperrt oder hat unerwartete Metadaten: " + id);
    }
    report.packs.push(id);
    const existing = new Set();
    for (const document of await pack.getDocuments()) {
      const key = document.getFlag(ID, "sourceKey");
      if (typeof key === "string") existing.add(key);
    }
    for (const candidate of candidates) {
      runtime.requireGM();
      if (existing.has(candidate.sourceKey)) { report.existing++; continue; }
      try {
        const created = await pack.documentClass.createDocuments([candidate.document], { pack: pack.collection });
        if (!Array.isArray(created) || created.length !== 1) throw Error("create-failed");
        existing.add(candidate.sourceKey);
        report.created++;
      } catch {
        report.failed++;
        report.errors.push({ sourceKey: candidate.sourceKey, code: "foundry-document-create-failed" });
      }
    }
  }
  return report;
}
