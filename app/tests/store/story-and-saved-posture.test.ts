// @vitest-environment jsdom
//
// A story replaces the live posture and world for as long as it plays. Every
// action that saves or replaces the posture — the shared-link banner's "Keep
// this as mine" and "Back to mine", loading, saving or resetting a posture, a
// pasted link — must act on what the reader had, never on a story frame, and
// stopping must put back exactly what was there, including whether it was a
// shared link (which decides whether the next click is auto-saved as theirs).
//
// And a story's captions state fixed outcomes, so it plays in a pinned world:
// a reader on the strict bar with the model not served still sees each caption
// agree with the rail.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useSimulationStore, DEFAULT_SLIDERS } from "../../src/store/simulation";
import { deriveScore } from "../../src/store/derived";
import { STORAGE_KEY, loadScenarios, type PersistedState } from "../../src/store/persistence";
import { usePlaybackStore } from "../../src/timelapse/playback-store";
import { SCRIPTS } from "../../src/timelapse/scripts";
import { TIMELINE_START } from "../../src/utils/timeline";
import { baselineStates } from "../../src/engine/baseline";
import { SL_BAR_PRESETS } from "../../src/engine/threat-sl";
import { loadBlocks, loadModel } from "../load-data";

const blocks = loadBlocks();
const model = loadModel();
const proactive = SCRIPTS.find((s) => s.id === "proactive-program")!;

const sim = () => useSimulationStore.getState();
const playback = () => usePlaybackStore.getState();
const saved = (): PersistedState => JSON.parse(localStorage.getItem(STORAGE_KEY)!);

/** The reader's own posture: NET-01 deployed, 2027. Returns it as saved. */
function setUpMine(): PersistedState {
  sim().setBlockState("NET-01", "deployed");
  sim().setYear(2027);
  return saved();
}

/** A shared posture unlike the reader's: no air gap, a mature perimeter, 2029. */
function sharedFrom(mine: PersistedState): PersistedState {
  return { ...mine, blockStates: { ...mine.blockStates, "NET-01": "not_started", "PHY-01": "mature" }, year: 2029 };
}

/** Start the Proactive story and park it four years in (2028), paused. */
function playStory() {
  playback().startScript(proactive);
  playback().pause();
  playback().setPlaybackT(4);
  expect(sim().playbackActive).toBe(true);
  expect(sim().year).toBe(2028);
}

beforeEach(() => {
  localStorage.clear();
  playback().stop();
  // A fresh start: loadData only sets the blocks, so the world is reset here.
  useSimulationStore.setState({
    dataLoaded: false,
    viewingShared: false,
    scenarioName: null,
    playbackActive: false,
    year: 2026,
    adversaryOc: 4,
    sliders: DEFAULT_SLIDERS,
    modelServedExternally: true,
  });
  sim().loadData(blocks, model, []);
});
afterEach(() => playback().stop());

