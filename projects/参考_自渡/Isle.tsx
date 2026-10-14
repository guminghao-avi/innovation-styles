// 第二段：岛上捡木板 → 合成木筏 → 下水就沉 → 捞回来，Lv.2 → 出海（片头之后，同一座岛、同一个夜）
import React from 'react';
import { Canvas2D, k, E, seg, lerp, clamp } from '@kit';
import { T, HERO, standSprite, sitSprite, throwSprite, kneelSprite, rowSprite, swimSprite, drawSprite, drawLantern } from './common';
import { NIGHT, begin, flush, finish, rock, lampRefl, flag, plankAt, pile, raft, oar, splash, bubbles, lightBegin, lightEnd, lampLight, lampFlicker, rnd, u32, type Frame } from './engine';

export const CH = { x: 132, y: 195 }, LAMP = { x: 149, y: 189 }, PILE = { x: 113, y: 201 }, RAFT = { x: 174, y: 206 };
const ISLE = { x: 140, top: 196 };
const MOON = { x: 196, y: 120, r: 12 };
/** 这一段是近景：8 倍像素（240×135），比片头的远景近一些 */
export const VIEW = { px: 8, camY: 102, camX0: 20 };

// ---------- 时间线（全片秒） ----------
const ENV = [0, 1, 2, 3].map(i => T('env1') + i * .55);          // 四封信：扔出去的时刻
const GOLD_ENV = () => T('env5');
const arc = (t: number, t0: number, dur: number, a: [number, number], b: [number, number], h: number) => {
  const p = clamp((t - t0) / dur); return { x: lerp(a[0], b[0], p), y: lerp(a[1], b[1], p) - Math.sin(p * Math.PI) * h, p };
};
/** 收集木板的时刻（木板落进木板堆的那一刻） */
export const PLANK_IN = () => {
  const ts = [T('d1') + 1.1, T('env5') + 2.1, T('d6.end') + .3, T('d7.end') + .1, T('wake') + .1];
  for (let i = 0; i < 7; i++) ts.push(lerp(T('rush'), T('rushEnd'), i / 6));
  return ts;
};
const CRAFT = () => Array.from({ length: 12 }, (_, i) => lerp(T('craft'), T('craftEnd') - .25, i / 11));     // 木板飞上木筏（落定时刻）
const FETCH = () => Array.from({ length: 12 }, (_, i) => lerp(T('fetch'), T('e5.end') + .9, i / 11));
const REBUILD = () => Array.from({ length: 12 }, (_, i) => lerp(T('rebuild'), T('lv2') - .1, i / 11));
const cnt = (ts: number[], t: number) => ts.filter(x => t >= x).length;
export const pileN = (t: number) => {
  if (t < T('craft')) return cnt(PLANK_IN(), t);
  if (t < T('sink')) return 12 - cnt(CRAFT(), t);
  if (t < T('rebuild')) return cnt(FETCH(), t);
  return 12 - cnt(REBUILD(), t);
};
export const hullAt = (t: number) => t < T('crack') ? 100 : t < T('sink') ? Math.round(lerp(100, 18, seg(t, T('crack'), T('sink')))) : t < T('lv2') ? 0 : 200;
/** 镜头：跟着木筏出去，再回来 */
const camX = (t: number) => {
  const out = k(t, T('launch') + .3, T('sink'), E.inOut), back = k(t, T('swim') + .5, T('ashore'), E.inOut);
  const leave = k(t, T('board') + .8, T('fIn'), E.in);
  return VIEW.camX0 + Math.round(lerp(0, 56, out * (1 - back)) + leave * 70);
};
/** 木筏位置 */
const raftAt = (t: number) => {
  const go = k(t, T('launch') + .35, T('crack') + .9, E.inOut), leave = k(t, T('board') + .5, T('fIn') + .5, E.in);
  const bob = Math.round(Math.sin(t * 2.6) * .7);
  return { x: Math.round(RAFT.x + 52 * go + 90 * leave), y: RAFT.y + bob };
};
type Pose = { kind: 'stand' | 'sit' | 'throw' | 'kneel' | 'row' | 'swim' | 'hop' | 'sleep'; x: number; y: number; k?: number; up?: boolean };
const heroAt = (t: number): Pose => {
  const r = raftAt(t);
  // 出海
  if (t >= T('board')) {
    const h = arc(t, T('board'), .4, [CH.x + 20, CH.y], [r.x + 4, r.y - 1], 8);
    return h.p < 1 ? { kind: 'hop', x: h.x, y: h.y } : { kind: 'row', x: r.x + 4, y: r.y - 1 };
  }
  if (t >= T('rebuild')) return { kind: 'kneel', x: CH.x + 14, y: CH.y + 2, up: Math.floor(t * 5) % 2 === 0 };
  if (t >= T('ashore')) return { kind: 'stand', x: CH.x, y: CH.y };
  if (t >= T('sink')) {
    const fall = arc(t, T('sink'), .35, [r.x + 4, r.y - 1], [r.x + 8, r.y + 5], 6);
    if (fall.p < 1) return { kind: 'hop', x: fall.x, y: fall.y };
    const sw = k(t, T('swim'), T('ashore') - .2, E.inOut);
    return { kind: 'swim', x: Math.round(lerp(r.x + 8, 168, sw)), y: r.y + 4 };
  }
  if (t >= T('launch')) {
    const h = arc(t, T('launch'), .35, [CH.x, CH.y], [RAFT.x + 4, RAFT.y - 1], 9);
    return h.p < 1 ? { kind: 'hop', x: h.x, y: h.y } : { kind: 'row', x: r.x + 4, y: r.y - 1 };
  }
  if (t >= T('craft') - .3 && t < T('craftEnd') + .2) return { kind: 'kneel', x: CH.x, y: CH.y, up: Math.floor(t * 6) % 2 === 0 };
  if (t >= T('sleep') && t < T('wake')) return { kind: 'sleep', x: CH.x, y: CH.y };
  if (t >= T('learn') - .2 && t < T('d7.end') + .3) return { kind: 'sit', x: CH.x, y: CH.y };
  for (const e of [...ENV, GOLD_ENV()]) { const a = t - e; if (a > -.28 && a < .3) return { kind: 'throw', x: CH.x, y: CH.y, k: a < 0 ? 0 : 1 }; }
  for (const p of PLANK_IN()) { const a = t - p; if (a > -.15 && a < .35 && t < T('craft')) return { kind: 'kneel', x: CH.x, y: CH.y, up: false }; }
  return { kind: 'stand', x: CH.x, y: CH.y };
};

