"""配乐 + 音效 + 混音：projects/P/sound.json (+ audio/voice.wav, vo.timing.json, beats.json) → audio/music.wav, sfx.wav, mix.wav

用法：.venv/bin/python scripts/sound.py P [--only music|sfx] [--solo]   （--solo 不混人声，单听配乐+音效）

所有时间字段（t / t0 / t1 / chords 和 notes 里的时间）都可以写表达式："a3"、"a3.end-0.2"、"a3@眨眼"、"drop+0.5"、12.4
（语法见 timeref.py；改了配音，配乐和音效自动跟着走）

sound.json：
{
  "end": "z9.end+3",          // 片长（省略 = vo 时长）
  "lufs": -14, "duck": 8,     // 目标响度；lufs:null 跳过归一化；人声出现时配乐压低几 dB
  "music": [ ... 乐器 cue ... ],
  "sfx":   [ ... 音效 cue ... ],
  "automation": [[0,-60],[2,0],["c1-0.3",-30],["c1",0]],  // 配乐总线音量（dB）关键帧：静默蓄力、突然抽空都靠它
  "mute": [["cut", "f1-0.3"]]  // 音效总线硬静音区间（连混响尾巴一起切掉）
}

配乐（music）—— 每个 cue 都有 gain(dB)、pan(-1..1)、verb(混响送量 0..1)
  pad      {t0,t1, chords:[[t,"Dm9"],[t,"Bbmaj7"],...], bright:0..1, attack, release, oct:3, width}     合成弦乐垫，和弦随时间换
  strings  同 pad，更慢的起音 + 揉弦，更像弦乐组
  drone    {t0,t1, note:"D2", bright, beat:0.15}                                                       低音持续音（不安/宇宙感）
  sub      {t0,t1, note:"D1"}                                                                           纯正弦超低频，压底
  notes    {inst:"keys|bell|pluck|glass|marimba", notes:[[t,"A4",dur,vel],...]}                        旋律/琶音（vel 0..1）
  arp      {inst, t0,t1, chords:[[t,"Dm9"],...], rate:0.25, pattern:[0,1,2,3,2,1], oct:4, vel:.6}      和弦自动琶音（rate=每音秒数）
  pulse    {t0,t1, bpm, note:"D1", swing:0, accent:[1,0,0,0]}                                          八分音符低频脉冲（悬疑推进）
  drums    {t0,t1, bpm, kick:"x...x...", snare:"....x...", hat:"..x...x.", step:16}                    鼓组（16 分音符网格，x=打 o=轻）
  air      {t0,t1, tone:0..1}                                                                           空气/房间底噪（让"安静"不死寂）

音效（sfx）
  impact   {t, size:0..1}           重击（超低频轰 + 中频体 + 高频裂），配大字砸下、硬切
  boom     {t, note:"A0"}           纯低频轰（片名、黑场）
  whoosh   {t, dur:.7, dir:1|-1}    t = 掠过的瞬间（最响点），配镜头甩、元素飞过
  riser    {t, dur:3}               t = 冲到顶的瞬间（一般接 impact 或抽空）
  reverse  {t, dur:1.5, note}       反向镲/反向钟，t = 结束点（吸进去的感觉）
  tick     {t:[...] 或 t, pitch}    UI 点击/数字跳动
  type     {t0,t1, rate:14}         打字声
  glitch   {t, dur:.3}              数字故障
  heart    {t, n:2, bpm:60, pitch:1} 心跳（pitch>1 手机外放也听得见）
  shimmer  {t, dur:2}               高频闪光粒子（魔法、灵感、星光）
  swell    {t, dur:2, note}         音高渐强的和声上扬（揭示、豁然开朗）
  ding     {t, note:"E6"}           清脆单音提示
  thunder  {t, near:0..1}           雷：near=1 头顶炸雷（撕裂脆响 + 滚雷），0 = 远处闷雷
  fire     {t0,t1, rate:40}         火：低沉呼呼声 + 噼啪（篝火、火焰书写）
  rain     {t0,t1, density:1}       雨：宽频沙沙声随阵雨起伏 + 零星近处雨滴
  snip     {t}                      剪刀剪断：刃口摩擦 + 金属咬合的脆响
  paper    {t, dur:.6}              纸张翻动/落下的沙沙声
  scribble {t, dur:.9}              笔在纸上划（圈画、批注）
  whir     {t0,t1, rate:6}          纺锤/转轮的呼呼转动声（rate = 每秒转几圈，可写 [起,止] 渐变）
  crickets {t0,t1, n:5}             夜里的蟋蟀：几只虫各自断续地叫，左右分开（n = 几只）
  underwater {t0,t1}                水下：闷住的低频涌动
  bubbles  {t, n:6, spread:.6}      一串气泡（上扬的小"啵"）
  splash   {t, size:.6}             冲出水面的水花（破裂声 + 水滴）
  cityhum  {t0,t1}                  凌晨的城市底噪：远处车流的低鸣 + 偶尔一辆车开过
  growl    {t, dur:1.6}             黑暗里野兽的低吼（低频 + 喉音颤动）
  mumble / murmur / steps / tape / whisper / wind / waves / alarm / clunk：人声与环境类，参数见 scripts/sfx_voice.py 文件头
"""
import json, os, re, sys
import numpy as np
import soundfile as sf
from scipy import signal
from scipy.ndimage import maximum_filter1d, uniform_filter1d
sys.path.insert(0, os.path.dirname(__file__))
from timeref import Resolver
import sfx_voice as SV

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RNG = np.random.default_rng(7)

# ---------------- 基础 ----------------
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
def midi(n):
    if isinstance(n, (int, float)): return float(n)
    m = re.fullmatch(r"([A-G])([#b]?)(-?\d)", n.strip())
    if not m: raise ValueError("音名不对: " + n)
    return 12 * (int(m.group(3)) + 1) + NOTE[m.group(1)] + {"#": 1, "b": -1, "": 0}[m.group(2)]
