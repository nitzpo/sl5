import json
import os


def load(repo, new_blocks):
    data = os.path.join(repo, "app/public/data")
    names = {}
    for fn in sorted(os.listdir(data)):
        if fn.startswith("blocks-") and fn.endswith(".json"):
            for b in json.load(open(os.path.join(data, fn))):
                names[b["id"]] = (b["name"], b["defense_type"])
    for bid, (name, typ, _c) in new_blocks.items():
        names[bid] = (name, typ)
    return names
