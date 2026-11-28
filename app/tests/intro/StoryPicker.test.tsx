// @vitest-environment jsdom
//
// The introduction reads on a phone; the instrument does not, and gates below
// 768px. Together those once made a loop: a phone reader finished the intro,
// tapped a scenario, met the gate, and the gate's only button led back to the
// intro. These guard both ends: the intro withholds links into the instrument
// on a narrow screen, and the gate doesn't offer the return leg to someone who
// came from the intro.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { StoryPicker } from "../../src/intro/StoryPicker";
import { DesktopGate } from "../../src/components/overlays/DesktopGate";
import { IntroApp } from "../../src/intro/IntroApp";
import { SLIDES } from "../../src/intro/slides";
import { SCRIPTS } from "../../src/timelapse/scripts";
import { APP_URL, storyUrl } from "../../src/intro/nav";

/** jsdom has no `matchMedia`; install one pinned to a width. */
function setViewport(width: number) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => {
      const min = Number(/\(min-width:\s*(\d+)px\)/.exec(query)?.[1] ?? 0);
      return { matches: width >= min, media: query, addEventListener: () => {}, removeEventListener: () => {} };
    },
  });
}

const STORY = SCRIPTS.find((s) => s.type !== "passthrough")!;
/** The gate's way to the introduction, however it is worded. */
const introLink = () => [...document.querySelectorAll("a")].find((a) => /intro\/?$/.test(a.getAttribute("href") ?? ""));

beforeEach(() => {
  window.history.replaceState(null, "", "/sl5/");
  Object.defineProperty(document, "referrer", { writable: true, configurable: true, value: "" });
});

afterEach(cleanup);

describe("StoryPicker on a narrow screen", () => {
  beforeEach(() => setViewport(390));

  it("offers no links into the instrument, and says why", () => {
    render(<StoryPicker />);
    expect(document.querySelectorAll("a").length).toBe(0);
    expect(screen.getByText(/needs a desktop/i)).toBeTruthy();
    expect(screen.queryByText(/Watch a 1-minute scenario/)).toBeNull();
  });
});

describe("StoryPicker on a desktop", () => {
  beforeEach(() => setViewport(1400));

  it("opens the instrument, and links to every scripted scenario", () => {
    render(<StoryPicker />);
    expect(screen.getByText("Open the instrument →").closest("a")!.getAttribute("href")).toBe(APP_URL);
    fireEvent.click(screen.getByText(/Watch a 1-minute scenario/));
    const hrefs = [...document.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    for (const s of SCRIPTS.filter((x) => x.type !== "passthrough")) expect(hrefs).toContain(storyUrl(s.id));
  });
});

describe("DesktopGate does not send the reader back where they came from", () => {
  it("omits the way to the intro when a scenario link brought them", () => {
    window.history.replaceState(null, "", `/sl5/?story=${STORY.id}`);
    render(<DesktopGate />);
    expect(introLink()).toBeUndefined();
    expect(document.body.textContent).toMatch(/story|scenario/i);
  });

  it("omits it when the referrer is the intro", () => {
    Object.defineProperty(document, "referrer", {
      writable: true,
      configurable: true,
      value: "https://nitzpo.github.io/sl5/intro/",
    });
    render(<DesktopGate />);
    expect(introLink()).toBeUndefined();
  });

  it("still offers it to someone who arrived cold", () => {
    render(<DesktopGate />);
    expect(introLink()).toBeDefined();
  });
});

describe("IntroApp on a narrow screen", () => {
  beforeEach(() => {
    setViewport(390);
    window.history.replaceState(null, "", `/sl5/intro/#${SLIDES[SLIDES.length - 1].slug}`);
  });

  it("offers no link into the instrument anywhere", () => {
    render(<IntroApp />);
    const appLinks = [...document.querySelectorAll("a")].filter((a) => {
      const href = a.getAttribute("href") ?? "";
      return href === APP_URL || href.includes("?story=");
    });
    expect(appLinks.length).toBe(0);
    expect(screen.queryByText(/Open the instrument →/)).toBeNull();
    expect(screen.getByText(/End of the introduction/)).toBeTruthy();
  });

  it("still offers them on a desktop", () => {
    setViewport(1400);
    render(<IntroApp />);
    expect(screen.getAllByText(/Open the instrument →/).length).toBeGreaterThan(0);
  });
});
