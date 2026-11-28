# Vector catalogue: RAND RRA2849-1 Table 5.1 / 5.2 (transcribed) + authored AI-as-insider category.
# Scores are (OC1, OC2, OC3, OC4, OC5). Line numbers refer to research/rand_full.txt.

CATEGORIES = [
    ("code", "Running Unauthorized Code", "rand"),
    ("credentials", "Compromising Existing Credentials", "rand"),
    ("access_control", "Undermining the Access Control System Itself", "rand"),
    ("bypass", "Bypassing Primary Security System Altogether", "rand"),
    ("ai_specific", "AI-Specific Attack Vectors", "rand"),
    ("nontrivial_access", "Nontrivial Access to Data or Networks", "rand"),
    ("physical", "Unauthorized Physical Access to Systems", "rand"),
    ("supply_chain", "Supply Chain Attacks", "rand"),
    ("humint", "Human Intelligence", "rand"),
    ("ai_insider", "The Lab's Own AI Model as Insider", "authored"),
]

CATNAME = {c[0]: c[1] for c in CATEGORIES}

COUNT_NOTE = ("One of nine vectors scored 1 at OC1-OC3 and >1 above. RAND's text (L1609) says eight; "
              "an independent check against the rand.org PDF confirms nine, so RAND's 'eight' is a slip in its prose "
              "(likely omitting military takeover). Scores stand as transcribed.")