const frame = (t: number): Frame => {
  const sleepDim = k(t, T('sleep'), T('sleep') + .6) * (1 - k(t, T('wake') - .4, T('wake') + .2));
  const close = T('fIn') - .9;
  return {
    t, px: VIEW.px, camX: camX(t), camY: VIEW.camY, mood: NIGHT, moon: MOON, stars: 1 - sleepDim * .5,
    waveSpeed: 1 + 9 * Math.sin(Math.PI * seg(t, T('rush') - .3, T('rushEnd') + .3)) + 6 * Math.sin(Math.PI * seg(t, T('sleep'), T('wake'))),
    cloudSpeed: .5 + 6 * Math.sin(Math.PI * seg(t, T('sleep'), T('wake'))),
    iris: t > close ? { x: raftAt(t).x + 12, y: raftAt(t).y - 10, r: 560 * (1 - k(t, close, T('fIn'), E.in)) } : undefined,
  };
};

const drawPixels = (g: CanvasRenderingContext2D, t: number) => {
  const f = frame(t), P = begin(g, f), lo = Math.min(1, lampFlicker(t));
  const r = raftAt(t), hero = heroAt(t), onRaft = t >= T('board');
  const lamp = onRaft ? { x: r.x + 20, y: r.y - 7 } : LAMP;
  rock(P, ISLE.x, ISLE.top, 1, onRaft ? undefined : { x: lamp.x, y: lamp.y, a: lo });
  lampRefl(P, lamp.x + 1, onRaft ? r.y + 4 : 210, lo);
  // 沉下去的信（在水面以下，偏蓝、越来越暗）
  const SUNK = [u32('#5a6aa0'), u32('#3a4678')];
  ENV.forEach((e, i) => {
    const land = e + .7, a = t - land; if (a < 0 || a > 1.6) return;
    const x = 186 + i * 13, y = 201 + i * 2 + Math.round(a * 5);
    for (let dx = 0; dx < 5; dx++) for (let dy = 0; dy < 4; dy++) P.put(x + dx, y + dy, SUNK[a > .8 ? 1 : 0]);
  });
  flush(g, P);

  flag(g, ISLE.x - 12, ISLE.top - 27, t, .67);
  pile(g, PILE.x, PILE.y, pileN(t));
  if (!onRaft) drawLantern(g, lamp.x, lamp.y, lo);
  // 信：扔出去的弧线
  ENV.forEach((e, i) => {
    const a = arc(t, e, .7, [CH.x + 12, CH.y - 20], [186 + i * 13, 200 + i * 2], 14);
    if (t >= e && a.p < 1) { g.fillStyle = '#e6e9f2'; g.fillRect(Math.round(a.x), Math.round(a.y), 5, 4); g.fillStyle = '#9aa0b8'; g.fillRect(Math.round(a.x) + 1, Math.round(a.y) + 1, 1, 1); g.fillRect(Math.round(a.x) + 3, Math.round(a.y) + 1, 1, 1); g.fillRect(Math.round(a.x) + 2, Math.round(a.y) + 2, 1, 1); }
    splash(g, 187 + i * 13, 200 + i * 2, (t - e - .7) / .5, .5);
    bubbles(g, 188 + i * 13, 203 + i * 2, (t - e - .9) / 1);
  });
  // 改过一版的信：金色，落水后变成一块木板漂回来
  const ge = GOLD_ENV(), ga = arc(t, ge, .8, [CH.x + 12, CH.y - 20], [214, 213], 18);
  if (t >= ge && ga.p < 1) { g.fillStyle = '#f2c14e'; g.fillRect(Math.round(ga.x), Math.round(ga.y), 5, 4); g.fillStyle = '#fff0b8'; g.fillRect(Math.round(ga.x) + 1, Math.round(ga.y) + 1, 3, 2); }
  if (t >= ge + .8 && t < ge + 2.1) {
    const p = k(t, ge + 1.0, ge + 2.1, E.inOut), x = lerp(212, PILE.x + 2, p), y = lerp(212, PILE.y - 4, p) - Math.sin(p * Math.PI) * 30;
    plankAt(g, x, y);
    splash(g, 214, 212, (t - ge - .8) / .5, .6, '#f2c14e');
  }
  // 学习：书
  if (t >= T('learn') && t < T('d7.end') + .3) { g.fillStyle = '#e6e9f2'; g.fillRect(CH.x + 10, CH.y - 11, 4, 2); g.fillStyle = '#e8344a'; g.fillRect(CH.x + 10, CH.y - 9, 4, 1); }
  // 冲刺：木板一块块从海里飞上来
  PLANK_IN().slice(5).forEach((p, i) => {
    const from: [number, number] = i % 2 ? [40 + i * 9, 216 + (i % 3) * 4] : [230 + i * 8, 214 + (i % 3) * 5];
    const a = arc(t, p - .55, .55, from, [PILE.x + 2, PILE.y - 4], 26);
    if (t >= p - .9 && t < p - .55) plankAt(g, from[0], from[1] + Math.sin(t * 6) * .6);
    if (t >= p - .55 && a.p < 1) plankAt(g, a.x, a.y);
  });
  // 合成：木板从木板堆飞上木筏
  const raftN = t < T('craft') ? 0 : t < T('sink') ? cnt(CRAFT(), t) : t < T('rebuild') ? 0 : cnt(REBUILD(), t);
  CRAFT().forEach((c, i) => { if (t > T('sink')) return; const a = arc(t, c - .35, .35, [PILE.x + 2, PILE.y - 4], [RAFT.x + i * 2, RAFT.y], 22); if (t >= c - .35 && a.p < 1) plankAt(g, a.x, a.y); });
  REBUILD().forEach((c, i) => { const a = arc(t, c - .3, .3, [PILE.x + 2, PILE.y - 4], [RAFT.x + i * 2, RAFT.y], 22); if (t >= c - .3 && a.p < 1) plankAt(g, a.x, a.y); });
  // 木筏
  const brk = k(t, T('sink') - .05, T('sink') + .9, E.out);
  const wob = t >= T('crack') && t < T('sink') ? Math.round(Math.sin(t * 22) * 2 * seg(t, T('crack'), T('sink'))) : 0;
  if (t < T('sink') + 1) raft(g, r.x, r.y + Math.round(brk * 3), t, { n: t < T('sink') ? raftN : 12, lv: 1, brk, tilt: wob });
  else if (t >= T('rebuild')) raft(g, r.x, r.y, t, { n: t >= T('lv2') ? 12 : raftN, lv: t >= T('lv2') ? 2 : 1 });
  // 散在海上的木板 → 捞回来
  if (t >= T('sink') + .8) FETCH().forEach((c, i) => {
    const fx = r.x - 6 + i * 6 + Math.round(Math.sin(i * 2.1) * 6), fy = 210 + (i % 4) * 3 + Math.round(Math.sin(t * 3 + i) * .7);
    if (t < c - .5) { if (t > T('sink') + .8 + i * .03) plankAt(g, fx, fy); return; }
    const a = arc(t, c - .5, .5, [fx, fy], [PILE.x + 2, PILE.y - 4], 24); if (a.p < 1) plankAt(g, a.x, a.y);
  });
  // 船体裂开：木屑
  if (t >= T('crack') && t < T('sink') + .6) for (let i = 0; i < 3; i++) { const a = (t - T('crack') - i * .4) / .5; if (a > 0 && a < 1) splash(g, r.x + 6 + i * 6, r.y, a, .4, '#9a6a3e'); }
  splash(g, r.x + 10, r.y + 2, (t - T('sink') - .2) / .7, 1.4);
  // 主角
  const rim = { col: '#f6d58a', a: .18 + .2 * lo, dir: 1 as const };
  if (hero.kind === 'row') {
    const ph = t >= T('crack') ? (t * .6) % 1 : (t * 1.1) % 1, rs = rowSprite(t, ph);
    drawSprite(g, rs.s, hero.x, hero.y, rim);
    oar(g, hero.x + rs.hand[0], hero.y + rs.hand[1], ph, r.y + 3);
  } else if (hero.kind === 'swim') {
    drawSprite(g, swimSprite(t), hero.x, hero.y, rim);
    if (Math.floor(t * 4) % 2) { g.fillStyle = '#8a96d0'; g.fillRect(hero.x - 3, hero.y + 1, 3, 1); g.fillRect(hero.x + 10, hero.y + 1, 3, 1); }
  } else if (hero.kind === 'hop') drawSprite(g, sitSprite(t), Math.round(hero.x), Math.round(hero.y), rim);
  else if (hero.kind === 'throw') drawSprite(g, throwSprite(t, hero.k ?? 0), hero.x, hero.y, rim);
  else if (hero.kind === 'kneel') {
    drawSprite(g, kneelSprite(t, !!hero.up), hero.x, hero.y, rim);
    if (!hero.up && t >= T('rebuild') && Math.floor(t * 10) % 2) { g.fillStyle = '#fff0b8'; g.fillRect(hero.x + 16, hero.y - 6, 1, 1); g.fillRect(hero.x + 18, hero.y - 8, 1, 1); }
  } else if (hero.kind === 'sit' || hero.kind === 'sleep') drawSprite(g, sitSprite(t), hero.x, hero.y, rim);
  else drawSprite(g, standSprite(t), hero.x, hero.y, rim);
  // 刚爬上岸：往下滴水
  if (t >= T('ashore') && t < T('ashore') + 2.2) for (let i = 0; i < 4; i++) { const a = ((t - T('ashore')) * 1.6 + i * .25) % 1; g.fillStyle = '#8a96d0'; g.fillRect(CH.x + 2 + i * 2, CH.y - 14 + Math.round(a * 14), 1, 1); }
  if (onRaft) drawLantern(g, lamp.x, lamp.y, lo);
  finish(g, P);
};

