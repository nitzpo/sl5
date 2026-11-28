// @vitest-environment jsdom
//
// Cheap component checks on the v2 main screen: the rail speaks in band words,
// no percentage reaches the reader (in coverage scoring mode, only the shares of
// controls built may), the matrix shows every block, and a research-required
// block says so.

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { useSimulationStore } from "../../src/store/simulation";
import { useUiStore } from "../../src/store/ui";
import { deriveScore, postureInput } from "../../src/store/derived";
import { recommendInvestments } from "../../src/utils/ciso-recommendations";
import { STORAGE_KEY, SCENARIOS_KEY } from "../../src/store/persistence";
import { StageMatrix } from "../../src/components/catalogue/StageMatrix";
import { ClusterMap } from "../../src/components/catalogue/ClusterMap";
import { VerdictRail } from "../../src/components/rail/VerdictRail";
import { Header } from "../../src/components/layout/Header";
import { ViewBar } from "../../src/components/layout/ViewBar";
import { ApproachLanes } from "../../src/components/approaches/ApproachLanes";
import { RaceView } from "../../src/components/race/RaceView";
import { BlockDrawer } from "../../src/components/detail/BlockDrawer";
import { ParametersDrawer } from "../../src/components/params/ParametersDrawer";
import { BAND_WORDS } from "../../src/model/words";
import { usePlaybackStore } from "../../src/timelapse/playback-store";
import { SCRIPTS } from "../../src/timelapse/scripts";
import { loadBlocks, loadModel, loadWorldState } from "../load-data";

const blocks = loadBlocks();
const model = loadModel();
const today = blocks.map((b) => b.id).sort();

beforeAll(() => {
  // jsdom has no layout: the matrix measures tiles for its path overlay.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  localStorage.clear();
  useSimulationStore.setState({ dataLoaded: false, playbackActive: false, year: 2026, scoringMode: "paths" });
  useSimulationStore.getState().loadData(blocks, model, loadWorldState().oc_definitions);
  useUiStore.setState({ detailId: null, paramsOpen: false, focusApproach: null, highlightIds: [], showAllApproaches: false });
});
afterEach(() => cleanup());

const shownIds = (root: ParentNode) =>
  Array.from(root.querySelectorAll<HTMLElement>("[data-block-id]"))
    .map((el) => el.dataset.blockId!)
    .sort();

describe("the stage matrix", () => {
  it("renders every block in today's catalogue, once", () => {
    const { container } = render(<StageMatrix />);
    expect(shownIds(container)).toEqual(today);
  });

  it("names a research-required block as such to assistive tech, and nothing else", () => {
    const { container } = render(<StageMatrix />);
    for (const b of blocks) {
      const label = container.querySelector(`[data-block-id="${b.id}"] button`)!.getAttribute("aria-label") ?? "";
      expect(label.includes("research required"), b.id).toBe(!!b.research_required);
    }
  });

  it("clicking a tile advances its block, right-click steps it back", () => {
    const { container } = render(<StageMatrix />);
    const id = "PER-04";
    const before = useSimulationStore.getState().blockStates[id] ?? "not_started";
    const tile = container.querySelector(`[data-block-id="${id}"] button`)!;
    fireEvent.click(tile);
    expect(useSimulationStore.getState().blockStates[id]).not.toBe(before);
    fireEvent.contextMenu(tile);
    expect(useSimulationStore.getState().blockStates[id]).toBe(before);
  });
});

describe("the clusters", () => {
  it("render the same blocks", () => {
    const { container } = render(<ClusterMap />);
    expect(shownIds(container)).toEqual(today);
  });
});

describe("the verdict rail", () => {
  it("states each tier and the own model in band words", () => {
    const { getByTestId } = render(<VerdictRail />);
    const ladder = getByTestId("tier-ladder");
    const rows = Array.from(ladder.querySelectorAll("li"));
    expect(rows).toHaveLength(6); // OC1–OC5 and the own model
    const score = deriveScore(useSimulationStore.getState());
    score.tiers.forEach((t, i) => expect(rows[i].textContent).toContain(t.band));
    expect(rows[5].textContent).toContain(score.aiInsider.band);
    for (const row of rows) expect(BAND_WORDS.some((w) => row.textContent!.includes(w))).toBe(true);
  });

  it("shows the level as a level, with the decimal only in its tooltip", () => {
    const { getByTestId } = render(<VerdictRail />);
    const sl = getByTestId("sl-level");
    const { sl: result } = deriveScore(useSimulationStore.getState());
    expect(sl.textContent).toBe(`SL${result.level}`);
    expect(sl.getAttribute("title")).toContain(result.value.toFixed(2));
  });
});

