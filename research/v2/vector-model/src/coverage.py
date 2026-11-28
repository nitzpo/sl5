"""Assemble coverage.md from the built files and the probe results. Run after build.py and probe.py:
   python3 -I src/coverage.py <out_dir>
"""
import json
import os
import sys

OUT = sys.argv[1]
vectors = json.load(open(os.path.join(OUT, "vectors.json")))
cmap = json.load(open(os.path.join(OUT, "control_map.json")))
T = json.load(open(os.path.join(OUT, "_tables.json")))
PRB = json.load(open(os.path.join(OUT, "probe_results.json")))
PROP = json.load(open(os.path.join(OUT, "proposals.json")))
vec = {v["id"]: v for v in vectors}
NAMES = T["names"]

n_cur = sum(1 for b in T["sp"] for _ in [0])
cur_links = sum(T["sp"][b][0] + T["sp"][b][1] for b in T["sp"])
cur_strong = sum(T["sp"][b][0] for b in T["sp"])
prop_links = sum(1 for b in cmap for e in cmap[b] if e.get("proposal"))
closed = [g for g in T["gaps_47"] if g not in T["gaps_now"]]


def f3(x):
    return f"{x:.2f}"


# ---------- probe table ----------
rows = ["| Scenario | Served | OC1 | OC2 | OC3 | OC4 | OC5 | AI insider AC1–5 |", "|---|---|---|---|---|---|---|---|"]
for name, d in PRB["scenarios"].items():
    for key in ("served=True", "served=False"):
        c = d[key]["campaign_oc"]
        ai = " ".join(f3(x) for x in d[key]["ai_insider_ac"])
        rows.append(f"| {name} | {'yes' if key.endswith('True') else 'no'} | " + " | ".join(f3(x) for x in c) + f" | {ai} |")
TABLE_PROBE = "\n".join(rows)

sc = PRB["scenarios"]
undef = sc["undefended (SL1 victim)"]
pe = sc["full proposed catalogue, eroded"]
rows = ["| Route | OC1 | OC2 | OC3 | OC4 | OC5 | Binding path at OC4 | Binding path at OC5 |", "|---|---|---|---|---|---|---|---|"]
for rid, vals in pe["routes_served"].items():
    def path(d):
        return " → ".join(d.get(s, "") for s in ("entry", "reach", "exfil") if d.get(s))
    rows.append(f"| {rid} | " + " | ".join(f3(x) for x in vals) +
                f" | {path(pe['binding_tier4'][rid])} | {path(pe['binding_tier5'][rid])} |")
rows.append(f"| ai_insider (AC) | " + " | ".join(f3(x) for x in pe["served=True"]["ai_insider_ac"]) +
            " | | " + " → ".join(pe["ai_binding_ac5"].get(s, "") for s in ("reach", "exfil") if pe["ai_binding_ac5"].get(s)) + " |")
rows.append("| capability meter (V-ML-5) | " + " | ".join(f3(x) for x in pe["capability_meter"]) + " | V-ML-5 | V-ML-5 |")
TABLE_BIND = "\n".join(rows)

sens = PRB["sensitivity_score1"]
TABLE_SENS = "\n".join(["| A RAND '1' read as | OC1 served | OC2 served | OC1 not served | OC2 not served |",
                        "|---|---|---|---|---|"] +
                       [f"| {float(k):.2f} | " + " | ".join(f3(x) for x in v) + " |" for k, v in sens.items()])

