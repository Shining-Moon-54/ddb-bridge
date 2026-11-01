import { readFile, readdir, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import path from "node:path";
import { VERSION } from "../scripts/core/constants.js";

async function* files(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (["node_modules", ".git", "dist"].includes(item.name)) continue;
    const target = path.join(directory, item.name);
    if (item.isDirectory()) yield* files(target); else yield target;
  }
}
const manifest = JSON.parse(await readFile("module.json", "utf8"));
const pkg = JSON.parse(await readFile("package.json", "utf8"));
assert.equal(manifest.id, "ddb-bridge"); assert.equal(manifest.version, pkg.version);
assert.equal(manifest.version, VERSION, "Runtime, manifest and package versions must agree.");
assert.equal(manifest.compatibility.minimum, "14"); assert.equal(manifest.compatibility.maximum, "14");
assert(!manifest.compatibility.verified, "Do not claim runtime verification before a real Foundry test.");
for (const asset of [...manifest.esmodules, ...manifest.styles]) assert((await stat(asset)).isFile());
const readme = await readFile("README.md", "utf8");
assert(readme.startsWith("> **Hinweis zur KI-Entwicklung / AI Development Notice**"));
assert(readme.includes("**English:** This project is designed"));
for await (const file of files(".")) {
  assert(!/(?:^|\/)storage\//.test(file), "Never commit a user's archive.");
  assert(!/\.(pem|key|p12|pfx)$/i.test(file) && !path.basename(file).startsWith(".env"), "Secret file in repository.");
  if (/\.(js|mjs)$/.test(file)) {
    const check = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    assert.equal(check.status, 0, `${file}: ${check.stderr}`);
  }
  if (file.endsWith(".json")) JSON.parse(await readFile(file, "utf8"));
}
assert.equal(await readFile("vendor/fflate.js", "utf8"), await readFile("node_modules/fflate/esm/browser.js", "utf8"), "Vendored dependency drift.");
console.log("Manifest, AI notice, syntax, JSON, file hygiene and vendored dependency checks passed.");
