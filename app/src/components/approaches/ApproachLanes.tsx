import { useId, useRef, type ReactNode } from "react";
import { useElementWidth } from "../../utils/use-element-width";
import type { ApproachPathStep, ApproachResult } from "../../engine/posture";
import { bandWord, icd203Word } from "../../engine/threat-sl";
import type { Block, BlockState, DefenseType, Stage } from "../../engine/types";
import { useSimulationStore } from "../../store/simulation";
import { useScore } from "../../store/derived";
import { useUiStore } from "../../store/ui";
import { STAGE_LABELS, approachName, blockName, vectorName } from "../../model/names";
import { bandTitle } from "../../model/words";
import { BandCells } from "../marks/Marks";
import { STATE_FILL, typeBarRects } from "../marks/geometry";

const STAGE_ORDER: Stage[] = ["entry", "reach", "exfil"];
const LANE_H = 96;
const BAND_H = 40;
const BAND_Y = 30;
const MARK_STEP = 46;

/** A counter as a mark: its type's shape in outline, filled from the bottom
 * as far as its state. */
function CounterMark({ x, y, type, state, note, id, gap }: { x: number; y: number; type: DefenseType; state: BlockState; note?: string; id: string; gap?: boolean }) {
  const clip = useId();
  const h = BAND_H + 8;
  const rects = typeBarRects(type, x, y, 8, h);
  const fill = STATE_FILL[state];
  return (
    <g>
      <title>{`${blockName(id)} (${id}) — ${state.replace("_", " ")}${note ? ` (${note})` : ""}${gap ? ": not built, would counter this step" : ""}`}</title>
      {rects.map((r, i) => (
        <rect key={i} x={r.x + 0.5} y={r.y + 0.5} width={r.width - 1} height={r.height - 1} fill="var(--paper)" stroke="var(--ink)" strokeDasharray={gap ? "2 2" : undefined} />
      ))}
      {fill > 0 && (
        <>
          <clipPath id={clip}>
            <rect x={x - 1} y={y + h * (1 - fill)} width={10} height={h * fill + 1} />
          </clipPath>
          <g clipPath={`url(#${clip})`}>
            {rects.map((r, i) => (
              <rect key={i} {...r} fill="var(--ink)" />
            ))}
          </g>
        </>
      )}
      <text x={x + 4} y={y + h + 14} textAnchor="middle" fontSize={12} className="font-plex" fill="var(--ink-2)">
        {id}
      </text>
    </g>
  );
}

function Lane({
  a,
  bar,
  blocks,
  states,
  effective,
  unfunded,
  scenarioName,
  needsGov,
  propensity,
  width,
}: {
  propensity: number;
  width: number;
  a: ApproachResult;
  bar: number;
  blocks: Map<string, Block>;
  /** What the reader set each block to. */
  states: Record<string, BlockState>;
  /** What the engine counts it as, after the budget and prerequisite caps. */
  effective: Record<string, BlockState>;
  /** Blocks past the budget line (the rest of the capped ones wait on a prerequisite). */
  unfunded: Set<string>;
  scenarioName?: string;
  needsGov: boolean;
}) {
  const LANE_W = Math.max(420, width);
  const SEG_W = (LANE_W - 18) / 3;
  const maxMarks = Math.max(1, Math.floor((SEG_W - 40) / MARK_STEP));
  const steps = new Map<Stage, ApproachPathStep>(a.path.map((s) => [s.stage, s]));
  const isAi = a.adversary === "ai";
  const band = a.active ? bandWord(a.p, bar) : null;
  // Height = share of attempts still alive. The AI insider starts at the
  // chance it tries at all.
  let h = BAND_H * (isAi ? propensity : 1);
  const shapes: ReactNode[] = [];
  STAGE_ORDER.forEach((st, i) => {
    const x0 = i * SEG_W;
    const step = steps.get(st);
    const label = (
      <text key={`t${i}`} x={x0 + 4} y={16} fontSize={13} fontWeight={step ? 600 : 400} fill={step ? "var(--ink)" : "var(--ink-3)"} style={{ fontStretch: "92%" }}>
        {step ? vectorName(step.vectorId) : isAi && st === "entry" ? "already inside" : "not needed"}
      </text>
    );
    shapes.push(label);
    if (!step || !a.active) {
      shapes.push(<rect key={`b${i}`} x={x0} y={BAND_Y + (BAND_H - h) / 2} width={SEG_W} height={h} fill="var(--signal)" opacity={a.active ? 1 : 0.15} />);
      return;
    }
    const markX = x0 + 22;
    const counters = step.counters.slice(0, maxMarks);
    const afterBase = h * step.baseP;
    const after = h * step.p;
    const cutX = markX + Math.max(1, counters.length) * MARK_STEP - 18;
    // Before the defenses: full; the attacker's own odds take it to baseP,
    // the defenses (the wash) take it to p.
    shapes.push(<rect key={`a${i}`} x={x0} y={BAND_Y + (BAND_H - h) / 2} width={cutX - x0} height={h} fill="var(--signal)" />);
    shapes.push(<rect key={`w${i}`} x={cutX} y={BAND_Y + (BAND_H - afterBase) / 2} width={x0 + SEG_W - cutX} height={afterBase} fill="var(--signal-wash)" stroke="var(--signal)" strokeWidth={0.75} strokeDasharray="2 2" />);
    shapes.push(<rect key={`p${i}`} x={cutX} y={BAND_Y + (BAND_H - after) / 2} width={x0 + SEG_W - cutX} height={after} fill="var(--signal)" />);
    counters.forEach((c, k) => {
      const b = blocks.get(c.blockId);
      // Filled as far as the engine counts it, which is what the wash shows;
      // a clicked-but-capped block says so on hover.
      const set = states[c.blockId] ?? "not_started";
      const counted = effective[c.blockId] ?? set;
      const note =
        counted === set
          ? undefined
          : `set to ${set.replace("_", " ")}, ${unfunded.has(c.blockId) ? "not funded" : "waiting on a prerequisite"}`;
      shapes.push(
        <CounterMark key={`m${i}${k}`} x={markX + k * MARK_STEP} y={BAND_Y - 4} type={b?.defense_type ?? c.type} state={counted} note={note} id={c.blockId} />
      );
    });
    if (counters.length === 0) {
      shapes.push(
        <text key={`n${i}`} x={markX} y={BAND_Y + BAND_H + 22} fontSize={12} fill="var(--signal-ink)" className="font-plex">
          nothing in the way
        </text>
      );
    }
    h = after;
  });
  return (
    <div className="grid grid-cols-[220px_minmax(0,1fr)_150px] items-center gap-5 border-b border-rule py-3" data-approach={a.id}>
      <div className="min-w-0">
        <div className="text-[20px] leading-tight font-bold">{approachName(a.id, a.name)}</div>
        <div className="mt-0.5 text-[12px] leading-snug text-ink-2">
          {!a.active ? "off — the model is not served" : isAi ? "your own model, at this year's AI" : `at OC${a.tier}`}
          {scenarioName && <span className="block">told as “{scenarioName}”</span>}
        </div>
        {needsGov && <span className="mt-1 inline-block border border-ink px-1 font-plex text-[12px]">needs government</span>}
      </div>
      <svg width={LANE_W} height={LANE_H} aria-hidden="true">
        {[1, 2].map((k) => (
          <line key={k} x1={k * SEG_W} y1={22} x2={k * SEG_W} y2={LANE_H} stroke="var(--rule)" />
        ))}
        {shapes}
        <rect x={SEG_W * 3 + 4} y={BAND_Y - 10} width={14} height={BAND_H + 20} fill="var(--ink)" />
      </svg>
      <div className="text-right" title={a.active ? bandTitle(bandWord(a.p, bar), icd203Word(a.p), "Success of this approach") : undefined}>
        {band ? (
          <>
            <div className={`text-[16px] leading-tight font-bold ${band === "usually succeeds" ? "text-signal-ink" : ""}`}>{band}</div>
            <div className="mt-1 flex justify-end">
              <BandCells band={band} size={12} />
            </div>
          </>
        ) : (
          <div className="text-[14px] text-ink-2">off</div>
        )}
      </div>
    </div>
  );
}

