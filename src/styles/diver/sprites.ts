// 潜水戴夫风 · 像素精灵：用"格子画板"拼形状（椭圆、矩形、三角、线），最后自动描一圈 1px 深色外轮廓 + 顶光高光。
// 角色比自渡风大一号（潜水员约 34×22 像素，px=4 放大到 ~136px），描边粗、颜色饱和，像休闲游戏。
// 画法：const s = new Grid(); s.ellipse(...); s.rect(...); s.outline('#13203a'); s.draw(g, x, y, flip)
type Ctx = CanvasRenderingContext2D;

export class Grid {
  m = new Map<string, string>();
  set(x: number, y: number, c: string) { this.m.set(Math.round(x) + ',' + Math.round(y), c); return this; }
  rect(x0: number, y0: number, w: number, h: number, c: string) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) this.set(x0 + x, y0 + y, c); return this; }
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      if (((x + .5 - cx) / rx) ** 2 + ((y + .5 - cy) / ry) ** 2 <= 1) this.set(x, y, c);
    return this;
  }
  /** 三角形（尾巴、鳍） */
  tri(a: [number, number], b: [number, number], c: [number, number], col: string) {
    const [x0, x1] = [Math.min(a[0], b[0], c[0]), Math.max(a[0], b[0], c[0])], [y0, y1] = [Math.min(a[1], b[1], c[1]), Math.max(a[1], b[1], c[1])];
    const s = (p: number[], q: number[], r: number[]) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
    for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) {
      const p = [x + .5, y + .5], d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a);
      if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) this.set(x, y, col);
    }
    return this;
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx + dy;
    for (;;) { this.set(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
    return this;
  }
  /** 外轮廓：所有"空格但挨着填充格"的位置描成 col（4 邻接 = 1px 硬边） */
  outline(col: string) {
    const add: string[] = [];
    this.m.forEach((_, k) => { const [x, y] = k.split(',').map(Number); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const kk = (x + dx) + ',' + (y + dy); if (!this.m.has(kk)) add.push(kk); } });
    add.forEach(k => this.m.set(k, col));
    return this;
  }
  draw(g: Ctx, ox: number, oy: number, flip = false, alpha = 1) {
    ox = Math.round(ox); oy = Math.round(oy); g.globalAlpha = alpha;
    this.m.forEach((c, k) => { const [x, y] = k.split(',').map(Number); g.fillStyle = c; g.fillRect(flip ? ox - x : ox + x, oy + y, 1, 1); });
    g.globalAlpha = 1;
  }
}

export const INK = '#13203a';
const shade = (hex: string, f: number) => '#' + [1, 3, 5].map(i => Math.max(0, Math.min(255, Math.round(parseInt(hex.slice(i, i + 2), 16) * f))).toString(16).padStart(2, '0')).join('');

/** 潜水员（朝右游）：圆滚滚的身体、黄色气瓶、大面镜、脚蹼两帧拍水。原点 = 身体中心 */
export const diver = (t: number, o: { suit?: string; trim?: string; kick?: number; torch?: boolean } = {}) => {
  const suit = o.suit ?? '#2f56a8', trim = o.trim ?? '#ffd23f', f = Math.floor(t * (o.kick ?? 6)) % 2;
  const s = new Grid();
  s.rect(-12, -9, 12, 5, trim).rect(-11, -9, 10, 1, shade(trim, 1.15)).rect(-12, -5, 12, 1, shade(trim, .75));   // 气瓶
  s.ellipse(0, 0, 11, 6.5, suit);                                           // 身体
  s.ellipse(-1, -2.5, 8, 2.5, shade(suit, 1.3));                            // 背上的高光
  s.rect(-6, 3, 12, 2, trim);                                               // 腰带
  // 腿 + 脚蹼（两帧）
  const ly = f ? 1 : 4;
  s.rect(-16, -1 + (f ? -1 : 1), 6, 3, suit).rect(-16, 2 + (f ? 1 : -1), 6, 3, suit);
  s.tri([-16, -2 + ly - 3], [-25, -6 + ly], [-24, 2 + ly - 3], trim);
  s.tri([-16, 3 + (f ? 2 : -2)], [-25, 7 + (f ? 1 : -3)], [-24, 1 + (f ? 3 : -1)], shade(trim, .8));
  // 头 + 面镜
  s.ellipse(12, -3, 6, 5.5, '#f2b48c');
  s.ellipse(12, -5, 6, 3, suit);                                           // 头套
  s.rect(12, -4, 6, 4, '#e8eef5').rect(13, -3, 4, 2, '#7fe3ff').set(14, -3, '#ffffff');   // 面镜
  s.rect(7, -1, 2, 6, '#c9d3dc');                                           // 呼吸管
  // 手
  s.rect(4, 4, 7, 2, suit).ellipse(12, 5, 1.6, 1.6, '#f2b48c');
  if (o.torch) s.rect(13, 3, 5, 3, '#4a5566').rect(18, 3, 1, 3, '#fff6c0');
  return s.outline(INK);
};

/** 鱼：body 主色、belly 肚皮色；size 1 = 约 16 像素长。原点 = 身体中心，朝右 */
export const fish = (t: number, body: string, belly: string, size = 1, seed = 0) => {
  const s = new Grid(), L = 7 * size, Hh = 3.6 * size, w = Math.floor(t * 5 + seed) % 2;
  s.ellipse(0, 0, L, Hh, body);
  s.ellipse(.5 * size, 1.4 * size, L * .75, Hh * .5, belly);
  s.tri([-L + 1, 0], [-L - 4 * size, -3 * size - w], [-L - 4 * size, 3 * size + w], shade(body, .85));     // 尾巴摆
  s.tri([-1 * size, -Hh + 1], [-4 * size, -Hh - 2.5 * size], [2 * size, -Hh + .5], shade(body, .8));       // 背鳍
  s.rect(L * .5, -1.4 * size, Math.max(1, Math.round(size * 1.4)), Math.max(1, Math.round(size * 1.4)), '#ffffff').set(L * .5 + size * .6, -.9 * size, INK);
  return s.outline(INK);
};

/** 海草：一根像素的、随时间左右摆的条带 */
export const kelp = (t: number, h: number, col = '#2f9e6a', seed = 0) => {
  const s = new Grid();
  for (let y = 0; y < h; y++) {
    const sw = Math.round(Math.sin(t * 1.4 + y * .18 + seed) * (y / h) * 4);
    s.rect(sw - 1, -y, 3, 1, y % 7 < 3 ? shade(col, 1.15) : col);
    if (y % 9 === 4) s.rect(sw + 2, -y, 3, 1, col);
  }
  return s.outline(INK);
};

/** 珊瑚：几根分叉的粗枝 */
export const coral = (col: string, seed = 0) => {
  const s = new Grid();
  const br = (x: number, y: number, a: number, len: number, d: number) => {
    const x1 = x + Math.cos(a) * len, y1 = y - Math.sin(a) * len;
    for (let i = 0; i <= len; i++) { const xx = x + (x1 - x) * i / len, yy = y + (y1 - y) * i / len; s.rect(xx - 1, yy - 1, 3, 3, col); }
    s.ellipse(x1, y1, 2, 2, shade(col, 1.2));
    if (d > 0) { br(x1, y1, a + .5 + (seed % 3) * .1, len * .7, d - 1); br(x1, y1, a - .55, len * .65, d - 1); }
  };
  br(0, 0, Math.PI / 2, 9, 2);
  return s.outline(INK);
};
export { shade };
