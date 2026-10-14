// 示例 · 潜水戴夫风：水面登场卡 → 下潜，红鱼一点点褪成灰（海水先吃掉红光）→ 打开手电，红色回来 → GET! 图鉴卡 + 金币
// 风格说明：references/风格_潜水戴夫风.md；工具：@styles/diver
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Shader, Canvas2D, GLSL, makeVO, useT, k, E, keys, lerp, clamp, rnd, W } from '@kit';
import { OCEAN, Grid, diver, fish, kelp, coral, INK, O2Bar, DepthGauge, Dialog, CatchCard, CoinPop, IntroCard, Exclaim } from '@styles/diver';
import timing from './vo.timing.json';
import beats from './beats.json';

const { T } = makeVO(timing as any, beats);
export const DURATION = T('c2.end') + 1.2;
const PPM = 40, FLOOR = 30;
const mixHex = (a: string, b: string, u: number) => '#' + [1, 3, 5].map(i => Math.round(lerp(parseInt(a.slice(i, i + 2), 16), parseInt(b.slice(i, i + 2), 16), clamp(u))).toString(16).padStart(2, '0')).join('');

// ---------- 时间线 ----------
const diverAt = (t: number) => keys<{ x: number; d: number }>(t, [
  [0, { x: -4, d: 1.3 }], [T('dive'), { x: -3.4, d: 1.3 }], [T('deep') + .6, { x: -1.5, d: 12 }], [T('b2.end'), { x: 0, d: 21.5 }], [T('spot'), { x: .4, d: 22.5 }], [DURATION, { x: .8, d: 22.8 }],
], E.film, []);
const camAt = (t: number) => { const p = diverAt(t); return { x: p.x + 2.2, d: Math.max(.6, p.d + .4 - 1.2 * k(t, 0, T('dive'))) * 1 }; };
const fishAt = (t: number) => {
  const p = diverAt(t), g = E.inOut(clamp((t - T('grab') + .2) / .45));
  const free = { x: p.x + 6.5 + Math.sin(t * .7) * .4, d: p.d - .4 + Math.sin(t * 1.3) * .25 };
  return { x: lerp(free.x, p.x + 1.6, g), d: lerp(free.d, p.d + .3, g), got: g };
};
const torchOn = (t: number) => k(t, T('torch'), T('torch') + .15);
/** 红光损失：越深越灰；手电照到就回来 */
const redLoss = (d: number, lit: number) => clamp((d - 3) / 9) * (1 - lit);
const O2 = (t: number) => lerp(1, .74, clamp(t / DURATION));

const portrait = (() => { const s = new Grid(); s.ellipse(0, 0, 9, 8.5, '#f2b48c').ellipse(0, -4, 9.5, 5, '#2f56a8').rect(-1, -2, 10, 6, '#e8eef5').rect(0, -1, 8, 4, '#7fe3ff').set(2, -1, '#ffffff').rect(-9, 3, 4, 2, '#e89a7a'); return s.outline(INK); })();

