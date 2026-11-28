import { useEffect, useRef, useState } from "react";
import { useSimulationStore } from "../../store/simulation";
import { loadScenarios, type SavedScenario } from "../../store/persistence";
import { SCRIPTS } from "../../timelapse/scripts";
import { usePlaybackStore } from "../../timelapse/playback-store";
import { NAV_BTN } from "./header-button";

/** Scenarios: the 1-minute stories to watch, and the postures you saved. */
export function ScenariosDropdown() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const scenarioName = useSimulationStore((s) => s.scenarioName);
  const saveScenario = useSimulationStore((s) => s.saveScenario);
  const loadScenario = useSimulationStore((s) => s.loadScenario);
  const deleteScenario = useSimulationStore((s) => s.deleteScenario);
  const resetToBaseline = useSimulationStore((s) => s.resetToBaseline);
  const startScript = usePlaybackStore((s) => s.startScript);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (!open) setSaved(loadScenarios());
    setOpen(!open);
  }

  function save() {
    const n = name.trim();
    if (!n) return;
    if (saved.some((s) => s.name === n) && !confirmOverwrite) {
      setConfirmOverwrite(true);
      return;
    }
    saveScenario(n);
    setName("");
    setConfirmOverwrite(false);
    setSaved(loadScenarios());
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" className={NAV_BTN} aria-expanded={open} aria-haspopup="true" onClick={toggle}>
        Scenarios ▾
      </button>
      {open && (
        <div className="absolute top-full right-0 z-[60] mt-2 w-[340px] border-2 border-ink bg-paper p-4" role="menu">
          <h3 className="cap">Watch a 1-minute story</h3>
          <ul className="mt-2 flex flex-col border-t border-rule">
            {SCRIPTS.map((s) => (
              <li key={s.id} className="border-b border-rule">
                <button
                  type="button"
                  role="menuitem"
                  className="w-full py-2 text-left hover:bg-tint"
                  onClick={() => {
                    setOpen(false);
                    startScript(s);
                  }}
                >
                  <span className="block text-[14px] font-bold">▶ {s.name}</span>
                  <span className="block text-[12px] leading-snug text-ink-2">{s.description}</span>
                </button>
              </li>
            ))}
          </ul>

          <h3 className="cap mt-4">Your postures</h3>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setConfirmOverwrite(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="Name this posture"
              aria-label="Name this posture"
              className="min-w-0 flex-1 border border-ink bg-paper px-2 py-1 text-[14px] text-ink placeholder:text-ink-3"
            />
            <button
              type="button"
              onClick={save}
              disabled={!name.trim()}
              className="border border-ink bg-ink px-3 text-[13px] font-semibold text-paper disabled:opacity-40"
            >
              {confirmOverwrite ? "Overwrite?" : "Save"}
            </button>
          </div>
          {saved.length === 0 ? (
            <p className="mt-2 text-[12px] text-ink-2">No saved postures yet.</p>
          ) : (
            <ul className="mt-2 flex max-h-48 flex-col overflow-y-auto">
              {saved.map((s, i) => (
                <li key={`${s.name}-${s.savedAt}`} className="flex items-center gap-2 border-b border-rule py-1">
                  <button
                    type="button"
                    className={`min-w-0 flex-1 truncate text-left text-[14px] hover:underline ${scenarioName === s.name ? "font-bold" : ""}`}
                    onClick={() => {
                      loadScenario(i);
                      setOpen(false);
                    }}
                  >
                    {s.name}
                  </button>
                  <span className="font-plex text-[12px] text-ink-3">
                    {new Date(s.savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                  <button
                    type="button"
                    aria-label={`Delete ${s.name}`}
                    className="px-1 text-[13px] text-ink-2 hover:text-ink"
                    onClick={() => {
                      deleteScenario(i);
                      setSaved(loadScenarios());
                    }}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="mt-3 text-[13px] font-semibold underline underline-offset-2"
            onClick={() => {
              resetToBaseline();
              setOpen(false);
            }}
          >
            Reset to today's real-world posture
          </button>
        </div>
      )}
    </div>
  );
}
