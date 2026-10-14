// 夜海孤岛：像素层（480×270 ImageData + 精灵）+ 全分辨率光层
import React from 'react';
import { Canvas2D, k, E, clamp, lerp, seg } from '@kit';
import {
  T, PW, PH, PX, HZ, WORLD_H, C, GOLD, GOLD_HOT, COLD, COLD_HOT, MOON, u32, dpick, vnoise, glow, rnd,
  sitSprite, standSprite, drawSprite, drawLantern, ring, mixHex, bayer,
} from './common';

// ---------- 时间线（全片秒） ----------
export const camY = (t: number) => {
  const up = k(t, T('tilt'), T('tilt') + 2.2, E.film), dn = k(t, T('down'), T('down') + 1.8, E.film);
  return Math.round(lerp(50, 12, up * (1 - dn)));
};
export const irisR = (t: number) => k(t, T('iris'), T('iris') + .85, E.in) * 560;
export const FLASH = [0, 1, 2, 3].map(i => T('sig') + i * .62);
export const flashAt = (t: number) => FLASH.reduce((m, f) => Math.max(m, t >= f ? Math.exp(-(t - f) / .2) : 0), 0);
export const pose = (t: number): 'sit' | 'raise' | 'stand' =>
  t >= T('stand') ? 'stand' : (t >= T('sig') - .3 && t < T('b4') + 1.4) ? 'raise' : 'sit';
const rollP = (t: number) => seg(t, T('roll0'), T('roll1'));
export const timeLapse = (t: number) => Math.sin(Math.PI * rollP(t));   // 天数飞涨时，云和浪也快进

// 世界里的东西
const MOON_P = { x: 284, y: 94, r: 15 };
const ISLE = { x: 140, top: 196 };
const CHAR = { x: 132, y: 195 };
export const TITLE_W = { x: 192, y: 100 };
const shipX = (t: number, which: 0 | 1) => which === 0 ? Math.round(20 + (t - 6) * 5) : Math.round(-14 + (t - 9) * 13);
const plank = (t: number) => {
  const p = E.out(seg(t, T('tilt') + .6, T('grab')));
  return { x: Math.round(lerp(24, 100, p)), y: 208 + Math.round(Math.sin(t * 3.1) * .8), on: t >= T('tilt') + .6 && t < T('grab') };
};
export const lanternPos = (t: number) => {
  const p = pose(t);
  if (p === 'stand') return { x: CHAR.x + 8, y: CHAR.y - 9 };
  if (p === 'raise') return { x: CHAR.x + 8, y: CHAR.y - 30 };
  return { x: CHAR.x + 17, y: CHAR.y - 6 };
};
export const lanternOn = (t: number) => {
  const fl = .86 + .14 * (rnd(Math.floor(t * 8), 3) * .6 + .4 * Math.sin(t * 9));   // 8fps 跳帧的火苗
  return clamp(fl + flashAt(t) * .6, 0, 1.6);
};

// ---------- 调色板 ----------
const SKY = ['#080a15', '#0b0e1e', '#0f1328', '#131832', '#171d3c', '#1c2346', '#232b54', '#2b3462', '#353f74'].map(u32);
const SEA = ['#20284c', '#1b2244', '#161c3a', '#121731', '#0e1228', '#0b0e20', '#090b19'].map(u32);
const CLOUD = ['#151a33', '#1b2242', '#232b52', '#2e386a', '#3c4882'].map(u32);
const MOONC = { lit: u32('#c3cbf4'), mid: u32('#9fa9e6'), shade: u32('#7480cc'), crater: u32('#8d97da') };
const BG = u32(C.bg);
const STARS = Array.from({ length: 80 }, (_, i) => ({ x: Math.floor(rnd(i, 1) * PW), y: Math.floor(rnd(i, 2) * 160), b: rnd(i, 3), tw: rnd(i, 4) * 6 }));

