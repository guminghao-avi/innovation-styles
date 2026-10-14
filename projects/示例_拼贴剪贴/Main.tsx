// 示例 · 拼贴剪贴：牛皮纸上一张张剪报"啪"地贴上来（12fps 卡顿）→ 网点印刷的绅士像被剪刀剪开 → 头盖掀起，脑洞（粉色的脑子）蹦出来
// → 绑架信式的拼字标题"脑洞季刊"。风格说明：references/风格_13_拼贴剪贴.md；工具：@styles/collage
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Canvas2D, makeVO, useT, clamp, rnd, spring, F, W } from '@kit';
import { COL, kraft, newsprint, halftone, tape, tornRect } from '@styles/collage';
import timing from './vo.timing.json';
import beats from './beats.json';

const { T } = makeVO(timing as any, beats);
export const DURATION = T('a3.end') + .8;
const q = (t: number) => Math.floor(t * 12) / 12;                  // 12fps：卡顿也是风格
const slap = (t: number) => { const a = q(t); return a < 0 ? 0 : a < .09 ? 1.25 : a < .17 ? .95 : 1; };   // 三格落定
let BG: HTMLCanvasElement | null = null;
const bg = () => { if (!BG) { BG = document.createElement('canvas'); BG.width = 1920; BG.height = 1080; kraft(BG.getContext('2d')!); } return BG; };
// 网点照片是静止的：只画一次到离屏画布，之后每帧 drawImage（不缓存时这一张 ~7 秒/帧）
let HT: HTMLCanvasElement | null = null;
const htCard = () => { if (!HT) { HT = document.createElement('canvas'); HT.width = 560; HT.height = 760; halftone(HT.getContext('2d')!, 0, 0, 560, 760, gent, 10); } return HT; };
const fill = (g: CanvasRenderingContext2D, p: number[], col: string) => { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); g.fillStyle = col; g.fill(); };
// 绅士半身像的"暗度"（程序化，代替照片）：高礼帽 + 头 + 肩，左边受光
const gent = (u: number, v: number) => {
  const hat = (Math.abs(u - .5) < .2 && v > .05 && v < .3) || (Math.abs(u - .5) < .3 && v > .27 && v < .31);
  const head = ((u - .5) / .17) ** 2 + ((v - .45) / .17) ** 2 < 1;
  const body = v > .66 && Math.abs(u - .5) < .12 + (v - .66) * 1.3;
  const collar = v > .64 && v < .8 && Math.abs(u - .5) < .07 + (v - .64) * .5;
  if (hat) return .92;
  if (head) return .18 + .55 * Math.max(0, (u - .4) / .3) + (Math.abs(v - .52) < .012 && Math.abs(u - .5) < .06 ? .5 : 0) + (((u - .44) ** 2 + (v - .42) ** 2 < .0004 || (u - .56) ** 2 + (v - .42) ** 2 < .0004) ? .7 : 0);
  if (collar) return .05;
  if (body) return .75 + .2 * (u - .5);
  return .1 + .12 * v;
};

