// The first-run modal is the only thing a new arrival sees, so the ordering of
// its three exits is a product decision worth pinning: the long-form
// introduction is the primary call to action, and the story and free-explore
// buttons are deliberately secondary. A restyle that quietly promotes one of
// them back over the introduction should fail here.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { IntroOverlay } from "../../src/components/overlays/IntroOverlay";
import { SCRIPTS } from "../../src/timelapse/scripts";
import { usePlaybackStore } from "../../src/timelapse/playback-store";

const INTRO_CTA = "Start with the 5-minute introduction";

// The real startScript rewrites the simulation store; the modal's only contract
// is that it hands the chosen script over, so stub it and restore afterwards.
const realStartScript = usePlaybackStore.getState().startScript;

beforeEach(() => localStorage.clear());
afterEach(() => {
  usePlaybackStore.setState({ startScript: realStartScript });
  cleanup();
});

describe("the introduction is the primary call to action", () => {
  it("is the first interactive element in the modal", () => {
    render(<IntroOverlay onClose={() => {}} />);
    // Query the whole modal in DOM order rather than asserting on classes: what
    // matters is that a reader tabbing or reading top-down meets it first.
    const interactive = Array.from(
      document.querySelectorAll("a[href], button")
    ).filter((el) => el.textContent?.trim());
    expect(interactive[0].textContent).toContain(INTRO_CTA);
  });

  it("links to the intro page and is the only violet-filled action", () => {
    render(<IntroOverlay onClose={() => {}} />);
    const cta = screen.getByText(INTRO_CTA).closest("a")!;
    expect(cta.getAttribute("href")).toBe(`${import.meta.env.BASE_URL}intro/`);

    // The accent fill is the visual weight that makes it read as primary. The
    // two secondary buttons must not share it.
    const violet = Array.from(document.querySelectorAll("a, button")).filter((el) =>
      /bg-violet-600|bg-purple-600/.test(el.className)
    );
    expect(violet).toHaveLength(1);
    expect(violet[0].textContent).toContain(INTRO_CTA);
  });

  it("marks the intro seen, so returning to the app isn't a loop", () => {
    render(<IntroOverlay onClose={() => {}} />);
    fireEvent.click(screen.getByText(INTRO_CTA));
    expect(localStorage.getItem("sl5_intro_seen")).toBe("1");
  });
});

describe("the secondary exits still work", () => {
  it("the story button opens the chooser, and picking one plays it", () => {
    const onClose = vi.fn();
    const startScript = vi.fn();
    usePlaybackStore.setState({ startScript });
    render(<IntroOverlay onClose={onClose} />);

    fireEvent.click(screen.getByText("▶ Watch the 1-min story"));
    const scripted = SCRIPTS.filter((s) => s.type !== "passthrough");
    for (const s of scripted) expect(screen.getByText(`▶ ${s.name}`)).toBeTruthy();

    fireEvent.click(screen.getByText(`▶ ${scripted[0].name}`));
    // Closing and remembering isn't enough: the whole point of this exit is
    // that the chosen story is actually playing when the app appears.
    expect(startScript).toHaveBeenCalledWith(scripted[0]);
    expect(onClose).toHaveBeenCalled();
    expect(localStorage.getItem("sl5_intro_seen")).toBe("1");
  });

  it("the intro CTA stays visible while the story chooser is open", () => {
    render(<IntroOverlay onClose={() => {}} />);
    fireEvent.click(screen.getByText("▶ Watch the 1-min story"));
    expect(screen.getByText(INTRO_CTA)).toBeTruthy();
  });

  it("Explore freely dismisses and remembers", () => {
    const onClose = vi.fn();
    render(<IntroOverlay onClose={onClose} />);
    fireEvent.click(screen.getByText("Explore freely"));
    expect(onClose).toHaveBeenCalled();
    expect(localStorage.getItem("sl5_intro_seen")).toBe("1");
  });
});