let IMG: ImageData | null = null;
const drawPixels = (g: CanvasRenderingContext2D, t: number) => {
  g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
  if (!IMG) IMG = g.createImageData(PW, PH);
  const buf = new Uint32Array(IMG.data.buffer);
  const cy = camY(t), tl = timeLapse(t), cs = t * .5 + tl * 9;   // 云的漂移（快进时加速）
  const R = irisR(t), icx = CHAR.x + 6, icy = CHAR.y - 10 - cy;
  if (R <= 0) { buf.fill(BG); g.putImageData(IMG, 0, 0); return; }

  // —— 天空 / 云 / 月亮 / 海 ——
  for (let y = 0; y < PH; y++) {
    const wy = y + cy, row = y * PW;
    if (wy < HZ) {
      const base = Math.pow(wy / HZ, 1.5) * 5;
      const cband = Math.exp(-(((wy - 104) / 13) ** 2)) * .9 + Math.exp(-(((wy - 54) / 8) ** 2)) * .6;
      for (let x = 0; x < PW; x++) {
        const dx = x - MOON_P.x, dy = wy - MOON_P.y, d = Math.sqrt(dx * dx + dy * dy);
        let c: number;
        if (d < MOON_P.r) {
          // 月亮：左下暗、右上亮，几个环形山
          const l = (-dx * .5 + dy * .6) / MOON_P.r;
          const cr = vnoise(x * .35, wy * .35) > .72 || (Math.hypot(dx + 5, dy - 4) < 4) || (Math.hypot(dx - 6, dy + 6) < 2.5);
          c = cr ? MOONC.crater : (l > .55 ? MOONC.shade : l > .1 && bayer(x, wy) < (l - .1) * 2.2 ? MOONC.mid : MOONC.lit);
          if (d > MOON_P.r - 1.2 && l > .2) c = MOONC.shade;
        } else {
          const halo = 2.6 * Math.exp(-(d - MOON_P.r) / 26);
          c = dpick(SKY, base + halo, x, wy);
          if (cband > .05) {
            const n = vnoise(x * .028 + cs, wy * .12) * .62 + vnoise(x * .08 + cs * 1.7, wy * .3) * .38;
            const dens = n * cband - .38;
            if (dens > (bayer(x, wy) - .5) * .12) c = dpick(CLOUD, dens * 9 + 3.2 * Math.exp(-d / 34), x, wy);
          }
        }
        buf[row + x] = c;
      }
    } else if (wy === HZ) {
      for (let x = 0; x < PW; x++) buf[row + x] = dpick(SKY, 6.2 + 1.2 * Math.exp(-Math.abs(x - MOON_P.x) / 50), x, wy);
    } else {
      const p = (wy - HZ) / (WORLD_H - HZ);
      for (let x = 0; x < PW; x++) buf[row + x] = dpick(SEA, Math.pow(p, .8) * 6, x, wy);
    }
  }
  // 星星（月亮附近和云里不画）
  for (const s of STARS) {
    const y = s.y - cy; if (y < 0 || y >= PH || s.y >= HZ - 6) continue;
    if (Math.hypot(s.x - MOON_P.x, s.y - MOON_P.y) < 40) continue;
    const tw = .55 + .45 * Math.sin(t * (1.3 + tl * 6) + s.tw);
    const lv = s.b * tw;
    if (lv < .25) continue;
    buf[y * PW + s.x] = u32(lv > .75 ? '#dfe5ff' : lv > .5 ? '#9aa6e0' : '#5c679e');
  }
  // 海面浪花：一行行横向短线，近处长、远处短
  const put = (x: number, wy: number, col: number) => { const y = wy - cy; if (x >= 0 && x < PW && y >= 0 && y < PH) buf[y * PW + x] = col; };
  const W1 = u32('#2c3564'), W2 = u32('#39437a'), MR1 = u32('#aeb8f2'), MR2 = u32('#7c88d6'), LG1 = u32('#e0ac3e'), LG2 = u32('#8a6424');
  const wsp = 1 + tl * 10, step = Math.floor(t * 8);
  for (let wy = HZ + 1; wy < WORLD_H; wy++) {
    const p = (wy - HZ) / (WORLD_H - HZ);
    if ((wy + Math.floor(p * 3)) % 2) continue;
    const n = Math.round(5 + 9 * (1 - p));
    for (let i = 0; i < n; i++) {
      const len = Math.max(1, Math.round((1 + 7 * p) * (.4 + rnd(wy * 13 + i, 5)))), sp = (2 + 5 * p) * (rnd(i, wy) > .5 ? 1 : -.6);
      const x0 = Math.round(((rnd(wy * 7 + i, 6) * 600 + t * sp * wsp) % 600 + 600) % 600) - 60;
      const vis = rnd(wy * 31 + i, Math.floor(t * 1.5 + rnd(i, 9) * 9)) > .25;
      if (!vis) continue;
      for (let j = 0; j < len; j++) put(x0 + j, wy, j === 0 && len > 3 ? W2 : W1);
    }
    // 月光倒影：月亮正下方一列碎光
    const hw = 1.5 + p * 15;
    for (let i = 0; i < 4; i++) {
      if (rnd(wy * 3 + i, step + i * 17) > .5 - p * .2) continue;
      const len = Math.max(1, Math.round(hw * (.3 + .7 * rnd(wy + i, step))));
      const x0 = Math.round(MOON_P.x - hw + rnd(wy * 5 + i, step + 3) * hw * 2 - len / 2);
      for (let j = 0; j < len; j++) put(x0 + j, wy, p < .35 ? MR1 : MR2);
    }
  }
  // 远处的船
  const SHIP = u32('#05060d'), WIN = u32('#dfe8ff');
  ([0, 1] as const).forEach(w => {
    const sx = shipX(t, w); if (sx < -20 || sx > PW + 20) return;
    const L = w ? 24 : 9;
    for (let x = 0; x < L; x++) { put(sx + x, HZ, SHIP); if (x > 0 && x < L - 1) put(sx + x, HZ - 1, SHIP); if (w && x > 1 && x < L - 2) put(sx + x, HZ - 2, SHIP); }
    if (w) {
      for (let x = 5; x < 17; x++) { put(sx + x, HZ - 3, SHIP); put(sx + x, HZ - 4, SHIP); }
      for (let x = 8; x < 14; x++) put(sx + x, HZ - 5, SHIP);
      for (let y = 6; y < 11; y++) put(sx + 10, HZ - y, SHIP);
      for (let x = 6; x < 16; x += 2) put(sx + x, HZ - 3, WIN);
      for (let x = 3; x < 21; x += 3) put(sx + x, HZ - 1, WIN);
      put(sx + 10, HZ - 11, WIN);
    } else { for (let x = 0; x < 4; x++) put(sx + 3 + x, HZ - 2, SHIP); put(sx + 4, HZ - 2, WIN); }
    // 倒影
    for (let y = 2; y < 8; y += 2) if (rnd(y + w * 9, step) > .35) put(sx + 4 + Math.round(rnd(y, step) * 2), HZ + y, MR2);
  });
  // 提灯在海上的倒影
  const lp = lanternPos(t), lo = Math.min(1, lanternOn(t));
  for (let wy = 210; wy < WORLD_H; wy += 2) {
    const p = (wy - 210) / 60; if (rnd(wy, step + 41) > .62 * lo * (1 - p)) continue;
    const len = 1 + Math.round(rnd(wy, step + 5) * (2 + p * 6)), x0 = Math.round(lp.x + 1 + (rnd(wy, step + 8) - .5) * (4 + p * 16));
    for (let j = 0; j < len; j++) put(x0 + j, wy, p < .3 ? LG1 : LG2);
  }
  // 孤岛：一块礁石（月光从右上、灯光从近处）
  const ROCK = ['#0f1326', '#151a31', '#1d2340', '#2a3256', '#3a4470'].map(u32), WARM = ['#2a2230', '#3e3028', '#5a4430'].map(u32);
  for (let r = 0; r < 12; r++) {
    const wy = ISLE.top + r;
    const hw = Math.round(15 + r * 1.7 + (r < 2 ? -3 + r * 1.5 : 0) + (rnd(r, 7) - .5) * 2);
    for (let x = ISLE.x - hw; x <= ISLE.x + hw; x++) {
      const u = (x - ISLE.x) / hw;
      let v = (r === 0 ? 3.2 : r === 1 ? 2.6 : 1.2 - r * .06) + u * 1.1 + (vnoise(x * .4, wy * .5) - .5) * 1.4;
      if (u > .86) v += 1.2;
      let c = dpick(ROCK, v, x, wy);
      const dl = Math.hypot(x - lp.x - 1.5, wy - lp.y - 3);
      const wl = lo * (1 - dl / 20) * (r < 3 ? 1.1 : .6);
      if (wl > bayer(x, wy) * .7 + .2) c = dpick(WARM, wl * 2.4, x, wy);
      put(x, wy, c);
    }
  }
  // 礁石的水线：浪花一明一暗
  const FOAM = u32('#6a76b4'), FOAM2 = u32('#3e4880');
  for (let x = ISLE.x - 38; x <= ISLE.x + 38; x++) {
    const a = rnd(x, step); if (a > .55) continue;
    put(x, ISLE.top + 12, a < .25 ? FOAM : FOAM2);
    if (a < .12) put(x + (x % 2 ? 1 : -1) * 2, ISLE.top + 13 + Math.floor(rnd(x, step + 1) * 2), FOAM2);
  }

  g.putImageData(IMG, 0, 0);

  // —— 精灵（fillRect，整像素） ——
  g.save(); g.translate(0, -cy);
  // 求救旗：越等越破（洞随天数变多）
  const tat = .12 + .55 * rollP(t);
  const FX = ISLE.x - 12, FT = ISLE.top - 27;   // 旗子向左飘（和围巾同一个风向）
  g.fillStyle = '#2a2018'; g.fillRect(FX, FT, 1, 28); g.fillStyle = '#4a3a28'; g.fillRect(FX, FT, 1, 1);
  const ff = Math.floor(t * 5) % 3;
  for (let fy = 0; fy < 7; fy++) for (let fx = 0; fx < 11; fx++) {
    if (rnd(fx * 7 + fy, 77) < tat * (fx / 11) * 1.4) continue;
    if (fx > 7 && (fy === 0 || fy === 6)) continue;
    const wv = ff === 0 ? (fx > 6 ? 1 : 0) : ff === 1 ? (fx > 3 && fx < 8 ? 1 : 0) : (fx > 8 ? -1 : 0);
    g.fillStyle = fy === 0 ? '#c9cee0' : fy > 4 || bayer(fx, fy) > .75 ? '#8a90aa' : '#aeb3c8';
    g.fillRect(FX - 1 - fx, FT + 1 + fy + wv, 1, 1);
  }
  // 小人
  const ps = pose(t), rimA = clamp(.18 + .2 * lo, 0, .45);
  const spr = ps === 'stand' ? standSprite(t) : sitSprite(t, ps === 'raise');
  const bob = ps === 'stand' && t < T('stand') + .12 ? -1 : 0;   // 站起来那一下
  drawSprite(g, spr, CHAR.x, CHAR.y + bob, { col: '#f6d58a', a: rimA, dir: 1 });
  drawLantern(g, lp.x, lp.y, Math.min(1, lanternOn(t)));
  if (ps === 'raise') { g.fillStyle = '#3a2a18'; g.fillRect(lp.x + 1, lp.y + 7, 1, 1); }
  // 漂来的木板
  const pk = plank(t);
  if (pk.on) {
    g.fillStyle = '#6a4428'; g.fillRect(pk.x, pk.y, 10, 2);
    g.fillStyle = '#9a6a3e'; g.fillRect(pk.x + 1, pk.y, 7, 1);
    g.fillStyle = '#3e5090'; if (Math.floor(t * 4) % 2) g.fillRect(pk.x - 1, pk.y + 2, 3, 1); else g.fillRect(pk.x + 8, pk.y + 2, 3, 1);
  }
  // 信号冲击波：每一次挥灯，一圈金色像素环
  for (const f of FLASH) {
    const a = t - f; if (a < 0 || a > .7) continue;
    ring(g, lp.x + 2, lp.y + 3, 4 + a * 70, C.gold, 1 - a / .7);
    if (a > .1) ring(g, lp.x + 2, lp.y + 3, 2 + (a - .1) * 50, '#b8892c', (1 - a / .7) * .6);
  }
  // 片名砸下：天空里一圈冲击波
  const sa = t - T('slam');
  if (sa >= 0 && sa < .8) { ring(g, TITLE_W.x, TITLE_W.y, 44 + sa * 300, C.goldHot, 1 - sa / .8); ring(g, TITLE_W.x, TITLE_W.y, 40 + sa * 200, C.gold, (1 - sa / .8) * .7); }
  g.restore();

  // —— 圆形遮罩（iris） ——
  if (R < 560) {
    g.fillStyle = C.bg;
    for (let y = 0; y < PH; y++) {
      const dy = y - icy, hw = R * R - dy * dy;
      if (hw <= 0) { g.fillRect(0, y, PW, 1); continue; }
      const w = Math.round(Math.sqrt(hw));
      g.fillRect(0, y, Math.max(0, icx - w), 1); g.fillRect(icx + w, y, PW, 1);
    }
  }
};

