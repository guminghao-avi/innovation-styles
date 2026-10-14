// 镜头七 + 尾声：双鱼。拉远 —— 光鱼尾巴上那根线一路延伸，另一头系着一条暗淡、蜷着的玫瑰色鱼；两条鱼落进双鱼座的星图里。
// 它总游向别人（琥珀色的光）；"你受伤了"——绳子一紧，它第一次掉头，游回去；玫瑰色的鱼亮起来，两条鱼绕在一起（全片最亮）。
// → "那我呢？" "我今天，开心吗？" → 片名
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Shader, Canvas2D, useT, useScene, k, E, lerp, rnd, seg, clamp, F, Reveal } from '@kit';
import { T, G, glow, orb, drawFish, heading, kpath, mixc, PEARL, PEARL_HOT, ROSE, ROSE_HOT, AMBER, AMBER_HOT, V2 } from './common';
import { Readout, Title } from './ui';
import SKY from './shaders/sky.frag';

type Ctx = CanvasRenderingContext2D;
// 星图平面坐标（度；x 向右 = 向西，y 向下 = 向南），赤经 0.6h / 赤纬 +13° 为中心
const ST: Record<string, [number, number, number]> = {
  β: [22.42, 9.18, 4.5], γ: [19.2, 9.72, 3.7], θ: [16.57, 6.62, 4.3], ι: [13.65, 7.37, 4.1], λ: [13.15, 11.22, 4.5], κ: [16.82, 11.74, 4.9],
  ω: [8.94, 6.14, 4.0], δ: [-3.08, 5.41, 4.4], ε: [-6.56, 5.11, 4.3], ζ: [-9.19, 5.42, 5.2], μ: [-13.2, 6.86, 4.8], ν: [-15.95, 7.51, 4.4],
  ξ: [-18.93, 9.81, 4.6], α: [-20.96, 10.24, 3.8], ο: [-16.91, 3.84, 4.3], η: [-13.52, -2.35, 3.6], χ: [-8.64, -8.03, 4.7],
  φ: [-9.19, -11.58, 4.7], υ: [-10.6, -14.26, 4.8], τ: [-8.7, -17.09, 4.5],
};
const LINES = 'β-γ γ-θ θ-ι ι-λ λ-κ κ-γ ι-ω ω-δ δ-ε ε-ζ ζ-μ μ-ν ν-ξ ξ-α α-ο ο-η η-χ χ-φ φ-υ υ-τ'.split(' ').map(s => s.split('-'));
const CORD_B = ['α', 'ξ', 'ν', 'μ', 'ζ', 'ε', 'δ', 'ω', 'ι'];   // 绳结 → 玫瑰色的鱼
const CORD_A = ['η', 'ο', 'α'];                                  // 青色的鱼 → 绳结
const RC: V2 = [16.6, 9.0];                                      // 玫瑰色的鱼蜷在西鱼的圆环里
const OTHERS: V2[] = [[-1.5, -13.5], [1.8, -15.5], [4.2, -12.6], [2.6, -10.6], [6.2, -15.0]];
const FL = 7.5;                                                  // 鱼身长（度）

type Cam = { cx: number; cy: number; s: number };
const cam = (t: number): Cam => {
  const c = kpath([
    [T('g1') - 1.6, -9.6, -10.5], [T('g2') + 1.8, .5, -2.6], [T('g4'), 6, 2], [T('g4.end') - .3, 14.5, 7.6], [T('g5') + 1.6, 3, -1.5],
    [T('g6'), 1, -3], [T('g7') + 1.2, 13.6, 6.6], [T('g7.end'), 15.4, 8.1], [T('h3.end') + 9, 15.6, 8.3],
  ])(t);
  const lg = kpath([
    [T('g1') - 1.6, Math.log(110), 0], [T('g2') + 1.8, Math.log(28), 0], [T('g4'), Math.log(33), 0], [T('g4.end') - .3, Math.log(78), 0], [T('g5') + 1.6, Math.log(29), 0],
    [T('g6'), Math.log(29), 0], [T('g7') + 1.2, Math.log(55), 0], [T('g7.end'), Math.log(74), 0], [T('h3'), Math.log(78), 0], [T('h3.end') + 9, Math.log(58), 0],
  ])(t)[0];
  return { cx: c[0], cy: c[1], s: Math.exp(lg) };
};
const SY = 450;
const sp = (c: Cam, x: number, y: number): V2 => [960 + (x - c.cx) * c.s, SY + (y - c.cy) * c.s];

