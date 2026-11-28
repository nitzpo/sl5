// Old share links and saved postures name blocks that Phase 2 merged away
// (PER-05, SC-02, ...) and predate the new sliders and the future toggle. They
// must still load, onto the equivalent posture.
import { describe, it, expect } from "vitest";
import { migratePersistedState, type PersistedState } from "../../src/store/persistence";
import { LEGACY_BLOCK_IDS, migrateBlockOrder, migrateBlockStates } from "../../src/engine/catalogue";
import type { BlockState, Sliders } from "../../src/engine/types";
import { loadBlocks } from "../load-data";

const OLD_SLIDERS = {
  ai_timeline: 0.5,
  gov_cooperation: 0.2,
  vendor_cooperation: 0.3,
  budget_millions: 200,
  org_transformation: 0.3,
  risk_tolerance: 0.5,
} as Sliders; // a pre-Phase-2 save: no sl_bar, no ai_propensity

function oldSave(blockStates: Record<string, BlockState>, advanceOrder?: string[]): PersistedState {
  return {
    blockStates,
    advanceOrder,
    year: 2027,
    perspective: "ciso",
    adversaryOc: 4,
    sliders: OLD_SLIDERS,
    modelServedExternally: true,
  };
}

describe("saved-state migration of merged block ids", () => {
  const ids = new Set(loadBlocks().map((b) => b.id));

  it("maps every merged-away id onto blocks that exist", () => {
    for (const [old, to] of Object.entries(LEGACY_BLOCK_IDS)) {
      expect(ids.has(old)).toBe(false);
      for (const id of to) expect(ids.has(id), `${old} → ${id}`).toBe(true);
    }
  });

  it("carries a merged block's state onto its successor, keeping the more advanced one", () => {
    const m = migrateBlockStates({
      "PER-05": "mature",
      "PER-03": "implementing",
      "SC-02": "investing",
      "SC-06": "deployed",
      "PHY-05": "implementing",
      "NET-01": "deployed",
    });
    expect(m["PER-03"]).toBe("mature");
    expect(m["SC-08"]).toBe("deployed");
    expect(m["PHY-08"]).toBe("implementing");
    expect(m["NET-01"]).toBe("deployed");
    for (const old of ["PER-05", "SC-02", "SC-06", "PHY-05"]) expect(m[old]).toBeUndefined();
  });

  it("splits AI-03 across both halves of the channel defence it was folded into", () => {
    const m = migrateBlockStates({ "AI-03": "deployed", "AI-07": "mature" });
    expect(m["AI-07"]).toBe("mature");
    expect(m["AI-08"]).toBe("deployed");
  });

  it("keeps the funding order, with each successor at its first position", () => {
    expect(migrateBlockOrder(["NET-01", "SC-02", "PER-05", "SC-06", "PER-03", "AI-03"])).toEqual([
      "NET-01",
      "SC-08",
      "PER-03",
      "AI-07",
      "AI-08",
    ]);
  });

  it("is idempotent", () => {
    const once = migratePersistedState(oldSave({ "PER-07": "deployed", "HW-10": "investing" }, ["PER-07", "HW-10"]));
    expect(migratePersistedState(once)).toEqual(once);
  });

  it("fills sliders added since the save", () => {
    const m = migratePersistedState(oldSave({}));
    expect(m.sliders.sl_bar).toBe(0.2);
    expect(m.sliders.ai_propensity).toBe(0.5);
    // ...without touching a value the save did have.
    expect(m.sliders.gov_cooperation).toBe(0.2);
    const kept = migratePersistedState({ ...oldSave({}), sliders: { ...OLD_SLIDERS, sl_bar: 0.1, ai_propensity: 0.9 } });
    expect(kept.sliders.sl_bar).toBe(0.1);
    expect(kept.sliders.ai_propensity).toBe(0.9);
  });

  it("drops the retired future toggle and the FUT-xx blocks it counted", () => {
    // Saves and links from before the Nov 2026 recalibration may carry both.
    const m = migratePersistedState({
      ...oldSave({ "FUT-01": "mature", "FUT-05": "deployed", "NET-01": "deployed" }, ["FUT-01", "NET-01", "FUT-05"]),
      futureCapabilities: true,
    });
    expect("futureCapabilities" in m).toBe(false);
    expect(m.blockStates).toEqual({ "NET-01": "deployed" });
    expect(m.advanceOrder).toEqual(["NET-01"]);
    expect(migratePersistedState(m)).toEqual(m);
  });

  it("leaves every migrated id pointing at a real block", () => {
    const every = Object.fromEntries([...Object.keys(LEGACY_BLOCK_IDS), "NET-01"].map((id) => [id, "deployed" as BlockState]));
    const m = migratePersistedState(oldSave(every, Object.keys(every)));
    for (const id of Object.keys(m.blockStates)) expect(ids.has(id), id).toBe(true);
    for (const id of m.advanceOrder!) expect(ids.has(id), id).toBe(true);
  });
});
