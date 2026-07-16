import { useEffect, useState, useCallback } from "react";
import { usePanDrag } from "./utils/use-pan-drag";
import { useSimulationStore } from "./store/simulation";
import { loadFromUrlHashLive, clearUrlHash } from "./store/persistence";
import { Header } from "./components/layout/Header";
import { IntroOverlay } from "./components/overlays/IntroOverlay";
import { SharedBanner } from "./components/layout/SharedBanner";
import { BottomPanel } from "./components/layout/BottomPanel";
import { RightPanels } from "./components/layout/RightPanels";
import { BlockGrid } from "./components/blocks/BlockGrid";
import { DefenseRings } from "./components/rings/DefenseRings";
import { ChainStrip } from "./components/analysis/ChainStrip";
import { useViewStore } from "./store/view";
import type { BadgeKey } from "./store/view";
import type { Block } from "./engine/types";

function App() {
  const loadData = useSimulationStore((s) => s.loadData);
  const dataLoaded = useSimulationStore((s) => s.dataLoaded);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [scoreOpen, setScoreOpen] = useState(true);
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem("sl5_intro_seen"));

  // Selecting a block reveals its detail in the score panel (open it if collapsed).
  const selectBlock = (block: Block | null) => {
    setSelectedBlock(block);
    if (block) setScoreOpen(true);
  };
  const [viewMode, setViewMode] = useState<"grid" | "rings">("grid");
  const [zoom, setZoom] = useState(1);
  const { ref: panRef, dragging, overflowing, onPointerDown: onPanPointerDown } =
    usePanDrag();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

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

      const fetchJson = async (file: string) => {
        const resp = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
        if (!resp.ok) throw new Error(`${file}: HTTP ${resp.status}`);
        return resp.json();
      };

      const [chains, worldState, ...blockArrays] = await Promise.all([
        fetchJson("attack-chains.json"),
        fetchJson("world-state.json"),
        ...blockFiles.map(fetchJson),
      ]);
      const blocks: Block[] = blockArrays.flat();

      loadData(blocks, chains, worldState?.oc_definitions ?? []);
    }
    load().catch((err: unknown) => {
      setLoadError(err instanceof Error ? err.message : String(err));
    });
  }, [loadData, loadAttempt]);

  // Listen for hash changes (paste URL in same tab)
  const applyHash = useCallback(() => {
    const parsed = loadFromUrlHashLive();
    if (parsed) {
      clearUrlHash();
      useSimulationStore.setState({
        blockStates: parsed.state.blockStates,
        advanceOrder:
          parsed.state.advanceOrder ??
          Object.keys(parsed.state.blockStates).filter(
            (id) => parsed.state.blockStates[id] !== "not_started"
          ),
        year: parsed.state.year,
        perspective: parsed.state.perspective,
        adversaryOc: parsed.state.adversaryOc,
        sliders: parsed.state.sliders,
        modelServedExternally: parsed.state.modelServedExternally,
        scenarioName: parsed.name ?? null,
        viewingShared: true,
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [applyHash]);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <span className="text-red-400 text-sm">Failed to load simulation data</span>
        <span className="text-gray-500 text-xs font-mono">{loadError}</span>
        <button
          onClick={() => {
            setLoadError(null);
            setLoadAttempt((n) => n + 1);
          }}
          className="px-4 py-1.5 text-sm rounded bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

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

      <div className="relative flex flex-1 overflow-hidden">
        {/* Main view area — fixed controls on top, a pannable canvas below.
            The page itself never scrolls; only the canvas viewport does, and it
            hides its scrollbars (trackpad + drag-to-pan move the view instead). */}
        <div className="relative flex-1 flex flex-col overflow-hidden">
          <div className="shrink-0 px-4 pt-4">
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

            <span className="text-xs text-gray-600 whitespace-nowrap hidden xl:inline">
              Click for details | Right-click to cycle state
            </span>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
              <LegendItem color="bg-blue-600" label="Hard stop" tip="Binary — blocks completely or doesn't. Immune to AI erosion." />
              <LegendItem color="bg-amber-600" label="Probabilistic" tip="Reduces probability but can be bypassed. Degrades with AI." />
              <LegendItem color="bg-teal-600" label="Hybrid" tip="Hard-stop core + probabilistic detection layers." />
              <span className="w-px h-3 bg-gray-700" />
              <ToggleLegendItem
                badge="startNow"
                swatch={<span className="w-2 h-2 rounded-full bg-red-500 text-[8px] leading-none text-white flex items-center justify-center font-bold">!</span>}
                label="Start now"
                tip="Deployment window closing — must start soon to be ready by 2030. Click to toggle."
              />
              {viewMode === "grid" && (
                <>
                  <ToggleLegendItem
                    badge="requires"
                    swatch={<span className="text-sky-400 text-[10px] leading-none">→</span>}
                    label="Requires"
                    tip="Hover/select a block: solid arrows point from its prerequisites into it. A deployed block with a missing prerequisite is capped (dotted sky ring). Click to toggle."
                  />
                  <ToggleLegendItem
                    badge="enhances"
                    swatch={<span className="text-sky-400 text-[10px] leading-none tracking-tighter">⇢</span>}
                    label="Enhances"
                    tip="Dashed lines point to blocks this one makes more effective. Click to toggle."
                  />
                </>
              )}
              <ToggleLegendItem
                badge="contested"
                swatch={<span className="w-2 h-2 rounded-full bg-gray-800 border border-slate-400 text-[8px] leading-none text-slate-300 flex items-center justify-center font-bold">?</span>}
                label="Contested"
                tip="Experts disagree on feasibility — high or fundamental open questions. Click to toggle."
              />
              <ToggleLegendItem
                badge="overBudget"
                swatch={<span className="w-2 h-2 rounded-sm border border-dashed border-pink-500" />}
                label="Over budget"
                tip="Cost exceeds budget — effectiveness capped at Implementing level. Click to toggle."
              />
            </div>
          </div>
          <ChainStrip />
          </div>

          {/* Pannable canvas viewport: hides its scrollbars; trackpad scrolls in
              any direction, and dragging empty space pans it like a map. */}
          <div
            ref={panRef}
            onPointerDown={onPanPointerDown}
            className={`relative flex-1 overflow-auto no-scrollbar px-4 pb-4 ${
              dragging ? "cursor-grabbing" : overflowing ? "cursor-grab" : ""
            }`}
          >
            <div
              className="w-full"
              style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
            >
              {viewMode === "grid" ? (
                <BlockGrid
                  onSelectBlock={selectBlock}
                  selectedBlock={selectedBlock}
                  onClearSelection={() => setSelectedBlock(null)}
                />
              ) : (
                <DefenseRings
                  onSelectBlock={selectBlock}
                  onClearSelection={() => setSelectedBlock(null)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Zoom control — stable bottom-left corner (map-style), never moves */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center bg-gray-900/90 border border-gray-700 rounded-lg backdrop-blur-sm shadow-lg overflow-hidden">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.1) * 10) / 10))}
            className="text-base text-gray-300 hover:text-white hover:bg-gray-800 w-7 h-7 flex items-center justify-center transition-colors"
            title="Zoom out"
          >
            −
          </button>
          <button
            onClick={() => setZoom(1)}
            className="text-[11px] text-gray-400 hover:text-gray-200 w-12 h-7 flex items-center justify-center border-x border-gray-700 transition-colors"
            title="Reset to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(2, Math.round((z + 0.1) * 10) / 10))}
            className="text-base text-gray-300 hover:text-white hover:bg-gray-800 w-7 h-7 flex items-center justify-center transition-colors"
            title="Zoom in"
          >
            +
          </button>
        </div>

        {/* Right panels — in-flow flex column, canvas is never occluded */}
        <div className="shrink-0 h-full">
          <RightPanels
            selectedBlock={selectedBlock}
            onCloseBlock={() => setSelectedBlock(null)}
            onNavigateBlock={(id) => {
              const b = useSimulationStore.getState().blocks.find((x) => x.id === id);
              if (b) selectBlock(b);
            }}
            scoreOpen={scoreOpen}
            onScoreOpenChange={setScoreOpen}
          />
        </div>
      </div>

      <BottomPanel />
    </div>
  );
}

function LegendItem({ color, label, tip }: { color: string; label: string; tip: string }) {
  return (
    <span className="relative flex items-center gap-1 group cursor-default whitespace-nowrap">
      <span className={`w-2 h-2 rounded-sm ${color}`} /> {label}
      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 text-[10px] text-gray-200 bg-gray-800 border border-gray-700 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {tip}
      </span>
    </span>
  );
}

function ToggleLegendItem({
  badge,
  swatch,
  label,
  tip,
}: {
  badge: BadgeKey;
  swatch: React.ReactNode;
  label: string;
  tip: string;
}) {
  const on = useViewStore((s) => s.badges[badge]);
  const toggleBadge = useViewStore((s) => s.toggleBadge);
  return (
    <button
      onClick={() => toggleBadge(badge)}
      aria-pressed={on}
      className={`relative flex items-center gap-1 group transition-opacity whitespace-nowrap ${
        on ? "" : "opacity-35"
      }`}
    >
      {swatch}
      <span className={on ? "" : "line-through"}>{label}</span>
      <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 text-[10px] text-gray-200 bg-gray-800 border border-gray-700 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {on ? tip : `${label} hidden — click to show`}
      </span>
    </button>
  );
}

export default App;
