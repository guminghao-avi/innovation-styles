"""时间引用解析（Python 端；TS 端在 src/kit/vo.ts，语法一致）
  12.5            绝对秒
  a3              vo 句子 a3 的开始       a3.end  句子结束
  a3@眨眼          句子 a3 里第一个包含「眨眼」的词的开始（词.end 同理：a3@眨眼.end）
  drop            beats.json 里的命名节拍（值本身也可以是表达式）
  任意上式 +0.4 / -1.2
"""
import json, os, re

class Resolver:
    def __init__(self, d, need_vo=True):
        self.lines = {}
        self.duration = 0
        p = os.path.join(d, "vo.timing.json")
        if os.path.exists(p):
            data = json.load(open(p, encoding='utf-8'))
            self.duration = data.get('duration', 0)
            for ln in data["lines"]: self.lines[ln["id"]] = ln
        elif need_vo: raise SystemExit("还没有 vo.timing.json，先跑 scripts/silent.py（配音模式用 voice.py）")
        bp = os.path.join(d, "beats.json")
        self.beats = json.load(open(bp, encoding='utf-8')) if os.path.exists(bp) else {}

    def time(self, ref, extra_lines=None, depth=0):
        if isinstance(ref, (int, float)): return float(ref)
        if depth > 20: raise ValueError("beats 循环引用: " + ref)
        s = str(ref).replace(" ", "")
        m = re.match(r"^(.*?)([+-][\d.]+)?$", s); base, off = m.group(1), float(m.group(2) or 0)
        if re.fullmatch(r"[\d.]+", base): return float(base) + off
        lines = dict(self.lines)
        for ln in (extra_lines or []): lines[ln["id"]] = ln
        mm = re.fullmatch(r"([^.@]+)(?:@([^.]+))?(\.end)?", base)
        if not mm: raise ValueError("看不懂的时间引用: " + ref)
        name, word, end = mm.groups()
        if name in self.beats and not word: return self.time(self.beats[name], extra_lines, depth + 1) + off
        if name not in lines: raise ValueError(f"没有这句/这个节拍: {name}")
        ln = lines[name]
        if word:
            # 在词流拼起来的文本里找（TTS 的分词不一定和你想的一样）
            cat = "".join(w["w"] for w in ln["words"]); i = cat.find(word)
            if i < 0:
                txt = ln["text"]; j = txt.find(word)
                if j < 0: raise ValueError(f"{name} 里找不到「{word}」")
                return ln["t0"] + (ln["t1"] - ln["t0"]) * (j + (len(word) if end else 0)) / max(1, len(txt)) + off
            def at(ci, use_end):
                n = 0
                for w in ln["words"]:
                    L = len(w["w"])
                    if ci < n + L: return w["t0"] + (w["t1"] - w["t0"]) * (ci - n + (1 if use_end else 0)) / L
                    n += L
                return ln["t1"]
            return (at(i + len(word) - 1, True) if end else at(i, False)) + off
        return (ln["t1"] if end else ln["t0"]) + off
