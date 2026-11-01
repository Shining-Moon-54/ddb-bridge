import { assert, safeId, sha256, uid } from "./util.js";

export const CLOUD_PROVIDERS = Object.freeze({ google: "Google Drive", dropbox: "Dropbox" });
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const DROPBOX_SCOPES = "account_info.read files.metadata.read files.content.write";
export const GB = 1_000_000_000;

export function cloudProfile(value) {
  const allowed = ["id", "provider", "name", "clientId", "limitGB", "accountId", "accountLabel"];
  assert(value && Object.keys(value).every(key => allowed.includes(key)), "Cloudprofil enthält unbekannte Felder; Zugangsdaten werden nicht gespeichert.");
  assert(Object.hasOwn(CLOUD_PROVIDERS, value.provider), "Unbekannter Cloudanbieter.");
  const name = String(value.name || "").trim(), clientId = String(value.clientId || "").trim();
  assert(name && name.length <= 100, "Cloudprofil braucht einen Namen (maximal 100 Zeichen).");
  assert(value.provider === "google" ? /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(clientId) : /^[A-Za-z0-9_-]{5,100}$/.test(clientId),
    value.provider === "google" ? "Gültige Google-OAuth-Client-ID eintragen." : "Gültigen Dropbox-App-Key eintragen.");
  const limitGB = Number(value.limitGB ?? 0);
  assert(Number.isFinite(limitGB) && limitGB >= 0 && limitGB <= 1_000_000, "Cloudlimit muss eine Zahl ab 0 GB sein.");
  return { id: safeId(value.id), provider: value.provider, name, clientId, limitGB,
    accountId: String(value.accountId || "").slice(0, 300), accountLabel: String(value.accountLabel || "").slice(0, 300) };
}

export function checkCloudLimit(profile, used, incoming) {
  assert(Number.isSafeInteger(used) && used >= 0 && Number.isSafeInteger(incoming) && incoming > 0, "Ungültige Cloud-Speichergrößen.");
  assert(!profile.limitGB || used + incoming <= Math.floor(profile.limitGB * GB),
    `Cloudlimit für „${profile.name}“ überschritten. Limit erhöhen oder ein anderes Profil wählen.`);
}

export function cloudExportName(now = new Date(), id = uid()) {
  safeId(id);
  return `Map_Library_${now.toISOString().replace(/[-:]/g, "").replace(/\..+$/, "Z")}_${id}.zip`;
}

// Dropbox hashes the concatenated SHA-256 digests of 4 MiB blocks, then hashes
// that concatenation. This differs from an ordinary SHA-256 of the file.
export async function dropboxContentHash(bytes) {
  const chunks = [];
  for (let at = 0; at < bytes.length; at += 4 * 1024 * 1024) {
    const hash = await sha256(bytes.subarray(at, at + 4 * 1024 * 1024));
    chunks.push(Uint8Array.from(hash.match(/../g), pair => parseInt(pair, 16)));
  }
  const all = new Uint8Array(chunks.length * 32);
  chunks.forEach((chunk, i) => all.set(chunk, i * 32));
  return sha256(all);
}
