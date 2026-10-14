import { GLSL, makeVO, rnd, F, clamp, lerp } from '@kit';
import timing from './vo.timing.json';
import beats from './beats.json';
export const { T } = makeVO(timing as any, beats);
export const G = (f: string) => GLSL.noise + GLSL.color + f;
type Ctx = CanvasRenderingContext2D;
export type V2 = [number, number];

// 颜色系统：珍珠青 = 他（双鱼）；琥珀 = 你（别人）；猩红 = 生气 / 伤人的话；玫瑰 = 他自己的感受（那条被忘掉的鱼）
export const PEARL = '138,222,232', PEARL_HOT = '228,252,255', AMBER = '255,172,96', AMBER_HOT = '255,232,200',
  RED = '230,52,58', ROSE = '244,140,178', ROSE_HOT = '255,222,236', COLD = '206,216,228';

/** 光晕（lighter 模式里调用） */
export const glow = (g: Ctx, x: number, y: number, r: number, col: string, a: number) => {
  if (a <= .002 || r <= .5) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(.2, `rgba(${col},${a * .3})`); gr.addColorStop(.5, `rgba(${col},${a * .07})`); gr.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
};
/** 一颗"光"：白热核心 + 有色光晕 + 横向镜头光晕 */
export const orb = (g: Ctx, x: number, y: number, s: number, col: string, hot: string, a = 1, flare = .5) => {
  if (a <= .003) return;
  glow(g, x, y, 260 * s, col, .22 * a);
  glow(g, x, y, 70 * s, col, .55 * a);
  glow(g, x, y, 16 * s, hot, 1 * a);
  if (flare > 0) {
    const w = 520 * s * flare, gr = g.createLinearGradient(x - w, 0, x + w, 0);
    gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(.5, `rgba(${hot},${.32 * a})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = gr; g.fillRect(x - w, y - 1.2 * s, w * 2, 2.4 * s);
  }
};
/** 泛光：在 1/4 分辨率的离屏画布上画，模糊后叠回来 */
let _off: HTMLCanvasElement | null = null;
export const bloom = (g: Ctx, fn: (o: Ctx) => void, blur = 6, alpha = 1, q = .25) => {
  if (alpha <= .003) return;
  const w = Math.round(1920 * q), h = Math.round(1080 * q);
  if (!_off) _off = document.createElement('canvas');
  if (_off.width !== w || _off.height !== h) { _off.width = w; _off.height = h; }
  const o = _off.getContext('2d')!; o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, w, h); o.globalCompositeOperation = 'lighter';
  const m = g.getTransform(), sc0 = g.canvas.width / 1920;
  // 把调用方当前的变换（相对 1920 坐标）带进离屏画布
  o.setTransform(m.a / sc0 * q, m.b / sc0 * q, m.c / sc0 * q, m.d / sc0 * q, m.e / sc0 * q, m.f / sc0 * q); fn(o);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.filter = `blur(${blur * sc0}px)`; g.globalAlpha = Math.min(1, alpha); g.globalCompositeOperation = 'lighter';
  g.drawImage(_off, 0, 0, g.canvas.width, g.canvas.height); g.restore();
};
export const mixc = (a: string, b: string, t: number) => { const A = a.split(',').map(Number), B = b.split(',').map(Number); return A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(','); };

/** 发光的一行字 */
export const glowText = (g: Ctx, s: string, x: number, y: number, size: number, col: string, hot: string, a: number, opt: { weight?: number; family?: string; spacing?: number; blur?: number; align?: CanvasTextAlign } = {}) => {
  if (a <= .003) return;
  const { weight = 500, family = F.serif, spacing = .06, blur = 1, align = 'center' } = opt;
  g.save();
  g.font = `${weight} ${size}px ${family}`; g.textAlign = align; g.textBaseline = 'middle';
  (g as any).letterSpacing = `${(size * spacing).toFixed(1)}px`;
  g.shadowColor = `rgba(${col},${.9 * a})`; g.shadowBlur = size * .6 * blur;
  g.fillStyle = `rgba(${hot},${a})`; g.fillText(s, x, y);
  g.shadowBlur = 0; g.fillText(s, x, y);
  g.restore();
};

// ================= 路径：按时间的 Hermite 样条（速度连续） =================
/** kpath([[t, x, y], ...])(t) → [x, y]；关键点之间速度连续（Catmull-Rom 切线），两端速度为 0 */
export const kpath = (ks: [number, number, number][]) => (t: number): V2 => {
  const n = ks.length;
  if (t <= ks[0][0]) return [ks[0][1], ks[0][2]];
  if (t >= ks[n - 1][0]) return [ks[n - 1][1], ks[n - 1][2]];
  let i = 0; while (i < n - 2 && t > ks[i + 1][0]) i++;
  const [t0, x0, y0] = ks[i], [t1, x1, y1] = ks[i + 1];
  const tan = (j: number, c: 1 | 2): number => {
    if (j <= 0 || j >= n - 1) return 0;
    return (ks[j + 1][c] - ks[j - 1][c]) / (ks[j + 1][0] - ks[j - 1][0]);
  };
  const h = t1 - t0, u = (t - t0) / h, u2 = u * u, u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
  return [h00 * x0 + h10 * h * tan(i, 1) + h01 * x1 + h11 * h * tan(i + 1, 1), h00 * y0 + h10 * h * tan(i, 2) + h01 * y1 + h11 * h * tan(i + 1, 2)];
};
/** 路径在 t 处的朝向（弧度）；速度太小时退回 fb */
export const heading = (p: (t: number) => V2, t: number, fb = 0, w = .12) => {
  const a = p(t - w), b = p(t + w), dx = b[0] - a[0], dy = b[1] - a[1], sp = Math.hypot(dx, dy);
  if (sp < 1.5) return fb;
  const ang = Math.atan2(dy, dx);
  if (sp > 10) return ang;
  // 慢速时和后备朝向平滑混合（避免抖）
  let d = ang - fb; d = Math.atan2(Math.sin(d), Math.cos(d));
  return fb + d * (sp - 1.5) / 8.5;
};

// ================= 光鱼 =================
export type FishOpt = {
  s?: number;            // 缩放：身长 = 300·s 像素
  col?: string; hot?: string; a?: number;
  amp?: number;          // 摆尾幅度（弧度）
  freq?: number;         // 摆尾频率（Hz）
  curl?: number;         // 身体整体弯曲（蜷起来）
  lag?: number;          // 身体跟随头部朝向的延迟（秒）
  seed?: number;
  glowA?: number;        // 泛光强度
  sparks?: number;       // 尾迹火花（0..1）
  path?: (t: number) => V2;   // 有路径时，火花留在世界里
  cord?: { to: V2; a: number; c1?: number; c2?: V2; wave?: number; col?: string };   // 尾巴上的那根绳
  fin?: number;
  dim?: number;          // 0..1 熄灭程度（不开心的鱼：细节变少、颜色发灰）
};
type SpinePt = { x: number; y: number; th: number; w: number };
const N = 34;
export const fishSpine = (head: V2, angAt: (dt: number) => number, t: number, o: FishOpt): SpinePt[] => {
  const s = o.s ?? 1, L = 300 * s, amp = o.amp ?? .32, fq = o.freq ?? .9, curl = o.curl ?? 0, lag = o.lag ?? .55, seed = o.seed ?? 0;
  const out: SpinePt[] = [];
  let x = head[0], y = head[1];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const th = angAt(u * lag) + curl * u + amp * (.06 + u * u * 1.15) * Math.sin(2 * Math.PI * fq * t - 2 * Math.PI * 1.05 * u + seed);
    const sh = Math.pow(Math.sin(Math.PI * Math.min(1, Math.pow(u, .58))), .85) * (1 - .5 * u);
    out.push({ x, y, th, w: 30 * s * sh + .6 });
    x -= Math.cos(th) * L / N; y -= Math.sin(th) * L / N;
  }
  return out;
};

export const drawFish = (g: Ctx, t: number, head: V2, angAt: (dt: number) => number, o: FishOpt) => {
  const a = o.a ?? 1; if (a <= .003) return;
  const s = o.s ?? 1, dim = o.dim ?? 0;
  const col = o.col ?? PEARL, hot = o.hot ?? PEARL_HOT, fq = o.freq ?? .9, amp = o.amp ?? .32, seed = o.seed ?? 0, fin = o.fin ?? 1;
  const P = fishSpine(head, angAt, t, o);
  const nx = (p: SpinePt) => -Math.sin(p.th), ny = (p: SpinePt) => Math.cos(p.th);
  const edge = (f: number) => P.map(p => [p.x + nx(p) * p.w * f, p.y + ny(p) * p.w * f] as V2);
  const tb = P[N], tth = tb.th;   // 尾柄
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';

  // --- 绳：从尾柄出发 ---
  if (o.cord && o.cord.a > .003) {
    const c = o.cord, ccol = c.col ?? col;
    const p0: V2 = [tb.x, tb.y], c1 = c.c1 ?? 160 * s;
    const p1: V2 = [p0[0] - Math.cos(tth) * c1, p0[1] - Math.sin(tth) * c1];
    const p3 = c.to, p2 = c.c2 ?? [lerp(p1[0], p3[0], .6), lerp(p1[1], p3[1], .6) + 40];
    const M = 60, pts: V2[] = [];
    for (let i = 0; i <= M; i++) {
      const u = i / M, v = 1 - u;
      let x = v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0];
      let y = v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1];
      const wv = (c.wave ?? 7) * Math.sin(u * 9 - t * 2.3 + seed) * Math.sin(u * Math.PI) * s;
      x += wv * .6; y += wv;
      pts.push([x, y]);
    }
    const stroke = (lw: number, al: number) => {
      g.lineWidth = lw; g.strokeStyle = `rgba(${ccol},${al})`;
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
    };
    stroke(5 * Math.max(.6, s), .05 * c.a); stroke(1.1, .42 * c.a);
    // 沿绳走的细小光点（像有东西在线里流）
    for (let k = 0; k < 7; k++) {
      const u = ((t * .11 + k / 7 + seed * .13) % 1), q = pts[Math.floor(u * M)];
      glow(g, q[0], q[1], 9, ccol, .35 * c.a * Math.sin(u * Math.PI));
    }
  }

  // --- 尾迹火花 ---
  const sp = (o.sparks ?? .6) * (1 - dim);
  if (sp > 0) {
    const DT = .045, AGE = 2.4, j1 = Math.floor(t / DT);
    for (let j = j1; j > j1 - AGE / DT; j--) {
      const t0 = j * DT, age = t - t0; if (age < 0) continue;
      if (rnd(j, 31) > sp) continue;
      let bx: number, by: number, bth: number;
      if (o.path) { const hp = o.path(t0), hq = o.path(t0 - .08); bth = Math.atan2(hp[1] - hq[1], hp[0] - hq[0]); if (Math.hypot(hp[0] - hq[0], hp[1] - hq[1]) < .5) bth = tth; bx = hp[0] - Math.cos(bth) * 290 * s; by = hp[1] - Math.sin(bth) * 290 * s; }
      else { bx = tb.x; by = tb.y; bth = tth; }
      const ang = bth + Math.PI + (rnd(j, 32) - .5) * 1.6, v = (20 + 50 * rnd(j, 33)) * s;
      const x = bx + Math.cos(ang) * v * age + (rnd(j, 34) - .5) * 30 * s, y = by + Math.sin(ang) * v * age + (rnd(j, 35) - .5) * 30 * s - 6 * age;
      const al = (1 - age / AGE) * (.35 + .65 * rnd(j, 36)) * a * .8;
      const z = (1 + 1.6 * rnd(j, 37)) * Math.max(.7, s);
      g.fillStyle = `rgba(${hot},${al})`; g.fillRect(x - z / 2, y - z / 2, z, z);
      if (rnd(j, 38) > .8) glow(g, x, y, 10 * s + 4, col, al * .5);
    }
  }

  // --- 自发光的环境光晕 ---
  const mid = P[Math.floor(N * .3)];
  glow(g, mid.x, mid.y, 330 * s, col, .07 * a * (1 - dim * .6));

  // --- 尾鳍：一把飘动的纱 ---
  const MR = 26, TL = 175 * s * fin;
  for (let m = 0; m < MR; m++) {
    const f = m / (MR - 1) - .5, len = TL * (.62 + .5 * (Math.abs(f) * 1.2 + .35 * rnd(m, 41 + seed)));
    let x = tb.x, y = tb.y, th0 = tth + f * 1.25;
    g.beginPath(); g.moveTo(x, y);
    const K = 12;
    for (let j = 1; j <= K; j++) {
      const v = j / K;
      const th = th0 + amp * 1.5 * v * Math.sin(2 * Math.PI * fq * t - 2 * Math.PI * 1.05 * (1 + v * .7) + seed + f * .8) + f * .5 * v;
      x -= Math.cos(th) * len / K; y -= Math.sin(th) * len / K;
      g.lineTo(x, y);
    }
    const al = (.22 - .12 * Math.abs(f)) * a * (1 - dim * .5);
    const gr = g.createLinearGradient(tb.x, tb.y, x, y);
    gr.addColorStop(0, `rgba(${hot},${al})`); gr.addColorStop(.5, `rgba(${col},${al * .55})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.strokeStyle = gr; g.lineWidth = .9 * Math.max(.7, s); g.stroke();
  }

  // --- 胸鳍：两片扇动的薄纱 ---
  const pi = Math.floor(N * .2), pp = P[pi];
  for (const side of [-1, 1]) {
    const flap = .4 * Math.sin(2 * Math.PI * fq * 1.25 * t + side * .9 + seed);
    for (let m = 0; m < 9; m++) {
      const f = m / 8;
      const bx = pp.x + nx(pp) * pp.w * side * .9, by = pp.y + ny(pp) * pp.w * side * .9;
      const th = pp.th + Math.PI - side * (.5 + .55 * f + flap * (.4 + f));
      const len = 78 * s * fin * (.55 + .45 * Math.sin(f * Math.PI * .9 + .3));
      const ex = bx + Math.cos(th) * len, ey = by + Math.sin(th) * len;
      const cx = bx + Math.cos(th + side * .25) * len * .5, cy = by + Math.sin(th + side * .25) * len * .5;
      const gr = g.createLinearGradient(bx, by, ex, ey);
      const al = .22 * a * (1 - dim * .5);
      gr.addColorStop(0, `rgba(${hot},${al})`); gr.addColorStop(1, `rgba(${col},0)`);
      g.strokeStyle = gr; g.lineWidth = .8 * Math.max(.7, s);
      g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(cx, cy, ex, ey); g.stroke();
    }
  }

  // --- 身体：半透明的肉 + 纤维 + 边缘亮 ---
  const L = edge(1), R = edge(-1);
  g.beginPath(); L.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0], R[i][1]); g.closePath();
  g.fillStyle = `rgba(${col},${.085 * a})`; g.fill();
  const FIB = Math.round(lerp(13, 7, dim));
  for (let q = 0; q < FIB; q++) {
    const f = -1 + 2 * q / (FIB - 1), E_ = edge(f * .96), rim = Math.abs(f) > .9;
    const base = rim ? .5 : .1 + .12 * (1 - f * f);
    for (let i = 0; i < N; i++) {
      const u = i / N, fade = Math.min(1, u * 9) * (1 - u * .55);
      const al = base * fade * a * (1 - dim * .55);
      if (al < .004) continue;
      g.strokeStyle = `rgba(${rim ? hot : col},${al})`; g.lineWidth = rim ? 1.15 : .8;
      g.beginPath(); g.moveTo(E_[i][0], E_[i][1]); g.lineTo(E_[i + 1][0], E_[i + 1][1]); g.stroke();
    }
  }
  // 脊柱：白热的芯
  for (let i = 0; i < N; i++) {
    const u = i / N, al = (.75 * (1 - u) ** 1.3 + .08) * a * (1 - dim * .6);
    g.strokeStyle = `rgba(${hot},${al})`; g.lineWidth = (2.2 - 1.4 * u) * Math.max(.7, s);
    g.beginPath(); g.moveTo(P[i].x, P[i].y); g.lineTo(P[i + 1].x, P[i + 1].y); g.stroke();
  }
  // 头：一点亮 + 两只眼
  const h0 = P[1];
  glow(g, h0.x, h0.y, 46 * s, hot, .55 * a * (1 - dim * .5));
  const e = P[3];
  for (const side of [-1, 1]) {
    const ex = e.x + nx(e) * e.w * .62 * side, ey = e.y + ny(e) * e.w * .62 * side;
    g.fillStyle = `rgba(255,255,255,${.95 * a})`; g.beginPath(); g.arc(ex, ey, 1.7 * Math.max(.6, s), 0, Math.PI * 2); g.fill();
  }
  g.restore();

  // --- 泛光 ---
  const gA = (o.glowA ?? 1) * a * (1 - dim * .5);
  if (gA > .01) bloom(g, b => {
    b.lineCap = 'round';
    b.beginPath(); L.forEach(([x, y], i) => (i ? b.lineTo(x, y) : b.moveTo(x, y))); for (let i = R.length - 1; i >= 0; i--) b.lineTo(R[i][0], R[i][1]); b.closePath();
    b.fillStyle = `rgba(${col},.55)`; b.fill();
    b.strokeStyle = `rgba(${hot},.8)`; b.lineWidth = 6 * s; b.beginPath(); P.slice(0, N - 6).forEach((p, i) => (i ? b.lineTo(p.x, p.y) : b.moveTo(p.x, p.y))); b.stroke();
  }, 9 * Math.max(.6, s), .9 * gA);
};

/** 便捷：沿路径游的鱼。path(t) 头的位置；fb 静止时的朝向 */
export const swim = (g: Ctx, t: number, path: (t: number) => V2, o: FishOpt & { fb?: number | ((t: number) => number) } = {}) => {
  const fbf = typeof o.fb === 'function' ? o.fb : () => (o.fb as number) ?? 0;
  drawFish(g, t, path(t), dt => heading(path, t - dt, fbf(t - dt)), { path, ...o });
};
export { clamp };
