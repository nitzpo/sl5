// The introduction's building blocks, in the instrument's Swiss system: rules
// and space instead of cards, hierarchy from scale and weight, mono small caps
// for labels, one signal red for the adversary.

import { useId, useState, type ReactNode } from "react";
import type { BandWord } from "../../engine/threat-sl";
import type { BlockState, DefenseType } from "../../engine/types";
import { GLOSSARY } from "../content";
import { STATE_FILL } from "../labels";

// --------------------------------------------------------------------------
// Slide frame
// --------------------------------------------------------------------------

/** Eyebrow, title and lede. The first slide's title is the page's h1. */
export function SlideHead({
  eyebrow,
  title,
  lede,
  level = 2,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <header className="max-w-[60rem]">
      <p className="cap">{eyebrow}</p>
      <Heading
        className={`display mt-3 text-ink ${
          level === 1
            ? "text-[44px] sm:text-[56px] lg:text-[72px]"
            : "text-[28px] sm:text-[36px] lg:text-[44px]"
        }`}
        style={{ textWrap: "balance" }}
      >
        {title}
      </Heading>
      {lede && (
        <p className="mt-5 max-w-[42rem] text-[16px] leading-[1.55] text-ink-2 sm:text-[20px] sm:leading-[1.5]">
          {lede}
        </p>
      )}
    </header>
  );
}

/** One figure per slide: a top rule, a numbered mono caption, the figure, and
 * what to read from it. */
