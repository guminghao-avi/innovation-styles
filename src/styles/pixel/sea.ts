// 自渡风 · 夜海像素引擎：天 / 海 / 月 / 日 / 云 / 星 / 浪 / 倒影 + 礁石、木筏、旗、雨、iris 遮罩，以及全分辨率光层的帮手。
// 世界坐标：宽随镜头横移，高 WORLD_H=270，海平线 HZ=172；画布 = 1920/px × 1080/px（px=5 远景、6 中景、8 近景、12 特写）。
// 一帧的写法见 references/风格_自渡风.md「一帧怎么画」。
import { clamp, lerp } from '@kit';
import { C, GOLD, GOLD_HOT, COLD, COLD_HOT, MOON, u32, dpick, vnoise, glow, rnd, bayer, mixHex, ring } from './palette';
export const HZ = 172, WORLD_H = 270;
type Ctx = CanvasRenderingContext2D;

// ---------- 天气（调色板） ----------
export type Mood = { sky: number[]; sea: number[]; cloud: number[]; wave: [number, number]; refl: [number, number] };
const P = (a: string[]) => a.map(u32);
export const NIGHT: Mood = {
  sky: P(['#080a15', '#0b0e1e', '#0f1328', '#131832', '#171d3c', '#1c2346', '#232b54', '#2b3462', '#353f74']),
  sea: P(['#20284c', '#1b2244', '#161c3a', '#121731', '#0e1228', '#0b0e20', '#090b19']),
  cloud: P(['#151a33', '#1b2242', '#232b52', '#2e386a', '#3c4882']),
  wave: [u32('#2c3564'), u32('#39437a')], refl: [u32('#aeb8f2'), u32('#7c88d6')],
};
export const STORM: Mood = {
  sky: P(['#07070c', '#0a0a12', '#0e0e18', '#12121e', '#161624', '#1b1a2a', '#211f32', '#28253a', '#302c44']),
  sea: P(['#1a1a2a', '#161624', '#12121e', '#0f0f19', '#0c0c14', '#0a0a10', '#08080d']),
  cloud: P(['#121220', '#18182a', '#1f1e34', '#28263f', '#33304c']),
  wave: [u32('#2a2a40'), u32('#3c3a58')], refl: [u32('#8a88a8'), u32('#5e5c7c')],
};
export const DAWN: Mood = {
  sky: P(['#1a1c3c', '#262650', '#3a3062', '#55386c', '#7a4470', '#a8566c', '#d0705e', '#ea9256', '#f6b866']),
  sea: P(['#5a3e62', '#4a3458', '#3a2c4e', '#2e2644', '#24203a', '#1c1a30', '#161528']),
  cloud: P(['#3a2c52', '#5a3a62', '#8a4c66', '#c0685e', '#f0a060']),
  wave: [u32('#6a4a6e'), u32('#8a5e7a')], refl: [u32('#ffd890'), u32('#f0a060')],
};

export type Frame = {
  t: number; px: number; camX: number; camY: number;
  mood: Mood; mood2?: Mood; mix?: number;             // mix：按 Bayer 抖动从 mood 渐变到 mood2
  moon?: { x: number; y: number; r: number };         // x = 屏幕像素（天体在无穷远，不跟镜头横移），y = 世界
  sun?: { x: number; y: number; r: number };
  clouds?: number;                                    // 额外的云量（0 = 两条云带，1 = 满天）
  cloudSpeed?: number;
  stars?: number;
  chop?: number;                                      // 浪的大小（暴雨 1）
  waveSpeed?: number;
  flash?: number;                                     // 闪电
  iris?: { x: number; y: number; r: number };         // 世界坐标；r < 0 不画
};
export const dims = (px: number) => ({ PW: Math.round(1920 / px), PH: Math.round(1080 / px) });
const STARS = Array.from({ length: 90 }, (_, i) => ({ x: rnd(i, 1), y: Math.floor(rnd(i, 2) * 160), b: rnd(i, 3), tw: rnd(i, 4) * 6 }));

export type Px = { f: Frame; buf: Uint32Array; PW: number; PH: number; put: (wx: number, wy: number, c: number) => void; step: number };
const IMGS = new Map<string, ImageData>();

