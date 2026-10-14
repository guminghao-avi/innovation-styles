"""生成 sound.json：只有音效（+ 极轻的空气底噪），没有配乐、没有配音。
画面里的事件时刻（墨滴入水、话沉下、鱼绕一圈、灯落水、倒影破水、重逢……）在这里用同一套公式重算。
用法：.venv/bin/python projects/那我呢/gen_sound.py && .venv/bin/python scripts/sound.py 那我呢
"""
import json, math, os, sys
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(D, '..', '..', 'scripts'))
from timeref import Resolver
T = Resolver(D).time
fx, mu = [], []
def add(**c): fx.append(c)
r3 = lambda x: round(x, 3)
seg = lambda t, a, b: max(0., min(1., (t - a) / (b - a)))
end = T('h3.end') + 9
mu.append(dict(type='air', t0=0, t1=end - .1, tone=.0, gain=-41))
PENTA = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6', 'A6']

# ---------- 墨 ----------
add(type='underwater', t0=0, t1=T('c1') - .2, gain=-39)
add(type='whoosh', t=2.6, dur=1.4, dir=1, gain=-34, verb=.4)
d, sw = T('drop'), T('sweep')
add(type='whoosh', t=d - .12, dur=.35, dir=-1, gain=-30, verb=.2)
add(type='splash', t=d, size=.45, gain=-19, verb=.3)
add(type='bubbles', t=d + .08, n=9, spread=.7, gain=-25, verb=.3)
add(type='swell', t=d + 2.2, dur=2.4, note='D3', gain=-27, verb=.5)       # 墨团翻滚开（压抑）
add(type='whoosh', t=sw + .7, dur=1.3, dir=1, gain=-25, verb=.35)         # 光鱼冲进墨里
add(type='shimmer', t=sw + 1.1, dur=2.4, gain=-27)
add(type='ding', t=sw + 1.9, note='A5', gain=-28, verb=.7)

# ---------- 下沉的话 ----------
stones = [T('b1') + .15, T('b3') + .15, T('b5@我也不容易') - .2]
cools = [T('b2') + 2.6, T('b4') + 2.4]
for i, t0 in enumerate(stones):
    add(type='splash', t=r3(t0), size=.5 if i < 2 else .4, gain=-21, verb=.3)
    add(type='impact', t=r3(t0 + .05), size=.25, gain=-31, verb=.4)      # 话是重的
    add(type='bubbles', t=r3(t0 + .15), n=7, spread=.8, gain=-28, verb=.3)
for i, b in enumerate(['b2', 'b4']):
    add(type='whoosh', t=r3(T(b) + 1.0), dur=.9, dir=(-1) ** i, gain=-30, verb=.3)   # 绕一圈
    add(type='shimmer', t=r3(cools[i] - .6), dur=1.4, gain=-31)
    add(type='ding', t=r3(cools[i] - .1), note=['E5', 'A5'][i], gain=-26, verb=.6)  # 挂上一个理由
c = T('b6') + .2
add(type='swell', t=c + 1.2, dur=2.2, note='D4', gain=-25, verb=.6)       # 托住"我也不容易"
add(type='heart', t=c + .2, n=2, bpm=64, pitch=1.6, gain=-27, verb=.05)
add(type='whoosh', t=T('b7') + .9, dur=2.4, dir=-1, gain=-27, verb=.5)    # 沉到海底
add(type='shimmer', t=T('b7') + 1.6, dur=3, gain=-33)
for i, lt in enumerate([T('b7') + 1.8, T('b7') + 2.3, T('b7') + 3.3]):
    add(type='impact', t=r3(lt), size=.12, gain=-35, verb=.4)
tr = T('b8') + .5
add(type='ding', t=tr, note='B5', gain=-23, verb=.85)                     # 一颗泪
add(type='reverse', t=tr + 3.4, dur=2.2, note='F#4', gain=-31)

