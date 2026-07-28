import type { ReactNode } from "react";

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
