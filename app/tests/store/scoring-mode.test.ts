// @vitest-environment jsdom
//
// The scoring-mode setting (attack paths vs v1-style control coverage) is the
// reader's: it is saved with their posture, carried by share links, defaults
// to attack paths for anything made before it existed, and a story pins attack
// paths while it plays (its captions state threat-relative outcomes), then
// gives the reader's mode back.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useSimulationStore, DEFAULT_SLIDERS } from "../../src/store/simulation";
import { STORAGE_KEY, migratePersistedState, type PersistedState } from "../../src/store/persistence";
import { usePlaybackStore } from "../../src/timelapse/playback-store";
import { SCRIPTS } from "../../src/timelapse/scripts";
import { loadBlocks, loadModel } from "../load-data";

const blocks = loadBlocks();
const model = loadModel();

const sim = () => useSimulationStore.getState();
const playback = () => usePlaybackStore.getState();
const saved = (): PersistedState => JSON.parse(localStorage.getItem(STORAGE_KEY)!);

/** A fresh copy of the app's modules, so persistence re-reads the URL hash. */
async function freshApp() {
  vi.resetModules();
  const simulation = await import("../../src/store/simulation");
  const persistence = await import("../../src/store/persistence");
  return { ...simulation, ...persistence };
}

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/sl5/");
  playback().stop();
  useSimulationStore.setState({
    dataLoaded: false,
    viewingShared: false,
    scenarioName: null,
    playbackActive: false,
    year: 2026,
    adversaryOc: 4,
    sliders: DEFAULT_SLIDERS,
    modelServedExternally: true,
    futureCapabilities: false,
    scoringMode: "paths",
  });
  sim().loadData(blocks, model, []);
});
afterEach(() => playback().stop());

describe("the scoring mode is saved", () => {
  it("defaults to attack paths", () => {
    expect(sim().scoringMode).toBe("paths");
  });

  it("is written with the posture and restored on the next visit", async () => {
    sim().setScoringMode("coverage");
    expect(saved().scoringMode).toBe("coverage");
    const app = await freshApp();
    app.useSimulationStore.getState().loadData(blocks, model, []);
    expect(app.useSimulationStore.getState().scoringMode).toBe("coverage");
    expect(app.useSimulationStore.getState().viewingShared).toBe(false);
  });

  it("is a lens, not a posture change: a named posture keeps its name, and a reset keeps the mode", () => {
    sim().saveScenario("Mine");
    sim().setScoringMode("coverage");
    expect(sim().scenarioName).toBe("Mine");
    sim().resetToBaseline();
    expect(sim().scoringMode).toBe("coverage");
    expect(saved().scoringMode).toBe("coverage");
  });

  it("is ignored while viewing a shared link, and the reader's own comes back with “Back to mine”", () => {
    sim().setScoringMode("coverage");
    sim().openShared({ ...saved(), scoringMode: "paths" });
    expect(sim().scoringMode).toBe("paths");
    sim().setScoringMode("coverage");
    sim().setScoringMode("paths");
    expect(saved().scoringMode).toBe("coverage");
    sim().restoreMine();
    expect(sim().scoringMode).toBe("coverage");
  });
});

describe("share links carry the scoring mode", () => {
  it("round-trips through a share link", async () => {
    sim().setScoringMode("coverage");
    sim().setBlockState("NET-01", "deployed");
    const url = sim().copyShareUrl();
    localStorage.clear(); // the recipient has nothing saved
    history.replaceState(null, "", url.slice(url.indexOf("/sl5/")));
    const app = await freshApp(); // the hash is captured when persistence loads
    app.useSimulationStore.getState().loadData(blocks, model, []);
    const s = app.useSimulationStore.getState();
    expect(s.viewingShared).toBe(true);
    expect(s.scoringMode).toBe("coverage");
    expect(s.blockStates["NET-01"]).toBe("deployed");
  });

  it("a paths-mode link opens in paths mode for a reader who uses coverage", async () => {
    const url = sim().copyShareUrl(); // made in paths mode
    sim().setScoringMode("coverage");
    history.replaceState(null, "", url.slice(url.indexOf("/sl5/")));
    const app = await freshApp();
    app.useSimulationStore.getState().loadData(blocks, model, []);
    expect(app.useSimulationStore.getState().scoringMode).toBe("paths");
    // ...and the reader's own save still says coverage.
    expect(saved().scoringMode).toBe("coverage");
  });

  it("an old link or save without the setting opens in attack-path mode", async () => {
    const old: PersistedState = { ...saved() };
    delete old.scoringMode;
    expect(migratePersistedState(old).scoringMode).toBe("paths");
    expect(migratePersistedState({ ...old, scoringMode: "bogus" } as unknown as PersistedState).scoringMode).toBe("paths");
    expect(migratePersistedState({ ...old, scoringMode: "coverage" }).scoringMode).toBe("coverage");

    const app = await freshApp();
    const url = app.stateToShareUrl(old);
    history.replaceState(null, "", url.slice(url.indexOf("/sl5/")));
    const fresh = await freshApp();
    fresh.useSimulationStore.setState({ scoringMode: "coverage" });
    fresh.useSimulationStore.getState().loadData(blocks, model, []);
    expect(fresh.useSimulationStore.getState().scoringMode).toBe("paths");
  });
});

describe("a story plays in attack-path mode", () => {
  for (const script of [SCRIPTS.find((s) => s.type === "scripted")!, SCRIPTS.find((s) => s.type === "passthrough")!]) {
    it(`${script.id}: forces paths while it plays and restores the reader's mode on stop`, () => {
      sim().setScoringMode("coverage");
      const mine = saved();
      playback().startScript(script);
      expect(sim().scoringMode).toBe("paths");
      playback().pause();
      playback().setPlaybackT(3);
      expect(sim().scoringMode).toBe("paths");
      // The story's frame is never saved as the reader's.
      expect(saved()).toEqual(mine);
      playback().stop();
      expect(sim().scoringMode).toBe("coverage");
      expect(saved()).toEqual(mine);
    });
  }

  it("switching stories mid-play still restores the mode from before the first", () => {
    sim().setScoringMode("coverage");
    playback().startScript(SCRIPTS[0]);
    playback().startScript(SCRIPTS[1]);
    expect(sim().scoringMode).toBe("paths");
    playback().stop();
    expect(sim().scoringMode).toBe("coverage");
  });
});