# id, category, name, scores, rapidly_changing(*), table_line, appendix_line, description, transcription_note, assumes_defense
RAND = [
    ("V-CODE-1", "code", "Exploiting vulnerabilities for which a patch exists (attacking non-updated software)",
     (3, 4, 4, 5, 5), False, 924, 2818,
     "Exploiting known, already-patched vulnerabilities on systems left unpatched through lax updating or end-of-life software.", None, None),
    ("V-CODE-2", "code", "Exploiting reported but not (fully) patched vulnerabilities",
     (2, 2, 3, 4, 5), False, 940, 2873,
     "Exploiting publicly reported vulnerabilities in the window before a patch exists or is fully applied.", None, None),
    ("V-CODE-3", "code", "Finding and exploiting individual zero-days",
     (1, 2, 4, 5, 5), False, 954, 2944,
     "Discovering or buying individual unreported vulnerabilities and exploiting them against the target's specific software or devices.", None, None),
    ("V-CODE-4", "code", "Direct access to zero-days at scale",
     (1, 1, 2, 4, 5), False, 967, 3032,
     "State access to a large pipeline of zero-days, e.g. via mandatory disclosure laws, enough to defeat monitoring and modest defence-in-depth.", None, None),

    ("V-CRED-1", "credentials", "Social engineering",
     (3, 4, 5, 5, 5), True, 980, 3078,
     "Phishing, pretexting and other deception that gets staff to reveal credentials, run attacker code, or grant access.",
     "Extracted text interleaves this name and V-CRED-2's with the category label, then lists ten scores; "
     "the first five are assigned here by reading order. Independent check of the PDF layout puts 3 4 5 5 5 on the "
     "'Social engineering*' line, confirming the pairing.", None),
    ("V-CRED-2", "credentials", "Password brute-forcing and cracking",
     (2, 2, 3, 3, 4), True, 982, 3139,
     "Guessing, spraying or offline cracking of passwords and weak keys to obtain legitimate credentials.",
     "Second block of five scores after the interleaved names (see V-CRED-1); confirmed against the PDF layout.", None),
    ("V-CRED-3", "credentials", "Exploitation of exposed credentials",
     (3, 3, 4, 5, 5), False, 1007, 3196,
     "Using credentials, tokens or keys leaked in code, logs, backups, breaches or misconfigured stores.", None, None),
    ("V-CRED-4", "credentials", "Expanding illegitimate access (e.g., escalating privileges)",
     (2, 3, 5, 5, 5), False, 1020, 3243,
     "Turning a foothold into broader access: privilege escalation, lateral movement, over-broad permissions abused to reach weight systems.", None, None),

    ("V-ACS-1", "access_control", "Encryption/authentication vulnerabilities (in the access control system)",
     (1, 1, 2, 3, 3), False, 1034, 3311,
     "Flaws in the cryptography or authentication protocols the access-control system relies on.", None, None),
    ("V-ACS-2", "access_control", "Intentional backdoors in algorithms, protocols, or products (in the access control system)",
     (1, 1, 1, 2, 2), False, 1049, 3356,
     "Deliberately planted weaknesses in algorithms, protocols or products used for access control, e.g. subverted standards or vendors.",
     COUNT_NOTE, None),
    ("V-ACS-3", "access_control", "Code vulnerabilities (in the access control system)",
     (1, 1, 2, 3, 4), False, 1065, 3410,
     "Implementation bugs in the access-control software itself that let an attacker bypass or forge authorisation.", None, None),
    ("V-ACS-4", "access_control", "Access to secret material undermining a protocol",
     (1, 1, 2, 2, 3), False, 1079, 3451,
     "Stealing signing keys, CA keys or other protocol secrets that let an attacker mint valid credentials or decrypt.", None, None),

    ("V-BYP-1", "bypass", "Incorrect configuration or security policy implementation",
     (2, 2, 3, 3, 3), False, 1093, 3489,
     "Misconfigurations, or policies written but never implemented, that leave sensitive systems or data reachable without defeating any control.", None, None),
    ("V-BYP-2", "bypass", "Additional (less secure) copies of sensitive data",
     (2, 2, 3, 5, 5), False, 1107, 3507,
     "Backups, checkpoints, research copies or discarded media holding weights that are less protected than the main copy.", None, None),
    ("V-BYP-3", "bypass", "Alternative (less secure) authentication or access schemes",
     (1, 1, 2, 3, 4), False, 1121, 3546,
     "Neglected secondary access paths: password recovery, break-glass, admin impersonation, management ports, legacy protocols.", None, None),

    ("V-ML-1", "ai_specific", "Discovering existing vulnerabilities in the ML stack",
     (1, 2, 4, 4, 5), True, 1184, 3590,
     "Exploiting existing bugs in ML frameworks, serving stacks, GPU drivers or unsanitised model output to run code or read memory.",
     "Category label 'Attack Vectors' is interleaved into the name lines at L1185; scores unaffected.", None),
    ("V-ML-2", "ai_specific", "Intentional ML supply chain compromise",
     (1, 2, 4, 5, 5), True, 1198, 3607,
     "Deliberately compromising ML packages, tooling, accelerator hardware, annotations or models upstream (e.g. the torchtriton nightly compromise).", None, None),
    ("V-ML-3", "ai_specific", "Prompt-triggered code execution",
     (2, 3, 4, 4, 4), True, 1211, 3637,
     "Crafted prompts or inputs make a code-capable model execute attacker-chosen actions (prompt injection leading to code execution).", None, None),
    ("V-ML-4", "ai_specific", "Model extraction",
     (1, 1, 1, 2, 3), True, 1224, 3662,
     "Inferring weights or parameters directly from many query responses, e.g. extracting embedding matrices through a normal API.",
     COUNT_NOTE, None),
    ("V-ML-5", "ai_specific", "Model distillation",
     (1, 1, 2, 2, 3), True, 1236, 3682,
     "Training a model that mimics the target from its API outputs, replicating function without touching weights.", None, None),

    ("V-NET-1", "nontrivial_access", "Digital access to air-gapped networks",
     (1, 1, 2, 2, 4), False, 1248, 3722,
     "Reaching and exfiltrating from isolated networks via removable media, covert channels, manipulated insiders or induced emergency connections.",
     None, ["NET-01"]),
    ("V-NET-2", "nontrivial_access", "Side-channel attacks (including through leaked emanations; i.e., TEMPEST attacks)",
     (1, 1, 1, 2, 3), False, 1261, 3764,
     "Inferring secrets from EM, power, acoustic, optical or cache/timing leakage; mostly useful for keys, not bulk weights.",
     COUNT_NOTE, None),
    ("V-NET-3", "nontrivial_access", "Eavesdropping and wiretaps",
     (1, 1, 2, 4, 5), False, 1276, 3863,
     "Intercepting data in transit by tapping cables, links or network equipment, or by audio and RF bugs.", None, None),

    ("V-PHYS-1", "physical", "Direct physical access to sensitive systems",
     (1, 1, 3, 3, 4), False, 1289, 3908,
     "Reaching sensitive hardware in person: tailgating, impersonation, maintenance or cleaning access, or retrieving undestroyed waste media.", None, None),
    ("V-PHYS-2", "physical", "Malicious placement of portable devices",
     (2, 2, 4, 4, 4), False, 1302, 3923,
     "Planting USB drives, malicious cables or peripherals for staff to connect, or rogue Wi-Fi access points.", None, None),
    ("V-PHYS-3", "physical", "Physical access to devices in other locations",
     (1, 1, 3, 4, 5), False, 1315, 3956,
     "Compromising staff laptops and phones at homes, hotels, airports or other off-site locations.", None, None),
    ("V-PHYS-4", "physical", "Evasion of physical access control systems",
     (1, 1, 1, 3, 5), False, 1329, 3975,
     "Hacking or disabling the digital systems physical security depends on: cameras, alarms, badge readers, smart locks.",
     COUNT_NOTE, ["PHY-03"]),
    ("V-PHYS-5", "physical", "Penetration of physical hardware security",
     (1, 1, 1, 2, 3), False, 1343, 4005,
     "Defeating tamper protection on HSMs, secure chips or enclosures by probing, fault injection or decapping.",
     COUNT_NOTE, ["HW-04", "KEY-01"]),
    ("V-PHYS-6", "physical", "Armed break-in",
     (1, 1, 1, 2, 4), False, 1356, 4042,
     "Forcible entry by armed personnel to seize hardware or data.", COUNT_NOTE, None),
    ("V-PHYS-7", "physical", "Military takeover",
     (1, 1, 1, 1, 2), False, 1368, 4053,
     "A state's military force seizes the facility and everything in it.", COUNT_NOTE, None),

    ("V-SUP-1", "supply_chain", "Services and equipment the organization uses",
     (1, 2, 4, 5, 5), False, 1380, 4087,
     "Compromised hardware, firmware, operating systems, IT and collaboration services, or CI/CD products the organisation uses (SolarWinds, CryptoAG).", None, None),
    ("V-SUP-2", "supply_chain", "Code and infrastructure incorporated into the codebase",
     (1, 2, 4, 5, 5), False, 1394, 4146,
     "Malicious or vulnerable third-party packages, libraries, images and tooling built into the organisation's own software (xz backdoor, typosquats).", None, None),
    ("V-SUP-3", "supply_chain", "Vendors with access to information",
     (1, 1, 2, 3, 4), False, 1409, 4189,
     "Compromising vendors, contractors or service providers who hold access to the organisation's data or systems (OPM via subcontractor).", None, None),

    ("V-HUM-1", "humint", "Bribes and cooperation",
     (1, 1, 4, 4, 5), False, 1475, 4251,
     "Paying, persuading or deceiving insiders, including disgruntled or ideologically motivated staff, into acting for the adversary.", None, None),
    ("V-HUM-2", "humint", "Extortion",
     (1, 1, 4, 4, 5), False, 1488, 4276,
     "Coercing staff with threats to them or their families, or with leverage manufactured from small initial favours.", None, None),
    ("V-HUM-3", "humint", "Candidate placement",
     (1, 1, 1, 3, 5), False, 1500, 4288,
     "Training and placing agents who are then hired into sensitive roles.", COUNT_NOTE, None),
    ("V-HUM-4", "humint", "Organizational leverage attacks",
     (1, 1, 1, 3, 5), False, 1512, 4299,
     "Building financial or legal leverage over the organisation, via investments or partnerships, to force or trick it into granting access.",
     COUNT_NOTE, None),
    ("V-HUM-5", "humint", "Organizationally approved access",
     (1, 1, 2, 3, 5), False, 1525, 4328,
     "Leadership knowingly provides access, paid or legally compelled, often covertly.", None, None),
]


