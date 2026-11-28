import type { Sliders } from "../engine/types";
import type { ScoringMode } from "../model/scoring-mode";
import { DEFAULT_SLIDERS } from "../store/simulation";
import type { TimeLapseScript } from "./types";

/**
 * Every story, scripted or the reader's own posture run forward, is scored by
 * attack paths: its captions and its closing takeaway state threat-relative
 * outcomes ("SL2, OC2 now usually fails"), which a coverage level beside them
 * would contradict. The reader's own mode is saved with their posture when the
 * story starts and comes back when it stops.
 */
export const STORY_SCORING_MODE: ScoringMode = "paths";

/** The parts of the world a scripted story pins. */
const PINNED_STORY_SLIDERS = ["sl_bar", "ai_timeline", "ai_propensity"] as const satisfies readonly (keyof Sliders)[];

/**
 * The world a scripted story is told in.
 *
 * A story's captions state fixed outcomes ("SL2, OC2 now usually fails"), so
 * what those outcomes turn on is pinned instead of read from the reader's
 * Parameters: the standard bar, the default AI pace and propensity, and a
 * model served through an API. Without this, a reader on the strict bar or
 * with the model not served watched a caption announce a level the rail beside
 * it contradicted. A script's own `sliderOverrides` and `modelServedExternally`
 * win over the pins; the rest of the reader's world (government and vendor
 * cooperation, ...) carries through, as no caption turns on it.
 *
 * (`DEFAULT_SLIDERS` is read at call time, not at module load: the store
 * imports the playback store, which imports this.)
 */
export function storyWorld(
  script: Pick<TimeLapseScript, "sliderOverrides" | "modelServedExternally">,
  reader: { sliders: Sliders }
): { sliders: Sliders; modelServedExternally: boolean } {
  const pinned: Partial<Sliders> = {};
  for (const key of PINNED_STORY_SLIDERS) pinned[key] = DEFAULT_SLIDERS[key];
  return {
    sliders: { ...reader.sliders, ...pinned, ...script.sliderOverrides },
    modelServedExternally: script.modelServedExternally ?? true,
  };
}
