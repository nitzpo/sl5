import { useState } from "react";
import { useSimulationStore } from "../../store/simulation";
import { usePlaybackStore } from "../../timelapse/playback-store";
import { ScenariosDropdown } from "./ScenariosDropdown";
import { HEADER_BTN } from "./header-button";
import { TIMELINE_START, TIMELINE_END } from "../../utils/timeline";
import { formatYear } from "../../utils/format";

interface HeaderProps {
  onShowIntro: () => void;
}

export function Header({ onShowIntro }: HeaderProps) {
  const year = useSimulationStore((s) => s.year);
  const setYear = useSimulationStore((s) => s.setYear);
  const scenarioName = useSimulationStore((s) => s.scenarioName);
  const resetToBaseline = useSimulationStore((s) => s.resetToBaseline);
  const copyShareUrl = useSimulationStore((s) => s.copyShareUrl);
  const playbackActive = usePlaybackStore((s) => s.state !== "idle");
  const [copied, setCopied] = useState(false);

  return (
    <header className="flex items-center gap-4 px-4 py-2 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <h1 className="text-sm font-bold text-gray-200 whitespace-nowrap">
        SL5 Explorable
      </h1>

      {/* Year slider — deliberately whole years. Picking a year by hand is its
          own feature ("what does 2027 look like"), independent of any story;
          only playback moves the clock at a finer grain. */}
      <div className="flex items-center gap-2 ml-4">
        <span className="text-xs text-gray-500">Year</span>
        <input
          type="range"
          min={TIMELINE_START}
          max={TIMELINE_END}
          step={1}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="w-28 accent-violet-500"
          disabled={playbackActive}
        />
        <span className="text-xs font-mono text-gray-300 w-16">{formatYear(year)}</span>
      </div>

      {scenarioName && (
        <span className="text-xs text-violet-400 truncate max-w-[150px]">{scenarioName}</span>
      )}

      <div className="ml-auto flex items-center gap-1.5">
      {/* Scenarios */}
      <ScenariosDropdown />

      {/* Share */}
      <button
        onClick={() => {
          copyShareUrl();
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className={HEADER_BTN}
      >
        {copied ? "✓ Copied" : "Share"}
      </button>

      {/* Reset */}
      <button onClick={resetToBaseline} className={HEADER_BTN}>
        Reset
      </button>

      {/* Introduction — the standalone explainer at /sl5/intro/. A plain link,
          not a modal: it's its own page so it can be shared and deep-linked. */}
      <a
        href={`${import.meta.env.BASE_URL}intro/`}
        className={HEADER_BTN}
        title="Why model weight security matters, and how to use this tool"
      >
        Intro
      </a>

      {/* Help */}
      <button
        onClick={onShowIntro}
        className={`${HEADER_BTN} w-7 justify-center`}
        title="How to use"
        aria-label="How to use"
      >
        ?
      </button>
      </div>
    </header>
  );
}
