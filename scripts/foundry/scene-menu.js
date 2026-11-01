import { assert } from "../core/util.js";
import { requireGM } from "./storage.js";
import { node } from "./ui.js";

const canManage = () => Boolean(game.user?.isGM) && Number(game.release?.generation) === 14;
const report = error => ui.notifications.error(error.message || "Map Library konnte nicht geöffnet werden.");

function worldScene(application, element) {
  // This hook also reaches compendium menus. Only resolve current-world scenes.
  if (application.collection && application.collection !== game.scenes) return null;
  const entry = element?.closest?.("[data-entry-id], [data-document-id], [data-scene-id]");
  const id = entry?.dataset.entryId || entry?.dataset.documentId || entry?.dataset.sceneId;
  return id ? game.scenes.get(id) : null;
}

export function registerSceneMenus({ openLibrary, archiveScene }) {
  Hooks.on("renderSceneDirectory", (application, element) => {
    if (!element?.querySelector) return;
    const existing = element.querySelector(".ml-scene-tools");
    if (!canManage()) { existing?.remove(); return; }
    if (existing) return;
    const tools = node("div", null, "ml-scene-tools");
    const launch = node("button", null, "ml-scene-library"); launch.type = "button";
    const icon = node("i", null, "fa-solid fa-map"); icon.setAttribute("aria-hidden", "true");
    launch.append(icon, node("span", "Map Library öffnen"));
    launch.addEventListener("click", async event => {
      event.preventDefault(); event.stopPropagation(); launch.disabled = true;
      try { requireGM(); assert(canManage(), "Map Library unterstützt ausschließlich Foundry VTT v14."); await openLibrary(); }
      catch (error) { report(error); }
      finally { launch.disabled = false; }
    });
    tools.append(launch);
    const content = element.querySelector(".window-content") ?? element;
    const footer = content.querySelector(".directory-footer, [data-application-part='footer'], footer");
    if (footer) footer.before(tools); else content.append(tools);
  });

  Hooks.on("getSceneContextOptions", (application, menuItems) => {
    if (!canManage() || menuItems.some(item => item.mapLibraryArchive)) return;
    menuItems.push({
      name: "In Map Library sichern", icon: '<i class="fa-solid fa-box-archive" aria-hidden="true"></i>',
      mapLibraryArchive: true,
      condition: element => canManage() && Boolean(worldScene(application, element)),
      callback: async element => {
        try {
          requireGM(); assert(canManage(), "Map Library unterstützt ausschließlich Foundry VTT v14.");
          const scene = worldScene(application, element);
          assert(scene, "Szene existiert nicht mehr in dieser Welt.");
          await archiveScene(scene.id);
        } catch (error) { report(error); }
      }
    });
  });
}
