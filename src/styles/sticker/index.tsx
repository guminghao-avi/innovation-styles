// 贴纸风科普（Sticker Explainer）—— 说明见 references/风格_11_贴纸风科普.md
// 一张"超大画布"（比屏幕大几倍）上铺满贴纸：每个图形都有粗白描边 + 一点投影，像贴在点阵纸上；
// 镜头（整张画布的 translate + scale）在画布上推、拉、平移，一站一站讲下去。硬核知识拆成：图 + 中英双语标签 + 引线 + 元素小方块。
//   StickerDefs     放一次：SVG 滤镜 #stk（膨胀出白边 + 投影），任何 <g filter="url(#stk)"> 都变贴纸
//   DotGrid         点阵纸背景（跟着画布走）
//   Chip            元素小方块（序号 + 符号 + 中文名），按出场弹入
//   Label           中英双语标签 + 引线 + 端点圆点
//   camAt(t, keys)  镜头关键帧 → CSS transform（看哪一块、放多大）
import React from 'react';
import { F, keys, E, spring } from '@kit';

export const STK = { paper: '#f2f1ee', dot: '#cfcdc6', ink: '#1d1d22', sub: '#8a8780', red: '#e5483b', blue: '#3c6fd8', yellow: '#f4b93a', green: '#3caa6e', chip: '#26262c' };

export const StickerDefs: React.FC<{ w?: number }> = ({ w = 7 }) => (
  <svg width={0} height={0} style={{ position: 'absolute' }}>
    <filter id="stk" x="-20%" y="-20%" width="140%" height="140%">
      <feMorphology in="SourceAlpha" operator="dilate" radius={w} result="d" />
      <feFlood floodColor="#ffffff" /><feComposite in2="d" operator="in" result="white" />
      <feGaussianBlur in="d" stdDeviation="6" result="b" /><feOffset in="b" dx="3" dy="7" result="o" />
      <feFlood floodColor="rgba(40,30,20,.28)" /><feComposite in2="o" operator="in" result="shadow" />
      <feMerge><feMergeNode in="shadow" /><feMergeNode in="white" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  </svg>
);
export const DotGrid: React.FC<{ w: number; h: number; gap?: number }> = ({ w, h, gap = 36 }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, background: STK.paper, backgroundImage: `radial-gradient(${STK.dot} 2.2px, transparent 2.6px)`, backgroundSize: `${gap}px ${gap}px` }} />
);
export const Chip: React.FC<{ x: number; y: number; n: number; sym: string; name: string; t: number; col?: string; size?: number }> = ({ x, y, n, sym, name, t, col = STK.chip, size = 120 }) => {
  const s = t <= 0 ? 0 : spring(t, 2.6, .45);
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: size, height: size, transform: `scale(${s}) rotate(${(n % 5 - 2) * 1.5}deg)`, borderRadius: 16, background: col, boxShadow: `0 0 0 8px #fff, 3px 9px 14px 8px rgba(40,30,20,.22)`, color: '#fff', fontFamily: F.en }}>
      <div style={{ position: 'absolute', left: 12, top: 8, fontSize: size * .16, opacity: .7 }}>{n}</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: size * .2, textAlign: 'center', fontSize: size * .42, fontWeight: 700 }}>{sym}</div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: size * .08, textAlign: 'center', fontSize: size * .15, fontFamily: F.cn }}>{name}</div>
    </div>
  );
};
/** 标签：(x, y) 是被指的点，(lx, ly) 是文字的位置；t = 出场后秒数 */
export const Label: React.FC<{ x: number; y: number; lx: number; ly: number; cn: string; en: string; t: number; size?: number }> = ({ x, y, lx, ly, cn, en, t, size = 64 }) => {
  if (t <= 0) return null;
  const p = E.out(Math.min(1, t / .35)), a = Math.min(1, Math.max(0, (t - .25) / .3));
  return (
    <>
      <svg style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} width={1} height={1}>
        <line x1={x} y1={y} x2={x + (lx - x) * p} y2={y + (ly - y) * p} stroke={STK.ink} strokeWidth={4} />
        <circle cx={x} cy={y} r={11} fill={STK.ink} stroke="#fff" strokeWidth={5} />
      </svg>
      <div style={{ position: 'absolute', left: lx + (lx > x ? 18 : -18), top: ly - size * .62, transform: lx > x ? undefined : 'translateX(-100%)', opacity: a, textAlign: lx > x ? 'left' : 'right' }}>
        <div style={{ fontFamily: F.cn, fontWeight: 900, fontSize: size, color: STK.ink, lineHeight: 1 }}>{cn}</div>
        <div style={{ fontFamily: F.en, fontSize: size * .3, letterSpacing: '.25em', color: STK.sub, marginTop: 8 }}>{en}</div>
      </div>
    </>
  );
};
export type CamKey = { x: number; y: number; s: number };
/** 镜头：keys = [[秒, {x, y, s}]]，(x, y) = 画布上要放到屏幕中心的点；返回整张画布的 CSS transform */
export const camAt = (t: number, ks: [number, Partial<CamKey>][]) => {
  const c = keys<CamKey>(t, ks, E.film, ['s']);
  return `translate(960px, 540px) scale(${c.s}) translate(${-c.x}px, ${-c.y}px)`;
};
