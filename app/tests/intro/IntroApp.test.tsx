// Behavioural smoke test for the introduction at /sl5/intro/. `content.test.ts`
// guards the numbers; this guards that every slide actually renders and that
// navigation and the interactive demos respond — the intro has no other test
// surface, and its whole job is to be clicked through by a first-time reader.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { IntroApp } from "../../src/intro/IntroApp";
import { SLIDES } from "../../src/intro/slides";
import { DEMO_BLOCKS, LONG_GAME } from "../../src/intro/content";
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
    fireEvent.click(screen.getByLabelText(SLIDES[8].title));
    expect(window.location.hash).toBe(`#${SLIDES[8].slug}`);
    expect(screen.getByLabelText(SLIDES[8].title).getAttribute("aria-current")).toBe("step");
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
