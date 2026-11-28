// @vitest-environment jsdom
//
// The two scoring modes on screen. Coverage mode is v1's method: the level is
// programme completeness (0.3 × the weakest category + 0.7 × the mean) shown
// as a level plus progress, the rail lists each category's share of controls
// built, and "next defense" ranks by completeness gained per $M. In either
// mode a one-line note gives the other method's level, because where the two
// disagree is the lesson.
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent, act, within } from "@testing-library/react";
import { useSimulationStore } from "../../src/store/simulation";
import { useUiStore } from "../../src/store/ui";
import { deriveScore, postureInput } from "../../src/store/derived";
import { orderAfterActivating, scorePosture, type PostureInput } from "../../src/engine/posture";
import type { BlockState } from "../../src/engine/types";
import { baselineStates } from "../../src/engine/baseline";
import { recommendInvestments } from "../../src/utils/ciso-recommendations";
import { coverageLevel, coverageShareText, levelOf } from "../../src/model/scoring-mode";
import { CATEGORY_NAMES, CATEGORY_ORDER, STATES } from "../../src/model/names";
import { VerdictRail } from "../../src/components/rail/VerdictRail";
import { ParametersDrawer } from "../../src/components/params/ParametersDrawer";
import { StageMatrix } from "../../src/components/catalogue/StageMatrix";
import { usePlaybackStore } from "../../src/timelapse/playback-store";
import { SCRIPTS } from "../../src/timelapse/scripts";
import { APP_SLIDERS, allAt, loadBlocks, loadModel, loadWorldState } from "../load-data";

const blocks = loadBlocks();
const model = loadModel();

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  localStorage.clear();
  usePlaybackStore.getState().stop();
  useSimulationStore.setState({ dataLoaded: false, futureCapabilities: false, playbackActive: false, year: 2026, scoringMode: "paths" });
  useSimulationStore.getState().loadData(blocks, model, loadWorldState().oc_definitions);
  useUiStore.setState({ detailId: null, paramsOpen: false, focusApproach: null, highlightIds: [], showAllApproaches: false });
});
afterEach(() => {
  usePlaybackStore.getState().stop();
  cleanup();
});

const setMode = (mode: "paths" | "coverage") => act(() => useSimulationStore.getState().setScoringMode(mode));

/** A deterministic spread of postures: baseline, undefended, everything
 * mature, and seeded random mixes. */
function postures(): PostureInput[] {
  const base = (states: Record<string, BlockState>, year = 2026): PostureInput => ({
    blocks,
    model,
    blockStates: states,
    advanceOrder: Object.keys(states).filter((id) => states[id] !== "not_started"),
    year,
    sliders: { ...APP_SLIDERS, budget_millions: 1e6 },
    adversaryOc: 4,
    modelServedExternally: true,
  });
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const random = () => Object.fromEntries(blocks.filter((b) => !b.future).map((b) => [b.id, STATES[Math.floor(rand() * STATES.length)]]));
  return [
    base(baselineStates(blocks)),
    base({}),
    base(allAt(blocks, "mature")),
    base(allAt(blocks, "mature"), 2030),
    base(random()),
    base(random(), 2028),
    base(random(), 2030),
  ];
}

describe("the coverage-mode level", () => {
  it("is programme completeness, v1's 0.3 × weakest + 0.7 × mean, as a level plus progress", () => {
    for (const input of postures()) {
      const score = scorePosture(input);
      const cov = coverageLevel(score);
      const cats = CATEGORY_ORDER.map((c) => score.categoryScores[c]);
      const v1 = 0.3 * Math.min(...cats) + 0.7 * (cats.reduce((a, b) => a + b, 0) / cats.length);
      expect(cov.value).toBe(score.programCompleteness);
      expect(cov.value).toBeCloseTo(v1, 12);
      expect(cov.level).toBe(Math.floor(cov.value + 1e-9));
      if (cov.level < 5) expect(cov.level + cov.progress).toBeCloseTo(cov.value, 12);
    }
  });

  it("splits a 1–5 value into a whole level and progress toward the next", () => {
    expect(levelOf(1)).toEqual({ level: 1, progress: 0 });
    expect(levelOf(5)).toEqual({ level: 5, progress: 1 });
    expect(levelOf(2.9999999999)).toEqual({ level: 3, progress: 0 });
  });

  it("counts each category's controls in place over today's catalogue", () => {
    const score = deriveScore(useSimulationStore.getState());
    const cov = coverageLevel(score);
    expect(cov.categories.map((c) => c.category)).toEqual([...CATEGORY_ORDER]);
    expect(cov.total).toBe(blocks.filter((b) => !b.future).length);
    for (const c of cov.categories) {
      expect(c.total).toBe(blocks.filter((b) => !b.future && b.category === c.category).length);
      expect(c.share).toBeCloseTo((c.score - 1) / 4, 12);
    }
    expect(cov.categories.filter((c) => c.weakest).length).toBeGreaterThanOrEqual(1);
  });
});

