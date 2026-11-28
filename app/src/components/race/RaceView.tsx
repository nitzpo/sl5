import { useDeferredValue, useMemo } from "react";
import { scorePosture } from "../../engine/posture";
import type { Block, BlockState } from "../../engine/types";
import { useSimulationStore } from "../../store/simulation";
import { usePostureInput } from "../../store/derived";
import { SCRIPTS } from "../../timelapse/scripts";
import { computeScriptBlockStates } from "../../timelapse/compute-script-state";
import { LONG_LEAD_MONTHS, RACE_YEARS, maxAiShift, slOverYears, threatFrontYear } from "../../model/race";
import { leadTime } from "../../model/words";
import { NO_DEADLINE_MONTHS } from "../../utils/decision-windows";
import { OC_LONG, blockName, isOperational } from "../../model/names";
import { TypeBarG } from "../marks/Marks";
import { formatYear } from "../../utils/format";
import { TIMELINE_END, TIMELINE_START } from "../../utils/timeline";

const W = 1060;
const LABEL_W = 250;
const AXIS_END = 2034;
const ROW = 22;

/** What the race's lines read from the posture input: everything but the year. */
const RACE_INPUTS = [
  "blocks",
  "model",
  "blockStates",
  "advanceOrder",
  "sliders",
  "adversaryOc",
  "modelServedExternally",
  "futureCapabilities",
] as const;

/**
 * The SL strip's lines. ~65 `scorePosture` runs (13 years × your posture and
 * four stories, ~80 ms), so they read a deferred copy of the inputs and are
 * memoised on the fields they use: never the year (every sample sets its own),
 * which is what changes on every playback frame and every scrub of the year
 * control. The story lines read your world but not your blocks, so a click
 * redraws only your line.
 */
function useRaceData() {
  const input = usePostureInput();
  const deferred = useDeferredValue(input);
  const { blocks, model, blockStates, advanceOrder, sliders, adversaryOc, modelServedExternally, futureCapabilities } = deferred;
  const mine = useMemo(
    () => slOverYears({ blocks, model, blockStates, advanceOrder, sliders, adversaryOc, modelServedExternally, futureCapabilities }),
    [blocks, model, blockStates, advanceOrder, sliders, adversaryOc, modelServedExternally, futureCapabilities]
  );
  const stories = useMemo(
    () =>
      SCRIPTS.filter((s) => s.type === "scripted").map((script) => {
        const order = [
          ...Object.keys(script.initialBlockStates ?? {}).filter((id) => script.initialBlockStates?.[id] !== "not_started"),
          ...(script.deployments ?? []).map((d) => d.blockId),
        ].filter((id, i, arr) => arr.indexOf(id) === i);
        // Each story's plan in YOUR world, so the lines compare like with like
        // as you change the bar, the AI pace or serving. (Played, a story pins
        // those, as its captions state fixed outcomes; see `storyWorld`.)
        const storySliders = { ...sliders, ...script.sliderOverrides };
        return {
          id: script.id,
          name: script.name,
          samples: RACE_YEARS.map((year) => ({
            year,
            value: scorePosture({
              blocks,
              model,
              adversaryOc,
              futureCapabilities,
              year,
              sliders: storySliders,
              modelServedExternally,
              advanceOrder: order,
              blockStates: computeScriptBlockStates(script, year, blocks),
            }).sl.value,
          })),
        };
      }),
    [blocks, model, sliders, adversaryOc, modelServedExternally, futureCapabilities]
  );
  // Behind only if a field the lines read is: a year change alone is not.
  const stale = RACE_INPUTS.some((k) => deferred[k] !== input[k]);
  return { mine, stories, stale };
}

