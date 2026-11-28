"""Build vectors.json, control_map.json, routes.json, proposals.json, catalogues.json, stories.json; validate.

Run:  python3 -I src/build.py <repo_root> <out_dir>
"""
import copy
import json
import os
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vectors_data import build_vectors, CATEGORIES  # noqa: E402
from map_data import NEW_BLOCKS  # noqa: E402
from map_rev2 import MAP, CHANGELOG  # noqa: E402
from routes_data import ROUTES  # noqa: E402
from proposals_data import PROPOSALS  # noqa: E402
from stories_data import STORIES  # noqa: E402

REPO, OUT = sys.argv[1], sys.argv[2]
DATA = os.path.join(REPO, "app/public/data")
errors = []

# ---------- blocks ----------
blocks = {}
for fn in sorted(os.listdir(DATA)):
    if fn.startswith("blocks-") and fn.endswith(".json"):
        for b in json.load(open(os.path.join(DATA, fn))):
            blocks[b["id"]] = {"name": b["name"], "type": b["defense_type"], "kind": "existing"}
assert len(blocks) == 47, len(blocks)
for bid, (name, typ, _c) in NEW_BLOCKS.items():
    blocks[bid] = {"name": name, "type": typ, "kind": "phase2"}
current = sorted(blocks)
assert len(current) == 57
for nb in PROPOSALS["new_blocks"]:
    blocks[nb["id"]] = {"name": nb["name"], "type": nb["defense_type"], "kind": "proposal"}
for mg in PROPOSALS["merges"]:
    if mg.get("new_id"):
        blocks[mg["new_id"]] = {"name": mg["name"], "type": "probabilistic" if mg["new_id"] == "SC-08" else "hybrid",
                                "kind": "proposal"}
absorbed = {b for mg in PROPOSALS["merges"] for b in mg["absorb"]}
proposed = sorted((set(current) - absorbed) | {b for b, x in blocks.items() if x["kind"] == "proposal"})
proposal_ids = {mg["id"] for mg in PROPOSALS["merges"]} | {nb["proposal"] for nb in PROPOSALS["new_blocks"]}

chains = {c["id"]: c for c in json.load(open(os.path.join(DATA, "attack-chains.json")))}
vectors = build_vectors()
vec = {v["id"]: v for v in vectors}
assert len(vec) == len(vectors)

# ---------- validate vectors ----------
for v in vectors:
    n = len(v["description"].split())
    if n > 25:
        errors.append(f"{v['id']} description {n} words")
    if v["stage"] not in ("entry", "reach", "exfil"):
        errors.append(f"{v['id']} bad stage")
    if v["source"] == "rand":
        s = [v["rand_feasibility"][f"oc{i}"] for i in range(1, 6)]
        if s != sorted(s):
            errors.append(f"{v['id']} scores not monotonic {s}")
    if v["source"] == "authored":
        s = [v["ai_feasibility"][f"ac{i}"] for i in range(1, 6)]
        if s != sorted(s):
            errors.append(f"{v['id']} AC scores not monotonic {s}")
        if len(v["ai_rationale"].split()) > 25:
            errors.append(f"{v['id']} rationale long")
    for b in v.get("assumes_defense", []):
        if b not in blocks:
            errors.append(f"{v['id']} assumes unknown block {b}")
assert sum(1 for v in vectors if v["source"] == "rand") == 38

# ---------- control map ----------
control_map = {}
pairs = set()


def bkey(b):
    a, n = b.rsplit("-", 1)
    return (a, int(n))


