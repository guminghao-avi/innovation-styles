// 最后一段：黎明，另一座孤岛上坐着的"你" → 菜单再出现，锁裂开：「我自己」→ 站起来 → 特写：桨在手里 → 远景：很多木筏沿着航道划向太阳 → 片名
import React from 'react';
import { Canvas2D, k, E, seg, lerp } from '@kit';
import { T, HERO, OTHERS, sitSprite, standSprite, rowSprite, drawSprite, drawLantern, type Pal } from './common';
import { NIGHT, DAWN, begin, flush, finish, rock, lampRefl, flag, raft, oar, line, lightBegin, lightEnd, lampLight, lampFlicker, glow, ring, type Frame } from './engine';

/** "你"：一件灰色的连帽衫，没有金色围巾（还没找到自己的光） */
export const YOU: Pal = { hair: '#1e1820', skin: '#d6a07c', skinD: '#a06e54', coat: '#5a5e72', coatD: '#40435a', coatL: '#6e7290', pant: '#2c2e40', shoe: '#121424', scarf: '#5a5e72', scarfD: '#40435a', tail: false };
export const shot = (t: number): 'you' | 'close' | 'wide' => (t >= T('end') ? 'wide' : t >= T('closeup') ? 'close' : 'you');
const V = { you: { px: 8, camY: 102 }, close: { px: 12, camY: 132 }, wide: { px: 5, camY: 50 } };
const ISLE = { x: 140, top: 196 }, CH = { x: 132, y: 195 };

const frame = (t: number): Frame => {
  const s = shot(t), v = V[s], up = k(t, T('you'), T('closeup'), E.out);
  const iris = s === 'you' ? k(t, T('you'), T('you') + .8, E.out) : 1;
  const camX = s === 'you' ? 20 : s === 'close' ? Math.round(60 + (t - T('closeup')) * 9) : Math.round((t - T('end')) * 6);
  const sun = s === 'you' ? { x: 168, y: Math.round(lerp(178, 160, up)), r: 9 } : s === 'close' ? { x: 112, y: 160, r: 12 } : { x: 300, y: Math.round(lerp(156, 146, seg(t, T('end'), T('end') + 8))), r: 12 };
  return {
    t, px: v.px, camX, camY: v.camY, mood: DAWN, sun, stars: s === 'you' ? .15 * (1 - up) : 0,
    clouds: 0, cloudSpeed: .35, chop: 0, iris: iris < 1 ? { x: CH.x + 6, y: CH.y - 10, r: 560 * iris } : undefined,
  };
};
/** 远景里的木筏：大家沿着航道划向太阳 */
const FLEET = [
  { x: 96, y: 204, p: HERO, d: 0 }, { x: 150, y: 196, p: OTHERS[0], d: .4 }, { x: 214, y: 188, p: OTHERS[1], d: .9 },
  { x: 40, y: 192, p: OTHERS[2], d: 1.3 }, { x: 262, y: 181, p: OTHERS[3], d: .2 }, { x: 330, y: 178, p: OTHERS[4], d: .7 },
];

