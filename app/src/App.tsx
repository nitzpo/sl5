import { useCallback, useEffect, useState } from "react";
import { useSimulationStore } from "./store/simulation";
import { loadFromUrlHashLive, clearUrlHash } from "./store/persistence";
import { introSeen } from "./store/intro-seen";
import { useUiStore } from "./store/ui";
import { Header } from "./components/layout/Header";
import { SharedBanner } from "./components/layout/SharedBanner";
import { ViewBar } from "./components/layout/ViewBar";
import { IntroOverlay } from "./components/overlays/IntroOverlay";
import { StageMatrix } from "./components/catalogue/StageMatrix";
import { ClusterMap } from "./components/catalogue/ClusterMap";
import { ApproachLanes } from "./components/approaches/ApproachLanes";
import { RaceView } from "./components/race/RaceView";
import { VerdictRail } from "./components/rail/VerdictRail";
import { BlockDrawer } from "./components/detail/BlockDrawer";
import { ParametersDrawer } from "./components/params/ParametersDrawer";
import { PlaybackBar } from "./components/timelapse/PlaybackBar";
import { SCRIPTS } from "./timelapse/scripts";
import { usePlaybackStore } from "./timelapse/playback-store";
import { usePlaybackLoop } from "./timelapse/use-playback-loop";
import type { Block } from "./engine/types";

const BLOCK_FILES = [
  "blocks-network.json",
  "blocks-machine.json",
  "blocks-physical.json",
  "blocks-personnel.json",
  "blocks-supply-chain.json",
  "blocks-ai-specific.json",
  "blocks-future.json",
];

/** A story beat can point at a block or a scenario; show it in the catalogue
 * while the beat is on screen. */
function useStoryHighlights() {
  useEffect(
    () =>
      usePlaybackStore.subscribe(
        (s) => [s.state, s.currentAnnotation] as const,
        ([state, message]) => {
          const ui = useUiStore.getState();
          if (state === "idle") {
            ui.setFocusApproach(null);
            ui.setHighlight([]);
            return;
          }
          const script = usePlaybackStore.getState().activeScript;
          const beat = script?.annotations?.find((a) => a.message === message);
          const h = beat?.highlight;
          if (h?.type === "block") {
            ui.setHighlight([h.id]);
          } else if (h?.type === "chain") {
            const scenario = useSimulationStore.getState().threatModel.scenarios.find((s) => s.id === h.id);
            ui.setFocusApproach(scenario?.approach ?? null);
            ui.setHighlight([]);
          } else {
            ui.setHighlight([]);
          }
        },
        { equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1] }
      ),
    []
  );
}

function MainView() {
  const tab = useUiStore((s) => s.tab);
  const view = useUiStore((s) => s.catalogueView);
  if (tab === "approaches") return <ApproachLanes />;
  if (tab === "race") return <RaceView />;
  return view === "clusters" ? <ClusterMap /> : <StageMatrix />;
}

function App() {
  const loadData = useSimulationStore((s) => s.loadData);
  const dataLoaded = useSimulationStore((s) => s.dataLoaded);
  const [showIntro, setShowIntro] = useState(() => !introSeen());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const tab = useUiStore((s) => s.tab);
  const view = useUiStore((s) => s.catalogueView);

  usePlaybackLoop();
  useStoryHighlights();

  useEffect(() => {
    async function load() {
      const fetchJson = async (file: string) => {
        const resp = await fetch(`${import.meta.env.BASE_URL}data/${file}`);
        if (!resp.ok) throw new Error(`${file}: HTTP ${resp.status}`);
        return resp.json();
      };
      const [vectors, approaches, scenarios, worldState, ...blockArrays] = await Promise.all([
        fetchJson("vectors.json"),
        fetchJson("approaches.json"),
        fetchJson("scenarios.json"),
        fetchJson("world-state.json"),
        ...BLOCK_FILES.map(fetchJson),
      ]);
      const blocks: Block[] = blockArrays.flat();
      loadData(blocks, { vectors, approaches, scenarios }, worldState?.oc_definitions ?? []);
    }
    load().catch((err: unknown) => setLoadError(err instanceof Error ? err.message : String(err)));
  }, [loadData, loadAttempt]);

  // `?story=<id>` — the introduction's "Watch the 1-min story" CTA hands off
  // to the app with a script already running. Waits for dataLoaded because
  // startScript writes block states, then strips the param so a reload (or a
  // Share link built afterwards) doesn't restart the story.
  useEffect(() => {
    if (!dataLoaded) return;
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("story");
    if (!requested) return;
    params.delete("story");
    const query = params.toString();
    history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : "") + window.location.hash);
    const script = SCRIPTS.find((s) => s.id === requested);
    if (script) usePlaybackStore.getState().startScript(script);
  }, [dataLoaded]);

  // A share link pasted into this tab.
  const applyHash = useCallback(() => {
    const parsed = loadFromUrlHashLive();
    if (!parsed) return;
    clearUrlHash();
    useSimulationStore.getState().openShared(parsed.state, parsed.name);
  }, []);
  useEffect(() => {
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [applyHash]);

  if (loadError) {
    return (
      <div className="sl5 flex h-screen flex-col items-center justify-center gap-3 bg-paper font-archivo text-ink">
        <span className="text-[16px] font-bold">The model's data didn't load.</span>
        <span className="font-plex text-[12px] text-ink-2">{loadError}</span>
        <button
          type="button"
          onClick={() => {
            setLoadError(null);
            setLoadAttempt((n) => n + 1);
          }}
          className="border border-ink px-4 py-1.5 text-[14px] font-semibold hover:bg-ink hover:text-paper"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!dataLoaded) {
    return (
      <div className="sl5 flex h-screen items-center justify-center bg-paper font-archivo text-[14px] text-ink-2">
        Loading the catalogue…
      </div>
    );
  }

  // Narrow viewports never get here: `Root` renders `DesktopGate` instead.
  const fill = tab === "catalogue" && view === "clusters";
  return (
    <div className="sl5 flex h-screen flex-col bg-paper font-archivo text-ink">
      <Header onShowHelp={() => setShowIntro(true)} />
      <SharedBanner />
      {showIntro && <IntroOverlay onClose={() => setShowIntro(false)} />}
      <div className="relative flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col pr-6 pl-6">
          <ViewBar />
          <div id="main-view" role="tabpanel" className={`min-h-0 flex-1 ${fill ? "overflow-hidden" : "overflow-auto"}`}>
            <MainView />
          </div>
          <PlaybackBar />
        </main>
        <aside className="w-[392px] shrink-0 overflow-y-auto border-l border-rule px-6" aria-label="Verdict">
          <VerdictRail />
        </aside>
        <BlockDrawer />
        <ParametersDrawer />
      </div>
    </div>
  );
}

export default App;
