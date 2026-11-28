import { useSimulationStore } from "../../store/simulation";
import { useUiStore, type MainTab } from "../../store/ui";
import { approachName } from "../../model/names";
import { leadingApproaches } from "../../model/catalogue-layout";
import { bandWord } from "../../engine/threat-sl";
import { useScore } from "../../store/derived";
import { Legend } from "../catalogue/Legend";

/** Which paths the red line is drawing, in words. */
function PathCaption() {
  const score = useScore();
  const focus = useUiStore((s) => s.focusApproach);
  const setFocus = useUiStore((s) => s.setFocusApproach);
  const oc = useSimulationStore((s) => s.adversaryOc);
  const focused = focus ? score.approaches.find((a) => a.id === focus && a.active) : undefined;
  const shown = focused ? [focused] : leadingApproaches(score);
  if (shown.length === 0) return null;
  const band = bandWord(shown[0].p, score.sl.bar);
  return (
    <div className="flex min-w-0 items-center gap-2 text-[13px]" data-testid="path-caption">
      <span className="inline-block h-[6px] w-[18px] shrink-0 bg-signal" aria-hidden="true" />
      <span className="min-w-0 truncate">
        {focused ? "Tracing " : ""}
        <b>{shown.map((a) => approachName(a.id, a.name)).join(" and ")}</b>
        <span className="text-ink-2">
          {" "}
          · {shown[0].adversary === "ai" ? "own model" : `OC${oc}`} {band}
        </span>
      </span>
      {focused && (
        <button type="button" onClick={() => setFocus(null)} className="shrink-0 font-semibold underline underline-offset-2" aria-label="Back to the leading approaches">
          clear
        </button>
      )}
    </div>
  );
}

const TABS: { id: MainTab; label: string }[] = [
  { id: "catalogue", label: "Catalogue" },
  { id: "approaches", label: "Approaches" },
  { id: "race", label: "Race" },
];

function Tab({ active, onClick, children, controls }: { active: boolean; onClick: () => void; children: string; controls?: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={`relative pt-2 pb-2 text-[16px] ${active ? "font-bold text-ink" : "font-medium text-ink-2 hover:text-ink"}`}
    >
      {children}
      {active && <span className="absolute -top-[2px] right-0 left-0 h-[5px] bg-ink" />}
    </button>
  );
}

/** Screen tabs, the catalogue's two layouts, the path toggle and the legend. */
export function ViewBar() {
  const tab = useUiStore((s) => s.tab);
  const setTab = useUiStore((s) => s.setTab);
  const view = useUiStore((s) => s.catalogueView);
  const setView = useUiStore((s) => s.setCatalogueView);
  const showAll = useUiStore((s) => s.showAllApproaches);
  const toggleAll = useUiStore((s) => s.toggleAllApproaches);
  return (
    <div className="flex flex-col gap-1.5 pb-2">
      <div className="flex items-center gap-6">
        <div className="flex shrink-0 items-center gap-6" role="tablist" aria-label="Screens">
          {TABS.map((t) => (
            <Tab key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} controls="main-view">
              {t.label}
            </Tab>
          ))}
        </div>
        {tab === "catalogue" && (
          <div className="flex border border-ink" role="radiogroup" aria-label="Catalogue layout">
            {(["matrix", "clusters"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={view === v}
                onClick={() => setView(v)}
                className={`px-2.5 py-1 text-[13px] font-semibold whitespace-nowrap ${view === v ? "bg-ink text-paper" : "text-ink hover:bg-tint"}`}
              >
                {v === "matrix" ? "Stage matrix" : "Clusters"}
              </button>
            ))}
          </div>
        )}
        {tab === "catalogue" && <PathCaption />}
        <div className="ml-auto flex shrink-0 items-center gap-4 text-[13px]">
          <label className="flex cursor-pointer items-center gap-1.5 font-semibold whitespace-nowrap">
            <input type="checkbox" checked={showAll} onChange={toggleAll} className="h-4 w-4 accent-[var(--ink)]" />
            All approaches
          </label>
        </div>
      </div>
      {tab === "catalogue" && <Legend />}
    </div>
  );
}