// 青色的鱼（他）：头的路径（度）
let _a: ((t: number) => V2) | null = null;
const fishA = (t: number): V2 => {
  if (!_a) _a = kpath([
    [T('g1') - 3, -9.4, -11], [T('g2') + 2, -9.6, -14.2], [T('g3') + 1.6, -5.5, -14.6], [T('g4') + 1, -2.6, -13.6], [T('g4.end'), -.5, -12.8],
    [T('g5@你受伤了') - .2, .2, -12.6], [T('g5@你受伤了') + .9, 1.2, -11.0], [T('g6') + .4, 3.2, -6.5], [T('g6.end'), 8.5, 1.5],
    [T('g7') + 1.4, 12.4, 6.4], [T('g7@算进去'), 15.0, 7.0],
  ]);
  return _a(t);
};
// 重逢之后：两条鱼绕着同一个中心游（像太极）
const loopC: V2 = [15.6, 8.3];
const together = (t: number) => k(t, T('g7@算进去') - .4, T('g7@算进去') + 1.4, E.inOut);
const orbit = (t: number, ph: number): V2 => { const w = .55, r = 2.1; return [loopC[0] + Math.cos(t * w + ph) * r, loopC[1] + Math.sin(t * w + ph) * r * .8]; };
const headA = (t: number): V2 => { const u = together(t), a = fishA(t), o = orbit(t, 0); return [lerp(a[0], o[0], u), lerp(a[1], o[1], u)]; };
// 玫瑰色的鱼（他自己）：蜷在圆环里，慢慢地转
const headB = (t: number): V2 => {
  const u = together(t), base: V2 = [RC[0] + Math.cos(t * .12 + 2) * 1.0, RC[1] + Math.sin(t * .12 + 2) * .7], o = orbit(t, Math.PI);
  return [lerp(base[0], o[0], u), lerp(base[1], o[1], u)];
};

const star = (g: Ctx, x: number, y: number, mag: number, a: number, col = '225,232,255') => {
  if (a <= .003) return;
  const b = Math.pow(2.512, (4.6 - mag) * .6);
  glow(g, x, y, 40 * b, col, .3 * a); glow(g, x, y, 7 * Math.sqrt(b), '255,255,255', 1 * a);
};
const smooth = (g: Ctx, pts: V2[]) => {
  g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; g.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
  const l = pts[pts.length - 1]; g.lineTo(l[0], l[1]);
};