for bid in sorted(MAP, key=bkey):
    if bid not in blocks:
        errors.append(f"MAP has unknown block {bid}")
        continue
    ents = []
    for e in MAP[bid]:
        if e["vector_id"] not in vec:
            errors.append(f"{bid}: unknown vector {e['vector_id']}")
        if e["strength"] not in ("strong", "partial"):
            errors.append(f"{bid}: bad strength")
        if len(e["why"].split()) > 15:
            errors.append(f"{bid}/{e['vector_id']}: why {len(e['why'].split())} words")
        if (bid, e["vector_id"]) in pairs:
            errors.append(f"duplicate {bid}/{e['vector_id']}")
        pairs.add((bid, e["vector_id"]))
        if e.get("proposal") and e["proposal"] not in proposal_ids:
            errors.append(f"{bid}: unknown proposal {e['proposal']}")
        if blocks[bid]["kind"] == "proposal" and not e.get("proposal"):
            errors.append(f"{bid}: proposed block link without proposal tag")
        # residual vectors may not be countered by the defense they assume
        if bid in vec[e["vector_id"]].get("assumes_defense", []):
            errors.append(f"{bid}->{e['vector_id']} contradicts assumes_defense")
        ents.append(copy.deepcopy(e))
    if not [x for x in ents if not x.get("proposal")] and blocks[bid]["kind"] != "proposal":
        errors.append(f"block {bid} has no current link")
    control_map[bid] = ents
for b in set(current) | set(proposed):
    if b not in control_map:
        errors.append(f"block {b} missing from control map")


def counters(catalogue, include_proposals):
    st, pa = defaultdict(list), defaultdict(list)
    cat = set(catalogue)
    for bid, ents in control_map.items():
        if bid not in cat:
            continue
        for e in ents:
            if e.get("proposal") and not include_proposals:
                continue
            (st if e["strength"] == "strong" else pa)[e["vector_id"]].append(bid)
    return st, pa


ST, PA = counters(current, False)
STP, PAP = counters(proposed, True)
ST47, PA47 = counters([b for b in current if blocks[b]["kind"] == "existing"], False)


def low_tier_max(v):
    if v["source"] == "rand":
        return max(v["rand_feasibility"][k] for k in ("oc1", "oc2", "oc3"))
    if v["source"] == "authored":
        return max(v["ai_feasibility"][k] for k in ("ac1", "ac2", "ac3"))
    return 5  # structural: certain at SL1


def top(v):
    if v["source"] == "rand":
        return v["rand_feasibility"]["oc5"]
    if v["source"] == "authored":
        return v["ai_feasibility"]["ac5"]
    return 5


def flag(v, st, pa):
    vid = v["id"]
    if st[vid]:
        return ""
    if v.get("assumes_defense"):
        return "GAP (residual)"
    if not pa[vid]:
        return "GAP (no counter)"
    return "GAP (cheap)" if low_tier_max(v) >= 3 else "GAP"


for v in vectors:
    v.pop("coverage_flag", None)
    v.pop("coverage_flag_proposed", None)
    f = flag(v, ST, PA)
    fp = flag(v, STP, PAP)
    if f:
        v["coverage_flag"] = f
    if fp != f:
        v["coverage_flag_proposed"] = fp or "covered"
    if not ST[v["id"]] and not PA[v["id"]] and not f:
        errors.append(f"{v['id']} has no counter and no flag")

# ---------- routes ----------
route_vecs = set()
for r in ROUTES:
    for s, lst in r["stages"].items():
        for x in lst:
            if x not in vec:
                errors.append(f"route {r['id']}: unknown vector {x}")
            route_vecs.add(x)
for v in vectors:
    if v["id"] not in route_vecs:
        errors.append(f"vector {v['id']} sits on no route")

# ---------- stories ----------
ROUTE_OF = {"quiet-tap": "physical", "poisoned-chip": "supply_chain", "alignment-researcher": "ai_insider",
            "zero-day-cascade": "remote", "long-game": "insider", "remote-ghost": "remote",
            "patient-distillation": "capability_copy"}
stories = []
for s in STORIES:
    c = chains[s["id"]]
    ordered = []
    for _, vs in s["steps"]:
        for x in vs:
            if x not in vec:
                errors.append(f"story {s['id']}: unknown {x}")
            if x not in ordered:
                ordered.append(x)
    check = {}
    for stopper in c["stoppers"]:
        hits = [(e["vector_id"], e["strength"]) for e in control_map[stopper]
                if e["vector_id"] in ordered and not e.get("proposal")]
        strong = [v for v, st in hits if st == "strong"]
        part = [v for v, st in hits if st == "partial"]
        if strong:
            check[stopper] = "strong on " + ", ".join(strong) + ("; partial on " + ", ".join(part) if part else "")
        elif part:
            check[stopper] = "partial on " + ", ".join(part)
        else:
            check[stopper] = "none: counters no vector in this story"
    stories.append({"id": s["id"], "name": c["name"], "route": ROUTE_OF[s["id"]], "vectors": ordered,
                    "steps": [{"phase": ph, "vector_ids": vs} for ph, vs in s["steps"]],
                    "fit_note": s["fit_note"], "stopper_check": check})

