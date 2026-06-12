import { useMemo } from "react";
import type { Block } from "../../engine/types";
import { blockGridPosition } from "../../utils/geometry";

interface DependencyOverlayProps {
  blocks: Block[];
  focusBlock: Block | null;
  hexSize: number;
}

interface Edge {
  key: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  kind: "requires" | "enhances";
}

const REQUIRES_COLOR = "#38bdf8";
const ENHANCES_COLOR = "#2dd4bf";

function arcPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  // perpendicular offset so arcs clear hex rows
  const ox = (-dy / len) * 18;
  const oy = (dx / len) * 18;
  return `M ${from.x} ${from.y} Q ${mx + ox} ${my + oy} ${to.x} ${to.y}`;
}

/** Dependency arcs for the focused (hovered/selected) block. */
export function DependencyOverlay({ blocks, focusBlock, hexSize }: DependencyOverlayProps) {
  const edges = useMemo(() => {
    if (!focusBlock) return [];
    const blockMap = new Map(blocks.map((b) => [b.id, b]));
    const focusPos = blockGridPosition(blocks, focusBlock);
    const result: Edge[] = [];
    const seen = new Set<string>();

    // requires + enabled_by: dependency → focus (solid, arrowhead)
    const incoming = [
      ...focusBlock.dependencies.requires,
      ...focusBlock.dependencies.enabled_by,
    ];
    for (const id of incoming) {
      const dep = blockMap.get(id);
      if (!dep || seen.has(id)) continue;
      seen.add(id);
      result.push({
        key: `req-${id}`,
        from: blockGridPosition(blocks, dep),
        to: focusPos,
        kind: "requires",
      });
    }

    // enhances: focus → target (dashed, subtle)
    for (const id of focusBlock.dependencies.enhances) {
      const target = blockMap.get(id);
      if (!target) continue;
      result.push({
        key: `enh-${id}`,
        from: focusPos,
        to: blockGridPosition(blocks, target),
        kind: "enhances",
      });
    }
    return result;
  }, [blocks, focusBlock]);

  if (!focusBlock || edges.length === 0) return null;

  return (
    <g className="pointer-events-none">
      <defs>
        <marker
          id="dep-arrow"
          viewBox="0 0 8 8"
          refX={7 + hexSize / 4}
          refY={4}
          markerWidth={6}
          markerHeight={6}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 8 4 L 0 8 z" fill={REQUIRES_COLOR} />
        </marker>
      </defs>
      {edges.map((e) => (
        <path
          key={e.key}
          d={arcPath(e.from, e.to)}
          fill="none"
          stroke={e.kind === "requires" ? REQUIRES_COLOR : ENHANCES_COLOR}
          strokeWidth={e.kind === "requires" ? 1.5 : 1}
          strokeDasharray={e.kind === "enhances" ? "3 3" : undefined}
          opacity={e.kind === "requires" ? 0.85 : 0.45}
          markerEnd={e.kind === "requires" ? "url(#dep-arrow)" : undefined}
        />
      ))}
    </g>
  );
}
