import type { ReactNode } from "react";
import { targetSl } from "../../engine/posture";
import type { PostureScore } from "../../engine/posture";
import { useSimulationStore } from "../../store/simulation";
import { useRecommendations, useScore } from "../../store/derived";
import { useUiStore } from "../../store/ui";
import { BandCells, ProgressTicks, TypeBar } from "../marks/Marks";
import { OC_NAMES, STAGE_SHORT, approachName, blockName, isOperational, vectorName } from "../../model/names";
import {
  BAR_PRESET_WORDS,
  bandTitle,
  completenessWord,
  leadTime,
  money,
  moneyRange,
  presetFor,
  slTitle,
} from "../../model/words";
import { StoryCaption } from "../timelapse/StoryCaption";

export function Section({ title, aside, children, className = "" }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`border-t border-ink pt-2.5 ${className}`}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <h2 className="cap">{title}</h2>
        {aside && <span className="text-[12px] text-ink-2">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function heldText(level: number): string {
  if (level === 0) return "holds no tier yet";
  if (level === 1) return "holds OC1";
  return `holds OC1–OC${level}`;
}

function SlBlock({ score, adversaryOc }: { score: PostureScore; adversaryOc: number }) {
  const { sl } = score;
  const lastChange = useUiStore((s) => s.lastChange);
  const target = targetSl(adversaryOc);
  const met = sl.level >= target;
  return (
    <div key={lastChange?.seq ?? 0} className={`-mx-2 px-2 pt-1 pb-3 ${lastChange ? "sl5-pulse" : ""}`}>
      <div className="flex items-baseline justify-between">
        <span className="cap">You are</span>
        <span className="text-[12px] text-ink-2">
          target <b className="text-ink">SL{target}</b> stops your OC{target} · {met ? "met" : "not yet"}
        </span>
      </div>
      <div className="mt-1 flex items-end gap-4">
        <div
          className="flex items-baseline leading-none font-black tracking-tight"
          title={slTitle(sl.value, sl.marginal)}
          aria-label={`Security level ${sl.level}${sl.marginal ? ", marginal" : ""}`}
          data-testid="sl-level"
        >
          <span className="text-[44px]" style={{ fontStretch: "95%" }}>
            SL
          </span>
          <span className="text-[72px]" style={{ fontStretch: "95%" }}>
            {sl.level}
          </span>
        </div>
        <div className="min-w-0 pb-2">
          <div className="text-[16px] leading-tight font-bold">{heldText(sl.level)}</div>
          {sl.level < 5 ? (
            <div className="mt-1.5 flex items-center gap-2" title={slTitle(sl.value, sl.marginal)}>
              <ProgressTicks progress={sl.progress} />
              <span className="text-[12px] text-ink-2">toward SL{sl.level + 1}</span>
            </div>
          ) : (
            <div className="mt-1 text-[12px] text-ink-2">every tier and the own model held</div>
          )}
          {sl.marginal && (
            <span
              className="mt-1.5 inline-block border border-ink px-1 font-plex text-[12px] leading-[16px]"
              title="Marginal: the highest tier held sits close to the bar — a small slip loses it"
            >
              marginal
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TierLadder({ score, adversaryOc }: { score: PostureScore; adversaryOc: number }) {
  const ocName = useSimulationStore((s) => s.ocDefinitions);
  const preset = presetFor(score.sl.bar);
  return (
    <Section
      title="Who gets through"
      aside={
        <span title={`"Stops" means fewer than ${BAR_PRESET_WORDS[preset].ratio} of an attacker's campaigns succeed`}>
          {BAR_PRESET_WORDS[preset].label.toLowerCase()} bar
        </span>
      }
    >
      <ol className="flex flex-col" data-testid="tier-ladder">
        {score.tiers.map((t) => {
          const current = t.tier === adversaryOc;
          const lineAfter = t.tier === score.sl.level && score.sl.level > 0 && score.sl.level < 5;
          const def = ocName.find((d) => d.level === t.tier);
          return (
            <li key={t.tier} className={lineAfter ? "border-b-2 border-ink" : ""}>
              <div
                className={`-mx-2 flex h-[25px] items-center gap-2 px-2 ${current ? "bg-tint" : ""}`}
                title={bandTitle(t.band, t.detail, `OC${t.tier} campaign success`)}
              >
                <span className={`w-[34px] font-plex text-[14px] font-semibold ${current ? "text-signal-ink" : "text-ink"}`}>
                  OC{t.tier}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2" title={def?.name}>
                  {OC_NAMES[t.tier]}
                  {current && <span className="sr-only"> (your adversary)</span>}
                </span>
                <BandCells band={t.band} size={12} />
                <span
                  className={`w-[118px] text-right text-[13px] font-bold ${t.band === "usually succeeds" ? "text-signal-ink" : "text-ink"}`}
                >
                  {t.band}
                </span>
              </div>
              {lineAfter && (
                <div className="flex justify-end pb-0.5 text-[12px] text-ink-2">your line · SL{score.sl.level} holds above</div>
              )}
            </li>
          );
        })}
        <li className="mt-1 border-t border-rule pt-1">
          <div
            className="flex h-[25px] items-center gap-2"
            title={
              bandTitle(score.aiInsider.band, score.aiInsider.detail, "Your own model, at this year's AI capability, getting its weights out") +
              ". SL5 also needs this held."
            }
          >
            <span className="min-w-0 flex-1 truncate text-[13px]">
              <b>Own model</b> <span className="text-ink-2">(AI insider)</span>
            </span>
            <BandCells band={score.aiInsider.band} size={12} />
            <span
              className={`w-[118px] text-right text-[13px] font-bold ${
                score.aiInsider.band === "usually succeeds" ? "text-signal-ink" : "text-ink"
              }`}
            >
              {score.aiInsider.band}
            </span>
          </div>
        </li>
      </ol>
    </Section>
  );
}

function GetsThrough({ score }: { score: PostureScore }) {
  const vectors = useSimulationStore((s) => s.threatModel.vectors);
  const scenarios = useSimulationStore((s) => s.threatModel.scenarios);
  const setFocus = useUiStore((s) => s.setFocusApproach);
  const focus = useUiStore((s) => s.focusApproach);
  const lim = score.sl.limitedBy;
  if (!lim) {
    return (
      <Section title="What still gets through">
        <p className="text-[14px]">Nothing at this bar: every tier and the lab's own model are held.</p>
      </Section>
    );
  }
  const isAi = lim.approach === "ai_insider";
  const who = isAi ? "Your own model" : `OC${lim.tier}`;
  const story = scenarios.find((s) => s.approach === lim.approach);
  const vById = new Map(vectors.map((v) => [v.id, v]));
  return (
    <Section
      title="What still gets through"
      aside={
        lim.approach && (
          <button
            type="button"
            className="underline decoration-rule-2 underline-offset-2 hover:decoration-ink"
            onClick={() => setFocus(focus === lim.approach ? null : lim.approach)}
          >
            {focus === lim.approach ? "show leading" : "trace it"}
          </button>
        )
      }
    >
      <p className="text-[16px] leading-snug font-medium">
        {who} {isAi ? "gets out" : "gets in"} through{" "}
        <b className="text-signal-ink">{approachName(lim.approach)}</b>.
      </p>
      <ol className="mt-1.5 flex flex-col gap-0.5">
        {lim.path.map((step, i) => {
          const v = vById.get(step.vectorId);
          return (
            <li key={i} className="flex items-baseline gap-2 text-[13px] leading-snug">
              <span className="w-[54px] shrink-0 font-plex text-[12px] text-ink-2">{STAGE_SHORT[step.stage]}</span>
              <span className="min-w-0" title={v?.name}>
                {vectorName(step.vectorId, v?.name)}
                {step.counters.length === 0 && <span className="text-ink-2"> · nothing in the way</span>}
                {v?.needs_government && (
                  <span
                    className="ml-1.5 border border-ink px-1 font-plex text-[12px] whitespace-nowrap"
                    title={v.needs_government_note ?? "No lab can stop this alone; government partnership relieves it"}
                  >
                    needs government
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      {story && <p className="mt-1.5 text-[12px] text-ink-2">Told as a scenario in “{story.name}”.</p>}
    </Section>
  );
}

function NextDefense() {
  const { analysis, stale } = useRecommendations(3);
  const highlightIds = useUiStore((s) => s.highlightIds);
  const setHighlight = useUiStore((s) => s.setHighlight);
  const openDetail = useUiStore((s) => s.openDetail);
  const setTab = useUiStore((s) => s.setTab);
  const playbackActive = useSimulationStore((s) => s.playbackActive);
  if (playbackActive) {
    return (
      <Section title="Next defense to fund">
        <p className="text-[13px] text-ink-2">Paused while a story plays.</p>
      </Section>
    );
  }
  return (
    <Section title="Next defense to fund" aside={stale ? "updating…" : analysis ? "engine-ranked" : undefined}>
      {!analysis ? (
        <p className="text-[13px] text-ink-2">Ranking…</p>
      ) : analysis.candidates.length === 0 ? (
        <p className="text-[13px] text-ink-2">
          Nothing affordable moves a tier. Raise the budget, or turn on future capabilities in Parameters.
        </p>
      ) : (
        <ol className={`flex flex-col ${stale ? "opacity-60" : ""}`} data-testid="next-defense">
          {analysis.candidates.map((c) => {
            const ids = c.blockIds;
            const on = ids.every((id) => highlightIds.includes(id));
            const lo = c.prerequisites.reduce((s, b) => s + b.dimensions.cost.upfront_millions.min, c.block.dimensions.cost.upfront_millions.min);
            const hi = c.prerequisites.reduce((s, b) => s + b.dimensions.cost.upfront_millions.max, c.block.dimensions.cost.upfront_millions.max);
            const lead = c.block.dimensions.time_to_deploy_months;
            const narrows = c.narrowed[0]?.approach.id;
            return (
              <li key={c.block.id} className="border-b border-rule last:border-b-0">
                <div className={`-mx-2 flex items-start gap-2 px-2 py-1.5 ${on ? "bg-tint" : ""}`}>
                  <TypeBar type={c.block.defense_type} width={5} height={30} className="mt-0.5 shrink-0" />
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    aria-pressed={on}
                    onClick={() => {
                      setTab("catalogue");
                      setHighlight(on ? [] : ids);
                    }}
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="truncate text-[14px] font-bold">{blockName(c.block.id, c.block.name)}</span>
                      <span className="font-plex text-[12px] text-ink-3">{c.block.id}</span>
                    </span>
                    <span className="block text-[12px] leading-snug text-ink-2">
                      {moneyRange(lo, hi)} · {leadTime(lead.min, lead.max)}
                      {narrows && <> · narrows {approachName(narrows)}</>}
                      {c.prerequisites.length > 0 && <> · with {c.prerequisites.map((b) => b.id).join(", ")}</>}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Details for ${blockName(c.block.id)}`}
                    className="mt-0.5 px-1 font-plex text-[12px] text-ink-2 hover:text-ink"
                    onClick={() => openDetail(c.block.id)}
                  >
                    ⋯
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}

function CompletenessAndBudget({ score }: { score: PostureScore }) {
  const budget = useSimulationStore((s) => s.sliders.budget_millions);
  const today = score.catalogue.filter((b) => !b.future);
  const inPlace = today.filter((b) => isOperational(score.effectiveStates[b.id])).length;
  const unfunded = score.budgetExceededIds.size;
  const share = Math.min(1, score.spentMillions / Math.max(1, budget));
  return (
    <section className="grid grid-cols-[1fr_1.15fr] gap-5 border-t border-ink pt-2.5">
      <div title="Programme completeness: how much of today's catalogue is in place, by category. Breadth, not whether any tier holds.">
        <h2 className="cap">Program completeness</h2>
        <div className="mt-2 h-[4px] bg-tint">
          <div className="h-full bg-ink" style={{ width: `${((score.programCompleteness - 1) / 4) * 100}%` }} />
        </div>
        <div className="mt-1.5 text-[13px] text-ink-2">
          <b className="text-ink">{completenessWord(score.programCompleteness)}</b> · {inPlace} of {today.length} in place
        </div>
      </div>
      <div>
        <h2 className="cap">Budget</h2>
        <div className="mt-0.5 flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-[28px] leading-none font-extrabold tracking-tight">{money(score.spentMillions)}</span>
          <span className="text-[13px] text-ink-2">of {money(budget)}</span>
        </div>
        <div className="mt-1.5 h-[4px] bg-tint">
          <div className="h-full bg-ink" style={{ width: `${share * 100}%` }} />
        </div>
        <div className="mt-1 text-[12px] text-ink-2">beyond today's posture</div>
        {unfunded > 0 && (
          <div className="mt-1 text-[12px] text-ink-2">
            <b className="text-ink">{unfunded}</b> {unfunded === 1 ? "block" : "blocks"} past the budget line, not built
          </div>
        )}
      </div>
    </section>
  );
}

function Meters({ score }: { score: PostureScore }) {
  const leak = score.capabilityLeakage;
  const rows: { label: string; note: string; band: PostureScore["integrity"]["band"] | null; title: string }[] = [
    {
      label: "Leakage",
      note: "capability, via API",
      band: leak.active ? leak.band : null,
      title: leak.active
        ? bandTitle(leak.band, leak.detail, "Capability copied through the API, per campaign") +
          `. Copied since 2026: ${leak.cumulative < 0.2 ? "little" : leak.cumulative < 0.6 ? "a partial copy" : "most of the capability"}.`
        : "Off: the model is not served externally",
    },
    {
      label: "Integrity",
      note: "sabotage",
      band: score.integrity.band,
      title: bandTitle(score.integrity.band, score.integrity.detail, "Sabotage by your own model"),
    },
    {
      label: "AI insider",
      note: "own model gets out",
      band: score.aiInsider.band,
      title: bandTitle(score.aiInsider.band, score.aiInsider.detail, "Your own model getting its weights out"),
    },
  ];
  return (
    <Section title="Outside the SL">
      <ul className="grid grid-cols-3 gap-3">
        {rows.map((r) => (
          <li key={r.label} className="min-w-0" title={r.title}>
            <div className="truncate text-[13px] font-bold">{r.label}</div>
            <div className="text-[12px] text-ink-2">{r.note}</div>
            {r.band ? (
              <div className="mt-1 flex flex-col gap-1">
                <BandCells band={r.band} size={10} />
                <span className="text-[13px] font-semibold">{r.band}</span>
              </div>
            ) : (
              <div className="mt-1 text-[13px] text-ink-2">off: not served</div>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

export function VerdictRail() {
  const score = useScore();
  const adversaryOc = useSimulationStore((s) => s.adversaryOc);
  return (
    <div className="flex flex-col gap-3 pt-3 pb-6" data-testid="verdict-rail">
      <StoryCaption />
      <SlBlock score={score} adversaryOc={adversaryOc} />
      <TierLadder score={score} adversaryOc={adversaryOc} />
      <GetsThrough score={score} />
      <NextDefense />
      <CompletenessAndBudget score={score} />
      <Meters score={score} />
    </div>
  );
}
