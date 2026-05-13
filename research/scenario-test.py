"""
Scenario test: load all blocks, apply formulas, check outputs are sensible.
Tests 4 scenarios at years 2026 and 2029 to validate scoring model.
"""
import json
import math
from pathlib import Path

DATA = Path(__file__).parent / "data"

# Load all blocks
blocks = []
for f in DATA.glob("blocks-*.json"):
    blocks.extend(json.loads(f.read_text()))

print(f"Loaded {len(blocks)} blocks across {len(set(b['category'] for b in blocks))} categories\n")

# AI capability curve (default)
AI_CURVE = {2024: 0.0, 2025: 0.15, 2026: 0.35, 2027: 0.65, 2028: 0.82, 2029: 0.93, 2030: 1.0}

# Block maturation effectiveness
STATE_EFFECTIVENESS = {
    "not_started": 0.0,
    "investing": 0.1,
    "implementing": 0.4,
    "partially_deployed": 0.6,
    "deployed": 0.85,
    "mature": 1.0,
}

# Sigmoid for OC-to-success probability
def sigmoid_prob(delta, steepness=1.5):
    """delta = effective_OC - block_oc_threshold. At delta=0, prob=0.5"""
    # Steepness 1.5: delta=-2 → 5%, delta=-1 → 18%, delta=0 → 50%, delta=+1 → 82%, delta=+2 → 95%
    return 1.0 / (1.0 + math.exp(-steepness * delta))

def ai_degradation(block, year):
    """How much AI erodes a probabilistic block's effectiveness"""
    if block["defense_type"] == "hard_stop":
        return 0.0
    ai_shift = block["adversary_exploitation"]["ai_oc_shift"]
    ai_cap = AI_CURVE.get(year, 1.0)
    return ai_shift * ai_cap * 0.1  # max 20-30% degradation for highest shift blocks

def block_effectiveness(block, state, year):
    """Effective defense contribution of a block given its state and year"""
    base = STATE_EFFECTIVENESS.get(state, 0.0)
    degradation = ai_degradation(block, year)
    return max(0.0, base * (1.0 - degradation))

def category_score(blocks_in_cat, states, year, baseline_sl=1.0):
    """
    Average effectiveness across blocks in category, mapped to SL scale.
    baseline_sl: implicit floor — labs have basic controls (firewalls, auth, locks)
    even when SL4-5 blocks aren't deployed. Our blocks track the SL3-5 layer.
    """
    if not blocks_in_cat:
        return baseline_sl
    total = sum(block_effectiveness(b, states.get(b["id"], "not_started"), year) for b in blocks_in_cat)
    raw = total / len(blocks_in_cat)
    # Map: 0% block effectiveness = baseline_sl, 100% = 5.0
    return baseline_sl + raw * (5.0 - baseline_sl)

def overall_sl(cat_scores):
    """Hybrid: 0.6*min + 0.4*harmonic_mean"""
    if not cat_scores:
        return 0.0
    min_score = min(cat_scores.values())
    # Harmonic mean (avoid division by zero)
    nonzero = [s for s in cat_scores.values() if s > 0]
    if not nonzero:
        return 0.0
    hmean = len(nonzero) / sum(1.0/s for s in nonzero)
    return 0.6 * min_score + 0.4 * hmean

def breach_prob_for_chain(chain_blocks, states, adversary_oc, year):
    """
    Probability adversary succeeds at exploiting a chain.
    Chain success = adversary must overcome each block's defense.
    If a block is absent, success depends on adversary OC vs threshold.
    If a block is present, it acts as a barrier (hard stops nearly impassable).
    """
    prob = 1.0
    for b in chain_blocks:
        state = states.get(b["id"], "not_started")
        eff = block_effectiveness(b, state, year)
        if eff >= 0.85:
            # Deployed block — hard to bypass
            if b["defense_type"] == "hard_stop":
                prob *= 0.02  # hard stops are nearly impassable when deployed
            else:
                prob *= 0.15  # probabilistic blocks can still be overcome
        elif eff >= 0.4:
            prob *= 0.5  # implementing provides partial defense
        else:
            # Block absent — sigmoid based on effective OC vs threshold
            threshold = b["adversary_exploitation"]["oc_threshold_to_exploit"]
            ai_shift = b["adversary_exploitation"]["ai_oc_shift"]
            effective_oc = adversary_oc + ai_shift * AI_CURVE.get(year, 1.0)
            delta = effective_oc - threshold
            prob *= sigmoid_prob(delta)
    return prob