const drawPixels = (g: CanvasRenderingContext2D, t: number) => {
  g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.clearRect(0, 0, 384, 216);
  const c = camAt(t), P = (x: number, d: number): [number, number] => [Math.round(192 + (x - c.x) * PPM / 5), Math.round(108 + (d - c.d) * PPM / 5)];
  // 海床上的海草、珊瑚
  for (let i = 0; i < 14; i++) {
    const x = -14 + i * 2.3 + rnd(i, 1) * 1.2, [sx, sy] = P(x, FLOOR + .3); if (sx < -30 || sx > 414 || sy > 250) continue;
    if (i % 3 === 1) coral(['#ff7a8a', '#ffb347', '#c86bff'][i % 3 === 1 ? (i >> 1) % 3 : 0], i).draw(g, sx, sy);
    else kelp(t, 26 + Math.round(rnd(i, 2) * 18), i % 2 ? '#2f9e6a' : '#3bb27a', i).draw(g, sx, sy);
  }
  // 一群小黄鱼横穿
  for (let i = 0; i < 9; i++) {
    const x = 14 - (t - 3.5) * 2.4 + (i % 3) * 1.1 + rnd(i, 3) * .8, d = 8.5 + Math.floor(i / 3) * .9 + rnd(i, 4) * .5 + Math.sin(t * 2 + i) * .15;
    const [sx, sy] = P(x, d); if (sx < -20 || sx > 404) continue;
    fish(t, mixHex('#ffd23f', '#c9c46a', redLoss(d, 0) * .5), '#fff3b0', .7, i).draw(g, sx, sy, true);
  }
  // 目标：红鱼
  const f = fishAt(t), lit = torchOn(t), loss = redLoss(f.d, lit);
  if (f.got < 1) { const [sx, sy] = P(f.x, f.d); fish(t, mixHex('#e8463c', '#4d5566', loss), mixHex('#ffb08a', '#6d7484', loss), 1.25, 3).draw(g, sx, sy, Math.sin(t * .7) < 0); }
  // 潜水员（深了以后，黄色的边也会发灰）
  const p = diverAt(t), [dx, dy] = P(p.x, p.d), bob = Math.round(Math.sin(t * 2.2) * 1);
  diver(t, { trim: mixHex('#ffd23f', '#a9b86e', redLoss(p.d, lit) * .6), torch: lit > 0, kick: t < T('dive') ? 3 : 7 }).draw(g, dx, dy + bob);
  if (f.got >= 1) fish(t, '#e8463c', '#ffb08a', 1.25, 3).draw(g, dx + 18, dy + bob + 6);
  // 气泡：从面镜冒出来，往上走
  for (let i = 0; i < 6; i++) {
    const a = ((t * .9 + i / 6) % 1), [bx, by] = [dx + 16 + Math.round(Math.sin(a * 9 + i) * 2), dy - 8 - Math.round(a * 46)];
    if (a < .4) { g.fillStyle = '#c8f6ff'; g.fillRect(bx, by, 1, 1); } else { g.fillStyle = INK; g.fillRect(bx - 1, by - 2, 3, 1); g.fillRect(bx - 1, by + 2, 3, 1); g.fillRect(bx - 2, by - 1, 1, 3); g.fillRect(bx + 2, by - 1, 1, 3); g.fillStyle = '#c8f6ff'; g.fillRect(bx - 1, by - 1, 3, 3); g.fillStyle = '#ffffff'; g.fillRect(bx - 1, by - 1, 1, 1); }
  }
};
const drawLight = (g: CanvasRenderingContext2D, t: number) => {
  const c = camAt(t), S = (x: number, d: number): [number, number] => [960 + (x - c.x) * PPM, 540 + (d - c.d) * PPM];
  g.globalCompositeOperation = 'lighter';
  // 海雪：慢慢往下飘的小白点
  for (let i = 0; i < 70; i++) {
    const x = (rnd(i, 1) * 2100 + Math.sin(t * .3 + i) * 20) % 2100 - 90, y = ((rnd(i, 2) * 1200 + t * (8 + 14 * rnd(i, 3)) - c.d * PPM * .6) % 1200 + 1200) % 1200 - 60;
    g.fillStyle = `rgba(220,250,255,${.25 + .35 * rnd(i, 4)})`; g.fillRect(x, y, 3, 3);
  }
  // 手电：一道暖白的光锥（把红色照回来）
  const lit = torchOn(t);
  if (lit > 0) {
    const p = diverAt(t), [hx, hy] = S(p.x + 1.7, p.d + .15), f = fishAt(t), [fx, fy] = S(f.x, f.d);
    const ang = Math.atan2(fy - hy, fx - hx), L = 900, spread = .2;
    const gr = g.createLinearGradient(hx, hy, hx + Math.cos(ang) * L, hy + Math.sin(ang) * L);
    gr.addColorStop(0, `rgba(255,248,215,${.55 * lit})`); gr.addColorStop(.5, `rgba(255,240,200,${.18 * lit})`); gr.addColorStop(1, 'rgba(255,240,200,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(hx, hy);
    g.lineTo(hx + Math.cos(ang - spread) * L, hy + Math.sin(ang - spread) * L); g.lineTo(hx + Math.cos(ang + spread) * L, hy + Math.sin(ang + spread) * L); g.closePath(); g.fill();
    const rg = g.createRadialGradient(hx, hy, 0, hx, hy, 60); rg.addColorStop(0, `rgba(255,250,230,${.9 * lit})`); rg.addColorStop(1, 'rgba(255,250,230,0)'); g.fillStyle = rg; g.fillRect(hx - 60, hy - 60, 120, 120);
  }
};

export const Main: React.FC = () => {
  const t = useT(), c = camAt(t), p = diverAt(t), f = fishAt(t), [fx, fy] = [960 + (f.x - c.x) * PPM, 540 + (f.d - c.d) * PPM];
  return (
    <AbsoluteFill style={{ background: '#0b2a5e' }}>
      <Shader frag={GLSL.noise + GLSL.color + OCEAN} scale={.5} u={{ uDepth: c.d, uPPM: PPM, uFloor: FLOOR, uCamX: c.x }} />
      <Canvas2D scale={.2} style={{ imageRendering: 'pixelated' }} draw={drawPixels} />
      <Canvas2D draw={drawLight} />
      <O2Bar t={t - T('dive') + .2} v={O2(t)} />
      <DepthGauge t={t - T('dive') + .1} depth={Math.max(0, p.d)} />
      <IntroCard t={t - T('intro')} name="阿岛" tag="一个只想准时下班的潜水员" dur={2.6} />
      <Exclaim t={t - T('torch') - .35} x={fx} y={fy - 30} />
      <CatchCard t={t - T('card')} grid={fish(0, '#e8463c', '#ffb08a', 2.2, 3)} name="金目鲷" sub="红光在水下最先消失" stars={3} x={W / 2 + 120} y={430} />
      <CoinPop t={t - T('card') - .9} x={W / 2 + 470} y={430} text="+120" />
      <Dialog t={t} lines={(timing as any).lines} name={l => (l.id === 'c2' ? '阿岛' : '旁白')} portrait={portrait} />
    </AbsoluteFill>
  );
};
