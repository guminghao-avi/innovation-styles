// 拼贴剪贴（Collage · Cut-out）—— 说明见 references/风格_13_拼贴剪贴.md
// 剪报 + 牛皮纸 + 网点印刷 + 胶带；所有东西按 12fps 一格一格动（卡顿就是风格）。全部程序化生成（不用版权照片）：
//   kraft(g)                    牛皮纸底（褐色 + 纤维 + 斑点）
//   newsprint(g, x, y, w, h)    一块"剪报"：标题粗条 + 一行行灰色"字"（短横条）+ 撕边
//   halftone(g, rect, dark, …)  网点印刷：按"暗度函数"在 45° 网格上画大小不一的圆点（老照片 / 印刷感的核心）
//   tape(g, x, y, w, rot)       半透明胶带（带锯齿两端）
//   tornRect(...)               撕边矩形的点（配合 paper 包的 paperShape 画投影）
import { rnd } from '@kit';
type Ctx = CanvasRenderingContext2D;
export const COL = { kraft: '#b98e5c', kraftD: '#9c7446', news: '#ece6d6', ink: '#1a1715', red: '#d6261f', cream: '#f3ead6', tape: 'rgba(238,226,190,.7)' };

export const kraft = (g: Ctx, w = 1920, h = 1080) => {
  g.fillStyle = COL.kraft; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) {
    const x = rnd(i, 1) * w, y = rnd(i, 2) * h, l = 6 + rnd(i, 3) * 26, a = rnd(i, 4) * Math.PI;
    g.strokeStyle = rnd(i, 5) > .5 ? 'rgba(90,60,30,.12)' : 'rgba(230,200,150,.12)'; g.lineWidth = .8 + rnd(i, 6);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(70,45,20,${.08 + .1 * rnd(i, 8)})`; g.beginPath(); g.arc(rnd(i, 9) * w, rnd(i, 10) * h, 1 + rnd(i, 11) * 3, 0, Math.PI * 2); g.fill(); }
};
/** 撕边矩形：四条边都带小锯齿（seed 固定） */
export const tornRect = (x: number, y: number, w: number, h: number, seed: number, amp = 5, step = 14): number[] => {
  const p: number[] = [], edge = (x0: number, y0: number, x1: number, y1: number, k: number) => {
    const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
    for (let i = 0; i < n; i++) { const u = i / n, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1; const j = (rnd(i + k * 97, seed) - .5) * amp * 2; p.push(x0 + (x1 - x0) * u + nx / l * j, y0 + (y1 - y0) * u + ny / l * j); }
  };
  edge(x, y, x + w, y, 1); edge(x + w, y, x + w, y + h, 2); edge(x + w, y + h, x, y + h, 3); edge(x, y + h, x, y, 4);
  return p;
};
const fillPoly = (g: Ctx, p: number[], col: string) => { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); g.fillStyle = col; g.fill(); };
/** 剪报：纸 + 标题 + 正文"字"（短条），可以带一张网点小图 */
export const newsprint = (g: Ctx, x: number, y: number, w: number, h: number, seed: number, o: { head?: string; font?: string; shadow?: boolean } = {}) => {
  const p = tornRect(x, y, w, h, seed);
  if (o.shadow !== false) { g.save(); g.shadowColor = 'rgba(50,30,10,.35)'; g.shadowBlur = 12; g.shadowOffsetX = 5; g.shadowOffsetY = 8; fillPoly(g, p, COL.news); g.restore(); }
  fillPoly(g, p, COL.news);
  g.save(); g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); g.clip();
  let yy = y + 26;
  if (o.head) { g.fillStyle = COL.ink; g.font = `900 ${Math.round(w / Math.max(4, o.head.length) * .95)}px ${o.font ?? 'sans-serif'}`; g.fillText(o.head, x + 18, yy + w / Math.max(4, o.head.length) * .8); yy += w / Math.max(4, o.head.length) + 16; }
  const cols = w > 380 ? 2 : 1, cw = (w - 36 - (cols - 1) * 18) / cols;
  for (let c = 0; c < cols; c++) for (let r = 0; yy + r * 15 < y + h - 18; r++) {
    let cx = x + 18 + c * (cw + 18); const ry = yy + r * 15;
    while (cx < x + 18 + c * (cw + 18) + cw - 8) { const ww = 8 + rnd(cx * 3 + r, seed + c) * 34; g.fillStyle = 'rgba(30,26,22,.55)'; g.fillRect(cx, ry, Math.min(ww, x + 18 + c * (cw + 18) + cw - cx), 6); cx += ww + 5; }
  }
  g.restore();
};
/** 网点：dark(x, y) 返回 0..1 的暗度（局部坐标），cell 网点间距，45° 网格 */
export const halftone = (g: Ctx, x: number, y: number, w: number, h: number, dark: (u: number, v: number) => number, cell = 9, col = COL.ink) => {
  g.fillStyle = col; const c = Math.SQRT1_2;
  for (let a = -h; a < w + h; a += cell) for (let b = -w; b < w + h; b += cell) {
    const px = (a - b) * c + w / 2 - h / 2 * 0, py = (a + b) * c;
    if (px < 0 || px > w || py < 0 || py > h) continue;
    const d = dark(px / w, py / h); if (d < .04) continue;
    g.beginPath(); g.arc(x + px, y + py, cell * .55 * Math.sqrt(d), 0, Math.PI * 2); g.fill();
  }
};
export const tape = (g: Ctx, x: number, y: number, w: number, rot: number, h = 34) => {
  g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = COL.tape; g.beginPath();
  g.moveTo(-w / 2, -h / 2); for (let i = 0; i <= 6; i++) g.lineTo(-w / 2 + (i % 2 ? 4 : 0), -h / 2 + h * i / 6);
  g.lineTo(w / 2, h / 2); for (let i = 0; i <= 6; i++) g.lineTo(w / 2 - (i % 2 ? 4 : 0), h / 2 - h * i / 6); g.closePath(); g.fill(); g.restore();
};
