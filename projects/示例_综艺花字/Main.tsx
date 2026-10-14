// 示例 · 综艺花字：一只猫，三种心情，三套花字 —— 震惊（黄黑描边、抖）→ 耍赖（粉色逐字波浪）→ 开心（彩虹大字砸下来 + 闪光 + 心）
// 每次花字出来，画面"推一下"（综艺式的急推）。风格说明：references/风格_19_综艺花字.md；工具：@styles/variety
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { makeVO, useT, k, E, F, W, lerp } from '@kit';
import { Huazi, Sticker, PRESETS } from '@styles/variety';
import timing from './vo.timing.json';
import beats from './beats.json';

const { T } = makeVO(timing as any, beats);
export const DURATION = T('a3.end') + 1;

const Cat: React.FC<{ mood: 'calm' | 'shock' | 'pout' | 'happy'; t: number }> = ({ mood, t }) => {
  const ink = '#3a2a2a', fur = '#f6b066', furD = '#e08a3c';
  const eye = (cx: number) => mood === 'shock' ? <g key={cx}><circle cx={cx} cy={300} r={46} fill="#fff" stroke={ink} strokeWidth={8} /><circle cx={cx} cy={300} r={10} fill={ink} /></g>
    : mood === 'pout' ? <path key={cx} d={cx < 400 ? `M${cx - 30} 280 L${cx + 20} 300 L${cx - 30} 320` : `M${cx + 30} 280 L${cx - 20} 300 L${cx + 30} 320`} stroke={ink} strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    : mood === 'happy' ? <path key={cx} d={`M${cx - 32} 310 Q ${cx} 260 ${cx + 32} 310`} stroke={ink} strokeWidth={12} fill="none" strokeLinecap="round" />
    : <g key={cx}><ellipse cx={cx} cy={300} rx={22} ry={30} fill={ink} /><circle cx={cx + 7} cy={290} r={7} fill="#fff" /></g>;
  const mouth = mood === 'shock' ? <ellipse cx={400} cy={410} rx={30} ry={40} fill="#7a2a3a" stroke={ink} strokeWidth={8} />
    : mood === 'pout' ? <path d="M360 405 Q 380 390 400 405 Q 420 390 440 405" stroke={ink} strokeWidth={10} fill="none" strokeLinecap="round" />
    : mood === 'happy' ? <path d="M350 390 Q 400 470 450 390 Z" fill="#ff7a8a" stroke={ink} strokeWidth={8} strokeLinejoin="round" />
    : <path d="M370 395 Q 385 410 400 395 Q 415 410 430 395" stroke={ink} strokeWidth={8} fill="none" strokeLinecap="round" />;
  const tilt = mood === 'pout' ? Math.sin(t * 10) * 6 : mood === 'happy' ? Math.sin(t * 5) * 3 : 0;
  return (
    <svg width={800} height={700} viewBox="0 0 800 700" style={{ position: 'absolute', left: 560, top: 230, transform: `rotate(${tilt}deg)`, transformOrigin: '50% 80%' }}>
      <path d="M120 600 Q 400 380 680 600 L 700 760 L 100 760 Z" fill={fur} stroke={ink} strokeWidth={10} />
      <path d="M170 220 L 200 40 L 330 150 Z" fill={fur} stroke={ink} strokeWidth={10} strokeLinejoin="round" /><path d="M630 220 L 600 40 L 470 150 Z" fill={fur} stroke={ink} strokeWidth={10} strokeLinejoin="round" />
      <ellipse cx={400} cy={320} rx={270} ry={230} fill={fur} stroke={ink} strokeWidth={10} />
      <path d="M330 120 Q 400 100 470 120 L 450 170 Q 400 150 350 170 Z" fill={furD} />
      {eye(300)}{eye(500)}
      <path d="M388 360 L 412 360 L 400 375 Z" fill="#ff7a8a" stroke={ink} strokeWidth={5} />
      {mouth}
      {[-1, 1].map(s => [0, 1, 2].map(i => <line key={s + '' + i} x1={400 + s * 120} y1={370 + i * 22} x2={400 + s * 260} y2={350 + i * 34} stroke={ink} strokeWidth={5} strokeLinecap="round" />))}
      {(mood === 'pout' || mood === 'happy') && [270, 530].map(cx => <ellipse key={cx} cx={cx} cy={380} rx={38} ry={22} fill="#ff8aa0" opacity={.55} />)}
    </svg>
  );
};