# ---------- 焦点 ----------
add(type='murmur', t0=T('c1') - 1.2, t1=T('c2@安静') + .3, n=9, gain=-25, verb=.3)
add(type='murmur', t0=T('c2@安静'), t1=T('d1') + 1.5, n=6, gain=-39, verb=.5)   # 拉焦之后：人声退到很远
sc = T('c1@记着') - .1
add(type='shimmer', t=sc + .2, dur=1.4, gain=-31)
add(type='ding', t=sc + .85, note='E6', gain=-27, verb=.5)                # 桂花糕被收起来
add(type='reverse', t=T('c3') + .9, dur=1.4, note='A4', gain=-29)          # 拉焦
add(type='heart', t=T('c3') - .1, n=4, bpm=58, pitch=1.6, gain=-26, verb=.05)
for j, (dd, nt) in enumerate([(.2, 'D5'), (.7, 'F#5'), (1.2, 'A5')]):
    add(type='ding', t=r3(T('c4') + .3 + dd), note=nt, gain=-31, verb=.7)   # 没说出口的话被看见

# ---------- 看海 ----------
flat = T('d2.end') + .15
add(type='reverse', t=flat + .7, dur=1.3, note='A4', gain=-26)            # 字压成一条线
add(type='swell', t=flat + 2.2, dur=2.2, note='D4', gain=-29, verb=.5)    # 线框展开
for j in range(8):
    add(type='tick', t=r3(flat + .5 + j * .2), pitch=r3(1.3 + j * .08), gain=-34, pan=r3(-.6 + j * .17), verb=.3)
p0 = T('d3@日落') - .3
add(type='shimmer', t=p0 + .2, dur=3.2, gain=-27)
freeze = T('d5') + .35
add(type='wind', t0=p0, t1=freeze, gust=.25, gain=-36, verb=.2)
t_ = p0 + 1.2
while t_ < freeze - .5:                                                   # 浪拍上来
    add(type='splash', t=r3(t_), size=.18, gain=-33, verb=.4); t_ += 3.6
add(type='ding', t=T('d4@牵手') + .4, note='F#5', gain=-27, verb=.7)
add(type='tape', t=freeze - .05, dur=.45, gain=-32)                        # 定格
last, f = 1, int((T('d5') + .8) * 30)
while f < (T('d6') + .8) * 30:                                            # 一天天翻过去
    tt = f / 30; u = seg(tt, T('d5') + .8, T('d6') + .8); day = max(1, round(1 + 96 * u ** 1.8))
    if day != last: add(type='tick', t=r3(tt), pitch=.9, gain=-33, verb=.1); last = day; f += 2
    else: f += 1
add(type='reverse', t=T('d6') + 2.9, dur=1.8, note='D5', gain=-26)       # 收成一粒光
add(type='ding', t=T('d6') + 2.5, note='A5', gain=-27, verb=.8)

# ---------- 落下 ----------
add(type='wind', t0=T('e1') - .6, t1=T('f1') + .3, gust=.1, gain=-38, verb=.3)
lands = [T('e2') + .2, T('e2@做到') - .1, T('e2') + 2.3, T('e4') + .6, T('e4') + 1.3, T('e4') + 2.0, T('e4') + 2.6]
for j, lt in enumerate(lands):
    add(type='bubbles', t=r3(lt - .02), n=2, spread=.2, gain=-32, verb=.3)
    add(type='ding', t=r3(lt), note=PENTA[j], gain=-25 if j < 3 else -28, pan=r3(-.5 + j * .15), verb=.7)
add(type='glitch', t=T('e3') + .1, dur=.25, gain=-36)                     # 那粒光晃了一下
add(type='swell', t=T('e3') + 2.6, dur=2, note='D4', gain=-27, verb=.6)
add(type='ding', t=T('e3') + 2.4, note='D6', gain=-23, verb=.8)            # 认真解释，它也落下了
add(type='shimmer', t=T('e4@有地方') + .4, dur=2.6, gain=-28)

