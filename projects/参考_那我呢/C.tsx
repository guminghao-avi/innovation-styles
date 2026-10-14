// 镜头三：焦点。一群琥珀色的光在焦外聊天，零碎的话往上飘；"我其实挺爱吃桂花糕的"被光鱼悄悄收进身体里。
// 一颗光突然安静、暗下去 → 焦点从人群拉到它身上，全世界虚掉；它身边浮出没说出口的话。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Canvas2D, useT, useScene, k, E, lerp, rnd, seg, clamp, F } from '@kit';
import { T, orb, drawFish, fishSpine, heading, kpath, glow, mixc, AMBER, AMBER_HOT, PEARL, COLD, V2 } from './common';

type Ctx = CanvasRenderingContext2D;
export const YOU = { x: 1250, y: 470, z: 2.15 };
const N = 36;
const L = Array.from({ length: N }, (_, i) => {
  let x = 120 + rnd(i, 1) * 1680, y = 230 + rnd(i, 2) * 560;
  if (Math.hypot(x - YOU.x, y - YOU.y) < 170) x += 340;
  const z = i < 6 ? .75 + rnd(i, 3) * .25 : 1.25 + rnd(i, 3) * .38;   // 前景几颗很近（大光斑）
  return { x, y, z, b: .55 + .6 * rnd(i, 4), hue: rnd(i, 5), ph: rnd(i, 6) * 6.28 };
});
const WORDS = ['哈哈哈哈', '然后呢？', '真的假的', '笑死', '我跟你说', '下周去哪玩', '对对对', '不是吧', '后来呢', '离谱', '我也是！', '太好笑了', '你听我说', '啊？', '绝了'];

const focusAt = (t: number) => lerp(1.4, YOU.z, E.inOut(seg(t, T('c3') - .3, T('c3') + 1.4)));
const coc = (z: number, zf: number) => 3 + 400 * Math.abs(1 / z - 1 / zf);

