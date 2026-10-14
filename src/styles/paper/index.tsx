// 纸艺手绘（剪纸分层立体书 · 定格动画 · 墨线小人）—— 说明见 references/风格_04_纸艺手绘.md
// 核心三件事：① 每样东西都是一张"剪下来的纸"：平涂色 + 不规则剪边 + 投在后一层上的软影 + 全局纸纹；
//            ② 动画按 12fps"一拍二"走（stepT），每一拍形状轻轻抖一下（boil）—— 定格感；
//            ③ 人物和标注是墨线手绘：粗圆头线、略歪，跟着 boil 抖。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { F, W, k, E, lerp, rnd, clamp } from '@kit';
type Ctx = CanvasRenderingContext2D;

export const P = {
  paper: '#f4ecdc', paper2: '#e9dcc3', ink: '#2b2622', sky: '#cfe0e3', sun: '#f2b33d', terra: '#d9734e', sage: '#9cb48a', sage2: '#6f8f68',
  navy: '#3b4a6b', mustard: '#e7b23f', rose: '#e58f86', blue: '#7fa6c9', tape: 'rgba(240,228,190,.72)',
};

// ---------------- 定格时间 ----------------
/** 一拍二：时间吸附到 12fps 的格子上（位置、缩放都用它算，动起来就是"一格一格"的） */
export const stepT = (t: number, fps = 12) => Math.floor(t * fps) / fps;
/** 第几拍（boil 的种子） */
export const beat = (t: number, fps = 12) => Math.floor(t * fps);

