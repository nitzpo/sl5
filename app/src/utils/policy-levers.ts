import {
  orderAfterActivating,
  scorePosture,
  type PostureInput,
  type PostureScore,
} from "../engine/posture";
import type { Block, BlockState, Sliders } from "../engine/types";

/**
 * The Policymaker view's "what if this lever moved?" analysis, as a pure
 * function over the shared pipeline.
 *
 * It used to score raw clicks (ignoring the budget and prerequisite caps), over
 * 19 named blocks, and pass the AI-timeline number where the sliders belonged —
 * so every gov/vendor/org multiplier was silently 1, and the lever it was
 * measuring had no effect on its own number. Now the baseline is exactly the
 * Score card's posture, and each lever is the same posture with that slider
 * raised AND the blocks it unlocks started.
 */

export type LeverKey = "gov_cooperation" | "vendor_cooperation" | "org_transformation";

export interface LeverImpact {
  key: LeverKey;
  lever: string;
  currentValue: number;
  targetValue: number;
  slDelta: number;
  breachDelta: number;
  /** Lever-affected blocks not started today — the what-if starts them. */
  unlockedBlocks: string[];
  /** Lever-affected blocks already under way — the what-if leaves their state alone. */
  acceleratedBlocks: string[];
}

// Which blocks each slider affects
const LEVERS: { key: LeverKey; lever: string; target: number; blocks: string[] }[] = [
  {
    key: "gov_cooperation",
    lever: "Government Cooperation",
    target: 0.8,
    blocks: ["PER-04", "PHY-01", "SC-08", "NET-03", "PER-01"],
  },
  {
    key: "vendor_cooperation",
    lever: "Vendor Cooperation",
    target: 0.9,
    blocks: ["HW-01", "HW-02", "HW-03", "HW-04", "HW-06", "HW-07"],
  },
  {
    key: "org_transformation",
    lever: "Org Transformation",
    target: 0.9,
    blocks: ["NET-01", "PER-02", "PER-08", "PHY-01", "PER-01", "PER-04", "PER-03"],
  },
];

export function policyLeverImpacts(input: PostureInput): {
  current: PostureScore;
  levers: LeverImpact[];
} {
  const current = scorePosture(input);

  const levers = LEVERS.map(({ key, lever, target, blocks: ids }): LeverImpact => {
    const affected: Block[] = input.blocks.filter((b) => ids.includes(b.id));
    const unlocked = affected.filter(
      (b) => (input.blockStates[b.id] ?? "not_started") === "not_started"
    );
    // Simulate: the lever moves to its target (never down), and the blocks it
    // unlocks start implementing — funded after everything already committed,
    // as any newly-started program would be.
    const states: Record<string, BlockState> = { ...input.blockStates };
    for (const b of unlocked) states[b.id] = "implementing";
    const sliders: Sliders = {
      ...input.sliders,
      [key]: Math.max(input.sliders[key], target),
    };
    const whatIf = scorePosture({
      ...input,
      blockStates: states,
      advanceOrder: orderAfterActivating(input, unlocked.map((b) => b.id)),
      sliders,
    });
    return {
      key,
      lever,
      currentValue: input.sliders[key],
      targetValue: target,
      // overallSl is the threat-relative readout (level + progress); breach is
      // campaign success against the adversary tier.
      slDelta: whatIf.overallSl - current.overallSl,
      breachDelta: whatIf.campaign - current.campaign,
      unlockedBlocks: unlocked.map((b) => b.id),
      acceleratedBlocks: affected.filter((b) => !unlocked.includes(b)).map((b) => b.id),
    };
  });

  return { current, levers: levers.sort((a, b) => b.slDelta - a.slDelta) };
}
