import { memo } from "react";
import type { Block, BlockState } from "../../engine/types";
import { blockName, STATE_WORDS, TYPE_WORDS } from "../../model/names";
import { TILE_FILL } from "../marks/geometry";
import { TypeBar } from "../marks/Marks";
import { ChangeChip } from "./ChangeChip";
import { blockHandlers, type useBlockActions } from "./block-actions";

export interface TileFlags {
  state: BlockState;
  /** Path line runs through it (the leading path when `lead`). */
  onPath: "lead" | "other" | null;
  choke: number;
  startNow: boolean;
  /** Not funded, or capped by a missing prerequisite. */
  constrained: "unfunded" | "capped" | null;
  selected: boolean;
  highlighted: boolean;
  chip: { seq: number; text: string | null } | null;
}

function TileFace({ block, flags, inverted }: { block: Block; flags: TileFlags; inverted: boolean }) {
  const name = blockName(block.id, block.name);
  return (
    <span className="flex h-[24px] min-w-0 items-center gap-1.5 pr-1.5 pl-1.5">
      <span
        className={`min-w-0 flex-1 truncate text-[13px] leading-none font-semibold [font-stretch:88%] @max-[140px]:[font-stretch:76%] ${
          inverted ? "text-on-ink" : "text-ink"
        }`}
      >
        {name}
      </span>
      {flags.choke > 0 && (
        <span
          className={`flex h-[16px] min-w-[16px] shrink-0 items-center justify-center border px-[3px] font-plex text-[12px] leading-none font-semibold ${
            inverted ? "border-signal bg-ink text-on-ink" : "border-signal bg-paper text-signal-ink"
          }`}
        >
          {flags.choke}
        </span>
      )}
      <span
        className={`hidden shrink-0 font-plex text-[12px] leading-none @min-[210px]:inline ${
          inverted ? "text-on-ink-2" : "text-ink-3"
        }`}
      >
        {block.id}
      </span>
    </span>
  );
}

/**
 * One block in the stage matrix. The left bar's shape is the defense type;
 * the body fills from the bottom as the block is built. Click advances it,
 * right-click steps back, Shift-click (or the ⋯ button) opens its drawer.
 */
export const BlockTile = memo(function BlockTile({
  block,
  flags,
  actions,
}: {
  block: Block;
  flags: TileFlags;
  actions: ReturnType<typeof useBlockActions>;
}) {
  const fill = TILE_FILL[flags.state];
  const handlers = blockHandlers(block.id, actions);
  const name = blockName(block.id, block.name);
  const label =
    `${name}, ${block.id}${block.research_required ? ", research required" : ""}. ` +
    `${TYPE_WORDS[block.defense_type]}, ${STATE_WORDS[flags.state].toLowerCase()}` +
    (flags.constrained === "unfunded" ? ", not funded" : flags.constrained === "capped" ? ", waiting on a prerequisite" : "") +
    (flags.onPath ? ", on an easiest attack path" : "") +
    (flags.choke ? `, on ${flags.choke} approaches' paths` : "") +
    (flags.startNow ? ", long lead: start now" : "") +
    ". Enter advances, Backspace steps back, I opens details.";
  const border =
    flags.state === "not_started"
      ? "border-rule-2"
      : flags.state === "investing" || flags.state === "implementing"
        ? "border-ink-2"
        : "border-ink";

  return (
    <div className="group relative @container" data-block-id={block.id}>
      <button
        type="button"
        aria-label={label}
        title={`${block.name} (${block.id}) — click to advance, right-click to step back, Shift-click for details`}
        className="flex h-[28px] w-full cursor-pointer items-stretch text-left"
        {...handlers}
      >
        <span className="flex w-[9px] shrink-0 items-stretch bg-paper">
          <TypeBar type={block.defense_type} width={6} height={28} />
        </span>
        <span
          className={`relative min-w-0 flex-1 border bg-paper ${border} ${
            flags.constrained ? "border-dashed" : ""
          } group-hover:border-ink`}
        >
          <TileFace block={block} flags={flags} inverted={false} />
          {fill > 0 && (
            <span
              aria-hidden="true"
              className="absolute -inset-px bg-ink"
              style={{ clipPath: `inset(${((1 - fill) * 100).toFixed(1)}% 0 0 0)` }}
            >
              <TileFace block={block} flags={flags} inverted={true} />
              {flags.state === "mature" && (
                <span className="pointer-events-none absolute inset-[3px] border border-on-ink-2" />
              )}
            </span>
          )}
          {flags.startNow && (
            <span
              aria-hidden="true"
              className="absolute -top-px -right-px h-0 w-0 border-t-[9px] border-l-[9px] border-t-ink border-l-transparent"
            />
          )}
          {flags.onPath && (
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute -inset-px border-signal ${flags.onPath === "lead" ? "border-2" : "border"}`}
            />
          )}
        </span>
      </button>
      {(flags.selected || flags.highlighted) && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-[4px] border-2 ${flags.selected ? "border-ink" : "border-dashed border-ink"}`}
        />
      )}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => actions.open(block.id)}
        className="absolute top-[3px] right-[3px] hidden h-[18px] items-center bg-paper px-1 font-plex text-[12px] leading-none text-ink outline outline-1 outline-ink group-hover:flex"
      >
        ⋯
      </button>
      {flags.chip && <ChangeChip key={flags.chip.seq} text={flags.chip.text} />}
    </div>
  );
});
