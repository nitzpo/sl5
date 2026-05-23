import { useEffect, useState, useCallback } from "react";
import { useSimulationStore } from "./store/simulation";
import { loadFromUrlHashLive, clearUrlHash } from "./store/persistence";
import { Header } from "./components/layout/Header";
import { IntroOverlay } from "./components/overlays/IntroOverlay";
import { SharedBanner } from "./components/layout/SharedBanner";
import { BottomPanel } from "./components/layout/BottomPanel";
import { RightPanels } from "./components/layout/RightPanels";
import { BlockGrid } from "./components/blocks/BlockGrid";
import type { Block } from "./engine/types";

function App() {
  const loadData = useSimulationStore((s) => s.loadData);
  const dataLoaded = useSimulationStore((s) => s.dataLoaded);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem("sl5_intro_seen"));

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

  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading simulation data...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header onShowIntro={() => setShowIntro(true)} />
      <SharedBanner />
      {showIntro && <IntroOverlay onClose={() => setShowIntro(false)} />}

      <div className="relative flex-1 overflow-hidden">
        {/* Block Grid — full area, scrollable */}
        <div className="absolute inset-0 overflow-auto p-4">
          <div className="mb-2 flex items-center gap-4">
            <span className="text-xs text-gray-600">
              Click for details | Right-click to cycle state
            </span>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <LegendItem color="bg-blue-600" label="Hard stop" tip="Binary — blocks completely or doesn't. Immune to AI erosion." />
              <LegendItem color="bg-amber-600" label="Probabilistic" tip="Reduces probability but can be bypassed. Degrades with AI." />
              <LegendItem color="bg-teal-600" label="Hybrid" tip="Hard-stop core + probabilistic detection layers." />
            </div>
          </div>
          <BlockGrid onSelectBlock={setSelectedBlock} />
        </div>

        {/* Right panels — overlay on top of grid */}
        <div className="absolute top-0 right-0 h-full z-10">
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
