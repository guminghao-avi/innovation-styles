// 示例 · 纸艺手绘：剪纸立体书场景 + 定格（一拍二）+ 墨线小人。日历页"今天"→ 纸条一张张摞成塔（明天、下周…）
// → 小人扭头"躲开" → 只做两分钟：塔一张张飞走 → 片名纸片落下。风格说明：references/风格_04_纸艺手绘.md；工具：@styles/paper
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Canvas2D, makeVO, useT, lerp, clamp, rnd, F, E } from '@kit';
import { P, stepT, beat, overlayPaper, cutEdge, paperShape, hillPts, circlePts, rectPts, inkLine, inkPerson, Sticker, PaperSub, PaperTitle } from '@styles/paper';
import timing from './vo.timing.json';
import beats from './beats.json';

const { T } = makeVO(timing as any, beats);
export const DURATION = T('title') + 4.2;
const LABELS = ['今天', '明天', '下周', '下个月', '下下个月', '月底再说', '明年吧', '有空再说', '等状态好', '以后'];
const arrive = (i: number) => i === 0 ? T('pile') : i < 4 ? T('a2') + .5 + (i - 1) * .7 : T('b1') + (i - 4) * .55;
const leave = (i: number) => T('go') + .3 + (LABELS.length - 1 - i) * .16;      // 从顶上一张张飞走（"今天"那张留下）
const PX = 1220, PY = 860;

const draw = (g: CanvasRenderingContext2D, t: number) => {
  const st = stepT(t), b = beat(t) >> 1;                 // b：每两拍换一次形（线条 boil 慢一点更像手绘）
  const cam = lerp(0, 18, E.inOut(clamp(st / DURATION)));   // 很慢的推镜，按层视差
  g.fillStyle = P.sky; g.fillRect(0, 0, 1920, 1080);
  // 太阳：纸剪的，光芒一拍转一格
  g.save(); g.translate(1560 - cam * .2, 230);
  g.rotate(beat(t, 4) * .06);
  for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); paperShape(g, cutEdge([96, -14, 150, 0, 96, 14], 40 + i, 1.5), P.mustard, { shadow: .18, lift: .5 }); }
  g.restore();
  paperShape(g, cutEdge(circlePts(1560 - cam * .2, 230, 86, 40), 41, 1.6), P.sun, { shadow: .25 });
  // 云：两朵，按拍漂
  [[300, 190, 1], [980, 140, .8]].forEach(([x, y, s], i) => {
    const cx = x + st * 8 * (i + 1) - cam * .3, pts: number[] = [];
    for (let j = 0; j < 40; j++) { const a = j / 40 * Math.PI * 2, r = (1 + .28 * Math.sin(a * 5 + i)) * 70 * s; pts.push(cx + Math.cos(a) * r * 1.8, y + Math.min(Math.sin(a) * r * .8, 22 * s)); }
    paperShape(g, cutEdge(pts, 50 + i, 1.4), '#fbf6ea', { shadow: .16, lift: .7 });
  });
  // 远山 → 近山 → 地面（越近投影越重、视差越大）
  paperShape(g, cutEdge(hillPts(640, 120, .0042, 1.3, -60 - cam * .5, 1980 - cam * .5), 60, 2), P.sage2, { shadow: .22, lift: .8 });
  paperShape(g, cutEdge(hillPts(760, 90, .0061, 4.1, -60 - cam, 1980 - cam), 61, 2), P.sage, { shadow: .26, lift: 1 });
  paperShape(g, cutEdge(hillPts(880, 18, .01, 2.2, -60 - cam * 1.5, 1980 - cam * 1.5), 62, 2.5), P.terra, { shadow: .3, lift: 1.3 });
  // 纸条塔：每张一条"任务"，到了就"啪"地摞上去（定格：先高一点再落定）
  LABELS.forEach((lab, i) => {
    const a = stepT(t - arrive(i)); if (a < 0) return;
    const l = stepT(t - leave(i)); if (i > 0 && l > .5) return;
    const drop = a < .09 ? -60 : a < .17 ? 8 : 0;
    let x = PX - cam * 1.5 + (rnd(i, 1) - .5) * 26, y = PY - 18 - i * 46 + drop, rot = (rnd(i, 2) - .5) * .12;
    if (i > 0 && l > 0) { x += l * 1600; y -= l * 500; rot += l * 3; }                      // 飞走
    if (i === 0 && t < T('pile')) return;
    paperShape(g, cutEdge(rectPts(x - 150, y - 22, 300, 44, rot, 6), 70 + i, 1.4), i === 0 ? '#fff6e2' : P.paper, { shadow: .3, lift: .7 });
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = i === 0 ? '#c4532f' : P.ink; g.font = `${i === 0 ? 34 : 30}px ${F.fun}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lab, 0, 2);
    g.restore();
  });
  // 开场：日历页"今天"，红笔圈一下，然后缩成塔底那一张
  if (t < T('pile') + .2) {
    const fly = clamp(stepT(t - T('pile') + .5) / .5), cx = lerp(960, PX, fly), cy = lerp(400, PY - 18, fly), s = lerp(1, .5, fly);
    g.save(); g.translate(cx, cy); g.scale(s, s); g.rotate(-.03);
    paperShape(g, cutEdge(rectPts(-200, -170, 400, 340, 0, 6), 80, 1.6), P.paper, { shadow: .32, lift: 1.4 });
    paperShape(g, cutEdge(rectPts(-200, -170, 400, 80, 0, 6), 81, 1.4), P.terra, { shadow: 0 });
    g.fillStyle = P.paper; g.font = `40px ${F.fun}`; g.textAlign = 'center'; g.fillText('计划表', 0, -116);
    g.fillStyle = P.ink; g.font = `96px ${F.fun}`; g.fillText('今天', 0, 60);
    const circ = clamp((t - .5) / .6), pts: number[] = [];
    for (let j = 0; j <= 40 * circ; j++) { const a = -2 + j / 40 * Math.PI * 2.15; pts.push(Math.cos(a) * 140, 30 + Math.sin(a) * 78); }
    if (pts.length > 4) inkLine(g, pts, b, { w: 7, col: '#c4532f', jit: 1.2, seed: 9 });
    g.restore();
  }
  // 小人：站在地上；"躲开"时扭头看向另一边、冒汗；"两分钟"时笑着抬手
  const hide = t >= T('hide') && t < T('go'), go = t >= T('go');
  const px = 700 - cam * 1.5 + (hide ? -40 : 0), mood = go ? 'smile' : hide ? 'worry' : t > T('a2') ? 'worry' : 'calm';
  inkPerson(g, px, 880, b, { s: 1.15, mood, arm: go ? 1 : 0 });
  if (hide) { for (let j = 0; j < 2; j++) inkLine(g, [px + 58 + j * 16, 640 + j * 10, px + 62 + j * 16, 660 + j * 10], b, { w: 5, col: P.blue, seed: 20 + j }); }
  overlayPaper(g, .6);
};

export const Main: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: P.sky }}>
      <Canvas2D draw={draw} />
      <Sticker t={t - T('hide')} x={470} y={430} text="躲！" col={P.rose} rot={-10} out={T('go') - T('hide') - .4} />
      <Sticker t={t - T('go') - .2} x={960} y={330} text="开工！" col={P.mustard} rot={8} out={T('title') - T('go') - .6} />
      <PaperTitle t={t - T('title')} text="纸上计划" sub="PAPER PLANS" y={300} />
      <PaperSub t={t} lines={(timing as any).lines} />
    </AbsoluteFill>
  );
};
