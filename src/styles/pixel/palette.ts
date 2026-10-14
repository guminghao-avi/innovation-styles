// 自渡风（暗夜像素）· 调色板与像素工具：颜色语义、Bayer 抖动、调色板取色、值噪声、软光、像素圆环
// 用法：import { C, GOLD, u32, bayer, dpick, vnoise, glow, ring, mixHex } from '@styles/pixel/palette';
import { clamp, lerp, rnd } from '@kit';
type Ctx = CanvasRenderingContext2D;

// 颜色语义：暖金 = 自己的光 / 提灯；冷白蓝 = 等待、别人的船灯；红 = 拒绝；
export const C = {
  bg: '#07080f', ui: '#6b7398', text: '#e6e9f2', gold: '#f2c14e', goldHot: '#fff0b8', goldDim: '#8a6d2a',
  red: '#e8344a', redHot: '#ff5a6e', cold: '#9fb4ff', gray: '#3a4060',
};
export const GOLD = '255,196,96', GOLD_HOT = '255,236,190', COLD = '150,175,255', COLD_HOT = '225,235,255', MOON = '120,140,255';

export const hex2rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mixHex = (a: string, b: string, t: number) => {
  const A = hex2rgb(a), B = hex2rgb(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(t))).toString(16).padStart(2, '0')).join('');
};
/** ABGR（小端 Uint32，ImageData 用） */
export const u32 = (h: string) => { const [r, g, b] = hex2rgb(h); return (255 << 24 | b << 16 | g << 8 | r) >>> 0; };

/** 4×4 Bayer 有序抖动阈值（0..1） */
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + .5) / 16);
export const bayer = (x: number, y: number) => B4[(y & 3) * 4 + (x & 3)];
/** 在调色板上取连续值 v（0..n-1），用 Bayer 抖动在相邻两色间切换 */
export const dpick = (pal: number[], v: number, x: number, y: number) => {
  const n = pal.length - 1; v = clamp(v, 0, n);
  const i = Math.floor(v), f = v - i;
  return pal[Math.min(n, f > bayer(x, y) ? i + 1 : i)];
};

/** 值噪声（确定性） */
const h2 = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export const vnoise = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return lerp(lerp(h2(xi, yi), h2(xi + 1, yi), u), lerp(h2(xi, yi + 1), h2(xi + 1, yi + 1), u), v);
};

/** 光晕（lighter 模式里调用；全分辨率坐标） */
export const glow = (g: Ctx, x: number, y: number, r: number, col: string, a: number) => {
  if (a <= .002 || r <= .5) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(.2, `rgba(${col},${a * .32})`); gr.addColorStop(.5, `rgba(${col},${a * .08})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
};

/** Bresenham 圆环（像素冲击波）；dens<1 时按 Bayer 漏掉一些点 = 抖动出来的淡出 */
export const ring = (g: Ctx, cx: number, cy: number, r: number, col: string, dens = 1) => {
  if (r < 1 || dens <= 0) return;
  g.fillStyle = col;
  let x = Math.round(r), y = 0, err = 1 - x;
  const put = (px: number, py: number) => { if (bayer(px, py) < dens) g.fillRect(px, py, 1, 1); };
  while (x >= y) {
    for (const [a, b] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) put(Math.round(cx + a), Math.round(cy + b));
    y++; if (err < 0) err += 2 * y + 1; else { x--; err += 2 * (y - x) + 1; }
  }
};
export { rnd, clamp, lerp };