const drawLight = (g: CanvasRenderingContext2D, t: number) => {
  const f = frame(t), S = lightBegin(g, f), r = raftAt(t), onRaft = t >= T('board');
  const lamp = onRaft ? { x: r.x + 20, y: r.y - 7 } : LAMP;
  const sleepDim = 1 - .45 * k(t, T('sleep'), T('sleep') + .6) * (1 - k(t, T('wake') - .4, T('wake') + .2));
  lampLight(g, S, lamp.x, lamp.y, lampFlicker(t) * sleepDim, 0, onRaft ? r.y + 4 : 214);
  // 金色的信、木板落进木板堆时的一下闪光
  const ge = GOLD_ENV(); if (t >= ge && t < ge + 2.1) { const ga = arc(t, ge, .8, [CH.x + 12, CH.y - 20], [214, 213], 18); const [x, y] = S(ga.x + 2, ga.y + 1); lampLight(g, () => [x, y], 0, 0, .5 * (1 - seg(t, ge + 1.4, ge + 2.1))); }
  for (const p of [...PLANK_IN(), ...FETCH()]) { const a = t - p; if (a >= 0 && a < .4) { const [x, y] = S(PILE.x + 6, PILE.y - 6); lampLight(g, () => [x, y], 0, 0, .6 * (1 - a / .4)); } }
  if (t >= T('lv2') && t < T('lv2') + .8) { const [x, y] = S(r.x + 12, r.y); lampLight(g, () => [x, y], 0, 0, 1.2 * (1 - (t - T('lv2')) / .8)); }
  lightEnd(g);
};

export const Isle: React.FC = () => {
  const t0 = T('dIn');
  return (
    <>
      <Canvas2D scale={1 / VIEW.px} style={{ imageRendering: 'pixelated' }} draw={(g, t) => drawPixels(g, t + t0)} />
      <Canvas2D draw={(g, t) => drawLight(g, t + t0)} />
    </>
  );
};
export { heroAt, raftAt, camX as isleCamX };
