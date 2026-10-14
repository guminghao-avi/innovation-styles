// 示例 · 线条动画：一根金线沿地面走，画出种子 → 发芽 → 小房子 → 一排楼 → 太阳，全程不断开；镜头跟着笔尖，最后拉远看全貌
// 风格说明：references/风格_08_线条动画.md；工具：@styles/line
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { makeVO, useT, k, E, lerp, clamp, F, W } from '@kit';
import { Pen, LINE } from '@styles/line';
import timing from './vo.timing.json';
import beats from './beats.json';

const { T } = makeVO(timing as any, beats);
export const DURATION = T('reveal') + 3.2;
const G = 700;
// 整幅画就是一笔
const pen = (() => {
  const p = new Pen().move(-200, G).line(260, G, 8);
  p.curve(270, G + 26, 300, G + 22).curve(330, G + 18, 320, G).curve(300, G - 12, 290, G);   // 种子
  p.curve(290, G - 60, 320, G - 120).leaf(70, -2.5).curve(330, G - 150, 340, G - 180).leaf(60, -.6).curve(350, G - 200, 345, G - 215);   // 芽和两片叶
  p.curve(340, G - 160, 360, G).line(560, G, 6);
  p.line(560, G - 170).line(650, G - 250).line(740, G - 170).line(740, G);               // 小房子
  p.line(675, G).line(675, G - 80).line(625, G - 80).line(625, G).line(560, G).line(740, G).line(860, G, 4);
  const B = [[860, 220, 120], [980, 360, 90], [1070, 260, 140], [1210, 480, 110], [1320, 300, 100], [1420, 560, 130], [1550, 340, 120], [1670, 420, 90], [1760, 250, 140]];
  for (const [x, h, w] of B) {
    p.line(x, G - h, 3);
    if (h > 450) { p.line(x + w / 2 - 6, G - h).line(x + w / 2 - 6, G - h - 80).line(x + w / 2 + 6, G - h - 80).line(x + w / 2 + 6, G - h); }   // 天线
    p.line(x + w, G - h, 3).line(x + w, G, 3);
  }
  p.line(1960, G, 4).line(2060, G - 120).line(2160, G - 60).line(2260, G - 140).line(2360, G);   // 远山
  p.line(2440, G).line(2440, G - 200).arc(2440 + 90, G - 290, 127, Math.PI * .75, Math.PI * .75 + Math.PI * 2, 64).line(2440, G).line(2900, G, 6);   // 太阳
  return p;
})();
const D = pen.d, LEN = pen.len;

export const Main: React.FC = () => {
  const t = useT(), t1 = T('reveal') - .2;
  const p = E.inOut(clamp((t - .15) / (t1 - .15))) ** .9;
  const [tx, ty] = pen.at(LEN * p);
  // 镜头：跟着笔尖（笔尖停在画面 58% 处），最后拉远看全貌
  const back = k(t, T('reveal') - .4, T('reveal') + 1.6, E.film);
  const s = lerp(1.05, .6, back), cx = lerp(clamp(tx, 300, 2600), 1350, back), cy = lerp(G - 230, G - 330, back);   // 纵向不跟笔尖（否则画面上下乱跳）
  const tf = `translate(${W * .58 - cx * s + (W * .5 - W * .58) * back} ${560 - cy * s}) scale(${s})`;
  const sub = (timing as any).lines.find((l: any) => t >= l.t0 && t < l.t1 + .3);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, ${LINE.bg2}, ${LINE.bg} 70%)` }}>
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        <defs><filter id="gl" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7" /></filter></defs>
        <g transform={tf}>
          <path d={D} fill="none" stroke={LINE.gold} strokeWidth={7 / s * .9} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={LEN} strokeDashoffset={LEN * (1 - p)} filter="url(#gl)" opacity={.55} />
          <path d={D} fill="none" stroke={LINE.gold} strokeWidth={3.2 / s * .9} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={LEN} strokeDashoffset={LEN * (1 - p)} />
          {p < 1 && <><circle cx={tx} cy={ty} r={14 / s} fill={LINE.goldHot} opacity={.35} filter="url(#gl)" /><circle cx={tx} cy={ty} r={4.5 / s} fill={LINE.goldHot} /></>}
        </g>
      </svg>
      <div style={{ position: 'absolute', top: 110, width: W, textAlign: 'center', opacity: k(t, T('reveal') + .6, T('reveal') + 1.4) }}>
        <div style={{ fontFamily: F.gara, fontSize: 64, letterSpacing: '.6em', color: LINE.goldHot, marginLeft: '.6em' }}>ATELIER LINEA</div>
        <div style={{ fontFamily: F.serif, fontSize: 30, letterSpacing: '1em', color: LINE.gold, marginTop: 16, marginLeft: '1em' }}>一笔画</div>
      </div>
      {sub && <div style={{ position: 'absolute', bottom: 90, width: W, textAlign: 'center', fontFamily: F.serif, fontWeight: 500, fontSize: 50, letterSpacing: '.1em', color: '#e8e2d4', opacity: k(t, sub.t0, sub.t0 + .4) * (1 - k(t, sub.t1, sub.t1 + .3)) }}
        dangerouslySetInnerHTML={{ __html: sub.text.replace(/\*\*(.+?)\*\*/g, `<span style="color:${LINE.gold}">$1</span>`) }} />}
    </AbsoluteFill>
  );
};
