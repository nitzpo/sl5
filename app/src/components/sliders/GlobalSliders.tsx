import { useSimulationStore } from "../../store/simulation";
import { useSimulationResults } from "../../store/derived";
import { formatCost } from "../../utils/format";

interface SliderRowProps {
  label: string;
  minLabel: string;
  maxLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
}

/** Qualitative word for a 0-1 slider position — decimals mean nothing to most users. */
function qualitativeLabel(value: number, minLabel: string, maxLabel: string): string {
  if (value < 0.15) return minLabel;
  if (value < 0.45) return `Leaning ${minLabel.toLowerCase()}`;
  if (value <= 0.55) return "Middling";
  if (value <= 0.85) return `Leaning ${maxLabel.toLowerCase()}`;
  return maxLabel;
}

function SliderRow({
  label,
  minLabel,
  maxLabel,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
}: SliderRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-[10px] text-gray-600 w-16 text-right shrink-0">
        {minLabel}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-violet-500 h-1"
      />
      <span className="text-[10px] text-gray-600 w-16 shrink-0">
        {maxLabel}
      </span>
      <span
        className="text-[10px] text-gray-300 w-24 text-right truncate"
        title={formatValue ? formatValue(value) : qualitativeLabel(value, minLabel, maxLabel)}
      >
        {formatValue ? formatValue(value) : qualitativeLabel(value, minLabel, maxLabel)}
      </span>
    </div>
  );
}

export function GlobalSliders() {
  const sliders = useSimulationStore((s) => s.sliders);
  const setSlider = useSimulationStore((s) => s.setSlider);
  const modelServed = useSimulationStore((s) => s.modelServedExternally);
  const setModelServed = useSimulationStore((s) => s.setModelServed);
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  const setAdversaryOc = useSimulationStore((s) => s.setAdversaryOc);

  const { spentMillions: totalSpending } = useSimulationResults();

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
      <SliderRow
        label="AI Timeline"
        minLabel="Slow"
        maxLabel="Fast"
        value={sliders.ai_timeline}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => setSlider("ai_timeline", v)}
      />
      <SliderRow
        label="Gov Cooperation"
        minLabel="None"
        maxLabel="Full"
        value={sliders.gov_cooperation}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => setSlider("gov_cooperation", v)}
      />
      <SliderRow
        label="Vendor Cooperation"
        minLabel="None"
        maxLabel="Full"
        value={sliders.vendor_cooperation}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => setSlider("vendor_cooperation", v)}
      />
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-28 shrink-0">Budget</span>
        <span className="text-[10px] text-gray-600 w-16 text-right shrink-0">$50M</span>
        <div className="flex-1 relative">
          <input
            type="range"
            min={50}
            max={2000}
            step={50}
            value={sliders.budget_millions}
            onChange={(e) => setSlider("budget_millions", Number(e.target.value))}
            className="w-full accent-violet-500 h-1"
          />
          {/* Spending marker on the track */}
          {totalSpending > 0 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-2.5 w-0.5 rounded-full pointer-events-none"
              style={{
                left: `${Math.min((totalSpending - 50) / (2000 - 50) * 100, 100)}%`,
                backgroundColor: totalSpending > sliders.budget_millions ? "#ef4444" : "#22c55e",
              }}
            />
          )}
        </div>
        <span className="text-[10px] text-gray-600 w-16 shrink-0">$2B</span>
        <span className={`text-xs font-mono w-20 text-right ${totalSpending > sliders.budget_millions ? "text-red-400" : "text-gray-300"}`}>
          {formatCost(totalSpending)}/{formatCost(sliders.budget_millions)}
        </span>
      </div>
      <SliderRow
        label="Org Transform"
        minLabel="Reluctant"
        maxLabel="Committed"
        value={sliders.org_transformation}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => setSlider("org_transformation", v)}
      />
      <SliderRow
        label="Risk Tolerance"
        minLabel="Conservative"
        maxLabel="Aggressive"
        value={sliders.risk_tolerance}
        min={0}
        max={1}
        step={0.05}
        onChange={(v) => setSlider("risk_tolerance", v)}
      />

      {/* Adversary OC + Model Served toggles */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-28 shrink-0">Adversary OC</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((oc) => (
            <button
              key={oc}
              onClick={() => setAdversaryOc(oc)}
              className={`w-6 h-6 text-xs rounded transition-colors ${
                adversaryOc === oc
                  ? "bg-red-700 text-white"
                  : "bg-gray-800 text-gray-500 hover:bg-gray-700"
              }`}
            >
              {oc}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-28 shrink-0">Model Served</span>
        <button
          onClick={() => setModelServed(!modelServed)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            modelServed
              ? "bg-amber-800 text-amber-200"
              : "bg-gray-800 text-gray-400"
          }`}
        >
          {modelServed ? "Externally (distillation risk)" : "Air-gapped (no API)"}
        </button>
      </div>
    </div>
  );
}
