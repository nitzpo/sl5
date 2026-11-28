import { describe, it, expect } from "vitest";
import { resolveLayer } from "../../src/utils/ring-geometry";
import { NO_DEADLINE_MONTHS } from "../../src/utils/decision-windows";
import { LEGACY_BLOCK_IDS } from "../../src/engine/catalogue";
import { STAGES } from "../../src/engine/types";
import { loadBlocks, loadModel } from "../load-data";

const blocks = loadBlocks();
const model = loadModel();
const blockIds = new Set(blocks.map((b) => b.id));
const vectorById = new Map(model.vectors.map((v) => [v.id, v]));

describe("block data integrity", () => {
  it("has unique block ids", () => {
    expect(blockIds.size).toBe(blocks.length);
  });

  it("every dependency reference resolves to a real block", () => {
    for (const b of blocks) {
      for (const list of [
        b.dependencies?.requires ?? [],
        b.dependencies?.enhances ?? [],
        b.dependencies?.enabled_by ?? [],
      ]) {
        for (const id of list) {
          expect(blockIds.has(id), `${b.id} references unknown block ${id}`).toBe(true);
        }
      }
    }
  });

  // `completed_by` is a soft fractional discount rather than a gate, so a bad
  // entry doesn't crash anything — it silently prices a block wrong forever.
  // These are the checks that would have caught the plausible authoring slips.
  it("every `completed_by` companion is a real, other block", () => {
    for (const b of blocks) {
      const completed = b.dependencies?.completed_by;
      if (!completed) continue;
      expect(completed.blocks.length, `${b.id} completed_by is empty`).toBeGreaterThan(0);
      for (const id of completed.blocks) {
        expect(blockIds.has(id), `${b.id} completed_by references unknown ${id}`).toBe(true);
        // Self-reference would make the block permanently incomplete: a block is
        // never operational at the moment its own effectiveness is computed.
        expect(id, `${b.id} completed_by references itself`).not.toBe(b.id);
      }
      expect(
        new Set(completed.blocks).size,
        `${b.id} completed_by has duplicates, which would skew the fraction`
      ).toBe(completed.blocks.length);
    }
  });

  it("every `standalone_share` is a real fraction with a reason", () => {
    for (const b of blocks) {
      const completed = b.dependencies?.completed_by;
      if (!completed) continue;
      // Open interval: 0 would make an un-companioned block worthless (that's
      // `requires`, not this), 1 would make the annotation a no-op.
      expect(completed.standalone_share, `${b.id} standalone_share`).toBeGreaterThan(0);
      expect(completed.standalone_share, `${b.id} standalone_share`).toBeLessThan(1);
      // `why` is reader-facing copy in the block panel, not a placeholder.
      expect(completed.why.length, `${b.id} completed_by.why is too short`).toBeGreaterThan(20);
    }
  });

  it("hard `requires` chains are acyclic", () => {
    const visiting = new Set<string>();
    const done = new Set<string>();
    const byId = new Map(blocks.map((b) => [b.id, b]));
    function visit(id: string, trail: string[]) {
      if (done.has(id)) return;
      expect(visiting.has(id), `requires cycle: ${[...trail, id].join(" → ")}`).toBe(false);
      visiting.add(id);
      for (const req of byId.get(id)?.dependencies?.requires ?? []) {
        visit(req, [...trail, id]);
      }
      visiting.delete(id);
      done.add(id);
    }
    for (const b of blocks) visit(b.id, []);
  });

  it("every layer contribution resolves to a canonical layer", () => {
    for (const b of blocks) {
      for (const raw of b.defense_in_depth?.layer_contributions ?? []) {
        expect(resolveLayer(raw), `${b.id}: unresolvable layer "${raw}"`).not.toBeNull();
      }
    }
  });

  it("cost and deploy-time ranges are ordered and sane", () => {
    for (const b of blocks) {
      const cost = b.dimensions.cost.upfront_millions;
      expect(cost.min, `${b.id} cost.min`).toBeGreaterThanOrEqual(0);
      expect(cost.max, `${b.id} cost range inverted`).toBeGreaterThanOrEqual(cost.min);

      const t = b.dimensions.time_to_deploy_months;
      expect(t.min, `${b.id} deploy min`).toBeGreaterThan(0);
      // Either a real range, or the documented open-ended sentinel — but a
      // sentinel-sized minimum is always a data error.
      expect(t.max, `${b.id} deploy range inverted`).toBeGreaterThanOrEqual(t.min);
      expect(t.min, `${b.id} sentinel-sized deploy minimum`).toBeLessThan(NO_DEADLINE_MONTHS);
    }
  });

  it("ai_oc_shift stays within the modeled range", () => {
    for (const b of blocks) {
      const shift = b.adversary_exploitation.ai_oc_shift;
      expect(shift, `${b.id} ai_oc_shift`).toBeGreaterThanOrEqual(0);
      expect(shift, `${b.id} ai_oc_shift`).toBeLessThanOrEqual(3);
    }
  });
});

