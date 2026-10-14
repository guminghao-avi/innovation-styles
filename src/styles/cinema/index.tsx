// 写实电影感（着色器做光 · 一个发光母题 · 宋体字幕 + Garamond 读数）—— 说明见 references/风格_写实电影感.md
//   glow / glowLine   lighter 模式下的光晕、发光线（四层描边：宽淡 → 细亮 → 白热芯）
//   CineSub           字幕：思源宋体 50px，逐字虚焦对焦，**词** 琥珀、“引号”冷白
//   Readout           读数：宋体小标签 + Garamond 数字（纪录片式）
//   CineTitle         片名：宋体大字宽字距逐字对焦 + 一条细光线 + 英文小字
//   Dust              漂浮微尘（景深视差）
//   LAKE              夜湖 / 黎明着色器（uDawn 0→1），见 lake.frag
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Canvas2D, Reveal, F, W, k, E, rnd } from '@kit';
import LAKE from './lake.frag';
export { LAKE };
type Ctx = CanvasRenderingContext2D;

export const AMBER = '255,170,80', AMBER_HOT = '255,226,170', RED = '255,70,50', COLD = '150,180,230';

export const glow = (g: Ctx, x: number, y: number, r: number, col: string, a: number) => {
  if (a <= .002 || r <= .5) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(.22, `rgba(${col},${a * .32})`); gr.addColorStop(.55, `rgba(${col},${a * .07})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
};
export const glowLine = (g: Ctx, pts: number[], col: string, hot: string, a: number, w = 1) => {
  if (a <= .003 || pts.length < 4) return;
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.strokeStyle = `rgba(${col},${.05 * a})`; g.lineWidth = 14 * w; g.stroke();
  g.strokeStyle = `rgba(${col},${.16 * a})`; g.lineWidth = 5 * w; g.stroke();
  g.strokeStyle = `rgba(${col},${.7 * a})`; g.lineWidth = 2 * w; g.stroke();
  g.strokeStyle = `rgba(${hot},${.85 * a})`; g.lineWidth = .9 * w; g.stroke();
};

type Line = { id: string; text: string; t0: number; t1: number };
export const CineSub: React.FC<{ t: number; lines: Line[]; hide?: string[]; hi?: string }> = ({ t, lines, hide = [], hi = '#F2B878' }) => {
  const cur = lines.find(l => t >= l.t0 - .1 && t < l.t1 + .5 && !hide.includes(l.id));
  if (!cur) return null;
  const chars: { c: string; h: number }[] = []; let h = 0;
  for (const c of [...cur.text.replace(/\*\*/g, '\u0001')]) {
    if (c === '\u0001') { h = h === 1 ? 0 : 1; continue; }
    chars.push({ c, h: c === '“' ? (h = 2, 2) : c === '”' ? (h = 0, 2) : h });
  }
  const out = 1 - k(t, cur.t1 + .05, cur.t1 + .5, E.in);
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 92, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: W / 2 - 800, width: 1600, bottom: 16, height: 220, opacity: .5 * out, background: 'radial-gradient(closest-side, rgba(0,0,0,.8), rgba(0,0,0,0))' }} />
      <div style={{ position: 'relative', fontFamily: F.serif, fontWeight: 500, fontSize: 50, letterSpacing: '.09em', color: '#ECE6DC', whiteSpace: 'pre', textShadow: '0 2px 6px rgba(0,0,0,.85)' }}>
        {chars.map(({ c, h: hh }, i) => {
          const a = cur.t0 + i * .035, p = k(t, a, a + .6, E.out);
          return <span key={i} style={{ display: 'inline-block', opacity: p * out, filter: p < .97 ? `blur(${((1 - p) * 9).toFixed(1)}px)` : undefined,
            color: hh === 1 ? hi : hh === 2 ? '#DCE6F2' : undefined, textShadow: hh === 1 ? '0 0 18px rgba(255,150,70,.45), 0 2px 6px rgba(0,0,0,.85)' : undefined }}>{c === ' ' ? ' ' : c}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Readout: React.FC<{ x: number; y: number; label: string; value: string; a: number; color?: string; size?: number; right?: boolean }> =
  ({ x, y, label, value, a, color = '#F2B878', size = 64, right }) => a <= .003 ? null : (
  <div style={{ position: 'absolute', left: right ? undefined : x, right: right ? W - x : undefined, top: y, opacity: a, textAlign: right ? 'right' : 'left' }}>
    <div style={{ fontFamily: F.serif, fontSize: 22, letterSpacing: '.32em', color: 'rgba(236,230,220,.62)', marginBottom: 6 }}>{label}</div>
    <div style={{ fontFamily: F.gara, fontSize: size, lineHeight: 1, color, textShadow: '0 0 24px rgba(255,150,70,.25)' }}>{value}</div>
  </div>
);

/** t = 片名局部秒；dur 后淡出；bright = 亮背景上用深色描影 */
export const CineTitle: React.FC<{ t: number; text: string; en: string; dur?: number; bright?: boolean; y?: number }> = ({ t, text, en, dur = 6.2, bright, y = 0 }) => {
  const out = 1 - k(t, dur, dur + 1.2, E.inOut), line = k(t, 1.4, 3.2, E.film);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: out, transform: `translateY(${y}px)` }}>
      <div style={{ fontFamily: F.serif, fontWeight: 600, fontSize: 104, color: '#F1E9DE', letterSpacing: '.5em', marginLeft: '.5em', textShadow: '0 0 30px rgba(255,160,80,.25)' }}>
        <Reveal text={text} t={t} t0={.3} stagger={.3} dur={1.6} mode="blur" />
      </div>
      <div style={{ width: 460 * line, height: 1, background: 'linear-gradient(90deg, rgba(255,250,240,0), rgba(255,250,240,.85), rgba(255,250,240,0))', margin: '44px 0 32px', boxShadow: bright ? '0 0 10px rgba(120,60,30,.25)' : undefined }} />
      <div style={{ fontFamily: F.gara, fontSize: 26, letterSpacing: '.7em', marginLeft: '.7em', color: 'rgba(255,250,244,.85)', textShadow: bright ? '0 0 14px rgba(90,45,25,.45)' : undefined, opacity: k(t, 2.2, 3.4) }}>{en}</div>
    </AbsoluteFill>
  );
};

export const Dust: React.FC<{ a?: number; col?: string }> = ({ a = 1, col = '255,226,180' }) => (
  <Canvas2D scale={.5} draw={(g, t) => {
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 70; i++) {
      const d = .3 + rnd(i, 1) * .7;
      const x = ((rnd(i, 2) * 2300 + t * (8 + 20 * (1 - d)) * (rnd(i, 3) > .5 ? 1 : -1)) % 2300 + 2300) % 2300 - 190;
      const y = ((rnd(i, 4) * 1300 - t * (4 + 10 * (1 - d))) % 1300 + 1300) % 1300 - 110;
      const tw = .55 + .45 * Math.sin(t * (.6 + rnd(i, 5)) + i);
      glow(g, x, y, d < .45 ? 14 + 20 * (1 - d) : 2.5 + 2 * rnd(i, 6), col, (d < .45 ? .05 : .22) * tw * a);
    }
  }} />
);
