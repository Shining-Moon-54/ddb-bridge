import { copyFile, mkdir } from "node:fs/promises";
await mkdir("vendor", { recursive: true });
await copyFile("node_modules/fflate/esm/browser.js", "vendor/fflate.js");
await copyFile("node_modules/fflate/LICENSE", "vendor/fflate.LICENSE");
console.log("Vendored fflate 0.8.3 with MIT license.");
