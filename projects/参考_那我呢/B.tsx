// 镜头二：下沉的话。伤人的话像石头一样砸进水里往下沉；光鱼绕它游一圈，红光变冷，替它挂上一个理由。
// "我也不容易"沉下来时，它直接游过去托住 → 镜头沉到海底：一地被理解了的"你的难处"；它掉下一颗玫瑰色的泪，找不到地方落。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Shader, Canvas2D, useT, useScene, k, E, lerp, rnd, seg, clamp, F } from '@kit';
import { T, G, drawFish, heading, kpath, glow, mixc, PEARL, PEARL_HOT, RED, AMBER, AMBER_HOT, ROSE, ROSE_HOT, V2 } from './common';
import DEEP from './shaders/deep.frag';

const SURF = 64, FLOOR = 1940;
type Ctx = CanvasRenderingContext2D;

export const camB = (t: number) => {
  const a = 300 * E.inOut(seg(t, T('b1') + 1, T('b6') + 1.5));
  return a + (1520 - 300) * E.film(seg(t, T('b7') - .6, T('b7') + 2.6));
};
// 落到海底时，屏幕上离地平线的距离 → 透视缩放
const floorScale = (wy: number) => clamp((wy - FLOOR) / 330, .2, 1.1);

type Stone = { s: string; why: string; x: number; t0: number; size: number; col: string; land: V2; rot: number };
const stones = (): Stone[] => [
  { s: '你烦不烦', why: '他今天心情不好吧', x: 880, t0: T('b1') + .15, size: 96, col: RED, land: [780, 2110], rot: -.06 },
  { s: '下次吧', why: '最近太忙了吧', x: 1200, t0: T('b3') + .15, size: 96, col: RED, land: [1270, 2080], rot: .05 },
  { s: '我也不容易', why: '他也不容易', x: 830, t0: T('b5@我也不容易') - .2, size: 84, col: AMBER, land: [960, 2265], rot: .02 },
];
// 早就躺在海底的那些（已经被理解过了）
const BED: [string, string, number, number, number][] = [
  ['改天吧', '在加班吧', 330, 2055, -.08], ['你别管', '不想说吧', 1560, 2060, -.04], ['算了', '不是故意的', 150, 2090, .04], ['又怎么了', '压力大吧', 1760, 2085, .07],
  ['你想多了', '是我太敏感', 380, 2200, .05], ['没空', '最近不顺吧', 1630, 2215, -.06],
  ['说了你也不懂', '他有他的难处', 1390, 2345, -.03], ['我又不是故意的', '嗯，他不是', 420, 2370, .03],
];
const sinkY = (st: Stone, t: number) => { const u = t - st.t0; return u < 0 ? -200 + 260 * u : SURF + (st.size < 90 ? 470 : 330) * (1 - Math.exp(-u * 2.4)) + 48 * u; };

let _fp: ((t: number) => V2) | null = null;
export const fishB = (t: number): V2 => {
  if (!_fp) {
    const [s1, s2, s3] = stones();
    const at = (st: Stone, tt: number, dx: number, dy: number): [number, number, number] => [tt, st.x + dx, sinkY(st, tt) + dy];
    const b2 = T('b2'), b4 = T('b4'), c = T('b6') + .2;
    const cy = sinkY(s3, c);
    _fp = kpath([
      [T('b1') - 1, -260, 640], [T('b1') + 1.2, 260, 600], [b2 - .4, 640, 660],
      at(s1, b2 + .3, -40, 150), at(s1, b2 + .95, 190, 20), at(s1, b2 + 1.6, 30, -120), at(s1, b2 + 2.25, -190, -10), at(s1, b2 + 2.9, -20, 150),
      [T('b3') + 1.3, 1000, 820], at(s2, b4 + .1, -80, 160), at(s2, b4 + .75, 170, 30), at(s2, b4 + 1.4, 20, -115), at(s2, b4 + 2.05, -175, 0), at(s2, b4 + 2.7, 0, 150),
      [T('b5') + 1.2, 1150, 860], [T('b5@我也不容易'), 1000, 800], [c - .5, s3.x + 160, cy + 160], [c, s3.x + 30, cy + 85], [c + 1.4, s3.x + 10, cy + 70],
      [T('b7') - .4, 900, cy + 120], [T('b7') + 1.2, 930, 1820], [T('b7') + 2.4, s3.land[0] - 30, s3.land[1] - 150],
      [T('b8') - .2, 1040, 1830], [T('b8') + 1.0, 1080, 1815], [T('b8') + 5, 1560, 1740],
    ]);
  }
  return _fp(t);
};
// 被托住之后，"我也不容易"跟着鱼走，再被轻轻放到海底
const s3Pos = (st: Stone, t: number): V2 => {
  const c = T('b6') + .2, drop = T('b7') + 2.4;
  if (t < c) return [st.x, sinkY(st, t)];
  const f = fishB(t), ride: V2 = [f[0] - 10, f[1] - 78];
  const u0 = k(t, c, c + .5, E.inOut), cy = sinkY(st, c);
  let p: V2 = [lerp(st.x, ride[0], u0), lerp(cy + 48 * (t - c) * (1 - u0), ride[1], u0)];
  const ul = k(t, drop - .4, drop + .9, E.inOut);
  return [lerp(p[0], st.land[0], ul), lerp(p[1], st.land[1], ul)];
};
const stonePos = (st: Stone, i: number, t: number): { x: number; y: number; land: number } => {
  if (i === 2) { const p = s3Pos(st, t); return { x: p[0], y: p[1], land: k(t, T('b7') + 2.2, T('b7') + 3.3) }; }
  const ul = k(t, T('b7') - .4 + i * .5, T('b7') + 1.8 + i * .5, E.inOut);
  const y0 = sinkY(st, t);
  return { x: lerp(st.x, st.land[0], ul), y: lerp(y0, st.land[1], ul), land: ul };
};

