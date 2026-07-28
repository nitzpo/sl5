import { Aside, Card, CardGrid, DemoFrame, Em, ExternalLink, SlideShell } from "./slide-parts";
import { AiCurveDemo } from "../demos/AiCurveDemo";
import { OcLadderDemo } from "../demos/OcLadderDemo";
import { RECURSIVE_RISK, SL_LEVELS, SOURCES } from "../content";

export function Cover() {
  return (
    <section className="flex min-h-[52vh] flex-col justify-center">
      <p className="mb-3 text-[10px] font-semibold tracking-wider text-violet-400 uppercase">
        Introduction · about 5 minutes
      </p>
      <h1 className="text-3xl leading-tight font-bold text-gray-100 sm:text-4xl">
        Sooner or later, someone will try to steal the weights.
      </h1>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-gray-300 sm:text-base">
        A frontier AI model's weights are the most concentrated piece of strategic
        technology a private company has ever held on a hard drive. Defending them from a
        cyber superpower is a problem nobody has solved yet.
      </p>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray-400">
        The <Em>SL5 Explorable</Em> lets you try. This introduction covers the problem
        first — why a state would spend a billion dollars and five years on this, and why
        it gets harder every year — and then how to drive the tool.
      </p>
      <p className="mt-6 text-xs text-gray-600">
        Press <Em>→</Em> or <Em>Next</Em> to begin. Every slide is linkable; you can skip
        straight to the app at any time.
      </p>
    </section>
  );
}

export function WhatWeightsAre() {
  return (
    <SlideShell
      eyebrow="The asset"
      title="The weights are the model"
      lede={
        <>
          Training a frontier model produces a set of numbers — the weights. That file{" "}
          <Em>is</Em> the capability. Copy it, and you have the model: no retraining, no
          reconstruction, no waiting.
        </>
      }
    >
      <CardGrid>
        <Card title="Not like stealing a design document">
          A stolen blueprint still has to be built, and building it needs the expertise the
          thief was missing in the first place. A stolen weight file runs on rented GPUs
          the afternoon it lands.
        </Card>
        <Card title="Not like stealing money">
          The original owner keeps their copy. Nothing is missing, no alarm is
          intrinsically tripped — a successful theft can look exactly like a normal
          Tuesday, and may only surface when the capability shows up somewhere else.
        </Card>
        <Card title="Small enough to move">
          The artifact is large, but it is still a file. Every path that can carry bytes
          out — a network link, a laptop, a technician, a chip returned for RMA — is a
          candidate exfiltration channel.
        </Card>
        <Card title="Concentrated">
          Years of research, a training run that costs as much as a factory, and the tacit
          know-how baked into it all collapse into one artifact with one owner. That is an
          unusually attractive target.
        </Card>
      </CardGrid>
    </SlideShell>
  );
}

export function WhySteal() {
  return (
    <SlideShell
      eyebrow="The motive"
      title="Why a cyber superpower wants them"
      lede={
        <>
          Any competent attacker would like a frontier model. What makes this a{" "}
          <Em>state</Em> problem is that the payoff is strategic, and the price is one an
          intelligence agency can pay without noticing.
        </>
      }
    >
      <div className="space-y-3">
        <CardGrid>
          <Card title="Capability parity, for free" accent="text-red-300">
            Years of R&D — $1–10B and rising — captured in a single operation. A
            ten-million-dollar intrusion that yields a billion-dollar model is the best
            return on investment in the espionage catalogue. For a state that is behind,
            theft is the cheapest way to stop being behind.
          </Card>
          <Card title="The guardrails come off" accent="text-red-300">
            A served model refuses things. A stolen weight file does not: with the weights
            in hand, safety training can be fine-tuned away and the model repurposed for
            offensive cyber operations, biological and chemical weapon design, or
            large-scale manipulation. The thief gets a strictly more dangerous artifact
            than the one the lab operates.
          </Card>
          <Card title="Military and intelligence leverage" accent="text-red-300">
            Autonomous systems, targeting, strategic planning, signals analysis, and
            wholesale automation of the intrusion work that currently needs scarce human
            experts. This is the kind of advantage states have historically been willing
            to run decade-long programmes for.
          </Card>
          <Card title="Denying it to the other side" accent="text-red-300">
            Access is only half the value. Knowing exactly what a rival's frontier model
            can do — and being able to test against a copy of it — is intelligence in its
            own right, independent of whether you ever deploy it.
          </Card>
        </CardGrid>

        <Aside>
          And the arithmetic is lopsided. A defender has to hold <Em>every</Em> path — the
          network, the datacenter floor, the supply chain, and every person with access.
          The attacker needs one to work, once, and can wait years for it. That asymmetry
          is what the rest of this tool is about.
        </Aside>
      </div>
    </SlideShell>
  );
}