def hz(n): return 440 * 2 ** ((midi(n) - 69) / 12)
QUAL = {"": [0, 4, 7], "m": [0, 3, 7], "maj7": [0, 4, 7, 11], "m7": [0, 3, 7, 10], "7": [0, 4, 7, 10], "maj9": [0, 4, 7, 11, 14],
        "m9": [0, 3, 7, 10, 14], "9": [0, 4, 7, 10, 14], "add9": [0, 4, 7, 14], "madd9": [0, 3, 7, 14], "sus2": [0, 2, 7], "sus4": [0, 5, 7],
        "6": [0, 4, 7, 9], "m6": [0, 3, 7, 9], "dim": [0, 3, 6], "aug": [0, 4, 8], "m11": [0, 3, 7, 10, 14, 17], "maj7#11": [0, 4, 7, 11, 18],
        "5": [0, 7, 12], "7sus4": [0, 5, 7, 10], "m7b5": [0, 3, 6, 10]}
def chord(sym, oct=3):
    """'Dm9' / 'F/A' / 'Bbmaj7' → (bass midi, [voicing midis])"""
    m = re.fullmatch(r"([A-G][#b]?)(.*?)(?:/([A-G][#b]?))?", sym.strip())
    root, q, bass = m.group(1), m.group(2), m.group(3)
    if q not in QUAL: raise ValueError("和弦写法不认识: " + sym)
    r = midi(root + str(oct))
    voic = [r + i for i in QUAL[q]]
    # 开放排列：把三音之外的音往上挪一个八度，避免低音区糊
    voic = [v + (12 if j >= 3 or (j == 1 and len(voic) > 3) else 0) for j, v in enumerate(voic)]
    b = midi((bass or root) + str(oct - 1))
    return b, voic

def tlen(d): return np.arange(int(max(d, 0) * SR)) / SR
def adsr(n, a, d, s, r, hold=None):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    hold = n - r if hold is None else int(hold * SR)
    e = np.full(n, s, float)
    ai = min(a, n); e[:ai] = np.linspace(0, 1, ai, endpoint=False) if ai else e[:ai]
    di = min(a + d, n); e[a:di] = np.linspace(1, s, max(di - a, 0), endpoint=False) if di > a else e[a:di]
    if hold < n:
        hold = max(hold, 0); e[hold:] = e[hold] * np.linspace(1, 0, n - hold) ** 1.5
    return e
def pan2(x, p=0.0):
    th = (np.clip(p, -1, 1) + 1) * np.pi / 4
    if np.ndim(p): return np.stack([x * np.cos(th), x * np.sin(th)], 1)
    return np.stack([x * np.cos(th), x * np.sin(th)], 1)
def db(g): return 10 ** (g / 20)