function LeadBar({ block, x0, x1, xMax, y, landsLate, mayLandLate }: { block: Block; x0: number; x1: number; xMax: number; y: number; landsLate: boolean; mayLandLate: boolean }) {
  const h = 10;
  const rects =
    block.defense_type === "hard_stop"
      ? [{ x: x0, w: x1 - x0 }]
      : Array.from({ length: Math.max(1, Math.floor((x1 - x0) / 6)) }, (_, k) => ({ x: x0 + k * 6, w: 4 }));
  return (
    <g>
      {block.defense_type === "hybrid" ? (
        <>
          <rect x={x0} y={y} width={x1 - x0} height={h / 2} fill="var(--ink)" />
          {Array.from({ length: Math.max(1, Math.floor((x1 - x0) / 6)) }, (_, k) => (
            <rect key={k} x={x0 + k * 6} y={y + h / 2 + 1} width={4} height={h / 2 - 1} fill="var(--ink)" />
          ))}
        </>
      ) : (
        rects.map((r, k) => <rect key={k} x={r.x} y={y} width={Math.max(1, Math.min(r.w, x1 - r.x))} height={h} fill="var(--ink)" />)
      )}
      {xMax > x1 && <rect x={x1 + 0.5} y={y + 0.5} width={xMax - x1 - 1} height={h - 1} fill="none" stroke="var(--ink)" />}
      {(landsLate || mayLandLate) && (
        <text
          x={xMax + 150 > W ? xMax - 6 : xMax + 6}
          y={y + 9}
          fontSize={12}
          fill={landsLate ? "var(--signal-ink)" : "var(--ink-2)"}
          fontWeight={landsLate ? 600 : 400}
          textAnchor={xMax + 150 > W ? "end" : "start"}
        >
          {landsLate ? "lands after the front" : "may land after the front"}
        </text>
      )}
    </g>
  );
}