/** 开始一帧：背景（天、海、浪、倒影）写进缓冲。返回 Px，调用方可以继续 put，最后 flush */
export const begin = (g: Ctx, f: Frame): Px => {
  g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
  const { PW, PH } = dims(f.px), key = PW + 'x' + PH;
  let img = IMGS.get(key); if (!img) { img = g.createImageData(PW, PH); IMGS.set(key, img); }
  const buf = new Uint32Array(img.data.buffer);
  const { t, camX, camY } = f, step = Math.floor(t * 8);
  const put = (wx: number, wy: number, c: number) => { const x = Math.round(wx - camX), y = Math.round(wy - camY); if (x >= 0 && x < PW && y >= 0 && y < PH) buf[y * PW + x] = c; };
  const px: Px = { f, buf, PW, PH, put, step };
  (px as any).img = img;
  const mix = f.mix ?? 0, M2 = f.mood2;
  const pick = (x: number, y: number) => (M2 && mix > 0 && bayer(x + 2, y + 1) < mix ? M2 : f.mood);
  const cs = (f.cloudSpeed ?? .5) * t, camC = camX * .3, fl = f.flash ?? 0, cl = f.clouds ?? 0;

  for (let y = 0; y < PH; y++) {
    const wy = y + camY, row = y * PW;
    if (wy < HZ) {
      const base = Math.pow(Math.max(0, wy) / HZ, 1.5) * 5 + fl * 3;
      const cband = Math.max(Math.exp(-(((wy - 104) / 13) ** 2)) * .9 + Math.exp(-(((wy - 54) / 8) ** 2)) * .6, cl * (.7 + .3 * (1 - wy / HZ)));
      for (let x = 0; x < PW; x++) {
        const Md = pick(x, wy);
        let c = 0, done = false, halo = 0;
        if (f.moon) {
          const dx = x - f.moon.x, dy = wy - f.moon.y, d = Math.sqrt(dx * dx + dy * dy), r = f.moon.r;
          if (d < r && cl < .6) {
            const l = (-dx * .5 + dy * .6) / r;
            const cr = vnoise(dx * .35 + 7, dy * .35 + 3) > .72 || Math.hypot(dx + r * .33, dy - r * .27) < r * .27 || Math.hypot(dx - r * .4, dy + r * .4) < r * .17;
            c = u32(cr ? '#8d97da' : l > .55 ? '#7480cc' : l > .1 && bayer(x, wy) < (l - .1) * 2.2 ? '#9fa9e6' : '#c3cbf4');
            if (d > r - 1.2 && l > .2) c = u32('#7480cc');
            done = true;
          } else halo += 2.6 * Math.exp(-(d - r) / 26) * (1 - cl);
        }
        if (f.sun) {
          const dx = x - f.sun.x, dy = wy - f.sun.y, d = Math.sqrt(dx * dx + dy * dy), r = f.sun.r;
          if (d < r) { c = u32(d > r - 1.5 ? '#ffd27a' : '#fff1c8'); done = true; }
          else halo += 3.2 * Math.exp(-(d - r) / 34);
        }
        if (!done) {
          c = dpick(Md.sky, base + halo, x, wy);
          if (cband > .05) {
            const n = vnoise(x * .028 + cs + camC * .028, wy * .12) * .62 + vnoise(x * .08 + cs * 1.7 + camC * .08, wy * .3) * .38;
            const dens = n * cband - .38 + cl * .25;
            if (dens > (bayer(x, wy) - .5) * .12) c = dpick(Md.cloud, dens * 9 + halo * 1.2 + fl * 2.5, x, wy);
          }
        }
        buf[row + x] = c;
      }
    } else if (wy === HZ) {
      for (let x = 0; x < PW; x++) {
        const Md = pick(x, wy);
        const near = (f.moon ? Math.exp(-Math.abs(x - f.moon.x) / 50) : 0) + (f.sun ? 2 * Math.exp(-Math.abs(x - f.sun.x) / 70) : 0);
        buf[row + x] = dpick(Md.sky, 6.2 + 1.2 * near + fl * 2, x, wy);
      }
    } else {
      const p = (wy - HZ) / (WORLD_H - HZ);
      for (let x = 0; x < PW; x++) buf[row + x] = dpick(pick(x, wy).sea, Math.pow(p, .8) * 6 - fl * 1.5, x, wy);
    }
  }
  // 星星
  const sa = f.stars ?? 1;
  if (sa > 0) for (const s of STARS) {
    const sx = Math.floor(s.x * PW), y = s.y - camY; if (y < 0 || y >= PH || s.y >= HZ - 6) continue;
    if (f.moon && Math.hypot(sx - f.moon.x, s.y - f.moon.y) < 40) continue;
    const lv = s.b * (.55 + .45 * Math.sin(t * 1.3 + s.tw)) * sa;
    if (lv < .25) continue;
    buf[y * PW + sx] = u32(lv > .75 ? '#dfe5ff' : lv > .5 ? '#9aa6e0' : '#5c679e');
  }
  // 浪花：横向短线，按世界坐标滚动
  const chop = f.chop ?? 0, wsp = f.waveSpeed ?? 1;
  for (let wy = HZ + 1; wy < WORLD_H; wy++) {
    const y = wy - camY; if (y < 0 || y >= PH) continue;
    const p = (wy - HZ) / (WORLD_H - HZ);
    if ((wy + Math.floor(p * 3)) % 2 && chop < .5) continue;
    const n = Math.round((5 + 9 * (1 - p)) * (1 + chop * 1.2) * PW / 384);
    for (let i = 0; i < n; i++) {
      const len = Math.max(1, Math.round((1 + 7 * p) * (.4 + rnd(wy * 13 + i, 5)) * (1 + chop * .8))), sp = (2 + 5 * p) * (rnd(i, wy) > .5 ? 1 : -.6) * (1 + chop * 2);
      const span = PW + 220;
      const x0 = Math.round((((rnd(wy * 7 + i, 6) * span + t * sp * wsp - camX) % span) + span) % span) - 60;
      if (rnd(wy * 31 + i, Math.floor(t * (1.5 + chop * 3) + rnd(i, 9) * 9)) < .25) continue;
      const Md = pick(x0, wy);
      for (let j = 0; j < len; j++) { const xx = x0 + j; if (xx >= 0 && xx < PW) buf[y * PW + xx] = j === 0 && len > 3 ? Md.wave[1] : Md.wave[0]; }
    }
    // 月光 / 日光倒影：天体正下方一列碎光（屏幕坐标）
    for (const b of [f.moon, f.sun]) {
      if (!b) continue;
      const hw = (b === f.sun ? 3 : 1.5) + p * (b === f.sun ? 22 : 15);
      for (let i = 0; i < (b === f.sun ? 6 : 4); i++) {
        if (rnd(wy * 3 + i, step + i * 17) > .5 - p * .2 - cl * .3) continue;
        const len = Math.max(1, Math.round(hw * (.3 + .7 * rnd(wy + i, step))));
        const x0 = Math.round(b.x - hw + rnd(wy * 5 + i, step + 3) * hw * 2 - len / 2), Md = pick(x0, wy);
        for (let j = 0; j < len; j++) { const xx = x0 + j; if (xx >= 0 && xx < PW) buf[y * PW + xx] = p < .35 ? Md.refl[0] : Md.refl[1]; }
      }
    }
  }
  return px;
};
/** 背景写完，贴到画布上；之后用 fillRect 画精灵（世界坐标，已平移） */
export const flush = (g: Ctx, P: Px) => { g.putImageData((P as any).img, 0, 0); g.save(); g.translate(-P.f.camX, -P.f.camY); };
/** 收尾：圆形遮罩（iris） */
export const finish = (g: Ctx, P: Px) => {
  g.restore();
  const ir = P.f.iris; if (!ir || ir.r >= 600) return;
  const cx = ir.x - P.f.camX, cy = ir.y - P.f.camY, R = Math.max(0, ir.r);
  g.fillStyle = C.bg;
  for (let y = 0; y < P.PH; y++) {
    const dy = y - cy, hw = R * R - dy * dy;
    if (hw <= 0) { g.fillRect(0, y, P.PW, 1); continue; }
    const w = Math.round(Math.sqrt(hw));
    g.fillRect(0, y, Math.max(0, cx - w), 1); g.fillRect(cx + w, y, P.PW, 1);
  }
};

