// 镜头四：看海。"以后一起去看海吧" → 字压成一条地平线 → 线框草图展开 → 从地平线往外显影成真实的落日海面（日落、耳机里的歌、牵手）
// → 没有下文：画面定格、褪色，日子一天天过去 → 折回线框，缩成一粒光，悬在半空
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Shader, Canvas2D, useT, useScene, k, E, lerp, rnd, seg, clamp, F } from '@kit';
import { T, G, glow, orb, drawFish, heading, kpath, AMBER, AMBER_HOT, PEARL, PEARL_HOT, V2 } from './common';
import { YOU } from './C';
import SEA from './shaders/sea.frag';

type Ctx = CanvasRenderingContext2D;
const HZ = 470, FOC = 1100, EYE = 1.5;
const empty = (n: number) => new Array(n).fill(0);

/** 剪影：站在沙滩上的人。inner = 朝向同伴的那只手伸出去的程度（0 垂着，1 握住） */
const person = (g: Ctx, x: number, fy: number, h: number, side: 1 | -1, inner: number, hair: number, t: number, hand: V2 | null, col: string) => {
  g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
  const P = (u: number, v: number): V2 => [x + u * h, fy + v * h];
  // 腿：微微分开，重心落在一条腿上
  if (hair > 0) {
    g.beginPath();   // 裙摆
    g.moveTo(...P(-.09, -.52)); g.quadraticCurveTo(...P(-.12, -.38), ...P(-.13 + .01 * Math.sin(t * 1.1), -.26)); g.lineTo(...P(.13 + .012 * Math.sin(t * 1.1 + .5), -.27));
    g.quadraticCurveTo(...P(.12, -.38), ...P(.09, -.52)); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(...P(-.06, -.27)); g.lineTo(...P(-.048, -.01)); g.lineTo(...P(-.02, 0)); g.lineTo(...P(-.022, -.27)); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(...P(.02, -.27)); g.lineTo(...P(.04, -.01)); g.lineTo(...P(.068, 0)); g.lineTo(...P(.06, -.27)); g.closePath(); g.fill();
  } else {
    g.beginPath();
    g.moveTo(...P(-.088, -.5)); g.quadraticCurveTo(...P(-.085, -.27), ...P(-.075, -.01)); g.lineTo(...P(-.035, 0));
    g.quadraticCurveTo(...P(-.03, -.25), ...P(0, -.43)); g.quadraticCurveTo(...P(.035, -.25), ...P(.055, 0)); g.lineTo(...P(.09, -.01));
    g.quadraticCurveTo(...P(.08, -.27), ...P(.088, -.5)); g.closePath(); g.fill();
  }
  // 身体
  g.beginPath();
  g.moveTo(...P(-.09, -.5)); g.quadraticCurveTo(...P(-.1, -.66), ...P(-.118, -.8)); g.quadraticCurveTo(...P(-.1, -.84), ...P(-.03, -.85));
  g.lineTo(...P(.03, -.85)); g.quadraticCurveTo(...P(.1, -.84), ...P(.118, -.8)); g.quadraticCurveTo(...P(.1, -.66), ...P(.09, -.5)); g.closePath(); g.fill();
  // 脖子 + 头
  g.fillRect(...P(-.022, -.885), .044 * h, .05 * h);
  g.beginPath(); g.ellipse(...P(0, -.93), .056 * h, .066 * h, 0, 0, Math.PI * 2); g.fill();
  if (hair > 0) {   // 长发，被海风吹向一边
    const sw = Math.sin(t * 1.3) * .012;
    g.beginPath(); g.moveTo(...P(-.055, -.96)); g.quadraticCurveTo(...P(-.085 + sw, -.86), ...P(-.07 + sw * 2, -.76));
    g.lineTo(...P(.07 + sw * 2, -.76)); g.quadraticCurveTo(...P(.085 + sw, -.86), ...P(.055, -.96)); g.closePath(); g.fill();
  }
  // 手臂：外侧那只垂着；内侧那只伸向同伴
  g.lineWidth = .043 * h;
  const sh = P(-.112 * side, -.8);
  g.beginPath(); g.moveTo(...sh); g.quadraticCurveTo(...P(-.135 * side, -.64), ...P(-.13 * side, -.47)); g.stroke();
  const si = P(.112 * side, -.8);
  const rest = P(.13 * side, -.47);
  const tgt = hand ?? rest;
  const hx = lerp(rest[0], tgt[0], inner), hy = lerp(rest[1], tgt[1], inner);
  g.beginPath(); g.moveTo(...si); g.quadraticCurveTo(lerp(si[0], hx, .45) + .02 * h * side, lerp(si[1], hy, .5), hx, hy); g.stroke();
  g.beginPath(); g.arc(hx, hy, .026 * h, 0, Math.PI * 2); g.fill();
};

