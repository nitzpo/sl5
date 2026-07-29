import { useEffect, useState } from "react";
import { SCRIPTS } from "../../timelapse/scripts";
import type { TimeLapseScript } from "../../timelapse/types";
import { usePlaybackStore } from "../../timelapse/playback-store";
// One guarded writer for the seen flag: localStorage throws outright in some
// private-browsing modes, and neither path here is worth failing over.
import { markIntroSeen } from "../../intro/nav";

interface IntroOverlayProps {
  onClose: () => void;
}

// First-time viewers pick from the authored stories only; "Your Current Config"
// (a passthrough that just advances time on an existing posture) is an advanced
// option that makes no sense before you've built anything.
const STORY_CHOICES = SCRIPTS.filter((s) => s.type !== "passthrough");

export function IntroOverlay({ onClose }: IntroOverlayProps) {
  const startScript = usePlaybackStore((s) => s.startScript);
  const [choosingStory, setChoosingStory] = useState(false);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // First Escape backs out of the story chooser; a second closes the intro.
        if (choosingStory) setChoosingStory(false);
        else onClose();
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
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-8 max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h1 className="text-2xl font-bold text-gray-100 mb-4">
          SL5 Explorable
        </h1>

        <p className="text-sm text-gray-300 leading-relaxed mb-6">
          It's 2026. You're the CISO of a frontier AI lab building the world's
          most capable model. Nation-states want your weights. Your job: build a
          posture strong enough across every category to reach Security Level 5
          before adversary capabilities outpace you.
        </p>

        {/* The primary path for a first-time reader: the long-form introduction
            answers "why does any of this matter" before the instrument asks them
            to make choices. Its own page (/sl5/intro/), so this is a real link —
            and it marks the intro seen so coming back here isn't a loop. */}
        <a
          href={`${import.meta.env.BASE_URL}intro/`}
          onClick={markIntroSeen}
          className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-violet-600 px-4 py-3 transition-colors hover:bg-violet-500"
        >
          <span>
            <span className="block text-sm font-medium text-white">
              Start with the 5-minute introduction
            </span>
            <span className="mt-0.5 block text-[11px] text-violet-200">
              Why model weights are a target, and how to drive this tool
            </span>
          </span>
          <span className="text-lg text-white">→</span>
        </a>

        {choosingStory ? (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Choose a story to watch</span>
              <button
                onClick={() => setChoosingStory(false)}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                ← Back
              </button>
            </div>
            <div className="space-y-1.5">
              {STORY_CHOICES.map((script) => (
                <button
                  key={script.id}
                  onClick={() => playStory(script)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors group"
                >
                  <div className="text-sm text-gray-100 group-hover:text-white font-medium">
                    ▶ {script.name}
                  </div>
                  <div className="text-[11px] text-gray-500 group-hover:text-gray-400">
                    {script.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Both secondary to the introduction above: same muted treatment, so
             the violet button is the only thing competing for the first click. */
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setChoosingStory(true)}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            >
              ▶ Watch the 1-min story
            </button>
            <button
              onClick={dismiss}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            >
              Explore freely
            </button>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1 mb-5 border-l-2 border-gray-700 pl-3">
          <p><span className="text-gray-300 font-medium">Click</span> a hexagon for details · <span className="text-gray-300 font-medium">right-click</span> to advance its state</p>
          <p><span className="text-gray-300 font-medium">Scroll to zoom, drag to pan</span> the map · switch Clusters / Grid / Rings views</p>
          <p><span className="text-gray-300 font-medium">Drag the year</span> to watch AI erode probabilistic defenses</p>
          <p><span className="text-gray-300 font-medium">Sliders</span> set the world: budget, cooperation, AI timeline</p>
        </div>

        <div className="text-[10px] text-gray-500">
          <span className="text-gray-600">Based on:</span>{" "}
          <a href="https://www.rand.org/pubs/research_reports/RRA2849-1.html" target="_blank" rel="noopener" className="text-violet-400 hover:underline">RAND Securing AI Model Weights (2024)</a>
          {" · "}
          <a href="https://sl5.org/sl5-standard" target="_blank" rel="noopener" className="text-violet-400 hover:underline">SL5 Standard v0.1</a>
          {" · "}
          <a href="https://sl5.org/projects/sl5-novel-recommendations" target="_blank" rel="noopener" className="text-violet-400 hover:underline">SL5 Novel Recommendations</a>
          {" · "}
          <a href="https://ai-2027.com" target="_blank" rel="noopener" className="text-violet-400 hover:underline">AI 2027</a>
        </div>
      </div>
    </div>
  );
}
