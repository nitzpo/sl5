import { useEffect, useRef, useState } from "react";
import type { Block, BlockState, Sliders } from "../../engine/types";
import { blockEffectiveness, aiDegradation } from "../../engine/scoring";
import { getAiCapability } from "../../engine/ai-curve";
import { useSimulationStore } from "../../store/simulation";
import { formatCost } from "../../utils/format";

interface BlockTooltipProps {
  block: Block;
  state: BlockState;
  year: number;
  sliders: Sliders;
  anchorRect: DOMRect | null;
}

export function BlockTooltip({
  block,
  state,
  year,
  sliders,
  anchorRect,
}: BlockTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const modelServed = useSimulationStore((s) => s.modelServedExternally);

  const effectiveness = blockEffectiveness(block, state, year, sliders);
  const degradation = aiDegradation(block, year, sliders.ai_timeline);
  const showErosion = degradation > 0.02 && block.defense_type !== "hard_stop";

  const aiCap = getAiCapability(year, sliders.ai_timeline);
  const effectiveOc = adversaryOc + block.adversary_exploitation.ai_oc_shift * aiCap;
  const beyondAdversary = block.adversary_exploitation.oc_threshold_to_exploit > effectiveOc;
  const SERVING_ONLY = new Set(["AI-07", "AI-08", "AI-04", "NET-04"]);
  const irrelevantAirgapped = !modelServed && SERVING_ONLY.has(block.id);

  useEffect(() => {
    if (!anchorRect || !ref.current) return;
    const tipRect = ref.current.getBoundingClientRect();
    const spaceAbove = anchorRect.top;
    const spaceBelow = window.innerHeight - anchorRect.bottom;

    let top: number;
    if (spaceAbove > tipRect.height + 8) {
      top = anchorRect.top - tipRect.height - 6;
    } else {
      top = anchorRect.bottom + 6;
    }

    let left = anchorRect.left + anchorRect.width / 2 - tipRect.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));

    setPosition({ top, left });
  }, [anchorRect]);

  if (!anchorRect) return null;

  return (
    <div
      ref={ref}
      className="fixed z-[100] pointer-events-none px-3 py-2 rounded-md bg-gray-800 border border-gray-700 shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      <div className="text-xs font-medium text-gray-100 whitespace-nowrap">
        {block.id}: {block.name}
      </div>
      <div className="text-[11px] text-gray-400 mt-0.5">
        {state} | effectiveness: {Math.round(effectiveness * 100)}% |{" "}
        {formatCost(block.dimensions.cost.upfront_millions.min)}-
        {formatCost(block.dimensions.cost.upfront_millions.max)}
        {showErosion && (
          <span className="text-red-400 ml-1">
            (AI erosion: -{Math.round(degradation * 100)}%)
          </span>
        )}
      </div>
      {beyondAdversary && state === "not_started" && (
        <div className="text-[10px] text-gray-500 mt-0.5">
          Dimmed: OC{adversaryOc} adversary can't exploit this (needs OC{block.adversary_exploitation.oc_threshold_to_exploit}+)
        </div>
      )}
      {irrelevantAirgapped && (
        <div className="text-[10px] text-gray-500 mt-0.5">
          Dimmed: only relevant when model is served externally
        </div>
      )}
    </div>
  );
}
