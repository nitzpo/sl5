import {
  Aside,
  Card,
  CardGrid,
  DemoFrame,
  Em,
  ExternalLink,
  Reveal,
  SlideShell,
  Term,
} from "./slide-parts";
import { AiCurveDemo } from "../demos/AiCurveDemo";
import { OcLadderDemo } from "../demos/OcLadderDemo";
import { GLOSSARY, RECURSIVE_RISK, SL_LEVELS, SOURCES } from "../content";

export function Cover() {
  return (
    <section className="flex min-h-[52vh] flex-col justify-center">
      <p className="mb-3 text-xs font-semibold tracking-wider text-violet-400 uppercase">
        Introduction · about 5 minutes
      </p>
      <h1 className="text-3xl leading-tight font-bold text-gray-100 sm:text-5xl">
        Sooner or later, someone will try to steal the weights.
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-gray-300 sm:text-lg">
        A <Term term="frontier">frontier</Term> AI model's{" "}
        <Term term="weights">weights</Term> are the most concentrated piece of strategic
        technology a private company has ever held on a hard drive. Defending them from a
        cyber superpower is a problem nobody has solved yet.
      </p>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-400">
        This tool lets you try. <Em>SL5</Em> is the top tier of the security scale it's
        named after: <Term term="sl">Security Level 5</Term>, the level built to withstand
        the most capable attacker there is.
      </p>
      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-gray-500">
        Two halves: <Em>the problem</Em> — why a state would spend a billion dollars and
        five years on this — then <Em>the instrument</Em>, how to drive the tool. Any word
        with a{" "}
        <span className="text-violet-300 underline decoration-violet-600 decoration-dotted underline-offset-[3px]">
          dotted underline
        </span>{" "}
        explains itself when you hover or tap it.
      </p>
      <p className="mt-5 text-sm text-gray-600">
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
          Training a frontier model produces a set of numbers — the{" "}
          <Term term="weights">weights</Term>. That file <Em>is</Em> the capability. Copy
          it, and you have the model: no retraining, no reconstruction, no waiting.
        </>
      }
    >
      <div className="space-y-4">
        <CardGrid>
          <Card title="Not like stealing a design document">
            A stolen blueprint still has to be built, and building it needs the expertise
            the thief was missing in the first place. A stolen weight file runs on rented
            GPUs the afternoon it lands.
          </Card>
          <Card title="Not like stealing money">
            The original owner keeps their copy. Nothing is missing, no alarm is
            intrinsically tripped — a successful theft can look exactly like a normal
            Tuesday.
          </Card>
        </CardGrid>

        <Reveal summary="Two more things that make it an unusual target">
          <p>
            <Em>Small enough to move.</Em> The artifact is large, but it is still a file.
            Every path that can carry bytes out — a network link, a laptop, a technician, a
            chip returned to the manufacturer — is a candidate{" "}
            <Term term="exfiltration">exfiltration</Term> channel.
          </p>
          <p>
            <Em>Concentrated.</Em> Years of research, a training run that costs as much as
            a factory, and the tacit know-how baked into it all collapse into one artifact
            with one owner.
          </p>
        </Reveal>
      </div>
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
      <div className="space-y-4">
        <CardGrid>
          <Card title="Capability parity, for free" accent="text-red-300">
            A ten-million-dollar intrusion that yields a billion-dollar model is the best
            return on investment in the espionage catalogue. For a state that is behind,
            theft is the cheapest way to stop being behind.
          </Card>
          <Card title="The guardrails come off" accent="text-red-300">
            A served model refuses things. A stolen weight file does not — safety training
            can be fine-tuned away. The thief gets a strictly more dangerous artifact than
            the one the lab operates.
          </Card>
        </CardGrid>

        <Reveal summary="What “more dangerous” means, and two further motives">
          <p>
            <Em>The uses safety training blocks.</Em> Offensive cyber operations,
            biological and chemical weapon design, and large-scale manipulation — the
            categories every frontier lab trains its served model to refuse.
          </p>
          <p>
            <Em>Military and intelligence leverage.</Em> Autonomous systems, targeting,
            strategic planning, signals analysis, and wholesale automation of intrusion
            work that currently needs scarce human experts. States have run decade-long
            programmes for less.
          </p>
          <p>
            <Em>Denying it to the other side.</Em> Knowing exactly what a rival's frontier
            model can do — and being able to test against a copy — is intelligence in its
            own right, whether or not you ever deploy it.
          </p>
        </Reveal>

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
            criminal groups and <Term term="insider">insiders</Term>.
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
      title="How capable is the attacker? OC1 to OC5"
      lede={
        <>
          "Secure" is meaningless without saying <Em>against whom</Em>. So RAND's framework
          sorts attackers into five tiers of <Em>Operational Capability</Em> — written{" "}
          <Em>OC1</Em> through <Em>OC5</Em> — ranked by what an attacker can actually
          spend: money, people, and patience.
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-lg border border-violet-900/40 bg-violet-950/20 p-3.5">
          <p className="text-sm leading-relaxed text-gray-300">
            <span className="font-semibold text-violet-200">OC = Operational Capability.</span>{" "}
            It describes the <Em>attacker</Em>, never your defenses. A higher number means
            a better-funded, more patient, more skilled opponent. When the app asks you to
            pick an adversary OC, it's asking who you're building against — and OC4, a
            national intelligence service, is its baseline.
          </p>
        </div>

        <DemoFrame caption="Click a tier to see what it can spend. Note the jump between the last two.">
          <OcLadderDemo />
        </DemoFrame>

        <Aside>
          <Em>OC4 → OC5 is a qualitative jump, not a bigger budget.</Em> OC4 is a hundred
          people for a year at ten million dollars — already a national intelligence
          service. OC5 is a thousand people for five years at a billion, running fifty{" "}
          <Term term="zeroDay">zero-days</Term> at once, inserting backdoors into hardware
          during manufacture, and using infrastructure and agent networks built over
          decades. Defenses that comfortably stop OC4 can be irrelevant to OC5.
        </Aside>
      </div>
    </SlideShell>
  );
}

