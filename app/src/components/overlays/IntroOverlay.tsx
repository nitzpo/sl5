import { useEffect } from "react";

interface IntroOverlayProps {
  onClose: () => void;
}

export function IntroOverlay({ onClose }: IntroOverlayProps) {
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

        <p className="text-sm text-gray-300 leading-relaxed mb-5">
          It's 2026. You're the CISO of a frontier AI lab building the world's
          most capable model. Nation-states want your weights. Your job: deploy
          enough independent defense layers to reach Security Level 5 before
          adversary capabilities outpace you.
        </p>

        <div className="text-xs text-gray-400 space-y-2 mb-6 border-l-2 border-gray-700 pl-3">
          <p><span className="text-gray-200 font-medium">Click</span> hexagons to inspect defense blocks</p>
          <p><span className="text-gray-200 font-medium">Right-click</span> to cycle deployment state (Not Started &rarr; Mature)</p>
          <p><span className="text-gray-200 font-medium">Advance the year</span> to watch AI erode probabilistic defenses</p>
          <p><span className="text-gray-200 font-medium">Switch perspectives</span> (CISO, Attacker, Policy, Observer) for different analysis</p>
          <p><span className="text-gray-200 font-medium">Adjust sliders</span> to change world parameters (budget, cooperation, AI timeline)</p>
          <p><span className="text-gray-200 font-medium">Save scenarios</span> to bookmark configurations and compare strategies</p>
          <p><span className="text-gray-200 font-medium">Share</span> your scenario as a URL — recipients can save it as their own</p>
        </div>

        <button
          onClick={dismiss}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          Start Exploring
        </button>
      </div>
    </div>
  );
}
