import { useMemo } from "react";
import { useSimulationStore } from "../../store/simulation";
import {
  computeCategoryScores,
  overallSlScore,
} from "../../engine/scoring";
import { formatSl } from "../../utils/format";

interface LeverImpact {
  lever: string;
  currentValue: number;
  targetValue: number;
  slDelta: number;
  unlockedBlocks: string[];
  acceleratedBlocks: string[];
}

// Which blocks each slider affects
const GOV_BLOCKS = ["PER-04", "PHY-01", "SC-05", "NET-03", "PER-01"];
const VENDOR_BLOCKS = ["HW-01", "HW-02", "HW-03", "HW-04", "HW-06", "HW-07", "HW-10"];
const ORG_BLOCKS = ["NET-01", "PER-02", "PER-08", "PHY-01", "PER-01", "PER-04", "PER-05"];

export function PolicyView() {
  const blocks = useSimulationStore((s) => s.blocks);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const year = useSimulationStore((s) => s.year);
  const sliders = useSimulationStore((s) => s.sliders);

  // Compute current SL
  const currentSl = useMemo(() => {
    const cats = computeCategoryScores(blocks, blockStates, year, sliders.ai_timeline);
    return overallSlScore(cats);
  }, [blocks, blockStates, year, sliders]);

  // Simulate "what if" for each policy lever at high value
  const levers = useMemo(() => {
    const results: LeverImpact[] = [];

    // Gov cooperation → 0.8
    const govBlocks = blocks.filter((b) => GOV_BLOCKS.includes(b.id));
    const govUnlocked = govBlocks.filter(
      (b) => (blockStates[b.id] ?? "not_started") === "not_started"
    );
    // Simulate: move gov-affected blocks from not_started to implementing
    const govStates = { ...blockStates };
    for (const b of govUnlocked) govStates[b.id] = "implementing";
    const govCats = computeCategoryScores(blocks, govStates, year, sliders.ai_timeline);
    const govSl = overallSlScore(govCats);
    results.push({
      lever: "Government Cooperation",
      currentValue: sliders.gov_cooperation,
      targetValue: 0.8,
      slDelta: govSl - currentSl,
      unlockedBlocks: govUnlocked.map((b) => b.id),
      acceleratedBlocks: govBlocks
        .filter((b) => !govUnlocked.includes(b))
        .map((b) => b.id),
    });

    // Vendor cooperation → 0.9
    const vendorBlocks = blocks.filter((b) => VENDOR_BLOCKS.includes(b.id));
    const vendorUnlocked = vendorBlocks.filter(
      (b) => (blockStates[b.id] ?? "not_started") === "not_started"
    );
    const vendorStates = { ...blockStates };
    for (const b of vendorUnlocked) vendorStates[b.id] = "implementing";
    const vendorCats = computeCategoryScores(blocks, vendorStates, year, sliders.ai_timeline);
    const vendorSl = overallSlScore(vendorCats);
    results.push({
      lever: "Vendor Cooperation",
      currentValue: sliders.vendor_cooperation,
      targetValue: 0.9,
      slDelta: vendorSl - currentSl,
      unlockedBlocks: vendorUnlocked.map((b) => b.id),
      acceleratedBlocks: vendorBlocks
        .filter((b) => !vendorUnlocked.includes(b))
        .map((b) => b.id),
    });

    // Org transformation → 0.9
    const orgBlocks = blocks.filter((b) => ORG_BLOCKS.includes(b.id));
    const orgUnlocked = orgBlocks.filter(
      (b) => (blockStates[b.id] ?? "not_started") === "not_started"
    );
    const orgStates = { ...blockStates };
    for (const b of orgUnlocked) orgStates[b.id] = "implementing";
    const orgCats = computeCategoryScores(blocks, orgStates, year, sliders.ai_timeline);
    const orgSl = overallSlScore(orgCats);
    results.push({
      lever: "Org Transformation",
      currentValue: sliders.org_transformation,
      targetValue: 0.9,
      slDelta: orgSl - currentSl,
      unlockedBlocks: orgUnlocked.map((b) => b.id),
      acceleratedBlocks: orgBlocks
        .filter((b) => !orgUnlocked.includes(b))
        .map((b) => b.id),
    });

    return results.sort((a, b) => b.slDelta - a.slDelta);
  }, [blocks, blockStates, year, sliders, currentSl]);

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
                {lever.currentValue.toFixed(1)} → {lever.targetValue}
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
                (blockStates[b.id] ?? "not_started") !== "deployed" &&
                (blockStates[b.id] ?? "not_started") !== "mature"
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