def polyblep_saw(f, n, phase0=0.0):
    """抗混叠锯齿波；f 可以是常数或逐样本数组"""
    f = np.broadcast_to(np.asarray(f, float), (n,))
    dt = f / SR; ph = (phase0 + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    m1 = ph < dt; t1 = ph[m1] / dt[m1]; y[m1] -= t1 + t1 - t1 * t1 - 1
    m2 = ph > 1 - dt; t2 = (ph[m2] - 1) / dt[m2]; y[m2] -= t2 * t2 + t2 + t2 + 1
    return y
def sine(f, n, phase0=0.0):
    f = np.broadcast_to(np.asarray(f, float), (n,))
    return np.sin(2 * np.pi * (phase0 + np.cumsum(f) / SR))

def tv_filter(x, cutoff, kind="low", q=0.707, block=256):
    """时变滤波：cutoff 逐样本数组，按块更新系数（状态延续，无咔哒）"""
    cutoff = np.broadcast_to(np.asarray(cutoff, float), (len(x),))
    y = np.empty_like(x); zi = np.zeros((1, 2))
    for i in range(0, len(x), block):
        fc = float(np.clip(cutoff[min(i + block // 2, len(x) - 1)], 20, SR * .45))
        w0 = 2 * np.pi * fc / SR; al = np.sin(w0) / (2 * q); c = np.cos(w0)
        if kind == "low": b = [(1 - c) / 2, 1 - c, (1 - c) / 2]
        elif kind == "high": b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]
        else: b = [al, 0, -al]  # band
        a = [1 + al, -2 * c, 1 - al]
        sos = np.array([[b[0] / a[0], b[1] / a[0], b[2] / a[0], 1, a[1] / a[0], a[2] / a[0]]])
        y[i:i + block], zi = signal.sosfilt(sos, x[i:i + block], zi=zi)
    return y
def lp(x, fc, order=2): return signal.sosfilt(signal.butter(order, min(fc, SR * .45) / (SR / 2), output="sos"), x, axis=0)
def hp(x, fc, order=2): return signal.sosfilt(signal.butter(order, fc / (SR / 2), "highpass", output="sos"), x, axis=0)
def bp(x, lo, hi, order=2): return signal.sosfilt(signal.butter(order, [lo / (SR / 2), min(hi, SR * .45) / (SR / 2)], "band", output="sos"), x, axis=0)
def noise(n): return RNG.standard_normal(n)

def make_ir(sec, damp_hz, seed, predelay=.015, er=True):
    rng = np.random.default_rng(seed); n = int(sec * SR); t = np.arange(n) / SR
    chans = []
    for c in range(2):
        x = rng.standard_normal(n) * np.exp(-6.9 * t / sec)
        # 越往后越暗（高频衰减更快）
        x = x * 0.6 + lp(x, damp_hz) * 0.4 + lp(x, damp_hz * .3) * np.minimum(1, t / sec * 2)
        if er:
            for k in range(8):
                d = int((.008 + rng.random() * .05) * SR)
                if d < n: x[d] += (rng.random() - .5) * 3 * (1 - k / 8)
        chans.append(np.concatenate([np.zeros(int(predelay * SR)), x]))
    h = np.stack(chans, 1); h[:int(.004 * SR)] = 0
    return h / np.sqrt((h ** 2).sum(0)).max()
IRS = {}
def reverb(x, kind="hall"):
    sec, damp, pre = {"hall": (3.6, 4500, .03), "room": (.9, 6000, .01), "plate": (2.2, 8000, .005), "cathedral": (7.0, 3000, .06)}[kind]
    if kind not in IRS: IRS[kind] = make_ir(sec, damp, hash(kind) % 1000, pre)
    h = IRS[kind]
    if x.ndim == 1: x = np.stack([x, x], 1)
    return np.stack([signal.fftconvolve(x[:, c], h[:, c])[:len(x)] for c in range(2)], 1)

class Bus:
    def __init__(self, n): self.dry = np.zeros((n, 2)); self.wet = {"hall": np.zeros((n, 2)), "plate": np.zeros((n, 2)), "cathedral": np.zeros((n, 2)), "room": np.zeros((n, 2))}; self.n = n
    def add(self, x, t, gain=0, pan=0.0, verb=0.0, space="hall"):
        if x.ndim == 1: x = pan2(x, pan)
        i0 = int(round(t * SR)); x = x * db(gain)
        if i0 < 0: x = x[-i0:]; i0 = 0
        j = min(self.n, i0 + len(x))
        if j <= i0: return
        self.dry[i0:j] += x[:j - i0]
        if verb > 0: self.wet[space][i0:j] += x[:j - i0] * verb
    def render(self):
        out = self.dry.copy()
        for k, w in self.wet.items():
            if np.abs(w).max() > 0: out += reverb(w, k) * .9
        return out

# ---------------- 乐器 ----------------
def inst_pad(freqs, n, bright=.4, attack=2.5, release=3, strings=False, width=1.0):
    t = np.arange(n) / SR; L = np.zeros(n); R = np.zeros(n)
    for f in freqs:
        for side, out in ((-1, L), (1, R)):
            for det in (-9, -3, 4, 10):
                cents = det * width * (1 if side > 0 else -1) * .9
                vib = 1 + (0.0025 * np.sin(2 * np.pi * (4.8 + RNG.random()) * t + RNG.random() * 6) * np.minimum(1, t / 2.5) if strings else 0)
                out += polyblep_saw(f * 2 ** (cents / 1200) * vib, n, RNG.random()) / 4
    base = 300 + bright * 3000
    lfo = 1 + .35 * np.sin(2 * np.pi * .07 * t + 1.3) + .15 * np.sin(2 * np.pi * .23 * t)
    env = adsr(n, attack * (1.6 if strings else 1), 1.5, .85, release)
    cut = base * lfo * (0.55 + .45 * env)
    st = np.stack([tv_filter(L, cut), tv_filter(R, cut * 1.03)], 1) * env[:, None]
    st = hp(st, 90)
    return st / max(1, len(freqs)) ** .5 * .5

def inst_keys(f, dur, vel=.6):
    """毛毡钢琴：非谐泛音 + 双段衰减 + 锤击噪声 + 低通"""
    n = int((dur + 2.5) * SR); t = np.arange(n) / SR; x = np.zeros(n)
    B = .00035
    for k in range(1, 14):
        fk = f * k * np.sqrt(1 + B * k * k)
        if fk > 12000: break
        amp = (1 / k ** 1.25) * (vel ** (k * .12)) * (1 + .3 * np.cos(k * 1.7))
        dec = (1.3 + 5 * vel) / (1 + k * .45) * (220 / (f + 60)) ** .35 * 2.2
        x += amp * np.sin(2 * np.pi * fk * t + RNG.random()) * (.7 * np.exp(-t / (dec * .25)) + .3 * np.exp(-t / dec))
    ham = lp(noise(int(.03 * SR)) * np.exp(-np.arange(int(.03 * SR)) / SR / .006), 1800) * .25 * vel
    x[:len(ham)] += ham
    rel = np.ones(n); i = int(dur * SR); rel[i:] = np.exp(-(t[i:] - dur) / .35)
    x = lp(x * rel * np.minimum(1, t / .004), 1500 + 3500 * vel)
    return x * vel * .5

def inst_bell(f, dur, vel=.6, ratio=1.4, glass=False):
    n = int((dur + (6 if not glass else 3)) * SR); t = np.arange(n) / SR
    idx = (3.5 if not glass else 1.6) * vel * np.exp(-t / .9)
    mod = np.sin(2 * np.pi * f * ratio * t) * idx
    x = np.sin(2 * np.pi * f * t + mod) * np.exp(-t / (2.8 if not glass else 1.4))
    x += .25 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / .6)
    x += .12 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / .25)
    return x * np.minimum(1, t / .002) * vel * .35

def inst_pluck(f, dur, vel=.6, bright=.5):
    """Karplus-Strong（按周期块向量化）"""
    n = int((dur + 2) * SR); P = max(2, int(round(SR / f)))
    buf = lp(noise(P), 1500 + 6000 * bright * vel) ; y = np.zeros(n + P); y[:P] = buf
    damp = .996 - (1 - bright) * .004
    i = P
    while i < n + P:
        j = min(i + P, n + P)
        prev = y[i - P:j - P]; prev2 = y[i - P - 1:j - P - 1] if i - P - 1 >= 0 else np.concatenate([[0], y[i - P:j - P - 1]])
        y[i:j] = damp * .5 * (prev + prev2)
        i = j
    x = y[P:]; t = np.arange(n) / SR
    di = int(dur * SR); x[di:] *= np.exp(-(t[di:] - dur) / .15)
    return hp(x, 60) * vel * .6

def inst_marimba(f, dur, vel=.6):
    n = int((dur + 1.5) * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / .5) + .4 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / .08) + .15 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t / .02)
    return x * np.minimum(1, t / .001) * vel * .45

INST = {"keys": inst_keys, "bell": inst_bell, "pluck": inst_pluck, "marimba": inst_marimba, "glass": lambda f, d, v: inst_bell(f, d, v, 3.5, True)}

def drone(note, n, bright=.3, beat=.15):
    f = hz(note); t = np.arange(n) / SR
    x = np.zeros((n, 2))
    for c, d in enumerate((-beat, beat)):
        s = polyblep_saw(f + d, n, RNG.random()) * .5 + polyblep_saw(f * 2 + d * 1.5, n, RNG.random()) * .25 + sine(f / 2, n) * .6
        x[:, c] = tv_filter(s, (120 + 900 * bright) * (1 + .4 * np.sin(2 * np.pi * .05 * t + c)))
    return x * adsr(n, 4, 1, 1, 4)[:, None] * .6

