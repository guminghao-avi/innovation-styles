// 镜头一：墨。黑水里一滴猩红的墨坠下，炸成蘑菇云（刚准备生气）→ 光鱼掉头冲进去，尾流把红冲成一片清凉的光（先替对方找好了理由）
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Shader, Canvas2D, useT, k, E, lerp, rnd, seg, clamp } from '@kit';
import { T, G, swim, kpath, glow, PEARL, PEARL_HOT, RED, V2 } from './common';
import INK from './shaders/ink.frag';

const SURF = 64, DX = 1010;
export const fishA = (() => {
  let p: ((t: number) => V2) | null = null;
  return (t: number) => {
    if (!p) {
      const d = T('drop'), s = T('sweep');
      p = kpath([
        [-1, 1500, 800], [2.5, 1230, 760], [d - .2, 860, 690],
        [d + .45, 640, 800], [s - .5, 520, 780], [s + .25, 760, 690], [s + .85, 1010, 560], [s + 1.45, 1290, 410],
        [s + 2.2, 1560, 470], [s + 3.0, 1600, 760], [s + 4.4, 1260, 1260], [s + 6, 1100, 1700],
      ]);
    }
    return p(t);
  };
})();

export const Hook: React.FC = () => {
  const t = useT();
  const tau = t - T('drop'), sw = T('sweep');
  // 尾流点：冲刺那一段的头部轨迹
  const wk: number[] = [];
  for (let i = 0; i < 10; i++) {
    const ti = sw - .1 + i * .2, age = t - ti, [x, y] = fishA(ti);
    wk.push(x, y, Math.max(0, age), age > 0 ? clamp(age * 3) * 1.1 : 0);
  }
  const push = lerp(1.0, 1.1, E.inOut(seg(t, 0, T('bIn') + 1)));
  return <AbsoluteFill style={{ background: '#000', opacity: 1 - k(t, T('bIn'), T('bIn') + 1.4, E.inOut) }}>
    <Shader frag={G(INK)} scale={.7} u={{
      uDrop: [DX, SURF, tau, k(t, sw + .5, sw + 3.6, E.inOut)], uWk: wk,
      uExpo: k(t, 0, 2.2, E.inOut) * 1.15, uPush: push, uCool: 1 - k(t, sw + 1.2, sw + 3.4), uSurf: SURF,
    }} />
    <Canvas2D draw={(g, tt) => {
      g.save();
      g.translate(960, 470); g.scale(push, push); g.translate(-960, -470);
      g.globalCompositeOperation = 'lighter';
      // 水里的悬浮微粒（近大远小、慢慢漂）
      for (let i = 0; i < 170; i++) {
        const z = .3 + rnd(i, 1) * .9;
        const x = ((rnd(i, 2) * 2200 + tt * 6 * z + Math.sin(tt * .3 + i) * 8) % 2200) - 140, y = ((rnd(i, 3) * 1250 - tt * 9 * z) % 1250 + 1250) % 1250 - 80;
        const near = z > 1.1;
        if (near) glow(g, x, y, 18 * z, '150,200,210', .05);
        else { g.fillStyle = `rgba(170,210,215,${.12 + .3 * rnd(i, 4) * z})`; g.fillRect(x, y, 1.6 * z, 1.6 * z); }
      }
      // 那一滴：从水面上方砸下来
      const ft = tt - (T('drop') - .22);
      if (ft > 0 && ft < .24) {
        const y = lerp(-40, SURF, ft / .22);
        g.strokeStyle = `rgba(${RED},.9)`; g.lineWidth = 7; g.beginPath(); g.moveTo(DX, y - 50); g.lineTo(DX, y); g.stroke();
        glow(g, DX, y, 40, RED, .5);
      }
      if (tau > 0 && tau < .6) glow(g, DX, SURF + 10, 140 * (1 - tau), '255,220,220', .5 * (1 - tau / .6));
      // 入水带下去的气泡
      if (tau > 0) for (let i = 0; i < 26; i++) {
        const b0 = rnd(i, 11) * .5, age = tau - b0; if (age < 0) continue;
        const dep = 60 + 260 * rnd(i, 12), rise = 70 * age * (1 + rnd(i, 13));
        const y = SURF + Math.max(0, dep * (1 - Math.exp(-age * 5)) - rise);
        if (y <= SURF + 4) continue;
        const x = DX + (rnd(i, 14) - .5) * 70 + Math.sin(age * 7 + i) * 5;
        const r = 2 + 5 * rnd(i, 15);
        g.strokeStyle = `rgba(210,240,245,${.5 * clamp(1.5 - age * .3)})`; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
        g.fillStyle = `rgba(255,255,255,${.7 * clamp(1.5 - age * .3)})`; g.fillRect(x - r * .4, y - r * .5, 1.4, 1.4);
      }
      g.restore();
      // 光鱼
      g.save(); g.translate(960, 470); g.scale(push, push); g.translate(-960, -470);
      const fast = seg(tt, sw - .3, sw + 1.6) * (1 - seg(tt, sw + 1.6, sw + 3));
      swim(g, tt, fishA, {
        s: .9, amp: lerp(.3, .55, fast), freq: lerp(.75, 1.6, fast), fb: Math.PI, a: k(tt, .4, 2.6, E.inOut), sparks: .35 + .6 * fast,
        cord: { to: [2250, 1300], a: .9 * k(tt, 1, 3), c1: 200, c2: [1900, 1150] },
      });
      g.restore();
    }} />
  </AbsoluteFill>;
};
