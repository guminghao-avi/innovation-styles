// 示例 · 几何构成包豪斯：一张 6×8 格（120px）的海报，踩着 120 BPM 一拍落一个元素，二十拍把自己搭起来
// 风格说明：references/风格_15_几何构成包豪斯.md；工具：@styles/bauhaus
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { makeVO, useT, F, lerp } from '@kit';
import { BH, U, beat, hit, Grid } from '@styles/bauhaus';
import timing from './vo.timing.json';

const { T } = makeVO(timing as any, {});
export const DURATION = T('a3.end') + 1;
const X = 600, Y = 60, PW = U * 6, PH = U * 8;   // 海报：6 × 8 格

export const Main: React.FC = () => {
  const t = useT(), b = (i: number) => hit(t, beat(i, .15));
  const g = (cx: number, cy: number) => [X + cx * U, Y + cy * U];
  const sub = (timing as any).lines.find((l: any) => t >= l.t0 && t < l.t1 + .25);
  const [c1x, c1y] = g(2, 5), [tx, ty] = g(4, 1);
  return (
    <AbsoluteFill style={{ background: '#d9d0c0' }}>
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        <rect x={X} y={Y} width={PW} height={PH} fill={BH.paper} style={{ filter: 'drop-shadow(0 18px 30px rgba(40,30,20,.25))' }} />
        <Grid x={X} y={Y} w={PW} h={PH} a={b(0)} />
        <clipPath id="poster"><rect x={X} y={Y} width={PW} height={PH} /></clipPath>
        <g clipPath="url(#poster)">
          {/* 1 大红圆 */}<circle cx={c1x} cy={c1y} r={U * 1.9 * b(1)} fill={BH.red} />
          {/* 2 黑竖条从上落下 */}<rect x={X + U * 3} y={Y} width={U * .5} height={PH * b(2)} fill={BH.black} />
          {/* 3 蓝半圆从右边推进来 */}<path d={`M ${X + PW} ${Y + U * 4} A ${U * 2} ${U * 2} 0 0 0 ${X + PW} ${Y + U * 8} Z`} fill={BH.blue} transform={`translate(${U * 2.2 * (1 - b(3))} 0)`} />
          {/* 4 黄三角 */}<polygon points={`${tx},${ty + U * 2} ${tx + U * 2},${ty + U * 2} ${tx + U},${ty + U * 2 - U * 1.75 * b(4)}`} fill={BH.yellow} />
          {/* 5 黑横条 */}<rect x={X} y={Y + U * 3} width={PW * b(5)} height={U * .25} fill={BH.black} />
          {/* 6 红小方 */}<rect x={X + U * 4.5} y={Y + U * 4} width={U * b(6)} height={U * b(6)} fill={BH.red} />
          {/* 7 蓝方 */}<rect x={X + U * .5} y={Y + U * (1 - (1 - b(7)) * 3)} width={U * 1.5} height={U * 1.5} fill={BH.blue} />
          {/* 11 细圆环 */}<circle cx={c1x} cy={c1y} r={U * 2.4} fill="none" stroke={BH.black} strokeWidth={4} strokeDasharray={`${U * 15.1 * b(11)} 9999`} />
          {/* 12 黑四分之一圆 */}<path d={`M ${X + PW} ${Y} l 0 ${U * 1.5 * b(12)} a ${U * 1.5 * b(12)} ${U * 1.5 * b(12)} 0 0 1 ${-U * 1.5 * b(12)} ${-U * 1.5 * b(12)} Z`} fill={BH.black} />
          {/* 13 黄小圆 */}<circle cx={X + U * 4.5} cy={Y + U * 7.2} r={U * .45 * b(13)} fill={BH.yellow} />
          {/* 14 红竖条 */}<rect x={X + U * 5.5} y={Y + U * 3.25} width={U * .25} height={U * 4.75 * b(14)} fill={BH.red} />
          {/* 9 三个小点 */}{[BH.red, BH.yellow, BH.blue].map((c, i) => <circle key={i} cx={X + U * .5 + i * 44} cy={Y + U * .35} r={14 * hit(t, beat(9, .15) + i * .08, .15)} fill={c} />)}
        </g>
        {/* 8 竖排 BAUHAUS（压在海报左边） */}
        <text x={0} y={0} transform={`translate(${X + 70} ${Y + PH - 40}) rotate(-90)`} fontFamily={F.en} fontWeight={700} fontSize={118} fill={BH.black} letterSpacing={6}
          style={{ clipPath: `inset(0 ${(1 - b(8)) * 100}% 0 0)` }}>BAUHAUS</text>
        {/* 10 / 15 / 16 小字 */}
        <text x={X + U * 3.6} y={Y + U * 2.8} fontFamily={F.mono} fontSize={15} fill={BH.black} opacity={b(10)} letterSpacing={1.5}>FORM · FARBE · FUNKTION</text>
        <text x={X + PW - 24} y={Y + 46} fontFamily={F.en} fontWeight={700} fontSize={40} fill={BH.paper} textAnchor="end" opacity={b(15)}>09</text>
        <text x={X + 24} y={Y + PH + 40} fontFamily={F.mono} fontSize={18} fill={BH.black} opacity={b(16)} letterSpacing={3}>BOGEN 09 — KONSTRUKTION IN 20 SCHLÄGEN</text>
        {/* 节拍计数（右侧） */}
        {Array.from({ length: 20 }, (_, i) => <rect key={i} x={1430 + (i % 5) * 34} y={720 + Math.floor(i / 5) * 34} width={24} height={24} fill={t > beat(i, .15) ? [BH.red, BH.yellow, BH.blue, BH.black][i % 4] : 'rgba(21,21,21,.12)'} />)}
        <text x={1430} y={700} fontFamily={F.mono} fontSize={22} fill={BH.black} letterSpacing={3}>{`BEAT ${String(Math.min(20, Math.max(0, Math.floor((t - .15) * 2) + 1))).padStart(2, '0')} / 20`}</text>
      </svg>
      {sub && <div style={{ position: 'absolute', left: 1400, top: 300, width: 460, fontFamily: F.cn, fontWeight: 900, fontSize: 50, lineHeight: 1.35, color: BH.black, transform: `translateX(${lerp(40, 0, hit(t, sub.t0, .3))}px)` }}
        dangerouslySetInnerHTML={{ __html: sub.text.replace(/\*\*(.+?)\*\*/g, `<span style="color:${BH.red}">$1</span>`) }} />}
    </AbsoluteFill>
  );
};
