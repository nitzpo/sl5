import { useCallback, useEffect, useRef, useState } from "react";
import { ACT_LABELS, SLIDES, slideIndex } from "./slides";
import { useIsDesktopWidth } from "../components/overlays/use-is-desktop-width";
import { APP_URL, markIntroSeen } from "./nav";

/** Slide index for the slug in `location.hash` (or an older alias), else 0. */
function indexFromHash(): number {
  const slug = window.location.hash.replace(/^#/, "");
  if (!slug) return 0;
  const i = slideIndex(slug);
  return i >= 0 ? i : 0;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function IntroApp() {
  const [index, setIndex] = useState(indexFromHash);
  // The introduction reads fine on a phone; the instrument it links to does
  // not. Links into the app are withheld below its width gate rather than
  // leading to a "desktop required" screen whose only way out is back here.
  const isDesktop = useIsDesktopWidth();
  const regionRef = useRef<HTMLDivElement>(null);
  // Focus and scroll only when the slide actually changes, never on first
  // paint: moving focus before the reader has done anything would steal it
  // from the address bar. (A "mounted" flag would not do: StrictMode runs the
  // effect twice on mount.)
  const shownIndex = useRef(index);

  const slide = SLIDES[index];
  const atStart = index === 0;
  const atEnd = index === SLIDES.length - 1;
  const next = SLIDES[index + 1];

  const go = useCallback((i: number) => {
    setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)));
  }, []);

  // Keep the hash in sync so any slide is linkable and survives a reload.
  // replaceState, not a hash assignment: the arrow keys shouldn't fill the
  // back button with fourteen entries.
  useEffect(() => {
    const url = `${window.location.pathname}${window.location.search}#${slide.slug}`;
    window.history.replaceState(null, "", url);
    document.title = `${slide.title} · SL5 Explorable`;
  }, [slide]);

  useEffect(() => {
    const onHashChange = () => setIndex(indexFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (shownIndex.current === index) return;
    shownIndex.current = index;
    regionRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't take keys aimed at a control (the year sliders, for one).
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
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
          if (!isDesktop) return;
          window.location.href = APP_URL;
          break;
        default:
          return;
      }
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, isDesktop]);

  const { Component } = slide;

  return (
    <div className="flex min-h-[100svh] flex-col bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b-2 border-ink bg-paper">
        <div className="mx-auto flex h-[52px] max-w-[1240px] items-center gap-3 px-4 sm:px-8 lg:px-12">
          <a href="#start" className="flex items-baseline gap-2 no-underline" aria-label="SL5 Explorable introduction, first slide">
            <span className="display text-[20px] text-ink">SL5</span>
            <span className="text-[14px] text-ink-2">Explorable</span>
          </a>
          <span className="cap hidden sm:inline">· Introduction</span>
          <div className="ml-auto flex items-center gap-4">
            <span className="mono text-[12px] text-ink-2" aria-label={`Slide ${index + 1} of ${SLIDES.length}`}>
              {pad(index + 1)}/{pad(SLIDES.length)}
            </span>
            {isDesktop && (
              <a
                href={APP_URL}
                onClick={markIntroSeen}
                className="inline-flex min-h-[32px] items-center border border-ink px-3 text-[14px] font-semibold text-ink hover:bg-ink hover:text-paper"
              >
                Open the instrument →
              </a>
            )}
          </div>
        </div>
        <ProgressRail index={index} onPick={go} />
      </header>

      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col px-4 pt-8 pb-10 sm:px-8 sm:pt-12 lg:px-12">
        {/* key remounts on slide change, so the entry replays and demo state resets */}
        <div
          key={slide.slug}
          ref={regionRef}
          tabIndex={-1}
          // Named, because focus moves here on every slide change: a screen
          // reader announces which slide it landed on.
          role="region"
          aria-label={slide.title}
          className="intro-enter flex-1 outline-none"
        >
          <Component />
        </div>

        <nav aria-label="Slides" className="mt-14 flex items-center justify-between gap-3 border-t-2 border-ink pt-4">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={atStart}
            className="inline-flex min-h-[44px] items-center border border-ink px-4 text-[14px] font-semibold text-ink hover:bg-tint disabled:cursor-default disabled:border-rule disabled:text-ink-3 disabled:hover:bg-transparent"
          >
            ← Back
          </button>

          <span className="cap hidden text-center md:block">
            {ACT_LABELS[slide.act]} · arrow keys turn the page
          </span>

          {atEnd && isDesktop ? (
            <a
              href={APP_URL}
              onClick={markIntroSeen}
              className="inline-flex min-h-[44px] items-center bg-ink px-4 text-[14px] font-semibold text-paper hover:bg-ink-2"
            >
              Open the instrument →
            </a>
          ) : atEnd ? (
            <span className="text-[14px] text-ink-2">End of the introduction</span>
          ) : (
            <button
              type="button"
              onClick={() => go(index + 1)}
              className="inline-flex min-h-[44px] flex-col items-start justify-center bg-ink px-4 py-1.5 text-left text-[14px] font-semibold text-paper hover:bg-ink-2"
            >
              <span className="sm:hidden">Next →</span>
              <span aria-hidden className="mono hidden text-[12px] font-medium tracking-[0.06em] uppercase opacity-75 sm:block">
                Next
              </span>
              <span className="hidden sm:block">{next.title} →</span>
            </button>
          )}
        </nav>
      </main>
    </div>
  );
}

/** One clickable tick per slide, grouped by act. Doubles as the progress bar. */
function ProgressRail({ index, onPick }: { index: number; onPick: (i: number) => void }) {
  const acts: (1 | 2)[] = [1, 2];
  return (
    <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-4 pb-1 sm:gap-6 sm:px-8 lg:px-12">
      {acts.map((act) => (
        <div key={act} className="flex min-w-0 flex-1 items-center gap-3">
          <span className={`cap hidden whitespace-nowrap lg:inline ${SLIDES[index].act === act ? "text-ink" : ""}`}>
            {act === 1 ? "I" : "II"} · {ACT_LABELS[act]}
          </span>
          <div className="flex flex-1 items-center gap-[3px]">
            {SLIDES.map((s, i) =>
              s.act !== act ? null : (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => onPick(i)}
                  title={s.title}
                  aria-label={s.title}
                  aria-current={i === index ? "step" : undefined}
                  className="group flex h-[24px] flex-1 items-center"
                >
                  <span
                    className={`block w-full transition-colors ${
                      i === index ? "h-[5px] bg-ink" : i < index ? "h-[2px] bg-ink-2" : "h-[2px] bg-rule-2 group-hover:bg-ink-3"
                    }`}
                  />
                </button>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
