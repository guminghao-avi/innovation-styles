// 镜头五：落下。夜海上悬着很多粒"期待"的光；每兑现一个小约定，就有一粒光落到海面上 —— 涟漪荡开，倒影拉长。
// 做不到的那件（看海），一句认真的解释，它也稳稳落下了。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Shader, Canvas2D, useT, useScene, k, E, lerp, rnd, seg, clamp, F } from '@kit';
import { T, G, glow, orb, drawFish, heading, kpath, AMBER, AMBER_HOT, V2 } from './common';
import SEA from './shaders/sea.frag';

const HZ = 470, FOC = 1100, EYE = 1.2;
type Lt = { x: number; y: number; z: number; land: number; why?: string; side?: 1 | -1 };
// 最后一盏（i=7）就是看海那一粒：从上一个镜头的光点接过来
const lights = (): Lt[] => {
  const e2 = T('e2'), e3 = T('e3'), e4 = T('e4');
  return [
    { x: -2.3, y: 2.6, z: 6.8, land: e2 + .2, why: '说好八点到 · 七点五十六到了', side: -1 },
    { x: 2.5, y: 3.0, z: 8.5, land: T('e2@做到') - .1, why: '说回电话 · 回了', side: 1 },
    { x: -1.6, y: 3.4, z: 12.5, land: e2 + 2.3, why: '说给他带桂花糕 · 带了', side: -1 },
    { x: 4.2, y: 2.4, z: 16, land: e4 + .6 },
    { x: -5.5, y: 3.0, z: 19, land: e4 + 1.3 },
    { x: 2.6, y: 2.6, z: 24, land: e4 + 2.0 },
    { x: -2.6, y: 4.2, z: 26, land: e4 + 2.6 },
    { x: 0, y: EYE + (HZ - 330) * 6 / FOC, z: 6, land: e3 + 2.4, why: '这周去不了海边了。下个月第一个周末，好吗？', side: -1 },
  ];
};
const camX = (t: number) => lerp(0, .5, E.inOut(seg(t, T('e1'), T('f1'))));
const lp = (l: Lt, i: number, t: number) => {
  const u = E.inOut(seg(t, l.land - 1.3, l.land));
  const wob = 1 - u;
  const x = l.x + .25 * Math.sin(t * .4 + i * 2) * wob;
  const yAir = l.y + .18 * Math.sin(t * .8 + i * 1.3) + (i === 7 ? .35 * E.inOut(seg(t, T('e3') - .3, T('e3') + 1)) * (1 - u) : 0);
  const y = lerp(yAir, .06, u) + (u >= 1 ? .03 * Math.sin(t * 1.4 + i) : 0);
  return { x, y, z: l.z, u };
};
const proj = (x: number, y: number, z: number, cx: number): V2 => [960 + FOC * (x - cx) / z, HZ - FOC * (y - EYE) / z];

let _fp: ((t: number) => V2) | null = null;
const fishE = (t: number): V2 => {
  if (!_fp) _fp = kpath([[T('e1') - 1, 900, 800], [T('e2') + 1, 700, 860], [T('e4'), 980, 900], [T('e4') + 3, 1300, 870], [T('f1') + 1, 1500, 900]]);
  return _fp(t);
};

