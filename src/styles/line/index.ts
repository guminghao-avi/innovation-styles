// 线条动画（Line Art · 一笔画）—— 说明见 references/风格_08_线条动画.md
// 一根线就是全部画面：用 Pen 把整幅画写成"一条不断开的路径"，再用 stroke-dasharray / dashoffset 按进度画出来，
// 镜头跟着笔尖走，最后拉远看全貌。留白和线一样重要。
//   new Pen().move().line().curve().arc().loop()   连续落笔（只有一个 move）
//   pen.d / pen.len                                 SVG path 字符串 / 总长（模块加载时算一次，别每帧算）
//   pen.at(len)                                     笔尖在第 len 像素处的位置（二分查找预采样表）
export class Pen {
  pts: number[] = []; private cum: number[] = [0];
  move(x: number, y: number) { this.pts = [x, y]; this.cum = [0]; return this; }
  private add(x: number, y: number) {
    const n = this.pts.length; const px = this.pts[n - 2], py = this.pts[n - 1];
    this.pts.push(x, y); this.cum.push(this.cum[this.cum.length - 1] + Math.hypot(x - px, y - py)); return this;
  }
  get x() { return this.pts[this.pts.length - 2]; } get y() { return this.pts[this.pts.length - 1]; }
  line(x: number, y: number, steps = 1) { const x0 = this.x, y0 = this.y; for (let i = 1; i <= steps; i++) this.add(x0 + (x - x0) * i / steps, y0 + (y - y0) * i / steps); return this; }
  /** 二次贝塞尔：控制点 (cx, cy) */
  curve(cx: number, cy: number, x: number, y: number, steps = 16) { const x0 = this.x, y0 = this.y; for (let i = 1; i <= steps; i++) { const u = i / steps, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; this.add(a * x0 + b * cx + c * x, a * y0 + b * cy + c * y); } return this; }
  /** 圆弧：圆心 (cx, cy)，半径 r，从 a0 到 a1（弧度） */
  arc(cx: number, cy: number, r: number, a0: number, a1: number, steps = 24) { for (let i = 0; i <= steps; i++) { const a = a0 + (a1 - a0) * i / steps; this.add(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } return this; }
  /** 叶子：从当前点出发画一片叶子再回来（一笔） */
  leaf(len: number, ang: number, w = .35) {
    const x0 = this.x, y0 = this.y, ex = x0 + Math.cos(ang) * len, ey = y0 + Math.sin(ang) * len, nx = -Math.sin(ang) * len * w, ny = Math.cos(ang) * len * w;
    this.curve((x0 + ex) / 2 + nx, (y0 + ey) / 2 + ny, ex, ey); return this.curve((x0 + ex) / 2 - nx, (y0 + ey) / 2 - ny, x0, y0);
  }
  get d() { let s = `M${this.pts[0].toFixed(1)} ${this.pts[1].toFixed(1)}`; for (let i = 2; i < this.pts.length; i += 2) s += `L${this.pts[i].toFixed(1)} ${this.pts[i + 1].toFixed(1)}`; return s; }
  get len() { return this.cum[this.cum.length - 1]; }
  at(L: number): [number, number] {
    let lo = 0, hi = this.cum.length - 1; L = Math.max(0, Math.min(this.len, L));
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.cum[m] < L) lo = m; else hi = m; }
    const u = (L - this.cum[lo]) / Math.max(1e-6, this.cum[hi] - this.cum[lo]);
    return [this.pts[lo * 2] + (this.pts[hi * 2] - this.pts[lo * 2]) * u, this.pts[lo * 2 + 1] + (this.pts[hi * 2 + 1] - this.pts[lo * 2 + 1]) * u];
  }
}
export const LINE = { bg: '#0d1424', bg2: '#16213a', gold: '#e9c46a', goldHot: '#fff2c4', dim: '#5d6b8a' };