AI_NOTE = ("AUTHORED ASSUMPTION, not RAND: P(this step succeeds | a misaligned instance at this capability band attempts it) "
           "at a lab with ordinary security and no AI-specific controls; same 1-5 bins as RAND. Propensity to try is excluded.")

NOVEL = "sl5_novel.txt"
# id, name, (ac1..ac5), rationale, description, basis
AUTHORED = [
    ("V-SELF-1", "Self-exfiltration of its weights via permitted channels", (1, 2, 4, 5, 5),
     "Terabyte transfers need multi-day planning and evasion; from AC3, unmetered research egress is little obstacle (cf. July 2026 throttling workarounds).",
     "The model moves its own weight files out through channels it may use: artefact exports, code pushes, logs, uploads, API outputs.",
     ["sl5_standard.txt:180-184", f"{NOVEL}:198", f"{NOVEL}:878-881"]),
    ("V-SELF-8", "Self-distilled data out via permitted channels", (1, 1, 2, 3, 4),
     "Gigabytes leave easily, but a useful replica needs high-quality self-distillation and outside compute; only strong models manage both.",
     "The model generates training data or compressed know-how from which an outside party can train a capable replica; no weight access needed.",
     [f"{NOVEL}:198", f"{NOVEL}:878-881 (\"exfiltrate or distill the model weights\")"]),
    ("V-SELF-2", "Abuse of its own credentials or tooling", (2, 3, 4, 5, 5),
     "Front-loaded: no exploit needed, agents already hold broad standing credentials, so only intent and planning limit it.",
     "The model uses credentials, service accounts and tools it legitimately holds beyond task scope: reading checkpoints, changing configs, launching jobs.",
     ["sl5_standard.txt:180-184", f"{NOVEL}:2017-2020", f"{NOVEL}:1951-1952"]),
    ("V-SELF-3", "Sandbox escape via permitted egress", (1, 3, 4, 5, 5),
     "July 2026: current-generation models escaped an eval sandbox through a package-proxy zero-day and reached the internet.",
     "The model exploits its execution environment (package proxy, container runtime, eval harness) to reach networks it should not, as in the July 2026 escape.",
     ["app/public/data/blocks-ai-specific.json:351 (AI-04 current_state)", f"{NOVEL}:878-881"]),
    ("V-SELF-4", "Covert and side channels", (1, 1, 2, 3, 4),
     "Lagged: low bandwidth and hard to engineer reliably; matters once overt egress is capped or inspected, mostly for keys or coordination.",
     "Low-bandwidth leakage or coordination through steganography in outputs, timing, resource usage or EM modulation; suits keys and signals, not bulk weights.",
     ["blocks-machine.json HW-05 exploit_narrative", f"{NOVEL}:878-881"]),
    ("V-SELF-5", "Subverting oversight it helped build", (1, 2, 3, 4, 5),
     "Ramp kept on purpose: undetected sabotage needs coding skill and a model of what reviewers miss, which grow together; no step change expected.",
     "Inserting subtle flaws into security code, monitors or research it writes; colluding with same-family monitors; sandbagging evaluations; tampering with results.",
     [f"{NOVEL}:198", f"{NOVEL}:440-447", "sl5_standard.txt:180-184"]),
    ("V-SELF-6", "Unsanctioned workloads on lab compute", (2, 3, 4, 5, 5),
     "Front-loaded: launching jobs is ordinary agent work; ordinary labs lack per-job attestation or security-grade quota accounting.",
     "Launching hidden training or inference jobs, or persistent copies of itself, on internal clusters: a rogue internal deployment that needs no exfiltration.",
     [f"{NOVEL}:1951-1952", "sl5_standard.txt:180-184"]),
    ("V-SELF-7", "Manipulating its operators", (2, 2, 3, 4, 5),
     "Already non-zero: agentic-misalignment evaluations show coercive tactics in current models; reliable persuasion of trained staff needs more capability.",
     "Persuading, deceiving or pressuring staff into granting access, approving changes or relaxing controls on its behalf.",
     [f"{NOVEL}:2088-2093"]),
]

