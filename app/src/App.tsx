import { useEffect, useState } from "react";
import { useSimulationStore } from "./store/simulation";
import { Header } from "./components/layout/Header";
import { BottomPanel } from "./components/layout/BottomPanel";
import { RightPanels } from "./components/layout/RightPanels";
import { BlockGrid } from "./components/blocks/BlockGrid";
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

      <div className="relative flex-1 overflow-hidden">
        {/* Block Grid — full area, scrollable */}
        <div className="absolute inset-0 overflow-auto p-4">
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

export default App;
