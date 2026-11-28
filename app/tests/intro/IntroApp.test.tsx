// @vitest-environment jsdom
//
// Behavioural test for the introduction: every slide renders with one figure,
// its demos run on the shipped data, navigation and deep links work, and the
// copy keeps the rules the user set: no probability percentages, and the
// defender's vocabulary (attack vector, stage, approach, attack path,
// scenario), never "route", "attack flow" or "ways in".

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor, within } from "@testing-library/react";
import { IntroApp } from "../../src/intro/IntroApp";
import { SLIDES } from "../../src/intro/slides";
import { GLOSSARY, OC_TIERS } from "../../src/intro/content";
import { resetThreatDataCache } from "../../src/intro/data";
import { INTRO_SEEN_KEY } from "../../src/intro/nav";
import { SCRIPTS } from "../../src/timelapse/scripts";
import { stubFetch } from "./stub-fetch";

const BASE = import.meta.env.BASE_URL;

function open(slug?: string) {
  window.history.replaceState(null, "", `/sl5/intro/${slug ? `#${slug}` : ""}`);
  return render(<IntroApp />);
}

async function settled() {
  await waitFor(() => expect(screen.queryByText(/Loading the catalogue/)).toBeNull());
  expect(screen.queryByText(/Couldn't load the catalogue/)).toBeNull();
}

/** Everything a reader can see or hear: text, tooltips and accessible names. */
function readable(): string {
  const attrs = Array.from(document.querySelectorAll("[title],[aria-label]")).map(
    (el) => `${el.getAttribute("title") ?? ""} ${el.getAttribute("aria-label") ?? ""}`
  );
  return `${document.body.textContent} ${attrs.join(" ")}`;
}

beforeEach(() => {
  localStorage.clear();
  resetThreatDataCache();
  stubFetch();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("every slide", () => {
  for (const [i, slide] of SLIDES.entries()) {
    it(`#${slide.slug} (${i + 1}/${SLIDES.length}) renders one figure, with the rules kept`, async () => {
      open(slide.slug);
      await settled();
      expect(screen.getByLabelText(`Slide ${i + 1} of ${SLIDES.length}`)).toBeTruthy();
      expect(document.title).toBe(`${slide.title} · SL5 Explorable`);
      const region = screen.getByRole("region", { name: slide.title });
      expect(region.querySelectorAll("figure")).toHaveLength(1);

      const text = readable();
      expect(text, "a percentage on the page").not.toMatch(/\d\s?%|percent/i);
      expect(text).not.toMatch(/\broutes?\b/i);
      expect(text).not.toMatch(/attack flow/i);
      expect(text).not.toMatch(/ways in/i);
    });
  }
});

describe("navigation", () => {
  it("Next and Back walk the deck and keep the hash in step", () => {
    open();
    expect(window.location.hash).toBe(`#${SLIDES[0].slug}`);
    fireEvent.click(screen.getByText("Next →"));
    expect(window.location.hash).toBe(`#${SLIDES[1].slug}`);
    fireEvent.click(screen.getByText("← Back"));
    expect(window.location.hash).toBe(`#${SLIDES[0].slug}`);
  });

  it("names the next slide on the Next button", () => {
    open();
    expect(screen.getByText(`${SLIDES[1].title} →`)).toBeTruthy();
  });

  it("arrow keys navigate, Home and End jump, and neither end is overrun", () => {
    open();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(window.location.hash).toBe(`#${SLIDES[0].slug}`);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(window.location.hash).toBe(`#${SLIDES[1].slug}`);
    fireEvent.keyDown(window, { key: "End" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(window.location.hash).toBe(`#${SLIDES[SLIDES.length - 1].slug}`);
    fireEvent.keyDown(window, { key: "Home" });
    expect(window.location.hash).toBe(`#${SLIDES[0].slug}`);
  });

  it("leaves arrow keys to a slider that has focus", () => {
    open("why-it-gets-worse");
    fireEvent.keyDown(screen.getByLabelText("Year"), { key: "ArrowRight" });
    expect(window.location.hash).toBe("#why-it-gets-worse");
  });

  it("the progress rail jumps straight to a slide", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: SLIDES[8].title }));
    expect(window.location.hash).toBe(`#${SLIDES[8].slug}`);
    expect(screen.getByRole("button", { name: SLIDES[8].title }).getAttribute("aria-current")).toBe("step");
  });

  it("an unknown slug falls back to the first slide", () => {
    open("no-such-slide");
    expect(screen.getByLabelText(`Slide 1 of ${SLIDES.length}`)).toBeTruthy();
  });

  it("links to retired v1 slugs land on the slide that took over their topic", () => {
    for (const [old, now] of [
      ["the-rest", "ready"],
      ["constraints", "budget"],
      ["why-steal-them", "start"],
      ["lifecycle", "blocks"],
    ]) {
      open(old);
      expect(window.location.hash).toBe(`#${now}`);
      cleanup();
    }
  });

  it("moves focus to the new slide's region, which carries its name", () => {
    open();
    fireEvent.click(screen.getByText("Next →"));
    expect(document.activeElement).toBe(screen.getByRole("region", { name: SLIDES[1].title }));
  });
});

describe("handing off to the instrument", () => {
  it("links to the configured base and marks the intro seen under v2's own key", () => {
    open();
    const link = screen.getAllByText("Open the instrument →")[0].closest("a")!;
    expect(link.getAttribute("href")).toBe(BASE);
    fireEvent.click(link);
    expect(localStorage.getItem(INTRO_SEEN_KEY)).toBe("1");
    expect(INTRO_SEEN_KEY).toBe("sl5v2_intro_seen");
    // v1 shares the origin: its key is never written.
    expect(localStorage.getItem("sl5_intro_seen")).toBeNull();
  });

  it("the last slide offers every scripted scenario, and picking one marks the intro seen", () => {
    open("ready");
    fireEvent.click(screen.getByText("▶ Watch a 1-minute scenario"));
    const scripted = SCRIPTS.filter((s) => s.type !== "passthrough");
    expect(scripted.length).toBeGreaterThan(1);
    for (const s of scripted) {
      expect(screen.getByText(`▶ ${s.name}`).closest("a")!.getAttribute("href")).toBe(`${BASE}?story=${s.id}`);
    }
    fireEvent.click(screen.getByText("Cancel"));
    fireEvent.click(screen.getByText("▶ Watch a 1-minute scenario"));
    fireEvent.click(screen.getByText(`▶ ${scripted[0].name}`));
    expect(localStorage.getItem(INTRO_SEEN_KEY)).toBe("1");
  });
});

describe("the demos respond", () => {
  it("AI lifts the attacker a full tier on code and credentials by 2030", () => {
    open("why-it-gets-worse");
    expect(screen.queryByText("works like OC4")).toBeNull();
    fireEvent.change(screen.getByLabelText("Year"), { target: { value: "2030" } });
    expect(screen.getByText("works like OC4")).toBeTruthy();
    // People and places barely move, and military force not at all.
    expect(screen.getByText("unchanged")).toBeTruthy();
  });

  it("the OC ladder opens on OC4 and shows OC5's resources when picked", () => {
    open("the-oc-ladder");
    expect(screen.getByText(OC_TIERS[3].name)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^OC5,/ }));
    expect(screen.getByText(OC_TIERS[4].name)).toBeTruthy();
    expect(screen.getByText("$1B · 1,000 people · 5 years")).toBeTruthy();
    expect(screen.getByText("50+ zero-days simultaneously")).toBeTruthy();
  });

  it("the level matrix explains a level, and marks where a typical lab starts", async () => {
    open("security-levels");
    await settled();
    expect(screen.getByText(/OC1 to OC3 usually fail against you/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^SL5:/ }));
    expect(screen.getByText(/and so does your own model/)).toBeTruthy();
    expect(screen.getByText(/where a typical lab starts in 2026/)).toBeTruthy();
  });

  it("the own-model figure gives a band per year for both postures", async () => {
    open("own-model");
    await settled();
    const table = screen.getByRole("table");
    expect(within(table).getByText("Today's typical lab")).toBeTruthy();
    expect(within(table).getByText("Every defense, mature")).toBeTruthy();
    expect(within(table).getAllByText(/usually fails|contested|usually succeeds/).length).toBe(6);
  });

  it("the catalogue tile advances on click and steps back on right-click", () => {
    open("blocks");
    const tile = screen.getByRole("button", { name: /^NET-01 .*not started/ });
    fireEvent.click(tile);
    expect(screen.getByRole("button", { name: /^NET-01 .*investing/ })).toBeTruthy();
    fireEvent.contextMenu(screen.getByRole("button", { name: /^NET-01 .*investing/ }));
    expect(screen.getByRole("button", { name: /^NET-01 .*not started/ })).toBeTruthy();
    fireEvent.click(screen.getByText("Step back"));
    expect(screen.getByRole("button", { name: /^NET-01 .*mature/ })).toBeTruthy();
  });

  it("the stage figure shows more vectors usually succeeding as the tier rises", async () => {
    open("attack-vectors");
    await settled();
    const getIn = () => screen.getByRole("region", { name: "Get in" }).textContent!;
    const count = () => Number(getIn().match(/(\d+) of \d+ RAND vectors usually succeed/)![1]);
    fireEvent.click(screen.getByRole("button", { name: "OC1" }));
    const low = count();
    fireEvent.click(screen.getByRole("button", { name: "OC5" }));
    expect(count()).toBeGreaterThan(low);
    expect(screen.getByRole("region", { name: "Get them out" }).textContent).toMatch(/RAND scores none/);
  });

  it("deploying defenses on the easiest path moves it", async () => {
    open("attack-paths");
    await settled();
    const path = () => screen.getByRole("list", { name: "Attack path, stage by stage" }).textContent;
    const before = path();
    // Deploy the first counter offered at each stage until something moves.
    const offered = within(screen.getByRole("list", { name: "Attack path, stage by stage" })).getAllByRole("button", {
      pressed: false,
    });
    for (const b of offered) fireEvent.click(b);
    expect(path()).not.toBe(before);
    expect(screen.getByText("Reset defenses")).toBeTruthy();
  });

  it("stacking: partial counters leave the step usually succeeding; the strong one does more", async () => {
    open("stacking");
    await settled();
    const toggles = screen.getAllByRole("button", { pressed: false });
    const partials = toggles.filter((b) => / · partial/.test(b.textContent!));
    const strong = toggles.find((b) => / · strong/.test(b.textContent!))!;
    for (const b of partials) fireEvent.click(b);
    expect(screen.getByRole("status").textContent).toMatch(/partial counters: still usually succeeds/);
    expect(screen.getAllByText("adds nothing").length).toBeGreaterThan(0);
    for (const b of partials) fireEvent.click(b);
    fireEvent.click(strong);
    expect(screen.getByRole("status").textContent).toMatch(/One strong counter alone: (contested|usually fails)/);
  });

  it("the level demo reaches SL5 only with future capabilities in a favourable world", async () => {
    open("your-level");
    await settled();
    const level = () => screen.getByLabelText(/^Security level \d/).textContent;
    expect(level()).not.toBe("SL5");
    fireEvent.click(screen.getByRole("button", { name: "Favourable" }));
    expect(level()).not.toBe("SL5");
    fireEvent.click(screen.getByRole("switch", { name: /Future capabilities/ }));
    expect(level()).toBe("SL5");
    fireEvent.click(screen.getByRole("button", { name: "Today's typical lab" }));
    expect(level()).toBe("SL1");
    expect(screen.getByText("What still gets through")).toBeTruthy();
  });

  it("the race moves the threat front with the AI pace, and late starts land after it", async () => {
    open("timeline");
    await settled();
    const front = () => screen.getByText(/^The front:/).textContent;
    expect(front()).toMatch(/The front: 2030/);
    expect(screen.getByText(/Doing nothing is a decline/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Faster" }));
    expect(front()).toMatch(/The front: Apr 2028/);
    fireEvent.click(screen.getByRole("button", { name: "2028" }));
    expect(screen.getAllByText("lands after the front").length).toBeGreaterThan(3);
  });
});

describe("jargon explains itself", () => {
  it("a click opens a term and a second click closes it", () => {
    open();
    const term = screen.getByRole("button", { name: "weights" });
    fireEvent.click(term);
    expect(term.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText(GLOSSARY.weights.definition)).toBeTruthy();
    fireEvent.click(term);
    expect(term.getAttribute("aria-expanded")).toBe("false");
  });

  it("one tap opens a term: the whole touch cascade, not just the click", () => {
    open();
    const term = screen.getByRole("button", { name: "weights" });
    const tap = () => {
      fireEvent.pointerEnter(term, { pointerType: "touch" });
      fireEvent.mouseEnter(term);
      fireEvent.focus(term);
      fireEvent.click(term);
    };
    tap();
    expect(term.getAttribute("aria-expanded")).toBe("true");
    tap();
    expect(term.getAttribute("aria-expanded")).toBe("false");
  });

  it("a mouse opens a term on hover alone", () => {
    open();
    const term = screen.getByRole("button", { name: "weights" });
    fireEvent.pointerEnter(term, { pointerType: "mouse" });
    expect(term.getAttribute("aria-expanded")).toBe("true");
    fireEvent.pointerLeave(term, { pointerType: "mouse" });
    expect(term.getAttribute("aria-expanded")).toBe("false");
  });

  it("every term on every slide points at a glossary entry", async () => {
    const labels = new Set(Object.values(GLOSSARY).map((e) => e.label));
    let checked = 0;
    for (const slide of SLIDES) {
      open(slide.slug);
      await settled();
      for (const btn of screen.queryAllByRole("button", { expanded: false })) {
        fireEvent.click(btn);
        const id = btn.getAttribute("aria-describedby");
        const popover = id ? document.getElementById(id) : null;
        if (!popover || popover.getAttribute("role") !== "tooltip") continue;
        expect(labels).toContain(popover.querySelector("span")!.textContent);
        checked++;
      }
      cleanup();
    }
    expect(checked, "no term popovers were opened").toBeGreaterThan(15);
  });

  it("the sources slide carries the whole glossary, collapsed", () => {
    open("sources");
    const details = screen.getByText(/Glossary: every term/).closest("details")!;
    expect(details.open).toBe(false);
    for (const e of Object.values(GLOSSARY)) expect(within(details).getByText(e.label)).toBeTruthy();
  });
});

describe("external links", () => {
  it("open in a new tab with rel=noopener", () => {
    open("sources");
    const external = Array.from(document.querySelectorAll("a[href^='http']"));
    expect(external.length).toBeGreaterThan(4);
    for (const a of external) {
      expect(a.getAttribute("target")).toBe("_blank");
      expect(a.getAttribute("rel")).toMatch(/noopener/);
    }
  });
});
