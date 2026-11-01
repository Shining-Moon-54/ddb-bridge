import { assert, abort } from "../core/util.js";
import { DRIVE_SCOPE, DROPBOX_SCOPES } from "../core/cloud.js";

let googleLoading;
export function loadGoogleIdentity() {
  if (globalThis.google?.accounts?.oauth2) return Promise.resolve();
  if (!googleLoading) googleLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client"; script.async = true;
    const timer = setTimeout(() => fail(), 30000);
    const fail = () => { clearTimeout(timer); script.remove(); reject(new Error("Google-Anmeldung konnte nicht geladen werden. Netzwerk-/Browserfreigaben prüfen.")); };
    script.onerror = fail;
    script.onload = () => {
      clearTimeout(timer);
      if (globalThis.google?.accounts?.oauth2) resolve(); else fail();
    };
    document.head.append(script);
  }).catch(error => { googleLoading = null; throw error; });
  return googleLoading;
}

// Returned function must be called directly by the user's click, after the
// library has loaded, so popup blockers do not consume the user gesture.
export function googleAuthorization(clientId) {
  return ({ signal } = {}) => new Promise((resolve, reject) => {
    abort(signal);
    let settled = false;
    const finish = (error, response) => {
      if (settled) return;
      settled = true; clearTimeout(timer); signal?.removeEventListener("abort", onAbort);
      if (error) reject(error); else resolve(response);
    };
    const onAbort = () => finish(signal.reason ?? new Error("Anmeldung abgebrochen."));
    const timer = setTimeout(() => finish(new Error("Google-Anmeldung abgelaufen. Erneut verbinden.")), 300000);
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      const oauth = globalThis.google.accounts.oauth2;
      const client = oauth.initTokenClient({ client_id: clientId, scope: DRIVE_SCOPE, include_granted_scopes: false,
        callback: response => {
          if (response.error || !response.access_token || !oauth.hasGrantedAllScopes(response, DRIVE_SCOPE)) {
            finish(new Error("Google-Drive-Freigabe wurde nicht erteilt."));
          } else finish(null, response);
        },
        error_callback: () => finish(new Error("Google-Anmeldung geschlossen oder blockiert. Popups erlauben und erneut verbinden."))
      });
      client.requestAccessToken({ prompt: "select_account" });
    } catch { finish(new Error("Google-Anmeldung nicht bereit. Verbindung erneut vorbereiten.")); }
  });
}

export async function dropboxAuthorization(clientId) {
  const random = crypto.getRandomValues(new Uint8Array(48));
  const verifier = base64url(random);
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  const url = new URL("https://www.dropbox.com/oauth2/authorize");
  // Dropbox's no-redirect code flow displays a single-use authorization code.
  // PKCE binds that code to this dialog, without a callback server or secret.
  url.search = new URLSearchParams({ client_id: clientId, response_type: "code", token_access_type: "online",
    code_challenge_method: "S256", code_challenge: challenge, scope: DROPBOX_SCOPES, force_reapprove: "true" }).toString();
  return { url: url.href, verifier };
}
function base64url(bytes) { return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, ""); }

export async function exchangeDropboxCode(clientId, verifier, code, { fetcher = fetch, signal } = {}) {
  assert(typeof code === "string" && code.trim() && code.length < 2048, "Dropbox-Autorisierungscode fehlt.");
  abort(signal);
  const response = await fetcher("https://api.dropboxapi.com/oauth2/token", { method: "POST", credentials: "omit", redirect: "error",
    signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(60000)]),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", client_id: clientId, code_verifier: verifier, code: code.trim() }) });
  assert(response.ok, "Dropbox hat den Autorisierungscode abgelehnt. Anmeldung erneut öffnen und neuen Code verwenden.");
  const data = await response.json();
  assert(data.access_token && data.token_type?.toLowerCase() === "bearer", "Dropbox hat keine gültige Sitzungsfreigabe geliefert.");
  return data;
}
