// 示例 · 自渡风（暗夜像素叙事）：选择菜单 → iris 打开夜海孤岛 → HUD 天数飞涨 → 漂来木板（获得物品）→ 片名砸下
// 风格说明：references/风格_01_自渡风.md；工具：@styles/pixel
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Canvas2D, makeVO, useT, k, E, seg, lerp } from '@kit';
import {
  C, GOLD, COLD, COLD_HOT, NIGHT, begin, flush, finish, rock, lampRefl, lightBegin, lightEnd, lampLight, lampFlicker, glow, ring,
  sitSprite, drawSprite, drawLantern, plankAt, flag, HZ, PixelSub, HUD, Menu, Toast, SlamTitle,
} from '@styles/pixel';
import timing from './vo.timing.json';
import beats from './beats.json';

const { T } = makeVO(timing as any, beats);
export const DURATION = T('slam') + 4;
const PX = 5, CAMY = 50;
const CH = { x: 132, y: 195 }, LAMP = { x: 149, y: 189 }, MOON = { x: 284, y: 94, r: 15 };
const irisR = (t: number) => k(t, T('world'), T('world') + .85, E.in) * 600;
const shipX = (t: number) => Math.round(-20 + (t - T('ship')) * 14);
const plankP = (t: number) => E.out(seg(t, T('plank'), T('grab')));

const frame = (t: number) => ({ t, px: PX, camX: 0, camY: CAMY, mood: NIGHT, moon: MOON, iris: { x: CH.x + 6, y: CH.y - 10, r: irisR(t) } });

const drawPixels = (g: CanvasRenderingContext2D, t: number) => {
  const f = frame(t), P = begin(g, f);
  rock(P, 140, 196, 1, { x: LAMP.x, y: LAMP.y, a: lampFlicker(t) });
  lampRefl(P, LAMP.x + 2, 206, 1);
  flush(g, P);
  flag(g, 128, 169, t, .35);
  // 远处的船：一个冷色的小灯，路过、不回头
  const sx = shipX(t);
  if (t > T('ship') && sx < 400) { g.fillStyle = '#1a1e36'; g.fillRect(sx, HZ - 3, 12, 2); g.fillRect(sx + 4, HZ - 6, 4, 3); g.fillStyle = '#cfd8ff'; g.fillRect(sx + 9, HZ - 4, 1, 1); }
  // 漂来的木板
  if (t >= T('plank') && t < T('grab')) plankAt(g, Math.round(lerp(30, CH.x - 18, plankP(t))), 208 + Math.round(Math.sin(t * 3.1) * .8));
  drawSprite(g, sitSprite(t, t >= T('slam') - .4), CH.x, CH.y, { col: '#f6d58a', a: .3, dir: 1 });
  const lp = t >= T('slam') - .4 ? { x: CH.x + 8, y: CH.y - 30 } : LAMP;
  drawLantern(g, lp.x, lp.y, Math.min(1, lampFlicker(t)));
  // 片名砸下：天空里一圈像素冲击波
  const sa = t - T('slam');
  if (sa >= 0 && sa < .8) { ring(g, 192, 100, 44 + sa * 300, C.goldHot, 1 - sa / .8); ring(g, 192, 100, 40 + sa * 200, C.gold, (1 - sa / .8) * .7); }
  finish(g, P);
};
const drawLight = (g: CanvasRenderingContext2D, t: number) => {
  if (irisR(t) <= 0) return;
  const S = lightBegin(g, frame(t));
  const raised = t >= T('slam') - .4, lp = raised ? { x: CH.x + 8, y: CH.y - 30 } : LAMP;
  lampLight(g, S, lp.x, lp.y, lampFlicker(t), Math.max(0, 1 - Math.abs(t - T('slam')) / .4), 214);
  const sx = shipX(t);
  if (t > T('ship') && sx < 400) { const [x, y] = S(sx + 9, HZ - 4); glow(g, x, y, 90, COLD, .3); glow(g, x, y, 12, COLD_HOT, .8); }
  if (t >= T('grab') && t < T('grab') + .5) { const [x, y] = S(CH.x - 10, 206); glow(g, x, y, 200, GOLD, .5 * (1 - (t - T('grab')) / .5)); }
  lightEnd(g);
};

const dayAt = (t: number) => Math.max(1, Math.round(1 + 399 * Math.pow(seg(t, T('roll0'), T('roll1')), 2.2)));
export const Main: React.FC = () => {
  const t = useT();
  const zero = t > T('b2@还是') && t < T('b2@还是') + 1.4 && Math.floor((t - T('b2@还是')) * 5) % 2 === 0;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Canvas2D scale={1 / PX} style={{ imageRendering: 'pixelated' }} draw={drawPixels} />
      <Canvas2D draw={drawLight} />
      <Menu t={t} title="谁能救我？" close={T('close')} opts={[
        { label: '朋友', tag: '已读不回', at: T('opt1') }, { label: '公司', tag: '已被优化', at: T('opt2') },
        { label: '运气', tag: '余额不足', at: T('opt3') }, { label: '？？？', tag: '未解锁', at: 99, lock: true },
      ]} />
      <HUD t={t - T('world') - .9} rows={[
        { label: '状态', value: <span style={{ color: C.cold }}>等待救援</span> },
        { label: '已等待', value: `DAY ${String(dayAt(t)).padStart(4, '0')}` },
        { label: '信号', value: <span>发出 {Math.round(lerp(3, 416, seg(t, T('roll0'), T('roll1'))))}<span style={{ color: C.ui }}> / </span><span style={{ color: zero ? C.redHot : C.text }}>回应 0</span></span> },
      ]} />
      <Toast t={t - T('grab')} icon="plank" name="木板" out={T('slam') - T('grab') - .3} />
      <SlamTitle t={t - T('slam')} text="自渡" sub="FERRY YOURSELF ACROSS" y={290} />
      <PixelSub t={t} lines={(timing as any).lines} />
    </AbsoluteFill>
  );
};
