// 镜头六：倒影。平静的黑水面上立着冷白的"都可以"，水里的倒影却写着"我想去另一家"；"没关系" ↔ "我希望你道个歉"。
// → 倒影里的那句破水而出、翻上来，替换掉水面上那句；远处一粒琥珀色的光靠过来。
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Shader, Canvas2D, useT, useScene, k, E, lerp, rnd, seg, clamp, F } from '@kit';
import { T, G, glow, orb, AMBER, AMBER_HOT, ROSE, ROSE_HOT, COLD } from './common';
import SEA from './shaders/sea.frag';

const HZ = 500, FOC = 1100, EYE = .6, ZT = 12, BASE = HZ + FOC * EYE / ZT;
type Ctx = CanvasRenderingContext2D;
const empty = (n: number) => new Array(n).fill(0);

const pool: HTMLCanvasElement[] = []; let _pi = 0;
/** 画一行字到离屏画布（光晕、虚焦都在这里一次做完，倒影再按行切片） */
const textCanvas = (s: string, size: number, col: string, weight: number, glowc: string, blur: number) => {
  if (!pool[_pi]) pool[_pi] = document.createElement('canvas');
  const c = pool[_pi++ % 8]; c.width = 1600; c.height = Math.ceil(size * 1.6);
  const g = c.getContext('2d')!; g.clearRect(0, 0, c.width, c.height);
  g.font = `${weight} ${size}px ${F.serif}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  (g as any).letterSpacing = `${size * .22}px`;
  if (blur > .5) g.filter = `blur(${blur.toFixed(1)}px)`;
  g.shadowColor = glowc; g.shadowBlur = size * .35;
  g.fillStyle = `rgb(${col})`; g.fillText(s, 800, size * 1.12);
  return c;
};
/** 立在水面上的一行字（底边贴着 BASE）；flip = 1 正立，-1 倒影；wob 波动像素 */
const drawLine = (g: Ctx, s: string, size: number, col: string, weight: number, a: number, flip: number, wob: number, t: number, glowc: string, blur = 0) => {
  if (a <= .003 || Math.abs(flip) < .01) return;
  const c = textCanvas(s, size, col, weight, glowc, blur), h = c.height, base = size * 1.12;
  g.save(); g.globalAlpha = a;
  const step = 2;
  for (let r = 0; r < h; r += step) {
    const fromBase = base - r;                           // 字里这一行离底边多高
    const y = BASE - fromBase * flip;
    const depth = flip < 0 ? Math.max(0, -(y - BASE)) : 0;
    const off = flip < 0 ? wob * Math.sin(r * .1 + t * 2.6) * (.3 + depth / 70) + wob * .5 * Math.sin(r * .045 - t * 1.7) : 0;
    const fade = flip < 0 ? clamp(1 - depth / (size * 1.3)) * .6 : 1;
    if (fade <= .01) continue;
    g.globalAlpha = a * fade;
    g.drawImage(c, 0, r, 1600, step, 160 + off, Math.min(y, y - step * flip) , 1600, step * Math.abs(flip));
  }
  g.restore();
};

const youW = (t: number) => { const u = E.inOut(seg(t, T('f6@别人') - .3, T('f6.end') + .4)); return [lerp(11, 5.2, u), lerp(.35, .55, u), 15, 1.4 * k(t, T('f6@别人') - .3, T('f6@别人') + 1.2)]; };
export const Mirror: React.FC = () => {
  const a0 = useScene().a, t = useT() + a0;
  const rise = T('f6') + .2;
  const on = k(t, T('f1') - 1.2, T('f1') + 1.2, E.inOut), out = 1 - k(t, T('g1') - 1.6, T('g1') - .2, E.inOut);
  return <AbsoluteFill style={{ opacity: out }}>
    <Shader frag={G(SEA)} scale={.6} u={{
      uCam: [0, EYE, HZ, FOC], uMode: [0, 1, 0, 0], uLook: [1, 1.05 * on, 1, .22],
      uSun: [0, .1, .03, 0], uShore: 0, uL: [...youW(t), ...empty(28)], uMoon: [-.32, .06, .012, 1],
      uR: [0, ZT, Math.max(0, t - rise), ...[2.4, ZT - 1, Math.max(0, t - T('f6.end') + 1.6)], ...empty(18)], uWireCol: [0, 0, 0],
    }} />
    <Canvas2D draw={(g, tl) => {
      const tt = tl + a0; _pi = 0;
      // 一对一对：嘴上说的（冷白，立在水上） ↔ 心里的（玫瑰色，在倒影里）
      const pairs: [string, string, number, number][] = [['都可以', '我想去另一家', T('f2'), T('f3')], ['没关系', '我希望你道个歉', T('f4'), T('f5')]];
      pairs.forEach(([said, real, ta, tb], pi) => {
        const end = pi === 0 ? T('f4') - .3 : 1e9;
        const ap = k(tt, ta - .1, ta + .9, E.out) * (1 - k(tt, end - .4, end + .5));
        if (ap <= .003) return;
        const morph = k(tt, tb + .1, tb + 1.1, E.inOut);
        const shake = Math.exp(-Math.max(0, tt - tb - .1) * 1.6) * (tt > tb ? 1 : 0);
        const wob = 1.4 + 9 * shake;
        // 上面：嘴上的话。最后一对在"真话说出来"时散掉
        const gone = pi === 1 ? k(tt, rise - .1, rise + .9, E.in) : 0;
        drawLine(g, said, 104, COLD, 300, ap * (1 - gone), 1, 0, tt, 'rgba(200,215,235,.35)', (1 - k(tt, ta - .1, ta + .7)) * 10 + gone * 14);
        // 倒影：先是同一句的倒影，水一晃，变成心里的那句
        drawLine(g, said, 104, COLD, 300, ap * (1 - morph), -1, wob, tt, 'rgba(0,0,0,0)');
        if (pi === 0 || tt < rise + .2) drawLine(g, real, 92, ROSE, 500, ap * morph * (pi === 1 ? 1 - k(tt, rise - .1, rise + .3) : 1), -1, wob, tt, 'rgba(244,140,178,.6)');
      });
      // 真话破水而出：从倒影翻成正立
      if (tt > rise - .2) {
        const u = k(tt, rise - .1, rise + 1.3, E.inOut);
        const flip = lerp(-1, 1, u);
        const real = '我希望你道个歉';
        drawLine(g, real, 92, ROSE, 500, 1, flip, 1.4 * (1 - u), tt, 'rgba(244,140,178,.7)');
        if (u > .5) drawLine(g, real, 92, ROSE, 500, clamp((u - .5) * 2) * .9, -1, 1.4, tt, 'rgba(0,0,0,0)');
        g.globalCompositeOperation = 'lighter';
        // 破水的那一圈光 + 水珠
        const age = tt - rise - .5;
        if (age > 0 && age < 1.6) {
          glow(g, 960, BASE, 420 * (.4 + age), ROSE, .2 * (1 - age / 1.6));
          for (let i = 0; i < 40; i++) {
            const vx = (rnd(i, 1) - .5) * 520, vy = -(180 + 320 * rnd(i, 2));
            const x = 960 + (rnd(i, 3) - .5) * 520 + vx * age * .4, y = BASE + vy * age + 420 * age * age;
            if (y > BASE + 2) continue;
            glow(g, x, y, 6, ROSE_HOT, .8 * (1 - age / 1.6));
          }
        }
        g.globalCompositeOperation = 'source-over';
      }
      // "别人才知道怎么照顾你"：远处一粒琥珀色的光靠过来
      const ap2 = k(tt, T('f6@别人') - .3, T('f6@别人') + 1.2);
      if (ap2 > 0) {
        g.globalCompositeOperation = 'lighter';
        const [wx, wy, wz] = youW(tt);
        const x = 960 + FOC * wx / wz, y = HZ - FOC * (wy - EYE) / wz;
        orb(g, x, y, .55, AMBER, AMBER_HOT, ap2, .4);
      }
    }} />
  </AbsoluteFill>;
};