export const Main: React.FC = () => {
  const t = useT(), m1 = T('m1'), m2 = T('m2'), m3 = T('m3');
  const mood = t >= m3 ? 'happy' : t >= m2 ? 'pout' : t >= m1 ? 'shock' : 'calm';
  const punch = Math.max(...[m1, m2, m3].map(a => (t >= a ? Math.exp(-(t - a) * 6) : 0)));   // 每次花字出来：画面急推一下
  const bg = mood === 'shock' ? 'radial-gradient(circle at 50% 45%, #fff6b0, #ffd56b 60%, #ff9f43)' : mood === 'pout' ? 'radial-gradient(circle at 50% 45%, #ffe3f1, #ffb3d6 60%, #d98ad8)' : mood === 'happy' ? 'radial-gradient(circle at 50% 45%, #e8fff3, #a8f0d4 60%, #6ac8ff)' : 'radial-gradient(circle at 50% 45%, #fdf6ec, #f0e2d0)';
  const sub = (timing as any).lines.find((l: any) => t >= l.t0 && t < l.t1 + .25);
  return (
    <AbsoluteFill style={{ background: bg, overflow: 'hidden' }}>
      {/* 震惊时的集中线 */}
      {mood === 'shock' && <svg width={1920} height={1080} style={{ position: 'absolute', opacity: .5 }}>{Array.from({ length: 48 }, (_, i) => { const a = i / 48 * Math.PI * 2 + (Math.floor(t * 12) % 2) * .03; return <line key={i} x1={960 + Math.cos(a) * 520} y1={560 + Math.sin(a) * 420} x2={960 + Math.cos(a) * 1300} y2={560 + Math.sin(a) * 1000} stroke="#fff" strokeWidth={i % 3 ? 4 : 10} />; })}</svg>}
      <AbsoluteFill style={{ transform: `scale(${1 + punch * .08 + k(t, 0, DURATION) * .03})` }}>
        <Cat mood={mood} t={t} />
        <Sticker kind="sweat" t={t - m1 - .2} x={1300} y={380} out={m2 - m1 - .2} />
        <Sticker kind="q" t={t - m2 - .3} x={1320} y={330} out={m3 - m2 - .3} />
        <Sticker kind="anger" t={t - m2 - .5} x={760} y={300} s={.9} out={m3 - m2 - .5} />
        <Sticker kind="spark" t={t - m3 - .2} x={620} y={340} />
        <Sticker kind="heart" t={t - m3 - .35} x={1330} y={360} />
        <Sticker kind="spark" t={t - m3 - .5} x={1400} y={600} s={.7} />
      </AbsoluteFill>
      <Huazi text="震惊！" t={t - m1} st={PRESETS.shock} anim="shake" x={520} y={260} rot={-8} out={m2 - m1 - .3} />
      <Huazi text="我不听我不听～" t={t - m2} st={PRESETS.pout} anim="wave" x={960} y={180} rot={-3} out={m3 - m2 - .3} />
      <Huazi text="好耶！！" t={t - m3} st={PRESETS.yay} anim="stamp" x={1400} y={230} rot={6} />
      {sub && <div style={{ position: 'absolute', bottom: 66, width: W, textAlign: 'center', fontFamily: F.cn, fontWeight: 800, fontSize: 50, color: '#fff', WebkitTextStroke: '10px #2a1a3a', paintOrder: 'stroke fill', opacity: lerp(0, 1, k(t, sub.t0, sub.t0 + .15, E.out)) } as React.CSSProperties}>{sub.text}</div>}
    </AbsoluteFill>
  );
};
