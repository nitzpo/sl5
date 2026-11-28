import { useMemo, useState } from "react";
import { SL_LEVELS } from "../content";
import { useThreatData } from "../data";
import { scoreScene, stopsInWords } from "../engine-views";

// Slide 4: what each security level stops. SL-n stops OC1..OC-n; SL5 also
// holds your own model. The marker is the engine's verdict on today's typical
// lab (the instrument's starting posture) in 2026.

const TIERS = [1, 2, 3, 4, 5];

function Cell({ stopped, label }: { stopped: boolean; label: string }) {
  return (
    <span
      title={label}
      className={`block h-[26px] border sm:h-[30px] ${stopped ? "border-ink bg-ink" : "hatch-signal border-signal"}`}
    >
      <span className="sr-only">{stopped ? "stops" : "beyond"}</span>
    </span>
  );
}

export function SlMatrixFigure() {
  const [selected, setSelected] = useState(3);
  const state = useThreatData();
  const typical = useMemo(() => {
    if (state.status !== "ready") return null;
    const s = scoreScene(state.data, { posture: "typical-lab" });
    return { level: s.sl.level, marginal: s.sl.marginal };
  }, [state]);
  const sl = SL_LEVELS.find((l) => l.level === selected)!;
  const beyond = TIERS.filter((t) => t > selected);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
      <div>
        <table className="w-full table-fixed border-collapse" aria-label="Which attacker tiers each security level stops">
          <colgroup>
            <col className="w-[56px] sm:w-[72px]" />
            {TIERS.map((t) => (
              <col key={t} />
            ))}
            <col className="w-[64px] sm:w-[92px]" />
          </colgroup>
          <thead>
            <tr>
              <th />
              {TIERS.map((t) => (
                <th key={t} scope="col" className="mono pb-2 text-center text-[12px] font-semibold text-ink">
                  OC{t}
                </th>
              ))}
              <th scope="col" className="mono pb-2 pl-2 text-left text-[12px] leading-tight font-semibold text-ink">
                Own model
              </th>
            </tr>
          </thead>
          <tbody>
            {[...SL_LEVELS].reverse().map((l) => {
              const on = l.level === selected;
              return (
                <tr key={l.level} className={on ? "outline-2 outline-offset-[-1px] outline-ink" : ""}>
                  <th scope="row" className="p-0 text-left">
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-label={`SL${l.level}: stops ${stopsInWords(l.level)}${l.level === 5 ? " and your own model" : ""}`}
                      onClick={() => setSelected(l.level)}
                      className={`display flex w-full items-center gap-1 py-1 pl-1 text-left text-[20px] sm:text-[28px] ${on ? "text-ink" : "text-ink-3 hover:text-ink"}`}
                    >
                      SL{l.level}
                      {typical && typical.level === l.level && (
                        <span aria-hidden className="text-[12px] text-ink">
                          ◀
                        </span>
                      )}
                    </button>
                  </th>
                  {TIERS.map((t) => (
                    <td key={t} className="px-[2px] py-[3px]">
                      <Cell
                        stopped={t <= l.level}
                        label={`SL${l.level} ${t <= l.level ? "stops" : "does not stop"} OC${t}`}
                      />
                    </td>
                  ))}
                  <td className="py-[3px] pr-0 pl-2">
                    {l.level === 5 && <Cell stopped label="SL5 also holds your own model" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-ink-2">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="inline-block h-[14px] w-[22px] border border-ink bg-ink" />
            usually fails against you
          </span>
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="hatch-signal inline-block h-[14px] w-[22px] border border-signal" />
            beyond this level
          </span>
          {typical && (
            <span className="inline-flex items-center gap-2 text-ink">
              <span aria-hidden className="text-[12px]">◀</span>
              where a typical lab starts in 2026 (SL{typical.level}
              {typical.marginal ? ", marginal" : ""})
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-ink pt-3" aria-live="polite">
        <p className="cap">
          SL{sl.level} · {sl.name}
        </p>
        <p className="mt-2 text-[20px] leading-snug font-semibold text-ink">
          {stopsInWords(sl.level)} usually fail{sl.level === 1 ? "s" : ""} against you
          {sl.level === 5 ? ", and so does your own model." : "."}
        </p>
        <p className="mt-2 text-[14px] leading-[1.55] text-ink-2">
          {beyond.length > 0
            ? `${beyond.map((t) => `OC${t}`).join(" and ")} ${beyond.length === 1 ? "is" : "are"} beyond it: they may well get through.`
            : "Nothing on RAND's scale is beyond it."}
        </p>
        <p className="mt-4 text-[14px] leading-[1.55] text-ink">
          <span className="cap mr-2">Looks like</span>
          {sl.description}.
        </p>
        {!sl.achievable && (
          <p className="mt-3 text-[14px] leading-[1.55] font-semibold text-signal-ink">
            RAND: not currently achievable.
          </p>
        )}
        {typical && (
          <p className="mt-4 border-t border-rule pt-3 text-[14px] leading-[1.55] text-ink-2">
            The instrument starts a typical frontier lab, in 2026, at{" "}
            <strong className="font-semibold text-ink">
              SL{typical.level}
              {typical.marginal ? ", marginal" : ""}
            </strong>
            .
          </p>
        )}
      </div>
    </div>
  );
}
