"""配音：projects/P/vo.json → audio/voice.wav + vo.timing.json（逐句、逐词时间，画面和音效都用它对齐）

用法：.venv/bin/python scripts/voice.py P [--force]

vo.json：
{
  "voice": "zh-CN-YunjianNeural", "rate": "-8%", "pitch": "-2Hz",   // 全局默认，单句可覆盖
  "start": 1.5,          // 第一句开始的秒数
  "gap": 0.55,           // 句间默认停顿
  "fx": "room",          // 人声处理：dry / room（轻房间混响，纪录片默认）/ warm（近讲温暖）/ radio（收音机、回忆）/ hall（大空间、史诗）
  "lines": [
    {"id": "a1", "text": "第一句。"},
    {"id": "a2", "text": "第二句。", "gap": 1.2},             // 这句前停 1.2 秒（留给画面呼吸）
    {"id": "b1", "text": "第三句。", "at": 21.0},             // 绝对时间开始（对齐音乐重拍）；也可写 "at": "drop+0.2"（引用 beats.json）
    {"id": "b2", "text": "第四句。", "rate": "-15%", "voice": "zh-CN-XiaoxiaoNeural", "fx": "radio"}
  ]
}
单句文本里可以用 "，" "……" 控制换气，不要用 SSML。改了 vo.json 重跑即可（按 文本+声音 缓存，没改的句子不重新合成）。
"""
import asyncio, hashlib, json, os, subprocess, sys
import numpy as np
import soundfile as sf
from scipy import signal
sys.path.insert(0, os.path.dirname(__file__))
from timeref import Resolver

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def synth(text, voice, rate, pitch, out_mp3):
    import edge_tts
    async def go():
        c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
        words, buf = [], bytearray()
        async for ch in c.stream():
            if ch["type"] == "audio": buf += ch["data"]
            elif ch["type"] == "WordBoundary":
                words.append({"w": ch["text"], "t0": ch["offset"] / 1e7, "t1": (ch["offset"] + ch["duration"]) / 1e7})
        open(out_mp3, "wb").write(buf)
        return words
    for attempt in range(4):
        try: return asyncio.run(go())
        except Exception as e:
            print(f"  重试 {attempt + 1}: {e}")
    raise SystemExit("edge-tts 连续失败")

def load(mp3):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()

def speech_bounds(x, th_db=-45):
    e = np.sqrt(np.maximum(signal.convolve(x ** 2, np.ones(480) / 480, mode="same"), 0) + 1e-12)
    idx = np.where(20 * np.log10(e) > th_db)[0]
    if not len(idx): return 0, len(x)
    return max(0, idx[0] - int(.03 * SR)), min(len(x), idx[-1] + int(.08 * SR))

def ir(seconds, damp, seed=1):
    rng = np.random.default_rng(seed)
    n = int(seconds * SR); t = np.arange(n) / SR
    out = []
    for ch in range(2):
        noise = rng.standard_normal(n) * np.exp(-6.9 * t / seconds)
        b, a = signal.butter(1, damp / (SR / 2))
        out.append(signal.lfilter(b, a, noise))
    h = np.stack(out, 1); h[: int(.012 * SR)] *= np.linspace(0, 1, int(.012 * SR))[:, None]
    return h / np.abs(h).sum(0).max() * 6

def process(x, fx):
    """单声道人声 → 立体声，带 EQ/压缩/空间"""
    sos = signal.butter(2, 75 / (SR / 2), "highpass", output="sos"); x = signal.sosfilt(sos, x)
    if fx == "radio":
        x = signal.sosfilt(signal.butter(4, [350 / (SR / 2), 3400 / (SR / 2)], "band", output="sos"), x); x = np.tanh(x * 3) / 2
    if fx == "warm":  # 近讲：低频加一点、齿音收一点
        lo = signal.sosfilt(signal.butter(2, 220 / (SR / 2), output="sos"), x); x = x + .25 * lo
        x = x - .25 * signal.sosfilt(signal.butter(2, [5500 / (SR / 2), 9000 / (SR / 2)], "band", output="sos"), x)
    # 轻压缩（RMS 包络，3:1）
    env = np.sqrt(signal.sosfilt(signal.butter(1, 12 / (SR / 2), output="sos"), x ** 2) + 1e-9)
    db = 20 * np.log10(env); over = np.maximum(db + 24, 0); x = x * 10 ** (-over * (1 - 1 / 3) / 20)
    st = np.stack([x, x], 1)
    wet = {"room": (.45, 5000, .10), "hall": (2.4, 3500, .16), "warm": (.3, 6000, .05), "radio": (.25, 3000, .06)}.get(fx)
    if wet:
        h = ir(wet[0], wet[1]); rv = np.stack([signal.fftconvolve(x, h[:, c])[: len(x)] for c in range(2)], 1)
        st = st + rv * wet[2]
    return st

