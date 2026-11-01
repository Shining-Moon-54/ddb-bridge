import test from "node:test";
import assert from "node:assert/strict";
import { setImmediate } from "node:timers/promises";
import { parseHTML } from "linkedom";
import { registerSceneMenus } from "../scripts/foundry/scene-menu.js";
import { makeApplications } from "../scripts/foundry/ui.js";
import { LibraryService } from "../scripts/foundry/service.js";
import { FoundryCollection, MemoryStorage, png, runtime } from "./helpers.mjs";

function setup() {
  runtime(); const { document } = parseHTML("<html><body></body></html>"); globalThis.document = document;
  const hooks = new Map(), once = new Map(), errors = [];
  globalThis.Hooks = { on: (name, fn) => hooks.set(name, fn), once: (name, fn) => once.set(name, fn) };
  globalThis.ui = { notifications: { error: message => errors.push(message), info() {}, warn() {} } };
  return { document, hooks, once, errors };
}

test("scene directory offers one library button across rerenders and preserves other controls", async () => {
  const { document, hooks } = setup(); let opens = 0;
  registerSceneMenus({ openLibrary: async () => { opens++; }, archiveScene: async () => {} });
  const root = document.createElement("section");
  root.innerHTML = '<div class="window-content"><ol class="directory-list"></ol><footer class="directory-footer"><button>Other module</button></footer></div>';
  const render = hooks.get("renderSceneDirectory"), app = { collection: game.scenes };
  render(app, root); render(app, root);
  assert.equal(root.querySelectorAll(".ml-scene-library").length, 1);
  assert.equal(root.querySelector(".directory-footer button").textContent, "Other module");
  root.querySelector(".ml-scene-library").click(); await setImmediate(); assert.equal(opens, 1);
  const popout = document.createElement("section"); render(app, popout);
  assert.equal(popout.querySelectorAll(".ml-scene-library").length, 1);
});

test("v14 scene context entries target the clicked world scene and ignore folders and compendiums", async () => {
  const { document, hooks } = setup(); const selected = [];
  game.scenes.set("first", { id: "first" }); game.scenes.set("second", { id: "second" });
  registerSceneMenus({ openLibrary: async () => {}, archiveScene: async id => selected.push(id) });
  const menu = [{ name: "Existing action" }], app = { collection: game.scenes };
  const prepare = hooks.get("getSceneContextOptions"); prepare(app, menu); prepare(app, menu);
  assert.equal(menu.length, 2); assert.equal(menu[0].name, "Existing action");
  const option = menu[1]; assert.equal(option.name, "In Map Library sichern");
  for (const attribute of ["data-entry-id", "data-document-id", "data-scene-id"]) {
    const row = document.createElement("li"); row.setAttribute(attribute, "second");
    const child = document.createElement("span"); row.append(child);
    assert(option.condition(child)); await option.callback(child);
  }
  assert.deepEqual(selected, ["second", "second", "second"]);
  const folder = document.createElement("li"); folder.dataset.folderId = "second";
  assert.equal(option.condition(folder), false);
  const compendiumMenu = []; prepare({ collection: new FoundryCollection() }, compendiumMenu);
  const row = document.createElement("li"); row.dataset.documentId = "second";
  assert.equal(compendiumMenu[0].condition(row), false);
});

test("scene shortcuts enforce current GM permissions and report failed or stale actions", async () => {
  const { document, hooks, errors } = setup(); let opens = 0, archives = 0;
  registerSceneMenus({ openLibrary: async () => { opens++; throw new Error("Synthetic opening error"); }, archiveScene: async () => { archives++; } });
  const app = { collection: game.scenes }, root = document.createElement("section");
  const render = hooks.get("renderSceneDirectory"), prepare = hooks.get("getSceneContextOptions");
  render(app, root); const button = root.querySelector("button");
  button.click(); await setImmediate(); assert.equal(button.disabled, false); assert.match(errors.at(-1), /Synthetic/);
  game.scenes.set("scene", { id: "scene" });
  const row = document.createElement("li"); row.dataset.entryId = "scene";
  const menu = []; prepare(app, menu); assert(menu[0].condition(row)); game.scenes.delete("scene");
  await menu[0].callback(row); assert.match(errors.at(-1), /existiert nicht mehr/); assert.equal(archives, 0);
  game.user.isGM = false; render(app, root); assert.equal(root.querySelector("button"), null);
  const playerMenu = []; prepare(app, playerMenu); assert.equal(playerMenu.length, 0);
  button.click(); await setImmediate(); await menu[0].callback(row);
  assert.equal(opens, 1); assert.equal(archives, 0); assert.match(errors.at(-1), /Spielleitungen/);
});

test("direct scene shortcut opens its review without archiving or changing the original", async () => {
  setup();
  class App { constructor(options) { this.options = options; } async render() { this.root = await this._renderHTML(); return this; } }
  foundry.applications = { api: { ApplicationV2: App } };
  const storage = new MemoryStorage(); storage.files.set("worlds/test/map.png", png);
  const original = { name: "Selected scene", width: 1, height: 1, levels: [{ background: { src: "worlds/test/map.png" } }] };
  const before = structuredClone(original); let reads = 0;
  game.scenes.set("first", { id: "first", toObject: () => { throw new Error("Wrong scene selected"); } });
  game.scenes.set("second", { id: "second", name: original.name, toObject: () => { reads++; return original; } });
  const service = new LibraryService(storage, { imageInspector: async () => null });
  const { archiveWorldScene } = makeApplications(storage, service);
  const preview = await archiveWorldScene("second");
  assert.equal(reads, 1); assert.equal(preview.root.querySelector('input[name="name"]').value, "Selected scene");
  assert.equal(storage.catalog.entries.length, 0); assert.equal(storage.uploadCount, 0); assert.deepEqual(original, before);
  await assert.rejects(() => archiveWorldScene("deleted"), /existiert nicht mehr/);
  game.user.isGM = false; await assert.rejects(() => archiveWorldScene("second"), /Spielleitungen/);
});

test("module initialization registers scene hooks before the first directory render", async () => {
  const { hooks, once } = setup();
  foundry.applications = { api: { ApplicationV2: class {} } };
  game.settings = { registerMenu() {}, register() {} };
  await import("../scripts/main.js"); once.get("init")();
  assert(hooks.has("renderSceneDirectory")); assert(hooks.has("getSceneContextOptions"));
  assert.equal(typeof game.modules.get("ddb-bridge").api.archiveScene, "function");
});
