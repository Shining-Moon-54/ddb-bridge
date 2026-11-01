import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { makeApplications } from "../scripts/foundry/ui.js";
import { LibraryService } from "../scripts/foundry/service.js";
import { CloudService } from "../scripts/foundry/cloud.js";
import { MemoryStorage, runtime } from "./helpers.mjs";

async function setup({ cloud = false } = {}) {
  runtime(); const { document } = parseHTML("<html><head></head><body></body></html>"); globalThis.document = document;
  Object.defineProperty(document, "baseURI", { value: "https://foundry.example/game", configurable: true });
  const windows = [], errors = [];
  class App {
    constructor(options = {}) { this.options = options; windows.push(this); }
    async _onClose() {}
    async render() { this.root = await this._renderHTML(); return this; }
    async close() { this.closed = true; await this._onClose({}); }
  }
  foundry.applications = { api: { ApplicationV2: App } };
  globalThis.ui = { notifications: { error: message => errors.push(message), info() {}, warn() {} } };
  const storage = new MemoryStorage(), service = new LibraryService(storage);
  const record = { id: "test-map", revision: "test-revision", name: "<script>map</script>", hash: "a".repeat(64), scene: "maps/original.json",
    category: "uncategorized", tags: [], warnings: [], levels: 1, bytes: 100, updated: "2026-10-24T00:00:00Z" };
  storage.catalog.entries = [record];
  const values = new Map();
  const cloudService = cloud ? new CloudService({ store: () => ({ getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }) }) : null;
  const classes = makeApplications(storage, service, cloudService); const app = new classes.MapLibraryApp(); await app.render();
  return { app, record, storage, windows, errors, cloud: cloudService, ...classes };
}
async function click(root, label) {
  const target = [...root.querySelectorAll("button")].find(button => button.textContent === label); assert(target, label);
  target.click();
  for (let tries = 0; target.disabled && tries < 100; tries++) await new Promise(resolve => setImmediate(resolve));
  assert(!target.disabled, `Action still running: ${label}`);
}

test("gallery deletion requires confirmation, renders names safely and can be cancelled", async () => {
  const { app, storage, windows, errors } = await setup();
  await click(app.root, "Löschen");
  const dialog = windows.at(-1); assert(dialog.root.textContent.includes("Papierkorb")); assert.equal(dialog.root.querySelector("script"), null);
  assert.equal(storage.catalog.entries[0].archived, undefined); await click(dialog.root, "Abbrechen");
  assert(dialog.closed); assert.equal(storage.catalog.entries[0].archived, undefined); assert.equal(errors.length, 0);
});

test("confirmed deletion removes the card; trash restores it and clears stale selections", async () => {
  const { app, storage, windows, record, errors } = await setup(); app.selection.add(record.id);
  await click(app.root, "Auswahl löschen"); await click(windows.at(-1).root, "In Papierkorb verschieben");
  assert.equal(storage.catalog.entries[0].archived, true); assert.equal(app.gallery.querySelectorAll("article").length, 0); assert.equal(app.selection.size, 0);
  app.query.archived = true; await app.render(); assert.equal(app.gallery.querySelectorAll("article").length, 1);
  assert(![...app.gallery.querySelectorAll("button")].some(button => button.textContent === "Löschen"));
  await click(app.root, "Wiederherstellen"); assert.equal(app.gallery.querySelectorAll("article").length, 0);
  app.query.archived = false; await app.render(); assert.equal(app.gallery.querySelectorAll("article").length, 1); assert.equal(errors.length, 0);
});

test("stale deletion dialog leaves a changed card intact and reports the conflict", async () => {
  const { app, windows, storage, errors } = await setup(); await click(app.root, "Löschen");
  storage.catalog.entries[0].updated = "changed";
  await click(windows.at(-1).root, "In Papierkorb verschieben");
  assert.equal(storage.catalog.entries[0].archived, undefined); assert(errors.some(error => /geändert/.test(error)));
});

test("cloud setup begins with provider choice and shows only that provider's credentials", async () => {
  const { app, windows, CloudSettingsApp, errors } = await setup({ cloud: true });
  assert([...app.root.querySelectorAll("button")].some(button => button.textContent === "Cloud-Konten"));
  const manager = new CloudSettingsApp(); await manager.render(); await click(manager.root, "Cloud hinzufügen");
  const dialog = windows.at(-1), provider = dialog.root.querySelector('[name="provider"]');
  assert(dialog.root.textContent.includes("Google-OAuth-Client-ID")); assert(!dialog.root.textContent.includes("Dropbox-App-Key"));
  const option = [...provider.options].find(option => option.value === "dropbox"); option.selected = true;
  provider.dispatchEvent(new document.defaultView.Event("change"));
  assert(dialog.root.textContent.includes("Dropbox-App-Key")); assert(!dialog.root.textContent.includes("Google-OAuth-Client-ID"));
  assert.equal(dialog.root.querySelector('input[name="clientSecret"]'), null); assert.equal(errors.length, 0);
});

test("cloud export with no profiles offers setup without attempting a transfer", async () => {
  const { app, windows, errors } = await setup({ cloud: true }); await click(app.root, "In Cloud exportieren");
  const dialog = windows.at(-1); assert(dialog.root.textContent.includes("Zuerst ein Google-Drive- oder Dropbox-Profil"));
  assert([...dialog.root.querySelectorAll("button")].some(button => button.textContent === "Cloud-Konten einrichten"));
  assert.equal(errors.length, 0);
});
