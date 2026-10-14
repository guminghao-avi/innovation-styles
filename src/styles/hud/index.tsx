// 赛博朋克 HUD（FUI · 电影里的科幻界面）—— 说明见 references/风格_12_赛博朋克HUD.md
// 线框 + 滚动数据 + 全息地球：全部是细线（1~2px）+ 叠加发光（lighter），等宽字体；颜色只有一个主色（青）+ 一个警报色（橙）。
//   drawGlobe(g, o)    正交投影的线框地球：经纬网 + 真实海岸线（Natural Earth 1:110m，land110.json）+ 背面淡化
//   project(lon, lat)  经纬度 → 屏幕（同一个投影，用来放标记、锁定框）
//   ring / ticks       刻度环、转动的弧段
//   bracket            四角括号（锁定框、面板角）
//   telemetry          一列滚动的数据（逐行"打字"出现）
//   HUD_POST           推荐的 post.json（强 bloom + 色散 + 扫描线在组件里画）
import LAND from './land110.json';
import { rnd } from '@kit';
type Ctx = CanvasRenderingContext2D;

export const HUDC = { cyan: '62,232,255', cyanHot: '200,250,255', orange: '255,138,42', orangeHot: '255,214,170', bg: '#03070c', dim: '40,90,110' };
export type GlobeView = { cx: number; cy: number; r: number; lon0: number; lat0: number };
const D2R = Math.PI / 180;
/** 正交投影：返回 [x, y, z]，z>0 在正面 */
export const project = (v: GlobeView, lon: number, lat: number): [number, number, number] => {
  const l = (lon - v.lon0) * D2R, p = lat * D2R, p0 = v.lat0 * D2R;
  const x = Math.cos(p) * Math.sin(l), y = Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l), z = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
  return [v.cx + x * v.r, v.cy - y * v.r, z];
};
const strokePath = (g: Ctx, v: GlobeView, pts: [number, number][], col: string, aFront: number, aBack: number, w: number) => {
  let prev: [number, number, number] | null = null;
  for (const [lon, lat] of pts) {
    const q = project(v, lon, lat);
    if (prev) { const front = prev[2] > 0 && q[2] > 0, a = front ? aFront : (prev[2] < 0 && q[2] < 0 ? aBack : (aFront + aBack) / 2);
      if (a > .003) { g.strokeStyle = `rgba(${col},${a})`; g.lineWidth = w; g.beginPath(); g.moveTo(prev[0], prev[1]); g.lineTo(q[0], q[1]); g.stroke(); } }
    prev = q;
  }
};
/** 线框地球（lighter 模式里调用） */
export const drawGlobe = (g: Ctx, v: GlobeView, o: { col?: string; a?: number; land?: number; grid?: number; scan?: number } = {}) => {
  if (!(v.r > 1)) return;                                   // 开机动画的缓动可能略小于 0：半径 ≤ 0 时 arc 会抛错
  const col = o.col ?? HUDC.cyan, a = o.a ?? 1;
  g.save(); g.globalCompositeOperation = 'lighter';
  // 球体的边缘辉光
  const gr = g.createRadialGradient(v.cx, v.cy, v.r * .9, v.cx, v.cy, v.r * 1.12);
  gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(.45, `rgba(${col},${.18 * a})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.beginPath(); g.arc(v.cx, v.cy, v.r * 1.12, 0, Math.PI * 2); g.fill();
  // 经纬网
  const ga = (o.grid ?? 1) * a;
  for (let lon = -180; lon < 180; lon += 15) strokePath(g, v, Array.from({ length: 37 }, (_, i) => [lon, -90 + i * 5] as [number, number]), col, .22 * ga, .05 * ga, 1);
  for (let lat = -75; lat <= 75; lat += 15) strokePath(g, v, Array.from({ length: 73 }, (_, i) => [-180 + i * 5, lat] as [number, number]), col, .22 * ga, .05 * ga, 1);
  // 海岸线：两遍（宽淡 + 细亮）= 发光线
  const la = (o.land ?? 1) * a;
  for (const poly of LAND as [number, number][][]) { strokePath(g, v, poly, col, .25 * la, .04 * la, 4); strokePath(g, v, poly, col, .95 * la, .1 * la, 1.4); }
  // 扫描带：一条亮的经线扫过
  if (o.scan != null) strokePath(g, v, Array.from({ length: 37 }, (_, i) => [o.scan!, -90 + i * 5] as [number, number]), HUDC.cyanHot, .8 * a, 0, 2.5);
  g.restore();
};
/** 刻度环：n 个刻度，长短交替；rot 弧度 */
export const ticks = (g: Ctx, cx: number, cy: number, r: number, n: number, rot: number, col: string, a: number, len = 10) => {
  g.strokeStyle = `rgba(${col},${a})`; g.lineWidth = 1.5;
  for (let i = 0; i < n; i++) { const t = rot + i / n * Math.PI * 2, L = i % 5 === 0 ? len * 1.8 : len; g.beginPath(); g.moveTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r); g.lineTo(cx + Math.cos(t) * (r + L), cy + Math.sin(t) * (r + L)); g.stroke(); }
};
export const arc = (g: Ctx, cx: number, cy: number, r: number, a0: number, a1: number, col: string, a: number, w = 2) => { if (r <= 0) return; g.strokeStyle = `rgba(${col},${a})`; g.lineWidth = w; g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke(); };
/** 四角括号：(x, y, w, h)，L 角长 */
export const bracket = (g: Ctx, x: number, y: number, w: number, h: number, L: number, col: string, a: number, lw = 3) => {
  g.strokeStyle = `rgba(${col},${a})`; g.lineWidth = lw;
  for (const [px, py, dx, dy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) { g.beginPath(); g.moveTo(px + dx * L, py); g.lineTo(px, py); g.lineTo(px, py + dy * L); g.stroke(); }
};
/** 滚动数据：rows 行，按 t 逐行"打字"出现，数字每帧在跳 */
export const telemetry = (g: Ctx, x: number, y: number, t: number, lines: string[], col: string, font: string, size = 18) => {
  g.font = `${size}px ${font}`; g.textAlign = 'left';
  lines.forEach((s, i) => {
    const appear = t - i * .12; if (appear < 0) return;
    const shown = s.slice(0, Math.floor(appear * 60)).replace(/#/g, () => String(Math.floor(rnd(Math.floor(t * 20) + i, s.length) * 10)));
    g.fillStyle = `rgba(${col},${i % 4 === 3 ? .45 : .8})`; g.fillText(shown, x, y + i * size * 1.45);
  });
};
export const HUD_POST = { grain: 3, vignette: .35, bloom: .45, bloomThreshold: .35, bloomRadius: 22, ca: 2 };
