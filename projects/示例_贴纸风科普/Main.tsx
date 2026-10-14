// 示例 · 贴纸风科普：点阵纸上的超大画布 —— 手机贴纸拍下来 → 镜头推到电池（Li、Co）→ 平移到芯片（Si、Ga）→ 拉远，一张元素周期表上亮起约 70 格
// 风格说明：references/风格_11_贴纸风科普.md；工具：@styles/sticker
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { makeVO, useT, spring, rnd, F, W } from '@kit';
import { STK, StickerDefs, DotGrid, Chip, Label, camAt } from '@styles/sticker';
import timing from './vo.timing.json';
import beats from './beats.json';

const { T } = makeVO(timing as any, beats);
export const DURATION = T('a4.end') + 1;
const pop = (t: number) => (t <= 0 ? 0 : spring(t, 2.6, .45));
// 周期表的格子（行、列）—— 标准 18 列布局，前 6 行 + 镧系不画
const PT: [number, number][] = [];
for (let r = 0; r < 6; r++) for (let c = 0; c < 18; c++) {
  if (r === 0 && c > 0 && c < 17) continue; if ((r === 1 || r === 2) && c > 1 && c < 12) continue;
  PT.push([r, c]);
}

export const Main: React.FC = () => {
  const t = useT();
  const cam = camAt(t, [[0, { x: 960, y: 1110, s: .9 }], [T('bat') - .2, { x: 960, y: 1110, s: .86 }], [T('bat') + .6, { x: 2420, y: 820, s: 1.15 }],
    [T('chip') - .2, { x: 2420, y: 840, s: 1.15 }], [T('chip') + .6, { x: 2420, y: 1600, s: 1.15 }], [T('all') - .2, { x: 2420, y: 1600, s: 1.1 }], [T('all') + 1.2, { x: 2520, y: 1220, s: .46 }]]);
  const sub = (timing as any).lines.find((l: any) => t >= l.t0 && t < l.t1 + .25);
  const lit = (i: number) => rnd(i, 4) < .74;                    // 大约 70 格亮起
  return (
    <AbsoluteFill style={{ background: STK.paper, overflow: 'hidden' }}>
      <StickerDefs />
      <div style={{ position: 'absolute', width: 4400, height: 2600, transformOrigin: '0 0', transform: cam }}>
        <DotGrid w={4400} h={2600} />
        {/* 手机贴纸 */}
        <svg width={4400} height={2600} style={{ position: 'absolute', overflow: 'visible' }}>
          <g filter="url(#stk)" transform={`translate(960 1120) rotate(-6) scale(${pop(t + .05)})`}>
            <rect x={-200} y={-400} width={400} height={800} rx={60} fill="#2b2d38" />
            <rect x={-176} y={-370} width={352} height={740} rx={40} fill="#5b8def" />
            <rect x={-60} y={-360} width={120} height={22} rx={11} fill="#2b2d38" />
            {[0, 1, 2, 3].map(i => <rect key={i} x={-130 + (i % 2) * 140} y={-250 + Math.floor(i / 2) * 150} width={110} height={110} rx={26} fill={[STK.yellow, STK.red, '#ffffff', STK.green][i]} />)}
          </g>
          {/* 电池 */}
          <g filter="url(#stk)" transform={`translate(2200 820) rotate(4) scale(${pop(t - T('bat'))})`}>
            <rect x={-150} y={-230} width={300} height={460} rx={36} fill={STK.green} />
            <rect x={-55} y={-262} width={110} height={40} rx={12} fill="#2d7d50" />
            <path d="M-20 -60 L40 -60 L0 20 L50 20 L-30 140 L-5 50 L-50 50 Z" fill="#fff8d0" />
          </g>
          {/* 芯片 */}
          <g filter="url(#stk)" transform={`translate(2200 1620) rotate(-3) scale(${pop(t - T('chip'))})`}>
            {Array.from({ length: 6 }, (_, i) => <g key={i}><rect x={-150 + i * 56} y={-215} width={22} height={60} rx={6} fill="#d8b04a" /><rect x={-150 + i * 56} y={155} width={22} height={60} rx={6} fill="#d8b04a" /><rect x={-215} y={-150 + i * 56} width={60} height={22} rx={6} fill="#d8b04a" /><rect x={155} y={-150 + i * 56} width={60} height={22} rx={6} fill="#d8b04a" /></g>)}
            <rect x={-175} y={-175} width={350} height={350} rx={30} fill="#22232b" />
            <rect x={-95} y={-95} width={190} height={190} rx={16} fill="#3a3c4a" />
          </g>
        </svg>
        <Label x={2350} y={700} lx={2560} ly={520} cn="电池" en="BATTERY" t={t - T('bat') - .4} />
        <Chip x={2620} y={700} n={3} sym="Li" name="锂" t={t - T('a2@锂')} col={STK.red} />
        <Chip x={2780} y={700} n={27} sym="Co" name="钴" t={t - T('a2@钴')} col={STK.blue} />
        <Label x={2380} y={1500} lx={2560} ly={1340} cn="芯片" en="CHIP" t={t - T('chip') - .4} />
        <Chip x={2620} y={1520} n={14} sym="Si" name="硅" t={t - T('a3@硅')} col={STK.chip} />
        <Chip x={2780} y={1520} n={31} sym="Ga" name="镓" t={t - T('a3@镓')} col="#7a52c7" />
        {/* 周期表 */}
        {PT.map(([r, c], i) => {
          const at = T('all') + .9 + (c + r * .7) * .045, on = lit(i) && t > at + .2;
          return <div key={i} style={{ position: 'absolute', left: 3150 + c * 60, top: 900 + r * 60, width: 52, height: 52, borderRadius: 8, transform: `scale(${pop(t - at)})`,
            background: on ? [STK.red, STK.blue, STK.yellow, STK.green, STK.chip][(r + c) % 5] : '#dddad3', boxShadow: '0 0 0 4px #fff' }} />;
        })}
        <div style={{ position: 'absolute', left: 3150, top: 1300, fontFamily: F.cn, fontWeight: 900, fontSize: 150, color: STK.ink, transform: `scale(${pop(t - T('a4@70'))})`, transformOrigin: 'left top' }}>
          ≈ <span style={{ color: STK.red, fontFamily: F.en }}>70</span> 种<div style={{ fontFamily: F.en, fontSize: 40, letterSpacing: '.3em', color: STK.sub, fontWeight: 400 }}>ELEMENTS IN ONE PHONE</div></div>
      </div>
      {sub && <div style={{ position: 'absolute', bottom: 70, width: W, textAlign: 'center' }}>
        <span style={{ fontFamily: F.cn, fontWeight: 800, fontSize: 50, color: STK.ink, background: '#fff', padding: '14px 32px', borderRadius: 18, boxShadow: '0 8px 20px rgba(40,30,20,.15)' }}
          dangerouslySetInnerHTML={{ __html: sub.text.replace(/\*\*(.+?)\*\*/g, `<span style="color:${STK.red}">$1</span>`) }} />
      </div>}
    </AbsoluteFill>
  );
};
