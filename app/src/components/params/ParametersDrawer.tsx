import { useEffect, type ReactNode } from "react";
import { SL_BAR_PRESETS } from "../../engine/threat-sl";
import type { Sliders } from "../../engine/types";
import { useSimulationStore } from "../../store/simulation";
import { useBudgetStatus } from "../../store/derived";
import { useUiStore } from "../../store/ui";
import { OC_LONG } from "../../model/names";
import { BAR_PRESET_WORDS, money, presetFor, propensityWord, sliderWord, type BarPreset } from "../../model/words";
import { SCORING_MODES, SCORING_MODE_WORDS, type ScoringMode } from "../../model/scoring-mode";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 border-t border-ink pt-2.5 first:mt-0">
      <h3 className="cap mb-2">{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Range({
  label,
  hint,
  value,
  min = 0,
  max = 1,
  step = 0.05,
  low,
  high,
  word,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  low: string;
  high: string;
  word: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-semibold">{label}</span>
        <span className="text-[13px] font-semibold">{word}</span>
      </span>
      {hint && <span className="block text-[12px] leading-snug text-ink-2">{hint}</span>}
      <input
        type="range"
        className="sl5-range mt-1 w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={word}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="flex justify-between text-[12px] text-ink-2">
        <span>{low}</span>
        <span>{high}</span>
      </span>
    </label>
  );
}

function Toggle({ label, hint, on, onChange, onText, offText }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void; onText: string; offText: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold">{label}</div>
        <div className="text-[12px] leading-snug text-ink-2">{hint}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`shrink-0 border border-ink px-2.5 py-1 text-[13px] font-semibold ${on ? "bg-ink text-paper" : "text-ink"}`}
      >
        {on ? onText : offText}
      </button>
    </div>
  );
}

const MODE_NOTES: Record<ScoringMode, string> = {
  paths:
    "The level is the highest attacker tier your posture usually stops, along each attacker's easiest path. Control coverage stays on the rail as programme completeness.",
  coverage:
    "The level is 0.3 × your weakest category plus 0.7 × the average, as in v1. It ignores which attackers your controls stop, so a posture with an approach wide open can still score high.",
};

/** The scoring method: attack paths (default) or v1-style control coverage.
 * Locked while a story plays, which is always told in attack-path terms. */
function ScoringModeChoice() {
  const mode = useSimulationStore((s) => s.scoringMode);
  const setMode = useSimulationStore((s) => s.setScoringMode);
  const playing = useSimulationStore((s) => s.playbackActive);
  return (
    <Group title="How to score your security level">
      <div className="flex flex-col gap-[3px]" role="radiogroup" aria-label="How to score your security level">
        {SCORING_MODES.map((m) => {
          const on = mode === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={playing}
              onClick={() => setMode(m)}
              className={`border px-2.5 py-1.5 text-left disabled:cursor-not-allowed ${
                on ? "border-ink bg-ink text-paper" : "border-rule-2 enabled:hover:border-ink"
              } ${playing && !on ? "opacity-50" : ""}`}
            >
              <span className="block text-[14px] font-bold">{SCORING_MODE_WORDS[m].label}</span>
              <span className={`block text-[12px] leading-snug ${on ? "text-on-ink-2" : "text-ink-2"}`}>
                {SCORING_MODE_WORDS[m].hint}
              </span>
            </button>
          );
        })}
      </div>
      <p className="-mt-1 text-[12px] leading-snug text-ink-2">
        {playing
          ? "Stories are scored by attack paths, so their captions hold. Your choice comes back when the story stops."
          : MODE_NOTES[mode]}
      </p>
    </Group>
  );
}

