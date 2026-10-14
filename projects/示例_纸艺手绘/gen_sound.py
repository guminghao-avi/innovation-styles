"""纸艺手绘的声音：纸（slap / paper / scribble）+ 卡通 pop；每张纸条落下一个 slap，飞走一串 paper。"""
import json, os, sys
D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(D, "..", "..", "scripts"))
from timeref import Resolver
T = Resolver(D).time
fx = []
def add(**c): fx.append(c)
end = T("title") + 4.2
add(type="slap", t=0.05, size=1.2, gain=-14)                        # 第 0 秒：日历页拍下来（钩子）
add(type="scribble", t=0.5, dur=.6, gain=-22)                       # 红笔圈"今天"
arrive = [T("pile")] + [T("a2") + .5 + i * .7 for i in range(3)] + [T("b1") + i * .55 for i in range(6)]
for i, a in enumerate(arrive): add(type="slap", t=round(a, 3), size=.6, gain=-20 - (i > 3) * 2, pan=.25)
add(type="pop", t=T("hide"), pitch=.8, gain=-18)
add(type="paper", t=[round(T("go") + .3 + i * .16, 3) for i in range(0, 9, 2)], dur=.4, gain=-24, pan=.3)
add(type="pop", t=T("go") + .2, pitch=1.3, gain=-18)
for i in range(4): add(type="slap", t=round(T("title") + i * .17, 3), size=.9, gain=-17)
json.dump({"end": round(end, 3), "lufs": -14, "music": [{"type": "air", "t0": 0, "t1": end - .1, "tone": .25, "gain": -34}], "sfx": fx}, open(os.path.join(D, "sound.json"), "w"), ensure_ascii=False, indent=1)
print(len(fx), "cues")
