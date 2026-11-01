import { ID, VERSION, LIMITS, MEDIA } from "../core/constants.js";
import { assert, uid, extension, jsonParse, jsonBytes, sha256 } from "../core/util.js";
import { categoryPath, queryCatalog, setCategory } from "../core/catalog.js";
import { assetsOf, validateScene } from "../core/scene.js";
import { inspectPackage, imageCandidate } from "../core/package.js";
import { CLOUD_PROVIDERS, GB } from "../core/cloud.js";
import { requireGM, localURL } from "./storage.js";

export function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined && text !== null) element.textContent = String(text);
  if (className) element.className = className;
  return element;
}
function button(text, action, className = "") {
  const result = node("button", text, className); result.type = "button";
  result.addEventListener("click", async () => {
    result.disabled = true;
    try { await action(); }
    catch (error) { ui.notifications.error(error.message || "Vorgang fehlgeschlagen."); }
    finally { result.disabled = false; }
  });
  return result;
}
function field(form, label, name, value = "", { type = "text", options = null } = {}) {
  const wrapper = node("label", null, "ml-field"); wrapper.append(node("span", label));
  let input;
  if (options) {
    input = node("select");
    for (const [key, title] of options) { const option = node("option", title); option.value = key; input.append(option); }
  } else input = node(type === "textarea" ? "textarea" : "input");
  if (input.tagName === "INPUT") input.type = type;
  input.name = name;
  if (type === "checkbox") input.checked = Boolean(value);
  else if (options) {
    for (const option of input.children) if (option.value === String(value ?? "")) option.setAttribute("selected", "");
  } else input.value = value ?? "";
  wrapper.append(input); form.append(wrapper); return input;
}
const categories = catalog => catalog.categories.map(c => [c.id, categoryPath(catalog, c.id)]).sort((a, b) => a[1].localeCompare(b[1], "de"));
const values = form => Object.fromEntries(new FormData(form));
const warningList = warnings => {
  const list = node("ul", null, "ml-warnings");
  for (const warning of warnings) list.append(node("li", warning.message));
  if (!warnings.length) list.append(node("li", "Keine Warnung durch die vorhandenen Prüfungen. Die Sichtprüfung in Foundry bleibt erforderlich."));
  return list;
};
export function download(bytes, name, mime = "application/zip") {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const link = node("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function makeApplications(storage, service, cloud = null) {
  const ApplicationV2 = foundry.applications.api.ApplicationV2;
  class DOMWindow extends ApplicationV2 {
    static DEFAULT_OPTIONS = { classes: ["ddb-bridge"], position: { width: 760, height: 720 }, window: { resizable: true } };
    constructor(title, build, options = {}) {
      super({ ...options, window: { title, resizable: true, ...(options.window ?? {}) } });
      this.build = build; this.controller = new AbortController();
    }
    async _renderHTML() { requireGM(); return this.build(this); }
    _replaceHTML(result, content) { content.replaceChildren(result); }
    async _onClose(options) { this.controller.abort(); await super._onClose(options); }
  }
  const modal = async (title, build, options) => { const app = new DOMWindow(title, build, options); await app.render({ force: true }); return app; };

  const helpLink = () => {
    const link = node("a", "Einrichtung für Google Drive und Dropbox");
    link.href = "https://github.com/Shining-Moon-54/ddb-bridge/blob/main/docs/CLOUD.md";
    link.target = "_blank"; link.rel = "noopener noreferrer"; return link;
  };
  async function editCloudProfile(profile = null, onSaved = () => {}) {
    assert(cloud, "Cloudfunktionen nicht verfügbar.");
    return modal(profile ? "Cloudprofil bearbeiten" : "Cloud hinzufügen", app => {
      const form = node("form"); form.addEventListener("submit", e => e.preventDefault());
      const provider = field(form, "Anbieter", "provider", profile?.provider || "google", { options: Object.entries(CLOUD_PROVIDERS) });
      provider.disabled = Boolean(profile);
      const name = field(form, "Profilname", "name", profile?.name || "");
      const settings = node("div"); form.append(settings); let clientId;
      const showSettings = () => {
        settings.replaceChildren();
        clientId = field(settings, provider.value === "google" ? "Google-OAuth-Client-ID (Webanwendung)" : "Dropbox-App-Key (App folder)", "clientId", profile?.clientId || "");
        clientId.readOnly = Boolean(profile);
        settings.append(node("p", provider.value === "google" ?
          `Einmalig eine Google-Web-App mit aktivierter Drive API registrieren. Erlaubte JavaScript-Herkunft: ${new URL(document.baseURI).origin}. Danach wird nur Zugriff auf mit dieser App angelegte Dateien angefragt.` :
          "Einmalig eine Dropbox-App mit Zugriffstyp „App folder“ registrieren. Benötigte Berechtigungen: account_info.read, files.metadata.read und files.content.write. Anmeldung erfolgt per einmaligem Code.", "ml-note"));
      };
      showSettings(); provider.addEventListener("change", showSettings);
      const limit = field(form, "Speicherlimit für Exporte dieses Profils in GB (0 = kein Modullimit)", "limitGB", profile?.limitGB ?? 0, { type: "number" });
      limit.min = "0"; limit.step = "any";
      form.append(helpLink(), node("p", "App-ID bzw. App-Key sind öffentliche Kennungen. Kein Client-Secret, Passwort oder Zugangstoken eintragen. Profile bleiben in diesem Browser; Anmeldungen gelten bis zum Neuladen oder Ablauf.", "ml-note"));
      form.append(button("Profil speichern", async () => {
        cloud.save({ id: profile?.id ?? cloud.newId(), provider: provider.value, name: name.value, clientId: clientId.value,
          limitGB: limit.value, accountId: profile?.accountId || "", accountLabel: profile?.accountLabel || "" });
        await onSaved(); await app.close();
      }, "ml-primary"), button("Abbrechen", () => app.close())); return form;
    });
  }
  async function connectCloud(id, onConnected = () => {}) {
    const profile = cloud.profile(id);
    return modal(`${CLOUD_PROVIDERS[profile.provider]} verbinden`, async app => {
      const root = node("section");
      const flow = await cloud.prepareConnection(id, { signal: app.controller.signal });
      root.append(node("p", `Profil: ${profile.name}${profile.accountLabel ? ` · bisheriges Konto: ${profile.accountLabel}` : ""}`));
      if (flow.provider === "google") {
        root.append(node("p", "Wähle dein Google-Konto und erlaube den Dateizugriff. Die Zugangsdaten gibst du ausschließlich bei Google ein."),
          button("Google-Anmeldung starten", async () => {
            await flow.finish(); await onConnected(); ui.notifications.info("Google Drive ist für diese Sitzung verbunden."); await app.close();
          }, "ml-primary"));
      } else {
        root.append(node("p", "Öffne Dropbox, melde dich dort an und erlaube den Zugriff. Kopiere den anschließend angezeigten einmaligen Autorisierungscode hierher."));
        const link = node("a", "Dropbox-Anmeldung öffnen", "ml-connect-link"); link.href = flow.url; link.target = "_blank"; link.rel = "noopener noreferrer"; root.append(link);
        const code = field(root, "Einmaliger Dropbox-Autorisierungscode", "code", "", { type: "password" }); code.autocomplete = "off";
        root.append(button("Dropbox-Verbindung abschließen", async () => {
          const value = code.value; code.value = ""; await flow.finish(value); await onConnected();
          ui.notifications.info("Dropbox ist für diese Sitzung verbunden."); await app.close();
        }, "ml-primary"));
      }
      root.append(node("p", "Die Freigabe wird nur im Arbeitsspeicher dieser Sitzung gehalten. Für ein weiteres Konto lege ein eigenes Profil an.", "ml-note"), button("Abbrechen", () => app.close()));
      return root;
    });
  }
  class CloudSettingsApp extends DOMWindow {
    constructor(options = {}) {
      super("Map Library – Cloud-Konten", app => {
        assert(cloud, "Cloudfunktionen nicht verfügbar.");
        const root = node("section", null, "ml-cloud");
        root.append(node("p", "Verbinde Google Drive oder Dropbox für manuelle Kartenexporte. Mehrere Konten sind über getrennte Profile möglich."), helpLink(),
          node("p", "Für diese Alpha brauchst du einmalig eine eigene Anbieter-App-Kennung. Anmeldungen gelten nur für die laufende Browsersitzung. Das Entfernen eines Profils löscht keine Cloud-Dateien.", "ml-note"));
        root.append(button("Cloud hinzufügen", () => editCloudProfile(null, () => app.render({ force: true }))));
        for (const profile of cloud.profiles()) {
          const row = node("article", null, "ml-cloud-profile");
          row.append(node("h3", `${profile.name} · ${CLOUD_PROVIDERS[profile.provider]}`),
            node("p", `${profile.accountLabel || "Noch kein Konto verbunden"} · ${cloud.connected(profile.id) ? "Verbunden" : "Nicht verbunden"} · Limit: ${profile.limitGB ? `${profile.limitGB} GB` : "kein Modullimit"}`));
          const actions = node("div", null, "ml-toolbar");
          actions.append(button("Verbinden", () => connectCloud(profile.id, () => app.render({ force: true }))),
            button("Bearbeiten", () => editCloudProfile(profile, () => app.render({ force: true }))),
            button("Speichernutzung prüfen", async () => {
              const scan = await cloud.scan(profile.id, { signal: app.controller.signal });
              ui.notifications.info(`${profile.name}: ${(scan.used / GB).toFixed(3)} GB in ${scan.count} Dateien dieses Exportprofils.`);
            }), button("Trennen", async () => { cloud.disconnect(profile.id); await app.render({ force: true }); }),
            button("Profil entfernen", () => modal("Cloudprofil entfernen?", confirm => {
              const body = node("section"); body.append(node("p", `„${profile.name}“ aus diesem Browser entfernen? Die Cloud-Dateien bleiben erhalten.`),
                button("Profil entfernen", async () => { cloud.remove(profile.id); await app.render({ force: true }); await confirm.close(); }, "ml-danger"),
                button("Abbrechen", () => confirm.close())); return body;
            })));
          row.append(actions); root.append(row);
        }
        root.append(button("Schließen", () => app.close())); return root;
      }, options);
    }
  }

  async function archiveWorldScene(sceneId, { update = null, onSaved = () => {} } = {}) {
    requireGM();
    const scene = game.scenes.get(sceneId); assert(scene, "Szene existiert nicht mehr in dieser Welt.");
    await storage.init();
    return review({ name: scene.name, scene: scene.toObject(), mappings: new Map() }, new Map(), update, onSaved);
  }

  async function review(candidate, available = new Map(), update = null, onSaved = () => {}) {
    let plan = await service.plan(candidate);
    const { catalog } = await storage.load();
    const app = await modal(update ? "Vorlage aktualisieren – neue Revision" : "Import prüfen und archivieren", async app => {
      const root = node("section", null, "ml-review");
      root.append(node("p", "Gespeichert wird die native Originalszene einschließlich vorhandener Flags und Tokens. Weltkopien entstehen ohne Tokens. Das Original bleibt unverändert; separate FogExploration-Dokumente werden nicht gelesen.", "ml-note"));
      if (update) root.append(node("p", "Eine neue Revision ersetzt die aktuelle Katalogverknüpfung. Die bisherige Revision bleibt für die Wiederherstellung erhalten."));
      const form = node("form"); form.addEventListener("submit", e => e.preventDefault());
      const initial = update ?? candidate.metadata ?? {};
      field(form, "Name", "name", initial.name || candidate.name);
      field(form, "Kategorie", "category", initial.category && catalog.categories.some(c => c.id === initial.category) ? initial.category : "uncategorized", { options: categories(catalog) });
      field(form, "Beschreibung", "description", initial.description, { type: "textarea" });
      field(form, "Tags (mit Komma trennen)", "tags", (initial.tags || []).join(", "));
      field(form, "Autor", "author", initial.author);
      field(form, "Öffentliche Quellenadresse", "source", initial.source);
      field(form, "Lizenz / Nutzungsrechte der Karte", "license", initial.license);
      root.append(form);
      const inspection = node("div"), mapping = node("div", null, "ml-mapping");
      root.append(inspection, mapping);
      const display = () => {
        inspection.replaceChildren(node("p", `${plan.scene.levels?.length ?? 0} native Ebenen · ${plan.assets.length} Assetreferenzen · ${(plan.total / 1048576).toFixed(1)} MiB`), warningList(plan.warnings));
      };
      display();
      mapping.append(node("h3", "Assetzuordnung"));
      mapping.append(node("p", "Dateikopien erhalten Unterstriche statt Leerzeichen. Beim Weltimport werden die Verweise automatisch angepasst.", "ml-note"));
      const selectors = new Map();
      for (const asset of assetsOf(candidate.scene)) {
        const select = field(mapping, asset.source, "asset", candidate.mappings?.get(asset.source)?.name || "", {
          options: [["", "Vorhandene Serverdatei verwenden / nicht zugeordnet"], ...[...available.keys()].filter(n => MEDIA[extension(n)]).map(n => [n, n])]
        });
        selectors.set(asset.source, select);
      }
      mapping.append(button("Zuordnung erneut prüfen", async () => {
        candidate.mappings ??= new Map();
        for (const [source, select] of selectors) {
          if (select.value) candidate.mappings.set(source, { name: select.value, bytes: available.get(select.value) });
          else if (available.size) candidate.mappings.delete(source);
        }
        plan = await service.plan(candidate, { signal: app.controller.signal }); display();
      }));
      const supplement = node("input"); supplement.type = "file"; supplement.multiple = true;
      supplement.accept = ".png,.jpg,.jpeg,.webp,.svg,.webm,.mp4,.ogg,.mp3,.wav,.m4a";
      const extra = node("label", "Fehlende Dateien nachreichen: "); extra.append(supplement); mapping.append(extra);
      supplement.addEventListener("change", async () => {
        try {
          let total = [...available.values()].reduce((sum, b) => sum + b.length, 0);
          for (const file of supplement.files) {
            assert(file.size <= LIMITS.file && total + file.size <= LIMITS.expanded, "Dateiauswahl überschreitet das Größenlimit.");
            assert(!available.has(file.name), "Dateiname bereits vorhanden; eindeutigen Namen wählen.");
            available.set(file.name, new Uint8Array(await file.arrayBuffer())); total += file.size;
            for (const select of selectors.values()) { const option = node("option", file.name); option.value = file.name; select.append(option); }
          }
        } catch (error) { ui.notifications.error(error.message); }
      });
      const missing = field(form, "Trotz fehlender Assets archivieren", "allowMissing", false, { type: "checkbox" });
      const duplicate = field(form, "Identische Szenendaten als weitere Karte zulassen", "allowDuplicate", false, { type: "checkbox" });
      const status = node("p", "Bereit", "ml-status"); status.setAttribute("role", "status"); root.append(status);
      root.append(button(update ? "Neue Vorlagenrevision speichern" : "In Bibliothek archivieren", async () => {
        // All selectors must have been checked, otherwise a stale plan is unsafe.
        for (const [source, select] of selectors) if (available.size) {
          assert((select.value || "") === (candidate.mappings?.get(source)?.name || ""), "Geänderte Assetzuordnung zuerst erneut prüfen.");
        }
        const record = await service.archive(plan, values(form), {
          signal: app.controller.signal, allowMissing: missing.checked, allowDuplicate: duplicate.checked,
          updateId: update?.id ?? null, expectedRevision: update?.revision ?? null,
          progress: (n, total) => { status.textContent = `Speichern: ${n} / ${total} Assets`; }
        });
        ui.notifications.info(`„${record.name}“ wurde archiviert.`); await onSaved(); await app.close();
      }, "ml-primary"), button("Abbrechen", () => app.close()));
      return root;
    });
    return app;
  }

  async function worldImport(record) {
    const { warnings } = await service.preflight(record);
    return modal(`Weltimport: ${record.name}`, app => {
      const root = node("section");
      root.append(node("p", "Foundry erstellt eine neue, zunächst inaktive Szene. Native Ebenen und eingebettete Kennungen bleiben erhalten; Tokens werden aus der Arbeitskopie entfernt."), warningList(warnings));
      const form = node("form"); form.addEventListener("submit", e => e.preventDefault());
      const flags = field(form, "Drittanbieter-Flags mit übernehmen (können Automatisierungen enthalten)", "flags", false, { type: "checkbox" });
      const reviewed = field(form, "Ich habe ausführbare und unbekannte Verhaltensdaten sowie Drittanbieter-Flags geprüft und möchte sie übernehmen", "reviewed", false, { type: "checkbox" });
      const missing = field(form, "Trotz fehlender oder beschädigter Assets importieren", "missing", false, { type: "checkbox" });
      root.append(form, button("Neue Szene erstellen", async () => {
        assert(!flags.checked || reviewed.checked, "Vor Übernahme von Drittanbieter-Daten die Prüfung bestätigen.");
        const created = await service.importToWorld(record, { includeModuleFlags: flags.checked, reviewedAutomation: reviewed.checked, allowMissing: missing.checked, signal: app.controller.signal });
        ui.notifications.info(`Neue Szene erstellt: ${created.name}`); await app.close();
      }, "ml-primary"), button("Abbrechen", () => app.close()));
      return root;
    });
  }

  class MapLibraryApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
      id: "ddb-bridge-browser", classes: ["ddb-bridge"], position: { width: 1100, height: 760 },
      window: { title: "Map Library", resizable: true, icon: "fa-solid fa-map" }
    };
    constructor(...args) {
      super(...args); this.query = {}; this.selection = new Set(); this.controller = null;
    }
    async _renderHTML() {
      requireGM(); await storage.init();
      this.catalog = (await storage.load()).catalog;
      const root = node("section", null, "ml-browser");
      const header = node("header", null, "ml-heading"); header.append(node("h2", "Map Library"), node("span", `v${VERSION} · Experimentelle Alpha`, "ml-badge"));
      root.append(header, node("p", "Szenen archivieren, ordnen und in anderen Welten wiederverwenden.", "ml-subtitle"));
      const toolbar = node("div", null, "ml-toolbar");
      toolbar.append(button("Welt-Szene archivieren", () => this.chooseWorld()), button("Dateien / ZIP importieren", () => filePicker.click()), button("Kategorie anlegen", () => this.editCategory()), button("Kategorie bearbeiten", () => this.chooseCategory()));
      if (cloud) toolbar.append(button("Cloud-Konten", () => new CloudSettingsApp().render({ force: true })));
      toolbar.append(button("Neu laden", () => this.render({ force: true })));
      const filePicker = node("input"); filePicker.type = "file"; filePicker.multiple = true;
      filePicker.accept = ".json,.zip,.png,.jpg,.jpeg,.webp"; filePicker.hidden = true;
      filePicker.addEventListener("change", () => this.run("Import inventarisieren", signal => this.readFiles([...filePicker.files], signal)));
      root.append(toolbar, filePicker);
      const filter = node("div", null, "ml-filters");
      const search = field(filter, "Suchen", "search", this.query.search, { type: "search" }); search.placeholder = "Name, Beschreibung, Tags, Autor …";
      const category = field(filter, "Kategorie (mit Unterkategorien)", "category", this.query.category, { options: [["", "Alle Kategorien"], ...categories(this.catalog)] });
      const favorites = field(filter, "Nur Favoriten", "favorites", this.query.favorites, { type: "checkbox" });
      const sort = field(filter, "Sortierung", "sort", this.query.sort || "name", { options: [["name", "Name A–Z"], ["newest", "Zuletzt geändert"]] });
      const layout = field(filter, "Ansicht", "layout", this.layout || "tiles", { options: [["tiles", "Kacheln"], ["list", "Liste"]] });
      const state = field(filter, "Bereich", "state", this.query.archived ? "trash" : "library", { options: [["library", "Bibliothek"], ["trash", "Papierkorb"]] });
      root.append(filter);
      const bulk = node("div", null, "ml-toolbar");
      this.selectedLabel = node("span", "0 ausgewählt");
      bulk.append(this.selectedLabel, button("Sichtbare auswählen", () => { for (const e of this.page.entries) this.selection.add(e.id); this.paint(); }), button("Alle Treffer auswählen", () => {
        const first = queryCatalog(this.catalog, { ...this.query, page: 0, pageSize: 100 });
        for (let page = 0; page < first.pages; page++) for (const e of queryCatalog(this.catalog, { ...this.query, page, pageSize: 100 }).entries) this.selection.add(e.id);
        this.paint();
      }), button("Auswahl aufheben", () => { this.selection.clear(); this.paint(); }),
        button("Auswahl exportieren", () => this.run("ZIP exportieren", async signal => {
          const records = this.catalog.entries.filter(e => this.selection.has(e.id));
          const bytes = await service.export(this.catalog, records, { signal, progress: (n, total) => this.status.textContent = `Export: ${n} / ${total} Karten` });
          download(bytes, `Map-Library-${new Date().toISOString().slice(0, 10)}.zip`);
        })), button("Auswahl verschieben", () => this.moveSelected()));
      if (cloud && !this.query.archived) bulk.append(button("Auswahl in Cloud exportieren", () => this.cloudExport(this.selectedRecords())));
      bulk.append(this.query.archived ? button("Auswahl wiederherstellen", () => this.restoreRecords(this.selectedRecords())) :
        button("Auswahl löschen", () => this.deleteRecords(this.selectedRecords()), "ml-danger"));
      root.append(bulk);
      this.gallery = node("div", null, "ml-gallery"); root.append(this.gallery);
      const footer = node("footer", null, "ml-footer"); this.count = node("span");
      footer.append(button("← Zurück", () => { this.query.page = (this.page.page || 0) - 1; this.paint(); }), this.count, button("Weiter →", () => { this.query.page = this.page.page + 1; this.paint(); }));
      this.status = node("p", "Bereit", "ml-status"); this.status.setAttribute("role", "status");
      this.cancelButton = button("Vorgang abbrechen", () => this.controller?.abort()); this.cancelButton.hidden = true;
      root.append(footer, this.status, this.cancelButton, node("p", this.query.archived ?
        "Gelöschte Karten können wiederhergestellt werden. Mediendateien bleiben erhalten und belegen weiterhin Speicher, damit vorhandene Welt-Szenen ihre Bilder behalten." :
        "Cloudexporte starten nur per Klick. Noch offen: Detect Grid, UVTT/DD2VTT, direkter URL-Import und Cloud-Synchronisierung/Cache. Vollständiger Umfang: README.", "ml-note"));
      let timer;
      search.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => { this.query.search = search.value; this.query.page = 0; this.paint(); }, 180); });
      for (const control of [category, favorites, sort, layout]) control.addEventListener("change", () => {
        this.query.category = category.value; this.query.favorites = favorites.checked; this.query.sort = sort.value; this.layout = layout.value; this.query.page = 0; this.paint();
      });
      state.addEventListener("change", () => { this.query.archived = state.value === "trash"; this.query.page = 0; this.selection.clear(); this.render({ force: true }).catch(error => ui.notifications.error(error.message)); });
      this.paint(); return root;
    }
    _replaceHTML(result, content) { content.replaceChildren(result); }
    async _onClose(options) { this.controller?.abort(); await super._onClose(options); }
    paint() {
      const eligible = new Set(this.catalog.entries.filter(e => Boolean(e.archived) === Boolean(this.query.archived)).map(e => e.id));
      for (const id of this.selection) if (!eligible.has(id)) this.selection.delete(id);
      this.page = queryCatalog(this.catalog, { ...this.query, pageSize: 48 });
      this.gallery.classList.toggle("ml-list", this.layout === "list"); this.gallery.replaceChildren();
      for (const entry of this.page.entries) {
        const card = node("article", null, "ml-card");
        const choice = node("input"); choice.type = "checkbox"; choice.checked = this.selection.has(entry.id);
        choice.setAttribute("aria-label", `${entry.name} auswählen`);
        choice.addEventListener("change", () => { if (choice.checked) this.selection.add(entry.id); else this.selection.delete(entry.id); this.selectedLabel.textContent = `${this.selection.size} ausgewählt`; });
        const title = node("div", null, "ml-card-title"); title.append(choice, node("h3", entry.name)); card.append(title);
        if (entry.thumbnail) {
          const image = node("img"); image.src = localURL(entry.thumbnail); image.loading = "lazy"; image.alt = entry.name;
          image.addEventListener("error", () => { image.replaceWith(node("p", "Vorschau fehlt", "ml-placeholder")); }, { once: true }); card.append(image);
        } else card.append(node("p", "Keine Vorschau", "ml-placeholder"));
        card.append(node("p", categoryPath(this.catalog, entry.category), "ml-category"), node("p", `${entry.levels} Ebenen · ${entry.width || "?"} × ${entry.height || "?"} px · ${(entry.bytes / 1048576).toFixed(1)} MiB`), node("p", (entry.tags || []).join(" · "), "ml-tags"));
        if (entry.warnings?.some(w => w.code === "asset")) card.append(node("p", "⚠ Fehlende Assetdateien", "ml-warning"));
        const actions = node("div", null, "ml-card-actions");
        if (entry.archived) actions.append(button("Wiederherstellen", () => this.restoreRecords([entry]), "ml-primary"));
        else actions.append(button("In Welt importieren", () => this.run("Weltimport prüfen", () => worldImport(entry)), "ml-primary"),
          button(entry.favorite ? "★ Favorit" : "☆ Favorit", async () => { await service.updateMetadata([entry.id], { favorite: !entry.favorite }); await this.render({ force: true }); }),
          button("Aus Welt aktualisieren", () => this.chooseWorld(entry)));
        actions.append(button("Details / bearbeiten", () => this.entryDetails(entry)));
        if (!entry.archived) {
          if (cloud) actions.append(button("In Cloud exportieren", () => this.cloudExport([entry])));
          actions.append(button("Löschen", () => this.deleteRecords([entry]), "ml-danger"));
        }
        card.append(actions); this.gallery.append(card);
      }
      if (!this.page.entries.length) this.gallery.append(node("p", this.query.archived ? "Der Papierkorb enthält keine passenden Karten." :
        this.catalog.entries.some(e => !e.archived) ? "Keine passenden Karten." : "Die Bibliothek ist leer. Archiviere eine Welt-Szene oder importiere Dateien.", "ml-empty"));
      this.count.textContent = `${this.page.total} Karten · Seite ${this.page.page + 1} / ${this.page.pages}`;
      this.selectedLabel.textContent = `${this.selection.size} ausgewählt`;
    }
    selectedRecords() {
      const records = this.catalog.entries.filter(e => this.selection.has(e.id) && Boolean(e.archived) === Boolean(this.query.archived));
      assert(records.length, "Zuerst Karten auswählen."); return records;
    }
    deleteRecords(records) {
      assert(records.length, "Zuerst Karten auswählen.");
      const expected = structuredClone(records);
      return modal("Karten löschen?", app => {
        const root = node("section");
        root.append(node("p", `${records.length} Karte(n) in den Papierkorb verschieben?`));
        const list = node("ul"); for (const entry of records.slice(0, 20)) list.append(node("li", entry.name));
        if (records.length > 20) list.append(node("li", `… und ${records.length - 20} weitere`));
        root.append(list, node("p", "Du kannst sie im Bereich „Papierkorb“ wiederherstellen. Welt-Szenen und Cloud-Dateien bleiben erhalten. Mediendateien werden weiter benötigt und belegen weiterhin Speicher.", "ml-note"),
          button("In Papierkorb verschieben", async () => {
            await service.setDeleted(expected, true, { signal: app.controller.signal });
            this.selection.clear(); await this.render({ force: true }); await app.close(); ui.notifications.info("Karten in den Papierkorb verschoben.");
          }, "ml-danger"), button("Abbrechen", () => app.close())); return root;
      });
    }
    async restoreRecords(records) {
      await service.setDeleted(records, false); this.selection.clear(); await this.render({ force: true }); ui.notifications.info("Karten wiederhergestellt.");
    }
    cloudExport(records) {
      assert(cloud, "Cloudfunktionen nicht verfügbar."); assert(records.length, "Zuerst Karten auswählen.");
      return modal("Karten in Cloud exportieren", app => {
        const root = node("section"); const profiles = cloud.profiles();
        root.append(node("p", `${records.length} Karte(n) mit Szenendaten, Medien und Prüfsummen als neues Paket hochladen.`));
        if (!profiles.length) {
          root.append(node("p", "Zuerst ein Google-Drive- oder Dropbox-Profil hinzufügen und verbinden."),
            button("Cloud-Konten einrichten", async () => { await new CloudSettingsApp().render({ force: true }); await app.close(); }));
          return root;
        }
        const profile = field(root, "Zielprofil", "profile", profiles[0].id, { options: profiles.map(p => [p.id,
          `${p.name} · ${CLOUD_PROVIDERS[p.provider]}${p.accountLabel ? ` · ${p.accountLabel}` : ""}`]) });
        const status = node("p", "Bereit", "ml-status"); status.setAttribute("role", "status");
        root.append(button("Zielprofil verbinden", () => connectCloud(profile.value, () => { status.textContent = "Zielprofil verbunden. Export kann gestartet werden."; })),
          node("p", "Das vorhandene Archiv bleibt lokal. Der Upload erstellt eine neue Datei im Exportordner dieses Profils. Es findet keine automatische Synchronisierung oder Löschung statt.", "ml-note"), status,
          button("Jetzt in Cloud exportieren", async () => {
            const target = profile.value; profile.disabled = true;
            try {
              const result = await cloud.export(target, async signal => {
                const current = (await storage.load()).catalog;
                for (const record of records) assert(current.entries.some(e => e.id === record.id && e.revision === record.revision && e.updated === record.updated && !e.archived),
                  "Karte wurde zwischenzeitlich geändert oder gelöscht. Exportauswahl neu öffnen.");
                status.textContent = "Exportpaket erstellen und prüfen …";
                return service.export(current, records, { signal, progress: (n, count) => { status.textContent = `Paket erstellen: ${n} / ${count} Karten`; } });
              }, { signal: app.controller.signal, progress: (n, total) => { status.textContent = `Cloudupload: ${(n / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} MiB`; } });
              status.textContent = `Export bestätigt: ${result.name} · ${(result.bytes / 1048576).toFixed(1)} MiB · SHA-256: ${result.sha256}`;
              ui.notifications.info(`Cloudexport nach ${result.profileName} bestätigt.`);
            } catch (error) {
              status.textContent = app.controller.signal.aborted ? "Export abgebrochen. Cloudziel auf eventuell abgeschlossene Dateien prüfen." : error.message;
              throw error;
            } finally { profile.disabled = false; }
          }, "ml-primary"), button("Schließen / abbrechen", () => app.close()));
        return root;
      });
    }
    async run(label, action) {
      if (this.controller) { ui.notifications.warn("Es läuft bereits ein Vorgang."); return; }
      this.controller = new AbortController(); this.cancelButton.hidden = false;
      this.status.textContent = label;
      try { await action(this.controller.signal); this.status.textContent = "Fertig"; }
      catch (error) { this.status.textContent = this.controller.signal.aborted ? "Abgebrochen" : error.message; if (!this.controller.signal.aborted) ui.notifications.error(error.message); }
      finally { this.controller = null; this.cancelButton.hidden = true; }
    }
    chooseWorld(update = null) {
      const scenes = game.scenes.map(s => [s.id, s.name]);
      assert(scenes.length, "In dieser Welt sind keine Szenen vorhanden.");
      return modal("Welt-Szene wählen", app => {
        const root = node("section"); const select = field(root, "Szene", "scene", scenes[0][0], { options: scenes });
        root.append(button("Importvorschau öffnen", async () => {
          await archiveWorldScene(select.value, { update, onSaved: () => this.render({ force: true }) }); await app.close();
        }), button("Abbrechen", () => app.close())); return root;
      });
    }
    async readFiles(files, signal) {
      let total = 0; const available = new Map(), candidates = [], notes = []; let packageCategories = [];
      for (const file of files) {
        total += file.size; assert(file.size <= LIMITS.archive && total <= LIMITS.archive, "Dateiauswahl überschreitet 128 MiB.");
        signal.throwIfAborted();
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (extension(file.name) === "zip") {
          assert(files.length === 1, "ZIP-Archive bitte einzeln auswählen.");
          const inspected = await inspectPackage(bytes, { signal, progress: (n, count) => this.status.textContent = `ZIP prüfen: ${Math.round(100 * n / count)} %` });
          for (const [name, data] of inspected.files) available.set(name, data);
          candidates.push(...inspected.candidates);
          packageCategories = inspected.categories;
          for (const image of inspected.images || []) candidates.push({ image, name: image, sourceFile: image });
          notes.push(...inspected.ignored.map(n => `Nicht importiert: ${n}`));
        } else {
          assert(file.size <= LIMITS.file, "Einzeldatei überschreitet 64 MiB.");
          assert(!available.has(file.name), "Doppelte Dateinamen in der Auswahl."); available.set(file.name, bytes);
        }
      }
      if (!files.some(f => extension(f.name) === "zip")) {
        const used = new Set();
        for (const [name, bytes] of available) if (extension(name) === "json") {
          const scene = validateScene(jsonParse(bytes)), mappings = new Map();
          for (const asset of assetsOf(scene)) {
            const matches = [...available.keys()].filter(n => n === asset.source || n === asset.source.split("/").pop());
            if (matches.length === 1) { mappings.set(asset.source, { name: matches[0], bytes: available.get(matches[0]) }); used.add(matches[0]); }
          }
          candidates.push({ name: scene.name, scene, mappings, metadata: {}, sourceFile: name });
        }
        for (const name of available.keys()) if (["png", "jpg", "jpeg", "webp"].includes(extension(name)) && !used.has(name)) candidates.push({ image: name, name, sourceFile: name });
      }
      assert(candidates.length, "Keine Szenen oder unterstützten Kartenbilder gefunden.");
      return modal("Importinventar – einzeln prüfen", app => {
        const root = node("section"); root.append(node("p", `${candidates.length} mögliche Karteneinträge. Jede Karte wird vor dem Speichern geprüft. Mehrdeutige Assets lassen sich in der Vorschau manuell zuordnen.`));
        if (packageCategories.length) root.append(button("Paketkategorien übernehmen", async () => {
          await storage.transaction(catalog => {
            for (const incoming of packageCategories) {
              const existing = catalog.categories.find(c => c.id === incoming.id);
              assert(!existing || existing.name === incoming.name && existing.parent === incoming.parent,
                `Kategorie ${incoming.name} kollidiert mit einem vorhandenen Eintrag. Kategorie im Import manuell wählen.`);
              if (!existing) catalog.categories.push({ id: incoming.id, name: incoming.name, parent: incoming.parent || null });
            }
            return catalog;
          });
          await this.render({ force: true }); ui.notifications.info("Paketkategorien wurden übernommen.");
        }));
        for (const candidate of candidates) {
          const row = node("div", null, "ml-inventory-row"); row.append(node("span", candidate.sourceFile), button("Prüfen", async () => {
            const ready = candidate.image ? await imageCandidate(available.get(candidate.image), candidate.image) : candidate;
            await review(ready, available, null, () => this.render({ force: true }));
          })); root.append(row);
        }
        if (notes.length) root.append(node("p", notes.join("\n"), "ml-note"));
        root.append(button("Schließen", () => app.close())); return root;
      });
    }
    editCategory(category = null) {
      return modal(category ? "Kategorie bearbeiten" : "Kategorie anlegen", app => {
        const form = node("form"); form.addEventListener("submit", e => e.preventDefault());
        const name = field(form, "Name", "name", category?.name || "");
        const parent = field(form, "Übergeordnete Kategorie", "parent", category?.parent || "", { options: [["", "Keine (oberste Ebene)"], ...categories(this.catalog).filter(([id]) => id !== category?.id)] });
        form.append(button("Speichern", async () => {
          assert(name.value.trim(), "Kategoriename fehlt.");
          await storage.transaction(c => setCategory(c, { id: category?.id ?? uid(), name: name.value.trim(), parent: parent.value || null }));
          await this.render({ force: true }); await app.close();
        }), button("Abbrechen", () => app.close())); return form;
      });
    }
    chooseCategory() {
      return modal("Kategorie wählen", app => {
        const root = node("section"), choice = field(root, "Kategorie", "category", "uncategorized", { options: categories(this.catalog) });
        root.append(button("Bearbeiten", async () => { await this.editCategory(this.catalog.categories.find(c => c.id === choice.value)); await app.close(); })); return root;
      });
    }
    moveSelected() {
      assert(this.selection.size, "Zuerst Karten auswählen.");
      return modal("Auswahl verschieben", app => {
        const root = node("section"), category = field(root, "Neue Kategorie", "category", "uncategorized", { options: categories(this.catalog) });
        root.append(button("Verschieben", async () => {
          await service.updateMetadata([...this.selection], { category: category.value }); await this.render({ force: true }); await app.close();
        }), button("Abbrechen", () => app.close())); return root;
      });
    }
    entryDetails(entry) {
      return modal(entry.name, app => {
        const form = node("form"); form.addEventListener("submit", e => e.preventDefault());
        for (const [key, label] of [["name", "Name"], ["description", "Beschreibung"], ["author", "Autor"], ["source", "Öffentliche Quellenadresse"], ["license", "Lizenz / Nutzungsrechte"]]) field(form, label, key, entry[key], { type: key === "description" ? "textarea" : "text" });
        field(form, "Tags", "tags", entry.tags.join(", "));
        field(form, "Kategorie", "category", entry.category, { options: categories(this.catalog) });
        form.append(node("p", `Revision: ${entry.revision}\nSHA-256: ${entry.hash}\nImport: ${entry.created}\nFrühere Revisionen: ${entry.history?.length ?? 0}`, "ml-note"), warningList(entry.warnings || []));
        form.append(button("Metadaten speichern", async () => {
          const data = values(form); data.tags = data.tags.split(",").map(s => s.trim()).filter(Boolean);
          assert(data.name.trim(), "Name fehlt."); await service.updateMetadata([entry.id], data); await this.render({ force: true }); await app.close();
        }), button("Integrität prüfen", async () => {
          const result = await service.preflight(entry); ui.notifications.info(result.warnings.some(w => w.code === "asset") ? "Fehlende oder veränderte Assets erkannt." : "Szenendatei und alle archivierten Assets stimmen mit ihren Prüfsummen überein.");
          await modal("Integritätsbericht", () => warningList(result.warnings));
        }), button("Schließen", () => app.close())); return form;
      });
    }
  }
  return { MapLibraryApp, CloudSettingsApp, review, worldImport, archiveWorldScene };
}
