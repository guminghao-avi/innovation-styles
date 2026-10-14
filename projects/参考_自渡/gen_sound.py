"""生成 sound.json：只有音效（+ 极轻的空气底噪），没有配乐、没有配音。像素风：游戏 UI 音（tick / glitch / ding）+ 夜海。
用法：.venv/bin/python projects/自渡/gen_sound.py && .venv/bin/python scripts/sound.py 自渡
"""
import json, os, re, sys
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(D, '..', '..', 'scripts'))
from timeref import Resolver
T = Resolver(D).time
fx, mu = [], []
def add(**c): fx.append(c)
r3 = lambda x: round(x, 3)
end = r3(T('end') + 8.5)
mu.append(dict(type='air', t0=0, t1=end - .1, tone=.0, gain=-42))

# ---------- 菜单「谁能救我？」 ----------
add(type='tick', t=[r3(-.12 + n * .114) if n else 0.0 for n in range(1, 6)], pitch=1.8, gain=-24)      # 标题逐字
add(type='tick', t=[r3(.4 + i * .06) for i in range(5)], pitch=1.3, gain=-30)                           # 选项弹出
stops = [T('opt1'), T('opt2'), T('opt3'), T('opt4'), T('lock')]
add(type='tick', t=[r3(s - .3) for s in stops[1:]], pitch=1.1, gain=-27)                                  # 光标移动
for i, s in enumerate(stops[:4]):
    add(type='glitch', t=r3(s), dur=.18, gain=-25)
    add(type='tick', t=r3(s + .02), pitch=.55, gain=-24)
    add(type='alarm', t=r3(s + .01), pitch=1.6, gain=-38, verb=.2)
lk = T('lock')
add(type='clunk', t=r3(lk), gain=-28, verb=.3)
add(type='alarm', t=r3(lk + .05), pitch=.85, gain=-28, verb=.4)
cl = T('close')
add(type='tick', t=[r3(cl), r3(cl + .18)], pitch=.9, gain=-28)
add(type='whoosh', t=r3(cl + .2), dur=.4, dir=-1, gain=-32, verb=.2)

# ---------- 夜海 ----------
ir = T('iris')
add(type='swell', t=r3(ir + .2), dur=1.1, note='D3', gain=-31, verb=.6)
add(type='waves', t0=r3(ir), t1=end, rate=.12, gain=-27, verb=.3)
add(type='wind', t0=r3(ir + .3), t1=end, gust=.35, gain=-41)
hud = ir + .9
add(type='tick', t=[r3(hud), r3(hud + .15), r3(hud + .27), r3(hud + .39)], pitch=1.5, gain=-30)

# 天数飞涨：一串越来越密的 tick + 快进的倒带声
r0, r1 = T('roll0'), T('roll1')
add(type='tape', t=r3(r0), dur=.5, gain=-32)
ts, t = [], r0
while t < r1:
    ts.append(r3(t)); u = (t - r0) / (r1 - r0)
    t += .16 - .12 * min(1, (u * (1 - u) * 4) ** .7)
add(type='tick', t=ts, pitch=1.65, gain=-35)

# 挥灯发信号：每一下一个音，越来越高（越来越用力）
sig = T('sig')
for i, n in enumerate(['A5', 'B5', 'D6', 'E6']):
    f = sig + i * .62
    add(type='ding', t=r3(f), note=n, gain=-24, verb=.65)
    add(type='whoosh', t=r3(f - .05), dur=.3, dir=1 if i % 2 else -1, gain=-36, verb=.2)
add(type='shimmer', t=r3(sig + .3), dur=2.2, gain=-36)
# 回应 0：红字闪两下
nr = T('noReply')
for j in range(3):
    add(type='tick', t=r3(nr + j * .4), pitch=.6, gain=-28)
add(type='glitch', t=r3(nr), dur=.25, gain=-31)
add(type='swell', t=r3(nr + .6), dur=2.4, note='A2', gain=-33, verb=.7)      # 船走远，很低的一声