# ---------------- 音效 ----------------
def sfx_impact(size=.7):
    n = int(4 * SR); t = np.arange(n) / SR
    f = 30 + 45 * np.exp(-t / .09)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (.5 + size * .9))
    sub = np.tanh(sub * 1.8) * .9
    body = lp(noise(n), 500) * np.exp(-t / .12) * .9
    crack = hp(noise(n), 2500) * np.exp(-t / .025) * .5
    tail = bp(noise(n), 200, 2000) * np.exp(-t / (.8 + size)) * .08
    return pan2(sub * (.8 + .5 * size) + body + crack + tail) * .9
def sfx_boom(note="A0"):
    n = int(5 * SR); t = np.arange(n) / SR; f0 = hz(note)
    x = np.sin(2 * np.pi * np.cumsum(f0 * (1 + .8 * np.exp(-t / .05))) / SR) * np.exp(-t / 1.6)
    return pan2(np.tanh(x * 1.5) + lp(noise(n), 150) * np.exp(-t / .3) * .4) * .8
def sfx_whoosh(dur=.7, direction=1):
    n = int(dur * 2 * SR); t = np.arange(n) / SR; c = dur  # 峰值在中点
    env = np.exp(-((t - c) / (dur * .38)) ** 2) * np.where(t > c, np.exp(-(t - c) / (dur * .35)), 1)
    fc = 300 + 3500 * np.exp(-((t - c) / (dur * .35)) ** 2)
    x = tv_filter(noise(n), fc, "band", q=1.2) * 2.2 + tv_filter(noise(n), fc * .4, "low") * .5
    p = np.tanh((t - c) / (dur * .3)) * .8 * direction
    return pan2(x * env, p) * .7, c
def sfx_riser(dur=3):
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    nz = tv_filter(noise(n), 400 + 9000 * u ** 2, "high") * u ** 2.5
    f = 110 * 2 ** (u * 2.2)
    tone = sum(polyblep_saw(f * m * 2 ** (d / 1200), n, RNG.random()) for m, d in ((1, -8), (1, 8), (1.5, 0), (2, 5)))
    tone = tv_filter(tone, 300 + 5000 * u ** 2) * u ** 3 * .25
    x = (nz + tone); x[-int(.01 * SR):] *= np.linspace(1, 0, int(.01 * SR))
    return pan2(x * .6)
def sfx_reverse(dur=1.5, note="E5"):
    hit = inst_bell(hz(note), .1, .9)[: int(dur * SR)] + hp(noise(int(dur * SR)), 4000) * np.exp(-np.arange(int(dur * SR)) / SR / .5) * .3
    st = reverb(hit, "plate")[: int(dur * SR)] + pan2(hit) * .3
    return st[::-1] * 1.2
def sfx_tick(pitch=1.0):
    n = int(.04 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 2600 * pitch * t) * np.exp(-t / .006) + hp(noise(n), 5000) * np.exp(-t / .002) * .5
    return x * .5
def sfx_type(t0, t1, rate=14):
    k = int((t1 - t0) * rate); out = []
    for i in range(k):
        tt = t0 + i / rate + (RNG.random() - .5) * .3 / rate
        n = int(.03 * SR); s = np.arange(n) / SR
        x = bp(noise(n), 1500, 6000) * np.exp(-s / .006) * (.6 + .4 * RNG.random()) + np.sin(2 * np.pi * 180 * s) * np.exp(-s / .01) * .3
        out.append((tt, x * .4))
    return out
def sfx_glitch(dur=.3):
    n = int(dur * SR); x = np.zeros(n); i = 0
    while i < n:
        L = int(SR * (.01 + RNG.random() * .04))
        kind = RNG.integers(3)
        seg = noise(L) if kind == 0 else np.sign(np.sin(2 * np.pi * (200 + RNG.random() * 2000) * np.arange(L) / SR)) if kind == 1 else np.zeros(L)
        seg = np.round(seg * 4) / 4
        x[i:i + L] = seg[: n - i] * (.3 + .7 * RNG.random()); i += L + int(RNG.random() * SR * .02)
    return pan2(hp(x, 300) * .35, (RNG.random() - .5))
def sfx_heart(n_beats=2, bpm=60, pitch=1.0):
    out = np.zeros(int((n_beats * 60 / bpm + 1) * SR))
    for b in range(n_beats):
        for off, g in ((0, 1), (.28, .6)):
            i = int((b * 60 / bpm + off) * SR); n = int(.25 * SR); t = np.arange(n) / SR
            x = np.sin(2 * np.pi * (45 + 30 * np.exp(-t / .03)) * pitch * t) * np.exp(-t / .07) * g
            out[i:i + n] += x[: len(out) - i]
    return pan2(np.tanh(out * 2) * .8)
def sfx_shimmer(dur=2):
    n = int((dur + 2) * SR); x = np.zeros((n, 2))
    for i in range(int(dur * 22)):
        tt = RNG.random() * dur; f = 2000 * 2 ** (RNG.random() * 2.5)
        b = inst_bell(f, .05, .3 + .4 * RNG.random(), glass=True)[: int(1.2 * SR)] * np.sin(np.pi * tt / dur)
        i0 = int(tt * SR); x[i0:i0 + len(b)] += pan2(b, RNG.random() * 2 - 1)[: n - i0]
    return x * .5
def sfx_swell(dur=2, note="D4"):
    n = int((dur + .5) * SR); t = np.arange(n) / SR; u = np.minimum(1, t / dur)
    fs = [hz(note) * r for r in (1, 1.5, 2, 2.5, 3)]
    x = inst_pad(fs, n, bright=.2 + .5 * 1, attack=dur * .9, release=.4) * (u ** 2)[:, None]
    return x * 1.4
def sfx_thunder(near=.5):
    """雷：near=1 头顶炸雷（先一声撕裂的脆响），near=0 远处闷雷（只有滚动的低频）"""
    n = int(6 * SR); t = np.arange(n) / SR
    roll = np.zeros(n)
    for i in range(7):                                        # 几次起伏的滚雷
        c = .15 + i * (.35 + RNG.random() * .45); w = .3 + RNG.random() * .6
        roll += np.exp(-((t - c) / w) ** 2) * (1 - i * .1)
    rum = lp(noise(n), 90 + 200 * near) * roll * 2.2 + lp(noise(n), 40) * np.exp(-t / 2) * 1.2
    crack = (hp(noise(n), 1500) * np.exp(-t / .06) * 1.2 + bp(noise(n), 300, 3000) * np.exp(-t / .25) * .6) * near
    return pan2(np.tanh((rum + crack) * 1.4), (RNG.random() - .5) * .6) * .8
