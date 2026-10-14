// 配音时间轴（和 scripts/timeref.py 同一套语法）：画面、音效都用它对齐，改了配音整片自动跟着走
//   import timing from './vo.timing.json'; import beats from './beats.json';
//   const { T, line } = makeVO(timing, beats);
//   T('a3') 句子开始 · T('a3.end') 结束 · T('a3@眨眼') 某个词开始 · T('a3@眨眼.end') · T('drop') 命名节拍 · T('a3+0.4') · T(12.5)
export type VOWord = { w: string; t0: number; t1: number };
export type VOLine = { id: string; text: string; t0: number; t1: number; words: VOWord[] };
export type VOTiming = { duration: number; lines: VOLine[] };

export const makeVO = (timing: VOTiming, beats: Record<string, string | number> = {}) => {
  const byId: Record<string, VOLine> = Object.fromEntries(timing.lines.map(l => [l.id, l]));
  const T = (ref: string | number, depth = 0): number => {
    if (typeof ref === 'number') return ref;
    if (depth > 20) throw new Error('beats 循环引用: ' + ref);
    const s = ref.replace(/\s/g, '');
    const m = s.match(/^(.*?)([+-][\d.]+)?$/)!; const base = m[1], off = parseFloat(m[2] || '0');
    if (/^[\d.]+$/.test(base)) return parseFloat(base) + off;
    const mm = base.match(/^([^.@]+)(?:@([^.]+))?(\.end)?$/);
    if (!mm) throw new Error('看不懂的时间引用: ' + ref);
    const [, name, word, end] = mm;
    if (name in beats && !word) return T(beats[name], depth + 1) + off;
    const ln = byId[name]; if (!ln) throw new Error('没有这句/这个节拍: ' + name);
    if (word) {
      // 在词流拼起来的文本里找（TTS 的分词不一定和你想的一样：「氢聚|变成」「吞|下」）
      const cat = ln.words.map(w => w.w).join(''), i = cat.indexOf(word);
      if (i < 0) { const j = ln.text.indexOf(word); if (j < 0) throw new Error(`${name} 里找不到「${word}」`);
        return ln.t0 + (ln.t1 - ln.t0) * (j + (end ? word.length : 0)) / Math.max(1, ln.text.length) + off; }
      const at = (ci: number, useEnd: boolean) => { let n = 0; for (const w of ln.words) { const L = w.w.length; if (ci < n + L) { const f = (ci - n + (useEnd ? 1 : 0)) / L; return w.t0 + (w.t1 - w.t0) * f; } n += L; } return ln.t1; };
      return (end ? at(i + word.length - 1, true) : at(i, false)) + off;
    }
    return (end ? ln.t1 : ln.t0) + off;
  };
  return { T, line: (id: string) => byId[id], lines: timing.lines, duration: timing.duration };
};