describe("vector backbone integrity", () => {
  it("has the 38 RAND vectors, 8 authored AI-insider vectors and 4 structural placeholders", () => {
    const by = (src: string) => model.vectors.filter((v) => v.source === src).length;
    expect([by("rand"), by("authored"), by("structural")]).toEqual([38, 8, 4]);
    expect(new Set(model.vectors.map((v) => v.id)).size).toBe(model.vectors.length);
  });

  it("RAND feasibility never falls with the OC tier, and authored scores never fall with the AC band", () => {
    for (const v of model.vectors) {
      const table = v.source === "rand" ? v.rand_feasibility : v.source === "authored" ? v.ai_feasibility : v.structural_p;
      const s = Object.values(table!);
      expect(s, `${v.id} feasibility not monotone`).toEqual([...s].sort((a, b) => a - b));
    }
  });

  it("authored and structural vectors are labelled as assumptions", () => {
    for (const v of model.vectors.filter((x) => x.source !== "rand")) {
      expect(v.assumption, `${v.id}`).toBe(true);
      expect((v.assumption_note ?? "").length, `${v.id} assumption_note`).toBeGreaterThan(40);
    }
  });

  it("every RAND vector carries an authored AI shift with a reason, within 0–1", () => {
    for (const v of model.vectors.filter((x) => x.source === "rand")) {
      expect(typeof v.ai_shift, `${v.id}`).toBe("number");
      expect(v.ai_shift!).toBeGreaterThanOrEqual(0);
      expect(v.ai_shift!).toBeLessThanOrEqual(1);
      expect((v.ai_shift_basis ?? "").length, `${v.id} ai_shift_basis`).toBeGreaterThan(20);
    }
  });

  it("every vector has at least one counter, or a flag saying why not", () => {
    const countered = new Set(blocks.flatMap((b) => b.counters.map((c) => c.vector_id)));
    for (const v of model.vectors) {
      const flagged = !!(v.needs_government || v.assumes_defense?.length || v.lane);
      expect(countered.has(v.id) || flagged, `${v.id} has no counter and no flag`).toBe(true);
    }
  });

  it("every approach names real vectors, and only the meters and the AI insider skip the entry stage", () => {
    for (const a of model.approaches) {
      for (const st of STAGES) {
        for (const id of a.stages[st]) expect(vectorById.has(id), `${a.id}: unknown ${id}`).toBe(true);
      }
      if (a.adversary === "human" && a.headline) expect(a.stages.entry.length, a.id).toBeGreaterThan(0);
    }
    const headline = model.approaches.filter((a) => a.headline).map((a) => a.id).sort();
    expect(headline).toEqual(["ai_insider", "insider", "physical", "remote", "served", "supply_chain"]);
  });

  it("the lab's own model is scored only on authored vectors, and human approaches only on RAND or structural ones", () => {
    for (const a of model.approaches) {
      for (const id of Object.values(a.stages).flat()) {
        const src = vectorById.get(id)!.source;
        if (a.adversary === "ai") expect(src, `${a.id}/${id}`).toBe("authored");
        else expect(src, `${a.id}/${id}`).not.toBe("authored");
      }
    }
  });
});

