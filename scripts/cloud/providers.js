import { assert, abort, sha256 } from "../core/util.js";
import { dropboxContentHash } from "../core/cloud.js";

const GOOGLE = "https://www.googleapis.com";
const DROPBOX = "https://api.dropboxapi.com";
const CONTENT = "https://content.dropboxapi.com";
const googleId = value => { assert(typeof value === "string" && /^[A-Za-z0-9_-]{1,256}$/.test(value), "Google liefert eine ungültige Dateikennung."); return value; };

export class CloudHTTP {
  constructor(fetcher = (...args) => fetch(...args)) { this.fetcher = fetcher; }
  async request(url, token, { signal, accepted = [], ...options } = {}) {
    const target = new URL(url);
    assert([GOOGLE, DROPBOX, CONTENT].includes(target.origin) && !target.username && !target.password,
      "Cloudanfrage an eine unbekannte Adresse verweigert.");
    abort(signal);
    let response;
    try {
      response = await this.fetcher(target.href, { ...options, credentials: "omit", redirect: "error", cache: "no-store",
        signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(120000)]),
        headers: { ...options.headers, Authorization: `Bearer ${token}` } });
    } catch {
      abort(signal);
      throw new Error("Cloudverbindung unterbrochen oder vom Browser blockiert. Uploadstatus prüfen, bevor du erneut exportierst.");
    }
    if (!response.ok && !accepted.includes(response.status)) {
      // Never put provider response bodies, tokens or upload-session URLs in
      // errors. Only Dropbox's fixed error tag is needed for folder conflicts.
      let tag = "";
      if (target.origin === DROPBOX && response.status === 409) {
        try { tag = String((await response.json()).error_summary || "").split("/").slice(0, 2).join("/"); } catch { /* generic error */ }
      }
      const message = response.status === 401 ? "Cloudanmeldung abgelaufen. Profil erneut verbinden." :
        [403, 507].includes(response.status) ? "Cloudanbieter verweigert Zugriff oder Speicherplatz. Freigabe und Kontingent prüfen." :
        response.status === 429 ? "Cloudanbieter begrenzt Anfragen. Später erneut versuchen." :
        `Cloudanfrage fehlgeschlagen (HTTP ${response.status}). Uploadstatus vor erneutem Export prüfen.`;
      const error = new Error(message); error.status = response.status; error.tag = tag;
      throw error;
    }
    return response;
  }
  async json(url, token, options = {}) {
    const response = await this.request(url, token, options);
    return response.json();
  }
}

export class GoogleDriveAdapter {
  constructor(http = new CloudHTTP()) { this.http = http; }
  async account(token, signal) {
    const { user } = await this.http.json(`${GOOGLE}/drive/v3/about?fields=user(permissionId,emailAddress,displayName)`, token, { signal });
    assert(user?.permissionId, "Google-Konto konnte nicht zugeordnet werden.");
    return { id: user.permissionId, label: user.emailAddress || user.displayName || "Google Drive" };
  }
  async scan(profile, token, signal) {
    const files = []; let pageToken;
    const seen = new Set();
    do {
      const query = new URLSearchParams({ q: `trashed = false and appProperties has { key='mapLibraryProfile' and value='${profile.id}' }`,
        fields: "nextPageToken,files(id,name,mimeType,size,sha256Checksum,appProperties)", pageSize: "1000", spaces: "drive" });
      if (pageToken) query.set("pageToken", pageToken);
      const data = await this.http.json(`${GOOGLE}/drive/v3/files?${query}`, token, { signal });
      assert(Array.isArray(data.files), "Google hat keine vollständige Dateiliste geliefert.");
      files.push(...data.files);
      assert(files.length <= 10000, "Mehr als 10.000 Clouddateien. Export für dieses Profil vorerst gestoppt.");
      pageToken = data.nextPageToken;
      assert(!pageToken || !seen.has(pageToken), "Wiederholte Google-Dateilistenseite erkannt."); seen.add(pageToken);
    } while (pageToken);
    const folders = files.filter(file => file.mimeType === "application/vnd.google-apps.folder");
    assert(folders.length <= 1, "Mehrere Google-Zielordner für dieses Profil. Konflikt vor Export auflösen.");
    const exports = files.filter(file => file.appProperties?.mapLibraryKind === "export");
    const used = exports.reduce((sum, file) => sum + fileSize(file.size), 0);
    return { used, count: exports.length, folder: folders[0] ? googleId(folders[0].id) : null };
  }
  async upload(profile, token, bytes, name, scan, { signal, progress = () => {} } = {}) {
    let folder = scan.folder;
    if (!folder) {
      const created = await this.http.json(`${GOOGLE}/drive/v3/files?fields=id`, token, { method: "POST", signal,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: `Map Library – ${profile.name}`,
          mimeType: "application/vnd.google-apps.folder", appProperties: { mapLibraryProfile: profile.id, mapLibraryKind: "folder" } }) });
      folder = googleId(created.id);
    }
    const hash = await sha256(bytes);
    const start = await this.http.request(`${GOOGLE}/upload/drive/v3/files?uploadType=resumable&fields=id,name,size,sha256Checksum`, token,
      { method: "POST", signal, headers: { "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": "application/zip",
        "X-Upload-Content-Length": String(bytes.length) }, body: JSON.stringify({ name, parents: [folder], mimeType: "application/zip",
        appProperties: { mapLibraryProfile: profile.id, mapLibraryKind: "export", sha256: hash } }) });
    const location = start.headers.get("location");
    assert(location, "Google hat keine Uploadadresse geliefert.");
    const session = new URL(location);
    assert(session.origin === GOOGLE && session.pathname === "/upload/drive/v3/files" && !session.username && !session.password,
      "Google-Uploadadresse hat eine unerwartete Herkunft.");
    let result;
    const chunk = 4 * 1024 * 1024;
    for (let at = 0; at < bytes.length; at += chunk) {
      abort(signal);
      const end = Math.min(at + chunk, bytes.length);
      const response = await this.http.request(session.href, token, { method: "PUT", signal, accepted: [308],
        headers: { "Content-Type": "application/zip", "Content-Range": `bytes ${at}-${end - 1}/${bytes.length}` }, body: bytes.subarray(at, end) });
      if (end < bytes.length) {
        assert(response.status === 308 && response.headers.get("range") === `bytes=0-${end - 1}`,
          "Google hat nicht den gesamten Datenblock bestätigt. Uploadstatus vor erneutem Export prüfen.");
      } else { assert(response.ok, "Google-Upload ist unvollständig."); result = await response.json(); }
      progress(end, bytes.length);
    }
    googleId(result?.id);
    assert(result.name === name && fileSize(result.size) === bytes.length, "Google bestätigt abweichende Exportdaten. Clouddatei prüfen.");
    // SHA-256 is a Drive binary-file field. Do not report a verified backup if
    // the server has not yet supplied its checksum.
    const verified = result.sha256Checksum ? result : await this.http.json(`${GOOGLE}/drive/v3/files/${result.id}?fields=sha256Checksum`, token, { signal });
    assert(verified.sha256Checksum === hash, "Google bestätigt die Export-Prüfsumme nicht. Clouddatei prüfen; nicht ungeprüft erneut exportieren.");
    return { name, bytes: bytes.length, sha256: hash, id: result.id };
  }
}

