import { useState } from "react";
import type { Block, Perspective } from "../../engine/types";
import { useSimulationStore } from "../../store/simulation";
import { ScoreCard } from "../analysis/ScoreCard";
import { CisoView } from "../analysis/CisoView";
import { AttackerView } from "../analysis/AttackerView";
import { PolicyView } from "../analysis/PolicyView";
import { ObserverView } from "../analysis/ObserverView";
import { BlockDetail } from "../blocks/BlockDetail";

const PERSPECTIVES: { key: Perspective; label: string }[] = [
  { key: "ciso", label: "CISO" },
  { key: "attacker", label: "Attacker" },
  { key: "policymaker", label: "Policy" },
  { key: "observer", label: "Observer" },
];

interface RightPanelsProps {
  selectedBlock: Block | null;
  onCloseBlock: () => void;
  onNavigateBlock?: (blockId: string) => void;
  // Score/detail panel open state is owned by the parent so selecting a block
  // (which happens in the parent) can reveal it without a setState-in-effect.
  scoreOpen: boolean;
  onScoreOpenChange: (open: boolean) => void;
}

export function RightPanels({
  selectedBlock,
  onCloseBlock,
  onNavigateBlock,
  scoreOpen,
  onScoreOpenChange,
}: RightPanelsProps) {
  // Perspective panel starts minimized on first-ever load, then remembers the
  // user's choice across reloads (localStorage bit, like sl5_intro_seen —
  // useViewStore is intentionally non-persisted).
  const [perspectiveOpen, setPerspectiveOpen] = useState(
    () => localStorage.getItem("sl5_perspective_open") === "1"
  );
  const togglePerspective = (open: boolean) => {
    setPerspectiveOpen(open);
    localStorage.setItem("sl5_perspective_open", open ? "1" : "0");
  };
  const perspective = useSimulationStore((s) => s.perspective);
  const setPerspective = useSimulationStore((s) => s.setPerspective);

  return (
    <div className="flex h-full shadow-xl">
      {/* Block Detail panel — innermost (against the map, nearest the eye).
          Present only while a block is selected; its own ✕ or clicking empty
          map closes it, clicking another block replaces its contents. */}
      {selectedBlock && (
        <div className="w-80 border-l border-gray-800 bg-gray-950 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-800 px-3 py-1.5 shrink-0">
            <span className="text-xs text-gray-500 font-medium">Block Detail</span>
            <button
              onClick={onCloseBlock}
              className="text-gray-600 hover:text-gray-400 text-sm leading-none px-1"
              title="Close"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-3">
            <BlockDetail block={selectedBlock} onNavigate={onNavigateBlock} />
          </div>
        </div>
      )}

      {/* Perspective panel (CISO / Attacker / Policy / Observer) */}
      {perspectiveOpen ? (
        <div className="w-80 border-l border-gray-800 bg-gray-950 flex flex-col overflow-hidden">
          {/* Tabs at top */}
          <div className="flex items-center border-b border-gray-800 px-2 py-1.5 shrink-0">
            {PERSPECTIVES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPerspective(key)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  perspective === key
                    ? "bg-gray-700 text-gray-100"
                    : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => togglePerspective(false)}
              className="ml-auto text-gray-600 hover:text-gray-400 text-xs px-1"
              title="Collapse"
            >
              →
            </button>
          </div>
          {/* Perspective content */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3">
            {perspective === "ciso" && <CisoView />}
            {perspective === "attacker" && <AttackerView />}
            {perspective === "policymaker" && <PolicyView />}
            {perspective === "observer" && <ObserverView />}
          </div>
        </div>
      ) : (
        // Collapsed: a rail of vertical tabs — one per perspective — so it's
        // clear the panel holds several analyses, not just the current one.
        // Clicking a tab both expands the panel and switches to that view.
        <div className="w-8 border-l border-gray-800 bg-gray-900 flex flex-col items-stretch">
          <button
            onClick={() => togglePerspective(true)}
            className="h-7 shrink-0 flex items-center justify-center text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors border-b border-gray-800"
            title="Expand panel"
          >
            <span className="text-xs leading-none">‹</span>
          </button>
          {PERSPECTIVES.map(({ key, label }) => {
            const active = perspective === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setPerspective(key);
                  togglePerspective(true);
                }}
                aria-pressed={active}
                title={`${label} view`}
                className={`flex-1 flex items-center justify-center transition-colors ${
                  active
                    ? "bg-gray-800 text-gray-100"
                    : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/60"
                }`}
              >
                <span
                  className={`text-[10px] [writing-mode:vertical-lr] rotate-180 tracking-wide ${
                    active ? "font-semibold" : ""
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Security Posture panel (outermost, right side) */}
      {scoreOpen ? (
        <div className="w-80 border-l border-gray-800 bg-gray-950 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-800 px-3 py-1.5 shrink-0">
            <span className="text-xs text-gray-500 font-medium">
              Security Posture
            </span>
            <button
              onClick={() => onScoreOpenChange(false)}
              className="text-gray-600 hover:text-gray-400 text-xs px-1"
              title="Collapse"
            >
              →
            </button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-3">
            <ScoreCard />
          </div>
        </div>
      ) : (
        <button
          onClick={() => onScoreOpenChange(true)}
          className="w-6 border-l border-gray-800 bg-gray-900 flex items-center justify-center hover:bg-gray-800 transition-colors"
          title="Show Security Posture panel"
        >
          <span className="text-[10px] text-gray-500 [writing-mode:vertical-lr] rotate-180">
            Posture
          </span>
        </button>
      )}
    </div>
  );
}
