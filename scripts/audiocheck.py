"""听不见就量：检查 audio/mix.wav（或指定文件）的响度、峰值、频段平衡、人声/配乐比、咔哒声，并出一张频谱+波形图
用法：.venv/bin/python scripts/audiocheck.py P [文件名，默认 mix.wav]   → audio/check.png
参考值：成片 -14 LUFS ±1；峰值 ≤ -1 dBFS；人声段落 人声比配乐+音效 高 ≥ 8 dB（听得清台词）；
       频段占比（能量）大致 sub<60Hz 3~12%、low 60-250 20~40%、mid 250-2k 30~50%、presence 2-6k 8~20%、air >6k 1~6%
       air 太高 = 刺耳/嘶嘶声；sub 太高 = 轰头、手机外放破音；咔哒 > 0 要找到时间点修"""
import os, sys, subprocess, json
import numpy as np, soundfile as sf
from scipy import signal
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
proj = sys.argv[1]; name = sys.argv[2] if len(sys.argv) > 2 else "mix.wav"
d = os.path.join(ROOT, "projects", proj, "audio"); x, sr = sf.read(os.path.join(d, name)); m = x.mean(1) if x.ndim == 2 else x
import pyloudnorm as pyln
print(f"{name}: {len(m) / sr:.2f}s  响度 {pyln.Meter(sr).integrated_loudness(x):.1f} LUFS  峰值 {20 * np.log10(np.abs(x).max() + 1e-12):.1f} dBFS")
f, P = signal.welch(m, sr, nperseg=8192); bands = [(20, 60, "sub"), (60, 250, "low"), (250, 2000, "mid"), (2000, 6000, "presence"), (6000, 20000, "air")]
tot = P[(f >= 20) & (f < 20000)].sum()
print("频段能量占比  " + "  ".join(f"{n} {P[(f >= a) & (f < b)].sum() / tot * 100:.1f}%" for a, b, n in bands))
# 咔哒：高通后的一阶差分异常尖峰
# 人声里的齿音/爆破音会误报，所以有分轨时只查配乐+音效
_bgs = [os.path.join(d, n) for n in ("music.wav", "sfx.wav") if os.path.exists(os.path.join(d, n))]
cm = m if name != "mix.wav" or not _bgs else sum(sf.read(p)[0].mean(1) for p in _bgs)
h = signal.sosfilt(signal.butter(4, 8000 / (sr / 2), "highpass", output="sos"), cm); dd = np.abs(np.diff(h))
th = np.median(dd) * 60 + 1e-4; clicks = np.where(dd > max(th, .05))[0]
groups = [c for i, c in enumerate(clicks) if i == 0 or c - clicks[i - 1] > sr * .05]
print(f"疑似咔哒 {len(groups)} 处" + (": " + ", ".join(f"{c / sr:.2f}s" for c in groups[:12]) if groups else ""))
vp, mp, sp = (os.path.join(d, n) for n in ("voice.wav", "music.wav", "sfx.wav"))
if name == "mix.wav" and all(os.path.exists(p) for p in (vp, mp)):
    v = sf.read(vp)[0]; mu = sf.read(mp)[0]; s = sf.read(sp)[0] if os.path.exists(sp) else 0 * mu
    n = min(len(v), len(mu)); v, bg = v[:n].mean(1), (mu[:n] + s[:n]).mean(1)
    w = int(.4 * sr); ev = np.sqrt(np.convolve(v ** 2, np.ones(w) / w, "same")); eb = np.sqrt(np.convolve(bg ** 2, np.ones(w) / w, "same"))
    act = ev > ev.max() * .1
    if act.any(): print(f"说话时 人声 − 背景 ≈ {20 * np.log10(np.median(ev[act]) / (np.median(eb[act]) + 1e-9)):.1f} dB（≥ 8 才听得清）")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(d, name), "-filter_complex",
  "[0]showspectrumpic=s=1600x360:legend=1:scale=log:fscale=log:color=intensity,scale=1800:420[a];[0]showwavespic=s=1800x140:colors=0x66ccff[b];[a][b]vstack=inputs=2",
  os.path.join(d, "check.png")])
print("频谱+波形 →", os.path.join(d, "check.png"))
