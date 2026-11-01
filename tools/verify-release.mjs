import assert from "node:assert/strict";
import { unzipSync } from "fflate";
const [repository, tag] = process.argv.slice(2);
assert(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository), "Repository required.");
assert(/^v[0-9A-Za-z.+-]+$/.test(tag), "Tag required.");
async function get(url) {
  // Intentionally anonymous: no GitHub token or cookies.
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  assert.equal(response.status, 200, `Anonymous request failed: ${url}`);
  return response;
}
const base = `https://github.com/${repository}/releases/download/${tag}`;
const manifest = await (await get(`${base}/module.json`)).json();
const bytes = new Uint8Array(await (await get(manifest.download)).arrayBuffer());
assert.equal(manifest.version, tag.slice(1)); assert.equal(manifest.id, "ddb-bridge");
const files = unzipSync(bytes);
assert(files["ddb-bridge/module.json"] && files["ddb-bridge/scripts/main.js"] && files["ddb-bridge/vendor/fflate.js"], "Installer incomplete.");
assert.deepEqual(JSON.parse(new TextDecoder().decode(files["ddb-bridge/module.json"])), manifest);
console.log(`Anonymous release manifest and complete installer verified: ${tag}.`);
