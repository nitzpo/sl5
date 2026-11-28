import { useState } from "react";
import { useSimulationStore } from "../../store/simulation";
import { usePlaybackStore } from "../../timelapse/playback-store";
import { useUiStore } from "../../store/ui";
import { getAiCapability } from "../../engine/ai-curve";
import { TIMELINE_END, TIMELINE_START, TIMELINE_YEARS } from "../../utils/timeline";
import { formatYear } from "../../utils/format";
import { OC_LONG } from "../../model/names";
import { aiWord } from "../../model/words";
import { ScenariosDropdown } from "./ScenariosDropdown";
import { NAV_BTN } from "./header-button";


function YearControl() {
  const year = useSimulationStore((s) => s.year);
  const setYear = useSimulationStore((s) => s.setYear);
  const aiTimeline = useSimulationStore((s) => s.sliders.ai_timeline);
  const playing = usePlaybackStore((s) => s.state !== "idle");
  const cap = getAiCapability(year, aiTimeline);
  const whole = Math.floor(Math.round(year * 12) / 12);
  const month = formatYear(year).includes(" ") ? formatYear(year).split(" ")[0] : "";
  // The strip sits under the scrubber: one bar per year, centred under the
  // thumb's position for that year, its height the AI capability.
  const W = 150;
  const THUMB = 12;
  const H = 30;
  const BAR = 15;
  const n = TIMELINE_YEARS.length;
  const cx = (i: number) => THUMB / 2 + (i * (W - THUMB)) / (n - 1);
  return (
    <div className="flex items-end gap-4">
      <div>
        <div className="cap">Year</div>
        <div className="flex items-end gap-1" aria-label={`Year ${formatYear(year)}`}>
          <span key={whole} className={`text-[44px] leading-[0.9] font-extrabold tracking-tight ${playing ? "sl5-year" : ""}`}>
            {whole}
          </span>
          <span className="w-[28px] pb-0.5 font-plex text-[13px] font-semibold text-ink-2">{month}</span>
        </div>
      </div>
      <div style={{ width: W }}>
        <input
          type="range"
          min={TIMELINE_START}
          max={TIMELINE_END}
          step={1}
          value={Math.round(year)}
          disabled={playing}
          onChange={(e) => setYear(Number(e.target.value))}
          className="sl5-range block w-full"
          aria-label="Year"
          aria-valuetext={formatYear(year)}
        />
        <svg width={W} height={H} aria-hidden="true" className="mt-0.5 block">
          <defs>
            <pattern id="ai-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="4" height="4" fill="var(--paper)" />
              <line x1="0" y1="0" x2="0" y2="4" stroke="var(--ink)" strokeWidth="2.2" />
            </pattern>
          </defs>
          {TIMELINE_YEARS.map((y, i) => {
            const h = Math.max(2, getAiCapability(y, aiTimeline) * H);
            const x = cx(i) - BAR / 2;
            const current = y === whole;
            const past = y < whole;
            return current ? (
              <rect key={y} x={x + 0.75} y={H - h + 0.75} width={BAR - 1.5} height={h - 1.5} fill="url(#ai-hatch)" stroke="var(--ink)" strokeWidth={1.5} />
            ) : past ? (
              <rect key={y} x={x} y={H - h} width={BAR} height={h} fill="var(--mid)" />
            ) : (
              <rect key={y} x={x + 0.5} y={H - h + 0.5} width={BAR - 1} height={h - 1} fill="none" stroke="var(--mid)" />
            );
          })}
        </svg>
      </div>
      <div className="pb-0.5" title="How capable AI is this year, on the AI-timeline assumption. It lifts every attacker's effective tier.">
        <div className="cap whitespace-nowrap">AI capability</div>
        <div className="mt-0.5 text-[20px] leading-none font-bold">{aiWord(cap)}</div>
      </div>
    </div>
  );
}

function AdversaryControl() {
  const oc = useSimulationStore((s) => s.adversaryOc);
  const setOc = useSimulationStore((s) => s.setAdversaryOc);
  const sizes: Record<number, string> = { 1: "text-[16px]", 2: "text-[20px]", 3: "text-[28px]", 4: "text-[36px]", 5: "text-[44px]" };
  return (
    <div className="flex items-end gap-4">
      <div>
        <div className="cap">Adversary</div>
        <div className="flex items-end" role="radiogroup" aria-label="Adversary tier">
          <span className="mr-1.5 mb-[5px] font-plex text-[14px] font-semibold text-ink-2">OC</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className="flex items-end">
              {n === 5 && (
                <span
                  aria-hidden="true"
                  className="mx-1.5 mb-[18px] w-6 border-t-2 border-dotted border-signal-ink"
                  title="OC4 → OC5 is a different kind of attacker"
                />
              )}
              <button
                type="button"
                role="radio"
                aria-checked={oc === n}
                aria-label={`OC${n}: ${OC_LONG[n]}`}
                title={`OC${n}: ${OC_LONG[n]}`}
                onClick={() => setOc(n)}
                className={`relative px-[5px] leading-[0.9] font-extrabold ${sizes[n]} ${
                  oc === n ? "text-signal" : "text-mid hover:text-ink"
                }`}
              >
                {n}
                {oc === n && <span className="absolute right-[5px] -bottom-[5px] left-[5px] h-[3px] bg-signal" />}
              </button>
            </span>
          ))}
        </div>
      </div>
      <div className="hidden max-w-[196px] pb-0.5 min-[1560px]:block">
        <div className="text-[14px] leading-tight font-bold">{OC_LONG[oc]}</div>
        <div className="mt-0.5 text-[12px] leading-snug text-ink-2">OC4 → OC5 is a different kind of attacker, not one more step up.</div>
      </div>
    </div>
  );
}

export function Header({ onShowHelp }: { onShowHelp: () => void }) {
  const copyShareUrl = useSimulationStore((s) => s.copyShareUrl);
  const paramsOpen = useUiStore((s) => s.paramsOpen);
  const setParamsOpen = useUiStore((s) => s.setParamsOpen);
  const [copied, setCopied] = useState(false);
  const base = import.meta.env.BASE_URL;

  return (
    <header className="flex items-end gap-6 border-b-2 border-ink px-6 pt-3 pb-3">
      <div className="flex items-end gap-2">
        <span className="text-[44px] leading-[0.85] font-black tracking-tight" style={{ fontStretch: "110%" }}>
          SL5
        </span>
        <span className="pb-0.5 text-[16px] font-medium text-ink-2">Explorable</span>
      </div>
      <YearControl />
      <AdversaryControl />
      <nav className="ml-auto flex shrink-0 items-center gap-0.5 pb-0.5 whitespace-nowrap" aria-label="App">
        <ScenariosDropdown />
        <button
          type="button"
          className={NAV_BTN}
          onClick={() => {
            copyShareUrl();
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Link copied" : "Share"}
        </button>
        <button type="button" className={NAV_BTN} aria-expanded={paramsOpen} onClick={() => setParamsOpen(!paramsOpen)}>
          Parameters
        </button>
        <a className={NAV_BTN} href={`${base}intro/`} title="Why model weights are a target, and how to use this tool">
          Intro
        </a>
        <a className={NAV_BTN} href={`${base}../`} title="All versions of the explorable">
          Versions
        </a>
        <button type="button" className={`${NAV_BTN} w-8 justify-center border border-ink no-underline hover:bg-ink hover:text-paper`} aria-label="How to use" title="How to use" onClick={onShowHelp}>
          ?
        </button>
      </nav>
    </header>
  );
}