def sfx_fire(t0, t1, rate=40):
    """火：低沉的呼呼声 + 随机的噼啪"""
    n = int((t1 - t0 + .5) * SR); t = np.arange(n) / SR
    env = np.minimum(1, t / .3) * np.minimum(1, np.maximum(0, (t1 - t0 + .3 - t) / .5))
    roar = bp(noise(n), 80, 400) * (1 + .5 * lp(noise(n), 6)) * .5 + bp(noise(n), 800, 3000) * .08
    x = roar * env
    for i in range(int((t1 - t0) * rate)):
        i0 = int(RNG.random() * (n - SR * .02)); L = int(SR * (.002 + RNG.random() * .006))
        x[i0:i0 + L] += bp(noise(L), 900, 4500) * (RNG.random() ** 2) * 1.8 * env[i0]
    return pan2(x * .7)
def sfx_rain(t0, t1, density=1.0):
    """雨：宽频的沙沙声（慢慢起伏的阵雨）+ 零星的近处雨滴，左右独立"""
    n = int((t1 - t0 + .8) * SR); t = np.arange(n) / SR
    env = np.minimum(1, t / 1.2) * np.minimum(1, np.maximum(0, (t1 - t0 + .6 - t) / 1.0))
    gust = 1 + .35 * lp(noise(n), 1.5) * 20
    out = []
    for ch in range(2):
        x = (bp(noise(n), 600, 4500) * .35 + bp(noise(n), 180, 800) * .16) * gust
        for i in range(int((t1 - t0) * 70 * density)):
            i0 = int(RNG.random() * (n - SR * .03)); L = int(SR * (.004 + RNG.random() * .01))
            f = 1800 + RNG.random() * 4500; tt = np.arange(L) / SR
            x[i0:i0 + L] += np.sin(2 * np.pi * f * tt * (1 - tt * 30)) * np.exp(-tt * 600) * (RNG.random() ** 2) * .5
        out.append(x * env)
    return np.stack(out, 1) * .5
def sfx_snip():
    n = int(.5 * SR); t = np.arange(n) / SR
    scrape = bp(noise(n), 2500, 9000) * np.clip(t / .05, 0, 1) * np.exp(-np.maximum(t - .05, 0) / .012) * (t < .09)
    i = int(.055 * SR); c = np.zeros(n); tc = t[: n - i]
    c[i:] = (np.sin(2 * np.pi * 3100 * tc) * .6 + np.sin(2 * np.pi * 4870 * tc) * .4) * np.exp(-tc / .035) + hp(noise(n - i), 4000) * np.exp(-tc / .004) * .8
    return pan2((scrape * .5 + c) * .6)
def sfx_paper(dur=.6):
    n = int(dur * SR); t = np.arange(n) / SR
    bursts = lp(np.abs(noise(n)) ** 3, 30); bursts /= bursts.max() + 1e-9
    env = np.sin(np.pi * np.minimum(1, t / dur)) ** .7
    return pan2(bp(noise(n), 1200, 7000) * bursts * env * 1.2)
def sfx_scribble(dur=.9):
    n = int(dur * SR); t = np.arange(n) / SR
    strokes = np.abs(np.sin(2 * np.pi * 7.5 * t + .6 * np.sin(2 * np.pi * 1.3 * t))) ** 1.5
    env = np.minimum(1, t / .05) * np.minimum(1, (dur - t) / .1)
    return pan2(bp(noise(n), 1800, 6500) * strokes * env * .9)
def sfx_whir(t0, t1, rate=6):
    n = int((t1 - t0) * SR); t = np.arange(n) / SR
    r0, r1 = (rate if isinstance(rate, list) else [rate, rate])
    ph = 2 * np.pi * np.cumsum(r0 + (r1 - r0) * t / max(t1 - t0, 1e-3)) / SR
    env = np.minimum(1, t / .4) * np.minimum(1, (t1 - t0 - t) / .5)
    x = (bp(noise(n), 180, 900) * (.55 + .45 * np.sin(ph)) + bp(noise(n), 1500, 4000) * .15 * (.5 + .5 * np.sin(ph * 2))) * env
    return pan2(x)
def sfx_crickets(t0, t1, n=5):
    L = int((t1 - t0) * SR); out = np.zeros((L, 2)); t = np.arange(L) / SR
    env = np.minimum(1, t / 1.5) * np.minimum(1, (t1 - t0 - t) / 1.5)
    for k in range(n):
        f = 3800 + RNG.random() * 1600; pan = RNG.random() * 1.6 - .8; g = .4 + .6 * RNG.random()
        tt = RNG.random() * .8; period = .45 + RNG.random() * .5
        x = np.zeros(L)
        while tt < t1 - t0:
            for p in range(int(2 + RNG.integers(3))):                # 每声 2~4 个脉冲（翅膀摩擦）
                i0 = int((tt + p * .028) * SR); n_ = int(.018 * SR)
                if i0 + n_ >= L: break
                s_ = np.arange(n_) / SR
                x[i0:i0 + n_] += np.sin(2 * np.pi * f * s_) * np.sin(np.pi * s_ / .018) ** 2
            tt += period * (.85 + .3 * RNG.random()) + (RNG.random() < .12) * RNG.random() * 2.5   # 偶尔停一会儿
        out += pan2(x * g, pan)
    return out * env[:, None] * .25
def sfx_underwater(t0, t1):
    n = int((t1 - t0) * SR); t = np.arange(n) / SR
    env = np.minimum(1, t / 1.2) * np.minimum(1, (t1 - t0 - t) / 1.2)
    sw = 1 + .5 * np.sin(2 * np.pi * .13 * t) + .3 * np.sin(2 * np.pi * .31 * t + 1)
    x = np.stack([bp(noise(n), 70, 300) * sw, bp(noise(n), 70, 280) * sw[::-1]], 1) * 1.6 + np.stack([bp(noise(n), 400, 900)] * 2, 1) * .1
    return x * env[:, None]