// ---------------- 纸纹 ----------------
let TEX: HTMLCanvasElement | null = null;
/** 512² 的纸纹（纤维 + 斑点），生成一次；整帧最后用 multiply 盖一层 */
export const paperTex = () => {
  if (TEX) return TEX;
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {                    // 纤维：短而弯的细线
    const x = rnd(i, 1) * 512, y = rnd(i, 2) * 512, a = rnd(i, 3) * Math.PI, l = 4 + rnd(i, 4) * 16;
    g.strokeStyle = `rgba(${rnd(i, 5) > .5 ? '120,100,70' : '255,255,255'},${.05 + .08 * rnd(i, 6)})`; g.lineWidth = .6 + rnd(i, 7);
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a) * l * .5 + 3, y + Math.sin(a) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(110,90,60,${.04 + .06 * rnd(i, 9)})`; g.fillRect(rnd(i, 10) * 512, rnd(i, 11) * 512, 1 + rnd(i, 12) * 2, 1 + rnd(i, 12) * 2); }
  TEX = c; return c;
};
export const overlayPaper = (g: Ctx, a = .55) => {
  g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = a;
  g.fillStyle = g.createPattern(paperTex(), 'repeat')!; g.fillRect(0, 0, W, 1080); g.restore();
};

// ---------------- 剪纸形状 ----------------
/** 剪边：把一条折线加上不规则的小缺口（剪刀剪出来的不直），seed 固定 → 不会每帧乱跳；b = boil 拍 */
export const cutEdge = (pts: number[], seed: number, amp = 2.2, b = 0) => {
  const out: number[] = [];
  for (let i = 0; i < pts.length; i += 2) {
    const j = i / 2, n = (rnd(j, seed) - .5) * amp * 2 + (rnd(j + b * 7, seed + 3) - .5) * amp * .6;
    out.push(pts[i] + n, pts[i + 1] + (rnd(j, seed + 1) - .5) * amp * 2);
  }
  return out;
};
/** 一张剪纸：填色 + 投影（落在后面那层上）+ 很淡的亮边（纸的厚度） */
export const paperShape = (g: Ctx, pts: number[], col: string, o: { shadow?: number; dx?: number; dy?: number; lift?: number } = {}) => {
  const path = () => { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); };
  const sh = o.shadow ?? .28, lift = o.lift ?? 1;
  if (sh > 0) { g.save(); g.shadowColor = `rgba(60,40,20,${sh})`; g.shadowBlur = 14 * lift; g.shadowOffsetX = (o.dx ?? 4) * lift; g.shadowOffsetY = (o.dy ?? 7) * lift; path(); g.fillStyle = col; g.fill(); g.restore(); }
  path(); g.fillStyle = col; g.fill();
  g.save(); path(); g.clip(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.translate(-1.5, -1.5); path(); g.stroke(); g.restore();
};
/** 山 / 地面：顶边是一条起伏线，底边到画面底 */
export const hillPts = (y0: number, amp: number, freq: number, seed: number, x0 = -40, x1 = W + 40, n = 60) => {
  const pts: number[] = [];
  for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n); pts.push(x, y0 - amp * (Math.sin(x * freq + seed) * .6 + Math.sin(x * freq * 2.3 + seed * 2) * .3 + .4)); }
  pts.push(x1, 1200, x0, 1200);
  return pts;
};
export const circlePts = (cx: number, cy: number, r: number, n = 36) => { const p: number[] = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } return p; };
export const rectPts = (x: number, y: number, w: number, h: number, rot = 0, n = 4) => {
  const cx = x + w / 2, cy = y + h / 2, c = Math.cos(rot), s = Math.sin(rot), p: number[] = [];
  const corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  for (let i = 0; i < 4; i++) for (let j = 0; j < n; j++) {
    const [ax, ay] = corners[i], [bx, by] = corners[(i + 1) % 4], u = j / n, px = lerp(ax, bx, u) - cx, py = lerp(ay, by, u) - cy;
    p.push(cx + px * c - py * s, cy + px * s + py * c);
  }
  return p;
};

// ---------------- 墨线 ----------------
/** 手绘墨线：每拍抖一下（boil），粗、圆头 */
export const inkLine = (g: Ctx, pts: number[], b: number, o: { w?: number; col?: string; jit?: number; seed?: number; close?: boolean; fill?: string } = {}) => {
  const j = o.jit ?? 1.6, s = o.seed ?? 0;
  const q = pts.map((v, i) => v + (rnd(Math.floor(i / 2) * 3 + (i % 2) + b * 13, s) - .5) * j * 2);
  g.beginPath(); g.moveTo(q[0], q[1]);
  for (let i = 2; i < q.length - 2; i += 2) g.quadraticCurveTo(q[i], q[i + 1], (q[i] + q[i + 2]) / 2, (q[i + 1] + q[i + 3]) / 2);
  g.lineTo(q[q.length - 2], q[q.length - 1]);
  if (o.close) g.closePath();
  if (o.fill) { g.fillStyle = o.fill; g.fill(); }
  g.strokeStyle = o.col ?? P.ink; g.lineWidth = o.w ?? 6; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
};

/** 墨线小人（正面）：纸做的身体 + 圆头 + 线条四肢；mood 改表情；arm = 举手角度；s = 缩放 */
export const inkPerson = (g: Ctx, x: number, y: number, b: number, o: { s?: number; body?: string; mood?: 'calm' | 'worry' | 'smile' | 'shock'; arm?: number; walk?: number } = {}) => {
  const s = o.s ?? 1, body = o.body ?? P.navy, mood = o.mood ?? 'calm', wk = o.walk ?? 0;
  g.save(); g.translate(x, y); g.scale(s, s);
  const leg = Math.sin(wk * Math.PI * 2) * 14;
  inkLine(g, [-16, -70, -18 - leg * .3, -35, -20 - leg, 0], b, { w: 7, seed: 1 });
  inkLine(g, [16, -70, 18 + leg * .3, -35, 20 + leg, 0], b, { w: 7, seed: 2 });
  paperShape(g, cutEdge(rectPts(-38, -150, 76, 86, 0, 5), 21, 1.8, b), body, { shadow: .25, lift: .6 });
  const ar = o.arm ?? 0;
  inkLine(g, [-34, -138, -58, -110 + ar * -60, -66, -82 + ar * -110], b, { w: 7, seed: 3 });
  inkLine(g, [34, -138, 58, -110, 64, -84], b, { w: 7, seed: 4 });
  paperShape(g, cutEdge(circlePts(0, -196, 44, 28), 31, 1.4, b), P.paper, { shadow: .22, lift: .5 });
  inkLine(g, circlePts(0, -196, 44, 18).concat(circlePts(0, -196, 44, 18).slice(0, 4)), b, { w: 6, seed: 5 });
  // 表情
  g.fillStyle = P.ink;
  const ey = mood === 'shock' ? -204 : -200;
  for (const ex of [-15, 15]) { g.beginPath(); g.arc(ex, ey, mood === 'shock' ? 6 : 4.5, 0, Math.PI * 2); g.fill(); }
  if (mood === 'worry') { inkLine(g, [-12, -176, 0, -181, 12, -176], b, { w: 4, seed: 6 }); inkLine(g, [-24, -214, -8, -210], b, { w: 4, seed: 7 }); inkLine(g, [8, -210, 24, -214], b, { w: 4, seed: 8 }); }
  else if (mood === 'smile') inkLine(g, [-14, -182, 0, -172, 14, -182], b, { w: 4, seed: 6 });
  else if (mood === 'shock') { g.beginPath(); g.ellipse(0, -176, 7, 9, 0, 0, Math.PI * 2); g.fill(); }
  else inkLine(g, [-10, -178, 10, -178], b, { w: 4, seed: 6 });
  g.restore();
};

// ---------------- 贴纸 / 字幕 / 片名 ----------------
/** 拟声词贴纸：锯齿爆炸框 + 得意黑大字，按拍弹入（1.35 → 0.92 → 1）；t = 出现后的秒数 */
export const Sticker: React.FC<{ t: number; x: number; y: number; text: string; col?: string; rot?: number; size?: number; out?: number }> = ({ t, x, y, text, col = P.mustard, rot = -8, size = 64, out = 99 }) => {
  if (t < 0 || t > out + .25) return null;
  const st = stepT(t), s = st < .09 ? 1.35 : st < .17 ? .92 : 1, o = t > out ? 0 : 1;
  const n = 14, R = size * 1.7, pts: string[] = [];
  for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, r = (i % 2 ? .72 : 1) * R * (1 + (rnd(i, 3) - .5) * .18); pts.push(`${R * 1.2 + Math.cos(a) * r * 1.25},${R + Math.sin(a) * r}`); }
  return (
    <div style={{ position: 'absolute', left: x - R * 1.2, top: y - R, width: R * 2.4, height: R * 2, transform: `rotate(${rot + (beat(t) % 2 ? .6 : -.6)}deg) scale(${s})`, opacity: o }}>
      <svg width={R * 2.4} height={R * 2} style={{ position: 'absolute', overflow: 'visible', filter: 'drop-shadow(4px 7px 6px rgba(60,40,20,.3))' }}>
        <polygon points={pts.join(' ')} fill={col} stroke={P.ink} strokeWidth={6} strokeLinejoin="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.fun, fontSize: size, color: P.ink }}>{text}</div>
    </div>
  );
};

type Line = { id: string; text: string; t0: number; t1: number };
/** 字幕：一条撕下来的纸条 + 两端胶带，宋体墨色；**词** 赤陶红、「词」藏蓝；每句出现时按拍"拍"下来 */
export const PaperSub: React.FC<{ t: number; lines: Line[]; bottom?: number }> = ({ t, lines, bottom = 70 }) => {
  const cur = lines.find(l => t >= l.t0 - .05 && t < l.t1 + .35);
  if (!cur) return null;
  const parts: { s: string; h: number }[] = []; let h = 0, buf = '';
  for (const c of [...cur.text.replace(/\*\*/g, '\u0001')]) {
    const nh = c === '\u0001' ? (h === 1 ? 0 : 1) : c === '「' ? 2 : c === '」' ? 0 : -1;
    if (nh >= 0) { if (buf) parts.push({ s: buf, h }); buf = ''; h = nh; continue; }
    buf += c;
  }
  if (buf) parts.push({ s: buf, h });
  const a = stepT(t - cur.t0), drop = a < .09 ? -14 : a < .17 ? 4 : 0, out = t > cur.t1 + .2 ? 0 : 1;
  const rot = (rnd(lines.indexOf(cur), 4) - .5) * 1.6;
  return (
    <div style={{ position: 'absolute', left: 0, width: W, bottom, display: 'flex', justifyContent: 'center', opacity: out }}>
      <div style={{ position: 'relative', transform: `translateY(${drop}px) rotate(${rot}deg)` }}>
        <div style={{ position: 'absolute', inset: '-6px -26px', background: P.paper, clipPath: 'polygon(1% 8%, 4% 0, 30% 5%, 62% 1%, 97% 4%, 100% 40%, 98% 96%, 70% 100%, 35% 95%, 3% 100%, 0 60%)', filter: 'drop-shadow(4px 7px 6px rgba(60,40,20,.28))' }} />
        <div style={{ position: 'absolute', left: -50, top: -16, width: 90, height: 34, background: P.tape, transform: 'rotate(-14deg)' }} />
        <div style={{ position: 'absolute', right: -50, top: -16, width: 90, height: 34, background: P.tape, transform: 'rotate(11deg)' }} />
        <div style={{ position: 'relative', padding: '18px 40px', fontFamily: F.serif, fontWeight: 700, fontSize: 50, letterSpacing: '.06em', color: P.ink, whiteSpace: 'pre' }}>
          {parts.map((p, i) => <span key={i} style={{ color: p.h === 1 ? '#c4532f' : p.h === 2 ? P.navy : undefined, textDecoration: p.h === 1 ? 'underline wavy rgba(196,83,47,.5)' : undefined, textUnderlineOffset: 10 }}>{p.s}</span>)}
        </div>
      </div>
    </div>
  );
};

/** 片名：每个字一张不同颜色的方纸片，按拍一张张"啪"地落下，各自歪一点 */
export const PaperTitle: React.FC<{ t: number; text: string; sub?: string; cols?: string[]; y?: number; out?: number }> = ({ t, text, sub, cols = [P.terra, P.mustard, P.sage, P.blue, P.rose], y = 330, out = 99 }) => {
  if (t < 0) return null;
  const chars = [...text], o = 1 - clamp((stepT(t) - out) / .5);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <div style={{ position: 'absolute', top: y, left: 0, width: W, display: 'flex', justifyContent: 'center', gap: 28 }}>
        {chars.map((c, i) => {
          const a = stepT(t - i * .17); if (a < 0) return <div key={i} style={{ width: 190 }} />;
          const s = a < .09 ? 1.5 : a < .17 ? .9 : 1, rot = (rnd(i, 7) - .5) * 14;
          return <div key={i} style={{ width: 190, height: 190, background: cols[i % cols.length], transform: `rotate(${rot}deg) scale(${s})`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: F.serif, fontWeight: 900, fontSize: 124, color: P.paper, clipPath: 'polygon(2% 3%, 98% 0, 100% 97%, 1% 100%)', filter: 'drop-shadow(5px 9px 7px rgba(60,40,20,.3))' }}>{c}</div>;
        })}
      </div>
      {sub && <div style={{ position: 'absolute', top: y + 250, width: W, textAlign: 'center', fontFamily: F.gara, fontSize: 34, letterSpacing: '.5em', color: P.ink, opacity: k(t, chars.length * .17 + .3, chars.length * .17 + .9, E.out) }}>{sub}</div>}
    </AbsoluteFill>
  );
};
