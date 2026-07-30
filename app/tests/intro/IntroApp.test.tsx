// @vitest-environment jsdom
//
// Behavioural smoke test for the introduction at /sl5/intro/. `content.test.ts`
// guards the numbers; this guards that every slide actually renders and that
// navigation and the interactive demos respond — the intro has no other test
// surface, and its whole job is to be clicked through by a first-time reader.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { IntroApp } from "../../src/intro/IntroApp";
import { SLIDES } from "../../src/intro/slides";
import { DEMO_BLOCKS, GLOSSARY, LONG_GAME } from "../../src/intro/content";
import { SCRIPTS } from "../../src/timelapse/scripts";

beforeEach(() => {
  window.history.replaceState(null, "", "/sl5/intro/");
  localStorage.clear();
});

afterEach(cleanup);

describe("every slide renders", () => {
  // Rendered one at a time via a deep link, which is also how a shared
  // #slug URL arrives. A slide that throws fails here rather than in someone's
  // browser on slide 11.
  for (const [i, slide] of SLIDES.entries()) {
    it(`#${slide.slug} (${i + 1}/${SLIDES.length})`, () => {
      window.history.replaceState(null, "", `/sl5/intro/#${slide.slug}`);
      render(<IntroApp />);
      expect(screen.getByText(`${i + 1}/${SLIDES.length}`)).toBeTruthy();
      expect(document.title).toBe(`${slide.title} · SL5 Explorable`);
      // The container that takes focus on every slide change carries the
      // slide's name, so a screen reader announces where it landed.
      expect(screen.getByRole("region", { name: slide.title })).toBeTruthy();
    });
  }
});

