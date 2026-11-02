import { ID } from "../core/constants.js";
import { requireGM } from "../foundry/storage.js";

function element(tag, text, css = "") {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = String(text);
  if (css) e.className = css;
  return e;
}

export function registerBookLibrary({ openMaps }) {
  class BookLibraryApp extends foundry.applications.api.ApplicationV2 {
    static DEFAULT_OPTIONS = {
      id: "ddb-bridge-book-library",
      classes: ["ddb-book-library"],
      position: { width: 840, height: 680 },
      window: { title: "DDB Bridge – Book Library", resizable: true }
    };
    async _renderHTML() {
      requireGM();
      const root = element("section", undefined, "ddb-books");
      root.append(element("h2", "DDB Bridge – Buchbibliothek"));
      root.append(element("p", "Direktimport aus D&D Beyond über den bereits eingerichteten DDB Importer (Test-Alpha).", "ddb-book-notice"));

      // Direct, authenticated book imports are delegated to the installed DDB Importer.
      // DDB Bridge never reads, copies or logs the user's Cobalt session.
      const importer = game.modules.get("ddb-importer");
      const ddbApi = importer?.active ? importer.api : null;
      const direct = element("section", undefined, "ddb-direct-import");
      direct.append(element("h3", "Direkt aus D&D Beyond importieren"));
      if (!ddbApi) {
        direct.append(element("p", "DDB Importer muss in dieser Welt installiert, aktiviert und für dein D&D-Beyond-Konto eingerichtet sein."));
      } else {
        direct.append(element("p", "Bücher werden über deine bestehende DDB-Importer-Verbindung geladen. Die Liste zeigt verfügbare D&D-Beyond-Quellen, nicht ausschließlich deine Käufe."));
        const sources = (CONFIG.DDB?.sources ?? [])
          .filter(source => Number.isSafeInteger(Number(source?.id)) && Number(source.id) > 0 && source.description)
          .sort((a, b) => String(a.description).localeCompare(String(b.description), "de"));
        const selector = element("select");
        selector.setAttribute("aria-label", "D&D-Beyond-Buch auswählen");
        const placeholder = element("option", "Buch auswählen"); placeholder.value = ""; selector.append(placeholder);
        for (const source of sources) {
          const option = element("option", source.description); option.value = String(source.id); selector.append(option);
        }
        const run = element("button", "Buch direkt importieren"); run.type = "button";
        const status = element("p", "Der Import kann je nach Buch mehrere Minuten dauern.");
        run.addEventListener("click", async () => {
          const bookId = Number(selector.value);
          if (!sources.some(source => Number(source.id) === bookId)) {
            ui.notifications.warn("Bitte zuerst ein Buch auswählen."); return;
          }
          const importBook = game.modules.get("ddb-importer")?.api?.lib?.DDBAdventure?.AdventureImport;
          if (typeof importBook !== "function") {
            status.textContent = "Diese DDB-Importer-Version stellt keinen direkten Buchimport über ihre API bereit.";
            return;
          }
          const book = sources.find(source => Number(source.id) === bookId);
          if (!window.confirm(`„${book.description}“ direkt aus D&D Beyond importieren? Vorhandene Inhalte können vom DDB Importer aktualisiert werden.`)) return;
          run.disabled = true;
          status.textContent = `Import läuft: ${book.description}. Bitte Foundry geöffnet lassen.`;
          try {
            await importBook(bookId);
            status.textContent = `DDB Importer hat den Importvorgang für „${book.description}“ abgeschlossen. Prüfe die Foundry-Abenteuer und Kompendien.`;
            ui.notifications.info("DDB-Buchimport abgeschlossen.");
          } catch (error) {
            console.error("DDB Bridge: book import failed", error?.name ?? "Error");
            status.textContent = "Buchimport fehlgeschlagen. Prüfe deine DDB-Importer-Einstellungen und die Foundry-Konsole.";
            ui.notifications.error("DDB-Buchimport fehlgeschlagen.");
          } finally { run.disabled = false; }
        });
        direct.append(selector, run, status);
        if (!sources.length) direct.append(element("p", "DDB Importer hat noch keinen Quellenkatalog geladen. Öffne zunächst seine Einstellungen."));
      }
      root.append(direct);

      const maps = element("button", "Map Library öffnen");
      maps.type = "button";
      maps.addEventListener("click", () => openMaps().catch(error => ui.notifications.error(error.message)));
      root.append(maps);
      return root;
    }
    _replaceHTML(result, content) { content.replaceChildren(result); }
  }
  const open = () => { requireGM(); return new BookLibraryApp().render({ force: true }); };
  game.settings.registerMenu(ID, "bookLibrary", {
    name: "DDB Bridge – Buchbibliothek",
    label: "Buchbibliothek öffnen",
    icon: "fa-solid fa-book-open",
    hint: "D&D-Beyond-Bücher über DDB Importer direkt importieren (Alpha).",
    type: BookLibraryApp,
    restricted: true
  });
  return { BookLibraryApp, open };
}
