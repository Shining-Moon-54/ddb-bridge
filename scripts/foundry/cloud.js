import { assert, abort, uid } from "../core/util.js";
import { cloudProfile, checkCloudLimit, cloudExportName } from "../core/cloud.js";
import { requireGM } from "./storage.js";
import { CloudHTTP, GoogleDriveAdapter, DropboxAdapter } from "../cloud/providers.js";
import { loadGoogleIdentity, googleAuthorization, dropboxAuthorization, exchangeDropboxCode } from "../cloud/auth.js";

const KEY = "ddb-bridge.cloud.profiles.v1";

export class CloudService {
  #tokens = new Map();
  #busy = new Set();
  constructor({ store = () => localStorage, permission = requireGM, fetcher = (...args) => fetch(...args), adapters, auth = {} } = {}) {
    this.store = store; this.permission = permission; this.fetcher = fetcher;
    const http = new CloudHTTP(fetcher);
    this.adapters = adapters ?? { google: new GoogleDriveAdapter(http), dropbox: new DropboxAdapter(http) };
    this.auth = { loadGoogleIdentity, googleAuthorization, dropboxAuthorization, exchangeDropboxCode, ...auth };
  }
  profiles() {
    this.permission();
    const data = JSON.parse(this.store().getItem(KEY) || "[]");
    assert(Array.isArray(data) && data.length <= 50, "Cloudprofilliste ist ungültig.");
    const profiles = data.map(cloudProfile);
    assert(new Set(profiles.map(p => p.id)).size === profiles.length, "Cloudprofile haben doppelte Kennungen.");
    return profiles;
  }
  profile(id) { const profile = this.profiles().find(p => p.id === id); assert(profile, "Cloudprofil wurde entfernt. Auswahl neu öffnen."); return profile; }
  save(value) {
    this.permission();
    const profile = cloudProfile(value), profiles = this.profiles(), index = profiles.findIndex(p => p.id === profile.id);
    const old = profiles[index];
    assert(!old || old.provider === profile.provider && old.clientId === profile.clientId && old.accountId === profile.accountId,
      "Anbieter, Appkennung und verbundenes Konto eines Profils bleiben fest. Dafür ein neues Profil anlegen.");
    if (index >= 0) profiles[index] = profile; else { assert(profiles.length < 50, "Maximal 50 Cloudprofile."); profiles.push(profile); }
    this.store().setItem(KEY, JSON.stringify(profiles));
    return profile;
  }
  remove(id) {
    this.permission(); assert(!this.#busy.has(id), "Für dieses Profil läuft ein Export.");
    const profiles = this.profiles().filter(p => p.id !== id);
    this.store().setItem(KEY, JSON.stringify(profiles)); this.#tokens.delete(id);
  }
  disconnect(id) { this.permission(); assert(!this.#busy.has(id), "Für dieses Profil läuft ein Export."); this.#tokens.delete(id); }
  connected(id) { this.permission(); return (this.#tokens.get(id)?.expires ?? 0) > Date.now() + 30000; }
  async prepareConnection(id, { signal } = {}) {
    this.permission(); abort(signal);
    assert(globalThis.isSecureContext !== false, "Cloud-Anmeldung über die HTTPS-Adresse deines Foundry-Servers öffnen (oder localhost).");
    const profile = this.profile(id);
    if (profile.provider === "google") {
      await this.auth.loadGoogleIdentity(); abort(signal);
      const authorize = this.auth.googleAuthorization(profile.clientId);
      return { provider: "google", finish: async () => this.#accept(id, await authorize({ signal }), signal) };
    }
    const { url, verifier } = await this.auth.dropboxAuthorization(profile.clientId);
    abort(signal);
    return { provider: "dropbox", url, finish: async code => {
      const token = await this.auth.exchangeDropboxCode(profile.clientId, verifier, code, { fetcher: this.fetcher, signal });
      return this.#accept(id, token, signal);
    } };
  }
  async #accept(id, response, signal) {
    this.permission(); abort(signal);
    assert(!this.#busy.has(id), "Für dieses Profil läuft ein Export.");
    const profile = this.profile(id), expires = Number(response.expires_in);
    assert(typeof response.access_token === "string" && response.access_token && Number.isFinite(expires) && expires > 0 && expires <= 86400,
      "Cloudanbieter hat keine gültige zeitlich begrenzte Freigabe geliefert.");
    const account = await this.adapters[profile.provider].account(response.access_token, signal);
    abort(signal); this.permission();
    assert(!profile.accountId || profile.accountId === account.id,
      "Anderes Cloudkonto gewählt. Für dieses Konto ein zusätzliches Profil anlegen.");
    const profiles = this.profiles(), index = profiles.findIndex(p => p.id === id);
    assert(index >= 0 && JSON.stringify(profiles[index]) === JSON.stringify(profile), "Cloudprofil wurde während der Anmeldung verändert.");
    profiles[index] = cloudProfile({ ...profile, accountId: account.id, accountLabel: account.label });
    this.store().setItem(KEY, JSON.stringify(profiles));
    this.#tokens.set(id, { value: response.access_token, expires: Date.now() + expires * 1000, accountId: account.id });
    return profiles[index];
  }
  #token(profile) {
    assert(this.connected(profile.id), "Cloudprofil zuerst verbinden; nach dem Neuladen ist eine erneute Anmeldung erforderlich.");
    const token = this.#tokens.get(profile.id);
    assert(token.accountId === profile.accountId, "Cloudkontozuordnung verändert. Erneut verbinden.");
    return token.value;
  }
  async scan(id, { signal } = {}) {
    this.permission(); abort(signal);
    const profile = this.profile(id), token = this.#token(profile), adapter = this.adapters[profile.provider];
    await this.#account(profile, adapter, token, signal);
    return adapter.scan(profile, token, signal);
  }
  async #account(profile, adapter, token, signal) {
    const account = await adapter.account(token, signal);
    assert(account.id === profile.accountId, "Cloudkonto stimmt nicht mit diesem Profil überein. Erneut verbinden.");
  }
  async export(id, buildPackage, { signal, progress = () => {} } = {}) {
    this.permission(); abort(signal);
    assert(!this.#busy.has(id), "Für dieses Profil läuft bereits ein Cloudexport."); this.#busy.add(id);
    const run = async () => {
      const profile = this.profile(id), token = this.#token(profile), adapter = this.adapters[profile.provider];
      await this.#account(profile, adapter, token, signal);
      const bytes = await buildPackage(signal); abort(signal); this.permission();
      assert(bytes instanceof Uint8Array, "Kein gültiges Exportpaket.");
      const current = this.profile(id);
      assert(current.provider === profile.provider && current.clientId === profile.clientId && current.accountId === profile.accountId,
        "Cloudprofil wurde verändert. Export gestoppt.");
      const scan = await adapter.scan(current, token, signal);
      assert(JSON.stringify(this.profile(id)) === JSON.stringify(current), "Cloudprofil wurde während der Speicherprüfung verändert. Export erneut prüfen.");
      checkCloudLimit(current, scan.used, bytes.length);
      abort(signal); this.permission(); this.#token(current);
      const result = await adapter.upload(current, token, bytes, cloudExportName(), scan, { signal, progress });
      abort(signal);
      return { ...result, provider: current.provider, profileName: current.name, accountLabel: current.accountLabel };
    };
    try {
      // Serializes export/quota checks across tabs on this origin. It is not a
      // provider-side reservation and cannot lock another computer.
      return await (globalThis.navigator?.locks ? navigator.locks.request(`ddb-bridge-cloud-${id}`, { signal }, run) : run());
    } finally { this.#busy.delete(id); }
  }
  newId() { this.permission(); return uid(); }
}
