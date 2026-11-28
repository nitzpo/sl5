import { useMemo, useState } from "react";
import { bandWord } from "../../engine/threat-sl";
import type { Stage } from "../../engine/types";
import { STAGES } from "../../engine/types";
import { useThreatData, type ThreatData } from "../data";
import { APPROACH_LABEL, countersOf, scoreScene, shortVectorName, STAGE_LABEL, type Scene } from "../engine-views";
import { BandMark, BlockGlyph, DataPending, Segmented } from "../slides/parts";

// Slide 9: one approach's easiest attack path, live. The posture is today's
// typical lab; the reader deploys defenses on the path and watches the engine
// (`scorePosture`) move the attacker to the next-easiest vector.

const OC = 3;
const APPROACHES = ["remote", "insider", "physical", "supply_chain"] as const;
type ApproachId = (typeof APPROACHES)[number];

const sceneFor = (extra: string[]): Scene => ({
  posture: "typical-lab",
  world: "as-today",
  served: false,
  adversaryOc: OC,
  extra,
});

function Demo({ data }: { data: ThreatData }) {
  const [approach, setApproach] = useState<ApproachId>("remote");
  const [extra, setExtra] = useState<string[]>([]);
  const score = useMemo(() => scoreScene(data, sceneFor(extra)), [data, extra]);
  const names = useMemo(() => new Map(data.model.vectors.map((v) => [v.id, v.name])), [data]);
  const blocks = useMemo(() => new Map(data.blocks.map((b) => [b.id, b])), [data]);

  const a = score.approaches.find((x) => x.id === approach)!;
  const bar = score.sl.bar;
  const byStage = new Map(a.path.map((s) => [s.stage, s]));
  const tier = score.tiers[OC - 1];

  const toggle = (id: string) => setExtra((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Segmented
          label="Approach"
          options={APPROACHES.map((id) => ({ value: id, label: APPROACH_LABEL[id] }))}
          value={approach}
          onChange={setApproach}
        />
        {extra.length > 0 && (
          <button
            type="button"
            onClick={() => setExtra([])}
            className="min-h-[36px] border border-rule-2 px-3 text-[14px] text-ink hover:border-ink"
          >
            Reset defenses
          </button>
        )}
      </div>

      <p className="mt-5 text-[16px] text-ink">
        Easiest attack path for an <span className="font-semibold text-signal-ink">OC{OC}</span> attacker, via{" "}
        {APPROACH_LABEL[approach].toLowerCase()}:{" "}
        <span className="inline-block align-middle">
          <BandMark band={bandWord(a.p, bar)} />
        </span>
      </p>

      <ol className="mt-4 grid gap-6 md:grid-cols-3 md:gap-0" aria-label="Attack path, stage by stage">
        {STAGES.map((stage: Stage, i) => {
          const step = byStage.get(stage);
          const counters = step ? countersOf(data, step.vectorId, false).slice(0, 3) : [];
          return (
            <li key={stage} className={`md:pr-5 ${i > 0 ? "md:pl-5" : ""}`}>
              <div className={`border-t-[5px] pt-2 ${step ? "border-signal" : "border-dashed border-rule-2"}`}>
                <p className="cap">
                  {i + 1} · {STAGE_LABEL[stage]}
                </p>
                {step ? (
                  <div key={step.vectorId} className="intro-enter">
                    <p className="mt-1.5 text-[16px] leading-snug font-semibold text-ink md:min-h-[48px]" title={names.get(step.vectorId)}>
                      {shortVectorName(names.get(step.vectorId) ?? step.vectorId)}
                    </p>
                    <div className="mt-1">
                      <BandMark band={bandWord(step.p, bar)} />
                    </div>
                  </div>
                ) : (
                  <p className="mt-1.5 text-[14px] text-ink-2 md:min-h-[48px]">Not needed on this path</p>
                )}
              </div>
              {counters.length > 0 && (
                <div className="mt-3">
                  <p className="text-[12px] text-ink-2">Defenses that counter it</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {counters.map((c) => {
                      const on = extra.includes(c.block.id);
                      return (
                        <li key={c.block.id}>
                          <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggle(c.block.id)}
                            className={`flex w-full items-center gap-2.5 border px-2 py-1.5 text-left ${
                              on ? "border-ink bg-tint" : "border-rule-2 hover:border-ink"
                            }`}
                          >
                            <BlockGlyph
                              type={blocks.get(c.block.id)!.defense_type}
                              state={on ? "mature" : (score.effectiveStates[c.block.id] ?? "not_started")}
                              w={8}
                              h={26}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[14px] leading-tight font-semibold text-ink">{c.block.name}</span>
                              <span className="mono block text-[12px] text-ink-2">
                                {c.block.id} · {c.strength} · {on ? "deployed" : "deploy"}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-6 border-t border-ink pt-3">
        <p className="cap">Every approach, against OC{OC}</p>
        <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {score.approaches
            .filter((x) => APPROACHES.includes(x.id as ApproachId))
            .map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 border-b border-rule py-1">
                <span className={`text-[14px] ${x.id === approach ? "font-semibold text-ink" : "text-ink-2"}`}>
                  {APPROACH_LABEL[x.id]}
                </span>
                <BandMark band={bandWord(x.p, bar)} />
              </li>
            ))}
        </ul>
        <p className="mt-3 text-[14px] text-ink">
          Altogether, OC{OC} against this posture: <BandMarkInline band={tier.band} />
        </p>
      </div>
    </div>
  );
}

function BandMarkInline({ band }: { band: ReturnType<typeof bandWord> }) {
  return (
    <span className={`font-semibold ${band === "usually succeeds" ? "text-signal-ink" : "text-ink"}`}>{band}</span>
  );
}

export function AttackPathDemo() {
  const state = useThreatData();
  if (state.status !== "ready") return <DataPending error={state.status === "error" ? state.error : undefined} />;
  return <Demo data={state.data} />;
}
