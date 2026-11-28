import { useMemo, useState } from "react";
import { OC_TIERS } from "../content";
import { useThreatData, type ThreatData } from "../data";
import {
  APPROACH_LABEL,
  bandChips,
  scoreScene,
  shortVectorName,
  STAGE_LABEL,
  type PostureKind,
  type Strictness,
  type World,
} from "../engine-views";
import { DataPending, Segmented, SlMeter, Switch, TierLadder, type LadderRow } from "../slides/parts";

// Slide 11: the verdict the instrument shows, on the real engine. Two postures,
// the strictness bar, the world outside the lab, and whether the
// research-required defenses are built: enough to see that SL5 needs all of
// them, and why it is out of reach today.

interface DemoScene {
  posture: PostureKind;
  strictness: Strictness;
  world: World;
  research: boolean;
}

const bandsOf = (s: ReturnType<typeof scoreScene>) => [...s.tiers.map((t) => t.band), s.aiInsider.band];

function Demo({ data }: { data: ThreatData }) {
  const [scene, setScene] = useState<DemoScene>({
    posture: "every-defense",
    strictness: "standard",
    world: "as-today",
    research: true,
  });
  const [chips, setChips] = useState<{ gen: number; moves: (string | null)[] }>({ gen: 0, moves: [] });
  const score = useMemo(() => scoreScene(data, scene), [data, scene]);
  const names = useMemo(() => new Map(data.model.vectors.map((v) => [v.id, v.name])), [data]);

  /** Change one setting, and note which rows moved band so they can say so. */
  const update = (patch: Partial<DemoScene>) => {
    const next = { ...scene, ...patch };
    setChips((c) => ({ gen: c.gen + 1, moves: bandChips(bandsOf(score), bandsOf(scoreScene(data, next))) }));
    setScene(next);
  };
  const { posture, strictness, world, research } = scene;
  const setPosture = (v: PostureKind) => update({ posture: v });
  const setStrictness = (v: Strictness) => update({ strictness: v });
  const setWorld = (v: World) => update({ world: v });
  const setResearch = (v: boolean) => update({ research: v });

  const rows: LadderRow[] = [
    ...score.tiers.map((t, i) => ({
      key: `oc${t.tier}`,
      code: `OC${t.tier}`,
      name: OC_TIERS[t.tier - 1].short,
      band: t.band,
      detail: t.detail,
      chip: chips.moves[i] ?? undefined,
      chipKey: chips.gen,
    })),
    {
      key: "own",
      code: "Own model",
      name: "as an insider",
      band: score.aiInsider.band,
      detail: score.aiInsider.detail,
      chip: chips.moves[5] ?? undefined,
      chipKey: chips.gen,
    },
  ];

  const limit = score.sl.limitedBy;
  const limitText = limit
    ? limit.tier === 5 && limit.approach === "ai_insider"
      ? "your own model, as an insider"
      : `OC${limit.tier}, via ${(APPROACH_LABEL[limit.approach ?? ""] ?? limit.approach ?? "").toLowerCase()}`
    : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
      <div className="space-y-4">
        <Segmented
          label="Posture"
          options={[
            { value: "typical-lab", label: "Today's typical lab" },
            { value: "every-defense", label: "Every defense, mature" },
          ]}
          value={posture}
          onChange={setPosture}
        />
        <Segmented
          label="How strict is “stops”"
          options={[
            { value: "strict", label: "Strict" },
            { value: "standard", label: "Standard" },
            { value: "lenient", label: "Lenient" },
          ]}
          value={strictness}
          onChange={setStrictness}
        />
        <Segmented
          label="World"
          options={[
            { value: "as-today", label: "As today" },
            { value: "favourable", label: "Favourable" },
          ]}
          value={world}
          onChange={setWorld}
        />
        <p className="text-[14px] leading-[1.5] text-ink-2">
          {world === "as-today"
            ? "Model served through an API; little help from government or vendors."
            : "Model kept off the public API; full government, vendor and organisational cooperation."}
        </p>
        <Switch label="Research-required defenses built" note="(not possible yet)" checked={research} onChange={setResearch} />
        <p className="text-[14px] text-ink-2">2026 · every number from the instrument's engine.</p>
      </div>

      <div aria-live="polite">
        <SlMeter
          level={score.sl.level}
          progress={score.sl.progress}
          marginal={score.sl.marginal}
          value={score.sl.value}
          prefix={posture === "typical-lab" ? "Today's typical lab is" : "Every defense, mature, is"}
        />
        <div className="mt-5">
          <TierLadder rows={rows} label="Each attacker tier against this posture" />
        </div>
        {limitText && limit && (
          <div className="mt-4 border-t border-ink pt-3">
            <p className="cap">What still gets through</p>
            <p className="mt-1 text-[16px] font-semibold text-ink">{limitText}</p>
            <ol className="mt-1 space-y-0.5 text-[14px] text-ink-2">
              {limit.path.map((s) => (
                <li key={s.stage + s.vectorId}>
                  <span className="mono text-[12px] text-ink-3">{STAGE_LABEL[s.stage]}</span>{" "}
                  {shortVectorName(names.get(s.vectorId) ?? s.vectorId)}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

export function SecurityLevelDemo() {
  const state = useThreatData();
  if (state.status !== "ready") return <DataPending error={state.status === "error" ? state.error : undefined} />;
  return <Demo data={state.data} />;
}
