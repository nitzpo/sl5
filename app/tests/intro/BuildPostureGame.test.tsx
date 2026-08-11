// @vitest-environment jsdom
//
// The mini-game is a detour off the constraints slide, and it's the one part of
// the introduction that touches the network. Both of those are contracts a reader
// notices when they break: the deck must still load without fetching anything,
// and the detour must hand the reader back to the exact slide they left.
//
// `posture-game.test.ts` covers the arithmetic; this covers the wiring.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import fs from "fs";
import path from "path";
import { IntroApp } from "../../src/intro/IntroApp";
import { BLOCK_FILES, BUDGET_MILLIONS, SHORTLIST } from "../../src/intro/posture-game";

const DATA = path.join(__dirname, "../../public/data");

/** Serve public/data off disk, the way the dev server and Pages both do. */
function stubFetch() {
  const fetchMock = vi.fn(async (url: string | URL) => {
    const file = String(url).split("/data/")[1];
    // 404 rather than a TypeError out of path.join, so an unrelated request
    // fails the way the browser would fail it.
    if (!file) return { ok: false, status: 404, json: async () => null } as Response;
    const full = path.join(DATA, file);
    if (!fs.existsSync(full)) {
      return { ok: false, status: 404, json: async () => null } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => JSON.parse(fs.readFileSync(full, "utf-8")),
    } as Response;
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Walk into the game from the slide that offers it. */
async function openGame() {
  window.history.replaceState(null, "", "/sl5/intro/#constraints");
  render(<IntroApp />);
  fireEvent.click(screen.getByText("▶ Start the mini-game"));
  await waitFor(() => expect(screen.getByText(/Budget$/)).toBeTruthy());
}

beforeEach(() => {
  window.history.replaceState(null, "", "/sl5/intro/");
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("the mini-game is an optional detour", () => {
  it("loads no data until someone opens it", async () => {
    const fetchMock = stubFetch();
    window.history.replaceState(null, "", "/sl5/intro/#constraints");
    render(<IntroApp />);
    // The whole reason the intro inlines its content: reading the deck costs no
    // requests, so a shared link is instant even on a phone.
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("▶ Start the mini-game"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    // attack-chains.json plus one file per block category.
    expect(fetchMock).toHaveBeenCalledTimes(BLOCK_FILES.length + 1);
  });

  it("is not a slide, so the deck is still the same length", () => {
    // If the game ever became a SLIDES entry, the progress rail would grow and
    // every reader would be marched through it. It's a detour on purpose.
    window.history.replaceState(null, "", "/sl5/intro/#constraints");
    render(<IntroApp />);
    expect(screen.queryByText("Build a posture on $150M")).toBeNull();
    expect(screen.getByText("▶ Start the mini-game")).toBeTruthy();
  });

  it("returns to the slide it was opened from", async () => {
    stubFetch();
    await openGame();
    // Two exits, top and bottom; both come back here.
    fireEvent.click(screen.getByText("← Back to the tour"));
    expect(screen.getByText("▶ Start the mini-game")).toBeTruthy();
    expect(screen.getByText(/Pink dashed ring/)).toBeTruthy();
    expect(window.location.hash).toBe("#constraints");
  });

  it("still exits when the data can't be fetched", async () => {
    // A 404 on Pages must not trap the reader inside a dead detour.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, json: async () => null }) as Response)
    );
    window.history.replaceState(null, "", "/sl5/intro/#constraints");
    render(<IntroApp />);
    fireEvent.click(screen.getByText("▶ Start the mini-game"));
    await waitFor(() => expect(screen.getByText(/Couldn't load the block data/)).toBeTruthy());
    fireEvent.click(screen.getByText("← Back to the tour"));
    expect(screen.getByText("▶ Start the mini-game")).toBeTruthy();
  });
});

describe("playing it", () => {
  it("offers every shortlist block, unselected", async () => {
    stubFetch();
    await openGame();
    const tiles = screen.getAllByRole("button", { pressed: false });
    expect(tiles.length).toBe(SHORTLIST.length);
  });

  it("moves the SL score when a block is deployed", async () => {
    stubFetch();
    await openGame();
    const sl = () => screen.getByText("SL score").parentElement!.textContent!;
    const before = sl();
    // Cheap and dependency-free, so it lands as deployed and the score must move.
    fireEvent.click(screen.getByText("Access Control Vestibules (Mantraps)"));
    expect(sl()).not.toBe(before);
  });

  it("moves the breach number once a stopper on the top chain is deployed", async () => {
    stubFetch();
    await openGame();
    const breach = () => screen.getByText("Breach probability").parentElement!.textContent!;
    const before = breach();
    // The trap first: real score gain, no movement on the headline number,
    // because the mantrap isn't on the worst route.
    fireEvent.click(screen.getByText("Access Control Vestibules (Mantraps)"));
    expect(breach()).toBe(before);
    expect(screen.getByText(/only ever tracks the/)).toBeTruthy();
    // Then a block that is on the worst route: the number has to move.
    fireEvent.click(screen.getByText("Inference Channel Outbound Defense"));
    expect(breach()).not.toBe(before);
    // Note the coaching does NOT claim the number is moving here — closing the
    // worst route promotes the next one, which is also untouched, so the line
    // goes back to naming a route the reader hasn't addressed. That's the whole
    // lesson: there is always a worst remaining route.
    expect(screen.getByText(/only ever tracks the|you're on the right route now/))
      .toBeTruthy();
  });

  it("shows the budget cap, and names click order as the way out of it", async () => {
    stubFetch();
    await openGame();
    // The air gap is two thirds of the budget; the next big pick can't fit behind it.
    fireEvent.click(screen.getByText("Air-Gapped SL5 Network"));
    fireEvent.click(screen.getByText("Inference Channel Outbound Defense"));
    fireEvent.click(screen.getByText("Tamper-Evident Enclosures (Rack/Room Scale)"));
    await waitFor(() => expect(screen.getByText(/over budget — capped at/)).toBeTruthy());
    expect(screen.getByText(/funding follows click order/)).toBeTruthy();
    // The blocks picked first keep their money — only the last one is capped.
    expect(screen.getAllByText(/over budget — capped at/).length).toBe(1);
  });

  it("shows the dependency cap and clears it when the prerequisite is bought", async () => {
    stubFetch();
    await openGame();
    fireEvent.click(screen.getByText("Private SF-86 Equivalent Vetting"));
    await waitFor(() => expect(screen.getByText(/needs PER-01 first/)).toBeTruthy());
    fireEvent.click(
      screen.getByText("Sensitivity Levels Framework (SenL-1 through SenL-5)")
    );
    await waitFor(() => expect(screen.queryByText(/needs PER-01 first/)).toBeNull());
  });

  it("prices the air gap as a partial air gap, and names the companion to buy", async () => {
    stubFetch();
    await openGame();
    // The lesson `completed_by` exists for. The air gap is neither over budget
    // nor dependency-capped here, so neither ring fires — it is simply not the
    // whole control its name implies until data can cross it in a controlled way.
    fireEvent.click(screen.getByText("Air-Gapped SL5 Network"));
    expect(screen.queryByText(/over budget — capped at/)).toBeNull();
    expect(screen.queryByText(/needs .* first/)).toBeNull();
    await waitFor(() =>
      expect(screen.getAllByText(/% of full — incomplete without/).length).toBeGreaterThan(0)
    );
    // And the coaching has to hand the reader a move that's actually on the board.
    expect(screen.getByText(/of the control its name implies/)).toBeTruthy();
    expect(screen.getByText(/PER-08 is on this list/)).toBeTruthy();

    // Buying it lifts the fraction rather than clearing a cap — same block,
    // closer to what it claims. Read the air gap's own tile: PER-08 is itself
    // incomplete once bought, so a document-wide query would be ambiguous.
    const airGapFraction = () => {
      // Scoped to the tile: the coaching line under the score names the block too.
      const tile = screen
        .getAllByRole("button")
        .find((el) => el.textContent?.includes("Air-Gapped SL5 Network"))!;
      return Number(tile.textContent!.match(/(\d+)% of full/)![1]);
    };
    const before = airGapFraction();
    fireEvent.click(screen.getByText("No Remote Access / No Out-of-Facility Maintenance"));
    await waitFor(() => expect(airGapFraction()).toBeGreaterThan(before));
  });

  it("reveals the ranked chain list on demand", async () => {
    stubFetch();
    await openGame();
    const toggle = screen.getByText(/What does the attacker do about it\?/);
    // Any count: the number of shipped chains is data, not behaviour.
    expect(screen.queryByText(/All \d+ chains/)).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByText(/All \d+ chains/)).toBeTruthy();
    // The honest-outcome line the copy promises.
    expect(screen.getByText(new RegExp(`Nothing \\$${BUDGET_MILLIONS}M can buy`))).toBeTruthy();
  });

  it("starts over without leaving the game", async () => {
    stubFetch();
    await openGame();
    fireEvent.click(screen.getByText("Access Control Vestibules (Mantraps)"));
    fireEvent.click(screen.getByText("Start over"));
    expect(screen.getAllByRole("button", { pressed: false }).length).toBe(SHORTLIST.length);
    expect(screen.getByText(/Nothing deployed yet/)).toBeTruthy();
    expect(screen.queryByText("Start over")).toBeNull();
  });
});