/** 一块"石头"：沉重的黑字 + 一圈发光的边；lie = 躺平程度（0 竖着沉，1 平躺在海底） */
const drawStone = (g: Ctx, s: string, x: number, y: number, size: number, rot: number, col: string, a: number, lie: number, sc: number) => {
  if (a <= .003) return;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(sc, sc * lerp(1, .64, lie));
  g.font = `900 ${size}px ${F.serif}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  (g as any).letterSpacing = `${size * .04}px`;
  g.shadowColor = `rgba(${col},${.75 * a})`; g.shadowBlur = size * .45;
  g.fillStyle = `rgba(14,6,8,${.96 * a})`; g.fillText(s, 0, 0);
  g.shadowBlur = 0;
  const gr = g.createLinearGradient(0, -size * .5, 0, size * .5);
  gr.addColorStop(0, `rgba(${col},${.32 * a})`); gr.addColorStop(.5, `rgba(${col},${.05 * a})`); gr.addColorStop(1, `rgba(0,0,0,0)`);
  g.fillStyle = gr; g.globalCompositeOperation = 'lighter'; g.fillText(s, 0, 0);
  g.strokeStyle = `rgba(${col},${.5 * a})`; g.lineWidth = 1.2; g.strokeText(s, 0, 0);
  g.restore();
};
const shadow = (g: Ctx, x: number, y: number, w: number, a: number) => {
  if (a <= .003) return;
  g.save(); g.globalCompositeOperation = 'source-over'; g.translate(x, y); g.scale(1, .16);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, w * .62);
  gr.addColorStop(0, `rgba(0,6,8,${.55 * a})`); gr.addColorStop(1, 'rgba(0,6,8,0)');
  g.fillStyle = gr; g.fillRect(-w, -w, w * 2, w * 2); g.restore();
};
/** 理由：一根细线吊着的小字 */
const drawWhy = (g: Ctx, s: string, x: number, y: number, size: number, a: number, sc: number) => {
  if (a <= .003) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  g.font = `400 ${size * sc}px ${F.serif}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  (g as any).letterSpacing = `${size * sc * .18}px`;
  g.shadowColor = `rgba(${PEARL},${.8 * a})`; g.shadowBlur = 12 * sc;
  g.fillStyle = `rgba(${PEARL_HOT},${.82 * a})`; g.fillText(s, x, y);
  g.restore();
};

