import { useEffect, useState, useCallback, useRef } from "react";
import { useSimulationStore } from "./store/simulation";
import { loadFromUrlHashLive, clearUrlHash } from "./store/persistence";
import { Header } from "./components/layout/Header";
import { IntroOverlay } from "./components/overlays/IntroOverlay";
import { SharedBanner } from "./components/layout/SharedBanner";
import { BottomPanel } from "./components/layout/BottomPanel";
import { RightPanels } from "./components/layout/RightPanels";
import { BlockGrid } from "./components/blocks/BlockGrid";
import { DefenseRings } from "./components/rings/DefenseRings";
import type { Block } from "./engine/types";

function App() {
  const loadData = useSimulationStore((s) => s.loadData);
  const dataLoaded = useSimulationStore((s) => s.dataLoaded);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem("sl5_intro_seen"));
  const [viewMode, setViewMode] = useState<"grid" | "rings">("grid");
  const [zoom, setZoom] = useState(1);
  const [rightPanelWidth, setRightPanelWidth] = useState(0);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const blockFiles = [
        "blocks-network.json",
        "blocks-machine.json",
        "blocks-physical.json",
        "blocks-personnel.json",
        "blocks-supply-chain.json",
        "blocks-ai-specific.json",
      ];

      const blocks: Block[] = [];
      for (const file of blockFiles) {
        const resp = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
        const data = await resp.json();
        blocks.push(...data);
      }

      const chainsResp = await fetch(`${import.meta.env.BASE_URL}data/attack-chains.json`);
      const chains = await chainsResp.json();

      loadData(blocks, chains);
    }
    load();
  }, [loadData]);

  // Listen for hash changes (paste URL in same tab)
  const applyHash = useCallback(() => {
    const parsed = loadFromUrlHashLive();
    if (parsed) {
      clearUrlHash();
      useSimulationStore.setState({
        blockStates: parsed.state.blockStates,
        year: parsed.state.year,
        perspective: parsed.state.perspective,
        adversaryOc: parsed.state.adversaryOc,
        sliders: parsed.state.sliders,
        modelServedExternally: parsed.state.modelServedExternally,
        expertMode: parsed.state.expertMode,
        scenarioName: parsed.name ?? null,
        viewingShared: true,
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [applyHash]);

  useEffect(() => {
    const el = rightPanelRef.current;
    if (!el) return;
    setRightPanelWidth(el.offsetWidth);
    const obs = new ResizeObserver(() => {
      setRightPanelWidth(el.offsetWidth);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [dataLoaded]);

  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading simulation data...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Mobile gate */}
      <div className="md:hidden fixed inset-0 z-[200] bg-gray-950 flex flex-col items-center justify-center p-8 text-center">
        <span className="text-4xl mb-4">🖥️</span>
        <h1 className="text-lg font-semibold text-gray-100 mb-2">Desktop Required</h1>
        <p className="text-sm text-gray-400 max-w-[280px]">
          This interactive simulation needs a larger screen to display properly. Please open it on a desktop or laptop.
        </p>
      </div>

      <Header onShowIntro={() => setShowIntro(true)} />
      <SharedBanner />
      {showIntro && <IntroOverlay onClose={() => setShowIntro(false)} />}

      <div className="relative flex-1 overflow-hidden">
        {/* Main view area — scrollable */}
        <div className="absolute inset-0 overflow-auto p-4">
          <div className="mb-2 flex items-center gap-4">
            {/* View toggle */}
            <div className="flex items-center gap-0.5 bg-gray-800 rounded p-0.5">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${viewMode === "grid" ? "bg-gray-700 text-gray-200" : "text-gray-500 hover:text-gray-300"}`}
                title="Category Grid"
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode("rings")}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${viewMode === "rings" ? "bg-gray-700 text-gray-200" : "text-gray-500 hover:text-gray-300"}`}
                title="Defense Rings"
              >
                Rings
              </button>
            </div>

            <span className="text-xs text-gray-600">
              Click for details | Right-click to cycle state
            </span>
            {viewMode === "grid" && (
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <LegendItem color="bg-blue-600" label="Hard stop" tip="Binary — blocks completely or doesn't. Immune to AI erosion." />
                <LegendItem color="bg-amber-600" label="Probabilistic" tip="Reduces probability but can be bypassed. Degrades with AI." />
                <LegendItem color="bg-teal-600" label="Hybrid" tip="Hard-stop core + probabilistic detection layers." />
                <span className="relative flex items-center gap-1 group cursor-default">
                  <span className="w-2 h-2 rounded-sm border border-dashed border-amber-500" /> Over budget
                  <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 text-[10px] text-gray-200 bg-gray-800 border border-gray-700 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    Block cost pushes total above budget slider limit
                  </span>
                </span>
              </div>
            )}
          </div>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
            {viewMode === "grid" ? (
              <BlockGrid onSelectBlock={setSelectedBlock} />
            ) : (
              <DefenseRings onSelectBlock={setSelectedBlock} />
            )}
          </div>
        </div>

        {/* Zoom control — top right, shifts left with right panels */}
        <div
          className="absolute top-3 z-20 flex items-center gap-1.5 bg-gray-900/90 border border-gray-700 rounded px-2 py-1 backdrop-blur-sm transition-[right] duration-200"
          style={{ right: rightPanelWidth + 12 }}
        >
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            className="text-xs text-gray-400 hover:text-gray-200 w-4 h-4 flex items-center justify-center"
          >
            −
          </button>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-16 accent-violet-500 h-1"
          />
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            className="text-xs text-gray-400 hover:text-gray-200 w-4 h-4 flex items-center justify-center"
          >
            +
          </button>
          <span className="text-[10px] text-gray-500 w-7 text-center">{Math.round(zoom * 100)}%</span>
        </div>

        {/* Right panels — overlay on top of grid */}
        <div ref={rightPanelRef} className="absolute top-0 right-0 h-full z-10">
          <RightPanels
            selectedBlock={selectedBlock}
            onCloseBlock={() => setSelectedBlock(null)}
          />
        </div>
      </div>

      <BottomPanel />
    </div>
  );
}

function LegendItem({ color, label, tip }: { color: string; label: string; tip: string }) {
  return (
    <span className="relative flex items-center gap-1 group cursor-default">
      <span className={`w-2 h-2 rounded-sm ${color}`} /> {label}
      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 text-[10px] text-gray-200 bg-gray-800 border border-gray-700 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {tip}
      </span>
    </span>
  );
}

export default App;
