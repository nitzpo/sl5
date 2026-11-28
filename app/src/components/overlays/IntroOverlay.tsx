import { useEffect, useRef, useState } from "react";
import { SCRIPTS } from "../../timelapse/scripts";
import type { TimeLapseScript } from "../../timelapse/types";
import { usePlaybackStore } from "../../timelapse/playback-store";
import { markIntroSeen } from "../../store/intro-seen";

interface IntroOverlayProps {
  onClose: () => void;
}

// First-time viewers pick from the authored stories only; "Your Current
// Config" (a passthrough that advances time on an existing posture) makes no
// sense before you've built anything.
const STORY_CHOICES = SCRIPTS.filter((s) => s.type !== "passthrough");

/** The first-run modal, written for the people this is for: defenders
 * planning what to build. The introduction is the primary way in; a story
 * and free exploration are secondary. */
export function IntroOverlay({ onClose }: IntroOverlayProps) {
  const startScript = usePlaybackStore((s) => s.startScript);
  const [choosingStory, setChoosingStory] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      // First Escape backs out of the story chooser; a second closes.
      if (choosingStory) setChoosingStory(false);
      else {
        markIntroSeen();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, choosingStory]);

  function dismiss() {
    markIntroSeen();
    onClose();
  }

  function playStory(script: TimeLapseScript) {
    dismiss();
    startScript(script);
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45"
      onClick={dismiss}
      data-testid="intro-overlay"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-title"
        tabIndex={-1}
        className="sl5 mx-4 w-full max-w-[620px] border-2 border-ink bg-paper p-8 font-archivo text-ink outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cap">SL5 Explorable</div>
        <h1 id="intro-title" className="mt-2 text-[28px] leading-[1.1] font-extrabold tracking-tight">
          Plan the defenses that keep a frontier model's weights out of reach.
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-ink-2">
          You are planning security for a frontier AI lab. Pick the defenses to fund, watch which attacker tiers they
          stop, and see what still gets through — against attackers from hobbyists to top-priority state operations,
          as AI makes each of them stronger.
        </p>

        {/* The primary path: the long-form introduction answers "why does any
            of this matter" before the instrument asks for choices. */}
        <a
          href={`${import.meta.env.BASE_URL}intro/`}
          onClick={markIntroSeen}
          data-primary="true"
          className="mt-6 flex items-center justify-between gap-3 bg-ink px-5 py-4 text-paper hover:bg-ink-2"
        >
          <span>
            <span className="block text-[16px] font-bold">Start with the 5-minute introduction</span>
            <span className="mt-0.5 block text-[13px] text-on-ink-2">Why model weights are a target, and how to read this tool</span>
          </span>
          <span className="text-[20px]">→</span>
        </a>

        {choosingStory ? (
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <span className="cap">Watch a 1-minute story</span>
              <button type="button" onClick={() => setChoosingStory(false)} className="text-[13px] font-semibold underline underline-offset-2">
                ← Back
              </button>
            </div>
            <ul className="mt-2 border-t border-rule">
              {STORY_CHOICES.map((script) => (
                <li key={script.id} className="border-b border-rule">
                  <button type="button" onClick={() => playStory(script)} className="w-full py-2 text-left hover:bg-tint">
                    <span className="block text-[14px] font-bold">▶ {script.name}</span>
                    <span className="block text-[13px] text-ink-2">{script.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setChoosingStory(true)}
              className="border border-ink px-4 py-2.5 text-[14px] font-semibold hover:bg-tint"
            >
              ▶ Watch the 1-min story
            </button>
            <button type="button" onClick={dismiss} className="border border-ink px-4 py-2.5 text-[14px] font-semibold hover:bg-tint">
              Explore freely
            </button>
          </div>
        )}

        <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-ink pt-3 text-[13px] leading-snug">
          <dt className="font-bold">Click a block</dt>
          <dd className="text-ink-2">to fund it one step further; right-click steps it back, Shift-click opens its details.</dd>
          <dt className="font-bold">Read the rail</dt>
          <dd className="text-ink-2">for your security level, who still gets through, and the next defense to fund.</dd>
          <dt className="font-bold">The red line</dt>
          <dd className="text-ink-2">is the easiest attack path still open. It narrows as your defenses cut it.</dd>
          <dt className="font-bold">Move the year</dt>
          <dd className="text-ink-2">to watch AI lift attackers past defenses that held before.</dd>
        </dl>

        <p className="mt-5 text-[12px] text-ink-2">
          Based on{" "}
          <a href="https://www.rand.org/pubs/research_reports/RRA2849-1.html" target="_blank" rel="noopener" className="underline">
            RAND, Securing AI Model Weights
          </a>
          ,{" "}
          <a href="https://sl5.org/sl5-standard" target="_blank" rel="noopener" className="underline">
            the SL5 Standard
          </a>{" "}
          and{" "}
          <a href="https://ai-2027.com" target="_blank" rel="noopener" className="underline">
            AI 2027
          </a>
          . An illustrative model, not security guidance.
        </p>
      </div>
    </div>
  );
}
