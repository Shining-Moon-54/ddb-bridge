import { requireGM } from "./storage.js";
import { assert, jsonBytes, sha256 } from "../core/util.js";
import { assetsOf } from "../core/scene.js";

// Read-only and opt-in. No source field values are returned in the report.
export async function diagnoseScene(scene = globalThis.canvas?.scene) {
  requireGM(); assert(game.release.generation === 14, "Foundry v14 erforderlich."); assert(scene, "Szene auswählen.");
  const source = scene.toObject(), before = await sha256(jsonBytes(source));
  let exported, exportError = null;
  try { exported = scene.toCompendium(null); } catch (error) { exportError = error.message; }
  const fields = ["levels", "walls", "lights", "tiles", "regions", "drawings", "sounds", "tokens", "notes"];
  const report = { foundryVersion: game.version, generation: game.release.generation,
    rawHash: before, compendiumError: exportError,
    topLevelFieldsRemoved: exported ? Object.keys(source).filter(k => !Object.hasOwn(exported, k)) : [],
    counts: Object.fromEntries(fields.map(k => [k, { source: source[k]?.length ?? 0, compendium: exported?.[k]?.length ?? null }])),
    originalUnchanged: await sha256(jsonBytes(scene.toObject())) === before,
    assetReferences: assetsOf(source).length,
    exportToJSON: "Download-Funktion; nicht automatisch aufgerufen.",
    fogExploration: "Separate Dokumente werden nicht gelesen.",
    validation: "API-Diagnose; kein abgeschlossener Roundtrip-/Canvas-Test."
  };
  return report;
}