// ---------- 世界里的东西（缓冲阶段：用 put） ----------
/** 礁石：x 中心，top 顶边，s 大小（1 = 主角那座），lantern 灯的位置和亮度（暖光照在石头上） */
export const rock = (P: Px, x: number, top: number, s = 1, lamp?: { x: number; y: number; a: number }, seed = 0, warm = false) => {
  const ROCK = (warm ? ['#1c1424', '#2a1c30', '#3e2840', '#5a3a4c', '#7a4e5a'] : ['#0f1326', '#151a31', '#1d2340', '#2a3256', '#3a4470']).map(u32);
  const WARM = ['#2a2230', '#3e3028', '#5a4430'].map(u32);
  const rows = Math.max(3, Math.round(12 * s));
  for (let r = 0; r < rows; r++) {
    const wy = top + r;
    const hw = Math.round((15 + r * 1.7 + (r < 2 ? -3 + r * 1.5 : 0)) * s + (rnd(r, 7 + seed) - .5) * 2 * s);
    for (let xx = x - hw; xx <= x + hw; xx++) {
      const u = (xx - x) / Math.max(1, hw);
      let v = (r === 0 ? 3.2 : r === 1 ? 2.6 : 1.2 - r * .06) + u * 1.1 + (vnoise(xx * .4 + seed, wy * .5) - .5) * 1.4;
      if (u > .86) v += 1.2;
      let c = dpick(ROCK, v, xx, wy);
      if (lamp && lamp.a > 0) {
        const wl = lamp.a * (1 - Math.hypot(xx - lamp.x - 1.5, wy - lamp.y - 3) / 20) * (r < 3 ? 1.1 : .6);
        if (wl > bayer(xx, wy) * .7 + .2) c = dpick(WARM, wl * 2.4, xx, wy);
      }
      P.put(xx, wy, c);
    }
  }
  // 水线浪花
  const w = Math.round(38 * s);
  for (let xx = x - w; xx <= x + w; xx++) {
    const a = rnd(xx, P.step + seed); if (a > .55) continue;
    P.put(xx, top + rows, u32(a < .25 ? '#6a76b4' : '#3e4880'));
  }
};
/** 灯在海面上的碎金倒影 */
export const lampRefl = (P: Px, x: number, from: number, a: number, w = 1) => {
  const LG1 = u32('#e0ac3e'), LG2 = u32('#8a6424');
  for (let wy = from; wy < WORLD_H; wy += 2) {
    const p = (wy - from) / 60; if (p > 1 || rnd(wy + x, P.step + 41) > .62 * a * (1 - p)) continue;
    const len = 1 + Math.round(rnd(wy, P.step + 5) * (2 + p * 6) * w), x0 = Math.round(x + (rnd(wy, P.step + 8) - .5) * (4 + p * 16) * w);
    for (let j = 0; j < len; j++) P.put(x0 + j, wy, p < .3 ? LG1 : LG2);
  }
};