# ---------- write ----------
catalogues = {"current": current, "proposed": proposed, "absorbed_by_proposals": sorted(absorbed),
              "declared_types": {b: blocks[b]["type"] for b in blocks},
              "kinds": {b: blocks[b]["kind"] for b in blocks}}
os.makedirs(OUT, exist_ok=True)
for name, obj in (("vectors.json", vectors), ("control_map.json", control_map), ("routes.json", ROUTES),
                  ("proposals.json", PROPOSALS), ("catalogues.json", catalogues), ("stories.json", stories)):
    p = os.path.join(OUT, name)
    with open(p, "w") as fh:
        json.dump(obj, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    json.load(open(p))

# ---------- tables ----------
CATNAME = {c[0]: c[1] for c in CATEGORIES}
CATNAME["structural"] = "Structural stage"


def fmt_scores(v):
    if v["source"] == "rand":
        return " ".join(str(v["rand_feasibility"][f"oc{i}"]) for i in range(1, 6))
    if v["source"] == "authored":
        return "AC " + " ".join(str(v["ai_feasibility"][f"ac{i}"]) for i in range(1, 6))
    return "p = 1.0"


def short(name, n=58):
    return name if len(name) <= n else name[: n - 1].rstrip() + "…"


T = {}
rows = ["| Category | ID | Vector | Stage | OC1–5 | Strong | Partial | Flag (now → with proposals) |",
        "|---|---|---|---|---|---|---|---|"]
for v in vectors:
    star = "*" if v.get("rapidly_changing") else ""
    stg = v["stage"] + (" (skips " + "+".join(v["stages_skipped"]) + ")" if v["stages_skipped"] else "")
    if v.get("assumes_defense"):
        stg += ", residual"
    if not v["headline"]:
        stg += ", own meter"
    newst = [b for b in STP[v["id"]] if b not in ST[v["id"]]]
    strong_txt = ", ".join(ST[v["id"]]) or "—"
    if newst:
        strong_txt += " (+" + ", ".join(newst) + ")"
    f = v.get("coverage_flag", "")
    if "coverage_flag_proposed" in v:
        f = f"{f or 'ok'} → {v['coverage_flag_proposed']}"
    rows.append(f"| {CATNAME[v['category']]} | {v['id']} | {short(v['name'])}{star} | {stg} | {fmt_scores(v)} | "
                f"{strong_txt} | {', '.join(PA[v['id']]) or '—'} | {f} |")
T["a"] = "\n".join(rows)

bstats = {}
for bid in current:
    ents = [e for e in control_map[bid] if not e.get("proposal")]
    bstats[bid] = ([e["vector_id"] for e in ents if e["strength"] == "strong"],
                   [e["vector_id"] for e in ents if e["strength"] == "partial"])
choke = sorted(bstats.items(), key=lambda kv: (-len(kv[1][0]), -len(kv[1][1]), kv[0]))
rows = ["| Block | Type | Strong | Strongly countered vectors | Partial |", "|---|---|---|---|---|"]
for bid, (s, p) in choke:
    if len(s) < 2:
        continue
    rows.append(f"| {bid} {blocks[bid]['name']}{' (Phase 2)' if blocks[bid]['kind'] == 'phase2' else ''} | "
                f"{blocks[bid]['type']} | {len(s)} | {', '.join(s)} | {len(p)} |")
T["c"] = "\n".join(rows)
T["partial_only"] = [b for b, (s, p) in bstats.items() if not s]

rows = ["| Proposed block | Type | Links (strong/partial) | Strong for |", "|---|---|---|---|"]
for bid in proposed:
    if blocks[bid]["kind"] != "proposal":
        continue
    ents = control_map[bid]
    s = [e["vector_id"] for e in ents if e["strength"] == "strong"]
    rows.append(f"| {bid} {blocks[bid]['name']} | {blocks[bid]['type']} | {len(s)}/{len(ents) - len(s)} | "
                f"{', '.join(s) or '—'} |")
T["proposed_blocks"] = "\n".join(rows)


def gaps(st, pa, cheap_only=False):
    out = []
    for v in vectors:
        if v["source"] == "structural":
            if not st[v["id"]]:
                out.append(v["id"])
            continue
        f = flag(v, st, pa)
        if f and (not cheap_only or (low_tier_max(v) >= 3 and not v.get("assumes_defense"))):
            out.append(v["id"])
    return out


T["gaps_now"] = gaps(ST, PA)
T["gaps_prop"] = gaps(STP, PAP)
T["gaps_47"] = gaps(ST47, PA47)
T["cheap_now"] = gaps(ST, PA, True)
T["cheap_prop"] = gaps(STP, PAP, True)
T["cheap_47"] = gaps(ST47, PA47, True)
T["blockers_now"] = [x for x in T["gaps_now"] if top(vec[x]) >= 4 and vec[x]["headline"]]
T["blockers_prop"] = [x for x in T["gaps_prop"] if top(vec[x]) >= 4 and vec[x]["headline"]]

rows = ["| Block (declared type) | Vector | Effective type | Why |", "|---|---|---|---|"]
for bid in current:
    for e in control_map[bid]:
        if "type_override" in e:
            rows.append(f"| {bid} ({blocks[bid]['type']}) | {e['vector_id']} | {e['type_override']} | "
                        f"{e.get('note', e['why'])} |")
T["types"] = "\n".join(rows)

rows = ["| Story | Route | Vectors | Stoppers that counter none of its vectors | Fit note |", "|---|---|---|---|---|"]
for s in stories:
    bad = [k for k, val in s["stopper_check"].items() if val.startswith("none")]
    rows.append(f"| {s['name']} | {s['route']} | {' → '.join(s['vectors'])} | {', '.join(bad) or '—'} | {s['fit_note']} |")
T["stories"] = "\n".join(rows)

rows = ["| Route | Entry | Reach | Exfil | Headline |", "|---|---|---|---|---|"]
for r in ROUTES:
    st = r["stages"]
    rows.append(f"| {r['id']} {r['name']} | {', '.join(st.get('entry', [])) or '— (already inside)'} | "
                f"{', '.join(st.get('reach', [])) or '—'} | {', '.join(st.get('exfil', [])) or '—'} | "
                f"{'yes' if r['headline'] else 'own meter'}{' (served only)' if r.get('requires_external_serving') else ''} |")
T["routes"] = "\n".join(rows)
T["changelog"] = CHANGELOG
T["names"] = {b: blocks[b]["name"] for b in blocks}
T["sp"] = {b: [len(bstats[b][0]), len(bstats[b][1])] for b in bstats}
json.dump(T, open(os.path.join(OUT, "_tables.json"), "w"), indent=1, ensure_ascii=False)

print("ERRORS:", errors if errors else "none")
print("vectors:", len(vectors), "| blocks in map:", len(control_map), "(current", len(current), "proposed", len(proposed), ")")
cur_links = [e for b in current for e in control_map[b] if not e.get("proposal")]
print("current links:", len(cur_links), "strong:", sum(e["strength"] == "strong" for e in cur_links),
      "| proposal links:", sum(1 for b in control_map for e in control_map[b] if e.get("proposal")))
for k in ("gaps_47", "gaps_now", "gaps_prop", "cheap_47", "cheap_now", "cheap_prop", "blockers_now", "blockers_prop"):
    print(f"{k}: {len(T[k])} {T[k]}")
print("partial-only current blocks:", len(T["partial_only"]), T["partial_only"])
print("choke:", [(b, len(s), len(p)) for b, (s, p) in choke[:10]])
print("changelog entries:", len(CHANGELOG))
sys.exit(1 if errors else 0)
