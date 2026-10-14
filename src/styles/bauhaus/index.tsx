// 几何构成 · 包豪斯（Geometric · Bauhaus）—— 说明见 references/风格_15_几何构成包豪斯.md
// 圆、方、三角 + 红黄蓝黑 + 米白纸；严格的 120px 网格、严格的节拍（120 BPM = 每拍 0.5 秒），一拍落一个元素，"砰"地停住。
//   BH                 颜色
//   beat(i, t0, bpm)   第 i 拍的时刻
//   hit(t, at, d)      这一拍的进度：快进慢停（E.snap），d 秒内落定 —— 不回弹（包豪斯是"严格"，不是"可爱"）
//   Grid               画在纸上的淡网格 + 裁切线 / 角标（海报感）
import React from 'react';
import { E, clamp } from '@kit';
export const BH = { paper: '#f1e9da', red: '#d8322a', yellow: '#f2b51d', blue: '#1f4fa3', black: '#151515', grid: 'rgba(21,21,21,.08)' };
export const U = 120;
export const beat = (i: number, t0 = 0, bpm = 120) => t0 + i * 60 / bpm;
export const hit = (t: number, at: number, d = .28) => E.snap(clamp((t - at) / d));
export const Grid: React.FC<{ x: number; y: number; w: number; h: number; a?: number }> = ({ x, y, w, h, a = 1 }) => (
  <g opacity={a}>
    {Array.from({ length: Math.floor(w / U) + 1 }, (_, i) => <line key={'v' + i} x1={x + i * U} y1={y} x2={x + i * U} y2={y + h} stroke={BH.grid} strokeWidth={2} />)}
    {Array.from({ length: Math.floor(h / U) + 1 }, (_, i) => <line key={'h' + i} x1={x} y1={y + i * U} x2={x + w} y2={y + i * U} stroke={BH.grid} strokeWidth={2} />)}
    {[[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([cx, cy], i) => <g key={i} stroke={BH.black} strokeWidth={2}><line x1={cx - 18} y1={cy} x2={cx + 18} y2={cy} /><line x1={cx} y1={cy - 18} x2={cx} y2={cy + 18} /></g>)}
  </g>
);
