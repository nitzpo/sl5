import { SOURCES, SUPPLIES, type SupplyKey } from "../content";
import { ExternalLink } from "../slides/parts";

// Slide 6: five sources against what each supplies to the instrument. A solid
// square is the primary source for that part; an outline means it informs it.

function Mark({ kind, label }: { kind: "primary" | "informs" | null; label: string }) {
  if (!kind) return <span className="sr-only">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className={`inline-block h-[14px] w-[14px] border-2 border-ink ${kind === "primary" ? "bg-ink" : ""}`}
      />
      <span className="sr-only">{kind === "primary" ? `primary source for ${label}` : `informs ${label}`}</span>
    </span>
  );
}

const kindOf = (primary: SupplyKey[], informs: SupplyKey[], key: SupplyKey) =>
  primary.includes(key) ? "primary" : informs.includes(key) ? "informs" : null;

export function SourcesFigure() {
  return (
    <div>
      {/* Desktop: a matrix. */}
      <table className="hidden w-full border-collapse text-left md:table" aria-label="What each source supplies to the instrument">
        <thead>
          <tr className="border-b border-ink">
            <th className="cap pb-2 font-medium">Source</th>
            {SUPPLIES.map((s) => (
              <th key={s.key} scope="col" className="cap w-[6.5rem] pr-3 pb-2 align-bottom font-medium">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SOURCES.map((src) => (
            <tr key={src.href} className="border-b border-rule align-top">
              <th scope="row" className="py-3 pr-6 font-normal">
                <ExternalLink href={src.href}>{src.title}</ExternalLink>
                <span className="mono ml-2 text-[12px] whitespace-nowrap text-ink-2">{src.year}</span>
                <p className="mt-1 max-w-[36rem] text-[14px] leading-[1.5] text-ink-2">{src.gives}</p>
              </th>
              {SUPPLIES.map((s) => (
                <td key={s.key} className="py-3.5">
                  <Mark kind={kindOf(src.primary, src.informs, s.key)} label={s.label} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Phone: the same, one source at a time. */}
      <ul className="space-y-5 md:hidden" aria-label="What each source supplies to the instrument">
        {SOURCES.map((src) => (
          <li key={src.href} className="border-t border-rule pt-3">
            <ExternalLink href={src.href}>{src.title}</ExternalLink>
            <span className="mono ml-2 text-[12px] whitespace-nowrap text-ink-2">{src.year}</span>
            <p className="mt-1 text-[14px] leading-[1.5] text-ink-2">{src.gives}</p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[14px] text-ink">
              {SUPPLIES.filter((s) => kindOf(src.primary, src.informs, s.key)).map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className={`inline-block h-[12px] w-[12px] border-2 border-ink ${
                      src.primary.includes(s.key) ? "bg-ink" : ""
                    }`}
                  />
                  {s.label}
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-ink-2">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block h-[14px] w-[14px] border-2 border-ink bg-ink" />
          primary source
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="inline-block h-[14px] w-[14px] border-2 border-ink" />
          informs it
        </span>
      </p>
    </div>
  );
}
