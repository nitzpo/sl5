import type { ReactNode } from "react";
import { TypeBar } from "../marks/Marks";

function Item({ glyph, label }: { glyph: ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      {glyph}
      <span>{label}</span>
    </span>
  );
}

function StateSwatch({ fill, mature }: { fill: number; mature?: boolean }) {
  return (
    <span className="relative inline-block h-[14px] w-[14px] border border-ink-2 bg-paper" aria-hidden="true">
      <span className="absolute inset-x-0 bottom-0 bg-ink" style={{ height: `${fill * 100}%` }} />
      {mature && <span className="absolute inset-[2px] border border-on-ink-2" />}
    </span>
  );
}

/** Shapes, fills and marks, explained once. */
export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-2" aria-label="Legend">
      <Item glyph={<TypeBar type="hard_stop" width={5} height={14} />} label="Hard stop" />
      <Item glyph={<TypeBar type="probabilistic" width={5} height={14} />} label="Probabilistic" />
      <Item glyph={<TypeBar type="hybrid" width={5} height={14} />} label="Hybrid" />
      <span className="flex items-center gap-1 whitespace-nowrap" title="Not started, investing, implementing, deployed, mature">
        <StateSwatch fill={0} />
        <StateSwatch fill={0.18} />
        <StateSwatch fill={0.36} />
        <StateSwatch fill={1} />
        <StateSwatch fill={1} mature />
        <span className="ml-0.5">not started → mature</span>
      </span>
      <Item glyph={<span className="inline-block h-[8px] w-[22px] bg-signal" aria-hidden="true" />} label="Easiest attack path" />
      <Item
        glyph={
          <svg width={18} height={14} aria-hidden="true">
            <rect x={0} y={4} width={18} height={6} fill="var(--signal)" />
            <path d="M5 13 L9 1" stroke="var(--paper)" strokeWidth={5} />
            <path d="M4 13 L8 1 M9 13 L13 1" stroke="var(--ink)" strokeWidth={2} />
          </svg>
        }
        label="Held by a deployed block"
      />
      <Item
        glyph={
          <span className="flex h-[16px] w-[16px] items-center justify-center border border-signal font-plex text-[12px] font-semibold text-signal-ink" aria-hidden="true">
            3
          </span>
        }
        label="Choke point"
      />
      <Item
        glyph={<span className="h-0 w-0 border-t-[10px] border-l-[10px] border-t-ink border-l-transparent" aria-hidden="true" />}
        label="Start now"
      />
      <Item glyph={<span className="inline-block h-[14px] w-[18px] border border-dashed border-ink-2" aria-hidden="true" />} label="Not funded / waiting" />
    </div>
  );
}
