// 等轴 2.5D（Isometric）—— 说明见 references/风格_06_等轴2.5D.md
// 没有透视的等轴俯视（正交投影，x/z 轴各偏 30°），像桌上的微缩模型。Canvas2D 画家算法：从远到近画方块，每块三个面三种明度。
//   isoP(x, y, z)        世界（格）→ 屏幕；y 向上
//   box(g, ...)          一个长方体（顶 / 左 / 右三面 + 顶面亮边）
//   groundText(g, ...)   把字"平铺"在地面上（canvas 变换成等轴平面）
//   pop(t)               按拍"长出来"的弹性（0 → 1.12 → 1）
import { spring } from '@kit';
type Ctx = CanvasRenderingContext2D;

export const ISO = { bg: '#e9e5f8', base: '#d8d1f1', top: '#f6f4ff', left: '#d4cbf0', right: '#b8acdf', edge: '#ffffff', ink: '#2b2d6e',
  mint: '#8fe0c0', mintD: '#5fbf9a', blue: '#6c7fe0', blueD: '#4b5cc0', window: '#fff6c8', yellow: '#ffd36b' };
export const C30 = Math.cos(Math.PI / 6), S30 = .5;
export type Cam = { cx: number; cy: number; s: number };
export const isoP = (c: Cam, x: number, y: number, z: number): [number, number] => [c.cx + (x - z) * C30 * c.s, c.cy + (x + z) * S30 * c.s - y * c.s];

const shade = (hex: string, f: number) => '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * f))).toString(16).padStart(2, '0')).join('');
/** 长方体：底面角 (x,z)，宽 w（沿 x）、深 d（沿 z）、高 h；col = 顶面颜色，左右面自动压暗 */
export const box = (g: Ctx, c: Cam, x: number, y: number, z: number, w: number, h: number, d: number, col: string, o: { left?: string; right?: string; edge?: number } = {}) => {
  if (h <= .001) return;
  const P = (a: number, b: number, e: number) => isoP(c, a, b, e);
  const poly = (pts: [number, number][], fill: string) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fillStyle = fill; g.fill(); };
  // 看得见的三个面：顶、左前（z+d 那面）、右前（x+w 那面）
  poly([P(x, y, z + d), P(x + w, y, z + d), P(x + w, y + h, z + d), P(x, y + h, z + d)], o.left ?? shade(col, .86));
  poly([P(x + w, y, z), P(x + w, y, z + d), P(x + w, y + h, z + d), P(x + w, y + h, z)], o.right ?? shade(col, .74));
  poly([P(x, y + h, z), P(x + w, y + h, z), P(x + w, y + h, z + d), P(x, y + h, z + d)], col);
  if ((o.edge ?? .6) > 0) {                         // 顶面前沿一道亮边（微缩模型的倒角感）
    g.strokeStyle = `rgba(255,255,255,${o.edge ?? .6})`; g.lineWidth = Math.max(1, c.s * .03);
    const a = P(x, y + h, z + d), b = P(x + w, y + h, z + d), e = P(x + w, y + h, z);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(e[0], e[1]); g.stroke();
  }
};
/** 树：一个"圆球"（顶面亮、下半暗）+ 小树干 */
export const tree = (g: Ctx, c: Cam, x: number, z: number, r: number, k = 1, col = ISO.mint) => {
  if (k <= .01) return;
  box(g, c, x - .05, 0, z - .05, .1, .25 * k, .1, '#b59a86', { edge: 0 });
  const [sx, sy] = isoP(c, x, .25 * k + r * k, z), R = r * k * c.s;
  g.fillStyle = shade(col, .82); g.beginPath(); g.arc(sx, sy, R, 0, Math.PI * 2); g.fill();
  g.fillStyle = col; g.beginPath(); g.arc(sx - R * .18, sy - R * .2, R * .78, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.arc(sx - R * .35, sy - R * .42, R * .25, 0, Math.PI * 2); g.fill();
};
/** 地面上的字：canvas 变换成等轴平面后 fillText */
export const groundText = (g: Ctx, c: Cam, text: string, x: number, z: number, size: number, col: string, font: string) => {
  const [sx, sy] = isoP(c, x, 0, z);
  g.save(); g.setTransform(C30, S30, -C30, S30, sx, sy);
  g.font = `${size * c.s}px ${font}`; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, 0); g.restore();
};
/** 按拍长出来：0 → 过冲 → 1 */
export const pop = (t: number) => (t <= 0 ? 0 : spring(t, 2.8, .45));
/** 拍子：bpm 的第几拍开始（马林巴节拍对齐） */
export const beatAt = (i: number, bpm = 120, t0 = 0) => t0 + i * 60 / bpm / 2;
