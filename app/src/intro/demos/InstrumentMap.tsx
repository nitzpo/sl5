// Slide 14: where things are on the instrument's one screen, as a labelled
// schematic. Numbers on the drawing match the list beside it.

const STEPS = [
  { n: 1, title: "Set the scene", body: "Pick the year and the adversary tier you plan against. OC4 is the default." },
  {
    n: 2,
    title: "Build your posture",
    body: "The catalogue, by stage. Click a defense to advance it; right-click steps back. The red line is the easiest attack path still open.",
  },
  { n: 3, title: "Read the verdict", body: "Your level and its bar, and each tier's band: which attackers you usually stop." },
  {
    n: 4,
    title: "Act on it",
    body: "What still gets through, in words, and the next defenses to fund, ranked by the engine with cost and lead time.",
  },
  { n: 5, title: "Look closer", body: "Approaches, one lane each, and the race of lead times against the threat front." },
];

function Badge({ n }: { n: number }) {
  return (
    <span className="mono inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center bg-ink text-[12px] font-semibold text-paper">
      {n}
    </span>
  );
}

function Box({ n, label, className = "", children }: { n?: number; label: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`relative border border-ink p-2 ${className}`}>
      <div className="flex items-center gap-1.5">
        {n && <Badge n={n} />}
        <span className="cap text-ink">{label}</span>
      </div>
      {children}
    </div>
  );
}

export function InstrumentMap() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
      <div
        role="img"
        aria-label="A schematic of the instrument's screen: a header with the year and adversary tier; the catalogue of defenses in stage columns with the attack path drawn in red; a verdict rail on the right with your security level, the tier ladder, what still gets through and the next defenses to fund; and tabs for approaches and the race."
        className="text-ink"
      >
        <div className="grid gap-2">
          <Box n={1} label="Year · adversary">
            <div className="mt-2 flex items-center gap-2">
              <span className="h-[2px] flex-1 bg-ink" />
              <span className="mono text-[12px] text-ink-2">OC 1 2 3</span>
              <span className="display text-[20px] text-signal-ink">4</span>
              <span className="mono text-[12px] text-ink-3">5</span>
            </div>
          </Box>
          <div className="grid grid-cols-[1.6fr_1fr] gap-2">
            <Box n={2} label="Catalogue">
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {["Get in", "Reach", "Get out"].map((s, i) => (
                  <div key={s} className="space-y-1">
                    <span className="block text-[12px] leading-tight text-ink-2">{s}</span>
                    {[0, 1, 2, 3].map((k) => (
                      <span
                        key={k}
                        className={`block h-[10px] border ${k === 1 ? "border-signal border-2" : "border-rule-2"} ${
                          k === 0 && i !== 1 ? "bg-ink" : ""
                        }`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </Box>
            <div className="grid gap-2">
              <Box n={3} label="Verdict">
                <span className="display mt-1 block text-[28px]">SL2</span>
                <span className="mt-1 block h-[6px] w-full border border-ink">
                  <span className="block h-full w-3/5 bg-ink" />
                </span>
              </Box>
              <Box n={4} label="Next to fund">
                <span className="mt-1.5 block h-[4px] w-4/5 bg-signal" />
                <span className="mt-1 block h-[4px] w-3/5 bg-rule-2" />
              </Box>
            </div>
          </div>
          <Box n={5} label="Approaches · Race" />
        </div>
      </div>

      <ol className="space-y-3">
        {STEPS.map((s) => (
          <li key={s.n} className="grid grid-cols-[20px_1fr] gap-x-3 border-t border-rule pt-2">
            <Badge n={s.n} />
            <div>
              <p className="text-[16px] font-semibold text-ink">{s.title}</p>
              <p className="text-[14px] leading-[1.5] text-ink-2">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