let _fp: ((t: number) => V2) | null = null;
const fishD = (t: number): V2 => {
  if (!_fp) _fp = kpath([[T('d6') + 1.4, 380, 1150], [T('d6') + 3.6, 700, 820], [T('e1') + 1, 860, 760], [T('e1') + 3, 900, 800]]);
  return _fp(t);
};

export const Sea: React.FC = () => {
  const a0 = useScene().a, t = useT() + a0;
  const say = T('d2@看海') - .7, flat = T('d2.end') + .15;
  const grid = k(t, flat + .4, flat + 2.2, E.inOut);
  const paint = k(t, T('d3@日落') - .3, T('d3@日落') + 2.6, E.inOut) * (1 - k(t, T('d6') + .2, T('d6') + 1.6, E.inOut));
  const freeze = T('d5') + .35, tf = Math.min(t, freeze);
  const sat = 1 - .9 * k(t, T('d5') + .4, T('d5') + 3.2, E.inOut);
  const expo = .9 - .42 * k(t, T('d5') + .4, T('d5') + 3.2, E.inOut);
  const fold = k(t, T('d6') + 1.3, T('d6') + 2.9, E.in);
  const sunY = lerp(.034, .021, seg(tf, T('d3'), freeze));
  const camX = lerp(-.25, .35, E.inOut(seg(tf, flat, freeze)));
  const show = flat - .1;
  return <AbsoluteFill>
    {t > show && <Shader frag={G(SEA)} scale={.6} t={tf} u={{
      uCam: [camX, EYE, HZ, FOC], uMode: [1 - paint, paint, grid, fold], uLook: [sat, expo, 0, .8],
      uSun: [-.02, sunY, .03, 1], uShore: 10.5, uL: empty(32), uR: empty(24), uMoon: [0, 0, 0, 0], uWireCol: [.55, .85, .9],
    }} style={{ opacity: k(t, show, show + .3) }} />}
    <Canvas2D draw={(g, tl) => {
      const tt = tl + a0;
      g.globalCompositeOperation = 'lighter';
      // "以后一起去看海吧"：从你那里飘出来，压成地平线
      const txt = '以后一起去看海吧', ch = [...txt];
      const flatP = k(tt, flat, flat + .8, E.inOut);
      if (tt > say && tt < flat + 1.4) {
        g.save(); g.font = `400 46px ${F.serif}`; g.textBaseline = 'middle'; g.textAlign = 'center';
        const sp = 58;
        ch.forEach((c, i) => {
          const p = k(tt, say + i * .07, say + 1.2 + i * .07, E.out);
          const x0 = YOU.x - 40 + (i - 3.5) * sp * .6, y0 = YOU.y - 70;
          const x1 = 960 + (i - 3.5) * sp, y1 = HZ;
          const x = lerp(x0, x1, E.inOut(seg(tt, say + .3, flat))), y = lerp(y0, y1, E.inOut(seg(tt, say + .3, flat))) - 14 * Math.sin(p * Math.PI);
          g.save(); g.translate(x, y); g.scale(1 + flatP * 1.4, 1 - flatP * .96);
          g.filter = p < .7 ? `blur(${((1 - p / .7) * 8).toFixed(1)}px)` : 'none';
          g.fillStyle = `rgba(${AMBER_HOT},${.9 * p * (1 - k(tt, flat + .5, flat + 1.2))})`;
          g.shadowColor = `rgba(${AMBER},.8)`; g.shadowBlur = 20; g.fillText(c, 0, 0); g.restore();
        });
        g.restore();
        // 字被压扁成一条光，往两边拉开
        const line = k(tt, flat + .3, flat + 1.3, E.inOut);
        if (flatP > .5) {
          const w = lerp(sp * 4.5, 1200, line), a = clamp((flatP - .5) * 2) * (1 - k(tt, flat + 1.1, flat + 1.6));
          const gr = g.createLinearGradient(960 - w, 0, 960 + w, 0);
          gr.addColorStop(0, 'rgba(255,220,180,0)'); gr.addColorStop(.5, `rgba(255,232,200,${a})`); gr.addColorStop(1, 'rgba(255,220,180,0)');
          g.fillStyle = gr; g.fillRect(960 - w, HZ - 1.5, w * 2, 3);
          glow(g, 960, HZ, 220, AMBER, .3 * a);
        }
      }
      // 耳机里的歌：一排随歌跳动的细条
      const mu = k(tt, T('d3@歌') - .2, T('d3@歌') + .8) * (1 - k(tt, freeze - .2, freeze + .4));
      if (mu > 0) {
        g.save(); g.globalCompositeOperation = 'source-over';
        g.font = `400 21px ${F.serif}`; (g as any).letterSpacing = '6px'; g.fillStyle = `rgba(250,236,226,${.7 * mu})`; g.textBaseline = 'top';
        g.fillText('那天耳机里的歌', 120, 112);
        for (let i = 0; i < 28; i++) {
          const v = .2 + .8 * Math.abs(Math.sin(tt * (2.1 + rnd(i, 1) * 3) + i * .7) * Math.sin(tt * 1.3 + i * .31));
          const hgt = 4 + 34 * v * (1 - Math.abs(i - 13.5) / 20);
          g.fillStyle = `rgba(255,214,180,${.75 * mu})`; g.fillRect(120 + i * 9, 190 - hgt, 4, hgt);
        }
        g.restore();
      }
      // 牵手的两个人（逆光剪影 + 一道暖边 + 朝镜头拉长的影子）
      const pa = k(tt, T('d4') - .3, T('d4') + 1.2, E.inOut) * (1 - k(tt, T('d5') + 1.5, T('d6') + .3, E.inOut));
      if (pa > .003) {
        const z = 8.2, fy = HZ + FOC * EYE / z, h = FOC * 1.74 / z;
        const xa = 1236, xb = 1316, hb = h * .93;
        const hold = k(tt, T('d4@牵手') - .4, T('d4@牵手') + .9, E.inOut);
        const meet: V2 = [(xa + xb) / 2, fy - .5 * h];
        const draw = (col: string, dx: number, dy: number) => {
          const lean = .035 * hold;
          g.save(); g.translate(xa + dx, fy + dy); g.rotate(lean); g.translate(-xa - dx, -fy - dy);
          person(g, xa + dx, fy + dy, h, 1, hold, 0, tt, [meet[0] - 3, meet[1]], col); g.restore();
          g.save(); g.translate(xb + dx, fy + dy); g.rotate(-lean); g.translate(-xb - dx, -fy - dy);
          person(g, xb + dx, fy + dy, hb, -1, hold, 1, tt, [meet[0] + 3, meet[1] + 1], col); g.restore();
        };
        g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = pa;
        // 影子：朝镜头拉长
        g.save(); g.translate((xa + xb) / 2, fy); g.scale(1.25, -1.5); g.translate(-(xa + xb) / 2, -fy); g.filter = 'blur(9px)'; draw('rgba(10,4,4,.5)', 0, 0); g.restore();
        g.filter = 'blur(1.2px)'; draw('rgba(255,150,90,.55)', -2, -1.5);
        g.filter = 'none'; draw('rgb(14,8,9)', 0, 0);
        g.restore();
      }
      // 日子一天天过去
      const ca = k(tt, T('d5') + .6, T('d5') + 1.2) * (1 - k(tt, T('d6') + 1.2, T('d6') + 2));
      if (ca > 0) {
        const u = seg(tt, T('d5') + .8, T('d6') + .8), day = Math.max(1, Math.round(1 + 96 * Math.pow(u, 1.8)));
        g.save(); g.globalCompositeOperation = 'source-over'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        g.font = `400 21px ${F.serif}`; (g as any).letterSpacing = '7px'; g.fillStyle = `rgba(236,230,220,${.6 * ca})`; g.fillText('说好的 · 一起去看海', 960, 150);
        g.font = `400 26px ${F.serif}`; (g as any).letterSpacing = '0px'; g.fillStyle = `rgba(236,230,220,${.75 * ca})`;
        g.font = `400 96px ${F.gara}`; const num = String(day), nw = g.measureText(num).width;
        g.fillStyle = `rgba(240,236,230,${.92 * ca})`; g.fillText(num, 960, 250);
        g.font = `400 28px ${F.serif}`; g.fillStyle = `rgba(236,230,220,${.7 * ca})`;
        g.fillText('第', 960 - nw / 2 - 30, 244); g.fillText('天', 960 + nw / 2 + 30, 244);
        g.restore();
      }
      // 收成的那一粒光：悬在半空，没地方落
      const pt = k(tt, T('d6') + 2.3, T('d6') + 3.1);
      if (pt > 0) {
        const rise = E.inOut(seg(tt, T('d6') + 3, T('e1') - .4));
        orb(g, 960, lerp(HZ, 330, rise), .55, AMBER, AMBER_HOT, pt * (1 - k(tt, T('e1') - .3, T('e1') + .3)), .4);
      }
      // 光鱼回来，在下面看着它
      const fa = k(tt, T('d6') + 1.6, T('d6') + 3.2) * (1 - k(tt, T('e1') - .3, T('e1') + .3));
      if (fa > 0) drawFish(g, tt, fishD(tt), dt => heading(fishD, tt - dt, -.6), { s: .7, a: fa, path: fishD, sparks: .3, cord: { to: [-200, 1300], a: .8 * fa } });
      void PEARL; void PEARL_HOT;
    }} />
  </AbsoluteFill>;
};