export function SecurityLevels() {
  return (
    <SlideShell
      eyebrow="Naming the defense"
      title="Five security levels — SL1 to SL5"
      lede={
        <>
          The defender's side of the same scale: <Em>Security Levels</Em>, written{" "}
          <Em>SL1</Em> through <Em>SL5</Em>. Each one is defined by the OC tier it is meant
          to survive, and by how many <Em>independent</Em> defense layers that takes.
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-violet-900/40 bg-violet-950/20 p-3.5">
          <p className="text-sm leading-relaxed text-gray-300">
            <span className="font-semibold text-violet-200">SL = Security Level.</span>{" "}
            Read the two scales as a pair: <Em>SL4 is what it takes to stop OC4</Em>. The
            layer count is the hard part — eight independent layers means eight things that
            must each fail on their own, which is what{" "}
            <Term term="defenseInDepth">defense in depth</Term> actually costs.
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900 text-xs tracking-wide text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2.5">Level</th>
                <th className="px-3 py-2.5">Stops</th>
                <th className="hidden px-3 py-2.5 sm:table-cell">Layers</th>
                <th className="px-3 py-2.5">What it looks like</th>
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
                  <td className="px-3 py-2.5 align-top font-mono whitespace-nowrap text-gray-200">
                    SL{sl.level}
                  </td>
                  <td className="px-3 py-2.5 align-top whitespace-nowrap text-gray-400">
                    {sl.defendsAgainst.split(" — ")[0]}
                  </td>
                  <td className="hidden px-3 py-2.5 align-top font-mono text-gray-300 sm:table-cell">
                    {sl.requiredIndependentLayers}
                  </td>
                  <td className="px-3 py-2.5 align-top text-gray-400">
                    {sl.description}
                    {/* Its own block, not trailing the sentence: inline, the badge
                        wrapped mid-phrase and left "achievable today" orphaned on
                        the next line. */}
                    {!sl.achievable && (
                      <span className="mt-1.5 inline-block rounded border border-red-900/50 bg-red-950 px-2 py-0.5 text-xs whitespace-nowrap text-red-300">
                        likely out of reach today
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Aside>
          RAND's assessment is that <Em>SL5 is probably not achievable today</Em> — not by
          a lab acting alone, without help from the national-security community — and that a
          model served to the public over the internet can't meet it at all. Even{" "}
          <Em>SL4</Em> is hard: it's nation-state defense, and most labs aren't there. That
          gap is what this tool is for. Nobody publishes their real posture, so whether any
          organization has quietly reached a given level isn't something you or this app can
          know; what you <Em>can</Em> do is assemble a posture and see what it costs and
          what it still leaves open.
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
              <span className="font-mono text-sm text-gray-600">{s.year}</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-400">{s.gives}</p>
          </div>
        ))}

        {/* The full glossary in one place, so a reader who met a term three
            slides ago and forgot it has somewhere to look it up — and so every
            entry is findable by Ctrl+F, which the inline <Term> popovers aren't
            once collapsed. */}
        <Reveal summary={`Glossary — every term and abbreviation used here (${Object.keys(GLOSSARY).length})`}>
          <dl className="space-y-2.5">
            {Object.entries(GLOSSARY).map(([key, entry]) => (
              <div key={key}>
                <dt className="text-sm font-semibold text-gray-200">{entry.label}</dt>
                <dd className="mt-0.5 text-sm leading-relaxed text-gray-400">
                  {entry.definition}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-3.5">
          <h3 className="mb-1.5 text-sm font-semibold text-amber-300">
            ⚠ What this tool is not
          </h3>
          <p className="text-sm leading-relaxed text-gray-400">
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
