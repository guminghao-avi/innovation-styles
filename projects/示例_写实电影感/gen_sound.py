"""写实电影感的声音：一句含糊人声（mumble）当母题 + 低语层层叠起 → 抽空 → 真的回声 → 黎明 swell。"""
import json, os, sys
D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(D, "..", "..", "scripts"))
from timeref import Resolver
T = Resolver(D).time
fx = []
def add(**c): fx.append(c)
end = T("title") + 7.6
add(type="mumble", t=T("say"), rate=1, muffle=7500, gain=-10, verb=.3, space="hall")   # 第 0 秒：那句话（钩子）
for i in range(10): add(type="mumble", t=round(T("storm") + (i / 10) ** .7 * 2.6, 3), rate=round(1.3 + i * .35, 2), drive=round(i / 9, 2), muffle=4000, gain=-16 - i * .4, verb=.2)
add(type="whisper", t0=T("storm") - .2, t1=T("calm"), n0=2, n1=10, gain=-18)
add(type="mumble", t=T("last"), rate=1.96 / 2.1, muffle=9000, gain=-11, verb=.3, space="hall")
for j, (d, g, mf) in enumerate([(.55, -18, 5000), (1.1, -24, 3500), (1.65, -30, 2500)]): add(type="mumble", t=round(T("last") + d, 3), rate=1.96 / 2.1, muffle=mf, gain=g, pan=.3 * (1 if j % 2 else -1), verb=.5, space="hall")
add(type="swell", t=T("title"), dur=4, note="D4", gain=-24, verb=.5)
add(type="boom", t=T("title") + .3, note="A0", gain=-30)
json.dump({"end": round(end, 3), "lufs": -14, "music": [{"type": "air", "t0": 0, "t1": end - .1, "tone": .2, "gain": -33}], "sfx": fx,
  "mute": [[round(T("calm") + .05, 3), round(T("last") - .4, 3)]]}, open(os.path.join(D, "sound.json"), "w"), ensure_ascii=False, indent=1)
print(len(fx), "cues")
