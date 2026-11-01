/**
 * DDB Bridge: side-effect-free book inventory planner.
 * Does NOT fetch content or write Foundry compendiums.
 * Input must come from a separately verified, authorized source adapter.
 */
const TYPES = Object.freeze({
  class: "character-options", subclass: "character-options",
  species: "character-options", background: "character-options",
  feat: "character-options", feature: "character-options",
  spell: "spells", item: "items", monster: "actors", npc: "actors",
  journal: "journals", rolltable: "tables", scene: "scenes"
});
const EDITIONS = new Set(["2014", "2024", "legacy", "unknown"]);
const str = (v, field) => {
  if (typeof v !== "string" || !v.trim()) throw new TypeError(`Missing or invalid ${field}`);
  if (v.length > 240) throw new TypeError(`Field ${field} is too long`);
  return v.trim();
};

/** Stable source identity; not based on translated names. */
export function sourceKey({ provider, bookId, kind, sourceId, edition, variant = "default" }) {
  const values = [
    str(provider, "provider"), str(bookId, "bookId"),
    str(kind, "kind"), str(sourceId, "sourceId"),
    str(edition, "edition"), str(variant, "variant")
  ];
  if (!EDITIONS.has(values[4])) throw new TypeError("Unsupported rules edition");
  if (!Object.hasOwn(TYPES, values[2])) throw new TypeError("Unsupported entry kind");
  return JSON.stringify(values);
}

/**
 * Plan authorized book inventory without copying copyrighted payloads into logs.
 * access must already have been confirmed by a trusted source connector;
 * this planner itself is not an entitlement/security verifier.
 */
export function planBookImport(book) {
  if (!book || typeof book !== "object") throw new TypeError("Book is required");
  const provider = str(book.provider, "provider");
  const bookId = str(book.bookId, "bookId");
  const title = str(book.title, "title");
  const edition = str(book.edition, "edition");
  if (!EDITIONS.has(edition)) throw new TypeError("Unsupported book edition");
  if (book.access !== "confirmed") throw new Error("Book access not confirmed by source adapter");
  if (!Array.isArray(book.entries)) throw new TypeError("Book entries must be an array");
  if (book.entries.length > 100000) throw new RangeError("Book inventory exceeds safety limit");
  const seen = new Set();
  const entries = [];
  const warnings = [];
  for (let i = 0; i < book.entries.length; i++) {
    const item = book.entries[i];
    try {
      if (!item || typeof item !== "object") throw new TypeError("Entry must be an object");
      const kind = str(item.kind, "kind");
      const itemEdition = item.edition ?? edition;
      const id = sourceKey({ provider, bookId, kind, sourceId: item.sourceId, edition: itemEdition, variant: item.variant ?? "default" });
      if (seen.has(id)) {
        warnings.push({ index: i, code: "duplicate-source-key" });
        continue;
      }
      seen.add(id);
      const deps = Array.isArray(item.dependencies) ? item.dependencies.length : 0;
      entries.push({
        sourceKey: id,
        kind,
        edition: itemEdition,
        target: TYPES[kind],
        dependencyCount: deps,
        status: item.payload == null ? "unsupported" : "planned"
      });
    } catch (error) {
      warnings.push({ index: i, code: "invalid-entry", reason: error.message });
    }
  }
  const categories = Object.fromEntries(
    [...new Set(entries.map((entry) => entry.target))].sort().map((target) => [
      target, entries.filter((entry) => entry.target === target).length
    ])
  );
  return { provider, bookId, title, edition, total: book.entries.length,
    planned: entries.filter((x) => x.status === "planned").length,
    unsupported: entries.filter((x) => x.status === "unsupported").length,
    skipped: book.entries.length - entries.length,
    categories, entries, warnings };
}
