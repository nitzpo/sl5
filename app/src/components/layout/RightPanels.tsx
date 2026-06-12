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
}

export function RightPanels({ selectedBlock, onCloseBlock, onNavigateBlock }: RightPanelsProps) {
  const [scoreOpen, setScoreOpen] = useState(true);
  const [perspectiveOpen, setPerspectiveOpen] = useState(true);
  const perspective = useSimulationStore((s) => s.perspective);
  const setPerspective = useSimulationStore((s) => s.setPerspective);

  // If a block is selected, it takes over the score panel area
  const showBlockDetail = selectedBlock !== null;

  return (
    <div className="flex h-full shadow-xl">
      {/* Perspective panel (wider, left of score panel) */}
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
              onClick={() => setPerspectiveOpen(false)}
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
        <button
          onClick={() => setPerspectiveOpen(true)}
          className="w-6 border-l border-gray-800 bg-gray-900 flex items-center justify-center hover:bg-gray-800 transition-colors"
          title="Show perspective panel"
        >
          <span className="text-[10px] text-gray-500 [writing-mode:vertical-lr] rotate-180">
            {PERSPECTIVES.find((p) => p.key === perspective)?.label ?? "View"}
          </span>
        </button>
      )}

      {/* Score panel (narrow, right side) */}
      {scoreOpen ? (
        <div className="w-80 border-l border-gray-800 bg-gray-950 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-800 px-3 py-1.5 shrink-0">
            <span className="text-xs text-gray-500 font-medium">
              {showBlockDetail ? "Block Detail" : "Security Posture"}
            </span>
            <button
              onClick={() => setScoreOpen(false)}
              className="text-gray-600 hover:text-gray-400 text-xs px-1"
              title="Collapse"
            >
              →
            </button>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-3">
            {showBlockDetail ? (
              <BlockDetail
                block={selectedBlock!}
                onClose={onCloseBlock}
                onNavigate={onNavigateBlock}
              />
            ) : (
              <ScoreCard />
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setScoreOpen(true)}
          className="w-6 border-l border-gray-800 bg-gray-900 flex items-center justify-center hover:bg-gray-800 transition-colors"
          title="Show score panel"
        >
          <span className="text-[10px] text-gray-500 [writing-mode:vertical-lr] rotate-180">
            {showBlockDetail ? "Detail" : "Score"}
          </span>
        </button>
      )}
    </div>
  );
}
