import { useCallback, useEffect, useRef, useState } from "react";
import { SLIDES, ACT_LABELS } from "./slides";
import { useIsDesktopWidth } from "../components/overlays/use-is-desktop-width";
import { APP_URL, markIntroSeen } from "./nav";

/** Slide index for the slug in `location.hash`, or 0 if there isn't one. */
function indexFromHash(): number {
  const slug = window.location.hash.replace(/^#/, "");
  if (!slug) return 0;
  const i = SLIDES.findIndex((s) => s.slug === slug);
  return i >= 0 ? i : 0;
}

export function IntroApp() {
  const [index, setIndex] = useState(indexFromHash);
  // The introduction reads fine on a phone; the instrument it links to does not.
  // Links into the app are withheld below its width gate rather than leading to
  // a "desktop required" screen whose only way out is back to here.
  const isDesktop = useIsDesktopWidth();
  const headingRef = useRef<HTMLDivElement>(null);
  // Skip the focus-and-scroll effect on first paint: moving focus before the
  // reader has done anything would scroll a deep-linked slide oddly and steal
  // focus from the address bar.
  const mounted = useRef(false);

  const slide = SLIDES[index];
  const atStart = index === 0;
  const atEnd = index === SLIDES.length - 1;

  const go = useCallback((next: number) => {
    setIndex(Math.max(0, Math.min(SLIDES.length - 1, next)));
  }, []);

  // Keep the hash in sync so any slide is linkable and survives a reload.
  // replaceState, not a hash assignment: the arrow keys shouldn't stuff the
  // browser's back button with thirteen entries.
  useEffect(() => {
    const url = `${window.location.pathname}${window.location.search}#${slide.slug}`;
    window.history.replaceState(null, "", url);
    document.title = `${slide.title} · SL5 Explorable`;
  }, [slide]);

  // Back/forward and hand-edited hashes still navigate.
  useEffect(() => {
    function onHashChange() {
      setIndex(indexFromHash());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't hijack keys aimed at a control (the year scrubber, for one).
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      switch (e.key) {
        case "ArrowRight":
        case "PageDown":
          go(index + 1);
          break;
        case "ArrowLeft":
        case "PageUp":
          go(index - 1);
          break;
        case "Home":
          go(0);
          break;
        case "End":
          go(SLIDES.length - 1);
          break;
        case "Escape":
          window.location.href = APP_URL;
          break;
        default:
          return;
      }
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go]);

  const { Component } = slide;

  return (
    <div className="flex min-h-[100svh] flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-800 bg-gray-950/85 px-4 py-2 backdrop-blur-sm">
        <span className="text-sm font-bold whitespace-nowrap text-gray-200">
          SL5 Explorable
        </span>
        <span className="hidden text-xs text-gray-500 sm:inline">Introduction</span>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px] font-mono text-gray-500 tabular-nums">
            {index + 1}/{SLIDES.length}
          </span>
          {/* Below the app's own width gate this link only reaches a "desktop
              required" screen, so it isn't offered. See `StoryPicker`. */}
          {isDesktop && (
            <a
              href={APP_URL}
              onClick={markIntroSeen}
              className="flex items-center gap-1 rounded-md border border-gray-700 bg-gray-900 px-2.5 py-1 text-xs text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-800 hover:text-white"
            >
              Open the app →
            </a>
          )}
        </div>
      </header>

      <ProgressRail index={index} onPick={go} />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-8 sm:py-12">
        {/* key remounts on slide change so the fade-in replays and demo state resets */}
        <div
          key={slide.slug}
          ref={headingRef}
          tabIndex={-1}
          // Named, because the effect above moves focus here on every slide
          // change: without it a screen reader announces an anonymous group and
          // the reader has no idea which slide they just landed on.
          role="region"
          aria-label={slide.title}
          className="animate-fade-in flex-1 outline-none motion-reduce:animate-none"
        >
          <Component />
        </div>

        <nav className="mt-10 flex items-center justify-between gap-3 border-t border-gray-800 pt-5">
          <button
            onClick={() => go(index - 1)}
            disabled={atStart}
            className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 transition-colors hover:bg-gray-700 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-gray-800"
          >
            ← Back
          </button>

          <span className="text-[11px] text-gray-600">
            <span className="hidden sm:inline">Arrow keys to navigate · </span>
            {ACT_LABELS[slide.act]}
          </span>

          {atEnd && isDesktop ? (
            <a
              href={APP_URL}
              onClick={markIntroSeen}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
            >
              Open the app →
            </a>
          ) : atEnd ? (
            // The last slide's own panel explains why there's nothing to open.
            <span className="text-[11px] text-gray-600">End of the introduction</span>
          ) : (
            <button
              onClick={() => go(index + 1)}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
            >
              Next →
            </button>
          )}
        </nav>
      </main>
    </div>
  );
}

/** One clickable tick per slide, grouped by act. Doubles as the progress bar. */
function ProgressRail({
  index,
  onPick,
}: {
  index: number;
  onPick: (i: number) => void;
}) {
  const acts: (1 | 2)[] = [1, 2];
  return (
    <div className="sticky top-[41px] z-10 flex items-center gap-4 border-b border-gray-800/60 bg-gray-950/70 px-4 py-1.5 backdrop-blur-sm">
      {acts.map((act) => (
        <div key={act} className="flex items-center gap-1.5">
          <span className="hidden text-[10px] tracking-wide text-gray-600 uppercase md:inline">
            {ACT_LABELS[act]}
          </span>
          <div className="flex items-center gap-1">
            {SLIDES.map((s, i) =>
              s.act !== act ? null : (
                <button
                  key={s.slug}
                  onClick={() => onPick(i)}
                  title={s.title}
                  aria-label={s.title}
                  aria-current={i === index ? "step" : undefined}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index
                      ? "w-6 bg-violet-500"
                      : i < index
                        ? "w-3 bg-gray-500 hover:bg-gray-400"
                        : "w-3 bg-gray-800 hover:bg-gray-700"
                  }`}
                />
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
