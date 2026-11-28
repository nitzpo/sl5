import json,re,sys
V=json.load(open(sys.argv[1]))
# Ground truth from PDF layout (pdftotext -layout of RAND_RRA2849-1.pdf, pp.15-17)
truth = [
("Running Unauthorized Code","Exploiting vulnerabilities for which a patch exists (attacking non-updated software)",[3,4,4,5,5],False),
("Running Unauthorized Code","Exploiting reported but not (fully) patched vulnerabilities",[2,2,3,4,5],False),
("Running Unauthorized Code","Finding and exploiting individual zero-days",[1,2,4,5,5],False),
("Running Unauthorized Code","Direct access to zero-days at scale",[1,1,2,4,5],False),
("Compromising Existing Credentials","Social engineering",[3,4,5,5,5],True),
("Compromising Existing Credentials","Password brute-forcing and cracking",[2,2,3,3,4],True),
("Compromising Existing Credentials","Exploitation of exposed credentials",[3,3,4,5,5],False),
("Compromising Existing Credentials","Expanding illegitimate access (e.g., escalating privileges)",[2,3,5,5,5],False),
("Undermining the Access Control System Itself","Encryption/authentication vulnerabilities (in the access control system)",[1,1,2,3,3],False),
("Undermining the Access Control System Itself","Intentional backdoors in algorithms, protocols, or products (in the access control system)",[1,1,1,2,2],False),
("Undermining the Access Control System Itself","Code vulnerabilities (in the access control system)",[1,1,2,3,4],False),
("Undermining the Access Control System Itself","Access to secret material undermining a protocol",[1,1,2,2,3],False),
("Bypassing Primary Security System Altogether","Incorrect configuration or security policy implementation",[2,2,3,3,3],False),
("Bypassing Primary Security System Altogether","Additional (less secure) copies of sensitive data",[2,2,3,5,5],False),
("Bypassing Primary Security System Altogether","Alternative (less secure) authentication or access schemes",[1,1,2,3,4],False),
("AI-Specific Attack Vectors","Discovering existing vulnerabilities in the ML stack",[1,2,4,4,5],True),
("AI-Specific Attack Vectors","Intentional ML supply chain compromise",[1,2,4,5,5],True),
("AI-Specific Attack Vectors","Prompt-triggered code execution",[2,3,4,4,4],True),
("AI-Specific Attack Vectors","Model extraction",[1,1,1,2,3],True),
("AI-Specific Attack Vectors","Model distillation",[1,1,2,2,3],True),
("Nontrivial Access to Data or Networks","Digital access to air-gapped networks",[1,1,2,2,4],False),
("Nontrivial Access to Data or Networks","Side-channel attacks (including through leaked emanations; i.e., TEMPEST attacks)",[1,1,1,2,3],False),
("Nontrivial Access to Data or Networks","Eavesdropping and wiretaps",[1,1,2,4,5],False),
("Unauthorized Physical Access to Systems","Direct physical access to sensitive systems",[1,1,3,3,4],False),
("Unauthorized Physical Access to Systems","Malicious placement of portable devices",[2,2,4,4,4],False),
("Unauthorized Physical Access to Systems","Physical access to devices in other locations",[1,1,3,4,5],False),
("Unauthorized Physical Access to Systems","Evasion of physical access control systems",[1,1,1,3,5],False),
("Unauthorized Physical Access to Systems","Penetration of physical hardware security",[1,1,1,2,3],False),
("Unauthorized Physical Access to Systems","Armed break-in",[1,1,1,2,4],False),
("Unauthorized Physical Access to Systems","Military takeover",[1,1,1,1,2],False),
("Supply Chain Attacks","Services and equipment the organization uses",[1,2,4,5,5],False),
("Supply Chain Attacks","Code and infrastructure incorporated into the codebase",[1,2,4,5,5],False),
("Supply Chain Attacks","Vendors with access to information",[1,1,2,3,4],False),
("Human Intelligence","Bribes and cooperation",[1,1,4,4,5],False),
("Human Intelligence","Extortion",[1,1,4,4,5],False),
("Human Intelligence","Candidate placement",[1,1,1,3,5],False),
("Human Intelligence","Organizational leverage attacks",[1,1,1,3,5],False),
("Human Intelligence","Organizationally approved access",[1,1,2,3,5],False),
]
rand=[v for v in V if v.get('source')=='rand']
print("rand vectors:",len(rand),"total:",len(V))
issues=0
for i,(cat,name,sc,star) in enumerate(truth):
    if i>=len(rand): print("MISSING",name); issues+=1; continue
    v=rand[i]
    f=v['rand_feasibility']; s=[f['oc%d'%k] for k in range(1,6)]
    probs=[]
    if v['name']!=name: probs.append(f"name {v['name']!r} != {name!r}")
    if v['category_name']!=cat: probs.append(f"cat {v['category_name']!r}")
    if s!=sc: probs.append(f"scores {s} != {sc}")
    if v.get('rapidly_changing')!=star: probs.append(f"star {v.get('rapidly_changing')} != {star}")
    if probs: issues+=1; print(v['id'],probs)
print("issues:",issues)
nine=[v['id'] for v in rand if all(v['rand_feasibility']['oc%d'%k]==1 for k in (1,2,3)) and max(v['rand_feasibility']['oc4'],v['rand_feasibility']['oc5'])>1]
print("1 at OC1-3 and >1 at OC4/5:",len(nine),nine)
# other fields
for v in V:
    extra=set(v)-{'id','category','category_name','name','source','rand_feasibility','rapidly_changing','description','source_ref','appendix_a_ref','transcription_note'}
    if extra: print(v['id'],sorted(extra))
