import { BUILD_COST_MILLIONS, OC_TIERS } from "../content";
import { money } from "../format";

// Slide 1: what the asset costs to build against what the largest attackers
// can spend to take it, on one log axis from $1M to $10B.

const MIN_LOG = 0; // $1M
const MAX_LOG = 4; // $10B
const at = (millions: number) =>
  ((Math.log10(millions) - MIN_LOG) / (MAX_LOG - MIN_LOG)) * 100;
const TICKS = [1, 10, 100, 1000, 10000];

const oc4 = OC_TIERS.find((t) => t.level === 4)!;
const oc5 = OC_TIERS.find((t) => t.level === 5)!;

interface Row {
  key: string;
  label: string;
  who: string;
  value: string;
  to: number;
  rangeFrom?: number;
  adversary: boolean;
}

const ROWS: Row[] = [
  {
    key: "build",
    label: "Build it",
    who: "Years of research and a frontier training run",
    value: `${money(BUILD_COST_MILLIONS.min)}–${money(BUILD_COST_MILLIONS.max)}+`,
    rangeFrom: at(BUILD_COST_MILLIONS.min),
    to: at(BUILD_COST_MILLIONS.max),
    adversary: false,
  },
  {
    key: "oc5",
    label: "Take it · OC5",
    who: "A top-priority state operation, five years",
    value: `about ${money(oc5.budgetMillions)}`,
    to: at(oc5.budgetMillions),
    adversary: true,
  },
  {
    key: "oc4",
    label: "Take it · OC4",
    who: "A leading state cyber agency, one year",
    value: `about ${money(oc4.budgetMillions)}`,
    to: at(oc4.budgetMillions),
    adversary: true,
  },
];

export function CostFigure() {
  return (
    <div
      role="img"
      aria-label={`Log-scale bars. Building a frontier model: ${ROWS[0].value}. A five-year top-priority state operation (OC5) spends ${ROWS[1].value}. A one-year operation by a leading state cyber agency (OC4) spends ${ROWS[2].value}.`}
    >
      <div className="space-y-4">
        {ROWS.map((r) => (
          <div key={r.key} className="grid gap-x-6 gap-y-1.5 sm:grid-cols-[13rem_1fr] sm:items-center">
            <div>
              <p className={`text-[16px] font-semibold ${r.adversary ? "text-signal-ink" : "text-ink"}`}>{r.label}</p>
              <p className="text-[14px] leading-snug text-ink-2">{r.who}</p>
              <p className={`mono mt-0.5 text-[14px] font-semibold ${r.adversary ? "text-signal-ink" : "text-ink"}`}>
                {r.value}
              </p>
            </div>
            <div className="relative h-[28px]">
              {r.rangeFrom !== undefined ? (
                <>
                  <span className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${r.rangeFrom}%` }} />
                  <span
                    className="hatch-ink absolute inset-y-0 border border-ink"
                    style={{ left: `${r.rangeFrom}%`, width: `${r.to - r.rangeFrom}%` }}
                  />
                </>
              ) : (
                <span className="absolute inset-y-0 left-0 bg-signal" style={{ width: `${r.to}%` }} />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 grid sm:grid-cols-[13rem_1fr] sm:gap-x-6">
        <span className="hidden sm:block" />
        <div className="relative h-[20px] border-t border-ink">
          {TICKS.map((t) => (
            <span
              key={t}
              className="mono absolute top-1 text-[12px] text-ink-2"
              style={{
                left: `${at(t)}%`,
                transform: t === TICKS[0] ? "none" : t === TICKS[TICKS.length - 1] ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {money(t)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
