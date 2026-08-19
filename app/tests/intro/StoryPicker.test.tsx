// @vitest-environment jsdom
//
// The introduction is built to read on a phone; the instrument is not, and gates
// below 768px. That combination produced a loop: a phone reader finishing the
// intro tapped a story, the app mounted, `DesktopGate` replaced it, and the
// gate's only button led back to the introduction.
//
// These guard both ends of it — the intro withholds the links, and the gate
// doesn't offer the return leg.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { StoryPicker } from "../../src/intro/StoryPicker";
import { DesktopGate } from "../../src/components/overlays/DesktopGate";
import { IntroApp } from "../../src/intro/IntroApp";
import { SLIDES } from "../../src/intro/slides";
import { SCRIPTS } from "../../src/timelapse/scripts";
import { storyUrl } from "../../src/intro/nav";

/** jsdom has no `matchMedia`; install one pinned to a given width. */
function setViewport(width: number) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => {
      const min = Number(/\(min-width:\s*(\d+)px\)/.exec(query)?.[1] ?? 0);
      return {
        matches: width >= min,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      };
    },
  });
}

const STORY = SCRIPTS.find((s) => s.type !== "passthrough")!;

beforeEach(() => {
  window.history.replaceState(null, "", "/sl5/");
  Object.defineProperty(document, "referrer", {
    writable: true,
    configurable: true,
    value: "",
  });
});

afterEach(cleanup);

describe("StoryPicker on a narrow screen", () => {
  beforeEach(() => setViewport(390));

  it("offers no links into the app", () => {
    render(<StoryPicker />);
    expect(document.querySelectorAll("a").length).toBe(0);
  });

  it("says a desktop is needed instead", () => {
    render(<StoryPicker />);
    expect(screen.getByText(/needs a desktop/i)).toBeTruthy();
  });

  it("does not offer the story list at all", () => {
    render(<StoryPicker />);
    expect(screen.queryByText(/Watch a 1-min story/)).toBeNull();
  });
});

describe("StoryPicker on a desktop", () => {
  beforeEach(() => setViewport(1400));

  it("still links to every non-passthrough story", () => {
    render(<StoryPicker />);
    fireEvent.click(screen.getByText(/Watch a 1-min story/));
    const hrefs = [...document.querySelectorAll("a")].map((a) =>
      a.getAttribute("href")
    );
    for (const s of SCRIPTS.filter((s) => s.type !== "passthrough")) {
      expect(hrefs).toContain(storyUrl(s.id));
    }
  });
});

describe("DesktopGate does not send the reader back where they came from", () => {
  it("omits the intro CTA when a story link brought them here", () => {
    window.history.replaceState(null, "", `/sl5/?story=${STORY.id}`);
    render(<DesktopGate />);
    expect(screen.queryByText(/Read the 5-minute introduction/)).toBeNull();
  });

  it("names the story case rather than showing the generic warning", () => {
    window.history.replaceState(null, "", `/sl5/?story=${STORY.id}`);
    render(<DesktopGate />);
    expect(screen.getByText(/That story runs inside the explorable/)).toBeTruthy();
  });

  it("omits the intro CTA when the referrer is the intro", () => {
    Object.defineProperty(document, "referrer", {
      writable: true,
      configurable: true,
      value: "https://nitzpo.github.io/sl5/intro/",
    });
    render(<DesktopGate />);
    expect(screen.queryByText(/Read the 5-minute introduction/)).toBeNull();
  });

  it("still offers the intro to someone who arrived cold", () => {
    render(<DesktopGate />);
    expect(screen.getByText(/Read the 5-minute introduction/)).toBeTruthy();
  });
});

describe("IntroApp withholds app links on a narrow screen", () => {
  beforeEach(() => {
    setViewport(390);
    window.history.replaceState(
      null,
      "",
      `/sl5/intro/#${SLIDES[SLIDES.length - 1].slug}`
    );
  });

  it("offers no link to the app anywhere on the page", () => {
    render(<IntroApp />);
    const appLinks = [...document.querySelectorAll("a")].filter((a) => {
      const href = a.getAttribute("href") ?? "";
      return href === "/" || href.includes("?story=");
    });
    expect(appLinks.length).toBe(0);
  });

  it("closes the deck rather than offering 'Open the app'", () => {
    render(<IntroApp />);
    expect(screen.queryByText(/Open the app/)).toBeNull();
    expect(screen.getByText(/End of the introduction/)).toBeTruthy();
  });

  it("still offers them on a desktop", () => {
    setViewport(1400);
    render(<IntroApp />);
    expect(screen.getAllByText(/Open the app/).length).toBeGreaterThan(0);
  });
});
