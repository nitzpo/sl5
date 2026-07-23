import { useMemo } from "react";
import type { Block } from "../../engine/types";
import { useViewStore } from "../../store/view";
import { DEPENDENCY_COLOR, ENHANCES_DASH } from "../../utils/colors";

/** Position lookup for a block, in whatever view is hosting the overlay. */
export type PosFn = (block: Block) => { x: number; y: number };

interface DependencyOverlayProps {
  blocks: Block[];
  focusBlock: Block | null;
  hexSize: number;
  /** Absolute position of a block in the current view's coordinate space. */
  pos: PosFn;
}

interface Edge {
  key: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  kind: "requires" | "enhances";
  /** True when this edge belongs to the focused (hovered/selected) block. */
  focused: boolean;
}

// One hue for the dependency system; the relationship kind is carried by line
// style (solid+arrow = requires, dashed = enhances), not by a second color.

function arcPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  // perpendicular offset so arcs bow away from a straight line between blocks
  const ox = (-dy / len) * 18;
  const oy = (dx / len) * 18;
  return `M ${from.x} ${from.y} Q ${mx + ox} ${my + oy} ${to.x} ${to.y}`;
}

/**
 * Dependency arcs. By default only the focused (hovered/selected) block's edges
 * are drawn. With the `allRelations` toggle on, every block's edges are drawn
 * dimmed and the focused block's edges are brightened — the whole web at once.
 */
export function DependencyOverlay({ blocks, focusBlock, hexSize, pos }: DependencyOverlayProps) {
  const showRequires = useViewStore((s) => s.badges.requires);
  const showEnhances = useViewStore((s) => s.badges.enhances);
  const showAll = useViewStore((s) => s.badges.allRelations);

  const edges = useMemo(() => {
    const blockMap = new Map(blocks.map((b) => [b.id, b]));
    // Sources whose edges we draw: every block in all-relations mode, else just
    // the focused one.
    const sources = showAll ? blocks : focusBlock ? [focusBlock] : [];
    if (sources.length === 0) return [];

    const focusId = focusBlock?.id ?? null;
    const result: Edge[] = [];
    const seen = new Set<string>();

    for (const src of sources) {
      const srcPos = pos(src);
      const focused = src.id === focusId;

      if (showRequires) {
        const incoming = [
          ...(src.dependencies?.requires ?? []),
          ...(src.dependencies?.enabled_by ?? []),
        ];
        for (const id of incoming) {
          const dep = blockMap.get(id);
          if (!dep) continue;
          // Dedup an undirected pair; keep the focused variant if seen twice.
          const key = `req-${id}-${src.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          result.push({ key, from: pos(dep), to: srcPos, kind: "requires", focused });
        }
      }

      if (showEnhances) {
        for (const id of src.dependencies?.enhances ?? []) {
          const target = blockMap.get(id);
          if (!target) continue;
          const key = `enh-${src.id}-${id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          result.push({ key, from: srcPos, to: pos(target), kind: "enhances", focused });
        }
      }
    }

    // In all-relations mode, draw focused edges last so they sit on top.
    if (showAll && focusId) {
      result.sort((a, b) => Number(a.focused) - Number(b.focused));
    }
    return result;
  }, [blocks, focusBlock, showRequires, showEnhances, showAll, pos]);

  if (edges.length === 0) return null;

  // When showing the whole web, non-focused edges are dimmed; a focused block
  // (if any) brightens its own. When not showing all, everything is a focus edge.
  const dimmed = (e: Edge) => showAll && focusBlock != null && !e.focused;

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
          <path d="M 0 0 L 8 4 L 0 8 z" fill={DEPENDENCY_COLOR} />
        </marker>
      </defs>
      {edges.map((e) => {
        const base = e.kind === "requires" ? 0.85 : 0.45;
        // Web-at-rest edges are faint; the focused block's edges stay full.
        const opacity = dimmed(e) ? base * 0.28 : showAll && !e.focused ? base * 0.5 : base;
        return (
          <path
            key={e.key}
            d={arcPath(e.from, e.to)}
            fill="none"
            stroke={DEPENDENCY_COLOR}
            strokeWidth={e.kind === "requires" ? 1.5 : 1}
            strokeDasharray={e.kind === "enhances" ? ENHANCES_DASH : undefined}
            opacity={opacity}
            markerEnd={e.kind === "requires" && !dimmed(e) ? "url(#dep-arrow)" : undefined}
          />
        );
      })}
    </g>
  );
}
