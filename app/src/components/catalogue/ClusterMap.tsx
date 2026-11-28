import { useMemo } from "react";
import type { Block, BlockState } from "../../engine/types";
import { CATEGORY_NAMES, STATE_WORDS, TYPE_WORDS, blockLines, blockName, isOperational } from "../../model/names";
import { HEX_R, VIEW_H, VIEW_W, WEIGHTS, clusterLayout } from "../../model/cluster-layout";
import { useSimulationStore } from "../../store/simulation";
import { useUiStore } from "../../store/ui";
import { HexGlyph, Hourglass } from "../marks/Marks";
import { ChangeChip } from "./ChangeChip";
import { blockHandlers, useBlockActions } from "./block-actions";
import { useCatalogueModel, type DrawnPath } from "./use-catalogue";

type Pt = [number, number];

/** Text squeezed to fit a hexagon's width. Archivo semibold at 85% width runs
 * up to about 0.52 em per character; anything longer is compressed to fit. */
function FitText({ x, y, text, max, size, weight, fill, mono }: {
  x: number;
  y: number;
  text: string;
  max: number;
  size: number;
  weight?: number;
  fill: string;
  mono?: boolean;
}) {
  const est = text.length * size * (mono ? 0.6 : 0.52);
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={size}
      fontWeight={weight}
      fill={fill}
      className={mono ? "font-plex" : undefined}
      style={mono ? undefined : { fontStretch: "85%" }}
      {...(est > max ? { textLength: max, lengthAdjust: "spacingAndGlyphs" } : {})}
    >
      {text}
    </text>
  );
}

function HexBlock({
  block,
  x,
  y,
  state,
  onPath,
  choke,
  startNow,
  constrained,
  selected,
  highlighted,
  chip,
  actions,
}: {
  block: Block;
  x: number;
  y: number;
  state: BlockState;
  onPath: "lead" | "other" | null;
  choke: number;
  startNow: boolean;
  constrained: boolean;
  selected: boolean;
  highlighted: boolean;
  chip: { seq: number; text: string | null } | null;
  actions: ReturnType<typeof useBlockActions>;
}) {
  const lines = blockLines(block.id, block.name);
  const handlers = blockHandlers(block.id, actions);
  const label =
    `${blockName(block.id, block.name)}, ${block.id}${block.future ? ", future capability (R&D)" : ""}. ` +
    `${TYPE_WORDS[block.defense_type]}, ${STATE_WORDS[state].toLowerCase()}` +
    (onPath ? ", on an easiest attack path" : "") +
    (choke ? `, on ${choke} approaches' paths` : "") +
    ". Enter advances, Backspace steps back, I opens details.";
  const ys = lines.length === 2 ? [y - 9, y + 7] : [y];
  const text = (inv: boolean) => (
    <g pointerEvents="none">
      {lines.map((ln, i) => (
        <FitText key={i} x={x} y={ys[i]} text={ln} max={64} size={14} weight={650} fill={inv ? "var(--on-ink)" : "var(--ink)"} />
      ))}
      <FitText
        x={x}
        y={y + 25}
        text={block.future ? "R&D" : block.id}
        max={52}
        size={13}
        mono
        fill={inv ? "var(--on-ink-2)" : "var(--ink-2)"}
      />
    </g>
  );
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      data-block-id={block.id}
      className="sl5-hex cursor-pointer outline-none"
      {...handlers}
    >
      <title>{`${block.name} (${block.id}) — click to advance, right-click to step back, Shift-click for details`}</title>
      {onPath && (
        <path
          d={hexRing(x, y, HEX_R + 4)}
          fill="none"
          stroke="var(--signal)"
          strokeWidth={onPath === "lead" ? 2.5 : 1.5}
        />
      )}
      {(selected || highlighted) && (
        <path
          d={hexRing(x, y, HEX_R + 8)}
          fill="none"
          stroke="var(--ink)"
          strokeWidth={2}
          strokeDasharray={selected ? undefined : "4 3"}
        />
      )}
      <path className="sl5-focus" d={hexRing(x, y, HEX_R + 8)} fill="none" stroke="transparent" strokeWidth={2} />
      <HexGlyph cx={x} cy={y} r={HEX_R} type={block.defense_type} state={state} dashed={constrained}>
        {text}
      </HexGlyph>
      {startNow && <Hourglass x={x - (choke ? 9 : 0)} y={y - 28} size={11} />}
      {choke > 0 && (
        <g>
          <rect
            x={x + (startNow ? 2 : -8)}
            y={y - 36}
            width={16}
            height={16}
            fill={isOperational(state) ? "var(--ink)" : "var(--paper)"}
            stroke="var(--signal)"
            strokeWidth={1.4}
          />
          <text
            x={x + (startNow ? 10 : 0)}
            y={y - 23.5}
            textAnchor="middle"
            fontSize={13}
            fontWeight={700}
            className="font-plex"
            fill={isOperational(state) ? "var(--on-ink)" : "var(--signal-ink)"}
          >
            {choke}
          </text>
        </g>
      )}
      <g
        className="sl5-more"
        onClick={(e) => {
          e.stopPropagation();
          actions.open(block.id);
        }}
      >
        <circle cx={x + HEX_R * 0.78} cy={y - HEX_R * 0.62} r={10} fill="var(--paper)" stroke="var(--ink)" />
        <text x={x + HEX_R * 0.78} y={y - HEX_R * 0.62 + 4} textAnchor="middle" fontSize={13} fill="var(--ink)">
          ⋯
        </text>
      </g>
      {chip && <ChangeChip key={chip.seq} text={chip.text} svg={{ x, y: y - HEX_R - 6 }} />}
    </g>
  );
}

