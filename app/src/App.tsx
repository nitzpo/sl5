import { useEffect, useState } from "react";
import { useSimulationStore } from "./store/simulation";
import { Header } from "./components/layout/Header";
import { BlockGrid } from "./components/blocks/BlockGrid";
import { BlockDetail } from "./components/blocks/BlockDetail";
import { ScoreCard } from "./components/analysis/ScoreCard";
import type { Block } from "./engine/types";

function App() {
  const loadData = useSimulationStore((s) => s.loadData);
  const dataLoaded = useSimulationStore((s) => s.dataLoaded);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);

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
        const resp = await fetch(`/data/${file}`);
        const data = await resp.json();
        blocks.push(...data);
      }

      const chainsResp = await fetch("/data/attack-chains.json");
      const chains = await chainsResp.json();

      loadData(blocks, chains);
    }
    load();
  }, [loadData]);

  if (!dataLoaded) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading simulation data...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Block Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-2 flex items-center gap-4">
            <span className="text-xs text-gray-600">
              Click for details | Right-click to cycle state
            </span>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-blue-600" /> Hard stop
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-amber-600" /> Probabilistic
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-teal-600" /> Hybrid
              </span>
            </div>
          </div>
          <BlockGrid onSelectBlock={setSelectedBlock} />
        </div>

        {/* Right panel: Analysis / Detail */}
        <div className="w-80 border-l border-gray-800 overflow-y-auto bg-gray-950">
          {selectedBlock ? (
            <BlockDetail
              block={selectedBlock}
              onClose={() => setSelectedBlock(null)}
            />
          ) : (
            <div className="p-4">
              <ScoreCard />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