/** 一个焦外光斑：平的圆盘 + 稍亮的边（镜头的样子），能量守恒：越大越淡 */
const disc = (g: Ctx, x: number, y: number, r: number, col: string, a: number) => {
  if (a <= .003) return;
  if (r < 7) { glow(g, x, y, 60, col, .25 * a); glow(g, x, y, 12, AMBER_HOT, .95 * a); return; }
  const e = clamp(1100 / (r * r + 300), .06, .85) * a;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${col},${e * .8})`); gr.addColorStop(.82, `rgba(${col},${e * .9})`);
  gr.addColorStop(.94, `rgba(${mixc(col, '255,255,255', .25)},${e * 1.25})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
};
const blurText = (g: Ctx, s: string, x: number, y: number, size: number, col: string, a: number, blur: number) => {
  if (a <= .003) return;
  g.save(); g.font = `400 ${size}px ${F.serif}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  (g as any).letterSpacing = `${size * .12}px`;
  if (blur > .8) g.filter = `blur(${blur.toFixed(1)}px)`;
  g.fillStyle = `rgba(${col},${a})`; g.fillText(s, x, y); g.restore();
};

let _fp: ((t: number) => V2) | null = null;
export const fishC = (t: number): V2 => {
  if (!_fp) _fp = kpath([
    [T('c1') - 2.5, -300, 700], [T('c1') + .6, 380, 640], [T('c1@记着') - .2, 700, 600], [T('c1.end') + .6, 860, 640],
    [T('c2') + 1.5, 760, 700], [T('c3') - .2, 700, 640], [T('c3') + 1.6, 960, 540], [T('c3.end') + .4, 1060, 515],
    [T('c4') + 2, 1085, 520], [T('d1') + 2, 1050, 540], [T('d2') + 1, 1000, 560],
  ]);
  return _fp(t);
};
const fishAng = (t: number) => heading(fishC, t, 0);

export const Focus: React.FC = () => {
  const a0 = useScene().a;
  return <AbsoluteFill>
    <Canvas2D draw={(g, tl) => {
      const t = tl + a0, zf = focusAt(t);
      const fin = k(t, T('c1') - 1.4, T('c1') + .4, E.inOut), crowdOut = 1 - k(t, T('d1') - .3, T('d1') + 2.2, E.inOut);
      // 背景：暖色的暗房间
      const bg = g.createRadialGradient(960, 520, 0, 960, 520, 1100);
      bg.addColorStop(0, `rgba(58,34,20,${.95 * fin * crowdOut})`); bg.addColorStop(1, 'rgba(4,3,3,0)');
      g.fillStyle = bg; g.fillRect(0, 0, 1920, 1080);
      g.globalCompositeOperation = 'lighter';
      const quiet = k(t, T('c2@安静') - .3, T('c2@安静') + .9, E.inOut);
      const busy = 1 + 1.4 * k(t, T('c2'), T('c2@热闹') + .3);
      // 人群的光
      L.forEach((l, i) => {
        const talk = Math.max(0, Math.sin(t * (2.2 + l.hue * 1.6) * busy * .7 + l.ph)) ** 3;
        const x = l.x + 6 * Math.sin(t * .6 + l.ph), y = l.y + 5 * Math.sin(t * 1.3 + l.ph * 2) - 4 * talk;
        const r = coc(l.z, zf) * (l.z < 1 ? 1.25 : 1);
        const col = l.hue > .82 ? '255,226,196' : l.hue > .68 ? '255,150,140' : mixc('255,188,100', '255,140,60', l.hue / .68);
        disc(g, x, y, r, col, l.b * (.7 + .3 * talk) * fin * crowdOut * (l.z < 1 ? .75 : 1));
      });
      // 零碎的话
      for (let j = Math.floor((t - 3) / .3); j <= Math.floor(t / .3); j++) {
        const st = j * .3, age = t - st; if (age < 0 || age > 2.4) continue;
        if (st < T('c1') - .5 || st > T('c3') + .8) continue;
        const rate = st > T('c2') - .2 && st < T('c2@安静') ? .9 : .45;
        if (rnd(j, 51) > rate) continue;
        const li = Math.floor(rnd(j, 52) * N), l = L[li];
        if (l.z < 1) continue;
        const r = coc(l.z, zf);
        const a = Math.min(seg(age, 0, .3), 1 - seg(age, 1.6, 2.4)) * .55 * crowdOut;
        blurText(g, WORDS[Math.floor(rnd(j, 53) * WORDS.length)], l.x + (rnd(j, 54) - .5) * 60, l.y - 40 - age * 26, 26, '255,226,196', a, Math.max(0, r - 4) * .5);
      }
      // "你"：一颗光；开口说桂花糕，然后安静下来
      const ry = coc(YOU.z, zf);
      const youA = fin * (1 - k(t, T('d2.end') - .5, T('d2.end') + .6)) * lerp(1, .42, quiet) * (1 + .25 * k(t, T('c4'), T('c4') + 1));
      const youCol = mixc(AMBER, '255,214,190', quiet * .6);
      const yx = YOU.x + 5 * Math.sin(t * .6) * (1 - quiet), yy = YOU.y + 4 * Math.sin(t * 1.3) * (1 - quiet);
      disc(g, yx, yy, ry, youCol, youA);
      const sharp = 1 - seg(ry, 8, 40);
      if (sharp > 0) orb(g, yx, yy, .62, youCol, AMBER_HOT, sharp * .8 * (1 - k(t, T('d2.end') - .5, T('d2.end') + .6)) * (1 + .3 * k(t, T('c4'), T('c4') + 1)), .35);
      // 桂花糕：从"你"那里飘出来，被鱼收进身体里
      const sa = T('c1') + .2, sc = T('c1@记着') - .1;
      const sp = fishSpine(fishC(t), dt => fishAng(t - dt), t, { s: .74 });
      const keep = sp[Math.floor(34 * .33)];
      if (t > sa) {
        const txt = '我其实挺爱吃桂花糕的', chars = [...txt];
        const absorb = k(t, sc, sc + .9, E.in);
        g.save(); g.font = `400 28px ${F.serif}`; g.textBaseline = 'middle'; (g as any).letterSpacing = '3px';
        const tw = g.measureText(txt).width;
        chars.forEach((c, i) => {
          const fly = k(t, sa + i * .03, sa + 1.6 + i * .03, E.out);
          const bx = lerp(yx, 980, fly) - tw / 2 + i * tw / chars.length, by = lerp(yy, 330, fly) - 10 * Math.sin(fly * 3);
          const ab = k(t, sc + i * .05, sc + .7 + i * .05, E.in);
          const x = lerp(bx, keep.x, ab), y = lerp(by, keep.y, ab);
          const al = Math.min(fly * 1.5, 1) * (1 - ab * .9) * fin;
          g.filter = fly < .6 ? `blur(${((1 - fly / .6) * 6).toFixed(1)}px)` : 'none';
          g.fillStyle = `rgba(255,224,190,${.85 * al})`; g.fillText(c, x, y);
        });
        g.restore();
        if (absorb > 0) glow(g, keep.x, keep.y, lerp(60, 26, absorb), AMBER, .7 * absorb * (1 - .4 * k(t, sc + 1.2, sc + 2.5)));
      }
      // 没说出口的话：只有在焦点里才看得见
      const un: [string, number, number, number][] = [['有点累', 1400, 395, 0], ['插不上话', 1130, 375, .5], ['想早点回家', 1360, 585, 1.0]];
      un.forEach(([s, x, y, d]) => {
        const p = k(t, T('c4') + .2 + d, T('c4') + 1.4 + d, E.out) * crowdOut;
        blurText(g, s, x, y + (1 - p) * 10, 30, COLD, .72 * p, (1 - p) * 10);
      });
      // 光鱼
      const f = fishC(t);
      drawFish(g, t, f, dt => fishAng(t - dt), {
        s: .74, amp: .3, freq: .8, path: fishC, sparks: .35, a: k(t, T('c1') - 1.5, T('c1') - .2) * (1 - k(t, T('d2.end'), T('d2.end') + 1)),
        cord: { to: [-300, 1250], a: .8, c1: 200 },
      });
      if (t > sc + .6) glow(g, keep.x, keep.y, 14, AMBER_HOT, .9 * k(t, sc + .6, sc + 1) * (1 - k(t, T('d2.end'), T('d2.end') + 1)));
      void PEARL;
    }} />
  </AbsoluteFill>;
};
