"""Revision 2 of the control map, applied on top of map_data.MAP.

Sources: coordinator revision request (items A1-A16) and the independent review
(vectors-review/link_verdicts.csv). Every change is listed here, so the diff stays auditable.
Entries are dicts: {vector_id, strength, why, [type_override], [note], [proposal]}.
`proposal` marks a link that exists only if that proposal in proposals.json is adopted.
"""
from map_data import MAP as BASE

S, P = "strong", "partial"
CHANGELOG = []


def normalise(base):
    out = {}
    for bid, ents in base.items():
        lst = []
        for e in ents:
            d = {"vector_id": e[0], "strength": e[1], "why": e[2]}
            if len(e) > 3 and e[3]:
                d["type_override"] = e[3]
            if len(e) > 4 and e[4]:
                d["note"] = e[4]
            lst.append(d)
        out[bid] = lst
    return out


M = normalise(BASE)


def _find(bid, vid):
    for e in M.get(bid, []):
        if e["vector_id"] == vid:
            return e
    raise KeyError(f"{bid}->{vid}")


def setl(bid, vid, strength=None, why=None, note=None, type_override=None, tag=""):
    e = _find(bid, vid)
    old = e["strength"]
    if strength:
        e["strength"] = strength
    if why:
        e["why"] = why
    if note:
        e["note"] = note
    if type_override:
        e["type_override"] = type_override
    CHANGELOG.append(f"{tag} {bid}->{vid}: {old}->{e['strength']}" + (" (note)" if note and not strength else ""))


def add(bid, vid, strength, why, note=None, type_override=None, proposal=None, tag=""):
    M.setdefault(bid, [])
    assert all(e["vector_id"] != vid for e in M[bid]), f"dup {bid}->{vid}"
    d = {"vector_id": vid, "strength": strength, "why": why}
    if type_override:
        d["type_override"] = type_override
    if note:
        d["note"] = note
    if proposal:
        d["proposal"] = proposal
    M[bid].append(d)
    CHANGELOG.append(f"{tag} {bid}->{vid}: none->{strength}" + (f" [proposal {proposal}]" if proposal else ""))


def rm(bid, vid, tag=""):
    e = _find(bid, vid)
    M[bid].remove(e)
    CHANGELOG.append(f"{tag} {bid}->{vid}: {e['strength']}->removed")


def retarget(bid, old_vid, new_vid, tag=""):
    e = _find(bid, old_vid)
    e["vector_id"] = new_vid
    CHANGELOG.append(f"{tag} {bid}->{old_vid}: moved to {new_vid}")


# ---------------- A. link corrections ----------------
setl("NET-05", "V-NET-1", P, "One-way transfers replace hand-carried media; inbound malware and induced links remain", tag="A1")
setl("KEY-01", "V-ACS-4", P, "Protects the lab's own keys, not third-party roots (Comodo, DigiNotar)", tag="A2")
add("NET-03", "V-ACS-4", P, "A second vendor's keys still protect the link if one is stolen", tag="A2")
add("SC-07", "V-ACS-4", P, "Own trust roots instead of public CAs or vendor keys", tag="A2")
setl("PER-08", "V-SUP-3", P, "Removes remote vendor access; on-site contractors and cloud staff remain", tag="A3")
setl("PER-08", "V-BYP-3", P, "Removes BMC and vendor remote paths; RAND's main examples are identity fallbacks", tag="A4")
setl("IAM-01", "V-BYP-3", S, "FIDO2-only recovery and proofed break-glass close the fallback paths", tag="A4")
setl("AI-08", "V-ML-3", P, "Injection filters are bypassable classifiers; prompt injection is unsolved", tag="A5")
setl("AI-09", "V-ML-3", S, "Code an injected agent writes runs where no weights live", tag="A5")
add("AI-01", "V-ML-3", P, "A least-privileged agent limits what an injected prompt can do", tag="A5")
setl("AI-07", "V-ML-5", P, "Rate limits and detection slow distillation; account-farm campaigns persist", tag="A6")
setl("NET-01", "V-SELF-3", P, "No internet to escape to; the escape that matters is into the lab", tag="A7")
setl("AI-12", "V-SELF-5", P, "Lineage proves provenance, not soundness: flawed code re-executes identically", tag="A8")
setl("SC-07", "V-SUP-2", P, "Only critical components are in-house; SW-01 carries the rest", tag="A9")

# A10: V-SELF-1 split. V-SELF-1 = weights; V-SELF-8 = self-distilled data.
for bid, why in [
    ("AI-02", "Reviewers may notice research outputs that carry distillation data"),
    ("AI-04", "Generation and egress quotas bound distillation volume"),
    ("AI-07", "Outbound inspection catches some encoded payloads in served outputs"),
    ("AI-09", "No egress from where AI-generated code runs"),
    ("AI-10", "Gating catches bulk generation and transfer of training data"),
    ("NET-05", "AI-monitored cross-domain transfers screen outbound artefacts"),
]:
    add(bid, "V-SELF-8", P, why, tag="A10")