# ---------- weak blocks ----------
WEAK = [
    (["AI-03"], "**Merge** into AI-07/AI-08 (P-MERGE-AI03). Its links are already held there."),
    (["AI-05"], "**Rescope** to AI containment exercises. Its configuration-drift role moves to CFG-01, and its honeypots move to DEC-01."),
    (["AI-06"], "**Reclassify** as a hybrid response control. It multiplies AI-10/AI-01 detections and counters nothing alone."),
    (["AI-08"], "**Keep partial.** Injection filters can be bypassed; AI-09 confinement now carries V-ML-3."),
    (["AI-12"], "**Keep partial.** Lineage proves where something came from, not that it is sound. Mostly an integrity-lane control."),
    (["DET-01", "DEC-01"], "**Keep partial.** They detect and attribute at every stage; a candidate for a cross-cutting multiplier (e2)."),
    (["HW-01", "PER-01"], "**Enablers.** Keep them as `requires` prerequisites."),
    (["HW-02", "HW-03", "HW-04", "HW-09"], "**Keep partial.** Each protects one place the weights live."),
    (["HW-06"], "**Keep partial**; effective type hybrid. Absorbs HW-10 (P-MERGE-HW10)."),
    (["HW-07"], "**Keep partial; reclassify** hybrid. It does nothing against physical interposers (TEE.fail)."),
    (["HW-10"], "**Merge** into HW-06 as an advanced tier."),
    (["NET-05"], "**Keep partial.** It is strong on V-NET-1 only alongside PHY-08 and DET-01."),
    (["PER-03"], "**Keep partial.** Absorbs PER-05 as departure-window monitoring (P-MERGE-PER05)."),
    (["PER-05"], "**Merge** into PER-03."),
    (["PER-07"], "**Merge** into PER-02 as its evidence mechanism."),
    (["PER-08"], "**Keep partial.** Removes remote-management and vendor paths; identity fallbacks sit with IAM-01."),
    (["PHY-03", "PHY-06"], "**Keep partial.** They make PHY-01's boundary real."),
    (["PHY-05"], "**Extend** to PHY-08, covering all unapproved devices and ports. That closes V-PHYS-2 and V-X-4."),
    (["PHY-07"], "**Keep.** It covers the hardware half of V-SUP-1."),
    (["SC-01", "SC-04"], "**Keep partial.**"),
    (["SC-02", "SC-05", "SC-06"], "**Merge** into SC-08 (hardware provenance). The SBOM part goes to SW-01."),
    (["SC-03"], "**Rescope** to inbound content screening, or move it to the integrity lane."),
]
covered = {b for ids, _ in WEAK for b in ids}
missing = [b for b in T["partial_only"] if b not in covered]
assert not missing, missing
rows = ["| Block | Links now (strong/partial) | Recommendation |", "|---|---|---|"]
for ids, rec in WEAK:
    label = "; ".join(f"{b} {NAMES[b]}" for b in ids)
    rows.append(f"| {label} | {', '.join('/'.join(map(str, T['sp'][b])) for b in ids)} | {rec} |")
TABLE_B = "\n".join(rows)

rows = ["| Proposal | Kind | Blocks | Why |", "|---|---|---|---|"]
for m in PROP["merges"]:
    rows.append(f"| {m['id']} | merge | {', '.join(m['absorb'])} → {', '.join(m['into'])} | {m['why']} |")
for r in PROP["reclassify"]:
    rows.append(f"| reclassify | {r['from']} → {r['to']} | {r['block']} | {r['why']} |")
for r in PROP["rescope"]:
    rows.append(f"| rescope | scope | {r['block']} | {r['why']} |")
TABLE_PROPS = "\n".join(rows)

TABLE_NONE = "\n".join([
    "| Block | Vector(s) | Why it is not a counter |", "|---|---|---|",
    "| HW-07 | V-PHYS-1, V-X-2 | Confidential computing defends against host software, not physical access (TEE.fail, 2025: a sub-$1,000 DDR5 interposer). |",
    "| HW-04, KEY-01, PHY-03, AI-07 | V-PHYS-5, V-PHYS-4, V-SELF-4 | These vectors are residual: RAND scored them assuming that defense already exists. |",
    "| HW-04 | V-SUP-1, V-ML-2 | Chip tamper protection detects attack after manufacture, not an implant added at the fab. |",
    "| NET-04, AI-11 | V-SELF-8, V-ML-5 | Distillation needs gigabytes, not terabytes, and no access to the weights. |",
    "| NET-01 | V-ML-4, V-ML-5 | Whether to serve the model is a deployment choice; RAND exempts production serving from isolation. |",
])