describe("a story never saves its frame as the reader's posture", () => {
  it("“Keep this as mine” during a story keeps the shared posture, not the story", () => {
    const mine = setUpMine();
    const shared = sharedFrom(mine);
    sim().openShared(shared);
    playStory();

    sim().saveShared();

    expect(playback().state).toBe("idle");
    expect(sim().viewingShared).toBe(false);
    expect(saved().year).toBe(2029);
    expect(saved().blockStates).toEqual(shared.blockStates);
    expect(sim().blockStates).toEqual(shared.blockStates);
  });

  it("“Back to mine” during a story, then ✕ and a click: the save is mine plus that click", () => {
    const mine = setUpMine();
    sim().openShared(sharedFrom(mine));
    playStory();

    sim().restoreMine();
    playback().stop(); // the transport's ✕, if it were still there
    expect(sim().viewingShared).toBe(false);
    expect(sim().blockStates).toEqual(mine.blockStates);
    expect(sim().year).toBe(2027);

    sim().stepBlockState("PER-04", 1);
    expect(saved().year).toBe(2027);
    expect(saved().blockStates).toEqual({ ...mine.blockStates, "PER-04": sim().blockStates["PER-04"] });
    expect(saved().blockStates["PHY-01"]).toBe(mine.blockStates["PHY-01"]);
  });

  it("stopping a story over a shared posture puts it back as shared, so the next click isn't saved as mine", () => {
    const mine = setUpMine();
    const shared = sharedFrom(mine);
    sim().openShared(shared);
    playStory();

    playback().stop();
    expect(sim().viewingShared).toBe(true);
    expect(sim().blockStates).toEqual(shared.blockStates);
    expect(sim().year).toBe(2029);

    sim().stepBlockState("PER-04", 1);
    expect(saved()).toEqual(mine);
  });

  it("a link pasted during a story opens as shared and leaves the save alone", () => {
    const mine = setUpMine();
    playStory();

    sim().openShared(sharedFrom(mine), "Their plan");

    expect(playback().state).toBe("idle");
    expect(sim().viewingShared).toBe(true);
    expect(sim().scenarioName).toBe("Their plan");
    expect(sim().year).toBe(2029);
    sim().stepBlockState("PER-04", 1);
    expect(saved()).toEqual(mine);
  });

  it("loading a saved posture during a story ends it and loads that posture, not a frame", () => {
    setUpMine();
    sim().setBlockState("PHY-03", "mature");
    sim().saveScenario("Perimeter");
    const perimeter = loadScenarios()[0].state;
    sim().setBlockState("PHY-03", "not_started");
    playStory();

    sim().loadScenario(0);

    expect(playback().state).toBe("idle");
    expect(sim().scenarioName).toBe("Perimeter");
    expect(saved().blockStates).toEqual(perimeter.blockStates);
    expect(saved().year).toBe(2027);
  });

  it("saving a named posture during a story saves the reader's posture", () => {
    const mine = setUpMine();
    playStory();

    sim().saveScenario("Mid-story");

    expect(playback().state).toBe("idle");
    const named = loadScenarios().find((s) => s.name === "Mid-story")!;
    expect(named.state.blockStates).toEqual(mine.blockStates);
    expect(named.state.year).toBe(2027);
    expect(saved()).toEqual(mine);
  });

  it("a reset during a story resets to the baseline, and the story can't bring the old posture back", () => {
    setUpMine();
    playStory();

    sim().resetToBaseline();

    expect(playback().state).toBe("idle");
    expect(sim().playbackActive).toBe(false);
    expect(saved().blockStates).toEqual(baselineStates(blocks));
    expect(saved().year).toBe(2026);
    expect(saved().sliders).toEqual(DEFAULT_SLIDERS);
    playback().stop();
    expect(sim().blockStates).toEqual(baselineStates(blocks));
  });

  it("switching to “Your Current Config” mid-story runs the reader's posture, not the last story's", () => {
    const mine = setUpMine();
    playStory();
    playback().startScript(SCRIPTS.find((s) => s.type === "passthrough")!);
    expect(sim().blockStates).toEqual(mine.blockStates);
    expect(sim().sliders).toEqual(mine.sliders);
  });
});

/** The outcomes a caption states, checked against the rail's score. */
function claimsIn(message: string) {
  const claims: { what: string; check: (s: ReturnType<typeof deriveScore>) => boolean }[] = [];
  const sl = message.match(/\bSL(\d)\b/);
  if (sl) claims.push({ what: `SL${sl[1]}`, check: (s) => s.sl.level === Number(sl[1]) });
  for (const m of message.matchAll(/OC(\d) now usually fails/g))
    claims.push({ what: m[0], check: (s) => s.tiers[Number(m[1]) - 1].band === "usually fails" });
  for (const m of message.matchAll(/OC(\d) is still contested/g))
    claims.push({ what: m[0], check: (s) => s.tiers[Number(m[1]) - 1].band === "contested" });
  for (const m of message.matchAll(/Even OC(\d) gets through/g))
    claims.push({ what: m[0], check: (s) => !s.tiers[Number(m[1]) - 1].held });
  if (/only just/.test(message)) claims.push({ what: "only just", check: (s) => s.sl.marginal });
  return claims;
}

describe("a story plays in its own world", () => {
  it("its captions match the rail for a reader on the strict bar with the model not served", () => {
    sim().setSlider("sl_bar", SL_BAR_PRESETS.strict);
    sim().setModelServed(false);
    const mine = saved();
    let checked = 0;
    for (const script of SCRIPTS.filter((s) => s.type === "scripted")) {
      playback().startScript(script);
      playback().pause();
      expect(sim().sliders.sl_bar, script.id).toBe(DEFAULT_SLIDERS.sl_bar);
      expect(sim().sliders.ai_timeline, script.id).toBe(DEFAULT_SLIDERS.ai_timeline);
      expect(sim().sliders.ai_propensity, script.id).toBe(DEFAULT_SLIDERS.ai_propensity);
      expect(sim().modelServedExternally, script.id).toBe(true);
      for (const a of script.annotations ?? []) {
        playback().setPlaybackT(a.atYear - (script.startYear ?? TIMELINE_START));
        expect(playback().currentAnnotation).toBe(a.message);
        const score = deriveScore(sim());
        for (const claim of claimsIn(a.message)) {
          expect(claim.check(score), `${script.id} ${a.atYear}: “${claim.what}” (rail: SL${score.sl.level}, ${score.tiers.map((t) => t.band).join(" / ")})`).toBe(true);
          checked++;
        }
      }
      playback().stop();
      // And stopping gives the reader their own world back.
      expect(sim().sliders.sl_bar).toBe(SL_BAR_PRESETS.strict);
      expect(sim().modelServedExternally).toBe(false);
    }
    expect(checked).toBeGreaterThanOrEqual(6);
    expect(saved()).toEqual(mine);
  });
});
