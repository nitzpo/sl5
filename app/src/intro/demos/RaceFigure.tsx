import { useMemo, useState } from "react";
import { RACE_BLOCKS } from "../content";
import { useThreatData, type ThreatData } from "../data";
import { scoreScene, threatFrontYear } from "../engine-views";
import { monthRange, monthYear } from "../format";
import { BlockGlyph, DataPending, Segmented } from "../slides/parts";

// Slide 12: long-lead defenses, started in a chosen year, against the threat
// front: the year the engine's AI curve lets an attacker work like the next
// tier up on code and credential steps. Under it, today's typical lab left
// alone, scored year by year.

const FROM = 2026;
const TO = 2034;
const x = (year: number) => `${((Math.min(TO, Math.max(FROM, year)) - FROM) / (TO - FROM)) * 100}%`;
const AXIS = [2026, 2028, 2030, 2032, 2034];
const PACE = { slower: 0, expected: 0.5, faster: 1 } as const;
type Pace = keyof typeof PACE;

function Track({ children, front }: { children?: React.ReactNode; front: number | null }) {
  return (
    <div className="relative h-[26px]">
      <span className="absolute inset-x-0 top-1/2 h-px bg-rule" />
      {front !== null && front <= TO && (
        <span className="absolute -inset-y-1 w-[2px] bg-signal" style={{ left: x(front) }} />
      )}
      {children}
    </div>
  );
}

function Demo({ data }: { data: ThreatData }) {
  const [start, setStart] = useState(2026);
  const [pace, setPace] = useState<Pace>("expected");
  const front = threatFrontYear(PACE[pace]);
  const blocks = RACE_BLOCKS.map((id) => data.blocks.find((b) => b.id === id)).filter((b) => b !== undefined);
  const leftAlone = useMemo(
    () =>
      [2026, 2027, 2028, 2029, 2030].map((year) => {
        const s = scoreScene(data, { posture: "typical-lab", year, aiTimeline: PACE[pace] });
        return { year, level: s.sl.level };
      }),
    [data, pace]
  );
  const firstDrop = leftAlone.find((r) => r.level < leftAlone[0].level);

  return (
    <div>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <Segmented
          label="Start building in"
          options={[2026, 2027, 2028].map((y) => ({ value: y, label: String(y) }))}
          value={start}
          onChange={setStart}
        />
        <Segmented
          label="AI pace"
          options={[
            { value: "slower", label: "Slower" },
            { value: "expected", label: "Expected" },
            { value: "faster", label: "Faster" },
          ]}
          value={pace}
          onChange={setPace}
        />
      </div>

      <p className="mt-4 text-[16px] text-ink">
        <span aria-hidden className="mr-2 inline-block h-[14px] w-[3px] translate-y-[2px] bg-signal" />
        The front:{" "}
        <span className="font-semibold text-signal-ink">
          {front === null ? "after 2040" : front > TO ? `${monthYear(front)}, past this chart` : monthYear(front)}
        </span>
        <span className="text-ink-2"> — when AI lets an attacker work like the next tier up on code and credential steps.</span>
      </p>

      <div className="mt-4">
      <div role="list" aria-label={`Lead times of long-lead defenses started in ${start}, against the threat front`}>
        {blocks.map((b) => {
          const { min, max } = b.dimensions.time_to_deploy_months;
          const early = start + min / 12;
          const late = start + max / 12;
          const status =
            front === null || late <= front ? "before" : early >= front ? "after" : "maybe";
          const words =
            status === "before" ? "lands before the front" : status === "after" ? "lands after the front" : "may land after the front";
          return (
            <div
              key={b.id}
              role="listitem"
              aria-label={`${b.name}: ${monthRange(min, max)}, operational ${monthYear(early)} to ${monthYear(late)}; ${words}`}
              className="grid items-center gap-x-4 border-t border-rule py-2 sm:grid-cols-[15rem_1fr_11rem]"
            >
              <div className="flex items-center gap-2.5">
                <BlockGlyph type={b.defense_type} state="not_started" w={8} h={26} />
                <div className="min-w-0">
                  <p className="text-[14px] leading-tight font-semibold text-ink">{b.name}</p>
                  <p className="mono text-[12px] text-ink-2">
                    {b.id} · {monthRange(min, max)}
                  </p>
                </div>
              </div>
              <Track front={front}>
                <span className="absolute top-[7px] h-[12px] bg-ink" style={{ left: x(start), width: `calc(${x(early)} - ${x(start)})` }} />
                <span
                  className="hatch-ink absolute top-[7px] h-[12px] border border-ink"
                  style={{ left: x(early), width: `calc(${x(late)} - ${x(early)})` }}
                />
              </Track>
              <p
                className={`text-[14px] font-semibold sm:text-right ${
                  status === "before" ? "text-ink" : "text-signal-ink"
                }`}
              >
                {words}
              </p>
            </div>
          );
        })}
      </div>
        <div className="grid gap-x-4 border-t border-ink pt-1 sm:grid-cols-[15rem_1fr_11rem]">
          <span className="hidden sm:block" />
          <div className="relative h-[18px]">
            {AXIS.map((yr) => (
              <span
                key={yr}
                className="mono absolute text-[12px] text-ink-2"
                style={{
                  left: x(yr),
                  transform: yr === FROM ? "none" : yr === TO ? "translateX(-100%)" : "translateX(-50%)",
                }}
              >
                {yr}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-ink pt-3">
        <p className="cap">Today's typical lab, if nothing is added</p>
        <ol className="mt-2 flex flex-wrap gap-x-5 gap-y-1" aria-label="Security level of today's typical lab by year, if nothing is added">
          {leftAlone.map((r) => (
            <li key={r.year} className="text-[14px]">
              <span className="mono text-ink-2">{r.year}</span>{" "}
              <span className={`font-semibold ${r.level < leftAlone[0].level ? "text-signal-ink" : "text-ink"}`}>SL{r.level}</span>
            </li>
          ))}
        </ol>
        <p className="mt-1 text-[14px] text-ink-2">
          {firstDrop
            ? `Doing nothing is a decline: AI lifts the attackers past today's defenses by ${firstDrop.year}.`
            : leftAlone[0].level === 0
              ? "At this pace, today's typical lab doesn't hold even OC1."
              : "At this pace, today's typical lab holds its level through 2030."}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-ink-2">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block h-[12px] w-[22px] bg-ink" /> fastest build
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="hatch-ink inline-block h-[12px] w-[22px] border border-ink" /> could take this long
        </span>
      </div>
    </div>
  );
}

export function RaceFigure() {
  const state = useThreatData();
  if (state.status !== "ready") return <DataPending error={state.status === "error" ? state.error : undefined} />;
  return <Demo data={state.data} />;
}
