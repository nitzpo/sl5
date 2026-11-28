import { useMemo, useState } from "react";
import type { BandWord } from "../../engine/threat-sl";
import type { AttackVector, Stage } from "../../engine/types";
import { STAGES } from "../../engine/types";
import { useThreatData } from "../data";
import { STAGE_LABEL, unpreparedBand } from "../engine-views";
import { DataPending, Segmented } from "../slides/parts";

// Slide 8: RAND's attack vectors at their stages, marked by what an attacker
// at the chosen tier can usually do with each against a lab with no defenses
// (RAND's Table 5.2 feasibility, read by the engine's `baseFeasibility`).

const CATEGORY: Record<string, string> = {
  code: "Unauthorized code",
  credentials: "Credentials",
  access_control: "The access control system",
  bypass: "Bypassing security",
  ai_specific: "The ML stack and API",
  nontrivial_access: "Hard-to-reach access",
  physical: "Physical access",
  supply_chain: "Supply chain",
  humint: "People",
  structural: "Placeholder",
};

function Square({
  v,
  band,
  selected,
  onSelect,
}: {
  v: AttackVector;
  band: BandWord;
  selected: boolean;
  onSelect: () => void;
}) {
  const placeholder = v.source === "structural";
  const style =
    placeholder
      ? "border-dashed border-ink-3"
      : band === "usually succeeds"
        ? "border-signal bg-signal"
        : band === "contested"
          ? "border-signal"
          : "border-rule-2";
  return (
    <button
      type="button"
      onClick={onSelect}
      onFocus={onSelect}
      aria-pressed={selected}
      aria-label={`${v.name}: ${placeholder ? "a placeholder, nothing stops this stage at an unprepared lab" : band}`}
      className={`relative h-[24px] w-[24px] shrink-0 border-2 ${style} ${selected ? "outline-2 outline-offset-2 outline-ink" : ""}`}
      style={
        !placeholder && band === "contested"
          ? { background: "linear-gradient(135deg, var(--signal) 50%, transparent 50%)" }
          : undefined
      }
    />
  );
}

export function VectorStagesFigure() {
  const state = useThreatData();
  const [tier, setTier] = useState(3);
  const [selected, setSelected] = useState<string>("V-CRED-1");

  const columns = useMemo(() => {
    if (state.status !== "ready") return null;
    const shown = state.data.model.vectors.filter((v) => v.source !== "authored");
    return STAGES.map((stage: Stage) => {
      const vs = shown.filter((v) => v.stage === stage);
      const groups: { category: string; vectors: AttackVector[] }[] = [];
      for (const v of vs) {
        let g = groups.find((x) => x.category === v.category);
        if (!g) groups.push((g = { category: v.category, vectors: [] }));
        g.vectors.push(v);
      }
      const rand = vs.filter((v) => v.source === "rand");
      const works = rand.filter((v) => unpreparedBand(v, tier) === "usually succeeds").length;
      return { stage, groups, rand: rand.length, works };
    });
  }, [state, tier]);

  if (state.status !== "ready" || !columns) {
    return <DataPending error={state.status === "error" ? state.error : undefined} />;
  }

  const sel = state.data.model.vectors.find((v) => v.id === selected);
  const selBand = sel ? unpreparedBand(sel, tier) : null;

  return (
    <div>
      <Segmented
        label="Attacker"
        options={[1, 2, 3, 4, 5].map((t) => ({ value: t, label: `OC${t}` }))}
        value={tier}
        onChange={setTier}
      />
      <div className="mt-5 grid gap-8 md:grid-cols-3 md:gap-6">
        {columns.map((c, i) => (
          <section key={c.stage} aria-label={STAGE_LABEL[c.stage]} className="border-t-2 border-ink pt-2">
            <p className="flex items-baseline gap-2">
              <span className="display text-[28px] text-ink">{i + 1}</span>
              <span className="text-[20px] font-semibold text-ink">{STAGE_LABEL[c.stage]}</span>
            </p>
            <p className="mt-1 text-[14px] text-ink-2">
              {c.rand > 0 ? (
                <>
                  <span className="font-semibold text-signal-ink">{c.works}</span> of {c.rand} RAND vectors usually succeed
                  at OC{tier}
                </>
              ) : (
                <>RAND scores none: it treats this step as given at an unprepared lab</>
              )}
            </p>
            <div className="mt-3 space-y-2.5">
              {c.groups.map((g) => (
                <div key={g.category}>
                  <p className="text-[12px] leading-tight text-ink-2">{CATEGORY[g.category] ?? g.category}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {g.vectors.map((v) => (
                      <Square
                        key={v.id}
                        v={v}
                        band={v.source === "structural" ? "usually succeeds" : unpreparedBand(v, tier)}
                        selected={v.id === selected}
                        onSelect={() => setSelected(v.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-6 min-h-[88px] border-t border-ink pt-3" aria-live="polite">
        {sel && (
          <>
            <p className="cap">
              {STAGE_LABEL[sel.stage]} · {sel.source === "rand" ? "RAND attack vector" : "the instrument's placeholder"}
            </p>
            <p className="mt-1 text-[16px] font-semibold text-ink">
              {sel.name}
              {sel.source === "rand" && selBand && (
                <span className={selBand === "usually succeeds" ? "text-signal-ink" : "text-ink-2"}>
                  {" "}
                  · {selBand} at OC{tier}
                </span>
              )}
            </p>
            <p className="mt-1 max-w-[46rem] text-[14px] leading-[1.5] text-ink-2">{sel.description}</p>
          </>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-ink-2">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block h-[14px] w-[14px] border-2 border-signal bg-signal" /> usually succeeds
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-[14px] w-[14px] border-2 border-signal"
            style={{ background: "linear-gradient(135deg, var(--signal) 50%, transparent 50%)" }}
          />
          contested
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block h-[14px] w-[14px] border-2 border-rule-2" /> usually fails
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block h-[14px] w-[14px] border-2 border-dashed border-ink-3" /> placeholder
        </span>
      </div>
    </div>
  );
}
