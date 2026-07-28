import type { BlockState } from "../../engine/types";
import { hexPoints } from "../../utils/geometry";
import {
  DEFENSE_COLORS,
  STATE_FILL_FRACTION,
  SEMANTIC,
  DEPENDENCY_COLOR,
} from "../../utils/colors";
import type { DemoBlock } from "../content";

// A teaching replica of components/blocks/BlockCell.tsx — that component is the
// source of truth for the visual encoding; this one repeats it because the real
// hex is wired to useSimulationStore/useViewStore and the intro page ships no
// store. It reuses the same geometry and colour constants, so hue, fill
// fractions and border weights can't drift; only the markup is duplicated.
// If the real encoding changes, change it here too.

const BG_FILL = "#1a1d24";

const BORDER_WIDTH: Record<BlockState, number> = {
  not_started: 1,
  investing: 1.5,
  implementing: 1.5,
  deployed: 2,
  mature: 2.5,
};

interface DemoHexProps {
  block: DemoBlock;
  state: BlockState;
  /** 0–1 erosion, from the real `aiDegradation()`. Hard stops pass 0. */
  degradation?: number;
  size?: number;
  /** Pink dashed ring — planned cost didn't fit the budget. */
  budgetExceeded?: boolean;
  /** Sky dotted ring — a `requires` prerequisite isn't operational. */
  dependencyUnmet?: boolean;
  onClick?: () => void;
}

export function DemoHex({
  block,
  state,
  degradation = 0,
  size = 34,
  budgetExceeded = false,
  dependencyUnmet = false,
  onClick,
}: DemoHexProps) {
  const color = DEFENSE_COLORS[block.defenseType];
  const fillFraction = STATE_FILL_FRACTION[state];

  // Local viewBox so the hex can sit inline at any size; padding leaves room
  // for the outer rings and the label below.
  const pad = 8;
  const w = size * 2 + pad * 2;
  const h = size * 2 + pad * 2 + 14;
  const cx = w / 2;
  const cy = size + pad;

  const points = hexPoints(cx, cy, size);
  const fillTop = cy + size - fillFraction * size * 2;
  const uid = `${block.id}-${state}-${Math.round(degradation * 100)}`;
  const clipId = `demo-clip-${uid}`;
  const erosionClipId = `demo-erosion-${uid}`;

  const showErosion = degradation > 0.02 && fillFraction > 0 && block.defenseType !== "hard_stop";
  const erosionHeight = degradation * size * 2 * fillFraction;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      // shrink-0: the svg carries width/height attributes, but a flex parent
      // would still squash it — these hexes sit beside paragraphs.
      className={`shrink-0 select-none ${
        onClick
          ? "cursor-pointer rounded outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
          : ""
      }`}
      onClick={onClick}
      // Right-click advances too, because that's the gesture the app itself
      // uses — the demo should teach the real muscle memory.
      onContextMenu={
        onClick
          ? (e) => {
              e.preventDefault();
              onClick();
            }
          : undefined
      }
      role={onClick ? "button" : "img"}
      aria-label={`${block.id} ${block.name}`}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={cx - size} y={fillTop} width={size * 2} height={size * 2} />
        </clipPath>
        {showErosion && (
          <clipPath id={erosionClipId}>
            <rect x={cx - size} y={fillTop} width={size * 2} height={erosionHeight} />
          </clipPath>
        )}
      </defs>

      <polygon points={points} fill={BG_FILL} />

      {fillFraction > 0 && (
        <polygon points={points} fill={color} opacity={0.6} clipPath={`url(#${clipId})`} />
      )}

      {showErosion && (
        <polygon
          points={points}
          fill="#dc2626"
          opacity={0.35}
          clipPath={`url(#${erosionClipId})`}
        />
      )}

      <polygon
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={BORDER_WIDTH[state]}
        opacity={state === "not_started" ? 0.5 : 1}
      />

      {state === "mature" && (
        <polygon
          points={hexPoints(cx, cy, size + 3)}
          fill="none"
          stroke={color}
          strokeWidth={1}
          opacity={0.5}
        />
      )}

      {budgetExceeded && (
        <polygon
          points={hexPoints(cx, cy, size + 3)}
          fill="none"
          stroke={SEMANTIC.overBudget}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.8}
        />
      )}

      {dependencyUnmet && (
        <polygon
          points={hexPoints(cx, cy, size + 3)}
          fill="none"
          stroke={DEPENDENCY_COLOR}
          strokeWidth={1.5}
          strokeDasharray="2 3"
          opacity={0.85}
        />
      )}

      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fontWeight={600}
        fill="#e5e7eb"
        className="pointer-events-none"
      >
        {block.id}
      </text>

      <text
        x={cx}
        y={cy + size + 12}
        textAnchor="middle"
        fontSize={10}
        fill="#9ca3af"
        className="pointer-events-none"
      >
        {block.shortLabel}
      </text>
    </svg>
  );
}
