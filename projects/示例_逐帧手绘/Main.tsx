// 示例 · 逐帧手绘：一根火柴在火柴盒上划亮 → 火苗跳下来、长出小手、扭起舞 → "手作"手写片名
// 风格说明：references/风格_05_逐帧手绘.md；工具：@styles/hand（笔刷、水彩、boil）+ @styles/paper（纸纹）
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Canvas2D, makeVO, useT, lerp, clamp, rnd, E, F } from '@kit';
import { HAND, onTwos, brush, brushClosed, wash, ellipsePts, teardrop, linePts, HandSub } from '@styles/hand';
import { overlayPaper } from '@styles/paper';
import timing from './vo.timing.json';
import beats from './beats.json';

const { T } = makeVO(timing as any, beats);
export const DURATION = T('title') + 3.2;
const q = (t: number) => Math.floor(t * 12) / 12;          // 运动也一拍二（定格的顿）
const rect = (x: number, y: number, w: number, h: number) => [x, y, x + w * .5, y - 2, x + w, y, x + w + 2, y + h * .5, x + w, y + h, x + w * .5, y + h + 2, x, y + h, x - 2, y + h * .5];

const draw = (g: CanvasRenderingContext2D, t: number) => {
  const b = onTwos(t), tq = q(t);
  g.fillStyle = HAND.paper; g.fillRect(0, 0, 1920, 1080);
  g.save(); g.translate(960, 560); g.scale(1.45, 1.45); g.translate(-960, -700);
  // 火柴盒
  const BX = 760, BY = 640;
  wash(g, rect(BX, BY, 420, 190), b, HAND.red, 1, .85);
  wash(g, rect(BX, BY + 150, 420, 40), b, '#6b3f2a', 2, .8);                 // 擦皮
  brushClosed(g, rect(BX, BY, 420, 190), b, { w: 7, seed: 3 });
  brush(g, linePts(BX + 4, BY + 150, BX + 416, BY + 150, 10), b, { w: 4, seed: 4 });
  g.save(); g.translate(BX + 210, BY + 92); g.rotate((rnd(b, 9) - .5) * .03);
  g.fillStyle = '#fff3dc'; g.font = `64px ${F.fun}`; g.textAlign = 'center'; g.fillText('火柴', 0, 18); g.restore();
  // 火柴：先斜拿着，划过擦皮（快），然后立住
  const s0 = T('strike'), u = clamp((tq - s0) / .35);
  const mx = tq < s0 ? 640 : lerp(700, 1180, E.out(u)), my = tq < s0 ? 760 : BY + 158 - 24 * Math.sin(Math.PI * u);
  const ang = tq < s0 ? -1.05 : lerp(-1.25, -1.45, u);
  const hx = mx + Math.cos(ang) * 230, hy = my + Math.sin(ang) * 230;
  const stick = linePts(mx, my, hx, hy, 8);
  brush(g, stick, b, { w: 22, col: HAND.wood, seed: 11, taper: .05, jit: 1 });
  brush(g, stick, b, { w: 6, seed: 12, taper: .2 });
  wash(g, ellipsePts(hx, hy, 20, 26, 18, ang + Math.PI / 2), b, '#a8241a', 13, .95);
  brushClosed(g, ellipsePts(hx, hy, 20, 26, 18, ang + Math.PI / 2), b, { w: 5, seed: 14 });
  // 火花
  if (tq >= s0 + .15 && tq < s0 + .6) for (let i = 0; i < 9; i++) {
    const a = rnd(i, b) * Math.PI * 2, r0 = 30 + (tq - s0) * 200, r1 = r0 + 26 + rnd(i, 3) * 30;
    brush(g, linePts(hx + Math.cos(a) * r0, hy + Math.sin(a) * r0, hx + Math.cos(a) * r1, hy + Math.sin(a) * r1, 3), b, { w: 6, col: HAND.orange, seed: 20 + i });
  }
  // 火苗：先在火柴头上长大，然后跳下来，落在盒子上跳舞
  const born = clamp((tq - s0 - .3) / .5), jump = clamp((tq - T('jump') - .2) / .55);
  if (born > 0) {
    const land = { x: BX + 230, y: BY - 6 };
    let fx = lerp(hx, land.x, jump), fy = lerp(hy - 6, land.y, jump) - Math.sin(Math.PI * jump) * 200;
    const dance = Math.max(0, tq - T('jump') - .75);
    const sway = Math.sin(dance * 9) * .5 + (rnd(b, 33) - .5) * .25;
    const squash = jump >= 1 && dance < .15 ? .7 : 1 + .08 * Math.sin(dance * 18);
    const r = 34 * born * (jump > 0 ? 1.4 : 1), h = 90 * born * squash * (jump > 0 ? 1.5 : 1);
    if (jump > 0 && jump < 1) fy -= 0;
    const outer = teardrop(fx, fy - r, r, h, sway), inner = teardrop(fx + 2, fy - r * .55, r * .55, h * .55, sway * 1.2);
    wash(g, outer, b, HAND.yellow, 51, .95); wash(g, inner, b, HAND.orange, 52, .9);
    brushClosed(g, outer, b, { w: 6, seed: 53 });
    if (jump >= 1) {
      // 脸 + 小手
      g.fillStyle = HAND.ink; [-12, 12].forEach((dx, i) => { g.beginPath(); g.ellipse(fx + dx + sway * 8, fy - r - 6 + (rnd(b, 60 + i) - .5) * 2, 4.5, 6.5, 0, 0, Math.PI * 2); g.fill(); });
      brush(g, linePts(fx - 10 + sway * 8, fy - r + 14, fx + 12 + sway * 8, fy - r + 14, 5, .25), b, { w: 4, seed: 61 });
      const wave = Math.sin(dance * 10);
      brush(g, linePts(fx - r * .9, fy - r * .8, fx - r * 2.1, fy - r * (1.6 + wave * .5), 5, .2), b, { w: 6, seed: 62 });
      brush(g, linePts(fx + r * .9, fy - r * .8, fx + r * 2.1, fy - r * (1.6 - wave * .5), 5, -.2), b, { w: 6, seed: 63 });
      // 光：一圈手画的短线
      for (let i = 0; i < 7; i++) { const a = -Math.PI * (.15 + .7 * i / 6), R = r * 2.6 + (rnd(i, b) - .5) * 10; brush(g, linePts(fx + Math.cos(a) * R, fy - r + Math.sin(a) * R, fx + Math.cos(a) * (R + 22), fy - r + Math.sin(a) * (R + 22), 3), b, { w: 5, col: HAND.orange, seed: 70 + i }); }
    }
  }
  g.restore();
  overlayPaper(g, .5);
};

export const Main: React.FC = () => {
  const t = useT(), tt = t - T('title'), b = onTwos(t);
  return (
    <AbsoluteFill style={{ background: HAND.paper }}>
      <Canvas2D draw={draw} />
      {tt > 0 && <div style={{ position: 'absolute', top: 120, width: '100%', textAlign: 'center', fontFamily: F.fun, fontSize: 200, color: HAND.red, letterSpacing: '.2em',
        transform: `rotate(${(rnd(b, 5) - .5) * 2}deg) scale(${tt < .17 ? 1.3 : 1})`, opacity: q(tt) > 0 ? 1 : 0 }}>手作<div style={{ fontFamily: F.gara, fontSize: 40, letterSpacing: '.5em', color: HAND.ink }}>HAND MADE</div></div>}
      <HandSub t={t} lines={(timing as any).lines} />
    </AbsoluteFill>
  );
};