export function WhyItGetsWorse() {
  return (
    <SlideShell
      eyebrow="The trajectory"
      title="And it gets harder every year"
      lede={
        <>
          Two forces push the same direction: the prize grows, and the attacker gets
          better at taking it.
        </>
      }
    >
      <div className="space-y-5">
        <CardGrid>
          <Card title="Recursion — the prize grows" accent="text-violet-300">
            A stolen frontier model is not just an end product; it is a tool for stealing
            the next one, and for doing the research that produces it. {RECURSIVE_RISK}
          </Card>
          <Card title="Erosion — the defense weakens" accent="text-violet-300">
            As AI capability climbs, an attacker's <Em>effective</Em> capability climbs with
            it. Work that needed a hundred state-employed experts in 2026 needs far fewer
            later. Controls that only a top-tier state could beat come within reach of
            criminal groups and insiders.
          </Card>
        </CardGrid>

        <DemoFrame
          caption={
            <>
              This is the curve the simulation runs on. Drag the year: as capability rises,
              defenses that depend on <Em>noticing</Em> something — monitoring, vetting,
              human review — lose ground, while defenses that make an action{" "}
              <Em>physically impossible</Em> hold. That split drives most of what you'll see
              in the app.
            </>
          }
        >
          <AiCurveDemo />
        </DemoFrame>

        <Aside>
          The forecasters in <ExternalLink href="https://ai-2027.com">AI 2027</ExternalLink>{" "}
          put a number on it: 78% of their workshop participants expect a state actor to
          steal US frontier model weights before 2030.
        </Aside>
      </div>
    </SlideShell>
  );
}

export function OcLadderSlide() {
  return (
    <SlideShell
      eyebrow="Naming the attacker"
      title="Five tiers of adversary — OC1 to OC5"
      lede={
        <>
          "Secure" is meaningless without saying <Em>against whom</Em>. RAND's framework
          sorts attackers into five operational-capability tiers by what they can actually
          spend: money, people, and patience.
        </>
      }
    >
      <div className="space-y-5">
        <DemoFrame caption="Click a tier. Note the jump between the last two.">
          <OcLadderDemo />
        </DemoFrame>

        <Aside>
          <Em>OC4 → OC5 is a qualitative jump, not a bigger budget.</Em> OC4 is a hundred
          people for a year at ten million dollars — already a national intelligence
          service. OC5 is a thousand people for five years at a billion, running fifty
          zero-days at once, inserting backdoors into hardware during manufacture, and
          using infrastructure and agent networks built over decades. Defenses that comfortably
          stop OC4 can be irrelevant to OC5.
        </Aside>
      </div>
    </SlideShell>
  );
}

export function SecurityLevels() {
  return (
    <SlideShell
      eyebrow="Naming the defense"
      title="Five security levels — and the one nobody has reached"
      lede={
        <>
          Each Security Level is defined by the attacker tier it is meant to survive, and
          by how many <Em>independent</Em> defense layers that takes. The count is the hard
          part: eight layers means eight things that must each fail independently.
        </>
      }
    >
      <div className="space-y-4">
        <div className="overflow-hidden rounded-lg border border-gray-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-900 text-[10px] tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2">Stops</th>
                <th className="hidden px-3 py-2 sm:table-cell">Layers</th>
                <th className="px-3 py-2">What it looks like</th>
              </tr>
            </thead>
            <tbody>
              {SL_LEVELS.map((sl) => (
                <tr
                  key={sl.level}
                  className={`border-t border-gray-800 ${
                    sl.achievable ? "" : "bg-red-950/20"
                  }`}
                >
                  <td className="px-3 py-2 align-top font-mono whitespace-nowrap text-gray-200">
                    SL{sl.level}
                  </td>
                  <td className="px-3 py-2 align-top whitespace-nowrap text-gray-400">
                    {sl.defendsAgainst.split(" — ")[0]}
                  </td>
                  <td className="hidden px-3 py-2 align-top font-mono text-gray-300 sm:table-cell">
                    {sl.requiredIndependentLayers}
                  </td>
                  <td className="px-3 py-2 align-top text-gray-400">
                    {sl.description}
                    {!sl.achievable && (
                      <span className="ml-1.5 rounded border border-red-900/50 bg-red-950 px-1.5 py-0.5 text-[10px] text-red-300">
                        not achievable today
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Aside>
          RAND's conclusion is blunt: <Em>SL5 is not achievable today</Em> — not by any
          lab, not without help from the national-security community — and a model served
          to the public over the internet cannot meet it at all. Even <Em>SL4</Em> is
          aspirational for most labs. That gap is what this tool is for: you assemble a
          posture and watch how far short of SL5 the best available answer still falls,
          and why.
        </Aside>
      </div>
    </SlideShell>
  );
}

export function Sources() {
  return (
    <SlideShell
      eyebrow="Where this comes from"
      title="The source material"
      lede="None of the framing so far is invented here. Four public documents do the work; the simulation is an interpretation of them."
    >
      <div className="space-y-3">
        {SOURCES.map((s) => (
          <div key={s.href} className="rounded-lg border border-gray-800 bg-gray-900 p-3.5">
            <div className="flex flex-wrap items-baseline gap-2">
              <ExternalLink href={s.href}>
                <span className="text-sm font-medium">{s.title}</span>
              </ExternalLink>
              <span className="font-mono text-[10px] text-gray-600">{s.year}</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-400">{s.gives}</p>
          </div>
        ))}

        <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3.5">
          <h3 className="mb-1.5 text-xs font-semibold text-amber-300">
            ⚠ What this tool is not
          </h3>
          <p className="text-xs leading-relaxed text-gray-400">
            An educational, illustrative model — not authoritative security guidance. The
            blocks, attack chains, costs, and probabilities are a modeling{" "}
            <Em>interpretation</Em> synthesized from the sources above, not official
            figures. Experts genuinely disagree on many of the specifics, and the app marks
            the contested ones. Use it to build intuition, not to make procurement or
            accreditation decisions.
          </p>
        </div>
      </div>
    </SlideShell>
  );
}
