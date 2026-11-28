// Regenerates the calibration tables in research/scoring-model.md from the
// shipped engine and data:
//
//   node scripts/run-ts.mjs scripts/calibration.ts
//
// Every number goes through `scorePosture`, the same pipeline the app runs.
import fs from "fs";
import path from "path";
import { scorePosture, type PostureScore } from "../src/engine/posture";
import { baselineStates } from "../src/engine/baseline";
import { SCRIPTS } from "../src/timelapse/scripts";
import { computeScriptBlockStates } from "../src/timelapse/compute-script-state";
import type { Block, BlockState, Sliders, ThreatModel } from "../src/engine/types";

const DATA = path.join(import.meta.dirname, "../public/data");
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf-8"));
const blocks: Block[] = fs
  .readdirSync(DATA)
  .filter((f) => f.startsWith("blocks-") && f.endsWith(".json"))
  .sort()
  .flatMap((f) => read(f));
const model: ThreatModel = {
  vectors: read("vectors.json"),
  approaches: read("approaches.json"),
  scenarios: read("scenarios.json"),
};

/** The app's opening sliders (store/simulation.ts). */
const APP: Sliders = {
  ai_timeline: 0.5,
  gov_cooperation: 0.2,
  vendor_cooperation: 0.3,
  budget_millions: 200,
  org_transformation: 0.3,
  risk_tolerance: 0.5,
  sl_bar: 0.2,
  ai_propensity: 0.5,
};
/** The story tests' base: neutral cooperation, then each story's overrides. */
const NEUTRAL: Sliders = { ...APP, gov_cooperation: 0.5, vendor_cooperation: 0.5, org_transformation: 0.5, budget_millions: 2000 };
const FAVOURABLE: Sliders = { ...APP, gov_cooperation: 1, vendor_cooperation: 1, org_transformation: 1, budget_millions: 1e6 };

const all = (state: BlockState, future = false): Record<string, BlockState> =>
  Object.fromEntries(blocks.filter((b) => future || !b.future).map((b) => [b.id, state]));

interface Row {
  label: string;
  run: (year: number, served: boolean, world: "app" | "favourable") => PostureScore;
}

const STORIES = ["do-nothing", "budget-constrained", "reactive-ciso", "proactive-program"];

const rows: Row[] = [
  {
    label: "Undefended lab",
    run: (year, served, world) =>
      scorePosture({
        blocks,
        model,
        blockStates: all("not_started"),
        year,
        sliders: world === "app" ? APP : FAVOURABLE,
        adversaryOc: 4,
        modelServedExternally: served,
      }),
  },
  {
    label: "2026 baseline",
    run: (year, served, world) =>
      scorePosture({
        blocks,
        model,
        blockStates: baselineStates(blocks),
        year,
        sliders: world === "app" ? APP : FAVOURABLE,
        adversaryOc: 4,
        modelServedExternally: served,
      }),
  },
  ...STORIES.map(
    (id): Row => ({
      label: SCRIPTS.find((s) => s.id === id)!.name,
      run: (year, served, world) => {
        const script = SCRIPTS.find((s) => s.id === id)!;
        const base = world === "app" ? NEUTRAL : { ...FAVOURABLE, budget_millions: NEUTRAL.budget_millions };
        return scorePosture({
          blocks,
          model,
          blockStates: computeScriptBlockStates(script, year, blocks),
          advanceOrder: (script.deployments ?? []).map((d) => d.blockId),
          year,
          sliders: { ...base, ...(script.sliderOverrides ?? {}) } as Sliders,
          adversaryOc: 4,
          modelServedExternally: served,
        });
      },
    })
  ),
  {
    label: "Full catalogue (future off)",
    run: (year, served, world) =>
      scorePosture({
        blocks,
        model,
        blockStates: all("mature"),
        year,
        sliders: world === "app" ? { ...APP, budget_millions: 1e6 } : FAVOURABLE,
        adversaryOc: 4,
        modelServedExternally: served,
      }),
  },
  {
    label: "Full catalogue + future",
    run: (year, served, world) =>
      scorePosture({
        blocks,
        model,
        blockStates: all("mature", true),
        year,
        sliders: world === "app" ? { ...APP, budget_millions: 1e6 } : FAVOURABLE,
        adversaryOc: 4,
        modelServedExternally: served,
        futureCapabilities: true,
      }),
  },
];

const f2 = (p: number) => p.toFixed(2);
/** Progress truncated, not rounded: 0.998 of the way is not "1.00". */
const prog = (p: number) => (Math.floor(p * 100) / 100).toFixed(2);

function table(world: "app" | "favourable", served: boolean): string {
  const out: string[] = [];
  out.push("| Posture | Year | OC1 | OC2 | OC3 | OC4 | OC5 | Own model | SL | Limited by |");
  out.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const row of rows) {
    for (const year of [2026, 2028, 2030]) {
      const s = row.run(year, served, world);
      const held = (p: number) => (p < s.sl.bar ? `**${f2(p)}**` : f2(p));
      const lim = s.sl.limitedBy ? `OC${s.sl.limitedBy.tier} ${s.sl.limitedBy.approach ?? ""}` : "—";
      out.push(
        `| ${year === 2026 ? row.label : ""} | ${year} | ${s.tiers.map((t) => held(t.p)).join(" | ")} | ${held(
          s.aiInsider.p
        )} (AC${s.aiInsider.acBand.toFixed(1)}) | ${s.sl.level} + ${prog(s.sl.progress)}${s.sl.marginal ? " (marginal)" : ""} | ${lim} |`
      );
    }
  }
  return out.join("\n");
}

export function main() {
  console.log("### A. The app's default world (model served; app sliders; stories at neutral sliders + their own overrides)\n");
  console.log(table("app", true));
  console.log("\n### B. The app's default world, model not served\n");
  console.log(table("app", false));
  console.log(
    "\n### C. Favourable world (model not served; full government, vendor and organisational cooperation; stories keep their own overrides)\n"
  );
  console.log(table("favourable", false));
  const at2030 = STORIES.map((id) => {
    const r = rows.find((x) => x.label === SCRIPTS.find((s) => s.id === id)!.name)!.run(2030, true, "app");
    return `${SCRIPTS.find((s) => s.id === id)!.name} ${r.sl.value.toFixed(2)}`;
  });
  console.log(`\nStories at 2030 (SL value, served): ${at2030.join(" < ")}`);
}
