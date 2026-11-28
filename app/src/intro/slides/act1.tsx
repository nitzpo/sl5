// Act I — what you're up against.

import { AiLiftFigure } from "../demos/AiLiftFigure";
import { CostFigure } from "../demos/CostFigure";
import { OcLadderFigure } from "../demos/OcLadderFigure";
import { OwnModelFigure } from "../demos/OwnModelFigure";
import { SlMatrixFigure } from "../demos/SlMatrixFigure";
import { SourcesFigure } from "../demos/SourcesFigure";
import { CATALOG, GLOSSARY, RECURSIVE_RISK } from "../content";
import { Em, ExternalLink, Figure, Notes, Reveal, SlideHead, Term } from "./parts";

export function Start() {
  return (
    <section>
      <SlideHead
        level={1}
        eyebrow="Introduction · about six minutes"
        title="Someone will try to take the weights."
        lede={
          <>
            A <Term term="frontier">frontier</Term> model's <Term term="weights">weights</Term> are the model. Copy the
            file and you have the capability: nothing to rebuild, nothing missing at the lab. This introduction is for
            the people who defend them. It covers the threat, then the instrument: a planning tool where you choose
            defenses and see which attackers you would usually stop, and what still gets through.
          </>
        }
      />
      <Figure
        n={1}
        label="What it costs to build, and what it costs to take · log scale"
        caption={
          <>
            A state agency's year-long operation costs a hundredth of the model it would take, or less, and even the largest
            operation RAND describes costs no more than building one. For a state that is behind, theft is the
            cheapest way to catch up.
          </>
        }
      >
        <CostFigure />
      </Figure>
      <Notes
        items={[
          {
            label: "01 · The file is the model",
            body: "Loaded on rented accelerators, a stolen copy runs the same afternoon. Nothing has to be rebuilt.",
          },
          {
            label: "02 · A theft leaves nothing missing",
            body: "The lab keeps its copy. A successful theft can look exactly like an ordinary day.",
          },
          {
            label: "03 · The guardrails come off",
            body: "A served model refuses dangerous requests. A stolen copy can be fine-tuned until it doesn't.",
          },
        ]}
      />
      <p className="mt-8 text-[14px] text-ink-2">
        Press <Em>→</Em> or <Em>Next</Em> to begin. Every slide has its own link. Words with a dotted underline explain
        themselves when you hover or tap them.
      </p>
    </section>
  );
}

export function WhyItGetsWorse() {
  return (
    <section>
      <SlideHead
        eyebrow="02 · Why AI makes it worse"
        title="Each year, the same attacker gets stronger."
        lede={
          <>
            AI does more and more of an attacker's work. In the instrument this happens in one place, the attacker: by
            2030 an OC3 group does what an OC4 agency did in 2024 on the steps AI helps most. Defenses don't decay on
            their own; the attackers grow into them.
          </>
        }
      />
      <Figure
        n={2}
        label="What AI adds to an attacker · drag the year"
        caption={
          <>
            AI helps most with code, credentials and the ML stack, and least with people and places. The curve is the
            instrument's default pace; a setting makes it faster or slower.
          </>
        }
      >
        <AiLiftFigure />
      </Figure>
      <Notes
        items={[
          {
            label: "The prize grows too",
            body: <>A stolen frontier model is also a tool for the next theft. {RECURSIVE_RISK}</>,
          },
          {
            label: "Hard stops hold up best",
            body: (
              <>
                A <Term term="hardStop">hard stop</Term> loses little against a stronger attacker; a{" "}
                <Term term="probabilistic">probabilistic</Term> defense loses much more. More on the catalogue slide.
              </>
            ),
          },
          {
            label: "A forecast, not a fact",
            body: (
              <>
                <ExternalLink href="https://ai-2027.com">AI 2027</ExternalLink> cites a 2024 workshop poll in which most
                participants expected a state to steal US frontier weights before 2030.
              </>
            ),
          },
        ]}
      />
    </section>
  );
}

export function OcLadderSlide() {
  return (
    <section>
      <SlideHead
        eyebrow="03 · Who might come"
        title="Four steps of a ladder, then a cliff."
        lede={
          <>
            “Secure” means nothing until you say against whom. RAND sorts attackers into five tiers of{" "}
            <Term term="oc">operational capability</Term>, OC1 to OC5, by what they can spend: money, people and time.
            OC5 is not a bigger OC4. It builds what it needs, from backdoored chips to agents placed years ahead.
          </>
        }
      />
      <Figure
        n={3}
        label="What each tier can spend · log scale · select a tier"
        caption="Dollar figures are RAND's order-of-magnitude budgets per operation, not precise costs."
      >
        <OcLadderFigure />
      </Figure>
      <Notes
        items={[
          {
            label: "Plan against a tier",
            body: "The instrument asks which tier you are defending against. Its default is OC4, a leading state cyber agency.",
          },
          {
            label: "OC4 → OC5 is a different kind of attacker",
            body: (
              <>
                Fifty <Term term="zeroDay">zero-days</Term> at once, hardware backdoored at manufacture, agent networks
                built over decades. Defenses that stop OC4 can be irrelevant to OC5.
              </>
            ),
          },
          {
            label: "AI moves attackers up",
            body: "Over time, AI lets each tier do some of what the tier above did. That is the previous slide.",
          },
        ]}
      />
    </section>
  );
}

