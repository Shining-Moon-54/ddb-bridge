import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cloudProfile, checkCloudLimit, cloudExportName, dropboxContentHash } from "../scripts/core/cloud.js";
import { CloudService } from "../scripts/foundry/cloud.js";
import { CloudHTTP, GoogleDriveAdapter, DropboxAdapter } from "../scripts/cloud/providers.js";
import { googleAuthorization, dropboxAuthorization, exchangeDropboxCode } from "../scripts/cloud/auth.js";
import { sha256 } from "../scripts/core/util.js";
import { LibraryService } from "../scripts/foundry/service.js";
import { inspectPackage } from "../scripts/core/package.js";
import { MemoryStorage, runtime, png } from "./helpers.mjs";

const profile = (id = "profile1", provider = "google") => ({ id, provider, name: `Cloud ${id}`, clientId: provider === "google" ? "test-client.apps.googleusercontent.com" : "test-app-key", limitGB: 0 });
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });
function setup() {
  runtime(); const data = new Map(); const store = { getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
  let account = { id: "account1", label: "synthetic@example.invalid" }; const uploads = [];
  const adapter = { account: async () => account, scan: async () => ({ used: 10, count: 1 }),
    upload: async (p, token, bytes, name) => { uploads.push({ p, bytes: bytes.slice(), name }); return { name, bytes: bytes.length, sha256: await sha256(bytes) }; } };
  const auth = { loadGoogleIdentity: async () => {}, googleAuthorization: () => async () => ({ access_token: "SYNTHETIC_SECRET", expires_in: 3600 }) };
  const cloud = new CloudService({ store: () => store, adapters: { google: adapter, dropbox: adapter }, auth });
  return { cloud, store, data, adapter, auth, uploads, setAccount: value => { account = value; } };
}
async function connect(cloud, id = "profile1") { return (await cloud.prepareConnection(id)).finish(); }

test("cloud profiles allow multiple same-provider accounts and never persist credentials", async () => {
  const { cloud, data, store, auth, adapter } = setup(); cloud.save(profile()); cloud.save(profile("profile2"));
  await connect(cloud); assert(cloud.connected("profile1")); assert(!cloud.connected("profile2"));
  assert.equal(cloud.profiles().length, 2);
  assert(!JSON.stringify([...data]).includes("SYNTHETIC_SECRET"));
  const reloaded = new CloudService({ store: () => store, adapters: { google: adapter }, auth });
  assert.equal(reloaded.profiles().length, 2); assert(!reloaded.connected("profile1"));
  for (const key of ["access_token", "clientSecret", "refresh_token", "password"]) assert.throws(() => cloud.save({ ...profile(), [key]: "SECRET" }), /Zugangsdaten/);
});

test("cloud profiles validate provider fields, numeric limits and immutable identity", async () => {
  for (const value of [{ ...profile(), provider: "__proto__" }, { ...profile(), id: "bad/path" }, { ...profile(), limitGB: -1 },
    { ...profile(), limitGB: "NaN" }, { ...profile(), clientId: "secret" }]) assert.throws(() => cloudProfile(value));
  const { cloud } = setup(); cloud.save(profile()); await connect(cloud);
  assert.throws(() => cloud.save({ ...cloud.profile("profile1"), accountId: "account2" }), /bleiben fest/);
  cloud.save({ ...cloud.profile("profile1"), limitGB: 2 }); assert.equal(cloud.profile("profile1").limitGB, 2);
});

test("bound cloud profiles reject another account; separate profiles can bind it", async () => {
  const { cloud, setAccount } = setup(); cloud.save(profile()); await connect(cloud); cloud.disconnect("profile1");
  setAccount({ id: "account2", label: "other@example.invalid" });
  await assert.rejects(() => connect(cloud), /Anderes Cloudkonto/); assert(!cloud.connected("profile1"));
  cloud.save(profile("profile2")); await connect(cloud, "profile2"); assert(cloud.connected("profile2"));
  assert.equal(cloud.profile("profile2").accountId, "account2");
});

test("cloud limit is checked against fresh usage before a remote upload", async () => {
  const { cloud, uploads, adapter } = setup(); cloud.save({ ...profile(), limitGB: 0.0000001 }); await connect(cloud);
  adapter.scan = async () => ({ used: 98, count: 1 });
  await assert.rejects(() => cloud.export("profile1", async () => new Uint8Array(3)), /Cloudlimit/); assert.equal(uploads.length, 0);
  const stored = cloud.profile("profile1"); cloud.save({ ...stored, limitGB: 0 });
  const result = await cloud.export("profile1", async () => new Uint8Array(3)); assert.equal(result.bytes, 3); assert.equal(uploads.length, 1);
  assert.doesNotThrow(() => checkCloudLimit({ ...stored, limitGB: 1 }, 999999999, 1));
  assert.throws(() => checkCloudLimit(stored, NaN, 1), /Speichergrößen/);
});

test("cloud read errors, aborts and changed profiles never report success or upload", async () => {
  const { cloud, adapter, uploads } = setup(); cloud.save(profile()); await connect(cloud);
  const original = adapter.scan; adapter.scan = async () => { throw new Error("Synthetic scan failure"); };
  await assert.rejects(() => cloud.export("profile1", async () => png), /scan failure/);
  adapter.scan = original;
  await assert.rejects(() => cloud.export("profile1", async () => png, { signal: AbortSignal.abort() }), /abort/i);
  adapter.scan = async () => { cloud.save({ ...cloud.profile("profile1"), limitGB: 2 }); return { used: 0 }; };
  await assert.rejects(() => cloud.export("profile1", async () => png), /Speicherprüfung verändert/);
  assert.equal(uploads.length, 0);
});

test("cloud exports serialize a profile, block disconnection and retain unique filenames", async () => {
  const { cloud, uploads } = setup(); cloud.save(profile()); await connect(cloud);
  let finish; const pending = cloud.export("profile1", () => new Promise(resolve => { finish = resolve; }));
  while (!finish) await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(() => cloud.export("profile1", async () => png), /bereits/);
  assert.throws(() => cloud.remove("profile1"), /läuft/); assert.throws(() => cloud.disconnect("profile1"), /läuft/);
  finish(png); await pending; await cloud.export("profile1", async () => png);
  assert.notEqual(uploads[0].name, uploads[1].name); assert(!/\s/.test(uploads[0].name));
  assert.match(cloudExportName(new Date("2026-10-24T22:00:00Z"), "abc"), /^Map_Library_20261024T220000Z_abc.zip$/);
});

test("cloud operations recheck GM rights and account identity", async () => {
  const { cloud, uploads, setAccount } = setup(); cloud.save(profile()); await connect(cloud);
  game.user.isGM = false;
  assert.throws(() => cloud.profiles(), /Spielleitungen/); await assert.rejects(() => cloud.export("profile1", async () => png), /Spielleitungen/);
  game.user.isGM = true; setAccount({ id: "unexpected", label: "other" });
  await assert.rejects(() => cloud.export("profile1", async () => png), /stimmt nicht/); assert.equal(uploads.length, 0);
});

test("Dropbox PKCE binds a single-use code without a client secret or refresh token", async () => {
  const { url, verifier } = await dropboxAuthorization("public-key"); const authURL = new URL(url);
  assert.equal(authURL.origin, "https://www.dropbox.com"); assert.equal(authURL.searchParams.get("code_challenge_method"), "S256");
  assert.equal(authURL.searchParams.get("token_access_type"), "online"); assert(!authURL.searchParams.has("redirect_uri"));
  assert.match(verifier, /^[A-Za-z0-9_-]{43,128}$/);
  assert.equal(authURL.searchParams.get("code_challenge"), createHash("sha256").update(verifier).digest("base64url"));
  let captured;
  const result = await exchangeDropboxCode("public-key", verifier, "SINGLE_USE_CODE", { fetcher: async (target, options) => {
    captured = { target, options }; return json({ access_token: "SYNTHETIC_TOKEN", token_type: "bearer", expires_in: 14400 });
  } });
  assert.equal(result.expires_in, 14400); assert.equal(captured.options.credentials, "omit"); assert.equal(captured.options.redirect, "error");
  assert.equal(captured.options.body.get("code_verifier"), verifier); assert(!captured.options.body.has("client_secret"));
});

test("Google token request preserves user gesture, limited scope and account selection", async () => {
  let config, requested;
  globalThis.google = { accounts: { oauth2: { initTokenClient(value) { config = value; return { requestAccessToken(options) { requested = options; config.callback({ access_token: "TOKEN", expires_in: 3600 }); } }; }, hasGrantedAllScopes: () => true } } };
  const promise = googleAuthorization("public-client.apps.googleusercontent.com")();
  assert.equal(requested.prompt, "select_account"); assert.equal(config.scope, "https://www.googleapis.com/auth/drive.file");
  assert.equal(config.include_granted_scopes, false); assert.equal((await promise).access_token, "TOKEN");
  const controller = new AbortController();
  google.accounts.oauth2.initTokenClient = () => ({ requestAccessToken() {} });
  const cancelled = googleAuthorization("client")({ signal: controller.signal }); controller.abort(); await assert.rejects(() => cancelled, /abort/i);
  delete globalThis.google;
});

test("cloud transport omits Foundry cookies, refuses foreign hosts and redacts provider errors", async () => {
  let options; const http = new CloudHTTP(async (url, value) => { options = value; return json({ access_token: "DO_NOT_LOG" }, 401); });
  await assert.rejects(() => http.json("https://api.dropboxapi.com/2/files/list_folder", "SECRET"), error => /abgelaufen/.test(error.message) && !/DO_NOT_LOG|SECRET/.test(error.message));
  assert.equal(options.credentials, "omit"); assert.equal(options.redirect, "error"); assert.equal(options.headers.Authorization, "Bearer SECRET");
  await assert.rejects(() => http.request("https://attacker.invalid/upload", "SECRET"), /unbekannte Adresse/);
});

test("Dropbox content hash independently matches empty, single and multiple block data", async () => {
  for (const bytes of [new Uint8Array(), png, new Uint8Array(4 * 1024 * 1024 + 10).fill(7)]) {
    const chunks = [];
    for (let at = 0; at < bytes.length; at += 4 * 1024 * 1024) chunks.push(createHash("sha256").update(bytes.subarray(at, at + 4 * 1024 * 1024)).digest());
    assert.equal(await dropboxContentHash(bytes), createHash("sha256").update(Buffer.concat(chunks)).digest("hex"));
  }
});

test("Dropbox scans all pages, creates a new destination and uploads without overwrite", async () => {
  const calls = []; let failHash = false;
  const adapter = new DropboxAdapter(new CloudHTTP(async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("list_folder")) return json({ entries: [{ ".tag": "file", size: 4 }], has_more: true, cursor: "next" });
    if (url.endsWith("list_folder/continue")) return json({ entries: [{ ".tag": "file", size: 6 }], has_more: false });
    if (url.endsWith("create_folder_v2")) return json({ metadata: { id: "folder1" } });
    if (url.endsWith("/upload")) {
      const args = JSON.parse(options.headers["Dropbox-API-Arg"]);
      assert.equal(args.mode, "add"); assert.equal(args.autorename, false); assert.equal(args.strict_conflict, true);
      return json({ name: "archive.zip", size: png.length, content_hash: failHash ? "bad" : await dropboxContentHash(options.body), id: "file1" });
    }
    throw new Error("Unexpected endpoint");
  }));
  const p = profile("db", "dropbox"); const scan = await adapter.scan(p, "TOKEN"); assert.equal(scan.used, 10); assert.equal(scan.count, 2);
  const result = await adapter.upload(p, "TOKEN", png, "archive.zip", { folder: scan.folder, exists: false }); assert.equal(result.bytes, png.length);
  assert(calls.some(call => call.url.endsWith("create_folder_v2"))); assert(!calls.some(call => /delete|overwrite/.test(call.url)));
  failHash = true; await assert.rejects(() => adapter.upload(p, "TOKEN", png, "archive.zip", scan), /Prüfsummen/);
});

