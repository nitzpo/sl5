import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { Category } from "../../engine/types";
import { CATEGORY_NAMES, CATEGORY_ORDER, STAGE_LABELS, isOperational } from "../../model/names";
import { MATRIX_COLUMNS, type MatrixColumn } from "../../model/catalogue-layout";
import { useSimulationStore } from "../../store/simulation";
import { useUiStore } from "../../store/ui";
import { BlockTile, type TileFlags } from "./BlockTile";
import { useBlockActions } from "./block-actions";
import { useCatalogueModel, type CatalogueModel, type DrawnPath } from "./use-catalogue";

const COLUMN_TITLES: Record<MatrixColumn, string> = {
  entry: STAGE_LABELS.entry,
  reach: STAGE_LABELS.reach,
  exfil: STAGE_LABELS.exfil,
  detect: "Detect & respond",
};
/** Two tiles across in the busy stages, one in the others. */
const SUBCOLS: Record<MatrixColumn, number> = { entry: 2, reach: 2, exfil: 1, detect: 1 };
const GRID = "grid grid-cols-[104px_minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_20px] gap-x-4";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Geometry {
  width: number;
  height: number;
  tiles: Map<string, Box>;
  cols: Record<MatrixColumn | "weights", { x0: number; x1: number }>;
  bodyTop: number;
  bodyBottom: number;
}

/** Measure tile and column boxes relative to the container. Tiles never move
 * when the posture changes (fixed order, fixed size), so this re-runs only on
 * resize, font load and the future toggle. */
