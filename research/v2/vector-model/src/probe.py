"""Calibration probe for the staged route model.

    python3 -I probe.py <out_dir> [--json results.json]

Scores -> bin midpoints: 1->0.05, 2->0.3, 3->0.5, 4->0.7, 5->0.9 (structural stage vectors: 1.0).
Route success  = best path: product over the route's stages of the best available vector per stage,
                 skipping stages a chosen vector makes unnecessary.
Campaign       = 1 - prod(1 - route) over every headline human route (no breadth limit).
AI insider     = its own route, scored per AC band; SL5 must hold it separately.
Counter stacking (reviewer's rule): the best strong counter multiplies by 0.3; the remaining counters,
                 strongest first (extra strongs count as partials), multiply by 0.8, 0.9, 0.95; further
                 counters add nothing; partials alone can never beat one strong counter (floor 0.3).
Erosion (optional): each counter keeps only part of its effect against stronger adversaries, using the
                 README's bands: hard stop 0.98->0.86, probabilistic 0.95->0.40 across tiers 1->5,
                 hybrid halfway. m_eff = 1 - (1 - m) * retention.
Residual vectors (assumes_defense) are candidates only once one of the defenses they assume is deployed.
"""
import json
import os
import sys

OUT = sys.argv[1]
V = {v["id"]: v for v in json.load(open(os.path.join(OUT, "vectors.json")))}
M = json.load(open(os.path.join(OUT, "control_map.json")))
R = json.load(open(os.path.join(OUT, "routes.json")))
PR = json.load(open(os.path.join(OUT, "proposals.json")))
CUR_BLOCKS = set(json.load(open(os.path.join(OUT, "catalogues.json")))["current"])
PROP_BLOCKS = set(json.load(open(os.path.join(OUT, "catalogues.json")))["proposed"])
DECLARED = json.load(open(os.path.join(OUT, "catalogues.json")))["declared_types"]

MID = {1: 0.05, 2: 0.3, 3: 0.5, 4: 0.7, 5: 0.9}
STRONG, LADDER, FLOOR = 0.3, (0.8, 0.9, 0.95), 0.3
RET = {
    "hard_stop": [0.98, 0.95, 0.92, 0.89, 0.86],
    "probabilistic": [0.95, 0.81, 0.68, 0.54, 0.40],
}
RET["hybrid"] = [(a + b) / 2 for a, b in zip(RET["hard_stop"], RET["probabilistic"])]


def base_p(vid, tier):
    v = V[vid]
    if v["source"] == "rand":
        return MID[v["rand_feasibility"][f"oc{tier}"]]
    if v["source"] == "authored":
        return MID[v["ai_feasibility"][f"ac{tier}"]]
    return v["structural_p"][f"oc{tier}"]


def counters_for(blocks, proposed):
    """vector -> list of (strength, effective_type) from the deployed block set."""
    types = dict(DECLARED)
    if proposed:
        for r in PR["reclassify"]:
            types[r["block"]] = r["to"]
        for nb in PR["new_blocks"]:
            types[nb["id"]] = nb["defense_type"]
        types.setdefault("SC-08", "probabilistic")
        types.setdefault("PHY-08", "hybrid")
    out = {}
    for bid in blocks:
        for e in M.get(bid, []):
            if e.get("proposal") and not proposed:
                continue
            t = e.get("type_override") or types[bid]
            out.setdefault(e["vector_id"], []).append((e["strength"], t))
    return out


def multiplier(cs, tier, erode):
    def eff(m, t):
        return 1 - (1 - m) * (RET[t][tier - 1] if erode else 1.0)
    strongs = sorted((eff(STRONG, t), t) for s, t in cs if s == "strong")
    rest = [t for s, t in cs if s == "partial"]
    mult = 1.0
    others = []
    if strongs:
        mult *= strongs[0][0]
        others = [t for _, t in strongs[1:]]
    # remaining counters strongest-first: extra strongs, then partials ordered by retention (most durable first)
    others += sorted(rest, key=lambda t: -(RET[t][tier - 1] if erode else 1.0))
    for rung, t in zip(LADDER, others):
        mult *= eff(rung, t)
    if not strongs:
        mult = max(mult, eff(FLOOR, "hard_stop") if erode else FLOOR)
    return mult


def probs(tier, blocks, proposed, erode, uniform=None):
    deployed = set(blocks)
    cs = counters_for(blocks, proposed) if uniform is None else {}
    p = {}
    for vid, v in V.items():
        assumed = v.get("assumes_defense")
        if assumed:
            active = (uniform is not None) or any(b in deployed for b in assumed)
            if not active:
                continue
        x = base_p(vid, tier)
        if uniform is not None:
            x *= uniform
        else:
            x *= multiplier(cs.get(vid, []), tier, erode)
        p[vid] = x
    return p


