import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  baselineStateFor,
  baselineStates,
  isAtOrBelowBaseline,
} from "../../src/engine/baseline";
import type { Block } from "../../src/engine/types";

const DATA = path.join(__dirname, "../../public/data");

function loadBlocks(): Block[] {
  const blocks: Block[] = [];
  for (const file of fs.readdirSync(DATA)) {
    if (file.startsWith("blocks-") && file.endsWith(".json")) {
      blocks.push(...JSON.parse(fs.readFileSync(path.join(DATA, file), "utf-8")));
    }
  }
  return blocks;
}

const blocks = loadBlocks();
const byId = new Map(blocks.map((b) => [b.id, b]));

describe("baseline mapping", () => {
  it("maps partially_deployed onto implementing, not a state of its own", () => {
    // `partially_deployed` is not a BlockState. It rides on `implementing`,
    // which is already the engine's "real but unfinished" marker everywhere
    // else (breach depth credit, dependency caps, budget caps).
    const partial = blocks.filter(
      (b) => b.current_state.baseline_state === "partially_deployed"
    );
    expect(partial.length).toBeGreaterThan(10);
    for (const b of partial) {
      expect(baselineStateFor(b), b.id).toBe("implementing");
    }
  });

  it("treats proven_not_deployed and researching as nothing a lab has", () => {
    // The technology being real elsewhere, or being an open problem, is not a
    // posture. Both collapse to not_started.
    const notAPosture = blocks.filter((b) =>
      ["proven_not_deployed", "researching"].includes(b.current_state.baseline_state)
    );
    expect(notAPosture.length).toBeGreaterThan(0);
    for (const b of notAPosture) {
      expect(baselineStateFor(b), b.id).toBe("not_started");
    }
  });

  it("never returns a state outside the advancement cycle", () => {
    const cycle = ["not_started", "investing", "implementing", "deployed", "mature"];
    for (const b of blocks) {
      expect(cycle, b.id).toContain(baselineStateFor(b));
    }
  });
});

describe("baseline_since", () => {
  it("withholds a dated control before the year it arrived", () => {
    // PER-06's two-party authorization for weight access is public as of ASL-3
    // in 2025. A 2024 story must not inherit it, or the deployment-race
    // argument gets to assume a defense that did not exist when it starts.
    const per06 = byId.get("PER-06")!;
    expect(per06.current_state.baseline_since).toBe(2025);
    expect(baselineStateFor(per06, 2024)).toBe("not_started");
    expect(baselineStateFor(per06, 2025)).toBe("implementing");
    expect(baselineStateFor(per06, 2026)).toBe("implementing");
  });

  it("only dates blocks that actually have a baseline to date", () => {
    // A `baseline_since` on a `not_started` block says nothing and would rot:
    // it survives a later correction that resets the state and then silently
    // describes a posture the block no longer claims.
    for (const b of blocks) {
      if (b.current_state.baseline_since !== undefined) {
        expect(
          baselineStateFor(b),
          `${b.id} carries baseline_since but has no baseline`
        ).not.toBe("not_started");
      }
    }
  });

  it("leaves undated long-standing controls alone at every year", () => {
    // Mantraps did not appear recently; there is no useful date to gate on.
    const phy03 = byId.get("PHY-03")!;
    expect(phy03.current_state.baseline_since).toBeUndefined();
    expect(baselineStateFor(phy03, 2024)).toBe("implementing");
    expect(baselineStateFor(phy03, 2030)).toBe("implementing");
  });

  it("grows the starting posture over time rather than holding it flat", () => {
    // The whole point of dating them: 2024 is a weaker world than 2026.
    const count = (year: number) =>
      Object.values(baselineStates(blocks, year)).filter((s) => s !== "not_started").length;
    expect(count(2024)).toBeLessThan(count(2026));
    expect(count(2026)).toBeLessThanOrEqual(count(2030));
  });

  it("is stable once every dated control has arrived", () => {
    expect(baselineStates(blocks, 2026)).toEqual(baselineStates(blocks, 2030));
  });

  it("falls back to the full baseline when no year is given", () => {
    expect(baselineStates(blocks)).toEqual(baselineStates(blocks, 9999));
  });
});

describe("block data shape", () => {
  it("gives every real_world_parallel the object shape BlockDetail renders", () => {
    // BlockDetail reads p.description / p.source / p.year. A bare string passes
    // JSON validation, survives every engine test, and renders as an empty line
    // with a dangling "— ·" — visible only if you open that block in the UI.
    for (const b of blocks) {
      for (const [i, p] of (b.real_world_parallels ?? []).entries()) {
        const where = `${b.id} parallel[${i}]`;
        expect(typeof p, `${where} is a bare string`).toBe("object");
        expect(typeof (p as { description?: unknown }).description, where).toBe("string");
        expect(typeof (p as { source?: unknown }).source, where).toBe("string");
        expect(typeof (p as { year?: unknown }).year, where).toBe("number");
      }
    }
  });
});

describe("isAtOrBelowBaseline", () => {
  it("treats a block sitting at its baseline as already paid for", () => {
    // Sunk cost: a lab does not re-buy the controls it already runs, and
    // charging for them opens every session overdrawn.
    const net02 = byId.get("NET-02")!;
    expect(baselineStateFor(net02)).toBe("implementing");
    expect(isAtOrBelowBaseline(net02, "implementing")).toBe(true);
    expect(isAtOrBelowBaseline(net02, "not_started")).toBe(true);
  });

  it("charges for advancing past the baseline", () => {
    const net02 = byId.get("NET-02")!;
    expect(isAtOrBelowBaseline(net02, "deployed")).toBe(false);
    expect(isAtOrBelowBaseline(net02, "mature")).toBe(false);
  });

  it("charges from the first step for a block with no baseline", () => {
    const net01 = byId.get("NET-01")!;
    expect(baselineStateFor(net01)).toBe("not_started");
    expect(isAtOrBelowBaseline(net01, "investing")).toBe(false);
  });
});
