"""自渡风的声音：夜海底噪 + 像素游戏音（菜单 tick、划掉 glitch、获得物品 jingle、片名 impact）。只配关键节点。"""
import json, os, sys
D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(D, "..", "..", "scripts"))
from timeref import Resolver
T = Resolver(D).time
fx = []
def add(**c): fx.append(c)
end = T("slam") + 4
add(type="underwater", t0=T("world") - .2, t1=end, gain=-24)            # 远处的海（闷）
for o in ("opt1", "opt2", "opt3"): add(type="glitch", t=T(o), dur=.12, gain=-24)   # 选项被划掉
add(type="tick", t=[0.15, 0.25, 0.35, 0.45, 0.55], pitch=1.8, gain=-30)            # 菜单标题打字的"哔"
add(type="whoosh", t=T("world") + .3, dur=.8, dir=1, gain=-26, verb=.3)           # iris 打开
add(type="tick", t=[T("roll0") + i * .12 for i in range(14)], pitch=1.3, gain=-34)  # 天数滚动
add(type="splash", t=T("plank") + .4, size=.25, gain=-30, verb=.3)
add(type="jingle", t=T("grab"), notes="E5 G5 B5 E6", inst="pluck", gain=-20, verb=.3)
add(type="impact", t=T("slam"), size=.6, gain=-21)
add(type="shimmer", t=T("slam") + .1, dur=1.5, gain=-30)
json.dump({"end": round(end, 3), "lufs": -14, "music": [{"type": "air", "t0": 0, "t1": end - .1, "tone": .15, "gain": -33}], "sfx": fx}, open(os.path.join(D, "sound.json"), "w"), ensure_ascii=False, indent=1)
print(len(fx), "cues")