# ---------- 片名 ----------
add(type='whoosh', t=r3(T('tilt') + 1.2), dur=1.8, dir=1, gain=-36, verb=.4)
sl = T('slam')
add(type='reverse', t=r3(sl), dur=1.4, note='D4', gain=-27)
add(type='impact', t=r3(sl), size=.2, gain=-25, verb=.5)
add(type='clunk', t=r3(sl), gain=-24, verb=.5)
add(type='ding', t=r3(sl + .02), note='D5', gain=-24, verb=.8)
add(type='ding', t=r3(sl + .05), note='A5', gain=-26, verb=.8)
add(type='shimmer', t=r3(sl + .1), dur=2.4, gain=-31)
add(type='tick', t=[r3(sl + .7 + i * .8 / 21) for i in range(0, 21, 2)], pitch=1.9, gain=-36)  # 英文副标题
add(type='whoosh', t=r3(T('down') + .9), dur=1.4, dir=-1, gain=-34, verb=.3)
add(type='tick', t=r3(T('stand')), pitch=.8, gain=-27)
add(type='steps', t0=r3(T('stand') - .05), t1=r3(T('stand') + .35), rate=4, gain=-34)

# 捞到木板 → 状态改写
gb = T('grab')
add(type='splash', t=r3(gb - .05), size=.3, gain=-27, verb=.3)
add(type='ding', t=r3(gb + .05), note='E6', gain=-22, verb=.5)
add(type='ding', t=r3(gb + .17), note='B6', gain=-26, verb=.5)
rd = T('ready')
add(type='glitch', t=r3(rd), dur=.15, gain=-31)
add(type='tick', t=[r3(rd + .25 + i * .45 / 4) for i in range(4)], pitch=1.8, gain=-28)
add(type='ding', t=r3(rd + .75), note='A5', gain=-25, verb=.7)


# ======================================================================
# 第二段：捡木板 → 合成 → 下水就沉 → 捞回来 → Lv.2
# ======================================================================
PENTA = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6', 'A6', 'B6', 'D7', 'E7']
lerp = lambda a, b, u: a + (b - a) * u
def knock(t, g=-25): add(type='tick', t=r3(t), pitch=.5, gain=g); add(type='tick', t=r3(t + .03), pitch=.33, gain=g - 4)   # 木头"咚"
def row(t0, t1, rate=1.1, g=-35):                     # 划桨：每一下一个小水花
    t = t0
    while t < t1: add(type='splash', t=r3(t), size=.12, gain=g, verb=.2); t += 1 / rate
add(type='tick', t=r3(T('dIn')), pitch=.9, gain=-30)                                   # 镜头拉近
knock(T('d1') + 1.1)
ENV = [T('env1') + i * .55 for i in range(4)]
for i, e in enumerate(ENV):
    add(type='whoosh', t=r3(e + .15), dur=.35, dir=1, gain=-33, verb=.2)
    add(type='splash', t=r3(e + .7), size=.22, gain=-30, verb=.3)
    add(type='bubbles', t=r3(e + .85), n=5, spread=.6, gain=-31, verb=.3)
    add(type='tick', t=r3(e + .95), pitch=.7, gain=-31)                                 # 未回复
ge = T('env5')
add(type='whoosh', t=r3(ge + .2), dur=.4, dir=1, gain=-30, verb=.3)
add(type='splash', t=r3(ge + .8), size=.3, gain=-28, verb=.3)
add(type='shimmer', t=r3(ge + .85), dur=1.2, gain=-33)
add(type='whoosh', t=r3(ge + 1.6), dur=.6, dir=-1, gain=-33, verb=.3)
PLANK_IN = [T('d1') + 1.1, T('env5') + 2.1, T('d6.end') + .3, T('d7.end') + .1, T('wake') + .1] + [lerp(T('rush'), T('rushEnd'), i / 6) for i in range(7)]
for i, p in enumerate(PLANK_IN[1:]):
    knock(p, -27); add(type='ding', t=r3(p + .02), note=PENTA[i], gain=-29, verb=.5)
