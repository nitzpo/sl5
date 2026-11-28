// Act II — how to use the instrument.

import { AttackPathDemo } from "../demos/AttackPathDemo";
import { BuildPostureGame } from "../demos/BuildPostureGame";
import { CatalogueFigure } from "../demos/CatalogueFigure";
import { InstrumentMap } from "../demos/InstrumentMap";
import { RaceFigure } from "../demos/RaceFigure";
import { SecurityLevelDemo } from "../demos/SecurityLevelDemo";
import { StackingDemo } from "../demos/StackingDemo";
import { VectorStagesFigure } from "../demos/VectorStagesFigure";
import { CATALOG, DEMO_BLOCKS } from "../content";
import { money, monthRange } from "../format";
import { BUDGET_MILLIONS, YEAR } from "../posture-game";
import { StoryPicker } from "../StoryPicker";
import { Em, Figure, Notes, SlideHead, Term } from "./parts";

export function Blocks() {
  return (
    <section>
      <SlideHead
        eyebrow="07 · The catalogue of defenses"
        title={`${CATALOG.blocks} defenses, read by shape and fill.`}
        lede={
          <>
            The instrument's catalogue holds {CATALOG.blocks} defenses in {CATALOG.categories} categories, drawn from
            RAND, the SL5 Standard and its Novel Recommendations. Each one counters the attack vectors it makes harder,
            strongly or partially. Its shape says what kind of defense it is; its fill says how far along you are.
          </>
        }
      />
      <Figure
        n={7}
        label="Shape is the type, fill is the state"
        caption={
          <>
            The bars beside each type are the engine's own erosion: how much of its effect a defense keeps against each
            attacker tier. A <Term term="hybrid">hybrid</Term> sits between the other two.
          </>
        }
      >
        <CatalogueFigure />
      </Figure>
      <Notes
        items={[
          {
            label: "Future capabilities",
            body: (
              <>
                {CATALOG.future} research-stage defenses, such as verified accelerator hardware at scale, appear only
                when you switch <Term term="futureCapabilities">future capabilities</Term> on. They are labelled R&amp;D.
              </>
            ),
          },
          {
            label: "Some need companions",
            body: (
              <>
                An <Term term="airGap">air gap</Term> with no controlled way across is one people carry drives over. A
                defense missing its companions counts for only part of itself.
              </>
            ),
          },
          {
            label: "The detail drawer",
            body: "Every defense opens to its cost range, lead time, prerequisites, the attack vectors it counters, and the open questions experts still argue about.",
          },
        ]}
      />
    </section>
  );
}

export function AttackVectors() {
  return (
    <section>
      <SlideHead
        eyebrow="08 · Attack vectors and three stages"
        title="Every theft has to do three things."
        lede={
          <>
            RAND lists {CATALOG.randVectors} <Term term="attackVector">attack vectors</Term>, from exploiting an
            unpatched server to bribing an employee. The instrument places each at a <Term term="stage">stage</Term>:
            get in, reach the weights, get them out. Your defenses work by making vectors harder at some stage.
          </>
        }
      />
      <Figure
        n={8}
        label="What an attacker at this tier can usually do against an unprepared lab · select a square"
        caption={
          <>
            RAND rates each vector for each tier against a lab with minimal defenses. It doesn't rate getting the
            weights out of such a lab, treating that as given, so the instrument adds placeholders that stand for
            “nothing stops this stage” until a defense does.
          </>
        }
      >
        <VectorStagesFigure />
      </Figure>
      <Notes
        items={[
          {
            label: "A stage is a place to intervene",
            body: "Close one stage well and every attack path that needs it gets harder. Exit defenses matter because every theft ends there.",
          },
          {
            label: "Your own model has its own vectors",
            body: `${CATALOG.ownModelVectors} more, for reaching and leaving with its own weights. They are not shown here; see slide 5.`,
          },
        ]}
      />
    </section>
  );
}

export function AttackPaths() {
  return (
    <section>
      <SlideHead
        eyebrow="09 · Approaches and the easiest attack path"
        title="The attacker takes the easiest path."
        lede={
          <>
            An <Term term="approach">approach</Term> is a broad way of going about it: remote intrusion, a human
            insider, physical access, the supply chain, and the API if you serve the model. Within each, an{" "}
            <Term term="attackPath">attack path</Term> takes one vector per stage, and the instrument finds the
            attacker's easiest one. Strengthen a stage and the path moves.
          </>
        }
      />
      <Figure
        n={9}
        label="Today's typical lab against an OC3 attacker · deploy a defense on the path"
        caption={
          <>
            An attacker tries every approach, so your verdict for a tier comes from all of them together. Closing the
            easiest approach makes the next one the problem.
          </>
        }
      >
        <AttackPathDemo />
      </Figure>
      <Notes
        items={[
          {
            label: "Scenarios",
            body: (
              <>
                The instrument also tells some paths as stories, called <Term term="scenario">scenarios</Term>, with a
                one-minute playback. They illustrate; the level is computed over every approach.
              </>
            ),
          },
          {
            label: "Choke points",
            body: "A defense on many approaches' easiest paths is worth more than its name suggests. The instrument marks those.",
          },
        ]}
      />
    </section>
  );
}

