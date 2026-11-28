import { useMemo } from "react";
import { usePlaybackStore } from "../../timelapse/playback-store";
import { storyEvents } from "../../timelapse/events";
import { useBudgetStatus } from "../../store/derived";
import { formatYear } from "../../utils/format";
import { TIMELINE_END, TIMELINE_START, quantizeYear } from "../../utils/timeline";
import type { PlaybackSpeed } from "../../timelapse/types";
import { money } from "../../model/words";

const SPEED_CYCLE: PlaybackSpeed[] = [0.5, 1, 2, 4];

const BTN = "flex h-8 min-w-8 items-center justify-center border border-ink px-2 text-[13px] font-semibold hover:bg-ink hover:text-paper";

/** The story transport: under the catalogue while a story plays. Its caption
 * lives in the rail, next to the verdict it is talking about. */
export function PlaybackBar() {
  const state = usePlaybackStore((s) => s.state);
  const speed = usePlaybackStore((s) => s.speed);
  const playbackT = usePlaybackStore((s) => s.playbackT);
  const script = usePlaybackStore((s) => s.activeScript);
  const play = usePlaybackStore((s) => s.play);
  const pause = usePlaybackStore((s) => s.pause);
  const stop = usePlaybackStore((s) => s.stop);
  const setSpeed = usePlaybackStore((s) => s.setSpeed);
  const stepForward = usePlaybackStore((s) => s.stepForward);
  const stepBack = usePlaybackStore((s) => s.stepBack);
  const setPlaybackT = usePlaybackStore((s) => s.setPlaybackT);
  const { spentMillions, budgetExceededIds, budgetMillions } = useBudgetStatus();

  const start = script?.startYear ?? TIMELINE_START;
  const end = script?.endYear ?? TIMELINE_END;
  const range = end - start;
  const beats = useMemo(() => (script ? storyEvents(script).filter((e) => e.message) : []), [script]);
  if (state === "idle" || !script) return null;

  const progress = range > 0 ? playbackT / range : 0;
  const year = quantizeYear(start + playbackT);

  return (
    <div className="flex items-center gap-3 border-t-2 border-ink py-2.5" data-testid="playback-bar">
      <span className="cap shrink-0">Story</span>
      <span className="max-w-[160px] shrink-0 truncate text-[14px] font-bold">{script.name}</span>
      <div className="flex shrink-0 gap-1">
        <button type="button" className={BTN} onClick={stepBack} aria-label="Previous beat" title="Previous beat">
          ◀◀
        </button>
        <button
          type="button"
          className={`${BTN} w-10`}
          onClick={state === "playing" ? pause : play}
          aria-label={state === "playing" ? "Pause" : "Play"}
        >
          {state === "playing" ? "❚❚" : "▶"}
        </button>
        <button type="button" className={BTN} onClick={stepForward} aria-label="Next beat" title="Next beat">
          ▶▶
        </button>
        <button
          type="button"
          className={BTN}
          onClick={() => setSpeed(SPEED_CYCLE[(SPEED_CYCLE.indexOf(speed) + 1) % SPEED_CYCLE.length])}
          aria-label={`Speed ${speed}×`}
        >
          {speed}×
        </button>
      </div>
      <div
        className="relative h-8 min-w-[160px] flex-1 cursor-pointer"
        role="slider"
        aria-label="Story position"
        aria-valuemin={start}
        aria-valuemax={end}
        aria-valuenow={Math.round(year * 12) / 12}
        aria-valuetext={formatYear(year)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") stepForward();
          if (e.key === "ArrowLeft") stepBack();
        }}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
          // Snap the last and first percent to the ends: the end is where the
          // takeaway lives, and a click at the edge means "the end".
          setPlaybackT((f > 0.99 ? 1 : f < 0.01 ? 0 : f) * range);
        }}
      >
        <div className="absolute top-1/2 right-0 left-0 h-[2px] -translate-y-1/2 bg-rule-2" />
        <div className="absolute top-1/2 left-0 h-[4px] -translate-y-1/2 bg-ink" style={{ width: `${progress * 100}%` }} />
        <span className="absolute top-0 left-0 font-plex text-[12px] leading-none text-ink-3">{start}</span>
        <span className="absolute top-0 right-0 font-plex text-[12px] leading-none text-ink-3">{end}</span>
        {Array.from({ length: Math.max(0, range - 1) }, (_, i) => (
          <span
            key={i}
            className="absolute top-1/2 h-[6px] w-px -translate-y-1/2 bg-ink-3"
            style={{ left: `${((i + 1) / range) * 100}%` }}
          />
        ))}
        {beats.map((b) => (
          <span
            key={b.year}
            title={b.message}
            className={`absolute top-1/2 h-[10px] w-[2px] -translate-y-1/2 ${start + playbackT >= b.year ? "bg-ink" : "bg-ink-3"}`}
            style={{ left: `${((b.year - start) / range) * 100}%` }}
          />
        ))}
      </div>
      <span className="w-[72px] shrink-0 text-right font-plex text-[14px] font-semibold">{formatYear(year)}</span>
      <span className="shrink-0 text-[12px] text-ink-2" title="Planned upfront spend against the story's budget">
        {money(spentMillions)} of {money(budgetMillions)}
        {budgetExceededIds.size > 0 && <b className="ml-1 text-ink">· {budgetExceededIds.size} unfunded</b>}
      </span>
      <button type="button" className={BTN} onClick={stop} aria-label="Stop the story and restore my posture" title="Stop and restore my posture">
        ✕
      </button>
    </div>
  );
}
