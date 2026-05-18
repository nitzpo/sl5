import { useSimulationStore } from "../../store/simulation";
import { ScoreCard } from "./ScoreCard";
import { CisoView } from "./CisoView";
import { AttackerView } from "./AttackerView";
import { PolicyView } from "./PolicyView";
import { ObserverView } from "./ObserverView";

export function AnalysisPanel() {
  const perspective = useSimulationStore((s) => s.perspective);

  return (
    <div className="space-y-4">
      <ScoreCard />

      {perspective === "ciso" && <CisoView />}
      {perspective === "attacker" && <AttackerView />}
      {perspective === "policymaker" && <PolicyView />}
      {perspective === "observer" && <ObserverView />}
    </div>
  );
}
