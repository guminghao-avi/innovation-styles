"""人声类 / 环境类合成音效（sound.py 引用）：
  mumble   {t, rate:1, muffle:9000, drive:0, rev:false, pitch:1, seed:0}   一句含糊的人声（共振峰合成，听不清字，只有语气和节奏）
           默认念的是《回声》里那句「那我先走啦，你们慢慢吃。」+ 两声轻笑；rate>1 = 快放（音调跟着变高）；rev = 倒放（倒带）
           muffle = 低通（"在脑子里"的闷声），drive = 失真（被重写了很多遍）
  murmur   {t0,t1, n:8}         聚会的人声嘈杂：很多句含糊的话错开 + 偶尔的杯碟轻碰
  steps    {t0,t1, rate:1.8}    夜路上的脚步（硬地面）
  tape     {t, dur:.5}          磁带倒带：高速的啁啾 + 嘶声（t = 开始）
  whisper  {t0,t1, n0:1, n1:10} 层层叠叠的耳语，从 n0 个声音渐渐变成 n1 个
  wind     {t0,t1, gust:.5}     风雪：带阵风的呼啸
  waves    {t0,t1, rate:.11}    夜海：一阵阵涌上来的浪（低频涌动 + 退潮时的细沙沙声），rate = 每秒几次浪
  alarm    {t, pitch:1}         一下低沉的警报脉冲（两个音、带混响）
  clunk    {t}                  大功率舞台灯开关的"咔—嗡"
"""
import numpy as np
from scipy import signal

SR = 48000
_R = np.random.default_rng(11)
def _n(n, rng=None): return (rng or _R).standard_normal(n)
def _bp(x, lo, hi, o=2):
    if len(x) < 16: return x
    return signal.sosfilt(signal.butter(o, [max(20, lo) / (SR / 2), min(hi, SR * .45) / (SR / 2)], "band", output="sos"), x)
def _lp(x, fc, o=2):
    if len(x) < 16: return x
    return signal.sosfilt(signal.butter(o, min(fc, SR * .45) / (SR / 2), output="sos"), x, axis=0)
def _hp(x, fc, o=2):
    if len(x) < 16: return x
    return signal.sosfilt(signal.butter(o, fc / (SR / 2), "highpass", output="sos"), x, axis=0)
def _reson(x, f, bw):
    """二阶共振峰滤波器"""
    r = np.exp(-np.pi * bw / SR); th = 2 * np.pi * f / SR
    return signal.lfilter([1 - r], [1, -2 * r * np.cos(th), r * r], x)

# 那 我 先 走 啦 ， 你 们 慢 慢 吃 。 + 两声轻笑
# (起, 止, 幅度, 声调, 元音 F1/F2, 声母类型)
SYL = [
    (0, .15, .7, 4, (780, 1250), 'n'), (.15, .29, .55, 3, (520, 900), 'w'), (.29, .45, .82, 1, (420, 2000), 'x'),
    (.45, .6, 1, 3, (500, 950), 'z'), (.6, .78, .62, 0, (800, 1300), 'l'),
    (1.25, 1.36, .6, 3, (300, 2250), 'n'), (1.36, 1.46, .45, 0, (480, 1750), 'm'), (1.46, 1.58, .72, 4, (760, 1250), 'm'),
    (1.58, 1.69, .58, 1, (760, 1250), 'm'), (1.69, 1.83, .78, 1, (360, 1550), 'c'),
    (1.85, 1.9, .3, 9, (650, 1700), 'h'), (1.91, 1.96, .22, 9, (650, 1700), 'h'),
]
def _f0(tone, u, base):
    if tone == 1: return base * 1.18
    if tone == 2: return base * (.92 + .32 * u)
    if tone == 3: return base * (.95 - .2 * np.sin(np.pi * np.minimum(u, 1)))
    if tone == 4: return base * (1.3 - .45 * u)
    if tone == 9: return base * 1.35 * (1 - .15 * u)
    return base * (.95 - .08 * u)