describe("navigation", () => {
  it("Next and Back walk the deck and sync the hash", () => {
    render(<IntroApp />);
    expect(window.location.hash).toBe(`#${SLIDES[0].slug}`);

    fireEvent.click(screen.getByText("Next →"));
    expect(window.location.hash).toBe(`#${SLIDES[1].slug}`);

    fireEvent.click(screen.getByText("← Back"));
    expect(window.location.hash).toBe(`#${SLIDES[0].slug}`);
  });

  it("arrow keys navigate, and Home/End jump to the ends", () => {
    render(<IntroApp />);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(window.location.hash).toBe(`#${SLIDES[1].slug}`);

    fireEvent.keyDown(window, { key: "End" });
    expect(window.location.hash).toBe(`#${SLIDES[SLIDES.length - 1].slug}`);

    fireEvent.keyDown(window, { key: "Home" });
    expect(window.location.hash).toBe(`#${SLIDES[0].slug}`);
  });

  it("does not run off either end", () => {
    render(<IntroApp />);
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(window.location.hash).toBe(`#${SLIDES[0].slug}`);

    fireEvent.keyDown(window, { key: "End" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(window.location.hash).toBe(`#${SLIDES[SLIDES.length - 1].slug}`);
  });

  it("ignores arrow keys aimed at a slider — the year scrubbers need them", () => {
    window.history.replaceState(null, "", "/sl5/intro/#why-it-gets-worse");
    render(<IntroApp />);
    const scrubber = screen.getByLabelText("Year");
    fireEvent.keyDown(scrubber, { key: "ArrowRight" });
    expect(window.location.hash).toBe("#why-it-gets-worse");
  });

  it("the progress rail jumps straight to a slide", () => {
    render(<IntroApp />);
    // By role: once navigated, the focused slide region carries the same
    // accessible name as its rail tick.
    const tick = () => screen.getByRole("button", { name: SLIDES[8].title });
    fireEvent.click(tick());
    expect(window.location.hash).toBe(`#${SLIDES[8].slug}`);
    expect(tick().getAttribute("aria-current")).toBe("step");
  });

  it("an unknown slug falls back to the first slide instead of blanking", () => {
    window.history.replaceState(null, "", "/sl5/intro/#no-such-slide");
    render(<IntroApp />);
    expect(screen.getByText(`1/${SLIDES.length}`)).toBeTruthy();
  });
});

describe("handing off to the app", () => {
  // BASE_URL is "/" under vitest (no `base` applied in the test env) and "/sl5/"
  // in dev and on Pages; assert on the shape, not the literal prefix.
  const BASE = import.meta.env.BASE_URL;

  it("the header link marks the intro seen so the first-run modal is skipped", () => {
    render(<IntroApp />);
    const open = screen.getAllByText("Open the app →")[0];
    expect(open.getAttribute("href")).toBe(BASE);
    fireEvent.click(open);
    expect(localStorage.getItem("sl5_intro_seen")).toBe("1");
  });

  it("the story CTA opens a picker offering every authored story", () => {
    window.history.replaceState(null, "", "/sl5/intro/#the-rest");
    render(<IntroApp />);
    fireEvent.click(screen.getByText("▶ Watch a 1-min story"));

    // Every scripted story is offered; the passthrough one isn't, because it
    // just advances time on a posture a newcomer hasn't built.
    const scripted = SCRIPTS.filter((s) => s.type !== "passthrough");
    expect(scripted.length).toBeGreaterThan(1);
    for (const s of scripted) {
      expect(screen.getByText(`▶ ${s.name}`).closest("a")!.getAttribute("href")).toBe(
        `${BASE}?story=${s.id}`
      );
    }
    for (const s of SCRIPTS.filter((s) => s.type === "passthrough")) {
      expect(screen.queryByText(`▶ ${s.name}`)).toBeNull();
    }
  });

  it("picking a story marks the intro seen, and Back returns to the CTAs", () => {
    window.history.replaceState(null, "", "/sl5/intro/#the-rest");
    render(<IntroApp />);
    fireEvent.click(screen.getByText("▶ Watch a 1-min story"));

    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.getByText("▶ Watch a 1-min story")).toBeTruthy();

    fireEvent.click(screen.getByText("▶ Watch a 1-min story"));
    fireEvent.click(screen.getByText("▶ Proactive Program"));
    expect(localStorage.getItem("sl5_intro_seen")).toBe("1");
  });
});

describe("the demos respond", () => {
  /** The erosion percentages currently on screen, in render order. */
  function readErosion(): number[] {
    return screen
      .queryAllByText(/% eroded$/)
      .map((el) => Number(el.textContent!.replace(/[^0-9]/g, "")));
  }

  it("erosion deepens from 2026 to 2030 and never touches the hard stop", () => {
    window.history.replaceState(null, "", "/sl5/intro/#blocks");
    render(<IntroApp />);
    // AI capability is already 35% in 2026, so two of the three erode from the
    // start; the exact percentages come from the engine (see content.test.ts).
    const erodedIn2026 = readErosion();
    expect(erodedIn2026).toHaveLength(2);
    expect(screen.getAllByText("no erosion")).toHaveLength(1);

    fireEvent.click(screen.getByText("2030"));
    const erodedIn2030 = readErosion();
    expect(erodedIn2030).toHaveLength(2);
    // Four more years of AI progress bites deeper...
    erodedIn2030.forEach((pct, i) => expect(pct).toBeGreaterThan(erodedIn2026[i]));
    // ...and never touches the hard stop, which is the point of the slide.
    expect(screen.getAllByText("no erosion")).toHaveLength(1);
  });

  it("the lifecycle hex cycles through all five states and wraps", () => {
    window.history.replaceState(null, "", "/sl5/intro/#lifecycle");
    render(<IntroApp />);
    const block = DEMO_BLOCKS["NET-01"];
    const hex = screen.getByRole("button", { name: `${block.id} ${block.name}` });
    expect(screen.getByText("0%")).toBeTruthy();

    for (const pct of ["10%", "40%", "85%", "100%"]) {
      fireEvent.click(hex);
      expect(screen.getByText(pct)).toBeTruthy();
    }
    fireEvent.click(hex); // wraps back to not_started
    expect(screen.getByText("0%")).toBeTruthy();
  });

  it("right-click advances too — the gesture the app itself uses", () => {
    window.history.replaceState(null, "", "/sl5/intro/#lifecycle");
    render(<IntroApp />);
    const block = DEMO_BLOCKS["NET-01"];
    const hex = screen.getByRole("button", { name: `${block.id} ${block.name}` });
    fireEvent.contextMenu(hex);
    expect(screen.getByText("10%")).toBeTruthy();
  });

  it("the segmented control jumps to a state directly, including backwards", () => {
    window.history.replaceState(null, "", "/sl5/intro/#lifecycle");
    render(<IntroApp />);
    fireEvent.click(screen.getByLabelText("Mature"));
    expect(screen.getByText("100%")).toBeTruthy();
    fireEvent.click(screen.getByLabelText("Investing"));
    expect(screen.getByText("10%")).toBeTruthy();
  });

  it("the decision-window demo separates a closed window from a closing one", () => {
    window.history.replaceState(null, "", "/sl5/intro/#timeline");
    render(<IntroApp />);
    // Defaults to 2027, the one year where the three blocks sit in three tiers.
    expect(screen.getByText("Window closed")).toBeTruthy();
    expect(screen.getByText("Window closing")).toBeTruthy();
    expect(screen.getByText("On the horizon")).toBeTruthy();
  });

  /** `!` glyphs drawn on a hexagon — the slide's prose also says "!", so count
   *  the SVG badges rather than every match on the page. */
  function countBadges(): number {
    return Array.from(document.querySelectorAll("svg text")).filter(
      (t) => t.textContent === "!"
    ).length;
  }

  it("only closed and closing windows get the ! badge, and only closed pulses", () => {
    window.history.replaceState(null, "", "/sl5/intro/#timeline");
    render(<IntroApp />);
    // Two badges at 2027 — the "upcoming" block is deliberately unbadged,
    // matching BlockGrid/ClusterView/DefenseRings, which all drop it.
    expect(countBadges()).toBe(2);
    // The pulse is the overdue-only tell (BlockCell does the same).
    expect(document.querySelectorAll("animate")).toHaveLength(1);
  });

  it("scrubbing to 2029 closes every window on the demo", () => {
    window.history.replaceState(null, "", "/sl5/intro/#timeline");
    render(<IntroApp />);
    fireEvent.change(screen.getByLabelText("Year"), { target: { value: "2029" } });
    expect(screen.getAllByText("Window closed")).toHaveLength(3);
    expect(countBadges()).toBe(3);
    expect(screen.queryByText("Window closing")).toBeNull();
  });

  it("scrubbing to 2024 leaves nothing pressing", () => {
    window.history.replaceState(null, "", "/sl5/intro/#timeline");
    render(<IntroApp />);
    fireEvent.change(screen.getByLabelText("Year"), { target: { value: "2024" } });
    // Only HW-07's 48-month build is even on the two-year horizon, and it's
    // still "upcoming" — so no badge appears anywhere.
    expect(countBadges()).toBe(0);
    expect(screen.getAllByText("Not pressing yet")).toHaveLength(2);
  });

  it("the AI curve scrubber moves the readout", () => {
    window.history.replaceState(null, "", "/sl5/intro/#why-it-gets-worse");
    render(<IntroApp />);
    const svg = screen.getByRole("img");
    expect(svg.getAttribute("aria-label")).toMatch(/2026 is at 35 percent/);

    const scrubber = screen.getByLabelText("Year") as HTMLInputElement;
    fireEvent.change(scrubber, { target: { value: "2030" } });
    expect(svg.getAttribute("aria-label")).toMatch(/2030 is at 100 percent/);
  });

  it("the OC ladder shows OC5's step-change resources when picked", () => {
    window.history.replaceState(null, "", "/sl5/intro/#the-oc-ladder");
    render(<IntroApp />);
    // Defaults to OC4 — the tier the app's baseline adversary sits at.
    expect(screen.getByText(/^OC4 — /)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "OC5" }));
    expect(screen.getByText(/^OC5 — Top-Priority State Operations$/)).toBeTruthy();
    expect(screen.getByText("$1B")).toBeTruthy();
    expect(screen.getByText("50+ zero-days simultaneously")).toBeTruthy();
  });

  it("the OC ladder's patience readout is never off by a plural", () => {
    window.history.replaceState(null, "", "/sl5/intro/#the-oc-ladder");
    render(<IntroApp />);
    // OC1 is a quarter of a month, OC2 exactly one, OC4 exactly twelve — the
    // three values that sit right on a formatTime boundary.
    fireEvent.click(screen.getByRole("button", { name: "OC1" }));
    expect(screen.getByText("1 week")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "OC2" }));
    expect(screen.getByText("1 month")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "OC4" }));
    expect(screen.getByText("1 year")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "OC5" }));
    expect(screen.getByText("5 years")).toBeTruthy();
  });

  it("deploying PER-04 blocks The Long Game at its first step", () => {
    window.history.replaceState(null, "", "/sl5/intro/#attack-paths");
    render(<IntroApp />);
    expect(screen.getByText("☠ Weights exfiltrated")).toBeTruthy();

    fireEvent.click(screen.getByText(`✗ PER-04 ${DEMO_BLOCKS["PER-04"].shortLabel}`));
    expect(screen.getByText("■ Chain blocked")).toBeTruthy();
    // ...and explains why, in the data's own words.
    expect(screen.getByText(LONG_GAME.steps[0].howItStops!)).toBeTruthy();
  });

  it("deploying a later-step defense still lets the earlier steps succeed", () => {
    window.history.replaceState(null, "", "/sl5/intro/#attack-paths");
    render(<IntroApp />);
    fireEvent.click(screen.getByText(`✗ PER-05 ${DEMO_BLOCKS["PER-05"].shortLabel}`));
    expect(screen.getByText("■ Chain blocked")).toBeTruthy();
    expect(screen.getByText(LONG_GAME.steps[3].howItStops!)).toBeTruthy();
  });
});

