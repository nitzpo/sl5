import type { Block, BlockState } from "../../engine/types";
import { useSimulationStore } from "../../store/simulation";
import { blockEffectiveness } from "../../engine/scoring";
import { DEFENSE_COLORS } from "../../utils/colors";
import { formatCost } from "../../utils/format";

interface BlockDetailProps {
  block: Block;
  onClose: () => void;
}

const STATE_LABELS: Record<BlockState, string> = {
  not_started: "Not Started",
  investing: "Investing",
  implementing: "Implementing",
  deployed: "Deployed",
  mature: "Mature",
};

export function BlockDetail({ block, onClose }: BlockDetailProps) {
  const blockStates = useSimulationStore((s) => s.blockStates);
  const setBlockState = useSimulationStore((s) => s.setBlockState);
  const year = useSimulationStore((s) => s.year);
  const aiTimeline = useSimulationStore((s) => s.sliders.ai_timeline);

  const state = (blockStates[block.id] ?? "not_started") as BlockState;
  const eff = blockEffectiveness(block, state, year, aiTimeline);
  const color = DEFENSE_COLORS[block.defense_type];

  return (
    <div className="p-2.5 text-sm space-y-2.5 overflow-y-auto max-h-full">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-100">
            {block.id}: {block.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-gray-400 capitalize">
              {block.defense_type.replace("_", " ")}
            </span>
            <span className="text-xs text-gray-500">|</span>
            <span className="text-xs text-gray-400">
              SL{block.sl_requirement.first_required} required
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 text-lg leading-none"
        >
          x
        </button>
      </div>

      <p className="text-gray-400 text-xs leading-relaxed">
        {block.description}
      </p>

      {/* State selector */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">State</label>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(STATE_LABELS) as BlockState[]).map((s) => (
            <button
              key={s}
              onClick={() => setBlockState(block.id, s)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                state === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {STATE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Effectiveness */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Effectiveness:</span>
        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${eff * 100}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-xs text-gray-300 w-8 text-right">
          {Math.round(eff * 100)}%
        </span>
      </div>

      {/* Dimensions */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-900 rounded p-2">
          <div className="text-gray-500">Feasibility</div>
          <div className="text-gray-200">
            {block.dimensions.technical_feasibility.value}%
          </div>
        </div>
        <div className="bg-gray-900 rounded p-2">
          <div className="text-gray-500">Deploy Time</div>
          <div className="text-gray-200">
            {block.dimensions.time_to_deploy_months.min}-
            {block.dimensions.time_to_deploy_months.max}mo
          </div>
        </div>
        <div className="bg-gray-900 rounded p-2">
          <div className="text-gray-500">Upfront Cost</div>
          <div className="text-gray-200">
            {formatCost(block.dimensions.cost.upfront_millions.min)}-
            {formatCost(block.dimensions.cost.upfront_millions.max)}
          </div>
        </div>
        <div className="bg-gray-900 rounded p-2">
          <div className="text-gray-500">Org Readiness</div>
          <div className="text-gray-200">
            {block.dimensions.organizational_readiness.value}%
          </div>
        </div>
        <div className="bg-gray-900 rounded p-2">
          <div className="text-gray-500">Vendor Dep.</div>
          <div className="text-gray-200">
            {block.dimensions.vendor_dependency.value}%
          </div>
        </div>
        <div className="bg-gray-900 rounded p-2">
          <div className="text-gray-500">AI OC Shift</div>
          <div className="text-gray-200">
            +{block.adversary_exploitation.ai_oc_shift}
          </div>
        </div>
      </div>

      {/* Exploit narrative */}
      <div>
        <div className="text-xs text-gray-500 mb-1">If absent:</div>
        <p className="text-xs text-gray-400 leading-relaxed">
          {block.adversary_exploitation.exploit_narrative}
        </p>
      </div>

      {/* Open questions */}
      {block.open_questions.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Open Questions</div>
          {block.open_questions.map((q, i) => (
            <div key={i} className="text-xs text-gray-400 mb-1">
              <span className="text-amber-500 mr-1">?</span>
              {q.question}
              <span className="text-gray-600 ml-1">
                [{q.uncertainty_level}]
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