add("NET-01", "V-SELF-8", P, "No direct external path, but permitted outputs cross by design", type_override="hybrid", tag="A10")
setl("NET-04", "V-SELF-1", note="Weights only: keys, gradients and self-distilled data (V-SELF-8) fit under the cap.", tag="A10")
setl("AI-11", "V-SELF-1", note="Weights only: self-distillation (V-SELF-8) needs no weight access.", tag="A10")

rm("HW-04", "V-PHYS-5", tag="A11")
rm("KEY-01", "V-PHYS-5", tag="A11")
rm("PHY-03", "V-PHYS-4", tag="A11")
rm("AI-07", "V-SELF-4", tag="B (V-SELF-4 now assumes AI-07)")
setl("AI-04", "V-SELF-6", type_override="hybrid",
     note="Quota accounting is software; the July 2026 agent worked around throttling.", tag="A12")
setl("IAM-01", "V-CRED-1", why="FIDO2 plus proofed help-desk recovery defeats credential phishing; pretexting for code remains",
     note="Strong only because IAM-01's scope now includes help-desk and recovery identity proofing (proposals.json rescope).", tag="A13")
add("KEY-01", "V-BYP-1", P, "A misconfigured store exposes only ciphertext", tag="A14")
add("KEY-01", "V-CRED-3", P, "Leaked storage credentials yield ciphertext", tag="A14")
add("NET-02", "V-NET-2", P, "Dedicated weight hardware removes co-tenant cache and timing channels", tag="A15")

# A16: other reviewer verdicts accepted
setl("PER-03", "V-HUM-1", P, "Detection only; the structural counter is PER-06 at the reach stage", tag="A16")
setl("NET-02", "V-CODE-1", P, "Allow-listed software still carries n-days; patching is primary", tag="A16")
setl("NET-02", "V-CODE-2", P, "Allow-listed software still carries reported bugs; patching is primary", tag="A16")
add("AI-04", "V-ML-3", P, "Scoped network and API limits bound an injected agent", tag="A16")
add("DET-01", "V-SUP-1", P, "SolarWinds was found by a victim's SOC", tag="A16")
rm("AI-05", "V-BYP-1", tag="A16 (moves to CFG-01)")
for v in ("V-CODE-4", "V-CRED-4", "V-NET-1"):
    rm("NET-04", v, tag="A16 (egress effect moves to V-X-3)")
for bid, vid, note in [
    ("HW-05", "V-NET-2", "EM only: no effect on cache or timing channels."),
    ("PHY-02", "V-NET-2", "EM only: no effect on cache or timing channels."),
    ("IAM-01", "V-CRED-3", "Needs secrets vaulting and workload identity for service credentials (in scope)."),
    ("SW-01", "V-ML-2", "Software half; the hardware half sits with PHY-07 / SC-02."),
    ("HW-07", "V-SUP-3", "Weak: provider staff have physical access (TEE.fail); hypervisor-level only."),
    ("HW-03", "V-PHYS-1", "Weak: accelerator fabric only; DIMM interposers and pulled drives untouched."),
    ("KEY-01", "V-PHYS-7", "Weak: depends on keys being destroyed before seizure."),
    ("PER-06", "V-ACS-3", "Only if co-sign is enforced out-of-band, not inside the ACS software."),
    ("DET-01", "V-HUM-4", "Weak: counter-intelligence liaison is not a SOC function."),
    ("DEC-01", "V-HUM-1", "Weak: deterrence through attribution."),
    ("SC-07", "V-ACS-2", "Pair with NET-03: in-house code implementing a subverted standard keeps the backdoor (Dual_EC)."),
    ("NET-03", "V-NET-3", "Shares its failure mode with NET-07."),
    ("AI-02", "V-SELF-5", "Probabilistic: erodes hard at AC4-5."),
    ("AI-10", "V-SELF-2", "Probabilistic: erodes hard at AC4-5."),
]:
    setl(bid, vid, note=note, tag="A16 note")

# ---------------- C. stage consistency (my change) ----------------
# PER-06 / PER-02 act on what an insider can do with access (reach), not on recruitment (entry).
for v in ("V-HUM-1", "V-HUM-2", "V-HUM-3"):
    rm("PER-06", v, tag="C (moved to V-X-1)")
    rm("PER-02", v, tag="C (moved to V-X-1)")
for v in ("V-CRED-1", "V-CRED-3"):
    rm("PER-06", v, tag="C (reach effect kept on V-CRED-4)")

