// 示例 · 形变动画：一滴墨落下 → 变成咖啡杯 → 变成落日 → 变成海鸥飞走 → 缩成一个点，成了 "morphe." 的句号
// 风格说明：references/风格_10_形变动画.md；工具：@styles/morph
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { makeVO, useT, k, E, lerp, clamp, F, W, spring } from '@kit';
import { Poly, resample, align, morph, toD, drop, cup, sun, gull, circle } from '@styles/morph';
import timing from './vo.timing.json';
import beats from './beats.json';

const { T } = makeVO(timing as any, beats);
export const DURATION = T('a4.end') + 1;
const N = 180, C = { x: 960, y: 500 };
const mix = (a: string, b: string, u: number) => '#' + [1, 3, 5].map(i => Math.round(lerp(parseInt(a.slice(i, i + 2), 16), parseInt(b.slice(i, i + 2), 16), clamp(u))).toString(16).padStart(2, '0')).join('');
// 关键形状（先重采样、再依次对齐起点）
const KEY: { p: Poly; col: string; bg: string }[] = (() => {
  const raw = [
    { p: drop(C.x, C.y + 40, 105), col: '#17171c', bg: '#f4ece0' },
    { p: cup(C.x - 40, C.y, 150), col: '#6b3e26', bg: '#f4ece0' },
    { p: sun(C.x, C.y, 150), col: '#ff6a2a', bg: '#ffe2bd' },
    { p: gull(C.x, C.y, 190), col: '#ffffff', bg: '#3a5bd9' },
    { p: circle(1302, 692, 24), col: '#ff6a2a', bg: '#f4ece0' },
  ];
  const out = raw.map(r => ({ ...r, p: resample(r.p, N) }));
  for (let i = 1; i < out.length; i++) out[i].p = align(out[i - 1].p, out[i].p);
  return out;
})();

export const Main: React.FC = () => {
  const t = useT();
  const at = [T('m1'), T('m2'), T('m3'), T('logo') + .4], dur = .95;
  let i = 0; while (i < at.length && t > at[i]) i++;
  const u = i === 0 ? 0 : clamp((t - at[i - 1]) / dur);
  const A = KEY[Math.max(0, i - 1)], B = KEY[i] ?? KEY[KEY.length - 1];
  const gullAt = (tt: number) => { const fly = Math.max(0, tt - at[2] - dur); return align(KEY[3].p, resample(gull(C.x + fly * 200, C.y - fly * 70, 190 - fly * 25, Math.sin((tt - at[2]) * 9)), N)); };
  let pts = i === 0 ? KEY[0].p : i === 3 ? morph(A.p, gullAt(t), u) : i === 4 ? morph(gullAt(at[3]), B.p, u) : morph(A.p, B.p, u);
  if (i === 3 && u >= 1) pts = gullAt(t);   // 海鸥：边扇翅膀边飞
  if (i === 0) {             // 墨滴从上面落下来（第 0 秒的事件）
    const y = lerp(-200, 0, E.in(clamp(t / .5))) - (t > .5 ? Math.sin(Math.min(1, (t - .5) / .25) * Math.PI) * 18 : 0);
    pts = KEY[0].p.map(([x, yy]) => [x, yy + y]);
  }
  const col = i === 0 ? A.col : mix(A.col, B.col, u), bg = i === 0 ? A.bg : mix(A.bg, B.bg, u);
  const logo = t - T('logo') - 1.2;
  const sub = (timing as any).lines.find((l: any) => t >= l.t0 && t < l.t1 + .25);
  return (
    <AbsoluteFill style={{ background: bg }}>
      <svg width={1920} height={1080} style={{ position: 'absolute' }}><path d={toD(pts)} fill={col} /></svg>
      {/* 咖啡的热气：三根会扭的线（杯子成形后出现，变太阳时散掉） */}
      {((i === 1 && u >= 1) || (i === 2 && u < .3)) && <svg width={1920} height={1080} style={{ position: 'absolute', opacity: i === 2 ? 1 - u / .3 : k(t, at[0] + dur, at[0] + dur + .4) }}>{[0, 1, 2].map(j => <path key={j} d={`M${C.x - 100 + j * 60} ${C.y - 170} q 20 -40 0 -80 q -20 -40 0 -80`} stroke="#6b3e26" strokeWidth={8} fill="none" strokeLinecap="round" transform={`translate(${Math.sin(t * 4 + j) * 8} 0)`} />)}</svg>}
      {logo > 0 && <div style={{ position: 'absolute', top: 545, left: 0, width: W, textAlign: 'center', paddingRight: 70, fontFamily: F.en, fontWeight: 700, fontSize: 190, color: '#17171c', letterSpacing: '-.02em' }}>
        {[...'morphe'].map((c, j) => { const s = spring(logo - j * .06, 2.4, .5); return <span key={j} style={{ display: 'inline-block', transform: `translateY(${(1 - s) * 80}px)`, opacity: Math.min(1, s * 2) }}>{c}</span>; })}
        <div style={{ fontFamily: F.serif, fontSize: 34, letterSpacing: '.6em', marginTop: 10, opacity: k(logo, .5, 1) }}>一形 · 万象</div>
      </div>}
      {sub && <div style={{ position: 'absolute', bottom: 70, width: W, textAlign: 'center', fontFamily: F.serif, fontWeight: 600, fontSize: 50, color: i === 3 && u > .5 && t < T('logo') + .6 ? '#ffffff' : '#17171c', opacity: k(t, sub.t0, sub.t0 + .3) }}
        dangerouslySetInnerHTML={{ __html: sub.text.replace(/\*\*(.+?)\*\*/g, '<span style="color:#ff6a2a">$1</span>') }} />}
    </AbsoluteFill>
  );
};
