import { useEffect } from "react";
import { SCRIPTS } from "../../timelapse/scripts";
import { usePlaybackStore } from "../../timelapse/playback-store";

interface IntroOverlayProps {
  onClose: () => void;
}

export function IntroOverlay({ onClose }: IntroOverlayProps) {
  const startScript = usePlaybackStore((s) => s.startScript);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function dismiss() {
    localStorage.setItem("sl5_intro_seen", "1");
    onClose();
  }

  function watchStory() {
    const script = SCRIPTS.find((s) => s.id === "reactive-ciso") ?? SCRIPTS[0];
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
          most capable model. Nation-states want your weights. Your job: deploy
          enough independent defense layers to reach Security Level 5 before
          adversary capabilities outpace you.
        </p>

        <div className="flex gap-3 mb-5">
          <button
            onClick={watchStory}
            className="flex-1 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
          >
            ▶ Watch the 3-min story
          </button>
          <button
            onClick={dismiss}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2.5 rounded-lg font-medium transition-colors"
          >
            Explore freely
          </button>
        </div>

        <div className="text-xs text-gray-500 space-y-1 mb-5 border-l-2 border-gray-700 pl-3">
          <p><span className="text-gray-300 font-medium">Click</span> a hexagon for details · <span className="text-gray-300 font-medium">right-click</span> to advance its state</p>
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
