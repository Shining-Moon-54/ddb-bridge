import { ID } from "../core/constants.js";
import { requireGM } from "../foundry/storage.js";
import { planBookImport } from "./book-plan.js";
import { prepareNativeBook, importPreparedBook } from "./book-native.js";

function element(tag, text, css = "") {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = String(text);
  if (css) e.className = css;
  return e;
}

function safeExport(data, filename) {
  const bytes = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(bytes);
  const link = element("a");
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
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
      root.append(element("p", "Lokales Buchinventar und begrenzter Testimport nativer Zauber/Gegenstände in eigene Welt-Kompendien. Kein D&D-Beyond-Zugang; Monster und Charakteroptionen werden noch nicht importiert.", "ddb-book-notice"));

      const actions = element("div", undefined, "ddb-books-actions");
      const input = element("input");
      input.type = "file"; input.accept = ".json,application/json";
      input.setAttribute("aria-label", "Normierte Buchinventar-JSON laden");
      const maps = element("button", "Map Library öffnen");
      maps.type = "button";
      maps.addEventListener("click", () => openMaps().catch(error => ui.notifications.error(error.message)));
      actions.append(input, maps);
      root.append(actions);
      const result = element("div", undefined, "ddb-book-results");
      result.append(element("p", "Keine Buchdatei geladen. Diese Vorschau verarbeitet nur lokal ausgewählte Test- oder Nutzerdaten und speichert keine Buchtexte."));
      root.append(result);

      input.addEventListener("change", async () => {
        result.replaceChildren();
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 4 * 1024 * 1024) {
          result.append(element("p", "Datei ist größer als das vorläufige 4-MiB-Limit.", "ddb-book-error"));
          return;
        }
        try {
          const obj = JSON.parse(await file.text());
          // The JSON has a self-declared access field. It is NOT proof of a D&D Beyond entitlement.
          const plan = planBookImport(obj);
          result.append(element("h3", plan.title));
          result.append(element("p", `Quelle: ${plan.provider} · Edition: ${plan.edition} · Einträge: ${plan.total} · geplant: ${plan.planned} · ohne Daten: ${plan.unsupported} · übersprungen: ${plan.skipped}`));
          const warning = element("p", "Inventar ist nicht authentifiziert: Zugangsaussagen der Datei wurden nicht unabhängig geprüft. Erst eine ausdrücklich bestätigte lokale Testimport-Aktion schreibt Dokumente.", "ddb-book-notice");
          result.append(warning);
          const tbl = element("table");
          const thead = element("thead");
          const thRow = element("tr");
          for (const label of ["Kategorie", "Einträge"]) thRow.append(element("th", label));
          thead.append(thRow); tbl.append(thead);
          const tbody = element("tbody");
          for (const [category, count] of Object.entries(plan.categories)) {
            const tr = element("tr"); tr.append(element("td", category), element("td", count)); tbody.append(tr);
          }
          tbl.append(tbody); result.append(tbl);
          if (plan.warnings.length) result.append(element("p", `Hinweise: ${plan.warnings.length}. Details im Bericht.`));
          const save = element("button", "Inventarbericht exportieren");
          save.type = "button";
          save.addEventListener("click", () => safeExport(plan, "ddb-bridge-buchinventar.json"));
          result.append(save);

          // Only local/synthetic fixtures with explicitly native dnd5e-v6 payloads
          // can pass this alpha import step. This is not a DDB ownership check.
          if (["fixture", "local"].includes(obj.provider)) {
            try {
              const prepared = prepareNativeBook(obj);
              result.append(element("p",
                "Lokaler Testimport: " + prepared.summary.ready + " native Item-Dokumente bereit; " +
                prepared.summary.omitted + " Einträge noch ohne Konverter. " +
                "Keine Monster-, Klassen- oder Journalkonvertierung.",
                "ddb-book-notice"
              ));
              if (prepared.summary.ready) {
                const importButton = element("button", "Testdaten in eigene Welt-Kompendien importieren");
                importButton.type = "button";
                importButton.addEventListener("click", async () => {
                  requireGM();
                  const confirmed = window.confirm(
                    "Nur vertrauenswürdige lokale Testdaten importieren. " +
                    "DDB Bridge legt eigene Welt-Kompendien an; vorhandene Dokumente werden nicht überschrieben. Fortfahren?"
                  );
                  if (!confirmed) return;
                  importButton.disabled = true;
                  try {
                    const report = await importPreparedBook(prepared, {
                      requireGM,
                      systemId: game.system?.id,
                      generation: Number(game.release?.generation),
                      packs: game.packs,
                      createCompendium: metadata =>
                        foundry.documents.collections.CompendiumCollection.createCompendium(metadata)
                    });
                    result.append(element("p",
                      "Import: " + report.created + " neu, " + report.existing +
                      " bereits vorhanden, " + report.failed + " fehlgeschlagen. " +
                      "Welt-Kompendien: " + report.packs.join(", ")
                    ));
                    if (report.failed) {
                      result.append(element("p",
                        "Fehler beim Foundry-Dokumentaufbau. Keine Rohdaten in Berichten ausgegeben.",
                        "ddb-book-error"
                      ));
                    }
                  } catch (error) {
                    result.append(element("p", "Import abgebrochen: " + error.message, "ddb-book-error"));
                  } finally {
                    importButton.disabled = false;
                  }
                });
                result.append(importButton);
              }
            } catch (error) {
              result.append(element("p", "Testimport nicht bereit: " + error.message, "ddb-book-notice"));
            }
          }
        } catch (error) {
          result.append(element("p", `Buchinventar nicht lesbar: ${error.message}`, "ddb-book-error"));
        }
      });
      return root;
    }
    _replaceHTML(result, content) { content.replaceChildren(result); }
  }
  const open = () => { requireGM(); return new BookLibraryApp().render({ force: true }); };
  game.settings.registerMenu(ID, "bookLibrary", {
    name: "DDB Bridge – Buchbibliothek",
    label: "Buchbibliothek öffnen",
    icon: "fa-solid fa-book-open",
    hint: "Buchinventar planen; D&D-Beyond-Import noch in Entwicklung.",
    type: BookLibraryApp,
    restricted: true
  });
  return { BookLibraryApp, open };
}