function hexRing(cx: number, cy: number, r: number) {
  const p: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    p.push(`${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${p.join(" L")} Z`;
}

/** The band for one path: through each anchored step's hexagon, from outside
 * the map into the weights, narrowing as each step's defenses cut it. */
function routeFor(p: DrawnPath, pos: Map<string, { x: number; y: number }>) {
  const pts: { at: Pt; w: number; holds: boolean }[] = [];
  let w = p.lead ? 14 : 4;
  const minW = p.lead ? 3 : 2;
  for (const a of p.anchors) {
    const at = a.anchorId ? pos.get(a.anchorId) : undefined;
    if (at) pts.push({ at: [at.x, at.y], w, holds: a.holds });
    w = Math.max(minW, w * a.pass);
  }
  if (pts.length === 0) return null;
  // Enter from outside the map, away from the weights.
  const [fx, fy] = pts[0].at;
  const dx = fx - WEIGHTS.x;
  const dy = fy - WEIGHTS.y;
  const len = Math.hypot(dx, dy) || 1;
  const start: Pt = [
    Math.min(VIEW_W - 6, Math.max(6, fx + (dx / len) * 60)),
    Math.min(VIEW_H - 6, Math.max(6, fy + (dy / len) * 60)),
  ];
  const all: Pt[] = [start, ...pts.map((q) => q.at), [WEIGHTS.x, WEIGHTS.y]];
  // Width changes per leg: legs i → i+1 carry the width after step i.
  const legs: { d: string; w: number }[] = [];
  const widths = [...pts.map((q) => q.w), w];
  for (let i = 0; i < all.length - 1; i++) {
    legs.push({ d: legPath(all, i), w: widths[i] });
  }
  const breaks = pts
    .map((q, i) => ({ q, prev: i === 0 ? start : pts[i - 1].at }))
    .filter(({ q }) => q.holds)
    .map(({ q, prev }) => {
      const vx = q.at[0] - prev[0];
      const vy = q.at[1] - prev[1];
      const l = Math.hypot(vx, vy) || 1;
      const ux = vx / l;
      const uy = vy / l;
      const c: Pt = [q.at[0] - ux * (HEX_R + 10), q.at[1] - uy * (HEX_R + 10)];
      const half = q.w / 2 + 7;
      return { x1: c[0] - uy * half, y1: c[1] + ux * half, x2: c[0] + uy * half, y2: c[1] - ux * half };
    });
  return { legs, breaks };
}

/** One leg of a Catmull-Rom spline through all points, as its own path. */
function legPath(all: Pt[], i: number): string {
  const p0 = all[i - 1] ?? all[i];
  const p1 = all[i];
  const p2 = all[i + 1];
  const p3 = all[i + 2] ?? p2;
  const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
  const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
  return `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)} C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
}

export function ClusterMap() {
  const model = useCatalogueModel();
  const actions = useBlockActions();
  const detailId = useUiStore((s) => s.detailId);
  const highlightIds = useUiStore((s) => s.highlightIds);
  const lastChange = useUiStore((s) => s.lastChange);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const layout = useMemo(() => clusterLayout(model.blocks), [model.blocks]);
  const routes = model.paths.map((p) => ({ p, r: routeFor(p, layout.pos) }));

  return (
    <div className="relative h-full w-full overflow-auto">
      {/* Scales to fit, but never below 0.92 of its size: the labels are 13–14
          units, so they never render under 12px. Smaller screens scroll. */}
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="h-full min-h-[773px] w-full min-w-[1049px]"
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Defense catalogue, clustered by category around the model weights"
      >
        {/* Paths under the hexagons: each hexagon hides the stretch inside it. */}
        {routes.map(({ p, r }) =>
          r ? (
            <g key={p.approach.id} opacity={p.lead ? 1 : 0.5} fill="none" stroke="var(--signal)">
              {r.legs.map((leg, i) => (
                <path key={i} d={leg.d} strokeWidth={leg.w} strokeLinecap="butt" />
              ))}
            </g>
          ) : null
        )}
        {/* The weights. */}
        <circle cx={WEIGHTS.x} cy={WEIGHTS.y} r={WEIGHTS.r + 24} fill="none" stroke="var(--rule)" />
        <circle cx={WEIGHTS.x} cy={WEIGHTS.y} r={WEIGHTS.r} fill="var(--ink)" />
        <text x={WEIGHTS.x} y={WEIGHTS.y - 6} textAnchor="middle" fontSize={13} fontWeight={600} letterSpacing="0.14em" className="font-plex" fill="var(--paper)">
          MODEL
        </text>
        <text x={WEIGHTS.x} y={WEIGHTS.y + 11} textAnchor="middle" fontSize={13} fontWeight={600} letterSpacing="0.14em" className="font-plex" fill="var(--paper)">
          WEIGHTS
        </text>
        {layout.clusters.map((c) => {
          const members = model.blocks.filter((b) => b.category === c.category);
          const today = members.filter((b) => !b.future);
          const inPlace = today.filter((b) => isOperational(model.score.effectiveStates[b.id])).length;
          return (
            <g key={c.category}>
              <text x={c.x0} y={c.labelY} fontSize={20} fontWeight={750} fill="var(--ink)">
                {CATEGORY_NAMES[c.category]}
                <tspan dx={10} fontSize={13} fontWeight={400} fill="var(--ink-2)">
                  {today.length} blocks · {inPlace} deployed
                  {members.length > today.length ? ` · +${members.length - today.length} R&D` : ""}
                </tspan>
              </text>
            </g>
          );
        })}
        {model.blocks.map((b) => {
          const at = layout.pos.get(b.id);
          if (!at) return null;
          const paths = model.onPath.get(b.id);
          return (
            <HexBlock
              key={b.id}
              block={b}
              x={at.x}
              y={at.y}
              state={blockStates[b.id] ?? "not_started"}
              onPath={paths ? (paths.some((q) => q.lead) ? "lead" : "other") : null}
              choke={model.choke.get(b.id) ?? 0}
              startNow={model.startNow.has(b.id)}
              constrained={model.score.budgetExceededIds.has(b.id) || model.score.dependencyUnmetIds.has(b.id)}
              selected={detailId === b.id}
              highlighted={highlightIds.includes(b.id)}
              chip={lastChange?.blockId === b.id ? { seq: lastChange.seq, text: lastChange.chip } : null}
              actions={actions}
            />
          );
        })}
        {/* Break marks where a deployed block holds, on top. */}
        {routes.map(({ p, r }) =>
          r?.breaks.map((b, i) => (
            <line key={`${p.approach.id}-b${i}`} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2} stroke="var(--ink)" strokeWidth={4} />
          ))
        )}
      </svg>
    </div>
  );
}