for i, p in enumerate(PLANK_IN[5:]): add(type='whoosh', t=r3(p - .3), dur=.4, dir=1 if i % 2 else -1, gain=-37, verb=.2)
# 获得物品提示
for tt in [PLANK_IN[1], PLANK_IN[2], T('d7.end') - .4, PLANK_IN[4]]: add(type='ding', t=r3(tt + .05), note='A6', gain=-30, verb=.6)
# 年度目标 → 一天一格
go, gr = T('goals'), T('grid')
add(type='paper', t=r3(go), dur=.5, gain=-30)
add(type='tick', t=[r3(go + .15 + i * .1) for i in range(4)], pitch=1.4, gain=-31)
add(type='glitch', t=r3(go + .6), dur=.12, gain=-34)
add(type='whoosh', t=r3(gr + .15), dur=.4, dir=-1, gain=-34, verb=.2)
add(type='tick', t=[r3(gr + .4 + i * .13) for i in range(12)], pitch=1.9, gain=-29)
add(type='paper', t=r3(T('d6.end') + .1), dur=.4, gain=-32)
# 学东西、睡一觉
add(type='paper', t=r3(T('learn')), dur=.7, gain=-29)
add(type='paper', t=r3(T('learn') + .8), dur=.5, gain=-32)
sl, wk = T('sleep'), T('wake')
add(type='swell', t=r3(sl + .2), dur=1.2, note='A3', gain=-33, verb=.6)
add(type='tick', t=[r3(sl + .3 + i * (wk - sl - .4) / 8) for i in range(9)], pitch=1.2, gain=-36)    # 体力条
add(type='ding', t=r3(wk - .05), note='D6', gain=-27, verb=.6)
# 集齐 → 合成 Lv.1
re_ = T('rushEnd') + .1
add(type='ding', t=r3(re_), note='D5', gain=-25, verb=.7); add(type='ding', t=r3(re_ + .03), note='A5', gain=-27, verb=.7)
add(type='shimmer', t=r3(re_), dur=1.2, gain=-33)
CRAFT = [lerp(T('craft'), T('craftEnd') - .25, i / 11) for i in range(12)]
for c in CRAFT: knock(c, -31)
ce = T('craftEnd')
for j, n in enumerate(['D5', 'F#5', 'A5', 'D6']): add(type='ding', t=r3(ce + j * .03), note=n, gain=-26, verb=.7)
add(type='shimmer', t=r3(ce), dur=1.6, gain=-31)
# 下水 → 裂 → 沉
la = T('launch')
add(type='whoosh', t=r3(la + .15), dur=.4, dir=1, gain=-31, verb=.2); add(type='splash', t=r3(la + .35), size=.3, gain=-28, verb=.3)
row(la + .6, T('crack') + .9)
for c in [T('crack'), T('crack') + .6, T('crack') + 1.0]:
    knock(c, -23); add(type='glitch', t=r3(c + .02), dur=.1, gain=-33)
sk = T('sink')
add(type='splash', t=r3(sk + .2), size=.85, gain=-19, verb=.35)
add(type='bubbles', t=r3(sk + .5), n=12, spread=1.2, gain=-27, verb=.3)
add(type='whoosh', t=r3(sk), dur=.6, dir=-1, gain=-29, verb=.3)
add(type='alarm', t=r3(T('e3') - .12), pitch=.8, gain=-26, verb=.4)
add(type='glitch', t=r3(T('e3') - .12), dur=.25, gain=-29)
t_ = T('swim')
while t_ < T('ashore') - .2: add(type='splash', t=r3(t_), size=.1, gain=-34, verb=.2); t_ += .42
add(type='splash', t=r3(T('ashore')), size=.25, gain=-29, verb=.3)
add(type='tick', t=[r3(T('ashore') + .2 + i * .27) for i in range(8)], pitch=2.0, gain=-38)          # 滴水
FETCH = [lerp(T('fetch'), T('e5.end') + .9, i / 11) for i in range(12)]
for i, c in enumerate(FETCH): knock(c, -30); add(type='ding', t=r3(c + .02), note=PENTA[i % 6], gain=-34, verb=.4)
# 敲钉子 → Lv.2
t_ = T('rebuild')
while t_ < T('lv2') - .1:
    add(type='tick', t=r3(t_), pitch=.75, gain=-26); add(type='tick', t=r3(t_ + .01), pitch=1.5, gain=-30); t_ += .4
lv = T('lv2')
for j, n in enumerate(['D5', 'F#5', 'A5', 'D6', 'F#6']): add(type='ding', t=r3(lv + j * .03), note=n, gain=-25, verb=.7)
add(type='shimmer', t=r3(lv), dur=1.8, gain=-30)
add(type='splash', t=r3(T('board') + .4), size=.3, gain=-29, verb=.3)
row(T('board') + .6, T('fIn'))
add(type='reverse', t=r3(T('fIn')), dur=.8, note='A4', gain=-32)