function useGeometry(ref: RefObject<HTMLDivElement | null>, key: string): Geometry | null {
  const [geom, setGeom] = useState<Geometry | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const base = el.getBoundingClientRect();
      const rel = (r: DOMRect): Box => ({ x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height });
      const tiles = new Map<string, Box>();
      el.querySelectorAll<HTMLElement>("[data-block-id]").forEach((t) => {
        tiles.set(t.dataset.blockId!, rel(t.getBoundingClientRect()));
      });
      const cols = {} as Geometry["cols"];
      el.querySelectorAll<HTMLElement>("[data-col]").forEach((c) => {
        const b = rel(c.getBoundingClientRect());
        cols[c.dataset.col as MatrixColumn | "weights"] = { x0: b.x, x1: b.x + b.w };
      });
      const body = el.querySelector<HTMLElement>("[data-matrix-body]");
      const bb = body ? rel(body.getBoundingClientRect()) : { y: 0, h: 0 };
      setGeom({ width: base.width, height: base.height, tiles, cols, bodyTop: bb.y, bodyBottom: bb.y + bb.h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, [ref, key]);
  return geom;
}

type Seg = { x1: number; y1: number; x2: number; y2: number; w: number };

/** The stepped line for one path: horizontal through each stage's column at
 * its anchor's height, vertical jogs in the gutters, narrowing as each step's
 * defenses cut it, ending at the weights. */
function routePath(p: DrawnPath, g: Geometry, index: number) {
  const segs: Seg[] = [];
  const breaks: { x: number; y: number; w: number }[] = [];
  const minW = p.lead ? 3 : 2;
  let w = p.lead ? 12 : 4;
  const firstAnchor = p.anchors.find((a) => a.anchorId && g.tiles.has(a.anchorId));
  let y = firstAnchor ? centerY(g.tiles.get(firstAnchor.anchorId!)!) : g.bodyTop + 14;
  let x = g.cols.entry.x0 - 14;
  const jog = (index % 3) * 4 - 4;
  for (const col of MATRIX_COLUMNS) {
    const span = g.cols[col];
    const step = p.anchors.find((a) => a.stage === col);
    const box = step?.anchorId ? g.tiles.get(step.anchorId) : undefined;
    const ty = box ? centerY(box) : y;
    const gx = span.x0 - 8 + jog;
    if (Math.abs(ty - y) > 0.5) {
      segs.push({ x1: x, y1: y, x2: gx, y2: y, w });
      segs.push({ x1: gx, y1: y, x2: gx, y2: ty, w });
      x = gx;
      y = ty;
    }
    if (step) {
      const mid = box ? box.x + box.w / 2 : (span.x0 + span.x1) / 2;
      if (step.holds && box) breaks.push({ x: box.x - 5, y, w });
      segs.push({ x1: x, y1: y, x2: mid, y2: y, w });
      x = mid;
      w = Math.max(minW, w * step.pass);
    }
    segs.push({ x1: x, y1: y, x2: span.x1, y2: y, w });
    x = span.x1;
  }
  segs.push({ x1: x, y1: y, x2: g.cols.weights.x0, y2: y, w });
  return { segs, breaks };
}
const centerY = (b: Box) => b.y + b.h / 2;

function segRect(s: Seg) {
  if (s.y1 === s.y2) {
    return { x: Math.min(s.x1, s.x2) - (s.w > 4 ? 0 : 0), y: s.y1 - s.w / 2, width: Math.abs(s.x2 - s.x1), height: s.w };
  }
  return { x: s.x1 - s.w / 2, y: Math.min(s.y1, s.y2) - s.w / 2, width: s.w, height: Math.abs(s.y2 - s.y1) + s.w };
}

function PathLayer({ model, geom }: { model: CatalogueModel; geom: Geometry }) {
  const routes = model.paths.map((p, i) => ({ p, ...routePath(p, geom, i) }));
  return (
    <>
      <svg
        className="pointer-events-none absolute inset-0 z-0"
        width={geom.width}
        height={geom.height}
        aria-hidden="true"
      >
        {/* The model weights: where every path ends. */}
        <rect
          x={geom.cols.weights.x0}
          y={geom.bodyTop}
          width={geom.cols.weights.x1 - geom.cols.weights.x0}
          height={geom.bodyBottom - geom.bodyTop}
          fill="var(--ink)"
        />
        <text
          transform={`translate(${(geom.cols.weights.x0 + geom.cols.weights.x1) / 2 + 4.5} ${(geom.bodyTop + geom.bodyBottom) / 2}) rotate(-90)`}
          textAnchor="middle"
          className="font-plex"
          fontSize={12}
          fontWeight={600}
          letterSpacing="0.4em"
          fill="var(--paper)"
        >
          MODEL WEIGHTS
        </text>
        {routes.map(({ p, segs }) => (
          <g key={p.approach.id} opacity={p.lead ? 1 : 0.55}>
            {p.lead &&
              segs
                .filter((s) => s.y1 === s.y2)
                .map((s, i) => {
                  const r = segRect(s);
                  return <rect key={`c${i}`} x={r.x} y={r.y - 1.5} width={r.width} height={r.height + 3} fill="var(--paper)" />;
                })}
            {segs.map((s, i) => (
              <rect key={i} {...segRect(s)} fill="var(--signal)" />
            ))}
          </g>
        ))}
      </svg>
      <svg
        className="pointer-events-none absolute inset-0 z-20"
        width={geom.width}
        height={geom.height}
        aria-hidden="true"
      >
        {routes.map(({ p, breaks }) =>
          breaks.map((b, i) => {
            const a = b.w / 2 + 6;
            return (
              <g key={`${p.approach.id}-${i}`}>
                <path d={`M${b.x - 3} ${b.y + a} L${b.x + 3} ${b.y - a}`} stroke="var(--paper)" strokeWidth={6} />
                <path d={`M${b.x - 4} ${b.y + a} L${b.x + 2} ${b.y - a}`} stroke="var(--ink)" strokeWidth={2} />
                <path d={`M${b.x + 1} ${b.y + a} L${b.x + 7} ${b.y - a}`} stroke="var(--ink)" strokeWidth={2} />
              </g>
            );
          })
        )}
      </svg>
    </>
  );
}

function StageHeader({ model }: { model: CatalogueModel }) {
  return (
    <div className={`${GRID} border-b-2 border-ink pb-2`}>
      <div className="flex flex-col justify-end gap-1">
        <span className="cap">Stage →</span>
        <span className="cap">Category ↓</span>
      </div>
      {MATRIX_COLUMNS.map((col, i) => {
        const c = model.coverage.find((s) => s.stage === col)!;
        return (
          <div key={col} data-col={col} className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[20px] leading-none font-extrabold">{i + 1}</span>
              <span className="text-[16px] leading-tight font-bold" style={{ fontStretch: "90%" }}>
                {COLUMN_TITLES[col]}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[13px] leading-tight" title={coverageTitle(col, c.cut)}>
              <span className={`font-bold ${c.weakest ? "text-signal-ink" : "text-ink"}`}>{c.word}</span>
              {c.weakest && (
                <span className="bg-ink px-1 py-[1px] font-plex text-[12px] leading-none font-semibold tracking-wider text-paper">
                  WEAKEST
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate text-[12px] leading-tight text-ink-2">
              {c.inPlace} of {c.total} deployed
            </div>
          </div>
        );
      })}
      <div data-col="weights" />
    </div>
  );
}

function coverageTitle(col: MatrixColumn, cut: number): string {
  if (col === "detect") return "How often a failed attempt is caught and the campaign stopped";
  return `What the defenses at this stage take off the attacker's easiest option, averaged over the approaches: ${
    cut < 0.15 ? "almost nothing" : cut < 0.4 ? "a little" : cut < 0.7 ? "a good share" : "most of it"
  }`;
}

export function StageMatrix() {
  const model = useCatalogueModel();
  const actions = useBlockActions();
  const detailId = useUiStore((s) => s.detailId);
  const highlightIds = useUiStore((s) => s.highlightIds);
  const lastChange = useUiStore((s) => s.lastChange);
  const blockStates = useSimulationStore((s) => s.blockStates);
  const ref = useRef<HTMLDivElement>(null);
  const geom = useGeometry(ref, model.blocks.map((b) => b.id).join(","));

  const flagsFor = (id: string): TileFlags => {
    const state = blockStates[id] ?? "not_started";
    const paths = model.onPath.get(id);
    return {
      state,
      onPath: paths ? (paths.some((p) => p.lead) ? "lead" : "other") : null,
      choke: model.choke.get(id) ?? 0,
      startNow: model.startNow.has(id),
      constrained: model.score.budgetExceededIds.has(id)
        ? "unfunded"
        : model.score.dependencyUnmetIds.has(id)
          ? "capped"
          : null,
      selected: detailId === id,
      highlighted: highlightIds.includes(id),
      chip: lastChange?.blockId === id ? { seq: lastChange.seq, text: lastChange.chip } : null,
    };
  };

  return (
    <div ref={ref} className="relative min-w-[880px] pt-3 pb-4">
      <StageHeader model={model} />
      <div data-matrix-body>
        {CATEGORY_ORDER.map((cat) => (
          <CategoryRow key={cat} cat={cat} model={model} flagsFor={flagsFor} actions={actions} />
        ))}
      </div>
      {geom && <PathLayer model={model} geom={geom} />}
      <p className="mt-3 max-w-[900px] text-[12px] leading-snug text-ink-3">
        A block's column is the stage of the attack vectors it counters strongly (the stage with the most strong
        counters; partial counters break ties, then the later stage). Order inside a cell is fixed, so tiles never
        move. The red line is the easiest attack path of the leading approach; it narrows as each stage's defenses
        cut it, and breaks where a deployed block holds.
      </p>
    </div>
  );
}

function CategoryRow({
  cat,
  model,
  flagsFor,
  actions,
}: {
  cat: Category;
  model: CatalogueModel;
  flagsFor: (id: string) => TileFlags;
  actions: ReturnType<typeof useBlockActions>;
}) {
  const cells = model.cells[cat];
  const all = MATRIX_COLUMNS.flatMap((c) => cells[c]);
  const today = all.filter((b) => !b.future);
  const inPlace = today.filter((b) => isOperational(model.score.effectiveStates[b.id])).length;
  const underWay = today.filter((b) => {
    const st = model.score.effectiveStates[b.id] ?? "not_started";
    return st === "investing" || st === "implementing";
  }).length;
  const rnd = all.length - today.length;
  return (
    <div className={`${GRID} border-b border-rule py-2.5`}>
      <div className="min-w-0 pr-1">
        <div className="text-[16px] leading-tight font-bold">{CATEGORY_NAMES[cat]}</div>
        <div className="mt-0.5 text-[12px] leading-snug text-ink-2">
          {today.length} blocks{rnd > 0 && <> · +{rnd} R&amp;D</>}
          <span className="block">{inPlace} deployed</span>
          <span className="block">{underWay} under way</span>
        </div>
      </div>
      {MATRIX_COLUMNS.map((col) => (
        <div
          key={col}
          className={`relative z-10 grid content-start gap-x-2 gap-y-[6px] ${SUBCOLS[col] === 2 ? "grid-cols-2" : "grid-cols-1"}`}
        >
          {cells[col].map((b) => (
            <BlockTile key={b.id} block={b} flags={flagsFor(b.id)} actions={actions} />
          ))}
        </div>
      ))}
      <div />
    </div>
  );
}
