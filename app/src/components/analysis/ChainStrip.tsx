import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSimulationStore } from "../../store/simulation";
import type { AttackChainStep, BlockState } from "../../engine/types";
import { BLOCK_SHORT_LABELS } from "../../utils/geometry";

interface StripStep extends AttackChainStep {
  blocked: boolean;
  howItStops?: string;
}

/**
 * Linear phase strip for the selected attack chain. The hex grid orders blocks
 * by category, not attack sequence — this strip carries the temporal narrative.
 */
export function ChainStrip() {
  const selectedChainId = useSimulationStore((s) => s.selectedChainId);
  const attackChains = useSimulationStore((s) => s.attackChains);
  const blocks = useSimulationStore((s) => s.blocks);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const setSelectedChain = useSimulationStore((s) => s.setSelectedChain);

  // The strip only shows a chain that was explicitly selected — e.g. by clicking
  // the breach block in the Security Posture panel (click again to hide it).
  // It never auto-appears.
  const chain = attackChains.find((c) => c.id === selectedChainId);

  const steps: StripStep[] = useMemo(() => {
    if (!chain) return [];
    const isBlocked = (id?: string) => {
      if (!id) return false;
      const s = (blockStates[id] ?? "not_started") as BlockState;
      return s === "deployed" || s === "mature";
    };
    const howFor = (id?: string) =>
      id ? chain.stopper_details?.find((d) => d.block_id === id)?.how_it_stops : undefined;

    const raw: AttackChainStep[] =
      chain.narrative.steps ??
      // fallback: synthesize from blocks_exploited using each block's exploit narrative
      chain.blocks_exploited.map((id, i) => {
        const block = blocks.find((b) => b.id === id);
        const firstSentence =
          block?.adversary_exploitation?.exploit_narrative?.split(/(?<=\.)\s/)[0] ?? "";
        return { phase: `Step ${i + 1}`, description: firstSentence, block_gap_used: id };
      });

    return raw.map((s) => ({
      ...s,
      blocked: isBlocked(s.block_gap_used),
      howItStops: howFor(s.block_gap_used),
    }));
  }, [chain, blocks, blockStates]);

  // Overflow affordance for the horizontal step row: fades + arrows appear only
  // when there's more chain off-screen in that direction.
  const rowRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ left: false, right: false });

  const updateOverflow = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setOverflow({
      left: el.scrollLeft > 1,
      right: el.scrollLeft < maxScroll - 1,
    });
  }, []);

  useEffect(() => {
    updateOverflow();
    const el = rowRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(updateOverflow);
    ro.observe(el);
    return () => ro.disconnect();
    // Re-measure when the step set changes (new chain / block states).
  }, [updateOverflow, steps]);

  const scrollByCard = (dir: -1 | 1) => {
    rowRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  const firstBlockedIdx = steps.findIndex((s) => s.blocked);
  const chainBroken = firstBlockedIdx >= 0;

  if (!chain || steps.length === 0) return null;

  return (
    <div className="mb-2 bg-gray-900/80 border border-gray-800 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-semibold text-red-400">{chain.name}</span>
        <span className="text-[10px] text-gray-500">
          OC{chain.adversary_profile.typical_oc} attack path
        </span>
        <button
          onClick={() => setSelectedChain(null)}
          className="ml-auto text-gray-600 hover:text-gray-300 text-sm leading-none px-1"
          title="Hide chain"
        >
          ×
        </button>
      </div>
      <div className="relative">
      <div
        ref={rowRef}
        onScroll={updateOverflow}
        className="flex items-stretch gap-1.5 overflow-x-auto no-scrollbar pr-1"
      >
        {steps.map((step, i) => {
          const dimmed = chainBroken && i > firstBlockedIdx;
          return (
            <div key={i} className="flex items-center gap-1.5 shrink-0">
              <div
                className={`group relative w-44 rounded border px-2 py-1.5 transition-opacity ${
                  step.blocked
                    ? "border-emerald-700/60 bg-emerald-950/30"
                    : "border-gray-800 bg-gray-950"
                } ${dimmed ? "opacity-30" : ""}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-semibold text-gray-300">
                    {step.phase}
                  </span>
                  {step.block_gap_used && (
                    <span
                      className={`text-[9px] px-1 py-0.5 rounded font-mono ${
                        step.blocked
                          ? "bg-emerald-900/60 text-emerald-300"
                          : "bg-red-950 text-red-300"
                      }`}
                    >
                      {step.blocked ? "■ blocked" : "✗ gap"} {step.block_gap_used}
                    </span>
                  )}
                </div>
                <p className="text-[9px] text-gray-500 leading-tight mt-0.5 line-clamp-2">
                  {step.description}
                </p>
                {/* hover detail */}
                <div className="absolute left-0 top-full mt-1 z-[120] hidden group-hover:block w-64 bg-gray-800 border border-gray-700 rounded shadow-xl p-2">
                  <p className="text-[10px] text-gray-300 leading-snug">{step.description}</p>
                  {step.block_gap_used && (
                    <p className="text-[10px] mt-1 leading-snug">
                      <span className={step.blocked ? "text-emerald-400" : "text-red-400"}>
                        {step.block_gap_used} {BLOCK_SHORT_LABELS[step.block_gap_used] ?? ""}:
                      </span>{" "}
                      <span className="text-gray-400">
                        {step.howItStops ?? "Deploying this block breaks the chain at this step."}
                      </span>
                    </p>
                  )}
                </div>
              </div>
              <span className={`text-gray-600 text-xs ${dimmed ? "opacity-30" : ""}`}>→</span>
            </div>
          );
        })}
        {/* terminal node */}
        <div
          className={`shrink-0 self-center rounded px-2 py-1.5 text-[10px] font-semibold ${
            chainBroken
              ? "bg-emerald-950/50 text-emerald-400 border border-emerald-800/60"
              : "bg-red-950/60 text-red-300 border border-red-900/60"
          }`}
        >
          {chainBroken ? "■ Chain blocked" : "☠ Weights exfiltrated"}
        </div>
      </div>

      {/* Left overflow: fade + scroll-back arrow */}
      {overflow.left && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-gray-900 to-transparent" />
          <button
            onClick={() => scrollByCard(-1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-6 flex items-center justify-center rounded bg-gray-800/90 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            title="Scroll left"
          >
            ‹
          </button>
        </>
      )}

      {/* Right overflow: fade + scroll-forward arrow */}
      {overflow.right && (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-gray-900 to-transparent" />
          <button
            onClick={() => scrollByCard(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-6 flex items-center justify-center rounded bg-gray-800/90 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            title="Scroll right"
          >
            ›
          </button>
        </>
      )}
      </div>
    </div>
  );
}
