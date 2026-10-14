// 第三、四段：暴雨里的木筏（积水 → 流走）→ 雨停，划出去很远 → 别的岛上也亮着灯 → 抛绳、开口 → 灯连成航道 → 天亮
import React from 'react';
import { Canvas2D, k, E, seg, lerp, clamp } from '@kit';
import { T, HERO, OTHERS, sitSprite, standSprite, kneelSprite, rowSprite, drawSprite, drawLantern, miniPerson } from './common';
import { NIGHT, STORM, DAWN, begin, flush, finish, rock, lampRefl, raft, oar, line, rain, splash, lightBegin, lightEnd, lampLight, lampFlicker, glow, ring, rnd, u32, type Frame } from './engine';

// ---------- 两个机位 ----------
// 暴雨：6 倍像素的中景（320×180），镜头跟着木筏横移
// 远景：雨停后"才发现——"，切到 5 倍像素（384×216），能看到一片海上的很多岛
export const isWide = (t: number) => t >= T('g2') + .25;
const STORM_V = { px: 6, camY: 112, raftSX: 130, raftY: 222 };
const WIDE_V = { px: 5, camY: 50, raftSX: 96, raftY: 204 };

/** 划船速度（世界像素/秒）→ 积分成距离 */
const speed = (t: number) => {
  if (t < T('f2')) return lerp(14, 0, seg(t, T('f1'), T('f2')));
  if (t < T('row')) return 0;
  if (t < T('g2')) return lerp(4, 30, k(t, T('row'), T('g1'), E.inOut));
  return 0;
};
export const travel = (t: number) => { let s = 0; for (let x = T('fIn'); x < t; x += .05) s += speed(x) * Math.min(.05, t - x); return s; };
export const kmAt = (t: number) => 3.2 + travel(t) / 60;

// 积水：话砸下来就涨，"流过去"就排掉
export const WORDS = ['焦虑', '委屈', '自我怀疑', '来不及', '比不过别人', '又搞砸了'];
export const wordT = (i: number) => T('words') + [0, .45, .95, 1.6, 2.15, 2.6][i];
export const waterAt = (t: number) => {
  const hits = WORDS.filter((_, i) => t >= wordT(i) + .45).length;
  const fill = Math.min(87, Math.round(hits * 14.5 + 6 * seg(t, T('rain0'), T('f3'))));
  return Math.round(fill * (1 - k(t, T('flow'), T('dry'), E.inOut)));
};
export const rainAt = (t: number) => clamp(seg(t, T('rain0'), T('rain0') + 1.4)) * (1 - .7 * seg(t, T('dry'), T('row'))) * (1 - k(t, T('clear'), T('clear') + 2.2));
const stormAt = (t: number) => k(t, T('f1') - 1.2, T('f1') + 1.4, E.inOut) * (1 - k(t, T('clear') - .3, T('clear') + 2.6, E.inOut));
const FLASHES = () => [T('f1.end') + .3, T('f3') + .5, T('f3@砸下') - .1, T('f4') + 1.4];
const flashAt = (t: number) => FLASHES().reduce((m, f) => { const a = t - f; return a < 0 || a > .6 ? m : Math.max(m, (a < .08 ? 1 : a < .16 ? .3 : a < .24 ? .8 : 0) * Math.exp(-a * 3)); }, 0);
const dawnAt = (t: number) => k(t, T('dawn'), T('dawn') + 3.2, E.inOut);