def distillation_progress(year, start_year=2026, defenses_deployed=False):
    """Cumulative extraction fraction — integrates monthly rate over exposure window"""
    if year <= start_year:
        return 0.0
    progress = 0.0
    base_rate = 0.005  # 0.5% per month baseline (was 2% — too fast)
    defense_reduction = 0.6 if defenses_deployed else 0.0
    for m in range(int((year - start_year) * 12)):
        frac_year = start_year + m / 12.0
        yr_floor = int(frac_year)
        yr_ceil = min(yr_floor + 1, 2030)
        t = frac_year - yr_floor
        ai_cap = AI_CURVE.get(yr_floor, 1.0) * (1-t) + AI_CURVE.get(yr_ceil, 1.0) * t
        ai_mult = 1.0 + 4.0 * ai_cap
        effective_rate = base_rate * ai_mult * (1.0 - defense_reduction)
        progress += effective_rate
    return min(progress, 1.0)

# --- SCENARIOS ---

categories = {}
for b in blocks:
    categories.setdefault(b["category"], []).append(b)

# Scenario 1: Baseline 2026 — No investment (current state = baseline_state from each block)
print("=" * 70)
print("SCENARIO 1: Baseline 2026 — Current state of the art")
print("=" * 70)
baseline_states = {}
for b in blocks:
    bs = b["current_state"]["baseline_state"]
    baseline_states[b["id"]] = bs

cat_scores_1 = {}
for cat, cat_blocks in categories.items():
    cat_scores_1[cat] = category_score(cat_blocks, baseline_states, 2026)
    print(f"  {cat:15s}: SL {cat_scores_1[cat]:.2f}")
print(f"  {'OVERALL':15s}: SL {overall_sl(cat_scores_1):.2f}")
print()

# Scenario 2: Aggressive investment 2026 — all blocks at "implementing"
print("=" * 70)
print("SCENARIO 2: Year 2026 — All blocks 'implementing'")
print("=" * 70)
all_implementing = {b["id"]: "implementing" for b in blocks}
cat_scores_2 = {}
for cat, cat_blocks in categories.items():
    cat_scores_2[cat] = category_score(cat_blocks, all_implementing, 2026)
    print(f"  {cat:15s}: SL {cat_scores_2[cat]:.2f}")
print(f"  {'OVERALL':15s}: SL {overall_sl(cat_scores_2):.2f}")
print()

# Scenario 3: All deployed at 2029 — best achievable?
print("=" * 70)
print("SCENARIO 3: Year 2029 — All blocks 'deployed'")
print("=" * 70)
all_deployed = {b["id"]: "deployed" for b in blocks}
cat_scores_3 = {}
for cat, cat_blocks in categories.items():
    cat_scores_3[cat] = category_score(cat_blocks, all_deployed, 2029)
    print(f"  {cat:15s}: SL {cat_scores_3[cat]:.2f}")
print(f"  {'OVERALL':15s}: SL {overall_sl(cat_scores_3):.2f}")
print()

# Scenario 4: Partial — network+physical deployed, AI-specific not started (realistic gap)
print("=" * 70)
print("SCENARIO 4: Year 2028 — Network+Physical deployed, AI-specific absent")
print("=" * 70)
partial_states = {}
for b in blocks:
    if b["category"] in ("network", "physical"):
        partial_states[b["id"]] = "deployed"
    elif b["category"] in ("machine", "personnel"):
        partial_states[b["id"]] = "implementing"
    elif b["category"] == "supply_chain":
        partial_states[b["id"]] = "investing"
    else:  # ai_specific
        partial_states[b["id"]] = "not_started"
cat_scores_4 = {}
for cat, cat_blocks in categories.items():
    cat_scores_4[cat] = category_score(cat_blocks, partial_states, 2028)
    print(f"  {cat:15s}: SL {cat_scores_4[cat]:.2f}")
print(f"  {'OVERALL':15s}: SL {overall_sl(cat_scores_4):.2f}")
print()

# Breach probability tests
print("=" * 70)
print("BREACH PROBABILITY TESTS")
print("=" * 70)

# Attack chain: "The Remote Ghost" — NET-01 absent + HW-07 absent + PER-08 absent
chain_remote = [b for b in blocks if b["id"] in ("NET-01", "HW-07", "PER-08")]
for adversary_oc in [3, 4, 5]:
    for year in [2026, 2029]:
        p = breach_prob_for_chain(chain_remote, baseline_states, adversary_oc, year)
        print(f"  Remote Ghost chain | OC{adversary_oc} | {year} | baseline: P={p:.3f}")

