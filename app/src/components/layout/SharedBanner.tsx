import { useSimulationStore } from "../../store/simulation";

export function SharedBanner() {
  const viewingShared = useSimulationStore((s) => s.viewingShared);
  const scenarioName = useSimulationStore((s) => s.scenarioName);
  const saveShared = useSimulationStore((s) => s.saveShared);
  const restoreMine = useSimulationStore((s) => s.restoreMine);
  if (!viewingShared) return null;
  return (
    <div className="flex items-center gap-4 border-b border-ink bg-tint px-6 py-1.5 text-[13px]" role="status">
      <span>
        <b>{scenarioName ? `Viewing “${scenarioName}”` : "Viewing a shared posture"}</b>
        <span className="text-ink-2"> — your own posture is untouched.</span>
      </span>
      <button type="button" onClick={saveShared} className="border border-ink bg-ink px-2 py-0.5 font-semibold text-paper">
        Keep this as mine
      </button>
      <button type="button" onClick={restoreMine} className="font-semibold underline underline-offset-2">
        Back to mine
      </button>
    </div>
  );
}