// ---------- 远景里的岛（相对镜头的屏幕坐标；远处小、近处大） ----------
type Isle = { x: number; top: number; s: number; pal: number; lamp: number; who: 'stand' | 'kneel' | 'mini' | 'miniSit' };
const ISLES: Isle[] = [
  { x: 214, top: 190, s: .55, pal: 0, lamp: 0, who: 'stand' },
  { x: 300, top: 182, s: .4, pal: 1, lamp: 1, who: 'kneel' },
  { x: 40, top: 181, s: .32, pal: 2, lamp: 2, who: 'mini' },
  { x: 352, top: 177, s: .26, pal: 3, lamp: 3, who: 'miniSit' },
  { x: 150, top: 178, s: .26, pal: 4, lamp: 4, who: 'mini' },
  { x: 258, top: 176, s: .22, pal: 2, lamp: 5, who: 'miniSit' },
];
const FAR = Array.from({ length: 22 }, (_, i) => ({ x: Math.round(8 + rnd(i, 51) * 368), y: 173 + Math.floor(rnd(i, 52) * 3), at: rnd(i, 53) }));
const lampOn = (t: number, i: number) => t >= T('lamps') + i * .32;
/** 邻居（第一座岛上的人）划着自己的木筏过来 */
const neighbor = (t: number) => {
  const go = k(t, T('neighbor') + .6, T('rope') - .2, E.inOut);
  return { on: t >= T('neighbor') + .6, x: Math.round(lerp(196, 128, go)), y: 200 + Math.round(Math.sin(t * 2.4 + 1) * .6) };
};
/** 灯连成航道：从我们的灯 → 邻居 → 远处的岛 → 天边 */
const PATH = (): [number, number][] => [[WIDE_V.raftSX + 22, WIDE_V.raftY - 4], [134, 197], [173, 184], [268, 178], [322, 175], [372, 173]];

// ---------- 帧 ----------
const view = (t: number) => (isWide(t) ? WIDE_V : STORM_V);
const camXAt = (t: number) => (isWide(t) ? 0 : Math.round(134 + travel(t)));
const frame = (t: number): Frame => {
  const v = view(t), st = stormAt(t), dw = dawnAt(t);
  const irisIn = k(t, T('fIn'), T('fIn') + .8, E.out), irisOut = 1 - k(t, T('you') - .6, T('you'), E.in);
  const ir = Math.min(irisIn, irisOut);
  return {
    t, px: v.px, camX: camXAt(t), camY: v.camY,
    mood: dw > 0 ? NIGHT : NIGHT, mood2: dw > 0 ? DAWN : STORM, mix: dw > 0 ? dw : st,
    moon: dw > .6 ? undefined : isWide(t) ? { x: 290, y: 92, r: 14 } : { x: 250, y: 140, r: 12 },
    sun: dw > .15 ? { x: 300, y: Math.round(lerp(184, 160, k(t, T('dawn') + .5, T('you'), E.out))), r: 11 } : undefined,
    clouds: st * .95, cloudSpeed: .5 + st * 2.5, stars: (1 - st) * (1 - dw), chop: st, waveSpeed: 1 + st * 1.5 + (isWide(t) ? 0 : speed(t) * .05),
    flash: flashAt(t),
    iris: ir < 1 ? { x: camXAt(t) + v.raftSX + 12, y: v.raftY - 10, r: 560 * ir } : undefined,
  };
};

