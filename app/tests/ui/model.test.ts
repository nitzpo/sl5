// The UI's pure derivations: plain names, the matrix column rule, the cluster
// layout, the path anchors, the threat front and the words numbers become.
import { describe, it, expect } from "vitest";
import { scorePosture } from "../../src/engine/posture";
import { STAGES } from "../../src/engine/types";
import { BLOCK_NAMES, VECTOR_NAMES, blockLines } from "../../src/model/names";
import {
  MATRIX_COLUMNS,
  blockColumn,
  leadingApproaches,
  matrixCells,
  pathAnchors,
  primaryStage,
  stageCoverage,
} from "../../src/model/catalogue-layout";
import { HEX_R, VIEW_H, VIEW_W, WEIGHTS, clusterLayout } from "../../src/model/cluster-layout";
import { FRONT_LIFT, maxAiShift, threatFrontYear } from "../../src/model/race";
import { coverageWord, leadTime, money, moneyRange, shareWord } from "../../src/model/words";
import { baselineStates } from "../../src/engine/baseline";
import { allAt, APP_SLIDERS, loadBlocks, loadModel } from "../load-data";

const blocks = loadBlocks();
const model = loadModel();
const vById = new Map(model.vectors.map((v) => [v.id, v]));

describe("plain names", () => {
  it("every block and every vector has one, in at most two lines", () => {
    for (const b of blocks) {
      expect(BLOCK_NAMES[b.id], b.id).toBeTruthy();
      expect(blockLines(b.id).length, b.id).toBeLessThanOrEqual(2);
      for (const line of blockLines(b.id)) expect(line.length, `${b.id}: ${line}`).toBeLessThanOrEqual(14);
    }
    for (const v of model.vectors) expect(VECTOR_NAMES[v.id], v.id).toBeTruthy();
  });
});

describe("the matrix column rule", () => {
  it("puts a block at the stage of its strong counters, ties going later", () => {
    expect(primaryStage(blocks.find((b) => b.id === "NET-01")!, vById)).toBe("entry"); // 5 strong at entry
    expect(primaryStage(blocks.find((b) => b.id === "NET-04")!, vById)).toBe("exfil"); // bandwidth cap
    expect(primaryStage(blocks.find((b) => b.id === "KEY-01")!, vById)).toBe("reach"); // weight keys
    // NET-05 (data diodes) is strong once at entry (air-gap crossings) and once at exfil (bulk egress): the later stage.
    expect(primaryStage(blocks.find((b) => b.id === "NET-05")!, vById)).toBe("exfil");
  });

  it("gives the campaign-level detection blocks their own column", () => {
    expect(blockColumn(blocks.find((b) => b.id === "DET-01")!, vById)).toBe("detect");
    expect(blockColumn(blocks.find((b) => b.id === "DEC-01")!, vById)).toBe("detect");
  });

  it("places every block exactly once, and fills every column", () => {
    const cells = matrixCells(blocks, vById);
    const placed = Object.values(cells).flatMap((row) => MATRIX_COLUMNS.flatMap((c) => row[c].map((b) => b.id)));
    expect(placed.sort()).toEqual(blocks.map((b) => b.id).sort());
    for (const col of MATRIX_COLUMNS) {
      expect(Object.values(cells).some((row) => row[col].length > 0), col).toBe(true);
    }
  });
});

describe("the clusters layout", () => {
  const { pos } = clusterLayout(blocks);
  it("places every block inside the view, clear of the weights and of each other", () => {
    expect(pos.size).toBe(blocks.length);
    const pts = [...pos.values()];
    for (const p of pts) {
      expect(p.x - HEX_R).toBeGreaterThanOrEqual(0);
      expect(p.x + HEX_R).toBeLessThanOrEqual(VIEW_W);
      expect(p.y - HEX_R).toBeGreaterThanOrEqual(0);
      expect(p.y + HEX_R).toBeLessThanOrEqual(VIEW_H);
      expect(Math.hypot(p.x - WEIGHTS.x, p.y - WEIGHTS.y)).toBeGreaterThan(WEIGHTS.r + HEX_R);
    }
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThan(2 * HEX_R * 0.86);
  });
});

