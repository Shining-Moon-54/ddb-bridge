import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { zipSync } from "fflate";

const args = process.argv.slice(2), option = key => { const index = args.indexOf(key); return index < 0 ? null : args[index + 1]; };
const repository = option("--repository"), tag = option("--tag");
const manifest = JSON.parse(await readFile("module.json", "utf8"));
if (repository || tag) {
  assert(repository && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository), "Valid --repository required.");
  assert.equal(tag, `v${manifest.version}`, "Tag and manifest version differ.");
  assert.equal(process.env.DDB_BRIDGE_RELEASE_PREPARED, tag, "Create the actual draft release first, then set DDB_BRIDGE_RELEASE_PREPARED.");
  manifest.url = `https://github.com/${repository}`;
  manifest.manifest = `https://raw.githubusercontent.com/${repository}/main/module.json`;
  manifest.download = `https://github.com/${repository}/releases/download/${tag}/ddb-bridge-${tag}.zip`;
  manifest.changelog = `https://github.com/${repository}/blob/main/CHANGELOG.md`;
}
const input = Object.create(null);
const mtime = new Date("2026-10-24T00:00:00Z");
async function include(name) {
  const entries = await readdir(name, { withFileTypes: true });
  for (const item of entries) {
    const path = `${name}/${item.name}`;
    if (item.isDirectory()) await include(path);
    else input[`ddb-bridge/${path}`] = [new Uint8Array(await readFile(path)), { mtime }];
  }
}
for (const directory of ["scripts", "styles", "vendor", "docs"]) await include(directory);
for (const path of ["README.md", "LICENSE", "CHANGELOG.md", "SECURITY.md"]) input[`ddb-bridge/${path}`] = [new Uint8Array(await readFile(path)), { mtime }];
const manifestBytes = new TextEncoder().encode(JSON.stringify(manifest, null, 2) + "\n");
input["ddb-bridge/module.json"] = [manifestBytes, { mtime }];
const zip = zipSync(input, { level: 6 });
await mkdir("dist", { recursive: true });
const filename = `ddb-bridge-v${manifest.version}.zip`;
await writeFile(`dist/${filename}`, zip);
await writeFile("dist/module.json", manifestBytes);
const sums = `${createHash("sha256").update(zip).digest("hex")}  ${filename}\n${createHash("sha256").update(manifestBytes).digest("hex")}  module.json\n`;
await writeFile("dist/SHA256SUMS", sums);
console.log(`Built dist/${filename} (${zip.length} bytes; ${Object.keys(input).length} files).`);
console.log(sums.trim());