describe("counter data integrity", () => {
  it("every block counters at least one vector", () => {
    for (const b of blocks) expect(b.counters.length, `${b.id} counters nothing`).toBeGreaterThan(0);
  });

  it("every counter names a real vector, a strength, a reason, and a valid type override", () => {
    for (const b of blocks) {
      for (const c of b.counters) {
        expect(vectorById.has(c.vector_id), `${b.id} → ${c.vector_id}`).toBe(true);
        expect(["strong", "partial"]).toContain(c.strength);
        expect(c.why.length, `${b.id} → ${c.vector_id} why`).toBeGreaterThan(10);
        if (c.type_override) expect(["hard_stop", "probabilistic", "hybrid"]).toContain(c.type_override);
      }
      const ids = b.counters.map((c) => c.vector_id);
      expect(new Set(ids).size, `${b.id} lists a vector twice`).toBe(ids.length);
    }
  });

  it("a residual vector's assumed defenses never counter it", () => {
    for (const v of model.vectors.filter((x) => x.assumes_defense)) {
      for (const d of v.assumes_defense!) {
        expect(blockIds.has(d), `${v.id} assumes unknown ${d}`).toBe(true);
        const b = blocks.find((x) => x.id === d)!;
        expect(b.counters.some((c) => c.vector_id === v.id), `${d} counters its own residual ${v.id}`).toBe(false);
      }
    }
  });

  it("merged-away block ids are gone from the data, and their successors exist", () => {
    for (const [old, to] of Object.entries(LEGACY_BLOCK_IDS)) {
      expect(blockIds.has(old), `${old} still in the data`).toBe(false);
      for (const id of to) expect(blockIds.has(id), `${old} → ${id} missing`).toBe(true);
    }
  });

  it("future blocks are flagged, labelled, and never a prerequisite of today's catalogue", () => {
    const future = blocks.filter((b) => b.future);
    expect(future.length).toBeGreaterThanOrEqual(3);
    expect(future.length).toBeLessThanOrEqual(5);
    for (const b of future) {
      expect(b.id.startsWith("FUT-"), b.id).toBe(true);
      expect((b.future_note ?? "").length, `${b.id} future_note`).toBeGreaterThan(40);
    }
    const futureIds = new Set(future.map((b) => b.id));
    for (const b of blocks.filter((x) => !x.future)) {
      for (const r of b.dependencies.requires) expect(futureIds.has(r), `${b.id} requires future ${r}`).toBe(false);
    }
  });
});

describe("scenario data integrity", () => {
  it("every scenario names real vectors and a real approach", () => {
    const approaches = new Set(model.approaches.map((a) => a.id));
    for (const s of model.scenarios) {
      expect(approaches.has(s.approach), `${s.id}: approach ${s.approach}`).toBe(true);
      for (const v of s.vectors) expect(vectorById.has(v), `${s.id}: ${v}`).toBe(true);
      const stepVectors = new Set(s.steps.flatMap((st) => st.vector_ids));
      expect(new Set(s.vectors)).toEqual(stepVectors);
    }
  });

  it("every gap a step names, and every stopper, counters one of the scenario's vectors", () => {
    const counters = (id: string) => new Set(blocks.find((b) => b.id === id)?.counters.map((c) => c.vector_id) ?? []);
    for (const s of model.scenarios) {
      for (const st of s.steps) {
        if (!st.block_gap_used) continue;
        const c = counters(st.block_gap_used);
        expect(st.vector_ids.some((v) => c.has(v)), `${s.id}/${st.phase}: ${st.block_gap_used}`).toBe(true);
      }
      for (const d of s.stopper_details) {
        expect(blockIds.has(d.block_id), `${s.id}: unknown stopper ${d.block_id}`).toBe(true);
        const c = counters(d.block_id);
        expect(s.vectors.some((v) => c.has(v)), `${s.id}: ${d.block_id} counters none of its vectors`).toBe(true);
      }
    }
  });

  it("min_oc within 1-5 and ≤ typical_oc", () => {
    for (const s of model.scenarios) {
      expect(s.adversary_profile.min_oc).toBeGreaterThanOrEqual(1);
      expect(s.adversary_profile.min_oc).toBeLessThanOrEqual(5);
      expect(s.adversary_profile.typical_oc).toBeGreaterThanOrEqual(s.adversary_profile.min_oc);
    }
  });
});
