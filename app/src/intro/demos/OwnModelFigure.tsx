import { useMemo } from "react";
import { OWN_MODEL_STEPS } from "../content";
import { useThreatData } from "../data";
import { scoreScene, STAGE_LABEL } from "../engine-views";
import { BandMark, DataPending } from "../slides/parts";

// Slide 5: your own model starts inside. Top: where its attack path begins,
// against an outside attacker's. Bottom: the engine's verdict on it, by year,
// for today's typical lab and for every defense in the catalogue.

const YEARS = [2026, 2028, 2030];

function StageCell({ stage, children, inside = false }: { stage: string; children: React.ReactNode; inside?: boolean }) {
  return (
    <div className={`min-h-[64px] border-t-2 pt-2 ${inside ? "border-dashed border-ink-3" : "border-ink"}`}>
      <p className="cap">{stage}</p>
      <div className="mt-1.5 text-[14px] leading-[1.45] text-ink">{children}</div>
    </div>
  );
}

function Verdicts() {
  const state = useThreatData();
  const rows = useMemo(() => {
    if (state.status !== "ready") return null;
    return (["typical-lab", "every-defense"] as const).map((posture) => ({
      posture,
      label: posture === "typical-lab" ? "Today's typical lab" : "Every defense, mature",
      years: YEARS.map((year) => {
        const s = scoreScene(state.data, { posture, year });
        return { year, band: s.aiInsider.band, detail: s.aiInsider.detail, ac: s.aiInsider.acBand };
      }),
    }));
  }, [state]);

  if (state.status !== "ready" || !rows) return <DataPending error={state.status === "error" ? state.error : undefined} />;

  return (
    <table className="w-full table-fixed border-collapse text-left" aria-label="Does your own model usually get its weights out? By year and posture.">
      <thead>
        <tr>
          {rows[0].years.map((y) => (
            <th key={y.year} scope="col" className="pr-2 pb-2 align-bottom">
              <span className="mono block text-[14px] font-semibold text-ink">{y.year}</span>
              <span className="mt-1 flex flex-wrap items-center gap-x-1.5" title={`AI capability band ${y.ac.toFixed(1)} of 5`}>
                <span aria-hidden className="relative inline-block h-[8px] w-[48px] border border-ink">
                  <span className="hatch-ink absolute inset-y-0 left-0" style={{ width: `${((y.ac - 1) / 4) * 100}%` }} />
                </span>
                <span className="text-[12px] font-normal text-ink-2">its capability</span>
              </span>
            </th>
          ))}
        </tr>
      </thead>
      {rows.map((r) => (
        <tbody key={r.posture}>
          <tr className="border-t border-rule">
            <th scope="colgroup" colSpan={3} className="pt-2.5 text-[14px] font-semibold text-ink">
              {r.label}
            </th>
          </tr>
          <tr>
            {r.years.map((y) => (
              <td key={y.year} className="pt-1.5 pr-2 pb-3 align-top">
                <BandMark band={y.band} detail={y.detail} stack />
              </td>
            ))}
          </tr>
        </tbody>
      ))}
    </table>
  );
}

export function OwnModelFigure() {
  return (
    <div>
      <div
        role="group"
        aria-label="An outside attacker has to get in, reach the weights, and get them out. Your own model is already inside, so its attack path starts at reaching the weights."
      >
        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-[10rem_1fr_1fr_1fr]">
          <p className="text-[14px] font-semibold text-ink-2 sm:pt-2">An outside attacker</p>
          <StageCell stage={STAGE_LABEL.entry}>Has to get in first</StageCell>
          <StageCell stage={STAGE_LABEL.reach}>Then find the weights</StageCell>
          <StageCell stage={STAGE_LABEL.exfil}>Then carry them out</StageCell>
        </div>
        <div className="mt-6 grid gap-x-4 gap-y-3 sm:grid-cols-[10rem_1fr_1fr_1fr]">
          <p className="text-[14px] font-semibold text-signal-ink sm:pt-2">Your own model</p>
          <StageCell stage={STAGE_LABEL.entry} inside>
            <span className="text-ink-2">Already inside: it runs on your compute, with credentials and tools.</span>
          </StageCell>
          <StageCell stage={STAGE_LABEL.reach}>
            <ul className="space-y-1">
              {OWN_MODEL_STEPS.reach.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </StageCell>
          <StageCell stage={STAGE_LABEL.exfil}>
            <ul className="space-y-1">
              {OWN_MODEL_STEPS.exfil.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </StageCell>
        </div>
      </div>
      <div className="mt-8 max-w-[44rem]">
        <Verdicts />
      </div>
    </div>
  );
}