export function ParametersDrawer() {
  const open = useUiStore((s) => s.paramsOpen);
  const setOpen = useUiStore((s) => s.setParamsOpen);
  const sliders = useSimulationStore((s) => s.sliders);
  const setSlider = useSimulationStore((s) => s.setSlider);
  const served = useSimulationStore((s) => s.modelServedExternally);
  const setServed = useSimulationStore((s) => s.setModelServed);
  const oc = useSimulationStore((s) => s.adversaryOc);
  const setOc = useSimulationStore((s) => s.setAdversaryOc);
  const reset = useSimulationStore((s) => s.resetToBaseline);
  const playing = useSimulationStore((s) => s.playbackActive);
  const mode = useSimulationStore((s) => s.scoringMode);
  const { spentMillions } = useBudgetStatus();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  if (!open) return null;
  const set = (k: keyof Sliders) => (v: number) => setSlider(k, v);
  const preset = presetFor(sliders.sl_bar);

  return (
    <aside
      className="absolute top-0 right-0 bottom-0 z-40 flex w-[460px] flex-col border-l-2 border-ink bg-paper"
      aria-label="Parameters"
      data-testid="parameters-drawer"
    >
      <div className="flex items-start justify-between border-b border-ink px-6 pt-4 pb-3">
        <div>
          <div className="cap">Advanced</div>
          <h2 className="text-[28px] leading-tight font-extrabold tracking-tight">Parameters</h2>
          <p className="text-[13px] text-ink-2">The world your defenses are planned for.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close parameters"
          className="flex h-8 w-8 items-center justify-center border border-ink text-[16px] hover:bg-ink hover:text-paper"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-8">
        {playing && <p className="mb-3 border border-ink p-2 text-[13px]">A story is playing in its own world. Changes here last only until it stops, when your own settings come back.</p>}

        <ScoringModeChoice />

        <Group title="How strict is “stops”">
          <p className="-mt-1 text-[13px] leading-snug text-ink-2">
            A posture stops an attacker tier when fewer than this share of that attacker's campaigns succeed. Stricter
            never raises the level.
            {mode === "coverage" && " Used by attack-path scoring only; control coverage ignores it."}
          </p>
          <div className="grid grid-cols-3 gap-[3px]" role="radiogroup" aria-label="How strict is stops">
            {(Object.keys(SL_BAR_PRESETS) as BarPreset[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={preset === k}
                onClick={() => setSlider("sl_bar", SL_BAR_PRESETS[k])}
                className={`border px-2 py-1.5 text-left ${preset === k ? "border-ink bg-ink text-paper" : "border-rule-2 hover:border-ink"}`}
              >
                <span className="block text-[14px] font-bold">{BAR_PRESET_WORDS[k].label}</span>
                <span className={`block text-[12px] ${preset === k ? "text-on-ink-2" : "text-ink-2"}`}>{BAR_PRESET_WORDS[k].ratio}</span>
              </button>
            ))}
          </div>
        </Group>

        <Group title="The adversary">
          <div className="grid grid-cols-5 gap-[3px]" role="radiogroup" aria-label="Adversary tier">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={oc === n}
                onClick={() => setOc(n)}
                title={OC_LONG[n]}
                className={`border py-1.5 font-plex text-[14px] font-semibold ${oc === n ? "border-signal bg-signal text-paper" : "border-rule-2 hover:border-ink"}`}
              >
                OC{n}
              </button>
            ))}
          </div>
          <p className="-mt-1 text-[13px] text-ink-2">{OC_LONG[oc]}. The SL is computed over every tier; this picks whose paths the catalogue traces.</p>
        </Group>

        <Group title="The model">
          <Toggle
            label="Model served externally"
            hint="An API others can query: adds the served-model approach and the distillation meter."
            on={served}
            onChange={setServed}
            onText="Served"
            offText="Not served"
          />
          <Range
            label="AI propensity"
            hint="How likely a misaligned model is to try to get out at all."
            value={sliders.ai_propensity}
            low="Never tries"
            high="Always tries"
            word={propensityWord(sliders.ai_propensity)}
            onChange={set("ai_propensity")}
          />
        </Group>

        <Group title="The world">
          <Range
            label="AI timeline"
            hint="How fast AI capability arrives; it lifts every attacker's effective tier."
            value={sliders.ai_timeline}
            low="Slower"
            high="Faster"
            word={sliderWord(sliders.ai_timeline, "Slower", "Faster")}
            onChange={set("ai_timeline")}
          />
          <Range
            label="Government partnership"
            hint="Clearances, counter-intelligence and classified facilities; relieves what no lab can stop alone."
            value={sliders.gov_cooperation}
            low="None"
            high="Full partnership"
            word={sliderWord(sliders.gov_cooperation, "None", "Full")}
            onChange={set("gov_cooperation")}
          />
          <Range
            label="Vendor cooperation"
            hint="Chip and hardware vendors building security into their roadmaps."
            value={sliders.vendor_cooperation}
            low="Market-driven"
            high="Security-first"
            word={sliderWord(sliders.vendor_cooperation, "Low", "High")}
            onChange={set("vendor_cooperation")}
          />
          <Range
            label="Organisational will"
            hint="How far the lab will change how it works to be secure."
            value={sliders.org_transformation}
            low="Reluctant"
            high="Committed"
            word={sliderWord(sliders.org_transformation, "Reluctant", "Committed")}
            onChange={set("org_transformation")}
          />
          <Range
            label="Security budget"
            hint={`Funded in the order you advanced blocks. Planned: ${money(spentMillions)}.`}
            value={sliders.budget_millions}
            min={50}
            max={3000}
            step={50}
            low="$50M"
            high="$3B"
            word={money(sliders.budget_millions)}
            onChange={set("budget_millions")}
          />
          <Range
            label="Planning cost basis"
            hint="Plan for the top of each cost range, or for the bottom."
            value={sliders.risk_tolerance}
            low="Conservative"
            high="Optimistic"
            word={sliderWord(sliders.risk_tolerance, "Conservative", "Optimistic")}
            onChange={set("risk_tolerance")}
          />
        </Group>

        <section className="mt-6 border-t border-ink pt-3">
          <button type="button" onClick={reset} className="border border-ink px-3 py-1.5 text-[13px] font-semibold hover:bg-ink hover:text-paper">
            Reset to today's real-world posture
          </button>
        </section>
      </div>
    </aside>
  );
}
