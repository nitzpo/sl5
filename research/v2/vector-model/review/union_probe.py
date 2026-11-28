import json,sys
from collections import defaultdict
# research/v2 copy: skip the structural V-X-* stage placeholders added in revision 2, so this
# reproduces the reviewer's revision-1 result (OC1 0.96 against an undefended lab).
V=[v for v in json.load(open(sys.argv[1]+'/vectors.json')) if 'structural_p' not in v]
mid={1:0.1,2:0.3,3:0.5,4:0.7,5:0.9}
def s(v,t):
    return v['rand_feasibility']['oc%d'%t] if v['rand_feasibility'] else v['ai_feasibility']['ac%d'%t]
for mult,label in ((1.0,'no defenses (SL1 victim)'),(0.3,'every vector strongly countered (x0.3)'),(0.1,'every vector x0.1')):
    row=[]
    for t in range(1,6):
        best=defaultdict(float)
        for v in V: best[v['category']]=max(best[v['category']],mid[s(v,t)]*mult)
        p=1
        for c,x in best.items(): p*=1-x
        row.append(round(1-p,2))
    print(f"{label:45}", row, "categories:",len(best))
# floor: all categories at score 1
print("10 categories all at score-1 midpoint 0.1 -> union", round(1-0.9**10,2))