const draw = (g: CanvasRenderingContext2D, t: number) => {
  g.drawImage(bg(), 0, 0);
  const put = (at: number, x: number, y: number, rot: number, f: () => void) => {
    const s = slap(t - at); if (s <= 0) return;
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); f(); g.restore();
  };
  // 剪报（第 0 秒就开始往上拍）
  put(0, 420, 330, -.06, () => newsprint(g, -260, -170, 520, 340, 3, { head: 'THE MIND IS', font: F.cn }));
  put(.25, 1500, 300, .05, () => newsprint(g, -240, -200, 480, 400, 7, { head: '脑 洞 大 开', font: F.cn }));
  put(.5, 1460, 790, -.04, () => newsprint(g, -260, -150, 520, 300, 11));
  put(.4, 400, 800, .07, () => { newsprint(g, -220, -140, 440, 280, 15); tape(g, 0, -140, 170, -.1); });
  // 绅士像：网点印刷在一块奶白纸上；头部以上会被剪下来
  const cutU = clamp((q(t) - T('cut')) / .5), lift = clamp((q(t) - T('cut') - .55) / .4);
  put(.8, 960, 520, .015, () => {
    const card = tornRect(-280, -380, 560, 760, 21, 6);
    g.save(); g.shadowColor = 'rgba(50,30,10,.4)'; g.shadowBlur = 16; g.shadowOffsetX = 6; g.shadowOffsetY = 10; fill(g, card, COL.cream); g.restore();
    // 下半（不动）
    g.save(); g.beginPath(); g.rect(-300, -95, 600, 500); g.clip(); fill(g, card, COL.cream); g.drawImage(htCard(), -280, -380); g.restore();
    // 脑洞：粉色的脑子 + 墨线褶皱 + 星星，从剪口里蹦出来
    if (lift > 0) {
      const bp = spring(t - T('pop'), 2.6, .4), by = -120 - 60 * bp;
      g.save(); g.translate(0, by); g.scale(bp, bp);
      g.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2, r = 120 * (1 + .1 * Math.sin(a * 7)); g.lineTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * .9); }
      g.closePath(); g.fillStyle = '#f29bb0'; g.fill(); g.lineWidth = 7; g.strokeStyle = COL.ink; g.stroke();
      g.lineWidth = 5; for (let j = 0; j < 6; j++) { g.beginPath(); for (let i = 0; i < 6; i++) g.lineTo(-110 + j * 40 + Math.sin(i + j) * 12, -70 + i * 26); g.stroke(); }
      g.restore();
      for (let i = 0; i < 8; i++) { const a = -Math.PI * (.1 + .8 * i / 7), r = 220 + 60 * bp; g.save(); g.translate(Math.cos(a) * r, by + Math.sin(a) * r * .8); g.rotate(a); g.fillStyle = i % 2 ? COL.red : '#ffd23a'; g.fillRect(-26 * bp, -6, 52 * bp, 12); g.restore(); }
    }
    // 上半（头盖）：沿剪线掀起来
    g.save(); g.translate(-lift * 120, -95 - lift * 150); g.rotate(-lift * .42); g.translate(0, 95);
    g.beginPath(); g.rect(-300, -400, 600, 305); g.clip(); fill(g, card, COL.cream); g.drawImage(htCard(), -280, -380); g.restore();
    // 剪刀线（虚线，按进度画出来）
    if (cutU > 0 && lift <= 0) { g.setLineDash([16, 12]); g.strokeStyle = COL.red; g.lineWidth = 5; g.beginPath(); g.moveTo(-290, -95); g.lineTo(-290 + 580 * cutU, -95); g.stroke(); g.setLineDash([]); }
  });
  // 印章：随刊附赠 剪刀一把
  put(T('pop') + .6, 1330, 640, .25, () => {
    g.fillStyle = COL.ink; g.beginPath(); g.arc(0, 0, 110, 0, Math.PI * 2); g.fill();
    g.strokeStyle = COL.cream; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 96, 0, Math.PI * 2); g.stroke();
    g.fillStyle = COL.cream; g.font = `900 34px ${F.cn}`; g.textAlign = 'center'; g.fillText('随刊附赠', 0, -6); g.fillText('剪刀一把', 0, 34);
  });
};

// 绑架信式标题：每个字一块不同的剪纸、不同的字体和底色
const RANSOM = [{ c: '脑', bg: COL.ink, fg: COL.cream, f: F.cn }, { c: '洞', bg: COL.red, fg: '#fff', f: F.serif }, { c: '季', bg: COL.news, fg: COL.ink, f: F.fun }, { c: '刊', bg: '#ffd23a', fg: COL.ink, f: F.cn }];
export const Main: React.FC = () => {
  const t = useT(), tt = t - T('pop') - .9;
  const sub = (timing as any).lines.find((l: any) => t >= l.t0 && t < l.t1 + .25);
  return (
    <AbsoluteFill style={{ background: COL.kraft }}>
      <Canvas2D draw={draw} />
      {tt > 0 && <div style={{ position: 'absolute', top: 470, left: 90, display: 'flex', gap: 10 }}>
        {RANSOM.map((r, i) => { const s = slap(tt - i * .17); return s > 0 && <div key={i} style={{ background: r.bg, color: r.fg, fontFamily: r.f, fontWeight: 900, fontSize: 92 + (i % 2) * 18, padding: '4px 18px', transform: `rotate(${(rnd(i, 3) - .5) * 14}deg) scale(${s})`, boxShadow: '4px 7px 10px rgba(50,30,10,.35)', clipPath: 'polygon(2% 4%, 97% 0, 100% 95%, 4% 100%)' }}>{r.c}</div>; })}
      </div>}
      {sub && <div style={{ position: 'absolute', bottom: 60, width: W, textAlign: 'center' }}>
        <span style={{ fontFamily: F.serif, fontWeight: 900, fontSize: 50, color: COL.ink, background: COL.news, padding: '10px 28px', display: 'inline-block', transform: `rotate(${(rnd((timing as any).lines.indexOf(sub), 5) - .5) * 3}deg)`, boxShadow: '4px 7px 10px rgba(50,30,10,.3)' }}
          dangerouslySetInnerHTML={{ __html: sub.text.replace(/\*\*(.+?)\*\*/g, `<span style="background:${COL.red};color:#fff;padding:0 8px">$1</span>`) }} />
      </div>}
    </AbsoluteFill>
  );
};