describe("next defense to fund", () => {
  it("shows a block the programme already funds as already funded, not at its full price", () => {
    // A prerequisite-free block the lab doesn't run yet, advanced one step: it
    // is in the funding queue, so finishing it costs nothing new.
    const { blockStates } = useSimulationStore.getState();
    const before = recommendInvestments(postureInput(useSimulationStore.getState()));
    const id = before.candidates.find(
      (c) => c.prerequisites.length === 0 && (blockStates[c.block.id] ?? "not_started") === "not_started"
    )!.block.id;
    act(() => useSimulationStore.getState().setBlockState(id, "implementing"));
    const { getByTestId } = render(<VerdictRail />);
    const row = Array.from(getByTestId("next-defense").querySelectorAll("li")).find((li) => li.textContent!.includes(id));
    expect(row, `${id} should be among the next defenses`).toBeDefined();
    expect(row!.textContent).toContain("already funded");
    expect(row!.textContent).not.toMatch(/\$/);
  });
});

/** All reader-facing text: content, plus hover and screen-reader attributes.
 * Research prose quoted from the data (`data-prose`, in the block drawer) is
 * allowed to cite measured figures; the model's own numbers never are. With
 * `exemptCoverageShares`, the coverage-mode shares of controls built
 * (`data-coverage-share`) are left out too: shares of controls, not
 * probabilities, and the only percentages the UI may print. */
function readerText(root: HTMLElement, { exemptCoverageShares = false } = {}): string {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(exemptCoverageShares ? "[data-prose], [data-coverage-share]" : "[data-prose]").forEach((el) => el.remove());
  const attrs = Array.from(clone.querySelectorAll("*")).flatMap((el) =>
    ["title", "aria-label", "aria-valuetext"].map((a) => el.getAttribute(a) ?? "")
  );
  return [clone.textContent ?? "", ...attrs].join("\n");
}

describe("no percentages", () => {
  function Screen() {
    return (
      <div>
        <Header onShowHelp={() => {}} />
        <ViewBar />
        <StageMatrix />
        <ClusterMap />
        <ApproachLanes />
        <RaceView />
        <VerdictRail />
        <BlockDrawer />
        <ParametersDrawer />
      </div>
    );
  }

  it("appear nowhere in the main UI, its drawers or its hover text, in attack-path mode", () => {
    expect(useSimulationStore.getState().scoringMode).toBe("paths");
    useUiStore.setState({ detailId: "NET-01" });
    const { container, rerender } = render(<Screen />);
    expect(container.querySelector("[data-coverage-share]")).toBeNull();
    expect(readerText(container)).not.toMatch(/%/);
    // The parameters drawer replaces the block drawer.
    act(() => useUiStore.getState().setParamsOpen(true));
    rerender(<Screen />);
    expect(readerText(container)).not.toMatch(/%/);
    // Every block's drawer, research-required blocks included.
    for (const b of blocks) {
      act(() => useUiStore.getState().openDetail(b.id));
      rerender(<BlockDrawer />);
      expect(readerText(container), b.id).not.toMatch(/%/);
    }
  });

  it("in coverage mode, appear only in the shares of controls built", () => {
    act(() => useSimulationStore.getState().setScoringMode("coverage"));
    useUiStore.setState({ detailId: "NET-01" });
    const { container, rerender, getByTestId } = render(<Screen />);
    // The rail's coverage list and the matrix's category headers carry them...
    expect(getByTestId("coverage-list").textContent).toMatch(/\d+% coverage/);
    const shares = Array.from(container.querySelectorAll("[data-coverage-share]"));
    expect(shares.length).toBeGreaterThan(1);
    for (const el of shares) expect(el.textContent).toMatch(/% coverage/);
    // ...and nothing else does: no tier, meter or tooltip turns into a percentage.
    expect(readerText(container, { exemptCoverageShares: true })).not.toMatch(/%/);
    act(() => useUiStore.getState().setParamsOpen(true));
    rerender(<Screen />);
    expect(readerText(container, { exemptCoverageShares: true })).not.toMatch(/%/);
  });
});

describe("storage keys", () => {
  it("v2 saves under its own keys and never writes v1's", () => {
    act(() => useSimulationStore.getState().setYear(2027));
    act(() => useSimulationStore.getState().saveScenario("mine"));
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem(SCENARIOS_KEY)).not.toBeNull();
    expect(STORAGE_KEY).toBe("sl5v2-state");
    expect(SCENARIOS_KEY).toBe("sl5v2-scenarios");
    for (const old of ["sl5-state", "sl5-scenarios", "sl5_intro_seen"]) expect(localStorage.getItem(old)).toBeNull();
  });

  it("a story never overwrites the reader's saved posture", () => {
    act(() => useSimulationStore.getState().setYear(2028));
    const mine = localStorage.getItem(STORAGE_KEY);
    expect(mine).not.toBeNull();
    act(() => usePlaybackStore.getState().startScript(SCRIPTS.find((s) => s.type === "scripted")!));
    act(() => usePlaybackStore.getState().setPlaybackT(3));
    expect(localStorage.getItem(STORAGE_KEY)).toBe(mine);
    act(() => usePlaybackStore.getState().stop());
    expect(localStorage.getItem(STORAGE_KEY)).toBe(mine);
    expect(useSimulationStore.getState().year).toBe(2028);
  });
});