export function Figure({
  n,
  label,
  children,
  caption,
}: {
  n: number;
  label: string;
  children: ReactNode;
  caption?: ReactNode;
}) {
  return (
    <figure className="mt-8 border-t-2 border-ink pt-3 sm:mt-10">
      <p className="cap mb-5">
        <span className="text-ink">Fig. {n}</span> — {label}
      </p>
      {children}
      {caption && (
        <figcaption className="mt-5 max-w-[46rem] border-t border-rule pt-3 text-[14px] leading-[1.55] text-ink-2">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/** Short side notes in a row of columns, each under its own rule. */
export function Notes({ items }: { items: { label: string; body: ReactNode }[] }) {
  return (
    <div className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="border-t border-rule pt-3">
          <p className="text-[14px] font-semibold text-ink">{item.label}</p>
          <div className="mt-1 text-[14px] leading-[1.55] text-ink-2">{item.body}</div>
        </div>
      ))}
    </div>
  );
}

/** Emphasis inside body copy. */
export function Em({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-ink">{children}</strong>;
}

// --------------------------------------------------------------------------
// Controls
// --------------------------------------------------------------------------

/** A row of mutually exclusive buttons. Plain buttons with `aria-pressed`, so
 * the deck's arrow keys keep turning pages; Tab moves between options. */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="cap">{label}</span>
      <div className="flex flex-wrap">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(o.value)}
              className={`-ml-px min-h-[36px] border px-3 text-[14px] font-medium transition-colors first:ml-0 ${
                on
                  ? "relative z-[1] border-ink bg-ink text-paper"
                  : "border-rule-2 text-ink hover:border-ink"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** An on/off switch. */
export function Switch({
  label,
  checked,
  onChange,
  note,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  note?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex min-h-[36px] items-center gap-2.5 text-left"
    >
      <span
        aria-hidden
        className={`relative inline-block h-[18px] w-[32px] shrink-0 border transition-colors ${
          checked ? "border-ink bg-ink" : "border-ink-2 bg-paper"
        }`}
      >
        <span
          className={`absolute top-[2px] h-[12px] w-[12px] transition-[left] ${
            checked ? "left-[16px] bg-paper" : "left-[2px] bg-ink-2"
          }`}
        />
      </span>
      <span className="text-[14px] font-medium text-ink">
        {label}
        {note && <span className="ml-1.5 font-normal text-ink-2">{note}</span>}
      </span>
    </button>
  );
}

// --------------------------------------------------------------------------
// The verdict vocabulary: band words, the level, the tier ladder
// --------------------------------------------------------------------------

const BAND_INDEX: Record<BandWord, number> = {
  "usually fails": 0,
  contested: 1,
  "usually succeeds": 2,
};

/** Three cells, one filled: where the attacker lands. Ink when they usually
 * fail (you hold), split when contested, red when they usually succeed. The
 * word carries the meaning; the ICD 203 word is the hover detail. */
export function BandMark({
  band,
  detail,
  compact = false,
  stack = false,
}: {
  band: BandWord;
  detail?: string;
  compact?: boolean;
  /** Cells above the word, for narrow columns. */
  stack?: boolean;
}) {
  const i = BAND_INDEX[band];
  return (
    <span
      className={stack ? "inline-flex flex-col items-start gap-1" : "inline-flex items-center gap-2"}
      title={detail ? `ICD 203: ${detail}` : undefined}
    >
      <span aria-hidden className="inline-flex gap-[2px]">
        {[0, 1, 2].map((k) => (
          <span
            key={k}
            className="inline-block h-[12px] w-[12px] border"
            style={{
              borderColor: k === i ? (k === 2 ? "var(--signal)" : "var(--ink)") : "var(--rule-2)",
              background:
                k !== i
                  ? "transparent"
                  : k === 0
                    ? "var(--ink)"
                    : k === 1
                      ? "linear-gradient(135deg, var(--ink) 50%, transparent 50%)"
                      : "var(--signal)",
            }}
          />
        ))}
      </span>
      {!compact && (
        <span
          className={`text-[14px] leading-tight font-semibold ${band === "usually succeeds" ? "text-signal-ink" : "text-ink"}`}
        >
          {band}
        </span>
      )}
    </span>
  );
}

/** "You are SL2", a bar toward SL3, and a marginal mark. The decimal is only
 * in the tooltip, by design: the level is the message. */
export function SlMeter({
  level,
  progress,
  marginal,
  value,
  size = "large",
  prefix = "You are",
}: {
  level: number;
  progress: number;
  marginal: boolean;
  value: number;
  size?: "large" | "medium";
  prefix?: string;
}) {
  const next = Math.min(5, level + 1);
  return (
    <div title={`Security level ${value.toFixed(2)}`}>
      <p className="cap">{prefix}</p>
      <p
        className={`display text-ink ${size === "large" ? "text-[56px] sm:text-[72px]" : "text-[44px]"}`}
        aria-label={`Security level ${level}${marginal ? ", marginal" : ""}${
          level < 5 ? `, part of the way toward SL${next}` : ""
        }`}
      >
        SL{level}
      </p>
      {level < 5 ? (
        <div className="mt-2 flex items-center gap-3">
          <ProgressBar value={progress} />
          <span className="text-[14px] text-ink-2">toward SL{next}</span>
        </div>
      ) : (
        <p className="mt-2 text-[14px] text-ink-2">The top of the scale</p>
      )}
      {marginal && (
        <p className="mt-2">
          <span className="mono border border-dashed border-ink px-1.5 py-0.5 text-[12px] font-medium tracking-wide text-ink uppercase">
            Marginal
          </span>
          <span className="ml-2 text-[14px] text-ink-2">only just holding SL{level}</span>
        </p>
      )}
    </div>
  );
}

/** A bar in five segments (▰▰▰▱▱): progress toward the next level. */
export function ProgressBar({ value, width = 140 }: { value: number; width?: number }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <span
      aria-hidden
      className="relative inline-block h-[10px] border border-ink"
      style={{ width }}
    >
      <span className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${v * 100}%` }} />
      {[1, 2, 3, 4].map((k) => (
        <span
          key={k}
          className="absolute inset-y-0 w-[2px] bg-paper"
          style={{ left: `calc(${k * 20}% - 1px)` }}
        />
      ))}
    </span>
  );
}

export interface LadderRow {
  key: string;
  code: string;
  name: string;
  band: BandWord;
  detail?: string;
  /** A short chip that appears when this row just changed band. */
  chip?: string;
  /** Changes on every update, so the chip's animation replays. */
  chipKey?: number;
  muted?: boolean;
}