const drawLight = (g: CanvasRenderingContext2D, t: number) => {
  const R = irisR(t); if (R <= 0) return;
  const cy = camY(t), S = (wx: number, wy: number): [number, number] => [wx * PX + 2, (wy - cy) * PX + 2];
  g.save();
  if (R < 560) { const [cx, ccy] = S(CHAR.x + 6, CHAR.y - 10); g.beginPath(); g.arc(cx, ccy, R * PX, 0, Math.PI * 2); g.clip(); }
  g.globalCompositeOperation = 'lighter';
  // 月光
  const [mx, my] = S(MOON_P.x, MOON_P.y);
  glow(g, mx, my, 520, MOON, .12); glow(g, mx, my, 150, MOON, .2);
  // 月光倒影一条柔光
  const [, hzY] = S(0, HZ);
  g.save(); g.translate(mx, hzY); g.scale(.18, 1); glow(g, 0, 220, 300, MOON, .1); g.restore();
  // 船灯（冷）
  ([0, 1] as const).forEach(w => {
    const sx = shipX(t, w); if (sx < -30 || sx > PW + 30) return;
    const [x, y] = S(sx + (w ? 11 : 4), HZ - 2);
    glow(g, x, y, w ? 160 : 50, COLD, w ? .3 : .22); glow(g, x, y, 14, COLD_HOT, .8);
    if (w) { const [x2, y2] = S(sx + 10, HZ - 11); glow(g, x2, y2, 22, COLD_HOT, .6); }
    g.save(); g.translate(x, y); g.scale(.12, 1); glow(g, 0, 70, 70, COLD, w ? .18 : .1); g.restore();
  });
  // 提灯（暖）—— 画面里唯一的暖色
  const lp = lanternPos(t), L = lanternOn(t), fl = flashAt(t);
  const [lx, ly] = S(lp.x + 2, lp.y + 3.5);
  glow(g, lx, ly, 420, GOLD, .18 * L); glow(g, lx, ly, 120, GOLD, .42 * L); glow(g, lx, ly, 26, GOLD_HOT, .9 * Math.min(1, L));
  if (fl > .01) { glow(g, lx, ly, 1100, GOLD, .22 * fl); glow(g, lx, ly, 260, GOLD_HOT, .35 * fl); }
  // 灯在海面上的暖光
  const [, sy] = S(0, 214);
  g.save(); g.translate(lx, sy); g.scale(1, .22); glow(g, 0, 0, 260, GOLD, .16 * Math.min(1, L)); g.restore();
  // 亮星的小光晕
  STARS.forEach(s => { if (s.b < .82 || s.y >= HZ - 6) return; const [x, y] = S(s.x, s.y); glow(g, x, y, 12, '200,210,255', .25 * (.6 + .4 * Math.sin(t * 1.3 + s.tw))); });
  // 片名砸下的闪光
  const sa = t - T('slam');
  if (sa >= 0 && sa < 1.2) { const [tx, ty] = S(TITLE_W.x, TITLE_W.y); glow(g, tx, ty, 900, GOLD, .32 * Math.exp(-sa / .25)); }
  g.restore();
};

export const World: React.FC = () => (
  <>
    <Canvas2D scale={.2} style={{ imageRendering: 'pixelated' }} draw={(g, t) => drawPixels(g, t)} />
    <Canvas2D draw={(g, t) => drawLight(g, t)} />
  </>
);
