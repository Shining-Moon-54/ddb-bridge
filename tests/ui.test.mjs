import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { MemoryStorage, runtime } from "./helpers.mjs";
import { makeApplications, node } from "../scripts/foundry/ui.js";

test("gallery renders only one page; untrusted names remain text", async () => {
  runtime(); const { document } = parseHTML("<html><body></body></html>"); globalThis.document = document;
  class App { constructor() {} async _onClose() {} async render() { this.root = await this._renderHTML(); return this; } }
  foundry.applications = { api: { ApplicationV2: App } };
  globalThis.ui = { notifications: { error() {}, info() {}, warn() {} } };
  const storage = new MemoryStorage();
  storage.catalog.entries = Array.from({ length: 5000 }, (_, i) => ({ id: `map-${i}`, name: i ? `Map ${i}` : "<img src=x onerror=alert(1)>",
    category: "dungeons", levels: 32, bytes: 1024, tags: [], warnings: [], thumbnail: null, updated: "2026-10-24", width: 100, height: 100 }));
  const { MapLibraryApp } = makeApplications(storage, {}); const app = new MapLibraryApp(); await app.render();
  assert.equal(app.root.querySelectorAll("article").length, 48); assert.equal(app.root.querySelectorAll("img").length, 0);
  assert(app.root.textContent.includes("<img src=x onerror=alert(1)>"));
  app.query.search = "no possible match"; app.paint(); assert.equal(app.gallery.querySelectorAll("article").length, 0);
  assert.equal(node("span", "<script>bad</script>").querySelector("script"), null);
});