export class DropboxAdapter {
  constructor(http = new CloudHTTP()) { this.http = http; }
  rpc(route, token, data, signal) {
    return this.http.json(`${DROPBOX}/2/${route}`, token, { method: "POST", signal,
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  }
  async account(token, signal) {
    const result = await this.rpc("users/get_current_account", token, null, signal);
    assert(result.account_id, "Dropbox-Konto konnte nicht zugeordnet werden.");
    return { id: result.account_id, label: result.email || result.name?.display_name || "Dropbox" };
  }
  async scan(profile, token, signal) {
    const folder = `/Map_Library_${profile.id}`;
    const files = []; let page;
    try { page = await this.rpc("files/list_folder", token, { path: folder, recursive: true, include_deleted: false, limit: 2000 }, signal); }
    catch (error) {
      if (error.status === 409 && error.tag === "path/not_found") return { used: 0, count: 0, folder, exists: false };
      throw error;
    }
    const cursors = new Set();
    while (true) {
      assert(Array.isArray(page.entries), "Dropbox hat keine vollständige Dateiliste geliefert.");
      files.push(...page.entries.filter(file => file[".tag"] === "file"));
      assert(files.length <= 10000, "Mehr als 10.000 Clouddateien. Export für dieses Profil vorerst gestoppt.");
      if (!page.has_more) break;
      assert(page.cursor && !cursors.has(page.cursor), "Wiederholte Dropbox-Dateilistenseite erkannt."); cursors.add(page.cursor);
      page = await this.rpc("files/list_folder/continue", token, { cursor: page.cursor }, signal);
    }
    return { used: files.reduce((sum, file) => sum + fileSize(file.size), 0), count: files.length, folder, exists: true };
  }
  async upload(profile, token, bytes, name, scan, { signal, progress = () => {} } = {}) {
    if (!scan.exists) {
      try { await this.rpc("files/create_folder_v2", token, { path: scan.folder, autorename: false }, signal); }
      catch (error) { if (!(error.status === 409 && error.tag === "path/conflict")) throw error; }
    }
    const contentHash = await dropboxContentHash(bytes);
    abort(signal); progress(0, bytes.length);
    const data = await this.http.json(`${CONTENT}/2/files/upload`, token, { method: "POST", signal,
      headers: { "Content-Type": "application/octet-stream", "Dropbox-API-Arg": JSON.stringify({ path: `${scan.folder}/${name}`,
        mode: "add", autorename: false, mute: true, strict_conflict: true, content_hash: contentHash }) }, body: bytes });
    assert(data.name === name && fileSize(data.size) === bytes.length && data.content_hash === contentHash,
      "Dropbox bestätigt abweichende Exportdaten oder Prüfsummen. Clouddatei vor erneutem Export prüfen.");
    progress(bytes.length, bytes.length);
    return { name, bytes: bytes.length, sha256: await sha256(bytes), contentHash, id: data.id };
  }
}

function fileSize(value) {
  const size = Number(value);
  assert(value !== undefined && value !== null && Number.isSafeInteger(size) && size >= 0, "Cloudanbieter liefert keine verlässliche Dateigröße. Export gestoppt.");
  return size;
}