def sfx_bubbles(n_=6, spread=.6):
    L = int((spread + .3) * SR); x = np.zeros((L, 2))
    for k in range(n_):
        i0 = int(RNG.random() * spread * SR); n = int(.035 * SR); s_ = np.arange(n) / SR
        f = (500 + RNG.random() * 700) * (1 + 2.5 * s_ / .035)
        b = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-s_ / .01) * (.4 + .6 * RNG.random())
        x[i0:i0 + n] += pan2(b, RNG.random() * 1.2 - .6)[: L - i0]
    return x * .5
def sfx_splash(size=.6):
    n = int(1.6 * SR); t = np.arange(n) / SR
    burst = bp(noise(n), 500, 4500) * np.exp(-t / (.08 + .1 * size)) * 1.2 + lp(noise(n), 500) * np.exp(-t / .15) * .6
    x = pan2(burst)
    for k in range(int(10 * size + 4)):                               # 落回水面的水滴
        i0 = int((.15 + RNG.random() * .9) * SR); m = int(.03 * SR); s_ = np.arange(m) / SR
        d = np.sin(2 * np.pi * (900 + RNG.random() * 1500) * (1 + 1.5 * s_ / .03) * s_) * np.exp(-s_ / .008) * .35
        x[i0:i0 + m] += pan2(d, RNG.random() * 1.4 - .7)[: n - i0]
    return x * .7
def sfx_cityhum(t0, t1):
    n = int((t1 - t0) * SR); t = np.arange(n) / SR
    env = np.minimum(1, t / 2) * np.minimum(1, (t1 - t0 - t) / 2)
    x = np.stack([bp(noise(n), 55, 200), bp(noise(n), 55, 190)], 1) * 1.4 + np.stack([bp(noise(n), 300, 1400)] * 2, 1) * .07
    x = x * (1 + .25 * np.sin(2 * np.pi * .07 * t))[:, None]
    for k in range(int((t1 - t0) / 7)):                                # 远处偶尔一辆车开过
        c = RNG.random() * (t1 - t0); w = 1.5 + RNG.random() * 1.5
        g = np.exp(-((t - c) / w) ** 2)[:, None] * bp(noise(n), 250, 2200)[:, None] * .35
        x += g * pan2(np.ones(n), np.tanh((t - c) / w) * .7)
    return x * env[:, None]
def sfx_growl(dur=1.6):
    n = int(dur * SR); t = np.arange(n) / SR
    env = np.sin(np.pi * np.minimum(1, t / dur)) ** 1.5
    trem = .55 + .45 * np.sin(2 * np.pi * (22 + 6 * np.sin(2 * np.pi * .7 * t)) * t)
    f = 70 + 15 * np.sin(2 * np.pi * .9 * t)
    x = (bp(noise(n), 90, 500) * 1.4 + np.tanh(polyblep_saw(f, n) * 1.5) * .25) * trem
    return pan2(lp(x, 900) * env, -.5) * .8
def sfx_ding(note="E6"):
    return inst_bell(hz(note), .3, .7, ratio=2.0, glass=True)

def drums(t0, t1, bpm, pat, step=16):
    sd = 60 / bpm * 4 / step; out = []
    def kick():
        n = int(.5 * SR); t = np.arange(n) / SR
        return np.tanh(np.sin(2 * np.pi * np.cumsum(45 + 110 * np.exp(-t / .03)) / SR) * np.exp(-t / .22) * 2) * .9
    def snare():
        n = int(.35 * SR); t = np.arange(n) / SR
        return bp(noise(n), 900, 9000) * np.exp(-t / .09) * .5 + np.sin(2 * np.pi * 190 * t) * np.exp(-t / .05) * .4
    def hat():
        n = int(.08 * SR); t = np.arange(n) / SR
        return hp(noise(n), 8000) * np.exp(-t / .02) * .25
    gen = {"kick": kick, "snare": snare, "hat": hat}
    for name, p in pat.items():
        if not p: continue
        s = gen[name](); i = 0; tt = t0
        while tt < t1 - 1e-6:
            ch = p[i % len(p)]
            if ch in "xo": out.append((tt, s * (1 if ch == "x" else .45), {"kick": 0, "snare": .05, "hat": .25}[name]))
            i += 1; tt = t0 + i * sd
    return out