# ======================================================================
# 第三段：暴雨
# ======================================================================
fI = T('fIn')
add(type='whoosh', t=r3(fI + .3), dur=.6, dir=1, gain=-32, verb=.3)
row(fI + .3, T('f2'), 1.0)
add(type='wind', t0=r3(T('f1') - 1), t1=r3(T('clear') + 2), gust=.85, gain=-29)
add(type='rain', t0=r3(T('rain0')), t1=r3(T('clear') + 2.2), density=1, gain=-23)
add(type='waves', t0=r3(T('f1')), t1=r3(T('clear') + 2), rate=.2, gain=-27, verb=.2)
for i, (f, near) in enumerate(zip([T('f1.end') + .3, T('f3') + .5, T('f3@砸下') - .1, T('f4') + 1.4], [.4, .7, .9, .3])):
    add(type='thunder', t=r3(f), near=near, gain=-21 if near > .6 else -25)
WT = [T('words') + d for d in [0, .45, .95, 1.6, 2.15, 2.6]]
for i, w in enumerate(WT):
    add(type='whoosh', t=r3(w + .35), dur=.4, dir=-1, gain=-31, verb=.2)
    knock(w + .45, -22); add(type='splash', t=r3(w + .46), size=.35, gain=-27, verb=.3); add(type='glitch', t=r3(w + .45), dur=.08, gain=-34)
add(type='alarm', t=r3(WT[3] + .5), pitch=.7, gain=-27, verb=.3)
add(type='alarm', t=r3(WT[3] + 1.6), pitch=.7, gain=-29, verb=.3)
fw = T('flow')
add(type='underwater', t0=r3(fw), t1=r3(T('dry') + .6), gain=-29)
for i in range(6): add(type='bubbles', t=r3(fw + .2 + i * .22), n=6, spread=.5, gain=-30, verb=.3)
add(type='swell', t=r3(fw + .8), dur=2.6, note='D4', gain=-28, verb=.7)
add(type='ding', t=r3(T('dry')), note='A5', gain=-27, verb=.7)
rw = T('row')
add(type='ding', t=r3(rw), note='D6', gain=-24, verb=.6); add(type='whoosh', t=r3(rw + .1), dur=.5, dir=1, gain=-30, verb=.3)
row(rw + .2, T('g2'), 1.1, -33)
add(type='shimmer', t=r3(T('clear') + .4), dur=2.4, gain=-33)
add(type='swell', t=r3(T('clear') + 1.4), dur=2.6, note='A3', gain=-31, verb=.7)

# ======================================================================
# 第四段：别的岛上也亮着灯 → 绳 → 开口 → 航道
# ======================================================================
add(type='tick', t=r3(T('g2') + .25), pitch=.9, gain=-28)
add(type='crickets', t0=r3(T('g2') + .3), t1=r3(T('dawn') + 1), n=3, gain=-42)
for i, n in enumerate(['D5', 'E5', 'F#5', 'A5', 'B5', 'D6']):
    add(type='ding', t=r3(T('lamps') + i * .32), note=n, gain=-25, verb=.7, pan=round(-.5 + i * .2, 2))
add(type='shimmer', t=r3(T('lamps') + .5), dur=2, gain=-33)
t_ = T('build')
while t_ < T('neighbor') + .5: add(type='tick', t=r3(t_), pitch=.8, gain=-35, pan=.6); t_ += .5
row(T('neighbor') + .6, T('rope') - .2, 1.1, -36)
ro = T('rope')
add(type='whoosh', t=r3(ro + .25), dur=.5, dir=-1, gain=-29, verb=.2)
knock(ro + .5, -28)
add(type='ding', t=r3(ro + .6), note='A5', gain=-28, verb=.5)
add(type='tick', t=[r3(T('ask') + i * .9 / 7) for i in range(7)], pitch=1.7, gain=-29)
rp = T('reply')
add(type='tick', t=[r3(rp + i * .35 / 3) for i in range(3)], pitch=2.0, gain=-28)
add(type='ding', t=r3(rp + .02), note='E6', gain=-22, verb=.6); add(type='ding', t=r3(rp + .14), note='B6', gain=-25, verb=.6)
add(type='ding', t=r3(rp + .55), note='A6', gain=-29, verb=.6)
add(type='shimmer', t=r3(T('g8')), dur=2.2, gain=-32)
for i, n in enumerate(['D5', 'F#5', 'A5', 'D6', 'F#6']): add(type='ding', t=r3(T('path') + i * .32), note=n, gain=-24, verb=.75)
add(type='swell', t=r3(T('path') + 1.4), dur=2.2, note='D4', gain=-28, verb=.7)
add(type='swell', t=r3(T('dawn') + 1.6), dur=3.2, note='D3', gain=-29, verb=.7)
add(type='shimmer', t=r3(T('dawn') + 1), dur=3, gain=-34)