export function RaceView() {
  const blocks = useSimulationStore((s) => s.blocks);
  const states = useSimulationStore((s) => s.blockStates);
  const year = useSimulationStore((s) => s.year);
  const oc = useSimulationStore((s) => s.adversaryOc);
  const aiTimeline = useSimulationStore((s) => s.sliders.ai_timeline);
  const vectors = useSimulationStore((s) => s.threatModel.vectors);
  const futureOn = useSimulationStore((s) => s.futureCapabilities);
  const { mine, stories, stale } = useRaceData();

  const front = useMemo(() => threatFrontYear(aiTimeline, maxAiShift(vectors)), [aiTimeline, vectors]);
  const start = Math.round(year * 12) / 12;
  const axis0 = Math.min(Math.floor(start), TIMELINE_START + 2);
  const x = (y: number) => LABEL_W + ((y - axis0) / (AXIS_END - axis0)) * (W - LABEL_W - 120);

  const longLead = blocks
    .filter((b) => (futureOn || !b.future) && !isOperational(states[b.id] as BlockState))
    .filter((b) => (states[b.id] ?? "not_started") !== "implementing")
    .filter((b) => b.dimensions.time_to_deploy_months.max >= LONG_LEAD_MONTHS)
    .sort((a, b) => b.dimensions.time_to_deploy_months.max - a.dimensions.time_to_deploy_months.max)
    .slice(0, 14);
  const late = longLead.filter((b) => {
    const { min } = b.dimensions.time_to_deploy_months;
    return front !== null && start + min / 12 > front + 1e-6;
  });
  const maybe = longLead.filter((b) => {
    const { max } = b.dimensions.time_to_deploy_months;
    return front !== null && !late.includes(b) && start + Math.min(max, NO_DEADLINE_MONTHS) / 12 > front + 1e-6;
  });
  const chartH = 34 + longLead.length * ROW + 24;
  const frontX = front !== null ? Math.max(x(axis0), Math.min(x(AXIS_END), x(front))) : null;

  // SL strip.
  const S_W = W;
  const S_H = 150;
  const sx = (y: number) => LABEL_W + ((y - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * (S_W - LABEL_W - 120);
  const sy = (v: number) => 12 + (1 - v / 5) * (S_H - 36);
  const minePts = mine.map((s) => `${sx(s.year).toFixed(1)},${sy(s.value).toFixed(1)}`).join(" ");
  // Story labels at the right edge, nudged apart so none overlap (14 units).
  const labelY = (() => {
    const order = stories.map((st, i) => ({ i, y: sy(st.samples[st.samples.length - 1].value) + 4 })).sort((a, b) => a.y - b.y);
    for (let k = 1; k < order.length; k++) order[k].y = Math.max(order[k].y, order[k - 1].y + 14);
    const out: number[] = [];
    for (const o of order) out[o.i] = o.y;
    return out;
  })();

  return (
    <div className="pt-4 pb-6" data-testid="race-view">
      <div className="flex items-baseline justify-between gap-6">
        <h2 className="text-[28px] leading-tight font-extrabold tracking-tight">The race</h2>
        <span className="text-[13px] text-ink-2">
          Threat front: OC{oc} + AI = OC{Math.min(5, oc + 1)} on code, credential and ML-stack attacks
          {front !== null ? ` from ${formatYear(Math.round(front * 12) / 12)}` : ", not before 2036 on this AI timeline"}
        </span>
      </div>
      <p className="mt-1 max-w-[780px] text-[13px] leading-snug text-ink-2">
        Long-lead defenses you have not started, as bars from today to operational (solid to the fastest estimate,
        outline to the slowest; shape = type). The front is when AI lifts {OC_LONG[oc].toLowerCase()} far enough on the
        most AI-sensitive attack vectors to count as the next tier up.
      </p>
      {(late.length > 0 || maybe.length > 0) && (
        <p className="mt-2 text-[16px] font-bold">
          {late.length > 0 && (
            <span className="text-signal-ink">
              {late.length === longLead.length ? `All ${late.length}` : `${late.length} of ${longLead.length}`} land after the front.{" "}
            </span>
          )}
          {maybe.length > 0 && (
            <span>
              {maybe.length} more {maybe.length === 1 ? "lands" : "land"} after it if {maybe.length === 1 ? "it runs" : "they run"} long.
            </span>
          )}
        </p>
      )}
      {late.length === 0 && maybe.length === 0 && longLead.length > 0 && (
        <p className="mt-2 text-[16px] font-bold">Started now, every one of them lands before the front.</p>
      )}

      <svg viewBox={`0 0 ${W} ${chartH}`} className="mt-3 w-full" role="img" aria-label="Long-lead defenses against the threat front">
        {frontX !== null && <rect x={frontX} y={22} width={x(AXIS_END) - frontX} height={chartH - 46} fill="var(--signal-wash)" />}
        {Array.from({ length: AXIS_END - axis0 + 1 }, (_, i) => axis0 + i).map((y) => (
          <g key={y}>
            <line x1={x(y)} y1={22} x2={x(y)} y2={chartH - 24} stroke="var(--rule)" />
            <text x={x(y)} y={chartH - 8} textAnchor="middle" fontSize={12} className="font-plex" fill={y === Math.floor(start) ? "var(--ink)" : "var(--ink-3)"} fontWeight={y === Math.floor(start) ? 600 : 400}>
              {y}
            </text>
          </g>
        ))}
        <line x1={x(start)} y1={6} x2={x(start)} y2={chartH - 24} stroke="var(--ink)" strokeWidth={1.5} />
        <text x={x(start) - 5} y={16} textAnchor="end" fontSize={12} fontWeight={600} className="font-plex" fill="var(--ink)">
          start now
        </text>
        {frontX !== null && (
          <>
            <line x1={frontX} y1={6} x2={frontX} y2={chartH - 24} stroke="var(--signal)" strokeWidth={2.5} />
            <text x={frontX + 5} y={16} fontSize={12} fontWeight={700} className="font-plex" fill="var(--signal-ink)">
              threat front
            </text>
          </>
        )}
        {longLead.map((b, i) => {
          const y = 34 + i * ROW;
          const { min, max } = b.dimensions.time_to_deploy_months;
          const openEnded = max >= NO_DEADLINE_MONTHS;
          const x0 = x(start);
          const x1 = x(Math.min(AXIS_END, start + min / 12));
          const xMax = openEnded ? x(AXIS_END) : x(Math.min(AXIS_END, start + max / 12));
          const landsLate = front !== null && start + min / 12 > front + 1e-6;
          const mayLandLate = !landsLate && front !== null && (openEnded || start + max / 12 > front + 1e-6);
          return (
            <g key={b.id}>
              <title>{`${b.name} (${b.id}) — ${leadTime(min, max)}`}</title>
              <TypeBarG type={b.defense_type} x={0} y={y - 1} w={5} h={14} />
              <text x={12} y={y + 10} fontSize={12} className="font-plex" fill="var(--ink-2)">
                {b.id}
              </text>
              <text x={70} y={y + 10} fontSize={13} fontWeight={600} fill="var(--ink)" style={{ fontStretch: "92%" }}>
                {blockName(b.id, b.name)}
                {(states[b.id] ?? "not_started") === "investing" ? " · under way" : ""}
              </text>
              <LeadBar block={b} x0={x0} x1={x1} xMax={xMax} y={y + 1} landsLate={landsLate} mayLandLate={mayLandLate} />
            </g>
          );
        })}
      </svg>

      <div className="mt-6 flex items-baseline justify-between border-t border-ink pt-2.5">
        <h3 className="cap">Your posture over time, held as it is</h3>
        <span className="text-[12px] text-ink-2">{stale ? "updating…" : "thin lines: the 1-minute stories"}</span>
      </div>
      <svg viewBox={`0 0 ${S_W} ${S_H}`} className="mt-2 w-full" role="img" aria-label="Security level over the years for the current posture">
        {[1, 2, 3, 4, 5].map((lv) => (
          <g key={lv}>
            <line x1={LABEL_W} y1={sy(lv)} x2={S_W - 120} y2={sy(lv)} stroke="var(--rule)" />
            <text x={LABEL_W - 8} y={sy(lv) + 4} textAnchor="end" fontSize={12} className="font-plex" fill="var(--ink-2)">
              SL{lv}
            </text>
          </g>
        ))}
        {Array.from({ length: TIMELINE_END - TIMELINE_START + 1 }, (_, i) => TIMELINE_START + i).map((y) => (
          <text key={y} x={sx(y)} y={S_H - 6} textAnchor="middle" fontSize={12} className="font-plex" fill="var(--ink-3)">
            {y}
          </text>
        ))}
        {stories.map((st, i) => (
          <g key={st.id}>
            <polyline points={st.samples.map((s) => `${sx(s.year).toFixed(1)},${sy(s.value).toFixed(1)}`).join(" ")} fill="none" stroke="var(--ink-3)" strokeWidth={1} strokeDasharray="3 3" />
            <text x={sx(TIMELINE_END) + 8} y={labelY[i]} fontSize={12} fill="var(--ink-2)">
              {st.name}
            </text>
          </g>
        ))}
        <polyline points={minePts} fill="none" stroke="var(--ink)" strokeWidth={3} strokeLinejoin="round" />
        {mine.map((s) => (
          <circle key={s.year} cx={sx(s.year)} cy={sy(s.value)} r={2.5} fill="var(--ink)">
            <title>{`${formatYear(s.year)}: SL${s.level}${s.marginal ? " (marginal)" : ""} — ${s.value.toFixed(2)}`}</title>
          </circle>
        ))}
        <line x1={sx(start)} y1={8} x2={sx(start)} y2={S_H - 22} stroke="var(--ink)" strokeDasharray="2 3" />
        <text x={12} y={sy(2.5)} fontSize={13} fontWeight={700} fill="var(--ink)">
          Your posture
        </text>
      </svg>
    </div>
  );
}