const drawPixels = (g: CanvasRenderingContext2D, t: number) => {
  const f = frame(t), s = shot(t), P = begin(g, f), lo = Math.min(1, lampFlicker(t));
  const lit = k(t, T('rise') + .3, T('rise') + .7);          // 站起来以后，灯才亮
  if (s === 'you') { rock(P, ISLE.x, ISLE.top, 1, { x: CH.x + 17, y: CH.y - 6, a: lo * (.35 + .65 * lit) }, 0, true); lampRefl(P, CH.x + 18, 210, lo * (.4 + .6 * lit)); }
  if (s === 'close') lampRefl(P, f.camX + 75, 203, lo);
  if (s === 'wide') FLEET.forEach(b => lampRefl(P, f.camX + b.x + 21 + (t - T('end')) * 6 * (1 - b.d * .2), b.y + 4, lo * .7, .7));
  flush(g, P);
  if (s === 'you') {
    flag(g, ISLE.x - 12, ISLE.top - 27, t, .7);
    const standing = t >= T('rise');
    drawSprite(g, standing ? standSprite(t, YOU) : sitSprite(t, false, YOU), CH.x, CH.y, { col: '#f6d58a', a: .25 + .2 * lit, dir: 1 });
    const lp = standing ? { x: CH.x + 8, y: CH.y - 9 } : { x: CH.x + 17, y: CH.y - 6 };
    drawLantern(g, lp.x, lp.y, lo * (.35 + .65 * lit));
    const ra = t - T('rise') - .3; if (ra > 0 && ra < .6) ring(g, lp.x + 2, lp.y + 3, 3 + ra * 60, '#f2c14e', 1 - ra / .6);
  }
  if (s === 'close') {
    // 特写：12 倍像素，木筏和人都很大；桨在手里
    const rx = f.camX + 46, ry = 194 + Math.round(Math.sin(t * 2.2) * .6), ph = (t * .9) % 1, rs = rowSprite(t, ph);
    raft(g, rx, ry, t, { lv: 2 });
    drawSprite(g, rs.s, rx + 4, ry - 1, { col: '#ffd890', a: .45, dir: 1 });
    oar(g, rx + 4 + rs.hand[0], ry - 1 + rs.hand[1], ph, ry + 3);
    drawLantern(g, rx + 20, ry - 7, lo);
  }
  if (s === 'wide') {
    const a = t - T('end');
    for (let i = 0; i < FLEET.length - 1; i++) line(g, f.camX + FLEET[i].x + 22, FLEET[i].y - 4, f.camX + FLEET[i + 1].x + 22, FLEET[i + 1].y - 4, '#c9962e', 4);
    FLEET.forEach((b, i) => {
      const x = Math.round(f.camX + b.x + a * 6 * (1 - b.d * .2)), y = b.y + Math.round(Math.sin(t * 2.4 + i) * .6), ph = (t * 1.1 + b.d) % 1;
      raft(g, x, y, t, { lv: 2 });
      const rs = rowSprite(t, ph, b.p);
      drawSprite(g, rs.s, x + 4, y - 1, { col: '#ffd890', a: .3, dir: 1 });
      oar(g, x + 4 + rs.hand[0], y - 1 + rs.hand[1], ph, y + 3);
      drawLantern(g, x + 20, y - 7, lo);
    });
  }
  finish(g, P);
};

const drawLight = (g: CanvasRenderingContext2D, t: number) => {
  const f = frame(t), s = shot(t), S = lightBegin(g, f), L = lampFlicker(t), lit = k(t, T('rise') + .3, T('rise') + .7);
  if (s === 'you') {
    const standing = t >= T('rise'), lp = standing ? { x: CH.x + 8, y: CH.y - 9 } : { x: CH.x + 17, y: CH.y - 6 };
    lampLight(g, S, lp.x, lp.y, L * (.3 + .7 * lit), Math.max(0, 1 - (t - T('rise') - .3) / .7) * (t > T('rise') + .3 ? 1 : 0), 214);
    // 解锁的那一刻：整个画面被金光扫过
    const u = t - T('unlock'); if (u >= 0 && u < 1.2) glow(g, 960, 520, 1400, '255,196,96', .3 * Math.exp(-u / .35));
  }
  if (s === 'close') {
    const rx = f.camX + 46, ry = 194;
    lampLight(g, S, rx + 20, ry - 7, L, 0, ry + 4, 1.4);
    // "桨"：手和桨上一层金边
    const [hx, hy] = S(rx + 14, ry - 8); glow(g, hx, hy, 180, '255,214,150', .25 * (.7 + .3 * Math.sin(t * 3)));
  }
  if (s === 'wide') FLEET.forEach(b => { const x = f.camX + b.x + (t - T('end')) * 6 * (1 - b.d * .2); lampLight(g, S, x + 20, b.y - 7, L * .8, 0, b.y + 4, .8); });
  lightEnd(g);
};

export const Finale: React.FC = () => {
  const t0 = T('you');
  return (
    <>
      {(['you', 'close', 'wide'] as const).map(s => (
        <Canvas2D key={s} scale={1 / V[s].px} style={{ imageRendering: 'pixelated' }} draw={(g, t) => { if (shot(t + t0) === s) drawPixels(g, t + t0); }} />
      ))}
      <Canvas2D draw={(g, t) => drawLight(g, t + t0)} />
    </>
  );
};