export const Night: React.FC = () => {
  const a0 = useScene().a, t = useT() + a0;
  const L = lights(), cx = camX(t);
  const uL: number[] = [], uR: number[] = [];
  L.forEach((l, i) => { const p = lp(l, i, t); uL.push(p.x, p.y, p.z, (.55 + .45 * p.u) * (i === 7 ? 1.2 : k(t, T('e1') - .6, T('e1') + 2, E.inOut))); uR.push(l.x, l.z, Math.max(0, t - l.land)); });
  const on = k(t, T('e1') - .6, T('e1') + 2, E.inOut), out = 1 - k(t, T('f1') - 1.4, T('f1') + .2, E.inOut);
  return <AbsoluteFill style={{ opacity: out }}>
    <Shader frag={G(SEA)} scale={.6} u={{
      uCam: [cx, EYE, HZ, FOC], uMode: [0, 1, 0, 0], uLook: [1, 1.1 * on, 1, .42],
      uSun: [0, .1, .03, 0], uShore: 0, uL, uR, uMoon: [0, 0, 0, 0], uWireCol: [0, 0, 0],
    }} />
    <Canvas2D draw={(g, tl) => {
      const tt = tl + a0, c = camX(tt);
      g.globalCompositeOperation = 'lighter';
      // 水下游着的光鱼（隔着水面，有点虚）
      const fa = k(tt, T('e1') - .3, T('e1') + .3) * .55;
      g.save();
      drawFish(g, tt, fishE(tt), dt => heading(fishE, tt - dt, 0), { s: .62, a: fa, sparks: .2, glowA: .6, path: fishE, cord: { to: [-200, 1250], a: .6 * fa } });
      g.restore();
      lights().forEach((l, i) => {
        const p = lp(l, i, tt), [x, y] = proj(p.x, p.y, p.z, c), s = 9 / p.z;
        const flick = i === 7 ? 1 - .45 * k(tt, T('e3') - .2, T('e3') + .3) * (1 - k(tt, T('e3') + 1, T('e3') + 2.2)) * (.6 + .4 * Math.sin(tt * 23)) : 1;
        const a = flick * (i === 7 ? 1 : on);
        orb(g, x, y, (.5 + .25 * p.u) * s * 2.4, AMBER, AMBER_HOT, a, .25 * p.u);
        // 落下那一刻：水面一圈亮
        const age = tt - l.land;
        if (age > 0 && age < 2) glow(g, x, y + 4, 200 * s * (1 + age), AMBER, .3 * (1 - age / 2));
        if (l.why) {
          const wa = k(tt, (i === 7 ? T('e3') + .3 : l.land - .2), (i === 7 ? T('e3') + 1.3 : l.land + .6)) * (1 - k(tt, T('e4.end') - .4, T('e4.end') + .6));
          if (wa > .003) {
            g.save(); g.globalCompositeOperation = 'source-over';
            g.font = `400 ${i === 7 ? 28 : 24}px ${F.serif}`; g.textBaseline = 'middle'; g.textAlign = l.side === 1 ? 'left' : 'right';
            (g as any).letterSpacing = '3px';
            const below = i === 7 && p.u > .5, tx = x + (l.side ?? 1) * 34, ty = below ? y + 52 : y - 46;
            g.strokeStyle = `rgba(255,226,196,${.35 * wa})`; g.lineWidth = 1; g.beginPath(); g.moveTo(x + (l.side ?? 1) * 8, y + (below ? 8 : -8)); g.lineTo(tx - (l.side ?? 1) * 6, ty + (below ? -8 : 8)); g.stroke();
            g.shadowColor = 'rgba(0,0,0,.9)'; g.shadowBlur = 8;
            g.fillStyle = `rgba(255,236,214,${.88 * wa})`; g.fillText(l.why, tx, ty);
            g.restore(); g.globalCompositeOperation = 'lighter';
          }
        }
      });
      // 远处还有很多更小的光，在最后一句一起落下
      for (let j = 0; j < 26; j++) {
        const land = T('e4@有地方') - .4 + rnd(j, 3) * 2.2, z = 16 + rnd(j, 1) * 40, x = (rnd(j, 2) - .5) * z * 1.3;
        const u = E.inOut(seg(tt, land - 1.4, land)), y = lerp(1.8 + rnd(j, 4) * 3, .06, u);
        const [sx, sy] = proj(x, y, z, c), a = k(tt, T('e1'), T('e1') + 2) * (.5 + .5 * u);
        glow(g, sx, sy, 40 * 9 / z, AMBER, .5 * a); glow(g, sx, sy, 5, AMBER_HOT, .8 * a);
        if (u >= 1) glow(g, sx, sy + 4 * 9 / z * 3, 26 * 9 / z, AMBER, .25 * a);
      }
    }} />
  </AbsoluteFill>;
};
