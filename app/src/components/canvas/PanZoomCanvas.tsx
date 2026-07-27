import { useLayoutEffect } from "react";
import type { PanZoomState } from "../../utils/use-viewbox-pan-zoom";

/**
 * Shared map-style canvas: an <svg> with NO viewBox and a single transform <g>
 * that wheel-zoom and drag-to-pan move. Each view drops its content inside as
 * children — in world coordinates — and gets identical pan/zoom behavior free.
 *
 * The missing viewBox is the design, not an oversight. A viewBox maps user units
 * onto the element box, so any change to the element's size rescales the whole
 * scene — a zoom the transform knows nothing about, which is why opening a panel
 * shrank the map while the readout still claimed 100%. Without one, SVG user
 * units are CSS pixels by definition: the mapping is fixed by layout, cannot go
 * stale, and the transform is the only thing that ever moves.
 *
 * Sizing a viewBox from React state does NOT work as a substitute — state trails
 * the DOM by a render, so on the frame a panel opens the element is already
 * narrow while the viewBox still describes the wide one. That mismatch is
 * visible when shrinking and invisible when growing.
 *
 * The view's world bounds still matter (they define the baseline "100%" fit), so
 * they go to the hook via `setWorldBounds` rather than onto the element.
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
  children: React.ReactNode;
}

export function PanZoomCanvas({
  state,
  viewBox,
  onBackgroundClick,
  className,
  children,
}: PanZoomCanvasProps) {
  const { minX, minY, width, height } = viewBox;
  const {
    ref,
    transform,
    dragging,
    onPointerDown,
    consumeClickAfterDrag,
    setWorldBounds,
    ready,
  } = state;

  // Tell the hook what this view's world bounds are, so it can compute the
  // baseline "100%" fit. A LAYOUT effect, so the bounds are registered before
  // the browser paints: with a passive effect the first frame renders with no
  // bounds, no fit, and the content jammed into the corner.
  //
  // Deliberately no cleanup: clearing the bounds on unmount would blank the
  // fit during a view switch, and the incoming view sets its own bounds in the
  // same commit anyway.
  useLayoutEffect(() => {
    setWorldBounds({ minX, minY, width, height });
  }, [setWorldBounds, minX, minY, width, height]);

  // Wheel zoom is handled by a native non-passive listener inside the hook (a
  // React onWheel is passive and can't preventDefault). A pan drag ends in a
  // trailing synthetic click, so swallow that one click instead of clearing.
  const handleClick = () => {
    if (consumeClickAfterDrag()) return;
    onBackgroundClick?.();
  };

  return (
    <svg
      ref={ref}
      // NO viewBox. A viewBox is a mapping from user units to the element box,
      // and the only size we could put in it comes from React state — which is
      // always one render behind the DOM. On the frame a panel opens, the
      // element is already narrow while the viewBox still describes the wide
      // one, so the browser scales the whole scene down to fit: the flicker,
      // and the reason it only appeared when SHRINKING.
      //
      // Without a viewBox, SVG user units are CSS px by definition. That is the
      // same 1:1 mapping the viewBox was there to create, except it is enforced
      // by the layout itself and cannot go stale. All positioning now lives in
      // the transform below, which is the only thing that should ever move.
      className={`select-none block touch-none w-full h-full ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      } ${className ?? ""}`}
      onPointerDown={onPointerDown}
      onClick={handleClick}
    >
      {/* Hidden (not unmounted) until the fit is known: keeping the subtree
          mounted lets views measure themselves, while `visibility` costs one
          invisible frame instead of a visible jump. */}
      <g transform={transform} visibility={ready ? undefined : "hidden"}>
        {children}
      </g>
    </svg>
  );
}
