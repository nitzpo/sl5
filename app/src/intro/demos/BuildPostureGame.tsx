// The budget mini-game: a playable slice of the instrument on the budget
// slide. The reader starts from today's typical lab, has one year and a fixed
// budget, picks defenses, and reads which attacker tiers they now usually stop.
// All arithmetic is in `../posture-game`, which runs `scorePosture`.

import { useMemo, useState } from "react";
import type { Block } from "../../engine/types";
import { OC_TIERS } from "../content";
import { useThreatData, type ThreatData } from "../data";
import { bandChips } from "../engine-views";
import { money } from "../format";
import { STATE_LABEL, TYPE_LABEL } from "../labels";
import {
  BUDGET_MILLIONS,
  SHORTLIST,
  YEAR,
  costOf,
  evaluatePosture,
  startsPartlyInPlace,
  type GameResult,
} from "../posture-game";
import { BlockGlyph, DataPending, Em, ProgressBar, SlMeter, TierLadder, type LadderRow } from "../slides/parts";

const bandsOf = (r: GameResult) => r.score.tiers.map((t) => t.band);

function Coaching({ data, chosen, result }: { data: ThreatData; chosen: string[]; result: GameResult }) {
  const name = (id: string) => data.blocks.find((b) => b.id === id)?.name ?? id;
  if (chosen.length === 0) {
    return (
      <p>
        You start where a typical frontier lab is today. Pick defenses: the order you pick them is the order they are
        funded.
      </p>
    );
  }
  const over = [...result.budgetExceeded];
  if (over.length > 0) {
    return (
      <p>
        <Em>{name(over[0])}</Em> doesn't fit the budget, so it isn't built: it stays where your lab already was. Funding
        follows your pick order, so drop an earlier pick to make room.
      </p>
    );
  }
  const unmet = [...result.dependencyUnmet];
  if (unmet.length > 0) {
    const needs = result.dependencyUnmetRequires.get(unmet[0]) ?? [];
    return (
      <p>
        <Em>{name(unmet[0])}</Em> needs {needs.map(name).join(" and ")} running first. Until then it counts as only
        half-built.
      </p>
    );
  }
  const next = result.stillGetsThrough;
  if (!next) return <p>Every tier usually fails against this posture.</p>;
  return (
    <p>
      Next up: <Em>OC{next.tier}</Em> {next.band === "usually succeeds" ? "usually succeeds" : "is still contested"}. Its
      easiest approach is {next.approach.toLowerCase()}: {next.path.join(" → ")}.
    </p>
  );
}

function Tile({
  block,
  order,
  result,
  onToggle,
}: {
  block: Block;
  order: number;
  result: GameResult;
  onToggle: () => void;
}) {
  const picked = order > 0;
  const over = result.budgetExceeded.has(block.id);
  const unmet = result.dependencyUnmet.has(block.id);
  const state = result.effectiveStates[block.id] ?? "not_started";
  const needs = result.dependencyUnmetRequires.get(block.id) ?? [];
  let status: React.ReactNode;
  if (over) status = <span className="font-semibold text-signal-ink">over budget · not built</span>;
  else if (unmet) status = <span className="font-semibold text-ink">needs {needs.join(", ")} running first</span>;
  else if (picked) status = <span className="text-ink">{STATE_LABEL[state].toLowerCase()}</span>;
  else if (startsPartlyInPlace(block)) status = <span>partly in place</span>;
  else status = <span>{TYPE_LABEL[block.defense_type].toLowerCase()}</span>;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={picked}
      className={`relative flex min-h-[64px] items-center gap-3 border px-3 py-2 text-left transition-colors ${
        over ? "border-signal border-dashed" : picked ? "border-ink bg-tint" : "border-rule-2 hover:border-ink"
      }`}
    >
      <BlockGlyph type={block.defense_type} state={state} w={10} h={34} />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] leading-tight font-semibold text-ink">{block.name}</span>
        <span className="mono mt-0.5 block text-[12px] text-ink-2">
          {block.id} · {money(costOf(block))} · {status}
        </span>
      </span>
      {picked && (
        <span
          className="mono flex h-[22px] min-w-[22px] items-center justify-center bg-ink px-1 text-[12px] font-semibold text-paper"
          aria-label={`picked ${order}${order === 1 ? "st" : order === 2 ? "nd" : order === 3 ? "rd" : "th"}`}
        >
          {order}
        </span>
      )}
    </button>
  );
}