export const Deep: React.FC = () => {
  const a0 = useScene().a, t = useT() + a0;
  const cam = camB(t);
  const dim = k(t, T('c1') - 2.2, T('c1') - .4, E.inOut);
  return <AbsoluteFill>
    <Shader frag={G(DEEP)} scale={.6} u={{ uCam: cam, uExpo: 1.15 * k(t, T('bIn'), T('bIn') + 1.2), uFloor: FLOOR, uSurf: SURF, uDim: dim }} />
    <Canvas2D draw={(g, tl) => {
      const tt = tl + a0, cy = camB(tt), fade = 1 - dim;
      const ST = stones();
      g.save(); g.globalAlpha = fade;
      // 悬浮微粒（视差）
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 190; i++) {
        const z = .35 + rnd(i, 1) * .9, H = 2600;
        const x = ((rnd(i, 2) * 2200 + tt * 5 * z + Math.sin(tt * .3 + i) * 8) % 2200) - 140;
        const y = (((rnd(i, 3) * H - tt * 8 * z - cy * z) % H) + H) % H - 200;
        if (y < -20 || y > 1100) continue;
        if (z > 1.12) glow(g, x, y, 16 * z, '150,200,210', .05);
        else { g.fillStyle = `rgba(170,210,215,${.1 + .28 * rnd(i, 4) * z})`; g.fillRect(x, y, 1.5 * z, 1.5 * z); }
      }
      g.translate(0, -cy);
      // 海底早就躺着的那些
      const bedA = k(tt, T('b7') - .2, T('b7') + 1.8);
      if (cy > 500) {
        g.globalCompositeOperation = 'source-over';
        BED.forEach(([s, why, x, y, r], i) => {
          const sc = floorScale(y), a = bedA * clamp(.55 + .5 * sc);
          shadow(g, x, y + 10 * sc, s.length * 80 * sc, a);
          drawStone(g, s, x, y, 78, r, mixc(PEARL, '120,180,190', .4), a * .9, 1, sc);
          drawWhy(g, why, x, y + 56 * sc, 24, a * (.6 + .4 * Math.sin(tt * 1.3 + i * 1.7) ** 2) * k(tt, T('b7') + .3 + i * .12, T('b7') + 1.3 + i * .12), sc);
        });
      }
      // 沉下来的三块
      ST.forEach((st, i) => {
        const u = tt - st.t0; if (u < -.5) return;
        const p = stonePos(st, i, tt);
        // 入水：水花 + 气泡
        g.globalCompositeOperation = 'lighter';
        if (u > 0 && u < .7) glow(g, st.x, SURF + 8, 160 * (1 - u), '255,235,235', .45 * (1 - u / .7));
        for (let b = 0; b < 22; b++) {
          const bt = st.t0 + rnd(b, i * 7 + 1) * 3.2, age = tt - bt; if (age < 0 || age > 4) continue;
          const sy = sinkY(st, bt) + (rnd(b, i * 7 + 2) - .5) * 40, y = sy - age * (60 + 50 * rnd(b, i * 7 + 3));
          if (y < SURF + 6) continue;
          const x = st.x + (rnd(b, i * 7 + 4) - .5) * st.size * 2.6 + Math.sin(age * 6 + b) * 4, r = 1.5 + 4 * rnd(b, i * 7 + 5);
          const al = .45 * (1 - age / 4);
          g.strokeStyle = `rgba(210,240,245,${al})`; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
        }
        // 冷却：鱼绕一圈之后，红光变成珍珠色
        const coolT = i === 0 ? T('b2') + 2.6 : i === 1 ? T('b4') + 2.4 : T('b6') + .6;
        const cool = k(tt, coolT - 1.2, coolT + .6, E.inOut);
        const col = i === 2 ? mixc(AMBER, AMBER_HOT, .2 * cool) : mixc(st.col, PEARL, cool);
        const sc = lerp(1, floorScale(p.y), p.land);
        const rot = lerp(st.rot + .08 * Math.sin(tt * .9 + i * 2), st.rot * .5, p.land);
        g.globalCompositeOperation = 'source-over';
        if (p.land > 0) shadow(g, p.x, p.y + 10 * sc, st.s.length * st.size * .85 * sc, p.land * clamp(u * 6));
        const deepFade = i === 2 ? 1 : Math.max(p.land, 1 - k(p.y - cy, 640, 860));
        drawStone(g, st.s, p.x, p.y, st.size, rot, col, clamp(u * 6) * deepFade, p.land, sc);
        // 被托住时的暖光
        if (i === 2) { g.globalCompositeOperation = 'lighter'; glow(g, p.x, p.y + 20, 260, AMBER, .16 * k(tt, T('b6'), T('b6') + 1) * (1 - p.land * .6)); }
        const whyA = i === 2 ? k(tt, T('b7') + 3, T('b7') + 4) : cool;
        drawWhy(g, st.why, p.x, p.y + lerp(st.size * .82, 56 * sc, p.land), lerp(28, 24, p.land), whyA * (i === 2 ? 1 : Math.max(p.land, 1 - k(p.y - cy, 640, 860))), lerp(1, sc, p.land));
      });
      // 光鱼
      const f = fishB(tt);
      drawFish(g, tt, f, dt => heading(fishB, tt - dt, 0), {
        s: .82, amp: .34, freq: .85, path: fishB, sparks: .45, a: k(tt, T('b1') - .5, T('b1') + .6) * fade,
        cord: { to: [-260, cy + 1250], a: .85 * fade, c1: 220 },
      });
      // 它掉下的一颗泪：玫瑰色，找不到地方落
      const tr = T('b8') + .5, u = tt - tr;
      if (u > -.6) {
        const f0 = fishB(tr);
        const born = k(tt, tr - .6, tr + .2);
        const x = f0[0] + 40 * Math.sin(u * .9) + 120 * k(u, 1.5, 5.5, E.inOut) + 18 * Math.sin(u * 2.3);
        const y = f0[1] + 10 + 200 * (1 - Math.exp(-Math.max(0, u) * .45)) - 14 * Math.sin(u * 1.4);
        const a = born * (1 - .45 * k(u, 2.5, 5));
        g.globalCompositeOperation = 'lighter';
        glow(g, x, y, 220, ROSE, .14 * a); glow(g, x, y, 70, ROSE, .4 * a); glow(g, x, y, 22, ROSE_HOT, 1 * a);
        g.fillStyle = `rgba(255,255,255,${.95 * a})`; g.beginPath(); g.ellipse(x, y, 3.4, 4.4, 0, 0, Math.PI * 2); g.fill();
        // 下方几块石头被它照到一点点（它在找地方）
        for (let q = 0; q < 6; q++) { const age = (u - q * .5); if (age < 0 || age > 3) continue; glow(g, x - 30 * Math.sin(q), y + 6 + q * 6, 5, ROSE, .25 * (1 - age / 3) * a); }
      }
      g.restore();
    }} />
  </AbsoluteFill>;
};