describe("jargon is explained in place", () => {
  // The intro was reported as too text-heavy, and specifically as using "OC"
  // without ever saying what it stands for. Detail now hides behind <Reveal>
  // and terms behind <Term>, so these guard that the explanation is actually
  // reachable rather than merely written.

  it("clicking a term shows its definition, and clicking again hides it", () => {
    window.history.replaceState(null, "", "/sl5/intro/#the-asset");
    render(<IntroApp />);
    const term = screen.getByRole("button", { name: "weights" });
    expect(term.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(term);
    expect(term.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(GLOSSARY.weights.definition, { exact: false })).toBeTruthy();

    fireEvent.click(term);
    expect(term.getAttribute("aria-expanded")).toBe("false");
  });

  it("one tap opens a term — the whole touch cascade, not just the click", () => {
    // A tap fires FOUR events: pointerenter, a synthesized mouseenter, focus,
    // then click. Every ungated auto-open handler in that cascade opens the card
    // for the click behind it to toggle shut, which is why a term used to need
    // two taps on a phone — the first opened and closed it, and the second only
    // worked because mouseenter doesn't fire twice.
    //
    // This test previously fired focus + click and passed while the phone was
    // still broken, because it left the hover events out. Firing the real
    // sequence is the whole point.
    window.history.replaceState(null, "", "/sl5/intro/#the-asset");
    render(<IntroApp />);
    const term = screen.getByRole("button", { name: "weights" });

    const tap = () => {
      // pointerType "touch" is what distinguishes this from a mouse; jsdom
      // likewise never matches `:focus-visible` for a pointer, so both gates see
      // exactly what a phone would send.
      fireEvent.pointerEnter(term, { pointerType: "touch" });
      fireEvent.mouseEnter(term);
      fireEvent.focus(term);
      fireEvent.click(term);
    };

    tap();
    expect(term.getAttribute("aria-expanded")).toBe("true");

    // And a second tap dismisses it — the click-to-hide behaviour to preserve.
    tap();
    expect(term.getAttribute("aria-expanded")).toBe("false");
  });

  it("a mouse still opens a term on hover alone", () => {
    // The touch fix gates hover on pointerType, so this guards the other side of
    // that gate: a mouse must still get hover-to-open with no click at all.
    window.history.replaceState(null, "", "/sl5/intro/#the-asset");
    render(<IntroApp />);
    const term = screen.getByRole("button", { name: "weights" });

    fireEvent.pointerEnter(term, { pointerType: "mouse" });
    expect(term.getAttribute("aria-expanded")).toBe("true");
    fireEvent.pointerLeave(term, { pointerType: "mouse" });
    expect(term.getAttribute("aria-expanded")).toBe("false");
  });

  it("the OC slide spells out the abbreviation without needing a click", () => {
    window.history.replaceState(null, "", "/sl5/intro/#the-oc-ladder");
    render(<IntroApp />);
    // Visible prose, not a collapsed popover: this is the term a reader told us
    // they couldn't follow, so it can't be one interaction away.
    expect(screen.getByText(/OC = Operational Capability/)).toBeTruthy();
    // The heading no longer leads with the bare abbreviation either.
    expect(document.title).toBe("How capable is the attacker? · SL5 Explorable");
  });

  it("the security-levels slide spells out SL the same way", () => {
    window.history.replaceState(null, "", "/sl5/intro/#security-levels");
    render(<IntroApp />);
    expect(screen.getByText(/SL = Security Level/)).toBeTruthy();
  });

  it("doesn't define the SL tiers by a layer count", () => {
    // The layer count is a field no code in the app reads — `overallSlScore`
    // blends category scores and never sees it — so presenting 1/1/2/4/8 as
    // what the tiers *are* taught the reader something the model doesn't do.
    // What separates SL4 from SL5 is which controls are on the table.
    window.history.replaceState(null, "", "/sl5/intro/#security-levels");
    render(<IntroApp />);
    expect(screen.queryByText("Layers")).toBeNull();
    expect(screen.queryByText(/independent layers/)).toBeNull();
    // The SL5 row still renders its description, minus the trailing count.
    expect(screen.getByText(/Complete isolation, formal hardware verification/))
      .toBeTruthy();
  });

  it("the cover tells the reader the dotted underlines are clickable", () => {
    render(<IntroApp />);
    expect(screen.getByText(/dotted underline/)).toBeTruthy();
  });

  it("the sources slide carries the full glossary, collapsed", () => {
    window.history.replaceState(null, "", "/sl5/intro/#sources");
    render(<IntroApp />);
    const entries = Object.values(GLOSSARY);
    // Present in the DOM but inside a closed <details>, so it costs no reading
    // effort until asked for.
    const details = screen.getByText(/Glossary — every term/).closest("details")!;
    expect(details.open).toBe(false);
    for (const e of entries) expect(screen.getByText(e.label)).toBeTruthy();
  });

  it("every Term on every slide points at a glossary entry that exists", () => {
    // `keyof typeof GLOSSARY` makes a bad key a type error, but only if the
    // slide renders — so walk the whole deck and check each popover resolves to
    // a real label rather than an empty span.
    const labels = new Set(Object.values(GLOSSARY).map((e) => e.label));
    let checked = 0;
    for (const slide of SLIDES) {
      window.history.replaceState(null, "", `/sl5/intro/#${slide.slug}`);
      render(<IntroApp />);
      for (const btn of screen.queryAllByRole("button", { expanded: false })) {
        fireEvent.click(btn);
        // An open Term describes its trigger with the popover it just rendered,
        // and the popover's first span is the glossary label.
        const id = btn.getAttribute("aria-describedby");
        const popover = id ? document.getElementById(id) : null;
        if (!popover || popover.getAttribute("role") !== "tooltip") continue;
        expect(labels).toContain(popover.querySelector("span")!.textContent);
        checked++;
      }
      cleanup();
    }
    // Guard against the sweep silently checking nothing — which is exactly what
    // happened when Term moved from aria-controls to aria-describedby.
    expect(checked, "no Term popovers were opened").toBeGreaterThan(15);
  });
});

describe("external links are safe", () => {
  it("every off-site link opens in a new tab with rel=noopener", () => {
    window.history.replaceState(null, "", "/sl5/intro/#sources");
    render(<IntroApp />);
    const external = Array.from(document.querySelectorAll("a[href^='http']"));
    expect(external.length).toBeGreaterThan(0);
    for (const a of external) {
      expect(a.getAttribute("target"), `${a.getAttribute("href")} target`).toBe("_blank");
      expect(a.getAttribute("rel"), `${a.getAttribute("href")} rel`).toMatch(/noopener/);
    }
  });
});
