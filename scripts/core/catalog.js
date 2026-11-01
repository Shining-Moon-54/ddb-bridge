import { DEFAULT_CATEGORIES, FORMAT } from "./constants.js";
import { assert, clone, safeId, safePath } from "./util.js";

export function emptyCatalog() { return { format: FORMAT, categories: clone(DEFAULT_CATEGORIES), entries: [] }; }
export function validateCatalog(value) {
  assert(value?.format === FORMAT && Array.isArray(value.entries) && Array.isArray(value.categories), "Unbekanntes Katalogformat.");
  const ids = new Set();
  for (const cat of value.categories) {
    safeId(cat.id); assert(!ids.has(cat.id) && typeof cat.name === "string" && cat.name.trim(), "Ungültige oder doppelte Kategorie."); ids.add(cat.id);
  }
  for (const cat of value.categories) {
    let parent = cat.parent;
    const seen = new Set([cat.id]);
    while (parent) {
      assert(ids.has(parent) && !seen.has(parent), "Ungültige Kategoriehierarchie oder Kreisbezug.");
      seen.add(parent); parent = value.categories.find(c => c.id === parent).parent;
    }
  }
  const entries = new Set();
  for (const entry of value.entries) {
    safeId(entry.id); safeId(entry.revision); safePath(entry.scene);
    assert(!entries.has(entry.id) && ids.has(entry.category), "Doppelter Eintrag oder unbekannte Kategorie.");
    assert(typeof entry.name === "string" && /^[a-f0-9]{64}$/.test(entry.hash), "Ungültige Kartenmetadaten.");
    entries.add(entry.id);
  }
  return value;
}
export function setCategory(catalog, category) {
  const copy = clone(catalog);
  const index = copy.categories.findIndex(c => c.id === category.id);
  if (index >= 0) copy.categories[index] = clone(category); else copy.categories.push(clone(category));
  return validateCatalog(copy);
}
export function categoryPath(catalog, id) {
  const result = [];
  let current = catalog.categories.find(c => c.id === id);
  while (current) { result.unshift(current.name); current = catalog.categories.find(c => c.id === current.parent); }
  return result.join(" / ");
}
export function descendants(catalog, id) {
  const result = new Set([id]);
  let previous;
  do { previous = result.size; for (const cat of catalog.categories) if (result.has(cat.parent)) result.add(cat.id); } while (previous !== result.size);
  return result;
}
export function queryCatalog(catalog, { search = "", category = "", favorites = false, archived = false, sort = "name", page = 0, pageSize = 48 } = {}) {
  const terms = search.toLocaleLowerCase("de").split(/\s+/).filter(Boolean);
  const cats = category ? descendants(catalog, category) : null;
  const entries = catalog.entries.filter(e => Boolean(e.archived) === Boolean(archived) && (!favorites || e.favorite) && (!cats || cats.has(e.category))).filter(e => {
    const haystack = [e.name, e.description, e.author, e.license, ...(e.tags || [])].join(" ").toLocaleLowerCase("de");
    return terms.every(t => haystack.includes(t));
  });
  entries.sort(sort === "newest" ? (a, b) => b.updated.localeCompare(a.updated) : (a, b) => a.name.localeCompare(b.name, "de"));
  const size = Math.max(1, Math.min(100, Math.trunc(pageSize)));
  const pages = Math.max(1, Math.ceil(entries.length / size));
  const selected = Math.max(0, Math.min(pages - 1, Math.trunc(page)));
  return { entries: entries.slice(selected * size, (selected + 1) * size), total: entries.length, page: selected, pages };
}
