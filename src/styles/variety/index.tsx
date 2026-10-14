// 综艺花字（Variety Captions）—— 说明见 references/风格_19_综艺花字.md
// 多层描边（外白 → 内深 → 渐变填色 → 高光）+ 弹簧弹跳 + 表情贴纸，专门把情绪放大。全部 DOM / SVG。
//   Huazi       一条花字：layers 决定描边层，anim = pop / wave / shake / stamp
//   Sticker     表情贴纸：sweat 汗滴、anger 怒、spark 闪光、heart 心、q 问号 —— SVG 画的，不依赖 emoji 字体
//   PRESETS     三套现成的花字（震惊 / 委屈撒娇 / 开心）
import React from 'react';
import { F, spring, rnd } from '@kit';

export type HuaziStyle = { fill: string; inner: string; outer: string; innerW: number; outerW: number; font: string; size: number; shadow?: string; skew?: number };
export const PRESETS: Record<'shock' | 'pout' | 'yay', HuaziStyle> = {
  shock: { fill: 'linear-gradient(180deg,#fff36b 0%,#ffd000 55%,#ff9a00 100%)', inner: '#1a1a1a', outer: '#ffffff', innerW: 16, outerW: 34, font: F.cn, size: 210, shadow: '0 12px 0 rgba(0,0,0,.25)', skew: -8 },
  pout: { fill: 'linear-gradient(180deg,#ffd6ec 0%,#ff7eb8 100%)', inner: '#8a0f45', outer: '#ffffff', innerW: 12, outerW: 28, font: F.fun, size: 140 },
  yay: { fill: 'linear-gradient(90deg,#ff5f6d,#ffc371,#47e891,#3ec6ff,#a66bff)', inner: '#2b1a5a', outer: '#ffffff', innerW: 14, outerW: 32, font: F.fun, size: 220, shadow: '0 14px 0 rgba(43,26,90,.3)' },
};
/** anim：pop 整体弹出 / wave 逐字波浪弹跳 / shake 抖 / stamp 从大砸下来 */
export const Huazi: React.FC<{ text: string; t: number; st: HuaziStyle; anim?: 'pop' | 'wave' | 'shake' | 'stamp'; x: number; y: number; rot?: number; out?: number }> = ({ text, t, st, anim = 'pop', x, y, rot = 0, out = 99 }) => {
  if (t < 0 || t > out + .25) return null;
  const s0 = anim === 'stamp' ? 2.2 - 1.2 * spring(t, 3, .5) : spring(t, 2.4, .42), o = t > out ? Math.max(0, 1 - (t - out) / .25) : 1;
  const chars = [...text];
  const layer = (kind: 'outer' | 'inner' | 'fill') => (
    <div style={{ position: kind === 'fill' ? 'relative' : 'absolute', left: 0, top: 0, whiteSpace: 'pre', fontFamily: st.font, fontWeight: 900, fontSize: st.size, lineHeight: 1.1,
      ...(kind === 'outer' ? { WebkitTextStroke: `${st.outerW}px ${st.outer}`, color: st.outer, textShadow: st.shadow } : kind === 'inner' ? { WebkitTextStroke: `${st.innerW}px ${st.inner}`, color: st.inner } : {}) }}>
      {chars.map((c, i) => {
        const w = anim === 'wave' ? Math.sin(t * 9 - i * .8) * 14 * Math.min(1, t * 2) : 0;
        const sh = anim === 'shake' ? (rnd(i + Math.floor(t * 30), 3) - .5) * 10 * Math.exp(-t * 1.5) : 0;
        const ci = anim === 'wave' ? spring(t - i * .06, 2.6, .4) : 1;
        return <span key={i} style={{ display: 'inline-block', transform: `translate(${sh}px, ${w + sh}px) scale(${ci})`,
          ...(kind === 'fill' ? { background: st.fill, WebkitBackgroundClip: 'text', color: 'transparent' } : {}) }}>{c}</span>;
      })}
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) skewX(${st.skew ?? 0}deg) scale(${s0})`, opacity: o }}>
      <div style={{ position: 'relative' }}>{layer('outer')}{layer('inner')}{layer('fill')}</div>
    </div>
  );
};

export const Sticker: React.FC<{ kind: 'sweat' | 'anger' | 'spark' | 'heart' | 'q'; t: number; x: number; y: number; s?: number; out?: number }> = ({ kind, t, x, y, s = 1, out = 99 }) => {
  if (t < 0 || t > out) return null;
  const k = spring(t, 2.6, .4) * s, bob = Math.sin(t * 6) * 6;
  const ink = '#2a1a3a';
  const shape = kind === 'sweat' ? <path d="M60 10 C 90 60, 100 80, 60 110 C 20 80, 30 60, 60 10 Z" fill="#7fd3ff" stroke={ink} strokeWidth={8} strokeLinejoin="round" />
    : kind === 'anger' ? <g stroke="#ff3b4e" strokeWidth={16} strokeLinecap="round" fill="none"><path d="M30 45 Q 45 45 45 30" /><path d="M75 30 Q 75 45 90 45" /><path d="M90 75 Q 75 75 75 90" /><path d="M45 90 Q 45 75 30 75" /></g>
    : kind === 'spark' ? <path d="M60 5 L72 48 L115 60 L72 72 L60 115 L48 72 L5 60 L48 48 Z" fill="#ffe14d" stroke={ink} strokeWidth={7} strokeLinejoin="round" />
    : kind === 'heart' ? <path d="M60 105 C 10 70, 5 35, 32 22 C 48 15, 58 26, 60 34 C 62 26, 72 15, 88 22 C 115 35, 110 70, 60 105 Z" fill="#ff5c8a" stroke={ink} strokeWidth={8} strokeLinejoin="round" />
    : <text x={60} y={95} textAnchor="middle" fontFamily={F.fun} fontSize={100} fill="#a66bff" stroke={ink} strokeWidth={6} paintOrder="stroke">?</text>;
  return <svg width={120} height={120} viewBox="0 0 120 120" style={{ position: 'absolute', left: x - 60, top: y - 60 + bob, transform: `scale(${k}) rotate(${Math.sin(t * 4) * 8}deg)`, overflow: 'visible', filter: 'drop-shadow(0 6px 0 rgba(0,0,0,.18))' }}>{shape}</svg>;
};
