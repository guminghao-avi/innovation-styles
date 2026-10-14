"""潜水戴夫风的声音：水下底噪 + 气泡 + 明快的游戏提示音（登场 whoosh、手电 clunk、"!" pop、GET! jingle、金币 coin）。"""
import json, os, sys
D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(D, "..", "..", "scripts"))
from timeref import Resolver
T = Resolver(D).time
fx = []
def add(**c): fx.append(c)
end = T("c2.end") + 1.2
add(type="underwater", t0=0, t1=end, gain=-24)
add(type="splash", t=0.15, size=.4, gain=-24, verb=.2)                          # 第 0 秒：扑通下水（钩子）
add(type="whoosh", t=T("intro") + .2, dur=.5, dir=1, gain=-20)                   # 登场卡扫进来
add(type="bubbles", t=[1.5, 3.2, T("dive") + .4, T("deep"), T("b2"), T("c1")], n=4, spread=.4, gain=-28, verb=.3)
add(type="whoosh", t=T("dive") + .5, dur=1.6, dir=-1, gain=-28, verb=.4)          # 往下潜
add(type="clunk", t=T("torch"), gain=-22, verb=.2)                               # 手电开关
add(type="pop", t=T("torch") + .35, pitch=1.4, gain=-20)                          # 头顶的 "!"
add(type="jingle", t=T("card"), notes="C5 E5 G5 C6 E6", inst="marimba", step=.06, gain=-14, verb=.3)
add(type="pop", t=T("card") + .25, pitch=1.8, gain=-24)                           # NEW 角标
add(type="coin", t=T("card") + .9, gain=-18, verb=.2)
json.dump({"end": round(end, 3), "lufs": -14, "music": [{"type": "air", "t0": 0, "t1": end - .1, "tone": .2, "gain": -34}], "sfx": fx}, open(os.path.join(D, "sound.json"), "w"), ensure_ascii=False, indent=1)
print(len(fx), "cues")
