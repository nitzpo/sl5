import { useMemo, useState } from "react";
import { icd203Word, SUCCEEDS_ABOVE } from "../../engine/threat-sl";
import { STRONG_MULTIPLIER } from "../../engine/vector-model";
import { useThreatData, type ThreatData } from "../data";
import { countersOf, SLIDERS_FAVOURABLE, stackOnVector } from "../engine-views";
import { BandMark, BlockGlyph, DataPending } from "../slides/parts";

// Slide 10: diminishing returns on one attack vector. Recruiting an insider
// (RAND's "bribes and cooperation") against an OC4 agency: every counter in
// today's catalogue is partial; the one strong counter is a future capability.
// The numbers are the engine's stacking ladder (`evaluateVector`).

const STACK_VECTOR = "V-HUM-1";
const STACK_TIER = 4;
const YEAR = 2026;
/** The strong counter is a government-cleared workforce, which only makes
 * sense with the government on side: full cooperation for every counter. */
const SLIDERS = SLIDERS_FAVOURABLE;

/** The most a single counter can take off a vector: the strong rung. */
const MAX_CUT = 1 - STRONG_MULTIPLIER;

function SuccessBar({ p, base, bar }: { p: number; base: number; bar: number }) {
  return (
    <div aria-hidden>
      <div className="relative h-[28px] border border-ink">
        <span className="absolute inset-y-0 left-0 border-r-2 border-dashed border-ink-3" style={{ width: `${base * 100}%` }} />
        <span className="absolute inset-y-[3px] left-0 bg-signal transition-[width] duration-300" style={{ width: `${p * 100}%` }} />
        <span className="absolute -inset-y-1 w-[2px] bg-ink" style={{ left: `${bar * 100}%` }} />
        <span className="absolute -inset-y-1 w-[2px] bg-ink" style={{ left: `${SUCCEEDS_ABOVE * 100}%` }} />
      </div>
      <div className="relative mt-1 h-[32px] text-[12px] leading-tight text-ink-2">
        <span className="absolute left-0" style={{ width: `${bar * 100}%` }}>
          usually fails
        </span>
        <span className="absolute text-center" style={{ left: `${bar * 100}%`, width: `${(SUCCEEDS_ABOVE - bar) * 100}%` }}>
          contested
        </span>
        <span className="absolute right-0 text-right" style={{ width: `${(1 - SUCCEEDS_ABOVE) * 100}%` }}>
          usually succeeds
        </span>
      </div>
    </div>
  );
}

function Demo({ data }: { data: ThreatData }) {
  // Today's partial counters first, then the strong one, which is R&D.
  const counters = useMemo(
    () => [...countersOf(data, STACK_VECTOR)].sort((a, b) => Number(!!a.block.future) - Number(!!b.block.future)),
    [data]
  );
  const [on, setOn] = useState<string[]>([]);
  const r = useMemo(() => stackOnVector(data, STACK_VECTOR, STACK_TIER, on, YEAR, SLIDERS), [data, on]);
  const applied = new Map(r.withCounters.applied.map((a) => [a.blockId, a]));
  const toggle = (id: string) => setOn((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  const partialsOn = on.filter((id) => counters.find((c) => c.block.id === id)?.strength === "partial").length;
  const strongOn = on.some((id) => counters.find((c) => c.block.id === id)?.strength === "strong");

  const summary =
    on.length === 0
      ? `No counters: against an unprepared lab, this step ${r.baseBand}.`
      : strongOn && partialsOn === 0
        ? `One strong counter alone: ${r.band}.`
        : strongOn
          ? `The strong counter with ${partialsOn} partial: ${r.band}.`
          : `${partialsOn} partial counter${partialsOn === 1 ? "" : "s"}: still ${r.band}.`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
      <div>
        <p className="cap">Attack vector · get in · OC{STACK_TIER}, {YEAR}</p>
        <p className="mt-1.5 text-[20px] leading-snug font-semibold text-ink">
          {r.vector.name}
          <span className="mono ml-2 text-[12px] font-normal text-ink-2">{r.vector.id}</span>
        </p>
        <p className="mt-1 text-[14px] leading-[1.5] text-ink-2">{r.vector.description}</p>
        <div className="mt-5">
          <p className="mb-2 flex items-center justify-between gap-3">
            <span className="text-[14px] text-ink">How often this step works</span>
            <BandMark band={r.band} detail={icd203Word(r.withCounters.p)} />
          </p>
          <SuccessBar p={r.withCounters.p} base={r.base.p} bar={SLIDERS.sl_bar} />
          <p
            className="mt-2 text-[16px] leading-snug font-semibold text-ink"
            role="status"
            aria-live="polite"
          >
            {summary}
          </p>
          <p className="mt-1 text-[14px] text-ink-2">
            Dashed line: an unprepared lab. Red: with the counters you switched on.
          </p>
        </div>
      </div>

      <div>
        <p className="cap">Counters in the catalogue</p>
        <ul className="mt-2">
          {counters.map((c) => {
            const isOn = on.includes(c.block.id);
            const a = applied.get(c.block.id);
            const cut = a ? 1 - a.multiplier : 0;
            return (
              <li key={c.block.id} className="border-t border-rule">
                <button
                  type="button"
                  aria-pressed={isOn}
                  onClick={() => toggle(c.block.id)}
                  className={`grid w-full grid-cols-[10px_1fr_auto] items-center gap-x-3 px-1 py-2 text-left ${
                    isOn ? "bg-tint" : "hover:bg-tint"
                  }`}
                >
                  <BlockGlyph type={c.block.defense_type} state={isOn ? "mature" : "not_started"} w={8} h={28} />
                  <span className="min-w-0">
                    <span className="block text-[14px] leading-tight font-semibold text-ink">{c.block.name}</span>
                    <span className="mono block text-[12px] text-ink-2">
                      {c.block.id} · {c.strength}
                      {c.block.future ? " · future capability (R&D)" : ""}
                    </span>
                  </span>
                  <span className="w-[96px] text-right">
                    {isOn ? (
                      a && a.rung !== null ? (
                        <span className="inline-flex flex-col items-end gap-1">
                          <span aria-hidden className="relative block h-[8px] w-[84px] border border-ink">
                            <span className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${(cut / MAX_CUT) * 100}%` }} />
                          </span>
                          <span className="text-[12px] text-ink-2">{cut / MAX_CUT > 0.3 ? "a big cut" : cut / MAX_CUT > 0.08 ? "a smaller cut" : "a little"}</span>
                        </span>
                      ) : (
                        <span className="text-[12px] font-semibold text-ink-2">adds nothing</span>
                      )
                    ) : (
                      <span className="text-[12px] text-ink-2">off</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[12px] text-ink-2">Bars: how much each switched-on counter takes off this step.</p>
      </div>
    </div>
  );
}

export function StackingDemo() {
  const state = useThreatData();
  if (state.status !== "ready") return <DataPending error={state.status === "error" ? state.error : undefined} />;
  return <Demo data={state.data} />;
}