export const Pisces: React.FC = () => {
  const a0 = useScene().a, t = useT() + a0, c0 = cam(t);
  const on = k(t, T('g1') - 1.6, T('g1') + .2, E.inOut) * (1 - k(t, T('h3.end') + 7.4, T('h3.end') + 8.7, E.inOut));
  const titleT = T('h3.end') + 1.2;
  const dimAll = 1 - .78 * k(t, titleT - 1.2, titleT + .8, E.inOut);
  const kA = ST.α, kAp = sp(c0, kA[0], kA[1]);
  return <AbsoluteFill style={{ opacity: on }}>
    <AbsoluteFill style={{ opacity: dimAll }}>
      <Shader frag={G(SKY)} scale={.5} u={{ uCam: [c0.cx, c0.cy, c0.s, SY], uExpo: 1.2, uStars: 1, uHaze: 1.2 }} />
      <Canvas2D draw={(g, tl) => {
        const tt = tl + a0, c = cam(tt), P = (n: string) => sp(c, ST[n][0], ST[n][1]);
        g.globalCompositeOperation = 'lighter';
        const fig = k(tt, T('g1') + .4, T('g2') + .6, E.inOut);
        const peak = k(tt, T('g7@算进去') - .3, T('g7@算进去') + .6) * (1 - .6 * k(tt, T('g7.end'), T('h1') + 1));
        // 星座连线 + 星
        LINES.forEach(([a, b], i) => {
          const q = k(tt, T('g1') + .4 + i * .06, T('g1') + 1.4 + i * .06, E.inOut); if (q <= 0) return;
          const [x0, y0] = P(a), [x1, y1] = P(b), L = Math.hypot(x1 - x0, y1 - y0), gap = Math.min(10, L * .2);
          const ux = (x1 - x0) / L, uy = (y1 - y0) / L;
          g.strokeStyle = `rgba(${PEARL},${.3 * fig})`; g.lineWidth = 1.2; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x0 + ux * gap, y0 + uy * gap); g.lineTo(x0 + ux * (gap + (L - 2 * gap) * q), y0 + uy * (gap + (L - 2 * gap) * q)); g.stroke();
        });
        Object.keys(ST).forEach((n, i) => { const [x, y] = P(n); star(g, x, y, ST[n][2], fig * (.8 + .2 * Math.sin(tt * 2.3 + i)) * (1 + peak * .5)); });
        // 别人：几粒琥珀色的光
        const oth = k(tt, T('g3') - .3, T('g3') + 1) * (1 - .7 * k(tt, T('g6'), T('g7')));
        OTHERS.forEach(([x, y], i) => { const [sx, sy] = sp(c, x + .3 * Math.sin(tt * .5 + i), y + .25 * Math.cos(tt * .6 + i * 2)); orb(g, sx, sy, c.s / 60, AMBER, AMBER_HOT, oth * (.75 + .25 * Math.sin(tt * 1.7 + i)), .2); });
        // 两条鱼
        const fsA = c.s * FL / 300, fsB = c.s * 6.4 / 300;
        const hA = headA(tt), hB = headB(tt);
        const angA = (tq: number) => { const u = together(tq); const a = heading(q => { const p = fishA(q); return [p[0] * 40, p[1] * 40]; }, tq, -Math.PI / 2, .2), o = heading(q => { const p = orbit(q, 0); return [p[0] * 40, p[1] * 40]; }, tq, 0, .2); let d = o - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * u; };
        const angB = (tq: number) => { const u = together(tq); const a = tq * .12 + 2 + Math.PI / 2 + .2, o = heading(q => { const p = orbit(q, Math.PI); return [p[0] * 40, p[1] * 40]; }, tq, 0, .2); let d = o - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * u; };
        const lit = k(tt, T('g7') + .6, T('g7@算进去') + .8, E.inOut);
        const hurt = Math.max(0, Math.sin((tt - T('g5@你受伤了')) * Math.PI / .95)) ** 6 * k(tt, T('g5@你受伤了') - .1, T('g5@你受伤了') + .2) * (1 - k(tt, T('g6'), T('g6') + 1));
        const roseA = k(tt, T('g1') + .5, T('g2')) * lerp(.75, 1, lit) * (1 + .5 * hurt + .25 * k(tt, T('g4@你自己'), T('g4@你自己') + 1) * (1 - lit));
        // 绳：青鱼尾 → η → ο → α（绳结）→ … → 玫瑰鱼尾
        const tailOf = (h: V2, ang: number, len: number): V2 => [h[0] - Math.cos(ang) * len, h[1] - Math.sin(ang) * len];
        const tA = sp(c, ...tailOf(hA, angA(tt - .3), FL * .97)), tB = sp(c, ...tailOf(hB, angB(tt - .3) - 1.2 * (1 - lit), 6.4 * .8));
        const cordPts: V2[] = [tA, ...CORD_A.map(P), ...CORD_B.map(P), tB];
        const ca = k(tt, T('g1') - 1.6, T('g1') + .4) * lerp(1, .12, together(tt));
        for (let pass = 0; pass < 2; pass++) {
          g.strokeStyle = pass ? `rgba(${mixc(PEARL, ROSE, .4)},${(.5 + .4 * k(tt, T('g2'), T('g2') + 1) * (1 - k(tt, T('g3'), T('g3') + 1))) * ca})` : `rgba(${PEARL},${.06 * ca})`;
          g.lineWidth = pass ? 1.2 : 6; smooth(g, cordPts); g.stroke();
        }
        // 绳结 Alrescha
        const kn = k(tt, T('g2') - .2, T('g2') + .8) * (1 - k(tt, T('g3') + 1, T('g3') + 2));
        if (kn > 0) { const [x, y] = P('α'); glow(g, x, y, 90, PEARL, .35 * kn); glow(g, x, y, 10, PEARL_HOT, kn); }
        // 一阵光沿着绳从玫瑰鱼流向青鱼（"你受伤了"那一下，绳子一紧）
        if (hurt > .01 || peak > .01) {
          const pulseT = hurt > .01 ? (tt - T('g5@你受伤了')) / 1.2 : (tt - T('g7@算进去') + .3) / 1.4;
          const u = clamp(1 - pulseT);
          const idx = u * (cordPts.length - 1), i0 = Math.floor(idx), f = idx - i0, p0 = cordPts[i0], p1 = cordPts[Math.min(cordPts.length - 1, i0 + 1)];
          glow(g, lerp(p0[0], p1[0], f), lerp(p0[1], p1[1], f), 70, ROSE, .6 * (1 - Math.abs(pulseT - .5) * 2) * (hurt > .01 ? 1 : peak));
        }
        // 玫瑰色的鱼：蜷着，暗；亮起来时舒展
        drawFish(g, tt, sp(c, ...hB), dt => angB(tt - dt) * 1, {
          s: fsB, col: ROSE, hot: ROSE_HOT, a: roseA, curl: lerp(-1.4, -.15, lit), amp: lerp(.12, .3, lit), freq: lerp(.4, .8, lit), seed: 2,
          dim: lerp(.5, 0, lit), sparks: lerp(0, .5, lit), glowA: lerp(.5, 1.3, lit),
        });
        // 青色的鱼
        drawFish(g, tt, sp(c, ...hA), dt => angA(tt - dt), { s: fsA, a: 1, amp: .32, freq: .85, sparks: .45, path: q => sp(c, ...headA(q)) });
        // 高潮：两束光在一起
        if (peak > .01) {
          const m = sp(c, ...loopC);
          glow(g, m[0], m[1], 1100, mixc(ROSE, PEARL, .5), .4 * peak); glow(g, m[0], m[1], 380, ROSE_HOT, .45 * peak); glow(g, m[0], m[1], 120, '255,255,255', .5 * peak);
          const ft = tt - T('g7@算进去') + .1;
          if (ft > 0 && ft < 1.4) { g.strokeStyle = `rgba(${ROSE_HOT},${.5 * (1 - ft / 1.4)})`; g.lineWidth = 2; g.beginPath(); g.ellipse(m[0], m[1], 80 + ft * 900, (80 + ft * 900) * .8, 0, 0, Math.PI * 2); g.stroke(); }
          for (let i = 0; i < 60; i++) {
            const age = (tt - T('g7@算进去') + .2) * (.6 + .6 * rnd(i, 1)); if (age < 0 || age > 3) continue;
            const an = rnd(i, 2) * 6.283, r = age * (180 + 260 * rnd(i, 3));
            glow(g, m[0] + Math.cos(an) * r, m[1] + Math.sin(an) * r * .8, 8, i % 2 ? ROSE_HOT : PEARL_HOT, .8 * (1 - age / 3));
          }
        }
        // "那我呢？"
        const nq = k(tt, T('h2') - .1, T('h2') + 1.2) * (1 - k(tt, T('h2.end') + .3, T('h3') + .6));
        if (nq > 0) {
          g.globalCompositeOperation = 'source-over';
          g.save(); g.font = `500 96px ${F.serif}`; g.textAlign = 'center'; g.textBaseline = 'middle'; (g as any).letterSpacing = '30px';
          g.filter = nq < .95 ? `blur(${((1 - nq) * 14).toFixed(1)}px)` : 'none';
          g.shadowColor = `rgba(${ROSE},.6)`; g.shadowBlur = 40; g.fillStyle = `rgba(255,226,236,${nq})`; g.fillText('那我呢？', 975, 210); g.restore();
        }
      }} />
      <Readout x={kAp[0] - 30} y={kAp[1] - 250} label="绳结 · 双鱼座 α" value="Alrescha" sub="阿拉伯语里的「绳子」"
        a={k(t, T('g2') + .2, T('g2') + 1.2) * (1 - k(t, T('g3') + .8, T('g3') + 1.8))} size={50} />
    </AbsoluteFill>
    {t > titleT - .2 && <Title t={t - titleT} />}
    {void Reveal}
  </AbsoluteFill>;
};
