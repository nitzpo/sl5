import type { Block, BlockState } from "../../engine/types";
import { useSimulationStore } from "../../store/simulation";
import { blockEffectiveness } from "../../engine/scoring";
import { DEFENSE_COLORS, STATE_LABELS, STATE_ICONS } from "../../utils/colors";
import { BLOCK_SHORT_LABELS } from "../../utils/geometry";
import { formatCost, formatDeployRange } from "../../utils/format";

// Maturity order (matches STATE_LABELS / STATE_FILL_FRACTION progression).
const STATE_STEPS: BlockState[] = [
  "not_started",
  "investing",
  "implementing",
  "deployed",
  "mature",
];

// Compact labels so 5 segments fit the narrow panel.
const STATE_SHORT: Record<BlockState, string> = {
  not_started: "None",
  investing: "Invest",
  implementing: "Build",
  deployed: "Deploy",
  mature: "Mature",
};

interface BlockDetailProps {
  block: Block;
  onNavigate?: (blockId: string) => void;
}

export function BlockDetail({ block, onNavigate }: BlockDetailProps) {
  const blockStates = useSimulationStore((s) => s.blockStates);
  const setBlockState = useSimulationStore((s) => s.setBlockState);
  const year = useSimulationStore((s) => s.year);
  const sliders = useSimulationStore((s) => s.sliders);

  const state = (blockStates[block.id] ?? "not_started") as BlockState;
  const currentStateIndex = STATE_STEPS.indexOf(state);
  const eff = blockEffectiveness(block, state, year, sliders);
  const color = DEFENSE_COLORS[block.defense_type];

  return (
    <div className="p-2.5 text-sm space-y-2.5">
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
            Rec. SL{block.sl_requirement.first_recommended} | Req. SL{block.sl_requirement.first_required}
          </span>
        </div>
      </div>

      <p className="text-gray-400 text-xs leading-relaxed">
        {block.description}
      </p>

      {/* State control — a connected segmented progress bar. Segments up to and
          including the current state fill (in the block's defense-type color) so
          maturity reads as gradual left→right progress; clicking any segment sets
          that state. */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">State</label>
        <div className="flex rounded-md overflow-hidden border border-gray-700">
          {STATE_STEPS.map((s, i) => {
            const filled = i <= currentStateIndex;
            const isCurrent = i === currentStateIndex;
            return (
              <button
                key={s}
                onClick={() => setBlockState(block.id, s)}
                aria-label={STATE_LABELS[s]}
                aria-pressed={isCurrent}
                title={STATE_LABELS[s]}
                className={`flex-1 px-1 py-1 text-[10px] leading-tight text-center transition-colors ${
                  i > 0 ? "border-l border-gray-700" : ""
                } ${
                  filled
                    ? isCurrent
                      ? "text-white font-semibold"
                      : "text-gray-100"
                    : "bg-gray-800 text-gray-500 hover:bg-gray-700"
                }`}
                style={
                  filled
                    ? {
                        backgroundColor: color,
                        opacity: isCurrent ? 1 : 0.55,
                      }
                    : undefined
                }
              >
                {STATE_SHORT[s]}
              </button>
            );
          })}
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
            {formatDeployRange(
              block.dimensions.time_to_deploy_months.min,
              block.dimensions.time_to_deploy_months.max
            )}
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

      {/* Dependencies */}
      {(block.dependencies.requires.length > 0 ||
        block.dependencies.enhances.length > 0 ||
        block.dependencies.enabled_by.length > 0) && (
        <div className="space-y-1.5">
          <DependencyGroup
            label="Requires"
            ids={block.dependencies.requires}
            blockStates={blockStates}
            onNavigate={onNavigate}
          />
          <DependencyGroup
            label="Enhances"
            ids={block.dependencies.enhances}
            blockStates={blockStates}
            onNavigate={onNavigate}
          />
          <DependencyGroup
            label="Enabled by"
            ids={block.dependencies.enabled_by}
            blockStates={blockStates}
            onNavigate={onNavigate}
          />
        </div>
      )}

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

      {/* Real-world parallels */}
      {block.real_world_parallels.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Real-World Parallels</div>
          {block.real_world_parallels.map((p, i) => (
            <div key={i} className="text-xs mb-1">
              <span className="text-gray-400">{p.description}</span>
              <span className="text-gray-600 ml-1">
                — {p.source} · {p.year}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DependencyGroup({
  label,
  ids,
  blockStates,
  onNavigate,
}: {
  label: string;
  ids: string[];
  blockStates: Record<string, BlockState>;
  onNavigate?: (blockId: string) => void;
}) {
  if (ids.length === 0) return null;
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="flex flex-wrap gap-1">
        {ids.map((id) => {
          const state = (blockStates[id] ?? "not_started") as BlockState;
          return (
            <button
              key={id}
              onClick={() => onNavigate?.(id)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
              title={`Go to ${id}`}
            >
              {STATE_ICONS[state]} {id} {BLOCK_SHORT_LABELS[id] ?? ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
