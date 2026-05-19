import { useSimulationStore } from "../../store/simulation";

export function SharedBanner() {
  const viewingShared = useSimulationStore((s) => s.viewingShared);
  const saveShared = useSimulationStore((s) => s.saveShared);
  const restoreMine = useSimulationStore((s) => s.restoreMine);

  if (!viewingShared) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 bg-violet-950/80 border-b border-violet-800 text-xs">
      <span className="text-violet-300">Viewing a shared scenario</span>
      <button
        onClick={saveShared}
        className="px-2 py-0.5 rounded bg-violet-700 text-violet-100 hover:bg-violet-600"
      >
        Save as mine
      </button>
      <button
        onClick={restoreMine}
        className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700"
      >
        Restore mine
      </button>
    </div>
  );
}
