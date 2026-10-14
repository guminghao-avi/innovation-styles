// 扁平矢量（Flat Vector）—— 说明见 references/风格_07_扁平矢量.md
// 纯色几何、零阴影、零渐变；一切情绪靠"回弹和节奏"：落地压扁、起跳拉长、过冲回弹、错峰出场。SVG（DOM）画，矢量永远锐利。
//   bounceY(t, ...)   真物理的弹跳（每次落地按恢复系数 e 衰减），返回高度和是否刚落地
//   squash(v, hit)    根据速度拉长 / 落地压扁（保持面积）
//   overshoot(t)      0 → 1.15 → 1 的弹性出场（back easing）
//   stagger(i, t0)    第 i 个元素的出场时刻（节奏）
import { spring, clamp } from '@kit';

export const FLAT = { blue: '#2b3bdb', blueD: '#1f2aa8', coral: '#ff5a4e', cream: '#f6efe3', yellow: '#ffc93c', ink: '#141a3c', mint: '#3fd0a6', white: '#ffffff' };

/** 弹跳：从高度 h0 落下，g 重力（px/s²），e 恢复系数。返回 { y: 离地高度, v: 速度（向下为正）, hit: 距离最近一次落地的秒数 } */
export const bounceY = (t: number, h0: number, g = 5200, e = .55) => {
  if (t < 0) return { y: h0, v: 0, hit: 99 };
  let tf = Math.sqrt(2 * h0 / g);                   // 第一次落地
  if (t < tf) return { y: h0 - .5 * g * t * t, v: g * t, hit: 99 };
  let t0 = tf, v = g * tf * e;
  for (let i = 0; i < 12; i++) {
    const dur = 2 * v / g;
    if (t < t0 + dur) { const u = t - t0; return { y: v * u - .5 * g * u * u, v: -(v - g * u), hit: u }; }
    t0 += dur; v *= e; if (v < 30) break;
  }
  return { y: 0, v: 0, hit: t - t0 };
};
/** 速度拉长 + 落地压扁（面积守恒）：返回 [sx, sy] */
export const squash = (v: number, hit: number) => {
  const st = clamp(Math.abs(v) / 4000, 0, .35);
  const sq = hit < .12 ? Math.sin(hit / .12 * Math.PI) * .32 : 0;
  const sy = (1 + st) * (1 - sq), sx = 1 / sy;
  return [sx, sy];
};
export const overshoot = (t: number) => (t <= 0 ? 0 : spring(t, 2.4, .5));
export const stagger = (i: number, t0: number, step = .07) => t0 + i * step;
