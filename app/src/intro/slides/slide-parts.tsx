import { useId, useState, type ReactNode } from "react";
import { GLOSSARY } from "../content";

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
        <p className="mb-2 text-[10px] font-semibold tracking-wider text-violet-400 uppercase">
          {eyebrow}
        </p>
      )}
      <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">{title}</h2>
      {lede && (
        <p className="mt-3 text-sm leading-relaxed text-gray-300 sm:text-[15px]">{lede}</p>
      )}
      {children && <div className="mt-6">{children}</div>}
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
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-3.5">
      <h3 className={`mb-1.5 text-xs font-semibold ${accent ?? "text-gray-200"}`}>
        {title}
      </h3>
      <p className="text-xs leading-relaxed text-gray-400">{children}</p>
    </div>
  );
}

export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

/** Pull-quote / aside for the one idea a slide should leave behind. */
export function Aside({ children }: { children: ReactNode }) {
  return (
    <p className="border-l-2 border-violet-700 pl-3 text-xs leading-relaxed text-gray-400">
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
        <p className="mt-3 border-t border-gray-800 pt-3 text-[11px] leading-relaxed text-gray-500">
          {caption}
        </p>
      )}
    </div>
  );
}

/** An inline term with its definition one click away.
 *
 * A reader who already knows what OC means sees a dotted underline and reads
 * straight past; one who doesn't gets the definition in place, without leaving
 * the sentence or the slide. Rendered as a real `<button>` with
 * `aria-expanded`, so it works from the keyboard and announces its state —
 * a `title` tooltip would be invisible to both. `term` is keyed to GLOSSARY, so
 * a typo fails the build rather than silently rendering nothing. */
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
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="cursor-help font-medium text-violet-300 underline decoration-violet-700 decoration-dotted underline-offset-2 transition-colors hover:text-violet-200 hover:decoration-violet-400"
      >
        {children ?? entry.label}
      </button>
      {open && (
        <span
          id={id}
          className="mt-1.5 mb-1 block rounded-md border-l-2 border-violet-600 bg-violet-950/30 px-3 py-2 text-xs leading-relaxed text-gray-300"
        >
          <span className="font-semibold text-violet-200">{entry.label}</span> —{" "}
          {entry.definition}
        </span>
      )}
    </>
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
      <summary className="cursor-pointer list-none px-3.5 py-2.5 text-xs font-medium text-violet-300 transition-colors hover:text-violet-200">
        <span className="mr-1.5 inline-block transition-transform group-open:rotate-90">
          ▸
        </span>
        {summary}
      </summary>
      <div className="space-y-3 border-t border-gray-800 px-3.5 py-3 text-xs leading-relaxed text-gray-400">
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
