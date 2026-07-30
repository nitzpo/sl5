// The spin-off: a playable slice of the real app, opened from the constraints
// slide and exited straight back to it. Everything the deck has explained
// separately — blocks, states, a binding budget, dependencies, chains that
// react, a score that moves — happens at once here, against the real engine.
//
// Two rules this file exists to respect:
//
//  1. Real engine, real data. All arithmetic is in `../posture-game`, which
//     calls the same functions `store/derived.ts` does, over the shipped
//     blocks-*.json and attack-chains.json. Nothing is re-implemented, so these
//     numbers cannot drift from the app's.
//  2. The intro still fetches nothing on load. The data is fetched lazily the
//     first time someone opens the game, so the rest of the deck stays instant
//     for the readers who never touch it.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AttackChain, Block, BlockState } from "../../engine/types";
import {
  ADVERSARY_OC,
  BLOCK_FILES,
  BUDGET_MILLIONS,
  SHORTLIST,
  VIABLE_THRESHOLD,
  YEAR,
  costOf,
  evaluatePosture,
  type GameData,
} from "../posture-game";
import { enablementFactor } from "../../engine";
import { formatCost, formatProbability } from "../../utils/format";
import { STATE_ICONS, STATE_LABELS, breachLevel, slLevel, LEVEL_TEXT } from "../../utils/colors";
import { BLOCK_SHORT_LABELS, CATEGORY_LABELS } from "../../utils/geometry";
import { DemoHex } from "./DemoHex";
import type { DemoBlock } from "../content";
import { Em } from "../slides/slide-parts";

/** DemoHex draws from the intro's own inlined `DemoBlock` shape, and the game
 * works with real `Block`s off the wire — so adapt rather than widen DemoHex and
 * make the teaching replica depend on the full data model. */
function asDemoBlock(block: Block): DemoBlock {
  return {
    id: block.id,
    name: block.name,
    shortLabel: BLOCK_SHORT_LABELS[block.id] ?? block.id,
    category: block.category,
    defenseType: block.defense_type,
    aiOcShift: 0,
    deployMonths: block.dimensions.time_to_deploy_months,
    blurb: "",
  };
}

