import { useState, useEffect, useRef } from "react";
import { useSimulationStore } from "../../store/simulation";
import { loadScenarios, type SavedScenario } from "../../store/persistence";
import { HEADER_BTN } from "./Header";

export function ScenariosDropdown() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const lastLoadedName = useRef<string | null>(null);

  const scenarioName = useSimulationStore((s) => s.scenarioName);
  const saveScenario = useSimulationStore((s) => s.saveScenario);
  const loadScenarioAction = useSimulationStore((s) => s.loadScenario);
  const deleteScenario = useSimulationStore((s) => s.deleteScenario);

  // Load the saved-scenario list from localStorage when the dropdown opens.
  function openDropdown() {
    setScenarios(loadScenarios());
    if (!name && lastLoadedName.current) setName(lastLoadedName.current);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function existingIndex(): number {
    return scenarios.findIndex((s) => s.name === name.trim());
  }

  function handleSave() {
    if (!name.trim()) return;
    const idx = existingIndex();
    if (idx >= 0 && !confirmOverwrite) {
      setConfirmOverwrite(true);
      return;
    }
    saveScenario(name.trim());
    lastLoadedName.current = name.trim();
    setName("");
    setConfirmOverwrite(false);
    setScenarios(loadScenarios());
  }

  function handleLoad(index: number) {
    const s = scenarios[index];
    if (!s) return;
    lastLoadedName.current = s.name;
    loadScenarioAction(index);
    setOpen(false);
  }

  function handleDelete(index: number) {
    deleteScenario(index);
    setScenarios(loadScenarios());
  }

  function handleNameChange(value: string) {
    setName(value);
    setConfirmOverwrite(false);
  }

  function formatDate(ts: number): string {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  return (
    <div className="relative flex items-center" ref={ref}>
      <button
        onClick={() => (open ? setOpen(false) : openDropdown())}
        aria-expanded={open}
        className={`${HEADER_BTN} ${open ? "bg-gray-800 border-gray-600 text-white" : ""}`}
      >
        Scenarios <span className="text-[9px] text-gray-500">▾</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-[200] p-2">
          <div className="flex gap-1 mb-2">
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Scenario name"
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-gray-500"
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className={`text-xs px-2 py-1 rounded text-white disabled:opacity-40 disabled:cursor-not-allowed ${
                confirmOverwrite
                  ? "bg-amber-600 hover:bg-amber-500"
                  : "bg-purple-600 hover:bg-purple-500"
              }`}
            >
              {confirmOverwrite ? "Overwrite?" : "Save"}
            </button>
          </div>

          {scenarios.length === 0 ? (
            <div className="text-[10px] text-gray-600 text-center py-2">No saved scenarios</div>
          ) : (
            <div className="max-h-48 overflow-y-auto no-scrollbar space-y-0.5">
              {scenarios.map((s, i) => {
                const isActive = scenarioName === s.name;
                return (
                  <div
                    key={`${s.name}-${s.savedAt}`}
                    className={`flex items-center gap-1 px-1.5 py-1 rounded hover:bg-gray-800 group ${
                      isActive ? "border-l-2 border-violet-500 pl-1" : ""
                    }`}
                  >
                    <button
                      onClick={() => handleLoad(i)}
                      className="flex-1 text-left text-xs text-gray-300 truncate cursor-pointer"
                    >
                      {s.name}
                    </button>
                    <span className="text-[10px] text-gray-600 shrink-0">
                      {formatDate(s.savedAt)}
                    </span>
                    <button
                      onClick={() => handleDelete(i)}
                      className="text-[10px] text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 shrink-0 px-0.5"
                    >
                      x
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