CHEAP_REC = {
    "V-BYP-1": "CFG-01 (configuration integrity / gold image) becomes strong.",
    "V-ML-1": "SRV-01 (hardened weight-access and serving interface) becomes strong.",
    "V-PHYS-2": "PHY-08 (PHY-05 extended to all devices and ports) becomes strong.",
    "V-X-4": "PHY-08 becomes strong.",
    "V-SUP-1": "Still open with the proposals. SC-08 + PHY-07 + SW-01 + DET-01 are all partial; the reviewer agrees it stays partial at OC4–5 (SolarWinds, Okta). Candidate: broaden SW-01 to all software admitted to the isolated network (SLSA L3).",
    "V-HUM-1": "Open by design. Recruitment cannot be prevented structurally, only detected (PER-03, PER-04). The insider route is held at the reach stage by PER-06 on V-X-1.",
    "V-SELF-7": "Still open. Extend PER-06 so that a security change an AI requested needs two humans who did not receive the request, with AI-10 logging every AI-to-staff request.",
}
rows = ["| Vector | Stage | OC1–3 (AC1–3) | Partial counters now | With proposals |", "|---|---|---|---|---|"]
for vid in T["cheap_now"]:
    v = vec[vid]
    if v["source"] == "rand":
        scs = " ".join(str(v["rand_feasibility"][f"oc{i}"]) for i in (1, 2, 3))
    elif v["source"] == "authored":
        scs = "AC " + " ".join(str(v["ai_feasibility"][f"ac{i}"]) for i in (1, 2, 3))
    else:
        scs = "p = 1.0"
    parts = [b for b in cmap if any(e["vector_id"] == vid and not e.get("proposal") and e["strength"] == "partial"
                                     for e in cmap[b])]
    rows.append(f"| {vid} {v['name']} | {v['stage']} | {scs} | {', '.join(sorted(parts))} | {CHEAP_REC[vid]} |")
TABLE_D = "\n".join(rows)

REVIEW = "\n".join([
    "| Reviewer verdict | What I did | Why |", "|---|---|---|",
    "| PER-06 → V-HUM-1/2/3: keep strong | **Modified.** Moved to V-X-1 (the insider's standing access, reach stage). PER-02's HUM partials and PER-06's V-CRED-1/3 partials were moved the same way. | Dual authorisation limits what an insider can do, not whether one is recruited. Keeping it on both stages would count it twice on the insider route. |",
    "| NET-01 → V-CODE-*: keep + floor at V-NET-1 | **Implemented through structure.** No floor on the vector is needed. | V-NET-1 sits in the same entry and exfil lists, so with NET-01 deployed the stage can never fall below it. |",
    "| Top-k route breadth | **Not applied.** | User rule: every attacker tries every route it can afford. |",
    "| (my change) V-HUM-5 complete on its own | **Reverted to a staged entry.** | Treated as complete, it dominated OC3–OC5 (0.74 at OC5) and ignored RAND SL5's irrecoverable-key policy, which exists for exactly this case. |",
])

