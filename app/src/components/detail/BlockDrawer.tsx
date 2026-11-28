import { useEffect, useMemo, useRef } from "react";
import type { Block, BlockState, Stage } from "../../engine/types";
import { useSimulationStore } from "../../store/simulation";
import { useScore } from "../../store/derived";
import { useUiStore } from "../../store/ui";
import { blockColumn } from "../../model/catalogue-layout";
import {
  CATEGORY_NAMES,
  STAGE_LABELS,
  STATES,
  STATE_WORDS,
  TYPE_NOTES,
  TYPE_WORDS,
  approachName,
  blockName,
  isOperational,
  vectorName,
} from "../../model/names";
import { leadTime, moneyRange, shareWord } from "../../model/words";
import { TypeBar } from "../marks/Marks";
import { TILE_FILL } from "../marks/geometry";

function StateControl({ block, state }: { block: Block; state: BlockState }) {
  const setBlockState = useSimulationStore((s) => s.setBlockState);
  const playing = useSimulationStore((s) => s.playbackActive);
  const idx = STATES.indexOf(state);
  return (
    <div className="grid grid-cols-5 gap-[3px]" role="radiogroup" aria-label="State">
      {STATES.map((s, i) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={i === idx}
          disabled={playing}
          onClick={() => setBlockState(block.id, s)}
          className={`relative h-9 border text-[12px] leading-tight font-semibold disabled:cursor-default ${
            i === idx ? "border-ink bg-ink text-paper" : i < idx ? "border-tint bg-tint text-ink-2" : "border-rule-2 text-ink-2 hover:border-ink"
          }`}
        >
          {STATE_WORDS[s]}
        </button>
      ))}
    </div>
  );
}

function MiniBlock({ id, blocks, states, onOpen }: { id: string; blocks: Map<string, Block>; states: Record<string, BlockState>; onOpen: (id: string) => void }) {
  const b = blocks.get(id);
  if (!b) return null;
  const st = states[id] ?? "not_started";
  const fill = TILE_FILL[st];
  return (
    <button type="button" onClick={() => onOpen(id)} className="flex w-full items-center gap-2 py-1 text-left hover:bg-tint">
      <TypeBar type={b.defense_type} width={5} height={18} />
      <span className="relative h-[14px] w-[22px] shrink-0 border border-ink-2" aria-hidden="true">
        <span className="absolute inset-x-0 bottom-0 bg-ink" style={{ height: `${fill * 100}%` }} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{blockName(id, b.name)}</span>
      <span className="font-plex text-[12px] text-ink-3">{id}</span>
      <span className={`w-[92px] text-right text-[12px] ${isOperational(st) ? "font-semibold text-ink" : "text-ink-2"}`}>{STATE_WORDS[st].toLowerCase()}</span>
    </button>
  );
}