export function BuildPostureGame({ onExit }: { onExit: () => void }) {
  const [data, setData] = useState<GameData | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Chosen blocks in click order — which is also funding order, as in the app. */
  const [chosen, setChosen] = useState<string[]>([]);
  const [showChains, setShowChains] = useState(false);

  useEffect(() => {
    let alive = true;
    // Aborted on unmount, so leaving the detour mid-load doesn't leave seven
    // requests running against a component nobody is looking at.
    const controller = new AbortController();
    const fetchJson = async (file: string) => {
      const resp = await fetch(`${import.meta.env.BASE_URL}data/${file}`, {
        signal: controller.signal,
      });
      if (!resp.ok) throw new Error(`${file}: HTTP ${resp.status}`);
      return resp.json();
    };
    Promise.all([fetchJson("attack-chains.json"), ...BLOCK_FILES.map(fetchJson)])
      .then(([chains, ...blockArrays]) => {
        if (alive) setData({ blocks: (blockArrays as Block[][]).flat(), chains });
      })
      .catch((e: unknown) => {
        // An abort is us, not a failure — don't flash an error at a reader who
        // has already left.
        if (alive) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  const shortlist = useMemo(() => {
    if (!data) return [];
    const byId = new Map(data.blocks.map((b) => [b.id, b]));
    const found = SHORTLIST.map((id) => byId.get(id)).filter(
      (b): b is Block => b !== undefined
    );
    // A renamed block id would otherwise hand the reader a nine-tile game that
    // looks deliberate. `posture-game.test.ts` catches this against the shipped
    // JSON; this catches it in a browser, where the data could be newer.
    if (found.length !== SHORTLIST.length) {
      const missing = SHORTLIST.filter((id) => !byId.has(id));
      console.warn(
        `BuildPostureGame: ${missing.join(", ")} missing from the block catalogue — ` +
          `the mini-game is offering ${found.length} of ${SHORTLIST.length} blocks.`
      );
    }
    return found;
  }, [data]);

  const result = useMemo(
    () => (data ? evaluatePosture(data, chosen) : null),
    [data, chosen]
  );

  const toggle = useCallback((id: string) => {
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }, []);

  if (error) {
    return (
      <GameFrame onExit={onExit}>
        <p className="text-sm leading-relaxed text-red-300">
          Couldn't load the block data ({error}). Nothing else in the introduction needs
          it — head back and carry on.
        </p>
      </GameFrame>
    );
  }

  if (!data || !result) {
    return (
      <GameFrame onExit={onExit}>
        <p className="text-sm text-gray-500">Loading the real block catalogue…</p>
      </GameFrame>
    );
  }

  const remaining = BUDGET_MILLIONS - result.spentMillions;
  const spentPct = Math.min(100, (result.spentMillions / BUDGET_MILLIONS) * 100);

  return (
    <GameFrame onExit={onExit}>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-gray-400">
          You have <Em>{formatCost(BUDGET_MILLIONS)}</Em> for the year, ten candidate
          blocks, and an OC{ADVERSARY_OC} adversary in {YEAR}. Click to deploy. Both
          numbers below are computed by the app's own engine, so this is the real
          exercise — just smaller.
        </p>

        {/* Budget meter. Funding follows click order, so what you pick first is
            what gets paid for first. */}
        <div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-gray-300">Budget</span>
            <span className="font-mono text-gray-400 tabular-nums">
              <span className={remaining < 0 ? "text-pink-400" : "text-gray-200"}>
                {formatCost(result.spentMillions)}
              </span>{" "}
              / {formatCost(BUDGET_MILLIONS)}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-800">
            <div
              className={`h-full rounded-full transition-all ${
                remaining < 0 ? "bg-pink-500" : "bg-violet-500"
              }`}
              style={{ width: `${spentPct}%` }}
            />
          </div>
        </div>

        {/* The shortlist. Each tile shows what the block actually counts as after
            both caps — which is not always what was clicked, and that's the lesson. */}
        <div className="grid gap-2 sm:grid-cols-2">
          {shortlist.map((block) => {
            const picked = chosen.includes(block.id);
            const overBudget = result.budgetExceeded.has(block.id);
            const unmet = result.dependencyUnmet.has(block.id);
            const state: BlockState = picked
              ? (result.effectiveStates[block.id] ?? "deployed")
              : "not_started";
            const missing = result.dependencyUnmetRequires.get(block.id) ?? [];
            // The third way a tile can be worth less than it looks, and the only
            // one that isn't a cap: the control is deployed and working, it just
            // isn't the whole thing its name implies without its companions.
            // Measured against the effective posture, so it's the same fraction
            // the engine charged.
            const enablement = enablementFactor(block, result.effectiveStates);
            const incomplete = picked && enablement < 1;
            return (
              <button
                key={block.id}
                type="button"
                onClick={() => toggle(block.id)}
                aria-pressed={picked}
                className={`flex items-center gap-2.5 rounded-lg border p-2 text-left transition-colors ${
                  overBudget
                    ? "border-pink-800/70 bg-pink-950/20"
                    : unmet
                      ? "border-sky-800/70 bg-sky-950/20"
                      : picked
                        ? "border-violet-700 bg-violet-950/30"
                        : "border-gray-800 bg-gray-900 hover:border-gray-700"
                }`}
              >
                <DemoHex
                  block={asDemoBlock(block)}
                  state={state}
                  size={22}
                  budgetExceeded={overBudget}
                  dependencyUnmet={unmet}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-200">
                    {block.name}
                  </span>
                  <span className="block text-xs leading-relaxed text-gray-500">
                    {formatCost(costOf(block))} ·{" "}
                    {overBudget ? (
                      <span className="text-pink-400">
                        over budget — capped at {STATE_LABELS.implementing}
                      </span>
                    ) : unmet ? (
                      <span className="text-sky-400">needs {missing.join(", ")} first</span>
                    ) : picked ? (
                      <span className="text-violet-300">
                        {STATE_ICONS[state]} {STATE_LABELS[state]}
                      </span>
                    ) : (
                      block.defense_type.replace("_", " ")
                    )}
                  </span>
                  {incomplete && !overBudget && !unmet && (
                    <span className="block text-xs leading-relaxed text-amber-400">
                      {Math.round(enablement * 100)}% of full — incomplete without{" "}
                      {(block.dependencies.completed_by?.blocks ?? [])
                        .filter((id) => {
                          const s = result.effectiveStates[id];
                          return s !== "deployed" && s !== "mature";
                        })
                        .join(", ")}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Security Posture, in miniature. Same two headline numbers, same
            thresholds and colours as the app's ScoreCard. */}
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-gray-700 bg-gray-900 p-3.5">
          <div>
            <div className="text-xs text-gray-500">SL score</div>
            <div className={`text-2xl font-bold ${LEVEL_TEXT[slLevel(result.sl)]}`}>
              {/* Two decimals, not the app's one. Ten blocks out of 47 move the
                  overall score in hundredths, and a readout frozen at "1.0"
                  would read as broken rather than as slow progress. */}
              {result.sl.toFixed(2)}
            </div>
            <div className="mt-0.5 text-xs text-gray-500">
              weakest:{" "}
              <span className="text-gray-400">
                {CATEGORY_LABELS[result.weakestCategory]}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Breach probability</div>
            <div className={`text-2xl font-bold ${LEVEL_TEXT[breachLevel(result.breach)]}`}>
              {formatProbability(result.breach)}
            </div>
            <div className="mt-0.5 truncate text-xs text-gray-500">
              {result.ranked[0] ? `via ${result.ranked[0].chain.name}` : "—"}
            </div>
          </div>
        </div>

        <Coaching
          chosen={chosen}
          remaining={remaining}
          overBudget={[...result.budgetExceeded]}
          unmet={[...result.dependencyUnmet]}
          incomplete={shortlist
            .filter(
              (b) => chosen.includes(b.id) && enablementFactor(b, result.effectiveStates) < 1
            )
            // Worst first, so the coaching names the one costing the reader most.
            .sort(
              (a, b) =>
                enablementFactor(a, result.effectiveStates) -
                enablementFactor(b, result.effectiveStates)
            )}
          effectiveStates={result.effectiveStates}
          topChain={result.ranked[0]?.chain}
        />

        <div>
          <button
            type="button"
            onClick={() => setShowChains((s) => !s)}
            aria-expanded={showChains}
            className="text-sm font-medium text-violet-300 transition-colors hover:text-violet-200"
          >
            <span className="mr-1 inline-block">{showChains ? "▾" : "▸"}</span>
            What does the attacker do about it?
          </button>

          {showChains && (
            <div className="mt-2 space-y-1.5 rounded-lg border border-gray-800 bg-gray-950/60 p-3">
              <p className="mb-2 text-xs leading-relaxed text-gray-500">
                All {result.ranked.length} chains, ranked exactly as the app's{" "}
                <Em>Attacker</Em> perspective ranks them — viable above{" "}
                {Math.round(VIABLE_THRESHOLD * 100)}%, blocked below.
              </p>
              {result.ranked.map(({ chain, p }) => {
                const blocked = p < VIABLE_THRESHOLD;
                return (
                  <div key={chain.id} className="flex items-baseline gap-2 text-sm">
                    <span className={blocked ? "text-emerald-500" : "text-red-500"}>
                      {blocked ? "■" : "✗"}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-gray-400">
                      {chain.name}
                    </span>
                    <span className="font-mono text-gray-500 tabular-nums">
                      {formatProbability(p)}
                    </span>
                  </div>
                );
              })}
              <p className="mt-2.5 border-t border-gray-800 pt-2.5 text-sm leading-relaxed text-gray-500">
                Nothing {formatCost(BUDGET_MILLIONS)} can buy drives the top chain to
                zero, and no posture here reaches SL5. That's the honest outcome, not a
                bug — and it's the same outcome at full scale, with 47 blocks, six world
                sliders and seven years to spend across.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-gray-800 pt-3.5">
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg bg-violet-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            Back to the tour →
          </button>
          {chosen.length > 0 && (
            <button
              type="button"
              onClick={() => setChosen([])}
              className="text-sm text-gray-500 transition-colors hover:text-gray-300"
            >
              Start over
            </button>
          )}
        </div>
      </div>
    </GameFrame>
  );
}

/** The line under the score that says what just happened and what to try next.
 * Ordered by which lesson is most urgent, so exactly one fires at a time. */
function Coaching({
  chosen,
  remaining,
  overBudget,
  unmet,
  incomplete,
  effectiveStates,
  topChain,
}: {
  chosen: string[];
  remaining: number;
  overBudget: string[];
  unmet: string[];
  /** Deployed picks missing `completed_by` companions, worst fraction first. */
  incomplete: Block[];
  effectiveStates: Record<string, BlockState>;
  topChain?: AttackChain;
}) {
  if (chosen.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-gray-500">
        Nothing deployed yet, so the score sits at its floor and every chain is wide open.
        Start anywhere — the cheap controls are the tempting ones.
      </p>
    );
  }
  if (overBudget.length > 0) {
    return (
      <p className="text-sm leading-relaxed text-gray-400">
        Out of money. The <span className="text-pink-300">pink dashed</span> blocks are the
        ones the budget couldn't reach, so they're held at{" "}
        <Em>{STATE_LABELS.implementing}</Em> — 40% effective instead of 85%, however firmly
        you clicked. Deselect something you picked <Em>earlier</Em> to free the money up:
        funding follows click order, so a later pick can only ever cap itself.
      </p>
    );
  }
  if (unmet.length > 0) {
    return (
      <p className="text-sm leading-relaxed text-gray-400">
        The <span className="text-sky-300">sky dotted</span> blocks are capped a different
        way: a prerequisite of theirs isn't operational. Buy what they name and they come
        up to full strength — this is the app's <Em>Requires</Em> relation, enforced.
      </p>
    );
  }
  // Ranked above the worst-route lesson on purpose: this is the one that fires
  // when a reader buys the air gap and expects to be done. The block works — it
  // isn't capped — but a gap nobody can legitimately move data across is a gap
  // people carry drives across, so it's priced as the partial thing it is.
  //
  // Only fires when a companion is buyable from the shortlist, so the lesson
  // always comes with a move. Most companions are deliberately off the list (the
  // air gap the budget affords is not the air gap the standard describes, and no
  // ten-block year makes it one), and for those the tile's own "N% of full — needs
  // …" line says it without spending the coaching slot on advice the reader can't
  // take.
  const missingCompanions = (block: Block) =>
    (block.dependencies.completed_by?.blocks ?? []).filter((id) => {
      const s = effectiveStates[id];
      return s !== "deployed" && s !== "mature";
    });
  const finishable = incomplete.find((b) =>
    missingCompanions(b).some((id) => (SHORTLIST as readonly string[]).includes(id))
  );
  if (finishable) {
    const gaps = missingCompanions(finishable);
    const here = gaps.filter((id) => (SHORTLIST as readonly string[]).includes(id));
    return (
      <p className="text-sm leading-relaxed text-gray-400">
        <Em>{finishable.name}</Em> is deployed and nothing is capping it — but it counts for
        only{" "}
        <span className="text-amber-300">
          {Math.round(enablementFactor(finishable, effectiveStates) * 100)}% of the control
          its name implies
        </span>
        , because {gaps.join(" and ")} {gaps.length === 1 ? "isn't" : "aren't"} there.{" "}
        {finishable.dependencies.completed_by?.why} {here.join(" and ")}{" "}
        {here.length === 1 ? "is" : "are"} on this list — buy{" "}
        {here.length === 1 ? "it" : "them"} and the number comes up.
      </p>
    );
  }
  // The trap the game exists to spring: the SL score is an average over the
  // whole posture, but the headline breach number tracks only the single worst
  // remaining route. So a posture can keep improving while the number barely
  // moves, and closing one route just promotes the next one.
  //
  // Ask the chain directly rather than watching the number: this stays true when
  // the arithmetic changes, and it avoids claiming the breach number is frozen
  // in the moment it has just dropped — stopping the top chain promotes a
  // different chain that is usually also untouched.
  const onTopChain = chosen.some((id) => topChain?.stoppers?.includes(id));
  if (topChain && !onTopChain) {
    return (
      <p className="text-sm leading-relaxed text-gray-400">
        The breach number only ever tracks the <Em>worst remaining route</Em>, and right
        now that's <Em>{topChain.name}</Em> — which nothing you've bought appears on. A
        better posture on average is not the same as closing the route they're actually
        taking. {formatCost(Math.max(0, remaining))} left.
      </p>
    );
  }
  return (
    <p className="text-sm leading-relaxed text-gray-400">
      {formatCost(Math.max(0, remaining))} left, and you're on the right route now:
      something you bought stands on <Em>{topChain?.name}</Em>, the worst one left. Note
      which kind of control did it — cheap probabilistic ones buy the most score per
      dollar today, and they're exactly the ones AI erosion takes back by 2030.
    </p>
  );
}

/** Chrome shared by every state, so the exit is reachable even if the fetch failed. */
function GameFrame({
  children,
  onExit,
}: {
  children: ReactNode;
  onExit: () => void;
}) {
  return (
    <div className="rounded-xl border border-violet-800/50 bg-violet-950/10 p-4 sm:p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wider text-violet-400 uppercase">
            Try it · optional detour
          </p>
          <h3 className="mt-0.5 text-lg font-bold text-gray-100 sm:text-xl">
            Build a posture on {formatCost(BUDGET_MILLIONS)}
          </h3>
        </div>
        <button
          type="button"
          onClick={onExit}
          className="shrink-0 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-800 hover:text-white"
        >
          ← Back to the tour
        </button>
      </div>
      {children}
    </div>
  );
}