/** OC1..OC5 (and optionally the own model) with a band word each. */
export function TierLadder({ rows, label }: { rows: LadderRow[]; label: string }) {
  return (
    <table className="w-full border-collapse text-left" aria-label={label}>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-t border-rule">
            <th scope="row" className="py-2 pr-3 align-middle font-normal whitespace-nowrap">
              <span className="mono text-[14px] font-semibold text-ink">{r.code}</span>
              <span className="ml-2 hidden text-[14px] text-ink-2 sm:inline">{r.name}</span>
            </th>
            <td className="py-2 text-right align-middle whitespace-nowrap">
              {r.chip && (
                <span
                  key={`${r.chipKey ?? 0}-${r.chip}`}
                  className={`intro-chip mono mr-2 border px-1.5 py-0.5 text-[12px] font-medium ${
                    r.chip.startsWith("+") ? "border-signal text-signal-ink" : "border-ink text-ink"
                  }`}
                >
                  {r.chip}
                </span>
              )}
              <BandMark band={r.band} detail={r.detail} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// --------------------------------------------------------------------------
// The block glyph: shape = type, fill = state
// --------------------------------------------------------------------------

/** The cells a type is drawn as: one solid bar, three perforations, or a
 * solid top over two perforations. */
function glyphCells(type: DefenseType, h: number) {
  const g = Math.max(2, Math.round(h * 0.08));
  if (type === "hard_stop") return [{ y: 0, h }];
  if (type === "probabilistic") {
    const c = (h - 2 * g) / 3;
    return [0, 1, 2].map((k) => ({ y: k * (c + g), h: c }));
  }
  const top = Math.round(h * 0.48);
  const c = (h - top - 2 * g) / 2;
  return [{ y: 0, h: top }, { y: top + g, h: c }, { y: top + g + c + g, h: c }];
}

export function BlockGlyph({
  type,
  state,
  w = 10,
  h = 30,
  color = "var(--ink)",
}: {
  type: DefenseType;
  state: BlockState;
  w?: number;
  h?: number;
  color?: string;
}) {
  const id = useId();
  const cells = glyphCells(type, h);
  const fill = STATE_FILL[state] * h;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="block shrink-0">
      <clipPath id={`${id}-c`}>
        {cells.map((c, i) => (
          <rect key={i} x={0} y={c.y} width={w} height={c.h} />
        ))}
      </clipPath>
      <rect
        x={0}
        y={h - fill}
        width={w}
        height={fill}
        clipPath={`url(#${id}-c)`}
        style={{ fill: color }}
      />
      {cells.map((c, i) => (
        <rect
          key={i}
          x={0.5}
          y={c.y + 0.5}
          width={w - 1}
          height={Math.max(0, c.h - 1)}
          style={{ fill: "none", stroke: color, strokeWidth: 1 }}
        />
      ))}
      {state === "mature" && (
        <line
          x1={w / 2}
          x2={w / 2}
          y1={3}
          y2={h - 3}
          clipPath={`url(#${id}-c)`}
          style={{ stroke: "var(--paper)", strokeWidth: 1 }}
        />
      )}
    </svg>
  );
}

// --------------------------------------------------------------------------
// Words that explain themselves, and collapsed detail
// --------------------------------------------------------------------------

/** An inline term whose definition opens on hover (mouse), keyboard focus, or
 * a tap. The card is absolutely positioned so the sentence doesn't reflow.
 * Hover opens only for a mouse and focus only when `:focus-visible`, so a tap's
 * whole event cascade lands on the click alone, which toggles. */
export function Term({ term, children }: { term: keyof typeof GLOSSARY; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const entry = GLOSSARY[term];
  return (
    <span
      className="relative inline-block"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onFocus={(e) => {
          if (e.currentTarget.matches(":focus-visible")) setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        className="cursor-help font-semibold text-ink underline decoration-ink-3 decoration-dotted decoration-[1.5px] underline-offset-[4px] hover:decoration-ink"
      >
        {children ?? entry.label}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-30 mb-2 block w-72 max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 border border-ink bg-paper px-3 py-2.5 text-left text-[14px] leading-[1.5] font-normal text-ink-2"
        >
          <span className="mb-1 block font-semibold text-ink">{entry.label}</span>
          {entry.definition}
        </span>
      )}
    </span>
  );
}

/** Collapsed detail. Native `<details>`: keyboard- and screen-reader-correct
 * for free. */
export function Reveal({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group mt-6 border-t border-rule">
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 text-[14px] font-semibold text-ink">
        <span aria-hidden className="mono inline-block transition-transform group-open:rotate-90">
          ›
        </span>
        {summary}
      </summary>
      <div className="space-y-3 pb-2 text-[14px] leading-[1.55] text-ink-2">{children}</div>
    </details>
  );
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="font-semibold text-ink underline decoration-rule-2 underline-offset-[3px] hover:decoration-ink"
    >
      {children}
    </a>
  );
}

/** What a demo shows while the shipped data loads, or if it can't. */
export function DataPending({ error }: { error?: string }) {
  return (
    <p className="mono py-8 text-[14px] text-ink-2" role="status">
      {error
        ? `Couldn't load the catalogue (${error}). The rest of the introduction doesn't need it.`
        : "Loading the catalogue…"}
    </p>
  );
}
