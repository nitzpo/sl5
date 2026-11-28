import { useId, type ReactNode } from "react";
import type { BandWord } from "../../engine/threat-sl";
import type { BlockState, DefenseType } from "../../engine/types";
import { bandIndex } from "../../model/words";
import { STATE_FILL, hexPath, hexRun, typeBarRects } from "./geometry";

/** The type bar as SVG rects, for use inside a larger SVG. */
export function TypeBarG({
  type,
  x,
  y,
  w,
  h,
  fill = "var(--ink)",
}: {
  type: DefenseType;
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
}) {
  return (
    <g>
      {typeBarRects(type, x, y, w, h).map((r, i) => (
        <rect key={i} {...r} fill={fill} />
      ))}
    </g>
  );
}

/** A standalone type bar (inline in HTML). */
export function TypeBar({
  type,
  width = 6,
  height = 18,
  className,
  fill,
}: {
  type: DefenseType;
  width?: number;
  height?: number;
  className?: string;
  fill?: string;
}) {
  return (
    <svg width={width} height={height} className={className} aria-hidden="true" focusable="false">
      <TypeBarG type={type} x={0} y={0} w={width} h={height} fill={fill} />
    </svg>
  );
}

/**
 * A hexagon whose edge is the defense type and whose fill rises with the
 * state. `children` render twice — in ink over the paper, and in paper over
 * the fill — so a label stays legible wherever the fill line crosses it.
 */
export function HexGlyph({
  cx,
  cy,
  r,
  type,
  state,
  stroke = 2,
  children,
  dashed = false,
}: {
  cx: number;
  cy: number;
  r: number;
  type: DefenseType;
  state: BlockState | null;
  stroke?: number;
  children?: (inverted: boolean) => ReactNode;
  /** Unfunded or waiting on a prerequisite: a dashed outer ring. */
  dashed?: boolean;
}) {
  const clip = useId();
  const fill = state ? STATE_FILL[state] : 0;
  const inset = Math.max(2.6, r * 0.1);
  const top = cy + r - fill * 2 * r;
  const n = Math.max(6, Math.round((r * 6) / (stroke * 2.4)));
  const dot = {
    stroke: "var(--ink)",
    strokeWidth: stroke * 1.2,
    strokeLinecap: "round" as const,
    strokeDasharray: `0 ${((r * 6) / n).toFixed(3)}`,
    fill: "none",
  };
  const solid = { stroke: "var(--ink)", strokeWidth: stroke, fill: "none", strokeLinejoin: "miter" as const };
  return (
    <g>
      <path d={hexPath(cx, cy, r)} fill="var(--paper)" />
      {type === "hard_stop" && <path d={hexPath(cx, cy, r)} {...solid} />}
      {type === "probabilistic" && <path d={hexPath(cx, cy, r)} {...dot} />}
      {type === "hybrid" && (
        <>
          <path d={hexRun(cx, cy, r, 3, 6)} {...solid} strokeLinecap="square" />
          <path d={hexRun(cx, cy, r, 0, 3)} {...dot} />
        </>
      )}
      {dashed && (
        <path
          d={hexPath(cx, cy, r + 4)}
          fill="none"
          stroke="var(--ink-2)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      )}
      {children?.(false)}
      {fill > 0 && (
        <>
          <clipPath id={clip}>
            <rect x={cx - r} y={top} width={2 * r} height={cy + r - top} />
          </clipPath>
          <g clipPath={`url(#${clip})`}>
            <path d={hexPath(cx, cy, r - inset)} fill="var(--ink)" />
            {state === "mature" && (
              <path
                d={hexPath(cx, cy, r - inset - Math.max(2.5, r * 0.09))}
                fill="none"
                stroke="var(--paper)"
                strokeWidth={Math.max(1, r * 0.03)}
              />
            )}
            {children?.(true)}
          </g>
        </>
      )}
    </g>
  );
}

/**
 * The three-cell band mark: the cell lit is the band. Usually fails = an ink
 * cell, contested = split ink/red, usually succeeds = signal red.
 */
export function BandCells({ band, size = 14 }: { band: BandWord; size?: number }) {
  const v = bandIndex(band);
  const w = size * 1.35;
  const gap = 3;
  return (
    <svg width={w * 3 + gap * 2} height={size} aria-hidden="true" focusable="false" className="shrink-0">
      {[0, 1, 2].map((j) => {
        const x = j * (w + gap);
        if (j !== v)
          return <rect key={j} x={x + 0.5} y={0.5} width={w - 1} height={size - 1} fill="none" stroke="var(--rule-2)" />;
        if (v === 0) return <rect key={j} x={x} y={0} width={w} height={size} fill="var(--ink)" />;
        if (v === 2) return <rect key={j} x={x} y={0} width={w} height={size} fill="var(--signal)" />;
        return (
          <g key={j}>
            <path d={`M${x} 0 h${w} L${x} ${size} Z`} fill="var(--ink)" />
            <path d={`M${x + w} 0 v${size} H${x} Z`} fill="var(--signal)" />
          </g>
        );
      })}
    </svg>
  );
}

/** SL progress toward the next level: five ticks, filled to the progress. */
export function ProgressTicks({ progress, size = 10, count = 5 }: { progress: number; size?: number; count?: number }) {
  const filled = Math.round(progress * count);
  const w = size * 1.6;
  const gap = 3;
  return (
    <svg width={count * w + (count - 1) * gap} height={size} aria-hidden="true" focusable="false">
      {Array.from({ length: count }, (_, i) =>
        i < filled ? (
          <rect key={i} x={i * (w + gap)} y={0} width={w} height={size} fill="var(--ink)" />
        ) : (
          <rect key={i} x={i * (w + gap) + 0.5} y={0.5} width={w - 1} height={size - 1} fill="none" stroke="var(--ink-3)" />
        )
      )}
    </svg>
  );
}

/** "Start now" corner mark: an hourglass. */
export function Hourglass({ x, y, size = 10 }: { x: number; y: number; size?: number }) {
  const h = size;
  const w = size * 0.75;
  return (
    <path
      d={`M${x - w / 2} ${y - h / 2} h${w} l${-w * 0.4} ${h / 2} l${w * 0.4} ${h / 2} h${-w} l${w * 0.4} ${-h / 2} z`}
      fill="var(--ink)"
    />
  );
}