_CACHE = {}
def utter(pitch=1.0, seed=0, whisper=False, syl=None):
    key = (pitch, seed, whisper, syl is None)
    if key in _CACHE and syl is None: return _CACHE[key].copy()
    rng = np.random.default_rng(seed + 100)
    syl = syl or SYL
    dur = max(e for _, e, *_ in syl) + .25
    n = int(dur * SR); out = np.zeros(n)
    base = 205 * pitch
    for (s, e, a, tone, (F1, F2), cons) in syl:
        i0, i1 = int(s * SR), int(min(dur, e * 1.3 + .02) * SR)
        m = i1 - i0; tt = np.arange(m) / SR; u = tt / (e - s)
        env = a * (1 - np.exp(-u * 12)) * np.maximum(0, 1 - u / 1.3) ** 1.25
        if whisper or tone == 9:
            src = _n(m, rng) * (.5 if whisper else .9)
            if tone == 9 and not whisper:     # 轻笑：带气的、颤一下的
                f = _f0(tone, u, base); src = src * .7 + np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .25
        else:
            f = _f0(tone, u, base) * (1 + .006 * np.sin(2 * np.pi * 5.5 * tt))
            ph = np.cumsum(f) / SR
            src = (2 * (ph % 1) - 1) + _n(m, rng) * .08          # 锯齿声门波 + 一点气声
        v = _reson(src, F1, 90) * 1.0 + _reson(src, F2, 130) * .55 + _reson(src, 2800, 220) * .2
        v *= env / (np.abs(v).max() + 1e-9)
        # 声母
        k = int(.06 * SR)
        if cons in 'xcz':
            b = _bp(_n(k, rng), 3500 if cons == 'x' else 2500, 8000) * np.linspace(1, .2, k) * (.35 if cons == 'x' else .5)
            out[max(0, i0 - k // 2):max(0, i0 - k // 2) + k] += b[:len(out[max(0, i0 - k // 2):max(0, i0 - k // 2) + k])] * a
        out[i0:i0 + m] += v[: n - i0]
    out = _hp(out, 90)
    out /= np.abs(out).max() + 1e-9
    _CACHE[key] = out.copy()
    return out

def mumble(rate=1.0, muffle=9000, drive=0.0, rev=False, pitch=1.0, seed=0):
    x = utter(pitch, seed)
    if rate != 1:
        m = int(len(x) / rate); x = np.interp(np.arange(m) * rate, np.arange(len(x)), x)
    if drive > 0:
        x = np.tanh(x * (1 + drive * 8)) / np.tanh(1 + drive * 8)
        x = x + _bp(np.sign(x) * np.abs(x) ** .5, 2000, 7000) * drive * .25       # 刺耳的高频
        q = 2 ** (8 - 4 * drive); x = np.round(x * q) / q
    if muffle < 15000: x = _lp(x, muffle, 4)
    if rev: x = x[::-1]
    return x * .8

def murmur(t0, t1, n=8):
    L = int((t1 - t0) * SR); out = np.zeros((L, 2)); t = np.arange(L) / SR
    env = np.minimum(1, t / 1.5) * np.minimum(1, (t1 - t0 - t) / 1.5)
    rng = np.random.default_rng(5)
    for v in range(n):
        tt = rng.random() * 1.5; pan = rng.random() * 1.6 - .8; p = .7 + rng.random() * .8
        while tt < t1 - t0:
            order = rng.permutation(len(SYL) - 2)[: rng.integers(3, 8)]
            cur = 0.; syl = []
            for j in order:
                s, e, a, tone, F, c = SYL[j]; d = (e - s) * (.8 + rng.random() * .6)
                syl.append((cur, cur + d, a * (.6 + .4 * rng.random()), int(rng.integers(0, 5)), F, c)); cur += d + (rng.random() < .2) * .15
            x = utter(p, int(rng.integers(1e6)), syl=syl) * (.4 + .6 * rng.random())
            i0 = int(tt * SR); m = min(len(x), L - i0)
            if m > 0:
                th = (pan + 1) * np.pi / 4
                out[i0:i0 + m, 0] += x[:m] * np.cos(th); out[i0:i0 + m, 1] += x[:m] * np.sin(th)
            tt += cur + .3 + rng.random() * 1.8
    out = _lp(out, 2600, 2) * .5
    for k in range(int((t1 - t0) * .9)):            # 杯碟轻碰
        i0 = int(rng.random() * (L - SR * .3)); m = int(.25 * SR); s = np.arange(m) / SR
        f = 2600 + rng.random() * 2400
        c = (np.sin(2 * np.pi * f * s) + .5 * np.sin(2 * np.pi * f * 2.76 * s)) * np.exp(-s / .05) * (.05 + .1 * rng.random())
        th = (rng.random() * 1.4 - .7 + 1) * np.pi / 4
        out[i0:i0 + m, 0] += c * np.cos(th); out[i0:i0 + m, 1] += c * np.sin(th)
    return out * env[:, None]

def steps(t0, t1, rate=1.8):
    L = int((t1 - t0) * SR); out = np.zeros((L, 2)); rng = np.random.default_rng(9)
    t = np.arange(L) / SR; env = np.minimum(1, t / 1.) * np.minimum(1, (t1 - t0 - t) / 1.)
    k = 0; tt = .2
    while tt < t1 - t0 - .3:
        i0 = int(tt * SR); m = int(.18 * SR); s = np.arange(m) / SR
        heel = np.sin(2 * np.pi * (90 + 40 * np.exp(-s / .01)) * s) * np.exp(-s / .025) * .8
        grit = _bp(_n(m, rng), 1200, 6000) * np.exp(-s / .018) * .35 + _bp(_n(m, rng), 300, 1500) * np.exp(-s / .04) * .2
        x = (heel + grit) * (.75 + .25 * rng.random())
        pan = -.15 if k % 2 else .15; th = (pan + 1) * np.pi / 4
        mm = min(m, L - i0); out[i0:i0 + mm, 0] += x[:mm] * np.cos(th); out[i0:i0 + mm, 1] += x[:mm] * np.sin(th)
        tt += 1 / rate * (.94 + .12 * rng.random()); k += 1
    return out * env[:, None] * .6

def tape(dur=.5):
    n = int((dur + .15) * SR); t = np.arange(n) / SR; u = np.minimum(1, t / dur)
    f = 900 + 2600 * np.sin(np.pi * u) + 300 * np.sin(2 * np.pi * 23 * t)
    chirp = np.sin(2 * np.pi * np.cumsum(f) / SR) * .25 + _bp(_n(n), 2000, 9000) * .35
    x = chirp * np.sin(np.pi * u) ** .6 * (t < dur + .02)
    x[-int(.03 * SR):] *= np.linspace(1, 0, int(.03 * SR))
    # 停下时"咔"一下
    i = int(dur * SR); m = int(.05 * SR); s = np.arange(m) / SR
    x[i:i + m] += (np.sin(2 * np.pi * 180 * s) * .6 + _bp(_n(m), 1500, 6000) * .5) * np.exp(-s / .008)
    return x * .7

def whisper(t0, t1, n0=1, n1=10):
    L = int((t1 - t0) * SR); out = np.zeros((L, 2)); rng = np.random.default_rng(21)
    D = t1 - t0
    for v in range(n1):
        start = D * (v / max(1, n1)) ** 1.6 * (1 if v >= n0 else 0)
        tt = start + rng.random() * .4; pan = rng.random() * 1.8 - .9
        while tt < D - .3:
            order = rng.permutation(len(SYL) - 2)[: rng.integers(3, 7)]; cur = 0.; syl = []
            for j in order:
                s, e, a, tone, F, c = SYL[j]; d = (e - s) * (.7 + rng.random() * .5)
                syl.append((cur, cur + d, a, tone, F, c)); cur += d
            x = utter(1, int(rng.integers(1e6)), whisper=True, syl=syl) * (.5 + .5 * rng.random())
            i0 = int(tt * SR); m = min(len(x), L - i0)
            if m > 0:
                th = (pan + 1) * np.pi / 4
                out[i0:i0 + m, 0] += x[:m] * np.cos(th); out[i0:i0 + m, 1] += x[:m] * np.sin(th)
            tt += cur + .1 + rng.random() * .6
    t = np.arange(L) / SR; env = np.minimum(1, t / .8)
    return _hp(out, 400) * env[:, None] * .5

def wind(t0, t1, gust=.5):
    L = int((t1 - t0) * SR); t = np.arange(L) / SR; rng = np.random.default_rng(31)
    env = np.minimum(1, t / 2) * np.minimum(1, (t1 - t0 - t) / 1.5)
    g = 1 + gust * (_lp(_n(L, rng), 1.2, 1) * 40)
    g = np.clip(g, .3, 2.2)
    a = _bp(_n(L, rng), 250, 900) * .8 + _bp(_n(L, rng), 900, 2400) * .25 * g
    whistle = np.sin(2 * np.pi * np.cumsum(520 + 160 * g) / SR) * .04 * g
    b = _bp(_n(L, rng), 260, 950) * .8 + _bp(_n(L, rng), 950, 2300) * .25 * g[::-1]
    return np.stack([(a + whistle) * g, b * g[::-1]], 1) * env[:, None] * .6

def waves(t0, t1, rate=.11):
    L = int((t1 - t0) * SR); t = np.arange(L) / SR; rng = np.random.default_rng(23)
    env = np.minimum(1, t / 1.5) * np.minimum(1, (t1 - t0 - t) / 1.5)
    out = np.zeros((L, 2))
    for ch in range(2):
        ph = rng.random() * 6.28
        sw = .5 - .5 * np.cos(2 * np.pi * rate * t * (1 + .13 * ch) + ph)          # 一涌一退
        sw = sw ** 2.2
        body = _bp(_n(L, rng), 90, 480) * (.35 + 1.1 * sw)                                # 涌上来：低沉的水体
        fizz = _bp(_n(L, rng), 1800, 6500) * np.roll(sw, int(.7 * SR)) * .22          # 退下去：泡沫沙沙
        out[:, ch] = body + fizz
    return out * env[:, None] * .7

def alarm(pitch=1.0):
    n = int(1.1 * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for k, (st, f) in enumerate(((0, 330), (.16, 262))):
        s = t - st; m = s >= 0
        e = np.where(m, np.minimum(1, s / .01) * np.exp(-np.maximum(s, 0) / .22), 0)
        tone = np.sin(2 * np.pi * f * pitch * s) + .35 * np.sin(2 * np.pi * f * 2 * pitch * s) + .15 * np.sin(2 * np.pi * f * 3 * pitch * s)
        x += tone * e
    return _lp(x, 2200) * .5

def clunk():
    n = int(2.4 * SR); t = np.arange(n) / SR
    k = (np.sin(2 * np.pi * 70 * t) * np.exp(-t / .05) + _bp(_n(n), 400, 3000) * np.exp(-t / .012) * .8 + _bp(_n(n), 2500, 8000) * np.exp(-t / .004) * .5)
    hum = (np.sin(2 * np.pi * 100 * t) * .5 + np.sin(2 * np.pi * 200 * t) * .2 + np.sin(2 * np.pi * 300 * t) * .1) * np.minimum(1, t / .3) * np.exp(-t / 1.4) * .12
    return k * .7 + hum

# ---------------- 游戏感 / 纸感的小音效（风格版新增） ----------------
def pop(pitch=1.0):
    """卡通"啵"：一个快速上扬的正弦 + 一点点噪声（UI 弹出、气泡、贴纸）"""
    n = int(.16 * SR); t = np.arange(n) / SR
    f = (420 + 900 * (1 - np.exp(-t / .025))) * pitch
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .045) + _bp(_n(n), 2000, 7000) * np.exp(-t / .006) * .15
    return x * .7
def coin():
    """金币：两个高音的铃（B5 → E6），第二个长一点"""
    out = np.zeros(int(.7 * SR))
    for st, f, d in ((0, 987.8, .08), (.075, 1318.5, .5)):
        n = int(d * SR) + int(.2 * SR); t = np.arange(n) / SR
        x = (np.sin(2 * np.pi * f * t) + .35 * np.sin(2 * np.pi * f * 2 * t) + .12 * np.sign(np.sin(2 * np.pi * f * t))) * np.exp(-t / (d * .6))
        i = int(st * SR); out[i:i + n] += x[: len(out) - i]
    return out * .4
def slap(size=1.0):
    """纸片"啪"地落下：一下闷的低频 + 纸的脆响"""
    n = int(.35 * SR); t = np.arange(n) / SR
    thump = np.sin(2 * np.pi * (90 + 60 * np.exp(-t / .01)) * t) * np.exp(-t / .03) * .6 * size
    crack = _bp(_n(n), 900, 6000) * np.exp(-t / (.012 + .01 * size)) * .7
    rustle = _bp(_n(n), 1500, 5000) * np.exp(-t / .09) * .12
    return thump + crack + rustle