// ---------- 精灵阶段（fillRect，世界坐标） ----------
/** 求救旗（向左飘），tat = 破的程度 */
export const flag = (g: Ctx, x: number, top: number, t: number, tat: number) => {
  g.fillStyle = '#2a2018'; g.fillRect(x, top, 1, 28);
  const ff = Math.floor(t * 5) % 3;
  for (let fy = 0; fy < 7; fy++) for (let fx = 0; fx < 11; fx++) {
    if (rnd(fx * 7 + fy, 77) < tat * (fx / 11) * 1.4) continue;
    if (fx > 7 && (fy === 0 || fy === 6)) continue;
    const wv = ff === 0 ? (fx > 6 ? 1 : 0) : ff === 1 ? (fx > 3 && fx < 8 ? 1 : 0) : (fx > 8 ? -1 : 0);
    g.fillStyle = fy === 0 ? '#c9cee0' : fy > 4 || bayer(fx, fy) > .75 ? '#8a90aa' : '#aeb3c8';
    g.fillRect(x - 1 - fx, top + 1 + fy + wv, 1, 1);
  }
};
/** 一块木板（横放 10×2） */
export const plankAt = (g: Ctx, x: number, y: number, a = 1) => {
  if (a <= 0) return;
  g.globalAlpha = a;
  g.fillStyle = '#6a4428'; g.fillRect(Math.round(x), Math.round(y), 10, 2);
  g.fillStyle = '#9a6a3e'; g.fillRect(Math.round(x) + 1, Math.round(y), 7, 1);
  g.globalAlpha = 1;
};
/** 礁石上的木板堆 */
export const pile = (g: Ctx, x: number, y: number, n: number) => {
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 2), off = (i % 2) * 5 + (row % 2) * 2;
    g.fillStyle = i % 3 === 0 ? '#5a3a22' : '#6a4428'; g.fillRect(x + off, y - row * 2 - 1, 6, 2);
    g.fillStyle = '#9a6a3e'; g.fillRect(x + off + 1, y - row * 2 - 1, 4, 1);
  }
};
/** 木筏：24 宽，12 根竖板。n = 已经拼上的板数；lv = 1/2；brk = 散架进度（0..1） */
export const raft = (g: Ctx, x: number, y: number, t: number, o: { n?: number; lv?: number; brk?: number; tilt?: number } = {}) => {
  const n = o.n ?? 12, lv = o.lv ?? 1, brk = o.brk ?? 0, tilt = o.tilt ?? 0;
  for (let i = 0; i < n; i++) {
    const dx = brk * (i - 5.5) * (2.2 + rnd(i, 3) * 2), dy = brk * (2 + rnd(i, 4) * 5) + Math.round(tilt * (i - 6) / 6);
    const sx = Math.round(x + i * 2 + dx), sy = Math.round(y + dy);
    g.fillStyle = '#9a6a3e'; g.fillRect(sx, sy, 2, 1);
    g.fillStyle = i % 2 ? '#6a4428' : '#5e3c24'; g.fillRect(sx, sy + 1, 2, 2);
    if (brk === 0 && i > 0 && i % 4 === 0) { g.fillStyle = '#3a2618'; g.fillRect(sx, sy + 1, 1, 2); }
  }
  if (lv >= 2 && brk === 0) {
    g.fillStyle = '#4a3020'; g.fillRect(Math.round(x) - 1, Math.round(y) + 1, 26, 1);           // 横梁
    g.fillStyle = '#c9cee0'; for (let i = 1; i < 12; i += 3) g.fillRect(Math.round(x) + i * 2, Math.round(y) + 1, 1, 1);   // 钉子
    g.fillStyle = '#7a5232'; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 1, 2); g.fillRect(Math.round(x) + 24, Math.round(y) - 1, 1, 2);
  }
  // 木筏边上的水花
  if (brk < .5) { g.fillStyle = '#5a66a0'; const f = Math.floor(t * 6) % 3; g.fillRect(Math.round(x) - 2 + f, Math.round(y) + 3, 3, 1); g.fillRect(Math.round(x) + 23 - f, Math.round(y) + 3, 3, 1); }
};
/** 桨：从手到水里的一根线 + 桨叶。ph = 划桨相位 */
export const oar = (g: Ctx, hx: number, hy: number, ph: number, waterY: number) => {
  const a = -.9 + Math.sin(ph * Math.PI * 2) * .45;   // 桨杆角度（向后下方）
  const L = 16, ex = hx - Math.cos(a) * L * .55, ey = Math.min(waterY + 3, hy + Math.sin(-a) * L);
  line(g, hx, hy, ex, ey, '#7a5232');
  g.fillStyle = '#9a6a3e'; g.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 2, 3);
  if (ey >= waterY - 1) { g.fillStyle = '#8a96d0'; g.fillRect(Math.round(ex) - 3, waterY, 2, 1); g.fillRect(Math.round(ex) + 2, waterY, 2, 1); }
};
/** Bresenham 直线 */
export const line = (g: Ctx, x0: number, y0: number, x1: number, y1: number, col: string, dash = 0) => {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, i = 0; g.fillStyle = col;
  for (;;) {
    if (!dash || (i % dash) < dash / 2) g.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } i++;
  }
};
/** 雨：1×3 的斜像素线（屏幕坐标里铺满） */
export const rain = (g: Ctx, P: Px, amt: number) => {
  if (amt <= 0) return;
  const { t, camX, camY } = P.f, n = Math.round(260 * amt * P.PW / 384);
  for (let i = 0; i < n; i++) {
    const sp = 150 + rnd(i, 2) * 90, x0 = rnd(i, 1) * (P.PW + 60), y0 = (rnd(i, 3) * (P.PH + 40) + t * sp) % (P.PH + 40) - 20;
    const x = Math.round(x0 - (y0 * .35)) + camX, y = Math.round(y0) + camY;
    g.fillStyle = rnd(i, 4) > .7 ? '#8a96c8' : '#4e5880';
    g.fillRect(x, y, 1, 1); g.fillRect(x - 1, y + 1, 1, 1); g.fillRect(x - 1, y + 2, 1, 1);
    if (y > HZ + 4 && rnd(i, Math.floor(t * 8)) > .9) { g.fillStyle = '#6a76a8'; g.fillRect(x - 2, y + 3, 1, 1); g.fillRect(x, y + 3, 1, 1); }
  }
};
/** 一串气泡 / 水花 */
export const splash = (g: Ctx, x: number, y: number, a: number, size = 1, col = '#a8b4e8') => {
  if (a < 0 || a > 1) return;
  g.fillStyle = col;
  for (let i = 0; i < Math.round(10 * size); i++) {
    const ang = Math.PI * (1.1 + .8 * rnd(i, 1)), v = (12 + 16 * rnd(i, 2)) * size;
    const px = x + Math.cos(ang) * v * a, py = y + Math.sin(ang) * v * a + 40 * a * a;
    if (py <= y + 1) g.fillRect(Math.round(px), Math.round(py), 1, 1);
  }
};
export const bubbles = (g: Ctx, x: number, y: number, a: number) => {
  if (a < 0 || a > 1.4) return;
  g.fillStyle = '#7c88c8';
  for (let i = 0; i < 4; i++) { const b = a - i * .18; if (b < 0 || b > 1) continue; g.fillRect(Math.round(x + Math.sin(b * 9 + i) * 1.5), Math.round(y - b * 10), 1, 1); }
};