export function BlockDrawer() {
  const detailId = useUiStore((s) => s.detailId);
  const openDetail = useUiStore((s) => s.openDetail);
  const blocks = useSimulationStore((s) => s.blocks);
  const vectors = useSimulationStore((s) => s.threatModel.vectors);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const futureOn = useSimulationStore((s) => s.futureCapabilities);
  const score = useScore();
  const closeRef = useRef<HTMLButtonElement>(null);
  const byId = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks]);
  const vById = useMemo(() => new Map(vectors.map((v) => [v.id, v])), [vectors]);
  const block = detailId ? byId.get(detailId) : undefined;

  useEffect(() => {
    if (!detailId) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && openDetail(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailId, openDetail]);

  if (!block) return null;
  const state = blockStates[block.id] ?? "not_started";
  const eff = score.effectiveStates[block.id] ?? state;
  const rel = score.blockRelevance[block.id];
  const column = blockColumn(block, vById);
  const cost = block.dimensions.cost.upfront_millions;
  const annual = block.dimensions.cost.annual_ongoing_millions;
  const lead = block.dimensions.time_to_deploy_months;
  const comp = block.dependencies.completed_by;
  const requires = block.dependencies.requires;
  const inactiveFuture = block.future && !futureOn;
  const byStage = new Map<Stage, typeof block.counters>();
  for (const c of block.counters) {
    const st = vById.get(c.vector_id)?.stage ?? "entry";
    byStage.set(st, [...(byStage.get(st) ?? []), c]);
  }
  const headline = new Set(score.approaches.filter((a) => a.active).map((a) => a.id));
  const binding = (rel?.binding ?? []).filter((a) => headline.has(a));
  const onPathVectors = new Set(score.approaches.filter((a) => a.active).flatMap((a) => a.path.map((s) => s.vectorId)));

  return (
    <aside
      className="absolute top-0 right-0 bottom-0 z-40 flex w-[460px] flex-col border-l-2 border-ink bg-paper"
      aria-label={`Details: ${blockName(block.id, block.name)}`}
      data-testid="block-drawer"
    >
      <div className="flex items-start gap-3 border-b border-ink px-6 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <div className="cap">
            {CATEGORY_NAMES[block.category]} · {column === "detect" ? "Detect & respond" : STAGE_LABELS[column]}
          </div>
          <div className="mt-1.5 flex items-center gap-2.5">
            <TypeBar type={block.defense_type} width={8} height={32} />
            <h2 className="text-[28px] leading-[1.05] font-extrabold tracking-tight">{blockName(block.id, block.name)}</h2>
          </div>
          <div className="mt-1 text-[13px] text-ink-2">
            <span className="font-plex font-semibold text-ink">{block.id}</span> · {block.name}
          </div>
          <div className="mt-0.5 text-[13px] text-ink-2">
            <b className="text-ink">{TYPE_WORDS[block.defense_type]}</b> · {TYPE_NOTES[block.defense_type]}
          </div>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={() => openDetail(null)}
          aria-label="Close details"
          className="flex h-8 w-8 items-center justify-center border border-ink text-[16px] hover:bg-ink hover:text-paper"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-3 pb-8">
        {block.future && (
          <div className="mb-3 border-2 border-ink p-2.5 text-[13px] leading-snug">
            <b>R&amp;D — a future capability.</b> <span data-prose>{block.future_note}</span>
            {inactiveFuture && <div className="mt-1 text-ink-2">Counted only when “Future capabilities” is on (Parameters).</div>}
          </div>
        )}

        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="cap">State</h3>
          <span className="text-[12px] text-ink-2">click a step · or click the block to step on</span>
        </div>
        <StateControl block={block} state={state} />
        {score.budgetExceededIds.has(block.id) && (
          <p className="mt-1.5 text-[13px]">
            <b>Past the budget line:</b> not funded, so it counts as {STATE_WORDS[eff].toLowerCase()}.
          </p>
        )}
        {score.dependencyUnmetIds.has(block.id) && (
          <p className="mt-1.5 text-[13px]">
            <b>Waiting on a prerequisite</b> ({(score.dependencyUnmetRequires.get(block.id) ?? []).join(", ")}): it counts as{" "}
            {STATE_WORDS[eff].toLowerCase()} until that is deployed.
          </p>
        )}

        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-ink pt-2.5">
          <div>
            <dt className="cap">Upfront</dt>
            <dd className="mt-0.5 text-[20px] leading-tight font-bold">{moneyRange(cost.min, cost.max)}</dd>
            <dd className="text-[12px] text-ink-2">+ {moneyRange(annual.min, annual.max)} a year</dd>
          </div>
          <div>
            <dt className="cap">Lead time</dt>
            <dd className="mt-0.5 text-[20px] leading-tight font-bold">{leadTime(lead.min, lead.max)}</dd>
          </div>
          <div>
            <dt className="cap">On its own</dt>
            <dd className="mt-0.5 text-[20px] leading-tight font-bold">{comp ? shareWord(comp.standalone_share) : "the whole job"}</dd>
          </div>
        </dl>

        {comp && (
          <section className="mt-4 border-t border-ink pt-2.5">
            <div className="flex items-baseline justify-between">
              <h3 className="cap">Needs these to hold</h3>
              <span className="text-[12px] text-ink-2">
                {comp.blocks.filter((id) => !isOperational(blockStates[id])).length} of {comp.blocks.length} not yet deployed
              </span>
            </div>
            <div className="mt-1">
              {comp.blocks.map((id) => (
                <MiniBlock key={id} id={id} blocks={byId} states={blockStates} onOpen={openDetail} />
              ))}
            </div>
            <p className="mt-1.5 text-[13px] leading-snug text-ink-2" data-prose>
              {comp.why}
            </p>
          </section>
        )}

        {requires.length > 0 && (
          <section className="mt-4 border-t border-ink pt-2.5">
            <h3 className="cap">Prerequisites</h3>
            <p className="text-[12px] text-ink-2">It cannot be deployed before these are.</p>
            <div className="mt-1">
              {requires.map((id) => (
                <MiniBlock key={id} id={id} blocks={byId} states={blockStates} onOpen={openDetail} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-4 border-t border-ink pt-2.5">
          <div className="flex items-baseline justify-between">
            <h3 className="cap">Counters</h3>
            <span className="text-[12px] text-ink-2">
              <b className="text-ink">■</b> strong · <span className="text-ink">□</span> partial ·{" "}
              <span className="text-signal-ink">●</span> on an easiest path now
            </span>
          </div>
          {(["entry", "reach", "exfil"] as Stage[]).map((st) =>
            byStage.get(st)?.length ? (
              <div key={st} className="mt-1.5">
                <div className="font-plex text-[12px] text-ink-2">{STAGE_LABELS[st]}</div>
                <ul>
                  {byStage.get(st)!.map((c) => {
                    const v = vById.get(c.vector_id);
                    return (
                      <li key={c.vector_id} className="flex items-baseline gap-2 text-[13px] leading-snug" title={v?.name ?? c.vector_id}>
                        <span className="w-3 shrink-0 text-center">{c.strength === "strong" ? "■" : "□"}</span>
                        <span className={`min-w-0 flex-1 ${c.strength === "strong" ? "font-semibold" : ""}`}>
                          {vectorName(c.vector_id, v?.name)}
                        </span>
                        {onPathVectors.has(c.vector_id) && <span className="text-signal-ink" aria-label="on an easiest path now">●</span>}
                        <span className="font-plex text-[12px] text-ink-3">{c.vector_id}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null
          )}
        </section>

        <section className="mt-4 border-t border-ink pt-2.5">
          <h3 className="cap">Where it does the work</h3>
          {binding.length > 0 ? (
            <p className="mt-1 text-[14px] leading-snug">
              On the easiest path of {binding.map((a, i) => (
                <span key={a}>
                  {i > 0 && (i === binding.length - 1 ? " and " : ", ")}
                  <b>{approachName(a)}</b>
                </span>
              ))}
              {binding.length >= 3 && <span className="text-ink-2"> — a choke point</span>}.
            </p>
          ) : (
            <p className="mt-1 text-[14px] leading-snug text-ink-2">
              Not on any approach's easiest path at this tier right now. It still counters{" "}
              {(rel?.approaches ?? []).map((a) => approachName(a)).join(", ") || "its vectors"}.
            </p>
          )}
        </section>

        {/* Research prose from the data, quoted as written (it may cite
            measured figures); the model's own numbers never appear as one. */}
        <section className="mt-4 border-t border-ink pt-2.5" data-prose>
          <h3 className="cap">Where labs are today</h3>
          <p className="mt-1 text-[13px] leading-relaxed">{block.current_state.summary}</p>
          {block.current_state.deployed_by.length > 0 && (
            <p className="mt-1 text-[12px] text-ink-2">Deployed by: {block.current_state.deployed_by.join(", ")}</p>
          )}
        </section>

        {block.open_questions.length > 0 && (
          <section className="mt-4 border-t border-ink pt-2.5" data-prose>
            <h3 className="cap">Open questions</h3>
            <ul className="mt-1 flex flex-col gap-1.5">
              {block.open_questions.map((q, i) => (
                <li key={i} className="text-[13px] leading-snug">
                  {q.question} <span className="font-plex text-[12px] text-ink-2">[{q.uncertainty_level}]</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-4 border-t border-ink pt-2.5" data-prose>
          <h3 className="cap">What it is</h3>
          <p className="mt-1 text-[13px] leading-relaxed">{block.description}</p>
          {block.reclassified && (
            <p className="mt-1 text-[12px] text-ink-2">
              Reclassified from {TYPE_WORDS[block.reclassified.from].toLowerCase()}: {block.reclassified.why}
            </p>
          )}
        </section>
      </div>
    </aside>
  );
}
