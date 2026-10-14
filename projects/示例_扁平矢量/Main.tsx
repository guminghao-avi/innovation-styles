// 示例 · 扁平矢量：珊瑚色圆点从天上掉下来弹三下 → 长大、变黄，沉进地平线成了日落（光芒、倒影错峰弹出）
// → 升起来、缩回圆点，落在字标 "one dot." 的句号上。风格说明：references/风格_07_扁平矢量.md；工具：@styles/flat
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { makeVO, useT, E, lerp, clamp, F, W } from '@kit';
import { FLAT, bounceY, squash, overshoot, stagger } from '@styles/flat';
import timing from './vo.timing.json';
import beats from './beats.json';

const { T } = makeVO(timing as any, beats);
export const DURATION = T('a3.end') + 1.2;
const FLOOR = 760;

export const Main: React.FC = () => {
  const t = useT(), ts = T('sunset'), tb = T('brand');
  // A：弹跳（真物理）
  const b = bounceY(t, FLOOR + 80, 5200, .55), [sx, sy] = squash(b.v, b.hit);
  let x = 520 + Math.min(t, ts) * 170, y = FLOOR - b.y, r = 60, col = FLAT.coral;
  // B：走到中间、长大变黄、沉到地平线下一半
  const g1 = E.inOut(clamp((t - ts) / .7)), sink = E.out(clamp((t - ts - .7) / .9));
  if (t > ts) { x = lerp(x, 960, g1); y = lerp(FLOOR, 560, g1) + sink * 70; r = lerp(60, 190, g1); }
  const yel = clamp((t - ts) / .5);
  col = yel > .5 ? FLAT.yellow : FLAT.coral;
  // C：升起来、缩回去，落到句号的位置
  const g2 = E.inOut(clamp((t - tb) / .8)), DOT = { x: 1388, y: 684 };
  if (t > tb) { x = lerp(960, DOT.x, g2); y = lerp(630, DOT.y, g2) - Math.sin(Math.PI * g2) * 260; r = lerp(190, 30, g2); col = g2 > .5 ? FLAT.coral : FLAT.yellow; }
  const wipeTop = E.out(clamp((t - ts - .1) / .5)) * (1 - 0);           // 上半屏变珊瑚
  const cream = clamp((t - tb - .4) / .5);                                // 最后整屏变奶白（从点扩开）
  const sunsetA = t > ts && t < tb + .6;
  const word = 'one dot';
  const sub = (timing as any).lines.find((l: any) => t >= l.t0 && t < l.t1 + .3);
  return (
    <AbsoluteFill style={{ background: FLAT.blue }}>
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        {sunsetA && <rect x={0} y={0} width={1920} height={630 * wipeTop} fill={FLAT.coral} />}
        {/* 太阳的光芒：一根根圆头短棒，错峰弹出 */}
        {sunsetA && Array.from({ length: 7 }, (_, i) => {
          const a = Math.PI * (1.08 + i * .14), s = overshoot(t - stagger(i, ts + .9, .06)) * (1 - clamp((t - tb) / .3));
          const R0 = 250, L = 70 * s;
          return <line key={i} x1={960 + Math.cos(a) * R0} y1={630 + Math.sin(a) * R0} x2={960 + Math.cos(a) * (R0 + L)} y2={630 + Math.sin(a) * (R0 + L)} stroke={FLAT.yellow} strokeWidth={22} strokeLinecap="round" />;
        })}
        <g transform={`translate(${x} ${y}) scale(${t > ts ? 1 : sx} ${t > ts ? 1 : sy})`}><circle cx={0} cy={t > ts ? 0 : -r} r={r} fill={col} /></g>
        {/* 地平线以下：一整块蓝盖住太阳下半；倒影是三根黄条 */}
        {sunsetA && <rect x={0} y={630} width={1920} height={450} fill={FLAT.blueD} transform={`translate(0 ${lerp(450, 0, E.out(clamp((t - ts - .4) / .5)))})`} />}
        {sunsetA && [0, 1, 2].map(i => { const s = overshoot(t - stagger(i, ts + 1.3, .08)) * (1 - clamp((t - tb) / .3)); const w = [300, 200, 110][i] * s; return <rect key={i} x={960 - w / 2} y={680 + i * 40} width={w} height={16} rx={8} fill={FLAT.yellow} />; })}
        {cream > 0 && <circle cx={DOT.x} cy={DOT.y} r={2300 * E.inOut(cream)} fill={FLAT.cream} />}
        {cream > 0 && <circle cx={DOT.x} cy={DOT.y} r={30} fill={FLAT.coral} />}
      </svg>
      {cream > 0 && <div style={{ position: 'absolute', left: 0, width: W, top: 470, display: 'flex', justifyContent: 'center', fontFamily: F.en, fontWeight: 700, fontSize: 230, color: FLAT.ink, letterSpacing: '-.02em', paddingRight: 70 }}>
        {[...word].map((c, i) => { const s = overshoot(t - stagger(i, tb + .7, .07)); return <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', transform: `translateY(${(1 - s) * 120}px) scale(${Math.max(0, s)})`, transformOrigin: 'bottom' }}>{c}</span>; })}
      </div>}
      {sub && <div style={{ position: 'absolute', bottom: 80, width: W, textAlign: 'center', fontFamily: F.cn, fontWeight: 800, fontSize: 52, color: cream > .5 ? FLAT.ink : FLAT.white, transform: `scale(${overshoot(t - sub.t0 + .05)})` }}
        dangerouslySetInnerHTML={{ __html: sub.text.replace(/\*\*(.+?)\*\*/g, `<span style="color:${FLAT.yellow}">$1</span>`) }} />}
    </AbsoluteFill>
  );
};