// ---------- 光层（全分辨率，lighter） ----------
export const lightBegin = (g: Ctx, f: Frame) => {
  const S = (wx: number, wy: number): [number, number] => [(wx - f.camX) * f.px + f.px / 2, (wy - f.camY) * f.px + f.px / 2];
  g.save();
  if (f.iris && f.iris.r < 600) { const [cx, cy] = S(f.iris.x, f.iris.y); g.beginPath(); g.arc(cx, cy, Math.max(0, f.iris.r) * f.px, 0, Math.PI * 2); g.clip(); }
  g.globalCompositeOperation = 'lighter';
  if (f.moon) { const x = f.moon.x * f.px, y = (f.moon.y - f.camY) * f.px, a = 1 - (f.clouds ?? 0); glow(g, x, y, 520, MOON, .12 * a); glow(g, x, y, 150, MOON, .2 * a); const hy = (HZ - f.camY) * f.px; g.save(); g.translate(x, hy); g.scale(.18, 1); glow(g, 0, 220, 300, MOON, .1 * a); g.restore(); }
  if (f.sun) { const x = f.sun.x * f.px, y = (f.sun.y - f.camY) * f.px; glow(g, x, y, 900, '255,170,90', .28); glow(g, x, y, 260, '255,214,150', .4); const hy = (HZ - f.camY) * f.px; g.save(); g.translate(x, hy); g.scale(.3, 1); glow(g, 0, 300, 420, '255,170,90', .16); g.restore(); }
  if (f.flash) { g.fillStyle = `rgba(190,200,255,${.35 * f.flash})`; g.fillRect(0, 0, 1920, 1080); }
  return S;
};
export const lightEnd = (g: Ctx) => g.restore();
/** 提灯的光（S = 世界 → 屏幕），L = 亮度，fl = 挥灯闪光 */
export const lampLight = (g: Ctx, S: (x: number, y: number) => [number, number], x: number, y: number, L: number, fl = 0, waterY?: number, s = 1) => {
  const [lx, ly] = S(x + 2, y + 3.5);
  glow(g, lx, ly, 420 * s, GOLD, .18 * L); glow(g, lx, ly, 120 * s, GOLD, .42 * L); glow(g, lx, ly, 26 * s, GOLD_HOT, .9 * Math.min(1, L));
  if (fl > .01) { glow(g, lx, ly, 1100, GOLD, .22 * fl); glow(g, lx, ly, 260, GOLD_HOT, .35 * fl); }
  if (waterY != null) { const [, sy] = S(0, waterY); g.save(); g.translate(lx, sy); g.scale(1, .22); glow(g, 0, 0, 260 * s, GOLD, .16 * Math.min(1, L)); g.restore(); }
};
export const lampFlicker = (t: number, seed = 0) => .86 + .14 * (rnd(Math.floor(t * 8), 3 + seed) * .6 + .4 * Math.sin(t * 9 + seed));
export { GOLD, GOLD_HOT, COLD, COLD_HOT, glow, mixHex, ring, clamp, lerp, rnd, u32, bayer };
