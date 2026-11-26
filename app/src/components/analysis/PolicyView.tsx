import { useMemo } from "react";
import { useSimulationStore } from "../../store/simulation";
import { policyLeverImpacts } from "../../utils/policy-levers";
import { formatSl } from "../../utils/format";

export function PolicyView() {
  const blocks = useSimulationStore((s) => s.blocks);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const advanceOrder = useSimulationStore((s) => s.advanceOrder);
  const year = useSimulationStore((s) => s.year);
  const sliders = useSimulationStore((s) => s.sliders);
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const attackChains = useSimulationStore((s) => s.attackChains);
  const modelServedExternally = useSimulationStore((s) => s.modelServedExternally);

  // The current posture and each lever's what-if both go through the shared
  // pipeline (`scorePosture`), so "current" here is the Score card's SL and the
  // deltas include the slider the lever actually moves.
  const { current, levers } = useMemo(
    () =>
      policyLeverImpacts({
        blocks,
        chains: attackChains,
        blockStates,
        advanceOrder,
        year,
        sliders,
        adversaryOc,
        modelServedExternally,
      }),
    [blocks, attackChains, blockStates, advanceOrder, year, sliders, adversaryOc, modelServedExternally]
  );
  const currentSl = current.overallSl;

  // Industry bottlenecks
  const bottlenecks = useMemo(() => {
    const highScarcity = blocks
      .filter((b) => b.dimensions.supply_scarcity.value >= 65)
      .sort((a, b) => b.dimensions.supply_scarcity.value - a.dimensions.supply_scarcity.value)
      .slice(0, 5);
    return highScarcity;
  }, [blocks]);

  return (
    <div className="space-y-4">
      {/* Policy levers */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Policy Lever Impact
        </h3>
        <div className="space-y-2">
          {levers.map((lever) => (
            <div key={lever.lever} className="bg-gray-900 rounded p-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-200">
                  {lever.lever}
                </span>
                <span
                  className={`text-xs font-mono ${
                    lever.slDelta > 0.3
                      ? "text-emerald-400"
                      : lever.slDelta > 0.1
                        ? "text-amber-400"
                        : "text-gray-500"
                  }`}
                >
                  {lever.slDelta > 0 ? "+" : ""}
                  {formatSl(lever.slDelta)} SL
                </span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                {lever.currentValue.toFixed(1)} → {Math.max(lever.currentValue, lever.targetValue).toFixed(1)}
                {Math.abs(lever.breachDelta) >= 0.0005 && (
                  <span className="ml-2">
                    breach {lever.breachDelta < 0 ? "−" : "+"}
                    {(Math.abs(lever.breachDelta) * 100).toFixed(1)}pt
                  </span>
                )}
              </div>
              {lever.unlockedBlocks.length > 0 && (
                <div className="text-[10px] text-emerald-500 mt-1">
                  Unlocks: {lever.unlockedBlocks.join(", ")}
                </div>
              )}
              {lever.acceleratedBlocks.length > 0 && (
                <div className="text-[10px] text-blue-400 mt-0.5">
                  Accelerates: {lever.acceleratedBlocks.join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Regulation scenario */}
      <div className="bg-gray-900 rounded p-2.5">
        <h3 className="text-xs font-semibold text-gray-400 mb-1.5">
          "Require SL4 for frontier models"
        </h3>
        <div className="text-[10px] text-gray-500 space-y-0.5">
          <div>
            Gap from current: {formatSl(Math.max(0, 4.0 - currentSl))} SL
          </div>
          <div>
            Blocks not deployed:{" "}
            {blocks.filter(
              (b) =>
                (current.effectiveStates[b.id] ?? "not_started") !== "deployed" &&
                (current.effectiveStates[b.id] ?? "not_started") !== "mature"
            ).length}{" "}
            / {blocks.length}
          </div>
          <div>
            Blocks with SL4 requirement:{" "}
            {blocks.filter((b) => b.sl_requirement.first_required <= 4).length}
          </div>
        </div>
      </div>

      {/* Industry bottlenecks */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          Industry Bottlenecks
        </h3>
        <div className="space-y-1.5">
          {bottlenecks.map((b) => (
            <div key={b.id} className="flex items-start gap-2 text-xs">
              <span className="text-gray-500 shrink-0">{b.id}</span>
              <span className="text-gray-400 flex-1">
                {b.dimensions.supply_scarcity.bottleneck}
              </span>
              <span className="text-red-400 shrink-0">
                {b.dimensions.supply_scarcity.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