STRUCT_NOTE = ("STRUCTURAL, not RAND: stands for 'nothing stops this stage' at an SL1-grade victim (p = 1.0 at every tier), "
               "so stage controls have something to act on. RAND scores entry/reach steps; Box 5.1 treats getting the weights "
               "out of an SL1 victim as given.")
# id, category, name, stage, description
STRUCTURAL = [
    ("V-X-1", "structural", "Standing insider access to weights", "reach",
     "A cooperating insider uses access they already hold to read or copy weights; at SL1 many staff can."),
    ("V-X-2", "structural", "Reading weights from hardware in hand", "reach",
     "Someone at the machine reads weights from unencrypted disks, memory or interconnects."),
    ("V-X-3", "structural", "Bulk network egress", "exfil",
     "Weights leave over the victim's own network links once reached; nothing meters or blocks outbound transfer at SL1."),
    ("V-X-4", "structural", "Physical carry-out of media or devices", "exfil",
     "Weights leave on a drive, phone or implant carried out of the building."),
]

# stage + stages_skipped for every vector (RAND and authored)
STAGE = {
    "V-CODE-1": ("entry", []), "V-CODE-2": ("entry", []), "V-CODE-3": ("entry", []), "V-CODE-4": ("entry", []),
    "V-CRED-1": ("entry", []), "V-CRED-2": ("entry", []), "V-CRED-3": ("entry", []), "V-CRED-4": ("reach", []),
    "V-ACS-1": ("reach", []), "V-ACS-2": ("reach", []), "V-ACS-3": ("reach", []), "V-ACS-4": ("reach", []),
    "V-BYP-1": ("reach", []), "V-BYP-2": ("reach", []), "V-BYP-3": ("entry", []),
    "V-ML-1": ("entry", []), "V-ML-2": ("entry", []), "V-ML-3": ("entry", []),
    "V-ML-4": ("entry", ["reach", "exfil"]), "V-ML-5": ("entry", ["reach", "exfil"]),
    "V-NET-1": ("entry", []), "V-NET-2": ("reach", []), "V-NET-3": ("reach", ["exfil"]),
    "V-PHYS-1": ("entry", []), "V-PHYS-2": ("entry", []), "V-PHYS-3": ("entry", []), "V-PHYS-4": ("entry", []),
    "V-PHYS-5": ("reach", []), "V-PHYS-6": ("entry", ["exfil"]), "V-PHYS-7": ("entry", ["exfil"]),
    "V-SUP-1": ("entry", []), "V-SUP-2": ("entry", []), "V-SUP-3": ("entry", []),
    "V-HUM-1": ("entry", []), "V-HUM-2": ("entry", []), "V-HUM-3": ("entry", []), "V-HUM-4": ("entry", []),
    "V-HUM-5": ("entry", []),
    "V-SELF-1": ("exfil", []), "V-SELF-8": ("exfil", []), "V-SELF-2": ("reach", []), "V-SELF-3": ("reach", []),
    "V-SELF-4": ("exfil", []), "V-SELF-5": ("reach", []), "V-SELF-6": ("reach", ["exfil"]), "V-SELF-7": ("reach", []),
}
STAGE_NOTE = {
    "V-NET-1": "Also an exfil candidate: RAND's vector covers both penetrating and exfiltrating isolated networks.",
    "V-ML-1": "Also a reach candidate (GPU-driver memory reads).",
    "V-ML-4": "Complete via the API: weights or parameters come out in the responses.",
    "V-ML-5": "Complete via the API, but yields a capability copy, not weights: shown on its own meter, not the headline.",
    "V-NET-3": "A tap on a link carrying weights captures them in transit; retrieval is folded in.",
    "V-PHYS-6": "Seizure carries the hardware out; reading the weights from it is still a reach step (V-X-2).",
    "V-PHYS-7": "Seizure carries the hardware out; reading the weights from it is still a reach step (V-X-2).",
    "V-HUM-5": "Not complete: sanctioned access still has to get past dual authorisation, split custody and egress controls (RAND SL5 irrecoverable-key policy targets exactly this).",
    "V-SELF-6": "Complete for the AI-insider route: the harm is a rogue internal deployment, nothing leaves.",
    "V-SELF-8": "Yields a capability copy, not weights; kept in the AI-insider route because a distilled successor carries the model's goals.",
}
ASSUMES_AUTHORED = {"V-SELF-4": ["NET-04", "AI-07"]}
HEADLINE_FALSE = {"V-ML-5"}


