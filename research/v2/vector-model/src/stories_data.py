# The 7 existing chains re-expressed as ordered vectors on one route each (illustrative stories only).
# steps: (phase as in attack-chains.json, [vector ids]); an empty list = no vector fits that step.
# V-X-* are structural stage vectors (not RAND).

STORIES = [
    {
        "id": "quiet-tap",
        "steps": [("Infiltration", ["V-HUM-1", "V-PHYS-1"]), ("Implant", ["V-PHYS-1"]),
                  ("Capture", ["V-NET-3"]), ("Retrieval", ["V-X-4"])],
        "fit_note": "RAND has no vector for an interposer on the accelerator fabric; it straddles physical access "
                    "and wiretaps, whose RAND scores describe network links, not in-rack fabrics.",
    },
    {
        "id": "poisoned-chip",
        "steps": [("Compromise", ["V-ML-2"]), ("Delivery", ["V-SUP-1"]), ("Activation", []),
                  ("Exfiltration", ["V-NET-1"])],
        "fit_note": "HW-04 is a misfit stopper: chip tamper protection detects physical attack in operation, not "
                    "fab-time implants. The covert RF exfiltration is V-NET-1, so shielding (PHY-02, HW-05) carries it.",
    },
    {
        "id": "alignment-researcher",
        "steps": [("Misalignment", ["V-SELF-2"]), ("Extraction", ["V-SELF-5", "V-SELF-8"]),
                  ("Encoding", ["V-SELF-4"]), ("Exfiltration", ["V-SELF-8"])],
        "fit_note": "Distilled data (V-SELF-8), not terabytes of weights, is the realistic payload; stego (V-SELF-4) "
                    "is residual. NET-01 is a misfit (permitted outputs cross the gap); AI-06 responds but counters no step.",
    },
    {
        "id": "zero-day-cascade",
        "steps": [("Initial access", ["V-CODE-3"]), ("Persistence", ["V-CODE-3", "V-CRED-4"]),
                  ("Capture", ["V-ML-1"]), ("Exfiltration", ["V-X-3"])],
        "fit_note": "Good fit. The internet-facing gateway exists because the model is served; RAND exempts "
                    "production serving from full isolation, so NET-01 removes it only if serving is split from training.",
    },
    {
        "id": "long-game",
        "steps": [("Recruitment", ["V-HUM-1"]), ("Access", ["V-HUM-1"]), ("Extraction", ["V-X-1", "V-BYP-2"]),
                  ("Delivery", ["V-X-4"])],
        "fit_note": "Blends recruiting a current employee (V-HUM-1) with passing hiring vetting (V-HUM-3). PER-05 "
                    "acts after the weights have left; PER-06, KEY-01 and CUS-01 at the reach stage are the stoppers.",
    },
    {
        "id": "remote-ghost",
        "steps": [("Reachability", ["V-BYP-3"]), ("Entry", ["V-CODE-2"]), ("Capture", ["V-CRED-4"])],
        "fit_note": "Good fit (RAND also files AMT-style management firmware under V-SUP-1). HW-07 is overstated: a "
                    "BMC can reflash firmware and control power, so PER-08 and HW-09 are the robust stoppers.",
    },
    {
        "id": "patient-distillation",
        "steps": [("Setup", ["V-ML-5"]), ("Extraction", ["V-ML-5"]), ("Accumulation", ["V-ML-5"]),
                  ("Distillation", [])],
        "fit_note": "Now on its own capability meter. RAND scores V-ML-5 at 1 for OC2, the chain's min_oc. NET-04 is "
                    "a misfit (distillation needs gigabytes); NET-01 here is a serving decision, not a control.",
    },
]