describe("the rail in coverage mode", () => {
  it("leads with the coverage level, the decimal only on hover", () => {
    setMode("coverage");
    const { getByTestId } = render(<VerdictRail />);
    const cov = coverageLevel(deriveScore(useSimulationStore.getState()));
    const sl = getByTestId("sl-level");
    expect(sl.textContent).toBe(`SL${cov.level}`);
    expect(sl.getAttribute("title")).toContain(cov.value.toFixed(2));
    expect(sl.getAttribute("aria-label")).toContain("by control coverage");
  });

  it("lists each category's share of controls and how many are in place", () => {
    setMode("coverage");
    const { getByTestId } = render(<VerdictRail />);
    const cov = coverageLevel(deriveScore(useSimulationStore.getState()));
    const rows = Array.from(getByTestId("coverage-list").querySelectorAll("li"));
    expect(rows).toHaveLength(CATEGORY_ORDER.length);
    cov.categories.forEach((c, i) => {
      expect(rows[i].textContent).toContain(CATEGORY_NAMES[c.category]);
      expect(rows[i].textContent).toContain(coverageShareText(c.share));
      expect(rows[i].textContent).toContain(`${c.inPlace} of ${c.total} in place`);
    });
    expect(getByTestId("verdict-rail").textContent).toContain("ignores which attackers the controls stop");
  });

  it("drops the tier ladder and what still gets through", () => {
    setMode("coverage");
    const { queryByTestId, getByTestId } = render(<VerdictRail />);
    expect(queryByTestId("tier-ladder")).toBeNull();
    expect(getByTestId("verdict-rail").textContent).not.toContain("What still gets through");
  });

  it("notes the attack-path level as the other method", () => {
    setMode("coverage");
    const { getByTestId } = render(<VerdictRail />);
    const score = deriveScore(useSimulationStore.getState());
    const note = getByTestId("other-method");
    expect(note.textContent).toContain(`Other method: SL${score.sl.level} by attack paths`);
  });

  it("ranks the next defense by coverage gained per $M", () => {
    setMode("coverage");
    const input = postureInput(useSimulationStore.getState());
    const analysis = recommendInvestments(input, { objective: "coverage" });
    expect(analysis.candidates.length).toBeGreaterThan(3);
    for (const c of analysis.candidates) {
      const states: Record<string, BlockState> = { ...input.blockStates };
      for (const id of c.blockIds) states[id] = "deployed";
      const after = scorePosture({ ...input, blockStates: states, advanceOrder: orderAfterActivating(input, c.blockIds) });
      expect(c.coverageGain, c.block.id).toBeCloseTo(after.programCompleteness - analysis.baseline.programCompleteness, 12);
      expect(c.coverageGain, c.block.id).toBeGreaterThan(0);
      expect(c.coverageGainPerMillion).toBeCloseTo(c.coverageGain / Math.max(c.costMillions, 1), 12);
    }
    const keys = analysis.candidates.map((c) => c.coverageGainPerMillion);
    expect(keys).toEqual([...keys].sort((a, b) => b - a));
    // The paths ranking is a different list, by a different key.
    const paths = recommendInvestments(input);
    expect(paths.candidates.map((c) => c.block.id)).not.toEqual(analysis.candidates.map((c) => c.block.id));

    const { getByTestId } = render(<VerdictRail />);
    const shown = Array.from(getByTestId("next-defense").querySelectorAll("li"));
    expect(shown).toHaveLength(3);
    analysis.candidates.slice(0, 3).forEach((c, i) => {
      expect(shown[i].textContent).toContain(c.block.id);
      expect(shown[i].textContent).toContain(`adds to ${CATEGORY_NAMES[c.block.category]}`);
    });
  });
});