function Game({ data }: { data: ThreatData }) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [chips, setChips] = useState<{ gen: number; moves: (string | null)[] }>({ gen: 0, moves: [] });
  const result = useMemo(() => evaluatePosture(data, chosen), [data, chosen]);
  const later = useMemo(() => evaluatePosture(data, chosen, 2028), [data, chosen]);
  const shortlist = useMemo(
    () => SHORTLIST.map((id) => data.blocks.find((b) => b.id === id)).filter((b): b is Block => b !== undefined),
    [data]
  );

  const apply = (next: string[]) => {
    setChips((c) => ({ gen: c.gen + 1, moves: bandChips(bandsOf(result), bandsOf(evaluatePosture(data, next))) }));
    setChosen(next);
  };
  const toggle = (id: string) => apply(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);

  const requested = chosen.reduce((sum, id) => {
    const b = shortlist.find((x) => x.id === id);
    return sum + (b ? costOf(b) : 0);
  }, 0);
  const spent = result.spentMillions;
  const rows: LadderRow[] = result.score.tiers.map((t, i) => ({
    key: `oc${t.tier}`,
    code: `OC${t.tier}`,
    name: OC_TIERS[t.tier - 1].short,
    band: t.band,
    detail: t.detail,
    chip: chips.moves[i] ?? undefined,
    chipKey: chips.gen,
  }));
  const sl = result.score.sl;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-12">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="cap">Budget for {YEAR}</p>
          <p className="mono text-[14px] text-ink">
            <span className="font-semibold">{money(spent)}</span> of {money(BUDGET_MILLIONS)} spent
            {requested > spent + 0.5 && (
              <span className="text-signal-ink"> · {money(requested - spent)} doesn't fit</span>
            )}
          </p>
        </div>
        <div className="relative mt-2 h-[10px] border border-ink" aria-hidden>
          <span
            className="absolute inset-y-0 left-0 bg-ink transition-[width]"
            style={{ width: `${Math.min(100, (spent / BUDGET_MILLIONS) * 100)}%` }}
          />
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2" role="group" aria-label="Defenses you can fund">
          {shortlist.map((b) => (
            <Tile
              key={b.id}
              block={b}
              order={chosen.indexOf(b.id) + 1}
              result={result}
              onToggle={() => toggle(b.id)}
            />
          ))}
        </div>
        {/* On a phone the verdict sits below ten tiles; this keeps the headline
            in view while picking. */}
        <div className="sticky bottom-0 z-10 mt-3 flex items-center gap-3 border-t-2 border-ink bg-paper py-2 lg:hidden" aria-hidden>
          <span className="display text-[28px] text-ink">SL{sl.level}</span>
          {sl.level < 5 && <ProgressBar value={sl.progress} width={64} />}
          <span className="text-[14px] font-semibold text-ink">stops {result.stops}</span>
        </div>
        {chosen.length > 0 && (
          <button
            type="button"
            onClick={() => apply([])}
            className="mt-3 min-h-[36px] border border-rule-2 px-3 text-[14px] text-ink hover:border-ink"
          >
            Start over
          </button>
        )}
      </div>

      <div aria-live="polite">
        <SlMeter level={sl.level} progress={sl.progress} marginal={sl.marginal} value={sl.value} />
        <p className="mt-4 text-[20px] leading-snug font-semibold text-ink">
          You usually stop {result.stops}.
        </p>
        <div className="mt-3">
          <TierLadder rows={rows} label="Each attacker tier against your posture" />
        </div>
        <div className="mt-4 border-t border-ink pt-3 text-[14px] leading-[1.55] text-ink-2">
          <Coaching data={data} chosen={chosen} result={result} />
          <p className="mt-2">
            By 2028, with nothing more added: <Em>SL{later.score.sl.level}</Em>
            {later.score.sl.level < sl.level ? ", as AI lifts the attackers." : "."}
          </p>
        </div>
      </div>
    </div>
  );
}

export function BuildPostureGame() {
  const state = useThreatData();
  if (state.status !== "ready") return <DataPending error={state.status === "error" ? state.error : undefined} />;
  return <Game data={state.data} />;
}