test("Dropbox missing folder is distinguishable from a permission failure", async () => {
  let status = 409, error_summary = "path/not_found/";
  const adapter = new DropboxAdapter(new CloudHTTP(async () => json({ error_summary }, status)));
  assert.equal((await adapter.scan(profile("db", "dropbox"), "TOKEN")).exists, false);
  error_summary = "path/not_folder/"; await assert.rejects(() => adapter.scan(profile("db", "dropbox"), "TOKEN"), /HTTP 409/);
  status = 403; await assert.rejects(() => adapter.scan(profile("db", "dropbox"), "TOKEN"), /verweigert/);
});

test("Google exports use resumable chunks and verify final length and SHA-256", async () => {
  const bytes = new Uint8Array(4 * 1024 * 1024 + 3).fill(3), calls = []; let badHost = false;
  const adapter = new GoogleDriveAdapter(new CloudHTTP(async (url, options) => {
    calls.push({ url, options });
    if (url.includes("uploadType=resumable")) return new Response(null, { headers: { location: badHost ? "https://attacker.invalid/steal" : "https://www.googleapis.com/upload/drive/v3/files?upload_id=SESSION" } });
    if (options.method === "PUT") {
      const range = options.headers["Content-Range"];
      if (range.startsWith("bytes 0-")) return new Response(null, { status: 308, headers: { range: "bytes=0-4194303" } });
      return json({ id: "file1", name: "archive.zip", size: String(bytes.length), sha256Checksum: await sha256(bytes) });
    }
    if (options.method === "POST") return json({ id: "folder1" });
    throw new Error("Unexpected endpoint");
  }));
  const result = await adapter.upload(profile(), "TOKEN", bytes, "archive.zip", { folder: null });
  assert.equal(result.sha256, await sha256(bytes)); assert.equal(calls.filter(call => call.options.method === "PUT").length, 2);
  assert.equal(JSON.parse(calls[0].options.body).mimeType, "application/vnd.google-apps.folder");
  badHost = true; await assert.rejects(() => adapter.upload(profile(), "TOKEN", bytes, "archive.zip", { folder: "folder1" }), /Herkunft/);
  assert(!calls.some(call => call.url.startsWith("https://attacker.invalid")));
});