export function SecurityLevels() {
  return (
    <section>
      <SlideHead
        eyebrow="04 · What “secure” means here"
        title="A security level is the attackers you usually stop."
        lede={
          <>
            RAND defines each <Term term="sl">security level</Term> by the attacker it is meant to stop: SL3 stops OC3.
            The instrument takes that literally. You are at SL3 when OC1, OC2 and OC3{" "}
            <Term term="bands">usually fail</Term> against your defenses this year. SL5 also means your own model can't
            get its weights out.
          </>
        }
      />
      <Figure
        n={4}
        label="Which attackers each level stops · select a level"
        caption={
          <>
            How rarely an attacker must succeed to count as stopped is a bar you can make stricter or more lenient in
            the instrument. Below it a tier usually fails; well above it, it usually succeeds; in between it is
            contested.
          </>
        }
      >
        <SlMatrixFigure />
      </Figure>
      <Notes
        items={[
          {
            label: "Where labs are",
            body: "RAND's 2024 report found its most urgent recommendations not yet comprehensively implemented at frontier labs.",
          },
          {
            label: "SL3 is getting concrete",
            body: (
              <>
                RAND's 2026 SL3 report spells out 262 controls, adapted from <Term term="nist">NIST SP 800-53</Term>,
                aimed at criminal groups and insiders.
              </>
            ),
          },
          {
            label: "SL5 is out of reach today",
            body: "RAND: achieving SL5 is currently not possible. The instrument agrees: no posture from today's catalogue reaches it.",
          },
        ]}
      />
    </section>
  );
}

export function OwnModel() {
  return (
    <section>
      <SlideHead
        eyebrow="05 · Your own model, as an insider"
        title="Your own model is already inside."
        lede={
          <>
            The SL5 Novel Recommendations treat a frontier AI agent as its own class of{" "}
            <Term term="insider">insider</Term>. It doesn't need to get in: it runs on your compute, with credentials
            and tools. If it is misaligned, it may try to reach its own weights and get them out. SL5 requires stopping
            that too.
          </>
        }
      />
      <Figure
        n={5}
        label="Where its attack path starts, and how it fares by year"
        caption={
          <>
            These steps and their ratings are the instrument's own assumptions, not RAND's. Each year's model is rated
            at that year's AI capability, and weighed by the chance it tries at all, which is a setting.
          </>
        }
      >
        <OwnModelFigure />
      </Figure>
      <Notes
        items={[
          {
            label: "It gets stronger every year",
            body: "Its capability is the year's AI capability. By 2030 it is at the top of the scale.",
          },
          {
            label: "What holds it",
            body: "Sandboxed execution, quotas, no access to its own weights, and monitoring by other models. Today's catalogue has no strong counter to manipulating its operators.",
          },
          {
            label: "Outside the level",
            body: "Sabotaging the oversight it helped build, and copying capability through the API, damage rather than steal. The instrument shows them as separate meters.",
          },
        ]}
      />
    </section>
  );
}

export function Sources() {
  return (
    <section>
      <SlideHead
        eyebrow="06 · Where this comes from"
        title="Five public documents, one interpretation."
        lede="None of the framing is invented here. The instrument is a model built on these sources, and where it adds assumptions of its own, it says so."
      />
      <Figure n={6} label="What each source supplies to the instrument">
        <SourcesFigure />
      </Figure>
      <Notes
        items={[
          {
            label: "What's ours, not theirs",
            body: `The ratings for your own model's ${CATALOG.ownModelVectors} steps, ${CATALOG.structuralVectors} “nothing stops this stage” placeholders, the ${CATALOG.future} future capabilities, how much AI lifts each attack vector, detection, and a small residual chance no posture removes.`,
          },
          {
            label: "What this is not",
            body: "An educational model, not security guidance. Use it to build intuition, not to make procurement or accreditation decisions.",
          },
        ]}
      />
      <Reveal summary={`Glossary: every term used here (${Object.keys(GLOSSARY).length})`}>
        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {Object.entries(GLOSSARY).map(([key, entry]) => (
            <div key={key}>
              <dt className="font-semibold text-ink">{entry.label}</dt>
              <dd className="mt-0.5">{entry.definition}</dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  );
}
