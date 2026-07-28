import type { Block } from "../../engine/types";
import { aiDegradation } from "../../engine/scoring";
import type { DemoBlock } from "../content";

/**
 * AI erosion for a demo block, computed by the real engine.
 *
 * `aiDegradation()` only reads `defense_type` and
 * `adversary_exploitation.ai_oc_shift`, so a two-field stand-in is enough — and
 * calling the engine means the intro can't quietly disagree with the app about
 * how fast a probabilistic control decays. The cast is the price of not
 * inlining a full 40-field Block into the intro bundle.
 */
export function demoDegradation(block: DemoBlock, year: number, aiTimeline = 0.5): number {
  const stand_in = {
    defense_type: block.defenseType,
    adversary_exploitation: { ai_oc_shift: block.aiOcShift },
  } as unknown as Block;
  return aiDegradation(stand_in, year, aiTimeline);
}