# ---------------- 主流程 ----------------
def main():
    proj = sys.argv[1]; only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    d = os.path.join(ROOT, "projects", proj); os.makedirs(os.path.join(d, "audio"), exist_ok=True)
    cfg = json.load(open(os.path.join(d, "sound.json")))
    R = Resolver(d); T = R.time
    vpath = os.path.join(d, "audio", "voice.wav")
    voice = sf.read(vpath)[0] if os.path.exists(vpath) else np.zeros((SR, 2))
    end = T(cfg["end"]) if "end" in cfg else max(R.duration, len(voice) / SR)
    if not np.isfinite(end) or end <= 0: raise SystemExit('声音 end 必须是正的有限秒数')
    N = int(end * SR)
    music, fx = Bus(N), Bus(N)

    for c in cfg.get("music", []) if only != "sfx" else []:
        ty, g, p, v = c["type"], c.get("gain", -14), c.get("pan", 0), c.get("verb", .35)
        if ty in ("pad", "strings"):
            ch = [(T(t), s) for t, s in c["chords"]]; t1 = T(c["t1"])
            for i, (ta, s) in enumerate(ch):
                tb = ch[i + 1][0] if i + 1 < len(ch) else t1
                rel = c.get("release", 2.5); bass, vo = chord(s, c.get("oct", 3))
                fr = [440 * 2 ** ((m - 69) / 12) for m in vo] + ([440 * 2 ** ((bass - 69) / 12)] if c.get("bass", True) else [])
                last = i + 1 == len(ch)
                n = int((tb - ta + (rel if last else 1.2)) * SR)
                x = inst_pad(fr, n, c.get("bright", .35), c.get("attack", 2.0) if i == 0 else 1.0, rel if last else 1.2, ty == "strings", c.get("width", 1))
                music.add(x, ta - (0 if i == 0 else .5), g, p, v)
        elif ty == "drone":
            t0, t1 = T(c["t0"]), T(c["t1"]); music.add(drone(c.get("note", "D2"), int((t1 - t0) * SR), c.get("bright", .3), c.get("beat", .15)), t0, g, p, v)
        elif ty == "sub":
            t0, t1 = T(c["t0"]), T(c["t1"]); n = int((t1 - t0) * SR)
            music.add(sine(hz(c.get("note", "D1")), n) * adsr(n, 2, .5, 1, 2) * .7, t0, g, 0, 0)
        elif ty == "notes":
            fn = INST[c.get("inst", "keys")]
            for nt in c["notes"]:
                tt, nm, du = T(nt[0]), nt[1], float(nt[2]) if len(nt) > 2 else .8
                vel = float(nt[3]) if len(nt) > 3 else .6
                music.add(fn(hz(nm), du, vel), tt, g, p + (RNG.random() - .5) * .2, v)
        elif ty == "arp":
            fn = INST[c.get("inst", "pluck")]; ch = [(T(t), s) for t, s in c["chords"]]; t1 = T(c["t1"])
            rate, pat, vel = c.get("rate", .25), c.get("pattern", [0, 1, 2, 3, 2, 1]), c.get("vel", .55)
            k = 0
            for i, (ta, s) in enumerate(ch):
                tb = ch[i + 1][0] if i + 1 < len(ch) else t1
                _, vo = chord(s, c.get("oct", 4)); tt = ta
                while tt < tb - 1e-6:
                    m = vo[pat[k % len(pat)] % len(vo)] + 12 * (pat[k % len(pat)] // len(vo))
                    music.add(fn(440 * 2 ** ((m - 69) / 12), rate * 1.5, vel * (1 if k % 4 == 0 else .8)), tt, g, np.sin(k * .7) * .4, v)
                    k += 1; tt += rate
        elif ty == "pulse":
            t0, t1, bpm = T(c["t0"]), T(c["t1"]), c.get("bpm", 90); sd = 30 / bpm; f = hz(c.get("note", "D1")); acc = c.get("accent", [1, 0, 0, 0])
            i, tt = 0, t0
            while tt < t1:
                n = int(sd * .9 * SR); s = np.arange(n) / SR
                x = (np.sin(2 * np.pi * f * s) + .5 * polyblep_saw(f * 2, n)) * np.exp(-s / (sd * .5)) * (1 if acc[i % len(acc)] else .55)
                music.add(lp(x, 400 + 600 * acc[i % len(acc)]), tt, g, 0, v * .3)
                i += 1; tt = t0 + i * sd + (c.get("swing", 0) * sd if i % 2 else 0)
        elif ty == "drums":
            for tt, x, pp in drums(T(c["t0"]), T(c["t1"]), c.get("bpm", 100), {k_: c.get(k_) for k_ in ("kick", "snare", "hat")}, c.get("step", 16)):
                music.add(x, tt, g, pp, v * .3, "room")
        elif ty == "air":
            t0, t1 = T(c["t0"]), T(c["t1"]); n = int((t1 - t0) * SR)
            x = np.stack([lp(noise(n), 400 + 2500 * c.get("tone", .3)), lp(noise(n), 400 + 2500 * c.get("tone", .3))], 1)
            music.add(hp(x, 80) * adsr(n, 2, .1, 1, 2)[:, None] * .15, t0, g, 0, 0)
        else: raise SystemExit("未知配乐类型 " + ty)

    for c in cfg.get("sfx", []) if only != "music" else []:
        ty, g, p, v = c["type"], c.get("gain", -10), c.get("pan", 0), c.get("verb", .2)
        ts = c.get("t"); ts = ts if isinstance(ts, list) else [ts]
        for t_ in ts:
            t = T(t_) if t_ is not None else None
            if ty == "impact": fx.add(sfx_impact(c.get("size", .7)), t, g, 0, v + .15)
            elif ty == "boom": fx.add(sfx_boom(c.get("note", "A0")), t, g, 0, v)
            elif ty == "whoosh": x, pk = sfx_whoosh(c.get("dur", .7), c.get("dir", 1)); fx.add(x, t - pk, g, 0, v)
            elif ty == "riser": du = c.get("dur", 3); fx.add(sfx_riser(du), t - du, g, 0, v)
            elif ty == "reverse": du = c.get("dur", 1.5); fx.add(sfx_reverse(du, c.get("note", "E5")), t - du, g, 0, 0)
            elif ty == "tick": fx.add(sfx_tick(c.get("pitch", 1)), t, g, p, v)
            elif ty == "glitch": fx.add(sfx_glitch(c.get("dur", .3)), t, g, 0, v)
            elif ty == "heart": fx.add(sfx_heart(c.get("n", 2), c.get("bpm", 60), c.get("pitch", 1.0)), t, g, 0, v)
            elif ty == "shimmer": fx.add(sfx_shimmer(c.get("dur", 2)), t, g, 0, v + .3)
            elif ty == "swell": du = c.get("dur", 2); fx.add(sfx_swell(du, c.get("note", "D4")), t - du, g, 0, v + .2)
            elif ty == "ding": fx.add(sfx_ding(c.get("note", "E6")), t, g, p, v + .2)
            elif ty == "thunder": fx.add(sfx_thunder(c.get("near", .5)), t, g, 0, v + .2)
            elif ty == "snip": fx.add(sfx_snip(), t, g, p, v)
            elif ty == "paper": fx.add(sfx_paper(c.get("dur", .6)), t, g, p, v)
            elif ty == "scribble": fx.add(sfx_scribble(c.get("dur", .9)), t, g, p, v)
            elif ty == "whir": fx.add(sfx_whir(T(c["t0"]), T(c["t1"]), c.get("rate", 6)), T(c["t0"]), g, p, v); break
            elif ty == "rain": fx.add(sfx_rain(T(c["t0"]), T(c["t1"]), c.get("density", 1)), T(c["t0"]), g, 0, v); break
            elif ty == "fire": fx.add(sfx_fire(T(c["t0"]), T(c["t1"]), c.get("rate", 40)), T(c["t0"]), g, p, v); break
            elif ty == "crickets": fx.add(sfx_crickets(T(c["t0"]), T(c["t1"]), c.get("n", 5)), T(c["t0"]), g, 0, v); break
            elif ty == "underwater": fx.add(sfx_underwater(T(c["t0"]), T(c["t1"])), T(c["t0"]), g, 0, v); break
            elif ty == "cityhum": fx.add(sfx_cityhum(T(c["t0"]), T(c["t1"])), T(c["t0"]), g, 0, v); break
            elif ty == "bubbles": fx.add(sfx_bubbles(c.get("n", 6), c.get("spread", .6)), t, g, 0, v)
            elif ty == "splash": fx.add(sfx_splash(c.get("size", .6)), t, g, 0, v)
            elif ty == "growl": fx.add(sfx_growl(c.get("dur", 1.6)), t, g, 0, v)
            elif ty == "mumble": fx.add(SV.mumble(c.get("rate", 1), c.get("muffle", 9000), c.get("drive", 0), c.get("rev", False), c.get("pitch", 1), c.get("seed", 0)), t, g, p, v, c.get("space", "room"))
            elif ty == "tape": fx.add(SV.tape(c.get("dur", .5)), t, g, p, v)
            elif ty == "alarm": fx.add(SV.alarm(c.get("pitch", 1)), t, g, p, v)
            elif ty == "clunk": fx.add(SV.clunk(), t, g, p, v)
            elif ty == "pop": fx.add(SV.pop(c.get("pitch", 1)), t, g, p, v)
            elif ty == "coin": fx.add(SV.coin(), t, g, p, v)
            elif ty == "slap": fx.add(SV.slap(c.get("size", 1)), t, g, p, v)
            elif ty == "jingle":   # 一小串上行的音（游戏"获得"提示）：notes 用空格分开，step 每个音间隔
                for i_, nm in enumerate(c.get("notes", "C5 E5 G5 C6").split()):
                    fx.add(INST[c.get("inst", "marimba")](hz(nm), .45, c.get("vel", .7)), t + i_ * c.get("step", .07), g, p + (i_ % 2 - .5) * .2, v)
            elif ty == "murmur": fx.add(SV.murmur(T(c["t0"]), T(c["t1"]), c.get("n", 8)), T(c["t0"]), g, 0, v, "room"); break
            elif ty == "steps": fx.add(SV.steps(T(c["t0"]), T(c["t1"]), c.get("rate", 1.8)), T(c["t0"]), g, 0, v); break
            elif ty == "whisper": fx.add(SV.whisper(T(c["t0"]), T(c["t1"]), c.get("n0", 1), c.get("n1", 10)), T(c["t0"]), g, 0, v); break
            elif ty == "wind": fx.add(SV.wind(T(c["t0"]), T(c["t1"]), c.get("gust", .5)), T(c["t0"]), g, 0, v); break
            elif ty == "waves": fx.add(SV.waves(T(c["t0"]), T(c["t1"]), c.get("rate", .11)), T(c["t0"]), g, 0, v); break
            elif ty == "type":
                for tt, x in sfx_type(T(c["t0"]), T(c["t1"]), c.get("rate", 14)): fx.add(x, tt, g, p, v)
                break
            else: raise SystemExit("未知音效类型 " + ty)

    m = music.render(); s = fx.render()
    # 音效硬静音区间（高潮后硬切黑场）："mute": [[t0, t1], ...]，t0 处 8ms 切掉（连混响尾巴一起），t1 处 0.3s 渐回
    for a_, b_ in cfg.get("mute", []):
        a_, b_ = T(a_), T(b_); tt_ = np.arange(N) / SR
        gm = np.clip(np.maximum((a_ - tt_) / .008, (tt_ - b_) / .3), 0, 1)
        s *= gm[:, None]
    # 配乐总线自动化
    if cfg.get("automation"):
        pts = sorted((T(a), b) for a, b in cfg["automation"])
        gain = np.interp(np.arange(N) / SR, [a for a, _ in pts], [b for _, b in pts])
        m *= db(gain)[:, None]
    sf.write(os.path.join(d, "audio", "music.wav"), m.astype(np.float32), SR, subtype="FLOAT")
    sf.write(os.path.join(d, "audio", "sfx.wav"), s.astype(np.float32), SR, subtype="FLOAT")

    # 混音：人声出现时配乐闪避（侧链）
    vo = np.zeros((N, 2)); vo[: min(N, len(voice))] = voice[:N] if voice.ndim == 2 else np.stack([voice[:N]] * 2, 1)
    if "--solo" in sys.argv: vo[:] = 0
    env = np.abs(vo).mean(1)
    env = maximum_filter1d(env, int(.15 * SR))
    env = signal.sosfilt(signal.butter(1, 3 / (SR / 2), output="sos"), env)
    act = np.clip(env / (np.percentile(env[env > 1e-4], 50) if (env > 1e-4).any() else 1), 0, 1)
    duck = db(-cfg.get("duck", 8) * act)[:, None]
    mix = vo + m * duck + s * (1 - .25 * act)[:, None]
    mix = hp(mix, 25)
    import pyloudnorm as pyln
    lufs = pyln.Meter(SR).integrated_loudness(mix)
    target_lufs = cfg.get("lufs", -14)
    if target_lufs is not None and np.isfinite(lufs):
        mix *= db(target_lufs - lufs)
    # 前瞻限幅到 -1 dBFS
    w = int(.005 * SR)
    peak = maximum_filter1d(np.abs(mix).max(1), 2 * w)
    gl = uniform_filter1d(np.minimum(1, .89 / np.maximum(peak, 1e-9)), w)
    ceiling = 10 ** (-1 / 20)
    mix = np.clip(mix * gl[:, None], -ceiling, ceiling)
    sf.write(os.path.join(d, "audio", "mix.wav"), mix.astype(np.float32), SR, subtype="FLOAT")
    measured = pyln.Meter(SR).integrated_loudness(mix)
    print(f"mix.wav {end:.2f}s  原始 {lufs:.1f} LUFS  输出实测 {measured:.1f} LUFS  限幅最多压 {20 * np.log10(gl.min()):.1f} dB")

if __name__ == "__main__": main()
