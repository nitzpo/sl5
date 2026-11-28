import { useState } from "react";
import { counterRetention } from "../../engine/breach";
import type { BlockState, DefenseType } from "../../engine/types";
import { DEMO_BLOCKS } from "../content";
import { STATE_LABEL, TYPE_LABEL } from "../labels";
import { BlockGlyph } from "../slides/parts";

// Slide 7: how to read a block. Shape is the defense type, fill is its state.
// Each type's mini chart is the engine's own counter erosion: how much of its
// effect a counter keeps against each attacker tier.

const STATES: BlockState[] = ["not_started", "investing", "implementing", "deployed", "mature"];

const TYPES: { type: DefenseType; meaning: string; example: string }[] = [
  {
    type: "hard_stop",
    meaning: "Removes a step. Holds up against stronger attackers.",
    example: DEMO_BLOCKS["NET-01"].short,
  },
  {
    type: "probabilistic",
    meaning: "Lowers the odds by noticing. Loses ground as attackers improve.",
    example: DEMO_BLOCKS["PER-03"].short,
  },
  {
    type: "hybrid",
    meaning: "Part structure, part noticing. In between.",
    example: DEMO_BLOCKS["NET-05"].short,
  },
];

function Erosion({ type }: { type: DefenseType }) {
  const kept = [1, 2, 3, 4, 5].map((t) => counterRetention(type, t));
  return (
    <div aria-hidden>
      <div className="flex h-[36px] items-end gap-[3px]">
        {kept.map((k, i) => (
          <span key={i} className="w-[14px] bg-ink" style={{ height: `${k * 100}%` }} />
        ))}
      </div>
      <div className="mono mt-1 flex gap-[3px] text-[12px] text-ink-2">
        <span className="w-[14px] text-center">1</span>
        <span className="w-[14px]" />
        <span className="w-[14px] text-center">3</span>
        <span className="w-[14px]" />
        <span className="w-[14px] text-center">5</span>
      </div>
    </div>
  );
}

function TryTile() {
  const block = DEMO_BLOCKS["NET-01"];
  const [i, setI] = useState(0);
  const state = STATES[i];
  const step = (d: number) => setI((x) => (x + d + STATES.length) % STATES.length);
  return (
    <div className="mt-5 border-t border-rule pt-4">
      <p className="cap">Try it</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => step(1)}
          onContextMenu={(e) => {
            e.preventDefault();
            step(-1);
          }}
          aria-label={`${block.id} ${block.name}, ${TYPE_LABEL[block.defenseType].toLowerCase()}, ${STATE_LABEL[state].toLowerCase()}. Click to advance, right-click to step back.`}
          className="flex min-h-[52px] min-w-[16rem] items-center gap-3 border border-ink bg-paper px-3 py-2 text-left hover:bg-tint"
        >
          <BlockGlyph type={block.defenseType} state={state} w={10} h={32} />
          <span className="flex-1">
            <span className="block text-[16px] font-semibold text-ink">{block.short}</span>
            <span className="mono block text-[12px] text-ink-2">
              {block.id} · {STATE_LABEL[state]}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => step(-1)}
          className="min-h-[36px] border border-rule-2 px-3 text-[14px] text-ink hover:border-ink"
        >
          Step back
        </button>
      </div>
      <p className="mt-2 text-[14px] text-ink-2">Click to advance; right-click steps back, as in the instrument.</p>
    </div>
  );
}

export function CatalogueFigure() {
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
      <div>
        <p className="cap mb-3">Shape · what kind of defense</p>
        <div
          role="group"
          aria-label="Three defense types. Hard stops keep most of their effect against every attacker tier; probabilistic defenses keep much less against the top tiers; hybrids sit in between."
        >
          {TYPES.map((t) => (
            <div key={t.type} className="grid grid-cols-[18px_1fr_auto] items-start gap-x-4 border-t border-rule py-3">
              <BlockGlyph type={t.type} state="deployed" w={14} h={42} />
              <div>
                <p className="text-[16px] font-semibold text-ink">{TYPE_LABEL[t.type]}</p>
                <p className="text-[14px] leading-snug text-ink-2">{t.meaning}</p>
                <p className="mt-0.5 text-[14px] text-ink-2">
                  e.g. <span className="text-ink">{t.example}</span>
                </p>
              </div>
              <div className="text-right">
                <Erosion type={t.type} />
              </div>
            </div>
          ))}
          <p className="mt-1 text-right text-[12px] text-ink-2">
            <span className="mono">OC1 → OC5</span> · effect it keeps against each tier
          </p>
        </div>
      </div>

      <div>
        <p className="cap mb-3">Fill · how far along you are</p>
        <div className="grid grid-cols-5 gap-2 border-t border-rule pt-4">
          {STATES.map((s) => (
            <div key={s} className="flex flex-col items-start gap-2">
              <BlockGlyph type="hard_stop" state={s} w={14} h={42} />
              <span className="text-[12px] leading-tight text-ink sm:text-[14px]">{STATE_LABEL[s]}</span>
            </div>
          ))}
        </div>
        <TryTile />
      </div>
    </div>
  );
}
