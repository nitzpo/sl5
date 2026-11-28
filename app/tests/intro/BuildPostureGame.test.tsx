// @vitest-environment jsdom
//
// The budget mini-game, wired into the deck. `posture-game.test.ts` covers the
// arithmetic; this covers what the reader sees: the deck's first slides load
// no data, the game offers every defense, its headline says in words which
// tiers you stop, and the budget and prerequisite caps show and explain
// themselves.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { IntroApp } from "../../src/intro/IntroApp";
import { BLOCK_FILES, MODEL_FILES, resetThreatDataCache } from "../../src/intro/data";
import { SHORTLIST } from "../../src/intro/posture-game";
import { stubFailingFetch, stubFetch } from "./stub-fetch";
import { loadThreatDataFromDisk } from "./load-data";

const data = loadThreatDataFromDisk();
const nameOf = (id: string) => data.blocks.find((b) => b.id === id)!.name;
/** The defense's tile (its name also appears in the coaching line). */
const tile = (id: string) =>
  screen
    .getAllByText(nameOf(id))
    .map((el) => el.closest("button"))
    .find((b): b is HTMLButtonElement => !!b && b.hasAttribute("aria-pressed"))!;

async function openGame() {
  window.history.replaceState(null, "", "/sl5/intro/#budget");
  render(<IntroApp />);
  await waitFor(() => expect(screen.getByText(/You usually stop/)).toBeTruthy());
}

const headline = () => screen.getByText(/^You usually stop/).textContent;

beforeEach(() => {
  localStorage.clear();
  resetThreatDataCache();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("loading", () => {
  it("the first slide fetches nothing; the game fetches the shipped data once", async () => {
    const fetchMock = stubFetch();
    window.history.replaceState(null, "", "/sl5/intro/");
    render(<IntroApp />);
    expect(fetchMock).not.toHaveBeenCalled();
    cleanup();
    await openGame();
    expect(fetchMock).toHaveBeenCalledTimes(MODEL_FILES.length + BLOCK_FILES.length);
  });

  it("says so, and keeps the deck working, when the data can't be fetched", async () => {
    stubFailingFetch();
    window.history.replaceState(null, "", "/sl5/intro/#budget");
    render(<IntroApp />);
    await waitFor(() => expect(screen.getByText(/Couldn't load the catalogue/)).toBeTruthy());
    fireEvent.click(screen.getByText("← Back"));
    expect(window.location.hash).not.toBe("#budget");
  });
});

describe("playing it", () => {
  beforeEach(() => {
    stubFetch();
  });

  it("offers every defense on the shortlist, none picked", async () => {
    await openGame();
    for (const id of SHORTLIST) expect(tile(id).getAttribute("aria-pressed")).toBe("false");
  });

  it("starts where a typical lab is, and the headline moves in words as you fund defenses", async () => {
    await openGame();
    expect(headline()).toBe("You usually stop OC1.");
    expect(screen.getByLabelText(/^Security level 1/)).toBeTruthy();
    let chipSeen = false;
    for (const id of ["NET-01", "PER-01", "PER-02", "PER-09"]) {
      const before = headline();
      fireEvent.click(tile(id));
      // The tier that just moved says so, at the moment it moves.
      if (headline() !== before) chipSeen = screen.queryAllByText("−1 band").length > 0;
    }
    expect(headline()).toBe("You usually stop OC1 and OC2.");
    expect(screen.getByLabelText(/^Security level 2/)).toBeTruthy();
    expect(chipSeen).toBe(true);
    // Picks are numbered in funding order.
    expect(tile("NET-01").textContent).toMatch(/1$/);
  });

  it("names what still gets through, in words", async () => {
    await openGame();
    expect(screen.getByText(/You start where a typical frontier lab is today, two years on/)).toBeTruthy();
    fireEvent.click(tile("PHY-03"));
    expect(screen.getByText(/^Next up:/).textContent).toMatch(/OC2 .* easiest approach is .*: Get in: /);
  });

  it("shows the budget cap on the pick that overruns, and points at pick order", async () => {
    await openGame();
    for (const id of ["NET-01", "HW-05", "PER-01"]) fireEvent.click(tile(id));
    expect(screen.getAllByText(/over budget · not built/)).toHaveLength(1);
    expect(tile("PER-01").textContent).toMatch(/over budget/);
    expect(screen.getByText(/doesn't fit the budget/)).toBeTruthy();
    expect(screen.getByText(/Funding follows your pick order/)).toBeTruthy();
  });

  it("shows a prerequisite cap, and clears it when the prerequisite is funded", async () => {
    await openGame();
    fireEvent.click(tile("PER-06"));
    expect(screen.getByText(/needs PER-01 running first/)).toBeTruthy();
    fireEvent.click(tile("PER-01"));
    expect(screen.queryByText(/needs PER-01 running first/)).toBeNull();
  });

  it("looks ahead to 2030, and starts over without leaving the slide", async () => {
    await openGame();
    expect(screen.getByText(/By 2030, with nothing more added/)).toBeTruthy();
    fireEvent.click(tile("PHY-03"));
    fireEvent.click(screen.getByText("Start over"));
    for (const id of SHORTLIST) expect(tile(id).getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryByText("Start over")).toBeNull();
    expect(window.location.hash).toBe("#budget");
  });
});