# ======================================================================
# 最后一段：「我自己」→ 桨 → 片名
# ======================================================================
add(type='whoosh', t=r3(T('you') + .3), dur=.6, dir=1, gain=-33, verb=.3)
m2 = T('menu2')
add(type='tick', t=[r3(m2 + .1 + i * .1) for i in range(5)], pitch=1.8, gain=-26)
add(type='tick', t=[r3(m2 + .3 + i * .06) for i in range(5)], pitch=1.3, gain=-31)
add(type='tick', t=r3(m2 + 1.0), pitch=1.1, gain=-27)
pr = T('h4@最后') - .1
add(type='clunk', t=r3(pr), gain=-28, verb=.3); add(type='tick', t=r3(pr), pitch=.55, gain=-25)
un = T('unlock')
add(type='glitch', t=r3(un - .5), dur=.45, gain=-30)
add(type='reverse', t=r3(un), dur=1.2, note='D5', gain=-27)
add(type='snip', t=r3(un), gain=-22, verb=.4)
add(type='impact', t=r3(un), size=.2, gain=-26, verb=.5)
for j, n in enumerate(['D5', 'A5', 'D6', 'F#6']): add(type='ding', t=r3(un + .45 + j * .04), note=n, gain=-23, verb=.8)
add(type='shimmer', t=r3(un + .3), dur=2.4, gain=-29)
rs_ = T('rise')
add(type='tick', t=[r3(rs_ - .1), r3(rs_ + .08)], pitch=.9, gain=-28)
add(type='steps', t0=r3(rs_ - .05), t1=r3(rs_ + .3), rate=4, gain=-33)
add(type='fire', t0=r3(rs_ + .3), t1=r3(rs_ + 1.6), rate=30, gain=-30)
add(type='ding', t=r3(rs_ + .32), note='A5', gain=-25, verb=.6)
cu = T('closeup')
add(type='whoosh', t=r3(cu), dur=.5, dir=1, gain=-32, verb=.3)
add(type='tick', t=[r3(cu + .9 + i * .17) for i in range(3)], pitch=1.8, gain=-30)
row(cu + .2, T('end'), .9, -30)
add(type='swell', t=r3(T('h6') + .6), dur=2.4, note='D4', gain=-27, verb=.7)
en = T('end') + .5
add(type='reverse', t=r3(en), dur=1.4, note='D4', gain=-27)
add(type='impact', t=r3(en), size=.25, gain=-24, verb=.5)
add(type='clunk', t=r3(en), gain=-26, verb=.5)
for j, n in enumerate(['D5', 'F#5', 'A5', 'D6']): add(type='ding', t=r3(en + .02 + j * .03), note=n, gain=-24, verb=.85)
add(type='shimmer', t=r3(en + .1), dur=3, gain=-31)
add(type='tick', t=[r3(en + 1.2 + i * 1.4 / 12) for i in range(12)], pitch=1.9, gain=-34)
row(T('end'), end - 1.5, 1.1, -36)

# ---------- 字幕：极轻的打字声 ----------
tim = json.load(open(os.path.join(D, 'vo.timing.json'), encoding='utf-8'))
for ln in tim['lines']:
    n = len(re.sub(r'[\s，。、；：！？“”「」—*]', '', ln['text']))
    add(type='type', t0=r3(ln['t0']), t1=r3(ln['t0'] + len(ln['text'].replace('**', '').replace('「', '').replace('」', '')) * .032), rate=24, gain=-40)

json.dump({'end': end, 'lufs': -14, 'music': mu, 'sfx': fx}, open(os.path.join(D, 'sound.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(fx), 'cues, end', end)
