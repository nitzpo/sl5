import { useEffect, useState } from "react";

/**
 * The feedback a click leaves at the block: a ripple, and — when the click
 * moved a band word or the level — a short chip ("OC3 −1 band"). Gone after
 * a moment; under reduced motion it simply appears and disappears.
 */
export function ChangeChip({ text, svg }: { text: string | null; svg?: { x: number; y: number } }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1700);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  if (svg) {
    return (
      <g pointerEvents="none">
        {text && (
          <foreignObject x={svg.x - 70} y={svg.y - 30} width={140} height={22}>
            <div className="sl5-chip flex justify-center">
              <span className="bg-ink px-1.5 py-[3px] font-plex text-[12px] leading-none whitespace-nowrap text-on-ink">
                {text}
              </span>
            </div>
          </foreignObject>
        )}
      </g>
    );
  }
  return (
    <>
      <span aria-hidden="true" className="sl5-ripple pointer-events-none absolute -inset-[3px] border-2 border-ink" />
      {text && (
        <span
          role="status"
          className="sl5-chip pointer-events-none absolute -top-[22px] right-0 z-30 bg-ink px-1.5 py-[3px] font-plex text-[12px] leading-none whitespace-nowrap text-on-ink"
        >
          {text}
        </span>
      )}
    </>
  );
}
