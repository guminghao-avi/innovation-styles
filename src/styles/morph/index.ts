// 形变动画（Shape Morph）—— 说明见 references/风格_10_形变动画.md
// 一个形状连续变成下一个：所有形状都先重采样成同样多的点（N），再把起点对齐（旋转索引让总距离最小），然后逐点插值；
// 点按序号错开一点时间（stagger），形变像"流"过去而不是整体溶解。SVG path 输出，矢量锐利。
//   resample(poly, N) / align(a, b) / morph(a, b, u, stagger) / toD(pts)
//   形状库：circle / drop / cup / sun / gull / star —— 都返回闭合多边形（像素坐标，中心在 cx, cy）
export type Poly = [number, number][];
export const resample = (poly: Poly, N = 160): Poly => {
  const P = [...poly, poly[0]], seg: number[] = [0];
  for (let i = 1; i < P.length; i++) seg.push(seg[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const L = seg[seg.length - 1], out: Poly = []; let j = 1;
  for (let i = 0; i < N; i++) {
    const d = L * i / N; while (seg[j] < d) j++;
    const u = (d - seg[j - 1]) / Math.max(1e-6, seg[j] - seg[j - 1]);
    out.push([P[j - 1][0] + (P[j][0] - P[j - 1][0]) * u, P[j - 1][1] + (P[j][1] - P[j - 1][1]) * u]);
  }
  return out;
};
/** 把 b 的起点旋转到和 a 最近（否则形变时会"拧麻花"） */
export const align = (a: Poly, b: Poly): Poly => {
  let best = 0, bd = 1e18;
  for (let s = 0; s < b.length; s += 2) { let d = 0; for (let i = 0; i < a.length; i += 4) { const q = b[(i + s) % b.length]; d += (a[i][0] - q[0]) ** 2 + (a[i][1] - q[1]) ** 2; } if (d < bd) { bd = d; best = s; } }
  return b.map((_, i) => b[(i + best) % b.length]);
};
const ease = (x: number) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
/** u: 0..1；stagger: 点之间错开的比例（0 = 一起动） */
export const morph = (a: Poly, b: Poly, u: number, stagger = .25): Poly => a.map((p, i) => {
  const off = stagger * (.5 + .5 * Math.sin(i / a.length * Math.PI * 2)), v = ease(Math.max(0, Math.min(1, (u - off) / (1 - stagger))));
  return [p[0] + (b[i][0] - p[0]) * v, p[1] + (b[i][1] - p[1]) * v];
});
export const toD = (pts: Poly) => 'M' + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L') + 'Z';

// ---------------- 形状库 ----------------
const ring = (n: number, f: (a: number) => [number, number]): Poly => Array.from({ length: n }, (_, i) => f(i / n * Math.PI * 2 - Math.PI / 2));
export const circle = (cx: number, cy: number, r: number): Poly => ring(120, a => [cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
export const drop = (cx: number, cy: number, r: number): Poly => ring(120, a => { const up = Math.max(0, -Math.sin(a)); return [cx + Math.cos(a) * r * (1 - up * .9), cy + (Math.sin(a) > 0 ? Math.sin(a) * r : -up * r * 1.9)]; });
export const star = (cx: number, cy: number, r0: number, r1: number, n: number, rot = 0): Poly => ring(n * 12, a => { const k = Math.cos((a + rot) * n), r = r0 + (r1 - r0) * Math.max(0, k) ** 3; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
export const sun = (cx: number, cy: number, r: number) => star(cx, cy, r, r * 1.45, 12);
/** 咖啡杯（带把手的外轮廓，一圈画下来） */
export const cup = (cx: number, cy: number, s: number): Poly => {
  const p: Poly = [], add = (x: number, y: number) => p.push([cx + x * s, cy + y * s]);
  add(-1, -.9); add(1, -.9);                                                   // 杯口
  for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i / 10 * Math.PI; add(1.05 + Math.cos(a) * .45, -.35 + Math.sin(a) * .42); }   // 把手外圈
  for (let i = 10; i >= 0; i--) { const a = -Math.PI / 2 + i / 10 * Math.PI; add(1.02 + Math.cos(a) * .22, -.35 + Math.sin(a) * .2); }   // 把手内圈
  add(.8, .55); add(.6, .9); add(-.6, .9); add(-.8, .55);                       // 杯底
  return p;
};
/** 海鸥：一个 M 形的翅膀 */
export const gull = (cx: number, cy: number, s: number, flap = 0): Poly => {
  const f = flap * .35, p: Poly = [];
  const top = [[-1.6, -.2 - f], [-1, -.55 - f * .6], [-.45, -.35], [0, .1], [.45, -.35], [1, -.55 - f * .6], [1.6, -.2 - f]];
  const bot = [[1.6, -.1 - f], [1, -.38 - f * .5], [.45, -.12], [0, .32], [-.45, -.12], [-1, -.38 - f * .5], [-1.6, -.1 - f]];
  for (const [x, y] of [...top, ...bot]) p.push([cx + x * s, cy + y * s]);
  return p;
};