describe("the rail in attack-path mode", () => {
  it("is today's rail, with completeness secondary and the coverage level as the other method", () => {
    const { getByTestId, queryByTestId } = render(<VerdictRail />);
    const score = deriveScore(useSimulationStore.getState());
    const cov = coverageLevel(score);
    expect(getByTestId("tier-ladder")).toBeTruthy();
    expect(queryByTestId("coverage-list")).toBeNull();
    expect(getByTestId("sl-level").textContent).toBe(`SL${score.sl.level}`);
    expect(getByTestId("verdict-rail").textContent).toContain("Program completeness");
    expect(getByTestId("other-method").textContent).toContain(`Other method: SL${cov.level} by control coverage`);
  });
});

describe("switching modes", () => {
  it("the rail header's switch shows and flips the mode", () => {
    const { getByTestId } = render(<VerdictRail />);
    const sw = within(getByTestId("rail-mode"));
    expect(sw.getByRole("radio", { name: "Attack paths" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(sw.getByRole("radio", { name: "Coverage" }));
    expect(useSimulationStore.getState().scoringMode).toBe("coverage");
    expect(getByTestId("verdict-rail").dataset.scoringMode).toBe("coverage");
    expect(sw.getByRole("radio", { name: "Coverage" }).getAttribute("aria-checked")).toBe("true");
  });

  it("the parameters drawer leads with the choice, in the reader's words", () => {
    act(() => useUiStore.getState().setParamsOpen(true));
    const { getByRole } = render(<ParametersDrawer />);
    const group = within(getByRole("radiogroup", { name: "How to score your security level" }));
    const [paths, coverage] = group.getAllByRole("radio");
    expect(paths.textContent).toContain("Attack-path analysis");
    expect(paths.textContent).toContain("which attackers you usually stop (RAND vectors)");
    expect(coverage.textContent).toContain("Control coverage");
    expect(coverage.textContent).toContain("how much of the catalogue you've built (the v1 method)");
    fireEvent.click(coverage);
    expect(useSimulationStore.getState().scoringMode).toBe("coverage");
    expect(coverage.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(paths);
    expect(useSimulationStore.getState().scoringMode).toBe("paths");
  });

  it("is locked while a story plays, which is told in attack-path terms", () => {
    setMode("coverage");
    act(() => usePlaybackStore.getState().startScript(SCRIPTS[0]));
    act(() => useUiStore.getState().setParamsOpen(true));
    const { getByRole, getByTestId } = render(
      <div>
        <VerdictRail />
        <ParametersDrawer />
      </div>
    );
    expect(getByTestId("verdict-rail").dataset.scoringMode).toBe("paths");
    for (const r of within(getByRole("radiogroup", { name: "How to score your security level" })).getAllByRole("radio"))
      expect((r as HTMLButtonElement).disabled).toBe(true);
    for (const r of within(getByTestId("rail-mode")).getAllByRole("radio")) expect((r as HTMLButtonElement).disabled).toBe(true);
    act(() => usePlaybackStore.getState().stop());
    expect(getByTestId("verdict-rail").dataset.scoringMode).toBe("coverage");
  });
});

describe("the catalogue", () => {
  it("shows each category's coverage share in its row header only in coverage mode", () => {
    const { container, rerender } = render(<StageMatrix />);
    expect(container.querySelectorAll("[data-coverage-share]")).toHaveLength(0);
    setMode("coverage");
    rerender(<StageMatrix />);
    const cov = coverageLevel(deriveScore(useSimulationStore.getState()));
    const shares = Array.from(container.querySelectorAll("[data-coverage-share]")).map((el) => el.textContent);
    expect(shares).toEqual(cov.categories.map((c) => coverageShareText(c.share)));
  });
});
