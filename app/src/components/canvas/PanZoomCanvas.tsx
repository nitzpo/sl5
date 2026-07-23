import type { PanZoomState } from "../../utils/use-viewbox-pan-zoom";

/**
 * Shared map-style canvas: an <svg> whose viewBox is the view's own world
 * bounds (so content auto-fits on load, as it always did), with a single
 * transform <g> that wheel-zoom and drag-to-pan move. Each view drops its
 * content inside as children — in world coordinates — and gets identical
 * pan/zoom behavior for free.
 *
 * The pan/zoom `state` is owned by the parent (App) so the external zoom-control
 * buttons can drive the same instance; the view mode is its reset key, so
 * switching views re-centers.
 */

interface PanZoomCanvasProps {
  state: PanZoomState;
  /** viewBox: [minX, minY, width, height] in world coordinates. */
  viewBox: { minX: number; minY: number; width: number; height: number };
  /** Fired when empty canvas is clicked (clear selection). */
  onBackgroundClick?: () => void;
  className?: string;
  maxHeight?: string;
  children: React.ReactNode;
}

export function PanZoomCanvas({
  state,
  viewBox,
  onBackgroundClick,
  className,
  maxHeight = "calc(100vh - 200px)",
  children,
}: PanZoomCanvasProps) {
  const { minX, minY, width, height } = viewBox;
  const { ref, transform, dragging, onPointerDown, onWheel } = state;

  return (
    <svg
      ref={ref}
      viewBox={`${minX} ${minY} ${width} ${height}`}
      className={`select-none block touch-none ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      } ${className ?? ""}`}
      style={{ width: "100%", maxHeight }}
      onPointerDown={onPointerDown}
      onWheel={onWheel}
      onClick={onBackgroundClick}
    >
      <g transform={transform}>{children}</g>
    </svg>
  );
}
