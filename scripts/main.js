import { ID, VERSION } from "./core/constants.js";
import { FoundryStorage, requireGM } from "./foundry/storage.js";
import { LibraryService } from "./foundry/service.js";
import { makeApplications, node } from "./foundry/ui.js";
import { diagnoseScene } from "./foundry/diagnostics.js";
import { registerSceneMenus } from "./foundry/scene-menu.js";
import { CloudService } from "./foundry/cloud.js";

Hooks.once("init", () => {
  const storage = new FoundryStorage(), service = new LibraryService(storage);
  const cloud = new CloudService();
  const { MapLibraryApp, CloudSettingsApp, archiveWorldScene } = makeApplications(storage, service, cloud);
  const open = () => { requireGM(); return new MapLibraryApp().render({ force: true }); };
  game.settings.registerMenu(ID, "library", {
    name: "Map Library öffnen", label: "Bibliothek öffnen", icon: "fa-solid fa-map",
    hint: "Weltübergreifendes Archiv für native Foundry-v14-Szenen. Experimentelle Alpha.", type: MapLibraryApp, restricted: true
  });
  game.settings.registerMenu(ID, "cloud", {
    name: "Map Library – Cloud-Konten", label: "Cloud-Konten verwalten", icon: "fa-solid fa-cloud",
    hint: "Google Drive und Dropbox für manuelle Kartenexporte einrichten. Eigene Anbieter-App-Kennung erforderlich.", type: CloudSettingsApp, restricted: true
  });
  game.settings.register(ID, "launcher", { name: "Schwebende Map-Library-Schaltfläche anzeigen", scope: "client", config: true, type: Boolean, default: true, requiresReload: true });
  game.modules.get(ID).api = Object.freeze({ version: VERSION, open, archiveScene: archiveWorldScene, storage, service, diagnoseScene });
  registerSceneMenus({ openLibrary: open, archiveScene: archiveWorldScene });
});

Hooks.once("ready", () => {
  if (!game.user.isGM) return;
  if (Number(game.release?.generation) !== 14) {
    ui.notifications.error("Map Library unterstützt ausschließlich Foundry VTT v14."); return;
  }
  if (game.settings.get(ID, "launcher")) {
    const launch = node("button", "Map Library", "ml-launcher"); launch.type = "button";
    launch.addEventListener("click", () => { game.modules.get(ID).api.open().catch(error => ui.notifications.error(error.message)); });
    document.body.append(launch);
  }
});