describe("path anchors and stage coverage", () => {
  const columnOf = (b: (typeof blocks)[number]) => blockColumn(b, vById);
  const input = {
    blocks,
    model,
    blockStates: baselineStates(blocks),
    year: 2026,
    sliders: APP_SLIDERS,
    adversaryOc: 4,
    modelServedExternally: true,
  };

  it("anchors each step in its own stage's column, on a block that counters its vector", () => {
    const score = scorePosture(input);
    for (const a of leadingApproaches(score, 6)) {
      for (const anchor of pathAnchors(a, score.catalogue, score.effectiveStates, columnOf)) {
        if (!anchor.anchorId) continue;
        const b = blocks.find((x) => x.id === anchor.anchorId)!;
        expect(columnOf(b)).toBe(anchor.stage);
        expect(b.counters.some((c) => c.vector_id === anchor.vectorId)).toBe(true);
        expect(anchor.pass).toBeGreaterThan(0);
        expect(anchor.pass).toBeLessThanOrEqual(1);
      }
    }
  });

  it("breaks the line only where an operational strong counter holds", () => {
    const bare = scorePosture({ ...input, blockStates: allAt(blocks, "not_started") });
    for (const a of bare.approaches.filter((x) => x.active))
      for (const anchor of pathAnchors(a, bare.catalogue, bare.effectiveStates, columnOf)) expect(anchor.holds).toBe(false);
    const full = scorePosture({ ...input, blockStates: allAt(blocks, "mature"), sliders: { ...APP_SLIDERS, budget_millions: 1e6 } });
    const holds = full.approaches
      .filter((x) => x.active)
      .flatMap((a) => pathAnchors(a, full.catalogue, full.effectiveStates, columnOf))
      .filter((x) => x.holds);
    expect(holds.length).toBeGreaterThan(0);
  });

  it("calls an undefended lab's stages open and a full catalogue's better covered", () => {
    const cellsAll = matrixCells(blocks, vById);
    const bare = scorePosture({ ...input, blockStates: allAt(blocks, "not_started") });
    const full = scorePosture({ ...input, blockStates: allAt(blocks, "mature"), sliders: { ...APP_SLIDERS, budget_millions: 1e6 } });
    const bareCov = stageCoverage(bare, cellsAll, bare.effectiveStates);
    const fullCov = stageCoverage(full, cellsAll, full.effectiveStates);
    for (const s of STAGES) {
      expect(bareCov.find((c) => c.stage === s)!.word).toBe("Open");
      expect(fullCov.find((c) => c.stage === s)!.cut).toBeGreaterThan(bareCov.find((c) => c.stage === s)!.cut);
    }
    expect(bareCov.filter((c) => c.weakest)).toHaveLength(1);
  });
});

describe("the threat front", () => {
  const shift = maxAiShift(model.vectors);
  it("arrives when AI lifts the most AI-sensitive vectors a whole tier, sooner on a faster timeline", () => {
    expect(shift).toBe(1);
    expect(FRONT_LIFT).toBe(1);
    const mid = threatFrontYear(0.5, shift)!;
    expect(mid).toBeCloseTo(2030, 5); // the default curve reaches full capability in 2030
    expect(threatFrontYear(1, shift)!).toBeLessThan(mid);
    expect(threatFrontYear(0, shift, 2040)!).toBeGreaterThan(mid);
  });
});

describe("words", () => {
  it("turns money, lead times and shares into ranges and words, never percentages", () => {
    expect(money(12)).toBe("$12M");
    expect(money(1500)).toBe("$1.5B");
    expect(moneyRange(50, 150)).toBe("$50–150M");
    expect(moneyRange(800, 1500)).toBe("$800M–$1.5B");
    expect(leadTime(12, 24)).toBe("12–24 mo");
    expect(leadTime(24, 999)).toContain("research-gated");
    expect(shareWord(0.5)).toBe("about half");
    expect(coverageWord(0)).toBe("Open");
    expect(coverageWord(0.9)).toBe("Held");
  });
});