# ---------- 倒影 ----------
add(type='wind', t0=T('f1') - 1, t1=T('g1') - .2, gust=.05, gain=-39, verb=.3)
for key in ('f2', 'f4'):
    add(type='shimmer', t=T(key) + .2, dur=1.2, gain=-34)
for key in ('f3', 'f5'):
    add(type='bubbles', t=T(key) + .15, n=4, spread=.5, gain=-29, verb=.4)
    add(type='reverse', t=T(key) + 1.0, dur=1.1, note='F#4', gain=-29)
rise = T('f6') + .2
add(type='reverse', t=rise + .4, dur=1.2, note='A4', gain=-25)
add(type='splash', t=rise + .5, size=.6, gain=-18, verb=.4)                 # 真话破水而出
add(type='swell', t=rise + 1.6, dur=2.2, note='D4', gain=-25, verb=.6)
add(type='ding', t=T('f6@别人') + .6, note='A5', gain=-29, verb=.7)

# ---------- 双鱼 ----------
add(type='swell', t=T('g1') + .8, dur=3, note='D3', gain=-27, verb=.6)
add(type='shimmer', t=T('g1') + 1.2, dur=2.6, gain=-31)
add(type='ding', t=T('g2') + .3, note='A5', gain=-26, verb=.8)              # 绳结
for j in range(3):
    add(type='ding', t=r3(T('g3') + .2 + j * .35), note=['D6', 'E6', 'A6'][j], gain=-33, verb=.7)
add(type='heart', t=T('g4@你自己') - .1, n=2, bpm=56, pitch=1.5, gain=-28, verb=.05)
add(type='heart', t=T('g5@你受伤了') - .05, n=2, bpm=72, pitch=1.4, gain=-22, verb=.05)   # 绳子一紧
add(type='reverse', t=T('g5@你受伤了') + 1.0, dur=1.2, note='F#4', gain=-28)
add(type='whoosh', t=T('g5@你受伤了') + 1.0, dur=1.0, dir=-1, gain=-31, verb=.4)        # 掉头
pk = T('g7@算进去')
add(type='riser', t=pk, dur=3.6, gain=-25, verb=.3)
add(type='impact', t=pk + .02, size=.5, gain=-25, verb=.5)
add(type='boom', t=pk + .04, note='D1', gain=-36)
add(type='swell', t=pk + 2.2, dur=3, note='D4', gain=-20, verb=.7)
add(type='swell', t=pk + 1.2, dur=1.6, note='A4', gain=-22, verb=.7)
add(type='shimmer', t=pk + .05, dur=3.6, gain=-21)
add(type='ding', t=T('h2') + .1, note='F#5', gain=-25, verb=.8)            # 那我呢？
add(type='ding', t=T('h3') + .5, note='D5', gain=-28, verb=.8)
title = T('h3.end') + 1.2
add(type='boom', t=title + .3, note='D1', gain=-36)
add(type='shimmer', t=title + .2, dur=2.6, gain=-33)
add(type='swell', t=title + 2.6, dur=2.6, note='D4', gain=-27, verb=.6)

for c_ in fx:
    if c_['type'] == 'splash': c_['gain'] -= 4
    if c_['type'] == 'boom': c_['gain'] -= 7
    if c_['type'] == 'shimmer': c_['gain'] -= 10
    if c_['type'] in ('bubbles', 'splash'): c_['gain'] -= 3
    if c_['type'] == 'tick': c_['gain'] -= 7
    if c_['type'] == 'wind': c_['gain'] -= 4
    if c_['type'] == 'impact': c_['gain'] -= 5
    if c_['type'] == 'heart': c_['gain'] -= 3
cfg = {'end': r3(end), 'lufs': -14, 'music': mu, 'sfx': fx}
json.dump(cfg, open(os.path.join(D, 'sound.json'), 'w'), ensure_ascii=False, indent=1)
print(len(fx), 'sfx cues')