print()
# Same chain with NET-01 deployed
deployed_net01 = dict(baseline_states)
deployed_net01["NET-01"] = "deployed"
for adversary_oc in [4, 5]:
    for year in [2026, 2029]:
        p = breach_prob_for_chain(chain_remote, deployed_net01, adversary_oc, year)
        print(f"  Remote Ghost chain | OC{adversary_oc} | {year} | NET-01 deployed: P={p:.3f}")

print()

# Distillation accumulator
print("=" * 70)
print("DISTILLATION ACCUMULATOR")
print("=" * 70)
for year in [2026, 2027, 2028, 2029, 2030]:
    no_def = distillation_progress(year, defenses_deployed=False)
    with_def = distillation_progress(year, defenses_deployed=True)
    print(f"  {year}: No defenses={no_def*100:.1f}% | With defenses={with_def*100:.1f}%")

print()

# More nuanced chain test: "The Long Game" — PER-04 (threshold 4) + PER-03 (threshold 3) + PER-05 (threshold 3)
chain_long_game = [b for b in blocks if b["id"] in ("PER-04", "PER-03", "PER-05")]
print()
print("  'The Long Game' chain (personnel focus, higher thresholds):")
for adversary_oc in [2, 3, 4, 5]:
    for year in [2026, 2029]:
        p = breach_prob_for_chain(chain_long_game, baseline_states, adversary_oc, year)
        print(f"    OC{adversary_oc} | {year} | baseline: P={p:.3f}")

print()

# Scenario 5: "Realistic good lab" — partial investments aligned with difficulty
print("=" * 70)
print("SCENARIO 5: Year 2028 — Realistic well-funded lab (SL3-4 target)")
print("=" * 70)
realistic_states = {}
for b in blocks:
    # Easy blocks: deployed
    if b["dimensions"]["organizational_readiness"]["value"] >= 50 and \
       b["dimensions"]["time_to_deploy_months"]["max"] <= 24:
        realistic_states[b["id"]] = "deployed"
    # Medium blocks: implementing
    elif b["dimensions"]["organizational_readiness"]["value"] >= 30:
        realistic_states[b["id"]] = "implementing"
    # Hard blocks: investing
    elif b["dimensions"]["technical_feasibility"]["value"] >= 50:
        realistic_states[b["id"]] = "investing"
    else:
        realistic_states[b["id"]] = "not_started"

cat_scores_5 = {}
for cat, cat_blocks in categories.items():
    cat_scores_5[cat] = category_score(cat_blocks, realistic_states, 2028)
    deployed_count = sum(1 for b in cat_blocks if realistic_states[b["id"]] == "deployed")
    impl_count = sum(1 for b in cat_blocks if realistic_states[b["id"]] == "implementing")
    inv_count = sum(1 for b in cat_blocks if realistic_states[b["id"]] == "investing")
    ns_count = sum(1 for b in cat_blocks if realistic_states[b["id"]] == "not_started")
    print(f"  {cat:15s}: SL {cat_scores_5[cat]:.2f}  [D:{deployed_count} I:{impl_count} Inv:{inv_count} NS:{ns_count}]")
print(f"  {'OVERALL':15s}: SL {overall_sl(cat_scores_5):.2f}")
print()

# AI OC shift impact comparison
print("=" * 70)
print("AI OC SHIFT IMPACT — Effective OC by year (base OC4 adversary)")
print("=" * 70)
# Show how different blocks' ai_oc_shift values affect effective adversary capability
high_shift = [(b["id"], b["name"][:35], b["adversary_exploitation"]["ai_oc_shift"])
              for b in blocks if b["adversary_exploitation"]["ai_oc_shift"] >= 2.0]
high_shift.sort(key=lambda x: -x[2])
print(f"  {'Block':<10} {'Name':<37} {'Shift':>5} | eff_OC_2026 | eff_OC_2029")
for bid, name, shift in high_shift[:10]:
    eff_26 = 4 + shift * AI_CURVE[2026]
    eff_29 = 4 + shift * AI_CURVE[2029]
    print(f"  {bid:<10} {name:<37} {shift:>5.1f} | {eff_26:.2f}       | {eff_29:.2f}")