md = f"""# SL5 vector backbone: coverage review (revision 2)

This revision applies the independent review and adds stages and routes. It is for review before any engine work.

**Contents.**
- 50 vectors: the 38 in RAND Table 5.2, 8 authored vectors for the lab's own model as an insider, and 4 *structural* stage vectors.
- 57 current blocks with {cur_links} links, {cur_strong} of them strong.
- 7 proposed block ids, whose {prop_links} links are tagged `proposal`.
- Routes are in routes.json and proposals in proposals.json.

**How to read it.**
- A RAND score is the chance that one operation completes *this step* against an SL1-grade company (Box 5.1). 1 = up to 20%, 2 = 20–40%, 3 = 40–60%, 4 = 60–80%, 5 = over 80%.
- Every vector has a `stage`:
  - entry: getting a foothold.
  - reach: getting to the weights or their keys.
  - exfil: getting the weights out.
- A few vectors skip stages (`stages_skipped`). Seizure carries the hardware out. Model extraction and distillation work through the API. Unsanctioned workloads (V-SELF-6) need nothing to leave.
- V-X-1…4 stand for "nothing stops this stage" at an SL1 victim (p = 1.0), so stage controls have something to act on. They are not RAND vectors.
- A *residual* vector (`assumes_defense`) was scored by RAND as if the defense it defeats already exists. It only becomes a candidate once that defense is deployed, and that defense never counters it.
- **GAP** means no strong counter. A gap is **cheap** when the vector scores 3 or more at OC1–OC3.

## What changed

- **Links.** All A1–A16 corrections are applied, including the reviewer's other verdicts; the table at the end lists where I departed from them. The full audit trail is in `src/map_rev2.py` ({len(T['changelog'])} entries).
- **V-SELF-1 split.** It now covers weights only; self-distilled data is the new V-SELF-8. NET-04 and AI-11 are strong only on V-SELF-1.
- **Residual consistency.** Removed HW-04/KEY-01 → V-PHYS-5, PHY-03 → V-PHYS-4, and AI-07 → V-SELF-4 (V-SELF-4 is now residual on NET-04/AI-07). PHY-04 is off V-PHYS-4's assumed defenses.
- **Stage consistency.** NET-04's egress effect moved to V-X-3. PER-06 and PER-02 moved to V-X-1.
- **AI scores.** V-SELF-6 is now 2 3 4 5 5 and V-SELF-7 is 2 2 3 4 5. V-SELF-1 was re-judged to 1 2 4 5 5: from AC3 on, unmetered research egress is little obstacle. V-SELF-5 keeps its ramp, because sabotage skill and a model of what reviewers miss grow together. The Novel Recommendations lines L198, L440–447, L878–881, L1951–1952 and L2088–2093 are now cited.
- **Transcription.** The reviewer checked the PDF and confirmed nine vectors at 1/1/1; RAND's "eight" is a slip in its prose. The note is updated.

## Calibration probe (`src/probe.py`)

**Rule.**
- Scores map to 1 → 0.05, 2 → 0.3, 3 → 0.5, 4 → 0.7, 5 → 0.9.
- A route takes the best vector at each stage it needs, and route success is the product over stages.
- A campaign is the union over every headline route, with no breadth limit.
- Stacking (the reviewer's rule): the best strong counter ×0.3. The remaining counters, extra strong ones first, ×0.8, then ×0.9, then ×0.95. Partials alone are never worth more than one strong counter.
- "Eroded" applies the README bands to each counter: hard stops keep 0.98 → 0.86 of their effect from OC1 to OC5, probabilistic controls 0.95 → 0.40, hybrids halfway.
- "Full catalogue" means every block deployed and mature.

{TABLE_PROBE}

1. **Staging fixes the main error.** An undefended lab now loses to OC1 in {f3(undef['served=True']['campaign_oc'][0])} of cases with the model served (the app's default) and {f3(undef['served=False']['campaign_oc'][0])} without serving. The reviewer's probe gave 0.96. OC2 succeeds {f3(undef['served=False']['campaign_oc'][1])}–{f3(undef['served=True']['campaign_oc'][1])}, so SL1 rightly fails against OC2.
2. **OC1 is still above the 1-in-5 bar.** The remote route alone gives 0.15. The rest comes from the 0.05 floors on routes OC1 can barely run: insider, physical and served. That fits RAND's "SL1 *likely* thwarts OC1" only if "likely" allows up to about 45% success (ICD 203). Reading a RAND 1 as 0.02 brings OC1 without serving to 0.19 (table below). This is a calibration decision for the user.
3. **Union with no breadth limit is demanding at the top.** For five routes to stay under 20% together, each must be held to about 4%. Even with every vector strongly countered once, OC5 is {f3(sc['every vector strongly countered (x0.3)']['served=True']['campaign_oc'][4])} with serving.
4. **The full catalogue at maturity, eroded, reaches SL2 today and SL3 with the proposals.** With the proposals, OC3 is {f3(pe['served=True']['campaign_oc'][2])} and OC4 is {f3(pe['served=True']['campaign_oc'][3])}. Without erosion, the proposals reach SL4, served or not. Nothing reaches SL5, which agrees with RAND ("currently not possible").
5. **The AI-insider route fails from AC3 (eroded) or AC5 (no erosion) even with every block.** Eroded, it reaches {f3(pe['served=True']['ai_insider_ac'][2])} at AC3 and {f3(pe['served=True']['ai_insider_ac'][4])} at AC5, held up by operator manipulation (V-SELF-7) followed by self-distilled data (V-SELF-8). Both are gaps.

{TABLE_SENS}

**What binds once everything is deployed** (proposed catalogue, eroded, model served):

{TABLE_BIND}

## Routes

{T['routes']}

## (a) Vector table

`*` marks RAND's "could change very rapidly". `(+X)` is a strong counter that exists only under a proposal.

{T['a']}

## (b) Weak blocks, proposals, defense types

{len(T['partial_only'])} of the 57 current blocks have only partial links.

{TABLE_B}

**Proposed blocks** (new ids in control_map.json, every link tagged `proposal`):

{T['proposed_blocks']}

{TABLE_PROPS}

**Defense type wrong for the vector** (`type_override` in control_map.json):

{T['types']}

**Explicit non-counters:**

{TABLE_NONE}

## (c) Choke points (current catalogue)

{T['c']}

- **NET-01 carries the code category and bulk egress.** Behind it, V-NET-1 is the residual route, and V-NET-1 now has only partial counters (NET-05, PHY-05/PHY-08, DET-01). It binds the remote and supply-chain routes at OC5.
- **IAM-01 holds all five identity vectors alone**, so one identity-platform flaw reopens the whole category. PER-06 at the reach stage is the backstop.
- **KEY-01 is the broadest block** ({sum(T['sp']['KEY-01'])} links). It is strong where an attacker holds hardware or a stray copy (V-X-2, V-BYP-2).

## (d) Cheap gaps (score ≥3 at OC1–OC3, no strong counter)

{TABLE_D}

**Gaps that bind SL5** (score ≥4 at OC5 or AC5, no strong counter):
- Now: {', '.join(T['blockers_now'])}.
- With the proposals: {', '.join(T['blockers_prop'])}.

The 47-block catalogue lacked a strong counter for {len(T['gaps_47'])} vectors. Phase 2 closes {len(closed)} of them: {', '.join(closed)}.

## (e) Assumptions and open questions

1. **Bar and the reading of a RAND 1.** OC1 against an undefended lab is 0.24–0.31. Options: keep the 1-in-5 bar and read a RAND 1 as about 0.02; or keep 0.05 and judge SL1 at RAND's "likely" (≤45%).
2. **Stacking and erosion constants** decide SL3 versus SL4 for the full catalogue. Should DET-01 and DEC-01 act as stage-wide multipliers instead of per-vector partials?
3. **Is model extraction (V-ML-4) a whole route?** RAND scores steps that *contribute*, and its examples recover only part of the weights. As a complete route, V-ML-4 binds the served route at OC4–OC5.
4. **Structural p = 1.0.** RAND's SL1 already includes best-effort weight encryption. Should V-X-2 start below 1?
5. **Baseline.** Blocks at their researched starting state should earn credit only above an SL1 foundation.
6. **Needs government.** Should V-PHYS-7 and V-HUM-5 carry a badge, which an explicit state-partnership assumption could lift?
7. **AI bands.** AC1–AC5 are authored. They are suggested to map onto `ai_capability_curve` as <0.2 / 0.2–0.45 / 0.45–0.7 / 0.7–0.9 / ≥0.9 (2026 ≈ AC2). Propensity to try needs its own input. Should SL5 hold against the year's band, or against a stress band one above it?
8. **Cross-route compounds**, e.g. an external prompt injection (V-ML-3) that steers the lab's own model. The union misses these; the stories are where to show them.
9. **Integrity lane.** AI-12, SC-03 and V-SELF-5 are mostly about sabotage. Should they get a separate view?

## Story check

{T['stories']}

## Reviewer verdicts not applied as written

{REVIEW}

## Transcription confidence

Confidence is high. A re-extraction from the text and the reviewer's check against the PDF both match all 38 rows: names, scores and asterisks. The social engineering / password pairing is confirmed by the PDF layout. Nine vectors score 1 at OC1–OC3 and more than 1 above, and RAND's "eight" is its own slip. The authored and structural scores are assumptions (`assumption: true`).
"""

open(os.path.join(OUT, "coverage.md"), "w").write(md)
words = sum(len(line.split()) for line in md.splitlines() if not line.lstrip().startswith("|"))
print("coverage.md narrative words:", words)
os.remove(os.path.join(OUT, "_tables.json"))