def main():
    proj = sys.argv[1]; force = "--force" in sys.argv
    d = os.path.join(ROOT, "projects", proj); cache = os.path.join(d, "audio", "vo_cache"); os.makedirs(cache, exist_ok=True)
    cfg = json.load(open(os.path.join(d, "vo.json")))
    res = Resolver(d, need_vo=False)
    G = {k: cfg.get(k) for k in ("voice", "rate", "pitch")}
    G = {"voice": G["voice"] or "zh-CN-YunjianNeural", "rate": G["rate"] or "+0%", "pitch": G["pitch"] or "+0Hz"}
    cursor = float(cfg.get("start", 1.0)); gap0 = float(cfg.get("gap", .55))
    segs, timing = [], []
    for i, ln in enumerate(cfg["lines"]):
        v, r, p = ln.get("voice", G["voice"]), ln.get("rate", G["rate"]), ln.get("pitch", G["pitch"])
        key = hashlib.md5(json.dumps([ln["text"], v, r, p]).encode()).hexdigest()[:12]
        mp3, wj = os.path.join(cache, key + ".mp3"), os.path.join(cache, key + ".json")
        if force or not os.path.exists(mp3):
            print(f"合成 {ln['id']}: {ln['text']}")
            json.dump(synth(ln["text"], v, r, p, mp3), open(wj, "w"), ensure_ascii=False)
        words = json.load(open(wj)); x = load(mp3)
        a, b = speech_bounds(x); x = x[a:b]; off = a / SR
        if "at" in ln: start = res.time(ln["at"], timing)
        else: start = cursor + (float(ln.get("gap", gap0)) if i else 0)
        fx = ln.get("fx", cfg.get("fx", "room"))
        segs.append((start, x, fx, ln.get("gain", 0)))
        dur = len(x) / SR
        ws = [{"w": w["w"], "t0": round(start + max(0, w["t0"] - off), 3), "t1": round(start + min(dur, w["t1"] - off), 3)} for w in words]
        timing.append({"id": ln["id"], "text": ln["text"], "t0": round(start, 3), "t1": round(start + dur, 3), "words": ws})
        cursor = start + dur
    total = cursor + 1.0
    out = np.zeros((int(total * SR) + SR * 4, 2))
    for start, x, fx, g in segs:
        y = process(x, fx) * 10 ** (g / 20); i0 = int(start * SR)
        out[i0:i0 + len(y)] += y[: len(out) - i0]
    out = out[: int(total * SR)]
    import pyloudnorm as pyln
    lufs = pyln.Meter(SR).integrated_loudness(out)
    out *= 10 ** ((-16 - lufs) / 20)     # 人声单轨归一到 -16 LUFS，混音时再整体到 -14
    out = np.clip(out, -.98, .98)
    sf.write(os.path.join(d, "audio", "voice.wav"), out.astype(np.float32), SR, subtype="FLOAT")
    json.dump({"duration": round(total, 3), "lines": timing}, open(os.path.join(d, "vo.timing.json"), "w"), ensure_ascii=False, indent=1)
    for t in timing: print(f"  {t['id']:>6} {t['t0']:7.2f}–{t['t1']:7.2f}  {t['text']}")
    print(f"voice.wav {total:.2f}s  → vo.timing.json")

if __name__ == "__main__": main()
