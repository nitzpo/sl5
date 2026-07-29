import {
  Aside,
  Card,
  CardGrid,
  DemoFrame,
  Em,
  Reveal,
  SlideShell,
  Term,
} from "./slide-parts";
import { ErosionDemo } from "../demos/ErosionDemo";
import { LifecycleDemo } from "../demos/LifecycleDemo";
import { ChainDemo } from "../demos/ChainDemo";
import { TimelineDiagram } from "../demos/TimelineDiagram";
import { DecisionWindowDemo } from "../demos/DecisionWindowDemo";
import { DemoHex } from "../demos/DemoHex";
import { StoryPicker } from "../StoryPicker";
import { CATALOG, DEMO_BLOCKS, LONG_GAME } from "../content";

export function Blocks() {
  return (
    <SlideShell
      eyebrow="The instrument"
      title="Everything is a block"
      lede={
        <>
          A <Term term="block">block</Term> is one defensive control you can invest in,
          drawn as a hexagon. The app gives you {CATALOG.blocks} of them across{" "}
          {CATALOG.categories} categories — network, machine, physical, personnel, supply
          chain, and AI-specific.
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-gray-300">
          Its colour is the one thing to read first. A{" "}
          <Term term="hardStop">hard stop</Term> makes an attack impossible; a{" "}
          <Term term="probabilistic">probabilistic</Term> control only makes it less likely.
          That difference decides whether the control is still worth anything in 2030.
        </p>

        <DemoFrame
          caption={
            <>
              Switch the year. The red wash creeping down a hexagon is{" "}
              <Term term="erosion">AI erosion</Term> — and it never touches the hard stop,
              because an <Term term="airGap">air gap</Term> doesn't care how clever the
              attacker is.
            </>
          }
        >
          <ErosionDemo />
        </DemoFrame>

        <Reveal summary="Why this is the central trade-off">
          <p>
            Probabilistic controls are cheap and fast, and they're what most security
            programmes are made of. Structural ones are expensive, slow, and permanent.
            Spend everything on the first kind and your 2026 posture quietly decays to
            nothing by 2030; spend everything on the second and you can't afford enough
            layers to matter. The app is largely an argument about that split.
          </p>
          <p>
            Click any hexagon in the app for its <Em>Block Detail</Em> panel: cost range,
            deploy time, feasibility, dependencies, how an adversary exploits its absence,
            real-world parallels, and the open questions experts still disagree about.
          </p>
        </Reveal>
      </div>
    </SlideShell>
  );
}

export function Lifecycle() {
  return (
    <SlideShell
      eyebrow="The instrument"
      title="Building a capability"
      lede={
        <>
          Blocks aren't on/off. Each one walks a lifecycle —{" "}
          <Em>not started → investing → implementing → deployed → mature</Em> — and each
          step is worth more defense than the last. Advance past mature and it wraps back
          to not started, which is how you undo.
        </>
      }
    >
      <div className="space-y-5">
        <DemoFrame
          caption={
            <>
              <Em>Right-click</Em> the hexagon to advance it — the same gesture the app uses
              — or jump straight to a state with the segmented control.
            </>
          }
        >
          <LifecycleDemo />
        </DemoFrame>

        <Reveal summary="Three ways to advance a block in the app">
          <ul className="space-y-1.5">
            <li>
              <Em>Right-click</Em> a hexagon on the map — fastest way to walk one forward.
            </li>
            <li>
              <Em>Hover</Em> a hexagon and click the <Em>+</Em> that appears at its
              bottom-right corner.
            </li>
            <li>
              Select it and use the <Em>five-step control</Em> in the Block Detail panel —
              the only way to jump straight to a state or step backwards.
            </li>
          </ul>
        </Reveal>

        <Aside>
          The order you advance blocks in is also your <Em>funding priority</Em>. That
          matters on the next slide.
        </Aside>
      </div>
    </SlideShell>
  );
}

export function Constraints() {
  return (
    <SlideShell
      eyebrow="The instrument"
      title="Clicking “deployed” doesn't make it so"
      lede="Two constraints can hold a block below the state you asked for. Both are visible on the hexagon itself, and both are the point of the exercise — a wishlist is not a programme."
    >
      <div className="space-y-5">
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-3.5">
            <div className="flex flex-col items-start gap-3 sm:flex-row">
              <DemoHex block={DEMO_BLOCKS["HW-07"]} state="deployed" size={38} budgetExceeded />
              <div>
                <h3 className="text-xs font-semibold text-pink-300">
                  Pink dashed ring — over budget
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
                  Your annual budget is binding. Blocks are funded in the order you advanced
                  them, so activating one more can only cap <Em>that</Em> block — it never
                  evicts an earlier commitment. Anything that doesn't fit is held at{" "}
                  <Em>Implementing</Em>, no matter what you clicked.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-900 p-3.5">
            <div className="flex flex-col items-start gap-3 sm:flex-row">
              <DemoHex block={DEMO_BLOCKS["PER-03"]} state="deployed" size={38} dependencyUnmet />
              <div>
                <h3 className="text-xs font-semibold text-sky-300">
                  Sky dotted ring — missing prerequisite
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
                  Some blocks require others to be operational first. Behavioral monitoring
                  with no sensitivity-tier framework to monitor <Em>against</Em> is capped
                  the same way. The <Em>Requires</Em> legend toggle draws the arrows.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Aside>
          The <Em>risk tolerance</Em> slider decides which cost you're planning against —
          optimistic estimates or worst-case. It is often the difference between a budget
          that buys the whole wishlist and one that leaves real gaps, without a single
          block changing.
        </Aside>
      </div>
    </SlideShell>
  );
}

export function AttackPath() {
  return (
    <SlideShell
      eyebrow="The instrument"
      title="Attack paths: how the breach number is made"
      lede={
        <>
          An <Term term="attackChain">attack chain</Term> is one complete route to the
          weights, step by step. {CATALOG.chains} ship with the app, each naming the blocks
          it exploits and the blocks that stop it — so the{" "}
          <Term term="breachProbability">breach probability</Term> isn't a vibe. Here is{" "}
          <Em>{LONG_GAME.name}</Em>, an OC{LONG_GAME.typicalOc} chain that never touches a
          computer illicitly.
        </>
      }
    >
      <div className="space-y-5">
        <DemoFrame
          caption={
            <>
              Deploy a defense and watch the chain die at that step — every later step dims,
              because it never happens. Note the third step: <Em>nothing is hacked</Em>.{" "}
              <Term term="insider">Insider</Term> paths are a distinct class, and the
              hardest to price.
            </>
          }
        >
          <ChainDemo />
        </DemoFrame>

        <CardGrid>
          <Card title="Improving a defense never makes things worse">
            Advancing any block can only lower breach probability — the model is monotonic
            by construction and tested for it. If a number moves the wrong way, that's a
            bug, not a subtlety.
          </Card>
          <Card title="But no live chain reaches zero">
            Every viable chain keeps a floor of{" "}
            <Term term="residualRisk">residual risk</Term>. The only way to a true zero is
            removing the precondition — an air-gapped model has no extraction channel at
            all.
          </Card>
        </CardGrid>
      </div>
    </SlideShell>
  );
}

export function Timeline() {
  return (
    <SlideShell
      eyebrow="The instrument"
      title="The timeline: two races at once"
      lede="Open the Timeline tab at the bottom of the app. It puts everything that changes over time onto one 2024–2030 axis."
    >
      <div className="space-y-5">
        <DemoFrame
          caption={
            <>
              Toggle <Em>+ Chains</Em> on the real track to split the threat line into its
              individual attack chains — that's how you find out which specific path is
              driving your risk in a given year.
            </>
          }
        >
          <TimelineDiagram />
        </DemoFrame>

        <CardGrid>
          <Card title="The futureproofing race" accent="text-violet-300">
            The violet area is AI capability. As it rises it lifts the attacker's effective
            capability, so probabilistic defenses lose value even if you never touch them.
            What you build in 2026 has to still work in 2030.
          </Card>
          <Card title="The deployment race" accent="text-red-300">
            The small ▲ markers on the year axis are{" "}
            <Term term="decisionWindow">decision windows</Term> closing. An air-gapped
            facility or custom silicon takes 36–48 months to stand up, so a 2030 target
            makes the decision due now, not later.
          </Card>
        </CardGrid>

        <DemoFrame
          caption={
            <>
              Same rule on the map: a block still at <Em>not started</Em> whose deadline is
              inside the next two years earns a red <Em>!</Em> in its top-left corner. The{" "}
              <Em>Start now</Em> legend item toggles those badges — and the deadline
              triangles use the same three weights, so the axis and the map always agree.
            </>
          }
        >
          <DecisionWindowDemo />
        </DemoFrame>

        <Aside>
          You can also just <Em>drag the year</Em> in the header to scrub the whole
          simulation, or press <Em>▶</Em> to play a scripted 2024→2030 programme and watch
          the two lines race — with captions calling out what's happening and why.
        </Aside>
      </div>
    </SlideShell>
  );
}

export function TheRest() {
  return (
    <SlideShell
      eyebrow="The instrument"
      title="The rest of the controls"
      lede="Everything else you'll find, in one pass."
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card title="Three views of the same posture">
            <Em>Clusters</Em> groups blocks by category around the model.{" "}
            <Em>Grid</Em> is the flat catalogue. <Em>Rings</Em> shows the eight{" "}
            <Term term="defenseInDepth">defense-in-depth</Term> layers as concentric rings —
            the fastest way to spot the layer you have nothing in.
          </Card>
          <Card title="Four perspectives">
            The right-hand panel reframes the same numbers as a <Term term="ciso">CISO</Term>{" "}
            (priorities and budget), an <Em>Attacker</Em> (which chains are viable), a{" "}
            <Em>Policy</Em> maker (what mandating SL4 would do), or an <Em>Observer</Em> (raw
            readouts).
          </Card>
          <Card title="World sliders">
            Six assumptions you don't control as a CISO — AI timeline, government and vendor
            cooperation, budget, organizational transformation, risk tolerance — plus the
            adversary's OC tier and whether the model is served externally at all.
          </Card>
          <Card title="Score, share, save">
            The <Em>Security Posture</Em> card carries your SL score and breach probability.{" "}
            <Em>Share</Em> copies a URL encoding your whole posture; <Em>Scenarios</Em> saves
            named ones locally; <Em>Reset</Em> returns to the real-world baseline.
          </Card>
        </div>

        <Reveal summary="Two smaller things worth knowing">
          <p>
            The legend items above the map are also <Em>toggles</Em> — click{" "}
            <Em>Start now</Em>, <Em>Contested</Em>, <Em>Over budget</Em> or any relation
            arrow to hide that badge when the map gets busy. Hovering a block gives you the
            numbers behind its badges, including the year its window closes.
          </p>
          <p>
            The app itself needs a desktop-sized screen. This introduction doesn't, so it's
            the shareable half.
          </p>
        </Reveal>

        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <h3 className="text-sm font-semibold text-gray-100">That's the tour.</h3>
          <p className="mt-1.5 text-xs leading-relaxed text-gray-400">
            There is no winning posture — the honest outcome is a programme that costs more
            than you have and still leaves an insider path open. Finding out{" "}
            <Em>which</Em> gaps survive your best effort is the point.
          </p>
          <StoryPicker />
          <p className="mt-3 text-[10px] leading-relaxed text-gray-600">
            Reminder: an illustrative educational model, not authoritative security
            guidance. Source material is on the{" "}
            {/* same-page hash link — IntroApp's hashchange listener jumps slides */}
            <a href="#sources" className="text-violet-400 hover:underline">
              sources slide
            </a>
            .
          </p>
        </div>
      </div>
    </SlideShell>
  );
}