test("Google scan includes every metadata page and rejects folder conflicts and missing sizes", async () => {
  let conflict = false, missing = false;
  const adapter = new GoogleDriveAdapter(new CloudHTTP(async url => {
    const query = new URL(url).searchParams;
    assert(query.get("q").includes("mapLibraryProfile"));
    return query.has("pageToken") ? json({ files: [{ id: "file1", size: missing ? undefined : "15", appProperties: { mapLibraryKind: "export" } }] }) :
      json({ files: [{ id: "folder1", mimeType: "application/vnd.google-apps.folder" }, ...(conflict ? [{ id: "folder2", mimeType: "application/vnd.google-apps.folder" }] : [])], nextPageToken: "next" });
  }));
  assert.equal((await adapter.scan(profile(), "TOKEN")).used, 15);
  conflict = true; await assert.rejects(() => adapter.scan(profile(), "TOKEN"), /Mehrere Google/);
  conflict = false; missing = true; await assert.rejects(() => adapter.scan(profile(), "TOKEN"), /Dateigröße/);
});

test("cloud backup bytes roundtrip into an independent library without cloud credentials", async () => {
  const { cloud, uploads } = setup(); cloud.save(profile()); await connect(cloud);
  const storage = new MemoryStorage(), library = new LibraryService(storage, { imageInspector: async () => null });
  const scene = { name: "Portable test", width: 1, levels: [{ background: { src: "maps/a.png" } }] };
  const record = await library.archive(await library.plan({ scene, mappings: new Map([["maps/a.png", { name: "a.png", bytes: png }]]) }), { category: "uncategorized" });
  await cloud.export("profile1", signal => library.export(storage.catalog, [record], { signal }));
  const pkg = await inspectPackage(uploads[0].bytes);
  const fresh = new MemoryStorage(), importer = new LibraryService(fresh, { imageInspector: async () => null });
  const copied = await importer.archive(await importer.plan(pkg.candidates[0]), { category: "uncategorized" });
  assert.deepEqual((await importer.preflight(copied)).scene, scene);
  for (const bytes of pkg.files.values()) assert(!new TextDecoder().decode(bytes).includes("SYNTHETIC_SECRET"));
});