STRUCT_LINKS = {
    "V-X-1": [
        ("PER-06", S, "Two-person authorisation: one insider's access is not enough"),
        ("PER-02", P, "Physical weight operations need a second person present"),
        ("IAM-01", P, "Zero standing privilege: no standing access to use"),
        ("KEY-01", P, "Plaintext weights exist only inside attested runtimes"),
        ("CUS-01", P, "Fewer, inventoried copies within an insider's reach"),
        ("NET-02", P, "Few staff can reach the enclave at all"),
        ("PER-03", P, "Access-pattern monitoring flags unusual weight access"),
        ("PER-01", P, "SenL tiers restrict who holds weight access"),
        ("DEC-01", P, "Per-copy fingerprints attribute a leaked copy"),
    ],
    "V-X-2": [
        ("KEY-01", S, "Disks and backups hold ciphertext; keys stay in HSMs"),
        ("HW-04", P, "Probing chips triggers detection or zeroisation"),
        ("HW-03", P, "Fabric traffic is ciphertext"),
        ("HW-05", P, "Tamper evidence shows an opened rack", "probabilistic"),
        ("CUS-01", P, "Destroyed media and no stray drives to read"),
    ],
    "V-X-3": [
        ("NET-01", S, "No external network path for bulk transfer"),
        ("NET-04", S, "Hardware cap makes moving terabytes take impractically long"),
        ("NET-05", P, "One-way flows; outbound passes only through monitored cross-domain transfer"),
        ("NET-02", P, "Enclave boundary is a second egress checkpoint"),
        ("DET-01", P, "Egress telemetry flags bulk transfers"),
        ("DEC-01", P, "Canary weights flag a transfer in progress"),
    ],
    "V-X-4": [
        ("PHY-01", P, "Controlled exits from the protected space"),
        ("PHY-03", P, "Vestibules allow exit screening"),
        ("PER-02", P, "A second person present makes carrying media out harder"),
        ("PHY-05", P, "Bans phones and wireless devices, not drives"),
        ("PER-07", P, "Recorded maintenance deters carrying media out"),
    ],
}
for vid, links in STRUCT_LINKS.items():
    for link in links:
        bid, st, why = link[:3]
        add(bid, vid, st, why, type_override=link[3] if len(link) > 3 else None, tag="C structural")

# ---------------- D. proposals (new ids, tagged links) ----------------
PROPOSED = {
    "END-01": ("P-NEW-END", [
        ("V-CODE-1", S, "Fast patching and asset inventory remove the known-vulnerability target"),
        ("V-CODE-2", S, "Patch SLAs, virtual patching and hardening shrink the disclosure window"),
        ("V-CODE-3", P, "EDR and hardening raise exploitation cost"),
        ("V-ML-1", P, "ML-stack CVEs patched on the same cadence"),
        ("V-PHYS-3", P, "Managed, encrypted, EDR-equipped endpoints resist off-site tampering"),
    ]),
    "CFG-01": ("P-NEW-CFG", [
        ("V-BYP-1", S, "Policy-as-code and gold-image drift checks catch misconfiguration (RAND SL3)"),
        ("V-BYP-2", P, "Drift scans find unexpected stores holding weights"),
        ("V-BYP-3", P, "Configuration audits find legacy and fallback access paths"),
        ("V-CODE-1", P, "Gold images keep systems at a known patched baseline"),
    ]),
    "GOV-01": ("P-NEW-GOV", [
        ("V-HUM-4", S, "Vets investors, partners and positions of influence (RAND SL4)"),
        ("V-HUM-5", P, "Board-level security authority resists covert executive-approved access"),
        ("V-SUP-3", P, "Partners and vendors with access are vetted too"),
    ]),
    "ACA-01": ("P-NEW-ACA", [
        ("V-ACS-1", S, "Formally verified cryptographic and authentication protocols (RAND SL5)"),
        ("V-ACS-3", S, "Verified, minimal access-control code leaves few implementation bugs"),
        ("V-ACS-2", P, "Independent verification can expose planted weaknesses in implementations"),
    ]),
    "SRV-01": ("P-NEW-SRV", [
        ("V-ML-1", S, "Minimal, memory-safe serving code behind a narrow interface; fuzzed drivers"),
        ("V-ML-3", P, "A narrow interface limits what injected code can request"),
        ("V-CRED-4", P, "Escalated accounts still see weights only through the interface"),
        ("V-X-1", P, "Staff touch weights only through interfaces that prevent copying (RAND SL3)"),
        ("V-SELF-2", P, "Agents reach weights only through a narrow interface"),
    ]),
    "SC-08": ("P-MERGE-SC", [
        ("V-SUP-1", P, "Upstream inspection, counterfeit testing and chain of custody together"),
        ("V-ML-2", P, "Accelerators sampled and attested before installation"),
    ]),
    "PHY-08": ("P-EXTEND-PHY05", [
        ("V-PHYS-2", S, "Hardware-disabled ports and a device ban leave nothing to plug in"),
        ("V-X-4", S, "No writable media or personal devices to carry weights out"),
        ("V-NET-1", P, "No media or RF bridges across the air gap"),
        ("V-NET-3", P, "No phones to record audio or photograph screens"),
        ("V-SELF-4", P, "No wireless device in the room to relay a covert signal"),
    ]),
}
for bid, (pid, links) in PROPOSED.items():
    for vid, st, why in links:
        add(bid, vid, st, why, proposal=pid, tag="D")
add("HW-06", "V-SELF-2", P, "Composition checks stop agents chaining permitted kernels into a dump",
    proposal="P-MERGE-HW10", tag="D")
add("PER-03", "V-X-4", P, "Departure-window monitoring catches pre-resignation copying",
    proposal="P-MERGE-PER05", tag="D")

MAP = M