export function ApproachLanes() {
  const score = useScore();
  const blocks = useSimulationStore((s) => s.blocks);
  const states = useSimulationStore((s) => s.blockStates);
  const scenarios = useSimulationStore((s) => s.threatModel.scenarios);
  const vectors = useSimulationStore((s) => s.threatModel.vectors);
  const oc = useSimulationStore((s) => s.adversaryOc);
  const year = useSimulationStore((s) => s.year);
  const setFocus = useUiStore((s) => s.setFocusApproach);
  const setTab = useUiStore((s) => s.setTab);
  const propensity = useSimulationStore((s) => s.sliders.ai_propensity);
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const gov = new Set(vectors.filter((v) => v.needs_government).map((v) => v.id));
  const lanes = [...score.approaches].sort((x, y) => Number(y.active) - Number(x.active) || y.p - x.p);
  const open = lanes.filter((a) => a.active && a.p >= score.sl.bar).length;
  const laneRef = useRef<HTMLDivElement>(null);
  const laneW = useElementWidth(laneRef, 720);
  return (
    <div className="pt-4 pb-6" data-testid="approaches-view">
      <div className="flex items-baseline justify-between gap-6">
        <h2 className="text-[28px] leading-tight font-extrabold tracking-tight">
          Approaches still open: {open} of {lanes.filter((a) => a.active).length}
        </h2>
        <span className="text-[13px] text-ink-2">
          OC{oc} · {Math.round(year)} · easiest attack path per approach
        </span>
      </div>
      <p className="mt-1 max-w-[760px] text-[13px] leading-snug text-ink-2">
        Each lane is one broad way in, along the attacker's easiest path. The band's height is the share of attempts
        still alive; the marks are your defenses at each stage (shape = type, fill = state), and the dashed wash is what
        they take off.
      </p>
      <div className="mt-3 grid grid-cols-[220px_minmax(0,1fr)_150px] gap-5 border-b-2 border-ink pb-1.5">
        <span className="cap">Approach</span>
        <div ref={laneRef} className="grid min-w-0 grid-cols-3" style={{ paddingRight: 18 }}>
          {STAGE_ORDER.map((s, i) => (
            <span key={s} className="cap">
              {i + 1} {STAGE_LABELS[s]}
            </span>
          ))}
        </div>
        <span className="cap text-right">Gets through?</span>
      </div>
      {lanes.map((a) => (
        <div
          key={a.id}
          role="button"
          tabIndex={0}
          className="block w-full cursor-pointer text-left hover:bg-tint/50"
          title="Trace this approach's path in the catalogue"
          aria-label={`${approachName(a.id, a.name)}: trace its path in the catalogue`}
          onClick={() => {
            setFocus(a.id);
            setTab("catalogue");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setFocus(a.id);
              setTab("catalogue");
            }
          }}
        >
          <Lane
            a={a}
            bar={score.sl.bar}
            blocks={byId}
            states={states}
            effective={score.effectiveStates}
            unfunded={score.budgetExceededIds}
            scenarioName={scenarios.find((s) => s.approach === a.id)?.name}
            needsGov={a.path.some((s) => gov.has(s.vectorId))}
            propensity={propensity}
            width={laneW}
          />
        </div>
      ))}
    </div>
  );
}