for (const provider of ["google", "dropbox"]) test(`${provider} HTTP adapter + session + package export + independent restore roundtrip`, async () => {
  runtime(); const values = new Map(), remote = new Map(); let folder = false, sessionMetadata;
  const fetcher = async (url, options) => {
    assert.equal(options.credentials, "omit"); assert.equal(options.redirect, "error");
    assert.equal(options.headers.Authorization, "Bearer SYNTHETIC_SESSION");
    if (url.includes("/about?")) return json({ user: { permissionId: "google-account", emailAddress: "google@example.invalid" } });
    if (url.endsWith("get_current_account")) return json({ account_id: "dropbox-account", email: "dropbox@example.invalid" });
    if (url.includes("/drive/v3/files?") && options.method !== "POST" && options.method !== "PUT") {
      return json({ files: [...(folder ? [{ id: "folder1", mimeType: "application/vnd.google-apps.folder" }] : []),
        ...[...remote.values()].map(file => ({ ...file.metadata, id: "remote1", size: String(file.bytes.length) }))] });
    }
    if (url.includes("uploadType=resumable")) {
      sessionMetadata = JSON.parse(options.body);
      return new Response(null, { headers: { location: "https://www.googleapis.com/upload/drive/v3/files?upload_id=SYNTHETIC_SESSION" } });
    }
    if (url.includes("/drive/v3/files?fields=id") && options.method === "POST") { folder = true; return json({ id: "folder1" }); }
    if (options.method === "PUT") {
      remote.set(sessionMetadata.name, { metadata: sessionMetadata, bytes: options.body.slice() });
      return json({ id: "remote1", name: sessionMetadata.name, size: String(options.body.length), sha256Checksum: await sha256(options.body) });
    }
    if (url.endsWith("list_folder")) {
      if (!folder) return json({ error_summary: "path/not_found/" }, 409);
      return json({ has_more: false, entries: [...remote.entries()].map(([name, file]) => ({ ".tag": "file", name, size: file.bytes.length })) });
    }
    if (url.endsWith("create_folder_v2")) { folder = true; return json({ metadata: { id: "folder1" } }); }
    if (url.endsWith("/upload")) {
      const args = JSON.parse(options.headers["Dropbox-API-Arg"]), name = args.path.split("/").pop();
      assert(!remote.has(name)); remote.set(name, { bytes: options.body.slice() });
      return json({ id: "remote1", name, size: options.body.length, content_hash: await dropboxContentHash(options.body) });
    }
    throw new Error(`Unexpected synthetic request: ${new URL(url).pathname}`);
  };
  const token = { access_token: "SYNTHETIC_SESSION", expires_in: 3600 };
  const cloud = new CloudService({ store: () => ({ getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }), fetcher,
    auth: { loadGoogleIdentity: async () => {}, googleAuthorization: () => async () => token,
      dropboxAuthorization: async () => ({ url: "https://www.dropbox.com/oauth2/authorize", verifier: "SYNTHETIC_VERIFIER" }),
      exchangeDropboxCode: async () => token } });
  cloud.save(profile("roundtrip", provider)); const connection = await cloud.prepareConnection("roundtrip"); await connection.finish("SYNTHETIC_CODE");
  const storage = new MemoryStorage(), service = new LibraryService(storage, { imageInspector: async () => null });
  const scene = { name: "Cloud transfer test", width: 1, levels: [{ background: { src: "maps/synthetic.png" } }] };
  const record = await service.archive(await service.plan({ scene, mappings: new Map([["maps/synthetic.png", { name: "synthetic.png", bytes: png }]]) }), { category: "uncategorized" });
  const result = await cloud.export("roundtrip", signal => service.export(storage.catalog, [record], { signal }));
  assert.equal(remote.size, 1); const saved = remote.get(result.name).bytes;
  assert.equal(result.sha256, await sha256(saved));
  const scan = await cloud.scan("roundtrip"); assert.equal(scan.used, saved.length); assert.equal(scan.count, 1);
  const packageData = await inspectPackage(saved), fresh = new MemoryStorage(), importer = new LibraryService(fresh, { imageInspector: async () => null });
  const copied = await importer.archive(await importer.plan(packageData.candidates[0]), { category: "uncategorized" });
  assert.deepEqual((await importer.preflight(copied)).scene, scene);
  assert(!JSON.stringify([...values]).includes("SYNTHETIC_SESSION"));
});

test("Google does not accept incomplete chunks or missing and mismatching checksums", async () => {
  let checksum = "bad", bytes = png;
  const adapter = new GoogleDriveAdapter(new CloudHTTP(async (url, options) => {
    if (url.includes("uploadType=resumable")) return new Response(null, { headers: { location: "https://www.googleapis.com/upload/drive/v3/files?upload_id=session" } });
    if (options.method === "PUT") {
      if (bytes.length > 4 * 1024 * 1024) return new Response(null, { status: 308, headers: { range: "bytes=0-9" } });
      return json({ id: "file1", name: "archive.zip", size: bytes.length, sha256Checksum: checksum });
    }
    return json({ sha256Checksum: checksum });
  }));
  await assert.rejects(() => adapter.upload(profile(), "TOKEN", bytes, "archive.zip", { folder: "folder1" }), /Prüfsumme/);
  checksum = undefined; await assert.rejects(() => adapter.upload(profile(), "TOKEN", bytes, "archive.zip", { folder: "folder1" }), /Prüfsumme/);
  bytes = new Uint8Array(4 * 1024 * 1024 + 1);
  await assert.rejects(() => adapter.upload(profile(), "TOKEN", bytes, "archive.zip", { folder: "folder1" }), /Datenblock/);
});