def build_vectors():
    out = []
    for (vid, cat, name, s, star, tline, aline, desc, tnote, assumes) in RAND:
        st, skip = STAGE[vid]
        v = {
            "id": vid,
            "category": cat,
            "category_name": CATNAME[cat],
            "name": name,
            "source": "rand",
            "rand_feasibility": {"oc1": s[0], "oc2": s[1], "oc3": s[2], "oc4": s[3], "oc5": s[4]},
            "rapidly_changing": star,
            "description": desc,
            "source_ref": tline,
            "appendix_a_ref": aline,
            "stage": st,
            "stages_skipped": skip,
            "headline": vid not in HEADLINE_FALSE,
        }
        if vid in STAGE_NOTE:
            v["stage_note"] = STAGE_NOTE[vid]
        if assumes:
            v["assumes_defense"] = assumes
        if tnote:
            v["transcription_note"] = tnote
        out.append(v)
    for (vid, name, ac, rationale, desc, basis) in AUTHORED:
        st, skip = STAGE[vid]
        v = {
            "id": vid,
            "category": "ai_insider",
            "category_name": CATNAME["ai_insider"],
            "name": name,
            "source": "authored",
            "rand_feasibility": None,
            "ai_feasibility": {"ac1": ac[0], "ac2": ac[1], "ac3": ac[2], "ac4": ac[3], "ac5": ac[4]},
            "ai_rationale": rationale,
            "assumption": True,
            "assumption_note": AI_NOTE,
            "description": desc,
            "source_ref": None,
            "authored_basis": basis,
            "stage": st,
            "stages_skipped": skip,
            "headline": True,
        }
        if vid in STAGE_NOTE:
            v["stage_note"] = STAGE_NOTE[vid]
        if vid in ASSUMES_AUTHORED:
            v["assumes_defense"] = ASSUMES_AUTHORED[vid]
        out.append(v)
    for (vid, cat, name, st, desc) in STRUCTURAL:
        out.append({
            "id": vid,
            "category": "structural",
            "category_name": "Structural stage (not a RAND vector)",
            "name": name,
            "source": "structural",
            "rand_feasibility": None,
            "structural_p": {f"oc{i}": 1.0 for i in range(1, 6)},
            "assumption": True,
            "assumption_note": STRUCT_NOTE,
            "description": desc,
            "source_ref": None,
            "stage": st,
            "stages_skipped": [],
            "headline": True,
        })
    return out
