// 逐帧手绘（Frame by Frame）—— 说明见 references/风格_05_逐帧手绘.md
// 每一帧"重画"：所有线和色块按 12fps 一拍二换一次形（boil），线是有粗细变化的笔刷，色块是带水痕的水彩。
//   onTwos(t)        当前是第几拍（12fps）—— 所有抖动的种子
//   wobble(pts, b)   把一串点按拍抖一下（手画每帧都不一样）
//   brush(g, pts, b) 笔刷：两头尖、中间粗、边缘微抖的墨线（画成填充多边形，不是 stroke）
//   wash(g, pts, b)  水彩色块：三层错位半透明 + 深一点的水痕边 + 纸纹
//   teardrop / blob  手绘常用形状（火苗、云、水滴）
import { rnd, lerp } from '@kit';
type Ctx = CanvasRenderingContext2D;

export const HAND = { paper: '#f3e9d2', ink: '#2a211c', red: '#d8432f', yellow: '#f6c445', orange: '#ef7d2a', blue: '#4f7cac', green: '#6f9a55', wood: '#c98a4b' };
export const onTwos = (t: number, fps = 12) => Math.floor(t * fps / 2);
export const wobble = (pts: number[], b: number, amp = 2, seed = 0) => pts.map((v, i) => v + (rnd(Math.floor(i / 2) * 2 + (i % 2) + b * 31, seed) - .5) * amp * 2);

/** 笔刷：pts 是中心线；w 最粗处宽度；两头按 sin 收尖；边缘按拍微抖 */
export const brush = (g: Ctx, pts: number[], b: number, o: { w?: number; col?: string; seed?: number; jit?: number; taper?: number } = {}) => {
  const w = o.w ?? 7, col = o.col ?? HAND.ink, s = o.seed ?? 0, jit = o.jit ?? 1.4, n = pts.length / 2;
  if (n < 2) return;
  const P = wobble(pts, b, jit, s), L: number[] = [], R: number[] = [];
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
    let dx = P[i1 * 2] - P[i0 * 2], dy = P[i1 * 2 + 1] - P[i0 * 2 + 1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const u = i / (n - 1), pr = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), o.taper ?? .55) * (.8 + .4 * rnd(i + b * 7, s + 5));
    const hw = Math.max(.6, w * .5 * pr);
    L.push(P[i * 2] - dy * hw, P[i * 2 + 1] + dx * hw); R.push(P[i * 2] + dy * hw, P[i * 2 + 1] - dx * hw);
  }
  g.beginPath(); g.moveTo(L[0], L[1]);
  for (let i = 2; i < L.length; i += 2) g.lineTo(L[i], L[i + 1]);
  for (let i = R.length - 2; i >= 0; i -= 2) g.lineTo(R[i], R[i + 1]);
  g.closePath(); g.fillStyle = col; g.fill();
};
/** 闭合形状的描边：首尾接上再画 */
export const brushClosed = (g: Ctx, pts: number[], b: number, o: Parameters<typeof brush>[3] = {}) => brush(g, [...pts, pts[0], pts[1], pts[2], pts[3]], b, { taper: .15, ...o });

/** 水彩：三层错位半透明 + 水痕边 */
export const wash = (g: Ctx, pts: number[], b: number, col: string, seed = 0, a = .8) => {
  const path = (p: number[]) => { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); };
  g.save(); g.globalAlpha = a * .45;
  for (let k = 0; k < 3; k++) { path(wobble(pts, b * 3 + k, 3.5, seed + k * 11)); g.fillStyle = col; g.fill(); }
  g.globalAlpha = a * .35; path(wobble(pts, b, 2, seed + 40)); g.strokeStyle = col; g.lineWidth = 3; g.stroke();
  g.restore();
};

/** 形状生成 */
export const ellipsePts = (cx: number, cy: number, rx: number, ry: number, n = 28, rot = 0) => { const p: number[] = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; p.push(cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)); } return p; };
/** 火苗 / 水滴：底圆顶尖；sway 顶部左右摆，flick 尖端甩动 */
export const teardrop = (cx: number, cy: number, r: number, h: number, sway = 0, n = 30) => {
  const p: number[] = [];
  for (let i = 0; i < n; i++) {
    const u = i / n, a = u * Math.PI * 2;
    const up = Math.max(0, -Math.sin(a)), x = Math.cos(a) * r * (1 - up * .85), y = (Math.sin(a) > 0 ? Math.sin(a) * r : -up * h);
    p.push(cx + x + sway * up * up * h * .4, cy + y);
  }
  return p;
};
export const blob = (cx: number, cy: number, r: number, seed: number, n = 24, lumpy = .18) => { const p: number[] = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = r * (1 + lumpy * (Math.sin(a * 3 + seed) * .6 + Math.sin(a * 5 + seed * 2) * .4)); p.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } return p; };
export const linePts = (x0: number, y0: number, x1: number, y1: number, n = 12, bend = 0) => { const p: number[] = []; for (let i = 0; i <= n; i++) { const u = i / n; p.push(lerp(x0, x1, u) - (y1 - y0) * bend * Math.sin(Math.PI * u), lerp(y0, y1, u) + (x1 - x0) * bend * Math.sin(Math.PI * u)); } return p; };

// ---------------- 字幕：手写感（每个字按拍轻轻歪一下）----------------
import React from 'react';
import { F, W } from '@kit';
type Line = { id: string; text: string; t0: number; t1: number };
export const HandSub: React.FC<{ t: number; lines: Line[]; bottom?: number; col?: string; hi?: string }> = ({ t, lines, bottom = 80, col = HAND.ink, hi = HAND.red }) => {
  const cur = lines.find(l => t >= l.t0 - .05 && t < l.t1 + .3);
  if (!cur) return null;
  const b = onTwos(t); let h = 0; const chars: { c: string; h: number }[] = [];
  for (const c of [...cur.text.replace(/\*\*/g, '\u0001')]) { if (c === '\u0001') { h = 1 - h; continue; } chars.push({ c, h }); }
  const n = Math.floor((t - cur.t0) / .06) + 1;
  return (
    <div style={{ position: 'absolute', left: 0, width: W, bottom, textAlign: 'center', fontFamily: F.fun, fontSize: 56, color: col, letterSpacing: '.06em', opacity: t > cur.t1 + .15 ? 0 : 1 }}>
      {chars.map((o, i) => i < n && <span key={i} style={{ display: 'inline-block', color: o.h ? hi : undefined, transform: `rotate(${((rnd(i + b * 13, 3) - .5) * 6).toFixed(1)}deg) translateY(${((rnd(i + b * 7, 4) - .5) * 4).toFixed(1)}px)` }}>{o.c}</span>)}
    </div>
  );
};