export function Stacking() {
  return (
    <section>
      <SlideHead
        eyebrow="10 · Why weak defenses don't add up"
        title="Five weak counters are not one strong one."
        lede={
          <>
            Each extra defense on the same attack vector helps less than the one before, and after a few, more add
            nothing. Partial counters together never do what one strong counter does. That is why a recruited{" "}
            <Term term="insider">insider</Term> is so hard to stop with today's catalogue.
          </>
        }
      />
      <Figure
        n={10}
        label="One attack vector, with the counters you switch on"
        caption={
          <>
            Against an OC4 agency in 2026, with full government cooperation. Every counter in today's catalogue is
            partial; the strong one is a future capability.
          </>
        }
      >
        <StackingDemo />
      </Figure>
      <Notes
        items={[
          {
            label: "Why it's modelled this way",
            body: "Defenses on the same step tend to fail together: the insider who passes vetting is the one monitoring was tuned to miss.",
          },
          {
            label: "What it means for planning",
            body: "Look for the stage where a strong counter exists, and fund that, rather than a fourth partial on a step you already cover.",
          },
        ]}
      />
    </section>
  );
}

export function YourLevel() {
  return (
    <section>
      <SlideHead
        eyebrow="11 · Your security level"
        title="A level, a bar, and what still gets through."
        lede={
          <>
            The instrument shows your security level as a level and a bar toward the next one, with a mark when you are
            only just holding it. Below that, each tier's band, and the tier and approach that stop you going higher.
            Try the settings: SL5 is out of reach with today's catalogue.
          </>
        }
      />
      <Figure
        n={11}
        label="The verdict, on the instrument's engine · change the settings"
        caption={
          <>
            Future capabilities are research-stage defenses that do not exist at scale. With all of them, in a
            favourable world, SL5 comes within reach in 2026, only just, and slips as AI lifts the attackers.
          </>
        }
      >
        <SecurityLevelDemo />
      </Figure>
      <Notes
        items={[
          {
            label: "How strict is “stops”",
            body: "Strict asks attackers to fail almost always before a tier counts as stopped; lenient accepts more. The default sits between.",
          },
          {
            label: "Words, not decimals",
            body: "The bands are deliberately vague. Hover a band word for the intelligence-community word behind it (ICD 203).",
          },
        ]}
      />
    </section>
  );
}

export function Timeline() {
  const airGap = DEMO_BLOCKS["NET-01"];
  const chip = DEMO_BLOCKS["HW-04"];
  return (
    <section>
      <SlideHead
        eyebrow="12 · Time"
        title="Some defenses take longer than the threat waits."
        lede={
          <>
            An air gap takes {monthRange(airGap.deployMonths.min, airGap.deployMonths.max)} to build; chip-level tamper
            protection, {monthRange(chip.deployMonths.min, chip.deployMonths.max)}. Meanwhile AI keeps lifting the
            attackers. The instrument's race view puts the two on one axis.
          </>
        }
      />
      <Figure
        n={12}
        label="Lead times against the threat front · change the start year and the AI pace"
        caption="A defense that lands after the front arrives to a stronger attacker than the one you planned for. Long-lead work started late may never catch up."
      >
        <RaceFigure />
      </Figure>
    </section>
  );
}

export function Budget() {
  return (
    <section>
      <SlideHead
        eyebrow="13 · Budget"
        title="A budget, spent in the order you choose."
        lede={
          <>
            Every defense has a cost range. The instrument funds them in the order you picked them: what doesn't fit
            isn't built, and stays where your lab already was. Some need another running first. Try it with one year
            and {money(BUDGET_MILLIONS)}.
          </>
        }
      />
      <Figure
        n={13}
        label={`${money(BUDGET_MILLIONS)} for ${YEAR}, starting from today's typical lab · pick defenses`}
        caption={
          <>
            Every number is the instrument's engine. In the instrument, a <Em>risk tolerance</Em> setting decides which
            end of each cost range you plan against.
          </>
        }
      >
        <BuildPostureGame />
      </Figure>
    </section>
  );
}

export function Ready() {
  return (
    <section>
      <SlideHead
        eyebrow="14 · Ready"
        title="Open the instrument."
        lede="Everything you've seen is on one screen. Start from a typical lab today, choose your adversary, and fund defenses until the tier you care about usually fails, or until you learn why it won't."
      />
      <Figure n={14} label="The instrument's screen, and the order to read it in">
        <InstrumentMap />
      </Figure>
      <div className="mt-8">
        <StoryPicker />
      </div>
      <p className="mt-6 text-[14px] text-ink-2">
        An illustrative model, not security guidance. The sources are on{" "}
        <a href="#sources" className="font-semibold text-ink underline underline-offset-4">
          slide 6
        </a>
        .
      </p>
    </section>
  );
}