const drawPixels = (g: CanvasRenderingContext2D, t: number) => {
  const f = frame(t), P = begin(g, f), v = view(t), wide = isWide(t), cx = f.camX, lo = Math.min(1, lampFlicker(t));
  const water = waterAt(t) / 100, sinkY = Math.round(water * 3);
  const rx = cx + v.raftSX, ry = v.raftY + sinkY + Math.round(Math.sin(t * (2.6 + f.chop! * 3)) * (.7 + f.chop! * 1.4));
  if (!wide) rock(P, 140, 196, 1);                                  // 身后那座岛，越划越远
  if (wide) {
    ISLES.forEach((I, i) => rock(P, cx + I.x, I.top, I.s, undefined, i * 13, dawnAt(t) > .5));
    ISLES.forEach((I, i) => { if (lampOn(t, I.lamp)) lampRefl(P, cx + I.x + 4 * I.s, I.top + Math.round(12 * I.s) + 1, lo * .7, I.s); });
  }
  lampRefl(P, rx + 21, ry + 4, lo);
  flush(g, P);

  // —— 远景：岛上的人和灯 ——
  if (wide) {
    FAR.forEach((d, i) => { if (t >= T('g8') + d.at * 1.6) { g.fillStyle = Math.floor(t * 4 + i) % 5 ? '#f2c14e' : '#fff0b8'; g.fillRect(cx + d.x, d.y, 1, 1); } });
    ISLES.forEach((I, i) => {
      const x = cx + I.x, y = I.top - 1, P0 = OTHERS[I.pal], on = lampOn(t, I.lamp);
      if (I.who === 'stand' && !neighbor(t).on) drawSprite(g, standSprite(t, P0), x - 6, y, { col: '#f6d58a', a: on ? .3 : 0, dir: -1 });
      if (I.who === 'kneel') drawSprite(g, kneelSprite(t, t >= T('build') && Math.floor(t * 4 + 1) % 2 === 0, P0), x - 8, y, { col: '#f6d58a', a: on ? .3 : 0, dir: 1 });
      if (I.who === 'mini' || I.who === 'miniSit') miniPerson(g, x - 2, y, P0, I.who === 'miniSit');
      const lx = I.who === 'stand' ? x + 4 : I.who === 'kneel' ? x + 8 : x + 2, ly = I.who === 'stand' ? y - 8 : I.who === 'kneel' ? y - 6 : y - 3;
      if (I.who === 'stand' || I.who === 'kneel') { if (!(I.who === 'stand' && neighbor(t).on)) drawLantern(g, lx, ly, on ? lo : 0); }
      else { g.fillStyle = on ? '#f2c14e' : '#3a2a18'; g.fillRect(lx, ly, 1, 2); }
      if (on && t - (T('lamps') + I.lamp * .32) < .5) ring(g, lx + 1, ly + 2, 2 + (t - T('lamps') - I.lamp * .32) * 40, '#f2c14e', 1 - (t - T('lamps') - I.lamp * .32) / .5);
      // 第二座岛上的人在敲木筏
      if (I.who === 'kneel' && t >= T('build')) { raft(g, x + 10, y + 4, t, { n: Math.min(12, 4 + Math.floor((t - T('build')) * 2)) }); if (Math.floor(t * 8) % 2) { g.fillStyle = '#fff0b8'; g.fillRect(x + 8, y - 6, 1, 1); } }
    });
    // 邻居划过来
    const nb = neighbor(t);
    if (nb.on) {
      raft(g, cx + nb.x, nb.y, t, {});
      const ph = (t * 1.1 + .3) % 1, rs = rowSprite(t, ph, OTHERS[0]);
      const moving = t < T('rope') - .2;
      drawSprite(g, moving ? rs.s : sitSprite(t, false, OTHERS[0]), cx + nb.x + 18, nb.y - 1, { col: '#f6d58a', a: .3, dir: -1 }, true);
      if (moving) oar(g, cx + nb.x + 18 - rs.hand[0], nb.y - 1 + rs.hand[1], ph, nb.y + 3);
      drawLantern(g, cx + nb.x + 1, nb.y - 7, lo);
    }
    // 绳：先抛出去（一段弧），再拉直
    const r0 = T('rope');
    if (t >= r0) {
      const p = k(t, r0, r0 + .5, E.out), a = [cx + nb.x + 6, nb.y] as const, b = [rx + 22, ry] as const;
      const ex = lerp(a[0], b[0], p), ey = lerp(a[1], b[1], p) - Math.sin(p * Math.PI) * 10;
      const sag = t < r0 + .5 ? 0 : 3 * (1 - k(t, r0 + .5, r0 + 1, E.out));
      const M = 10; let px0 = a[0], py0 = a[1];
      for (let i = 1; i <= M; i++) { const u = i / M, x = lerp(a[0], ex, u), y = lerp(a[1], ey, u) + Math.sin(u * Math.PI) * sag; line(g, px0, py0, x, y, '#e0ac3e'); px0 = x; py0 = y; }
    }
    // 航道：灯和灯之间连起一条金色虚线
    const pts = PATH(), p0 = T('path');
    for (let i = 0; i < pts.length - 1; i++) {
      const a = t - p0 - i * .32; if (a < 0) continue;
      const q = Math.min(1, a / .32), [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      line(g, cx + x0, y0, cx + lerp(x0, x1, q), lerp(y0, y1, q), '#f2c14e', 4);
    }
  }
  // —— 我们的木筏 ——
  raft(g, rx, ry, t, { lv: 2 });
  // 积水：木筏上一层水；流走时从两边淌下去
  if (water > .02) { g.fillStyle = '#3e4a80'; g.fillRect(rx, ry - 1, 24, 1); if (water > .5) g.fillRect(rx + 2, ry - 2, 20, 1); }
  if (t >= T('flow') && t < T('dry') + .3) for (let i = 0; i < 6; i++) {
    const a = ((t - T('flow')) * 2.4 + i / 6) % 1, side = i % 2 ? -1 : 25;
    g.fillStyle = i % 3 ? '#6a76b4' : '#a8b4e8'; g.fillRect(rx + side, ry + Math.round(a * 6), 1, 2);
  }
  const hunched = !wide && t >= T('f2') && t < T('row');
  const rowing = !hunched && (wide ? t < T('g2') : true);
  const ph = (t * (wide ? 0 : 1.1)) % 1;
  if (rowing && !wide) { const rs = rowSprite(t, ph); drawSprite(g, rs.s, rx + 4, ry - 1, { col: '#f6d58a', a: .3, dir: 1 }); oar(g, rx + 4 + rs.hand[0], ry - 1 + rs.hand[1], ph, ry + 3); }
  else drawSprite(g, sitSprite(t), rx + 4, ry - 1, { col: '#f6d58a', a: .3, dir: 1 });
  drawLantern(g, rx + 20, ry - 7, lo);
  // 话砸在木筏上溅起的水
  WORDS.forEach((_, i) => splash(g, rx + 6 + (i % 3) * 6, ry, (t - wordT(i) - .45) / .5, .8, '#8a96c8'));
  // 雨
  rain(g, P, rainAt(t));
  finish(g, P);
};

const drawLight = (g: CanvasRenderingContext2D, t: number) => {
  const f = frame(t), S = lightBegin(g, f), v = view(t), wide = isWide(t), cx = f.camX, L = lampFlicker(t);
  const water = waterAt(t) / 100, rx = cx + v.raftSX, ry = v.raftY + Math.round(water * 3);
  const ls = wide ? .8 : 1;
  lampLight(g, S, rx + 20, ry - 7, L * (1 - .35 * stormAt(t)), 0, ry + 4, ls);
  if (t >= T('row') && t < T('row') + .7) lampLight(g, S, rx + 20, ry - 7, 0, 1 - (t - T('row')) / .7);
  if (wide) {
    ISLES.forEach(I => {
      if (!lampOn(t, I.lamp)) return;
      const x = cx + I.x + (I.who === 'stand' ? 4 : I.who === 'kneel' ? 8 : 2), y = I.top - 1 + (I.who === 'stand' ? -8 : I.who === 'kneel' ? -6 : -3);
      if (I.who === 'stand' && neighbor(t).on) return;
      lampLight(g, S, x - 1, y - 2, L * .9, Math.max(0, 1 - (t - T('lamps') - I.lamp * .32) / .5) * .6, I.top + 12 * I.s, I.s + .1);
    });
    const nb = neighbor(t); if (nb.on) lampLight(g, S, cx + nb.x + 1, nb.y - 7, L, 0, nb.y + 4, .8);
    FAR.forEach(d => { if (t >= T('g8') + d.at * 1.6) { const [x, y] = S(cx + d.x, d.y); glow(g, x, y, 34, GOLDS, .5); } });
    // 回应：金光一闪
    const rp = t - T('reply'); if (rp >= 0 && rp < .8) lampLight(g, S, rx + 20, ry - 7, 0, 1 - rp / .8);
    // 航道的光：沿着虚线一串光点
    const pts = PATH(), p0 = T('path');
    for (let i = 0; i < pts.length - 1; i++) {
      const a = t - p0 - i * .32; if (a < 0) continue;
      for (let j = 0; j < 6; j++) { const u = j / 6; if (u > a / .32) break; const [x, y] = S(cx + lerp(pts[i][0], pts[i + 1][0], u), lerp(pts[i][1], pts[i + 1][1], u)); glow(g, x, y, 60, GOLDS, .3); }
    }
  }
  lightEnd(g);
};
const GOLDS = '255,196,96';

export const Voyage: React.FC = () => {
  const t0 = T('fIn');
  return (
    <>
      <Canvas2D scale={1 / STORM_V.px} style={{ imageRendering: 'pixelated' }} draw={(g, t) => { if (!isWide(t + t0)) drawPixels(g, t + t0); }} />
      <Canvas2D scale={1 / WIDE_V.px} style={{ imageRendering: 'pixelated' }} draw={(g, t) => { if (isWide(t + t0)) drawPixels(g, t + t0); }} />
      <Canvas2D draw={(g, t) => drawLight(g, t + t0)} />
    </>
  );
};
export const voyageView = (t: number) => ({ ...view(t), camX: camXAt(t), water: waterAt(t), raftY: view(t).raftY + Math.round(waterAt(t) / 100 * 3) });
