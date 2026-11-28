// @vitest-environment jsdom
//
// A share link or save made before blocks were added to the catalogue doesn't
// name them. They must open at their real-world baseline, as on a fresh start:
// read as not_started, a v1 link made on the default posture would lose the
// identity, patching and detection every lab already runs, and land a level
// below the posture it was made on.
//
// `fixtures/v1-default-link.json` is exactly what v1 (commit ec5d9bd) shared
// from its opening posture: its 47 blocks at their baselines, its order, and
// its sliders (no sl_bar or ai_propensity yet).
import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "fs";
import path from "path";
import { baselineStates } from "../../src/engine/baseline";
import { scorePosture } from "../../src/engine/posture";
import type { PersistedState } from "../../src/store/persistence";
import { loadBlocks, loadModel } from "../load-data";

const blocks = loadBlocks();
const model = loadModel();
const V1_LINK: PersistedState = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/v1-default-link.json"), "utf-8"));
const BASELINE = baselineStates(blocks);

/** Blocks v2 opens partly in place that v1's link never mentions. */
const added = Object.keys(BASELINE).filter((id) => BASELINE[id] !== "not_started" && !(id in V1_LINK.blockStates));

/** What a fresh start scores: the baseline at the app's opening world. */
async function freshScore() {
  const { DEFAULT_SLIDERS, deriveOrder } = await import("../../src/store/simulation");
  return scorePosture({
    blocks,
    model,
    blockStates: BASELINE,
    advanceOrder: deriveOrder(BASELINE),
    year: 2026,
    sliders: DEFAULT_SLIDERS,
    adversaryOc: 4,
    modelServedExternally: true,
  });
}

/** A fresh copy of the app's modules, so persistence re-reads the URL hash. */
async function freshApp() {
  vi.resetModules();
  const simulation = await import("../../src/store/simulation");
  const derived = await import("../../src/store/derived");
  const persistence = await import("../../src/store/persistence");
  return { ...simulation, ...derived, ...persistence };
}

async function expectBaselineLoad(app: Awaited<ReturnType<typeof freshApp>>) {
  const s = app.useSimulationStore.getState();
  for (const id of added) expect(s.blockStates[id], id).toBe(BASELINE[id]);
  expect(s.blockStates).toEqual(BASELINE);
  const score = app.deriveScore(s);
  const fresh = await freshScore();
  expect(score.sl.level).toBe(fresh.sl.level);
  expect(score.sl.value).toBeCloseTo(fresh.sl.value, 12);
  expect(score.tiers.map((t) => t.band)).toEqual(fresh.tiers.map((t) => t.band));
}

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/sl5/");
});

describe("an old link or save opens new blocks at their baseline", () => {
  it("the v1 default link leaves out the blocks v2 added at a baseline", () => {
    // The reviewed list at the time of writing; more may join it.
    expect(added).toEqual(expect.arrayContaining(["AI-09", "CFG-01", "DET-01", "END-01", "IAM-01", "KEY-01", "SW-01"]));
  });

  it("opened as a share link, it scores as a fresh start does", async () => {
    let app = await freshApp();
    const url = app.stateToShareUrl(V1_LINK);
    history.replaceState(null, "", url.slice(url.indexOf("/sl5/")));
    app = await freshApp(); // the hash is captured when persistence loads
    app.useSimulationStore.getState().loadData(blocks, model, []);
    expect(app.useSimulationStore.getState().viewingShared).toBe(true);
    await expectBaselineLoad(app);
  });

  it("pasted into an open tab, it scores as a fresh start does", async () => {
    const app = await freshApp();
    app.useSimulationStore.getState().loadData(blocks, model, []);
    app.useSimulationStore.getState().setBlockState("NET-01", "deployed");
    app.useSimulationStore.getState().openShared(app.migratePersistedState(V1_LINK));
    await expectBaselineLoad(app);
  });

  it("saved before the blocks existed, it restores as a fresh start does", async () => {
    localStorage.setItem("sl5v2-state", JSON.stringify(V1_LINK));
    const app = await freshApp();
    app.useSimulationStore.getState().loadData(blocks, model, []);
    expect(app.useSimulationStore.getState().viewingShared).toBe(false);
    await expectBaselineLoad(app);
  });

  it("as a saved named posture, it loads as a fresh start does", async () => {
    localStorage.setItem("sl5v2-scenarios", JSON.stringify([{ name: "Old", savedAt: 0, state: V1_LINK }]));
    const app = await freshApp();
    app.useSimulationStore.getState().loadData(blocks, model, []);
    app.useSimulationStore.getState().setBlockState("NET-01", "deployed");
    app.useSimulationStore.getState().loadScenario(0);
    await expectBaselineLoad(app);
  });

  it("keeps a state the link does set, even below the baseline", async () => {
    localStorage.setItem("sl5v2-state", JSON.stringify({ ...V1_LINK, blockStates: { ...V1_LINK.blockStates, "DET-01": "not_started" } }));
    const app = await freshApp();
    app.useSimulationStore.getState().loadData(blocks, model, []);
    expect(app.useSimulationStore.getState().blockStates["DET-01"]).toBe("not_started");
    expect(app.useSimulationStore.getState().blockStates["IAM-01"]).toBe(BASELINE["IAM-01"]);
  });
});
