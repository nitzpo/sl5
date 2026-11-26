import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import { useSimulationStore } from "../../src/store/simulation";
import { baselineStates, baselineStateFor } from "../../src/engine/baseline";
import { applyBudgetConstraint, blockCostBasis } from "../../src/engine/budget";
import type { Block } from "../../src/engine/types";

const DATA = path.join(__dirname, "../../public/data");
const blocks: Block[] = fs
  .readdirSync(DATA)
  .filter((f) => f.startsWith("blocks-") && f.endsWith(".json"))
  .flatMap((f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf-8")) as Block[]);

// A block the lab already partly runs (baseline `implementing`, so it sits in the
// advancement order from the start) and one it doesn't run at all.
const seeded = blocks.find(
  (b) => baselineStateFor(b) === "implementing" && !b.current_state.baseline_since
)!;
const fresh = blocks.find((b) => baselineStateFor(b) === "not_started")!;

describe("advancement order (store)", () => {
  beforeEach(() => {
    // dataLoaded stays false, so the auto-save subscriber never touches storage.
    const states = baselineStates(blocks);
    useSimulationStore.setState({
      blocks,
      blockStates: states,
      advanceOrder: Object.keys(states).filter((id) => states[id] !== "not_started"),
      dataLoaded: false,
    });
  });

  it("queues a baseline block behind later purchases once it starts costing money", () => {
    const store = useSimulationStore.getState();
    expect(store.advanceOrder).toContain(seeded.id);
    // Buy a fresh block first, then push the seeded one past its baseline.
    store.setBlockState(fresh.id, "deployed");
    store.setBlockState(seeded.id, "deployed");
    const order = useSimulationStore.getState().advanceOrder;
    expect(order.indexOf(seeded.id)).toBeGreaterThan(order.indexOf(fresh.id));
    expect(order[order.length - 1]).toBe(seeded.id);
  });

  it("so the later click can only unfund itself, never the earlier one", () => {
    const store = useSimulationStore.getState();
    store.setBlockState(fresh.id, "deployed");
    store.setBlockState(seeded.id, "deployed");
    const { blockStates, advanceOrder } = useSimulationStore.getState();
    // Exactly enough budget for the block bought first.
    const { exceededIds } = applyBudgetConstraint(blocks, blockStates, blockCostBasis(fresh, 0.5), {
      order: advanceOrder,
      riskTolerance: 0.5,
    });
    expect(exceededIds.has(fresh.id)).toBe(false);
    expect(exceededIds.has(seeded.id)).toBe(true);
  });

  it("leaves the order alone for moves that stay within the baseline or are already paid for", () => {
    const store = useSimulationStore.getState();
    const before = useSimulationStore.getState().advanceOrder;
    store.setBlockState(seeded.id, "investing"); // still at/below baseline
    expect(useSimulationStore.getState().advanceOrder).toEqual(before);
    store.setBlockState(fresh.id, "investing");
    store.setBlockState(seeded.id, "deployed");
    const after = useSimulationStore.getState().advanceOrder;
    store.cycleBlockState(seeded.id); // deployed → mature: already costing
    expect(useSimulationStore.getState().advanceOrder).toEqual(after);
  });
});
