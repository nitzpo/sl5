// Run a TypeScript script against the engine with Vite's own module runner, so
// no extra tooling is needed:   node scripts/run-ts.mjs scripts/calibration.ts
import { runnerImport } from "vite";
import path from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/run-ts.mjs <script.ts> [args]");
  process.exit(2);
}
const { module } = await runnerImport(path.resolve(file), { configFile: false, logLevel: "error" });
if (typeof module.main === "function") await module.main(process.argv.slice(3));