def route_success(route, p):
    stages = [s for s in ("entry", "reach", "exfil") if route["stages"].get(s)]
    best, arg = {}, {}
    for s in stages:
        cands = [(p[v], v) for v in route["stages"][s] if v in p]
        best[s], arg[s] = max(cands) if cands else (0.0, None)
    paths = []
    for s in stages:
        for v in route["stages"][s]:
            if v not in p:
                continue
            val, used = p[v], {s: v}
            for t in stages:
                if t == s or t in V[v]["stages_skipped"]:
                    continue
                val *= best[t]
                used[t] = arg[t]
            paths.append((val, used))
    return max(paths, key=lambda x: x[0]) if paths else (0.0, {})


def campaign(tier, blocks=(), proposed=False, erode=False, uniform=None, served=True):
    p = probs(tier, blocks, proposed, erode, uniform)
    per = {}
    miss = 1.0
    for r in R:
        if r["adversary"] != "human" or not r["headline"]:
            continue
        if r.get("requires_external_serving") and not served:
            continue
        val, used = route_success(r, p)
        per[r["id"]] = (val, used)
        miss *= 1 - val
    return 1 - miss, per


def ai_route(band, blocks=(), proposed=False, erode=False, uniform=None):
    p = probs(band, blocks, proposed, erode, uniform)
    r = next(x for x in R if x["id"] == "ai_insider")
    return route_success(r, p)


def capability(tier, blocks=(), proposed=False, erode=False, uniform=None):
    p = probs(tier, blocks, proposed, erode, uniform)
    r = next(x for x in R if x["id"] == "capability_copy")
    return route_success(r, p)[0]


SCEN = [
    ("undefended (SL1 victim)", dict()),
    ("every vector strongly countered (x0.3)", dict(uniform=STRONG)),
    ("full current catalogue (57), no erosion", dict(blocks=sorted(CUR_BLOCKS))),
    ("full current catalogue (57), eroded", dict(blocks=sorted(CUR_BLOCKS), erode=True)),
    ("full proposed catalogue, no erosion", dict(blocks=sorted(PROP_BLOCKS), proposed=True)),
    ("full proposed catalogue, eroded", dict(blocks=sorted(PROP_BLOCKS), proposed=True, erode=True)),
]


def fmt(xs):
    return "  ".join(f"{x:5.3f}" for x in xs)


def main():
    res = {"rule": __doc__.strip(), "scenarios": {}}
    print("Staged route probe. Columns: tier 1..5 (OC for human routes, AC for the AI insider).")
    print("Bar: 'SL-n thwarts OC-n' if success < 0.20 (the user's ~1-in-5 bar).\n")
    for served in (True, False):
        print(f"=== model served externally: {served} ===")
        for name, kw in SCEN:
            camp = [campaign(t, served=served, **kw)[0] for t in range(1, 6)]
            ai = [ai_route(t, **{k: v for k, v in kw.items()})[0] for t in range(1, 6)]
            res["scenarios"].setdefault(name, {})[f"served={served}"] = {"campaign_oc": camp, "ai_insider_ac": ai}
            print(f"{name:44} campaign OC1-5: {fmt(camp)}   AI-insider AC1-5: {fmt(ai)}")
        print()
    # route breakdown
    for name, kw in (SCEN[0], SCEN[3], SCEN[5]):
        print(f"--- per-route success, served=True: {name} ---")
        rows = {}
        for t in range(1, 6):
            _, per = campaign(t, served=True, **kw)
            for rid, (val, used) in per.items():
                rows.setdefault(rid, []).append((val, used))
        for rid, vals in rows.items():
            print(f"  {rid:13} {fmt([v for v, _ in vals])}   binding OC4: {vals[3][1]}  OC5: {vals[4][1]}")
        a5 = ai_route(5, **kw)
        print(f"  {'ai_insider':13} AC5 {a5[0]:.3f}   binding path: {a5[1]}")
        cap = [capability(t, **kw) for t in range(1, 6)]
        print(f"  {'capability':13} {fmt(cap)}   (V-ML-5 meter, not in headline)")
        res["scenarios"][name]["routes_served"] = {k: [v for v, _ in vs] for k, vs in rows.items()}
        res["scenarios"][name]["binding_tier4"] = {k: vs[3][1] for k, vs in rows.items()}
        res["scenarios"][name]["binding_tier5"] = {k: vs[4][1] for k, vs in rows.items()}
        res["scenarios"][name]["ai_binding_ac5"] = a5[1]
        res["scenarios"][name]["capability_meter"] = cap
        print()
    # sensitivity of OC1 to the score-1 midpoint
    print("--- sensitivity: undefended OC1/OC2 campaign vs the value read for a RAND '1' ---")
    sens = {}
    for one in (0.10, 0.05, 0.02, 0.0):
        MID[1] = one
        a = [round(campaign(t, served=s)[0], 3) for s in (True, False) for t in (1, 2)]
        sens[one] = a
        print(f"  score 1 -> {one:.2f}: served OC1 {a[0]:.3f} OC2 {a[1]:.3f} | not served OC1 {a[2]:.3f} OC2 {a[3]:.3f}")
    MID[1] = 0.05
    res["sensitivity_score1"] = sens
    if len(sys.argv) > 3 and sys.argv[2] == "--json":
        json.dump(res, open(sys.argv[3], "w"), indent=1)


if __name__ == "__main__":
    main()
