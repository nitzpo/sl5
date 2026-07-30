import { useId, useState, type ReactNode } from "react";
import { GLOSSARY } from "../content";

// Type scale. The intro is long-form reading on its own page, not a dense
// instrument panel, so it runs a step larger than the app's UI chrome: card and
// caption copy is 14px rather than the app's 12px, and nothing goes below 12px.
// Named, so the whole deck moves together rather than drifting per-slide.
export const SMALL = "text-sm leading-relaxed";
const LEDE = "text-base leading-relaxed sm:text-[17px]";

/** Standard slide frame: eyebrow, heading, body. Keeps all 13 slides on one
 * type scale without repeating the classes. */
export function SlideShell({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section>
      {eyebrow && (
        <p className="mb-2 text-xs font-semibold tracking-wider text-violet-400 uppercase">
          {eyebrow}
        </p>
      )}
      <h2 className="text-2xl font-bold text-gray-100 sm:text-3xl">{title}</h2>
      {lede && <p className={`mt-3.5 ${LEDE} text-gray-300`}>{lede}</p>}
      {children && <div className="mt-7">{children}</div>}
    </section>
  );
}

/** A titled card — the repo's `bg-gray-900 rounded-lg p-3` pattern. */
export function Card({
  title,
  children,
  accent,
}: {
  title: string;
  children: ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h3 className={`mb-2 text-sm font-semibold ${accent ?? "text-gray-200"}`}>
        {title}
      </h3>
      <p className={`${SMALL} text-gray-400`}>{children}</p>
    </div>
  );
}

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3.5 sm:grid-cols-2">{children}</div>;
}

/** Pull-quote / aside for the one idea a slide should leave behind. */
export function Aside({ children }: { children: ReactNode }) {
  return (
    <p className={`border-l-2 border-violet-700 pl-3.5 ${SMALL} text-gray-400`}>
      {children}
    </p>
  );
}

/** Emphasis inside body copy, matching IntroOverlay's brighter-span idiom. */
export function Em({ children }: { children: ReactNode }) {
  return <span className="font-medium text-gray-200">{children}</span>;
}

/** Caption under a demo, so readers know what they're looking at. */
export function DemoFrame({
  children,
  caption,
}: {
  children: ReactNode;
  caption?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4">
      {children}
      {caption && (
        <p className={`mt-3.5 border-t border-gray-800 pt-3.5 ${SMALL} text-gray-500`}>
          {caption}
        </p>
      )}
    </div>
  );
}

/** An inline term whose definition appears on hover, in a floating card.
 *
 * A reader who already knows what OC means sees a dotted underline and reads
 * straight past; one who doesn't gets the definition without leaving the
 * sentence. The card is absolutely positioned and taken out of flow — an
 * in-flow block would push the rest of the sentence down and leave the comma or
 * full stop after the term stranded on its own line.
 *
 * Hover is not enough on its own: it never fires on touch and can't be reached
 * from a keyboard. So this also opens on focus and on click/tap, stays a real
 * `<button>` with `aria-describedby`, and closes on Escape. `term` is keyed to
 * GLOSSARY, so a typo fails the build rather than silently rendering nothing.
 *
 * Both auto-open paths are gated, because a tap fires a whole cascade —
 * `pointerenter`, a synthesized `mouseenter`, `focus`, then `click` — and every
 * ungated handler in that cascade opens the card only for the click behind it to
 * toggle it shut. That's what made a term take two taps on a phone: the first tap
 * opened and closed it, and the second worked only because `mouseenter` doesn't
 * fire twice. A phone is the device this page is meant to be shared to, so:
 *
 *  - hover opens on `pointerenter` with `pointerType === "mouse"`, not on
 *    `mouseenter`, so a touch never takes the hover path at all;
 *  - focus opens only when `:focus-visible` matches, which is true for Tab and
 *    false for a pointer.
 *
 * Click is therefore the single path a tap travels, and it toggles — which is also
 * what makes tap-to-dismiss work. */
export function Term({
  term,
  children,
}: {
  term: keyof typeof GLOSSARY;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const entry = GLOSSARY[term];
  return (
    // inline-block so the trigger and its card share a positioning context
    // without the term itself breaking across a line.
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
          // Keyboard focus only — a mouse has already opened the card on hover,
          // and a tap's focus would be undone by the click right behind it.
          if (e.currentTarget.matches(":focus-visible")) setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        className="cursor-help font-medium text-violet-300 underline decoration-violet-600 decoration-dotted underline-offset-[3px] transition-colors hover:text-violet-200 hover:decoration-violet-400"
      >
        {children ?? entry.label}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          // Centred on the term and clamped to the viewport with `max-w`, so a
          // definition on a term near the right edge doesn't overflow the page.
          className="absolute bottom-full left-1/2 z-30 mb-2 block w-64 max-w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-violet-800/70 bg-gray-900 px-3 py-2.5 text-left text-[13px] leading-relaxed font-normal text-gray-300 shadow-xl shadow-black/50"
        >
          <span className="mb-0.5 block font-semibold text-violet-200">
            {entry.label}
          </span>
          {entry.definition}
        </span>
      )}
    </span>
  );
}

/** A collapsed block of detail. The slide states its point in a sentence or
 * two; anything that only some readers want lives in here.
 *
 * Native `<details>` rather than state: it's keyboard- and screen-reader-correct
 * for free, survives Ctrl+F on browsers that support it, and needs no JS. */
export function Reveal({
  summary,
  children,
}: {
  summary: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-lg border border-gray-800 bg-gray-900/40">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-violet-300 transition-colors hover:text-violet-200">
        <span className="mr-1.5 inline-block transition-transform group-open:rotate-90">
          ▸
        </span>
        {summary}
      </summary>
      <div
        className={`space-y-3 border-t border-gray-800 px-4 py-3.5 ${SMALL} text-gray-400`}
      >
        {children}
      </div>
    </details>
  );
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="text-violet-400 hover:underline"
    >
      {children}
    </a>
  );
}
