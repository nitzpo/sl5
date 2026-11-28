import { usePlaybackStore } from "../../timelapse/playback-store";
import { targetSl } from "../../engine/posture";
import { useSimulationStore } from "../../store/simulation";
import { useScore } from "../../store/derived";
import { formatYear } from "../../utils/format";
import { TIMELINE_END, TIMELINE_START } from "../../utils/timeline";
import { approachName } from "../../model/names";
import { money } from "../../model/words";

/** The story's current line, pinned at the top of the rail while it plays,
 * and its takeaway when it ends. */
export function StoryCaption() {
  const state = usePlaybackStore((s) => s.state);
  const script = usePlaybackStore((s) => s.activeScript);
  const playbackT = usePlaybackStore((s) => s.playbackT);
  const annotation = usePlaybackStore((s) => s.currentAnnotation);
  const stop = usePlaybackStore((s) => s.stop);
  const play = usePlaybackStore((s) => s.play);
  const setPlaybackT = usePlaybackStore((s) => s.setPlaybackT);
  const year = useSimulationStore((s) => s.year);
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const score = useScore();
  if (state === "idle" || !script) return null;

  const range = (script.endYear ?? TIMELINE_END) - (script.startYear ?? TIMELINE_START);
  const atEnd = state === "paused" && range > 0 && playbackT >= range - 1e-6;
  const target = targetSl(adversaryOc);
  const lim = score.sl.limitedBy;

  return (
    <section className="border-2 border-ink p-3" aria-live="polite" data-testid="story-caption">
      <div className="flex items-baseline justify-between gap-2">
        <span className="cap">Story · {script.name}</span>
        <span key={formatYear(year)} className="sl5-year bg-ink px-1.5 py-[2px] font-plex text-[13px] font-semibold text-paper">
          {formatYear(year)}
        </span>
      </div>
      {atEnd ? (
        <div className="mt-2 text-[14px] leading-snug">
          <p>
            <b>
              {formatYear(year)}: SL{score.sl.level}
            </b>{" "}
            — {score.sl.level >= target ? "meets" : "below"} the SL{target} it takes to stop OC{target}.
            {lim && lim.approach && (
              <>
                {" "}
                What still gets through: <b className="text-signal-ink">{approachName(lim.approach)}</b> at OC{lim.tier}.
              </>
            )}{" "}
            Planned spend {money(score.spentMillions)}
            {score.budgetExceededIds.size > 0 && <>, with {score.budgetExceededIds.size} blocks past the budget line</>}.
          </p>
          <div className="mt-2 flex gap-3 text-[13px] font-semibold">
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => {
                setPlaybackT(0);
                play();
              }}
            >
              Replay
            </button>
            <button type="button" className="underline underline-offset-2" onClick={stop}>
              Back to my posture
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 min-h-[40px] text-[14px] leading-snug">{annotation ?? script.description}</p>
      )}
    </section>
  );
}
