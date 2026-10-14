// 示例 · 弥散渐变玻璃拟态：极光底上浮起三块磨砂玻璃（聆听波形 / 回复卡片 / 专注开关），玻璃里折射着后面的极光
// → 玻璃收起，一颗光球亮起，字标 "Aurora"。风格说明：references/风格_14_弥散渐变玻璃拟态.md；工具：@styles/glass
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Shader, GLSL, makeVO, useT, k, E, lerp, clamp, F, W, spring } from '@kit';
import { AURORA, GL, rectStyle } from '@styles/glass';
import timing from './vo.timing.json';
import beats from './beats.json';

const { T } = makeVO(timing as any, beats);
export const DURATION = T('a3.end') + 1;
const card = (t: number, at: number, out: number, r: number[]) => {
  const a = spring(t - at, 1.6, .7), o = E.in(clamp((t - out) / .5));
  if (t < at) return [0, 0, 0, 0];
  const s = lerp(.9, 1, a) * (1 - o * .3);
  const w = r[2] * s, h = r[3] * s;
  return [r[0] + (r[2] - w) / 2, r[1] + (r[3] - h) / 2 + (1 - a) * 90 + o * 120, w * (o >= 1 ? 0 : 1), h];
};

export const Main: React.FC = () => {
  const t = useT(), out = T('logo');
  const c0 = card(t, 0, out, [560, 170, 440, 160]), c1 = card(t, T('reply'), out + .1, [900, 270, 600, 360]), c2 = card(t, T('reply') + .7, out + .2, [470, 520, 520, 210]);
  const lg = k(t, out + .3, out + 1.4, E.film);
  const fade = (c: number[]) => (c[2] > 0 ? 1 : 0) * clamp(1 - (t - out) / .4);
  const sub = (timing as any).lines.find((l: any) => t >= l.t0 && t < l.t1 + .25);
  return (
    <AbsoluteFill style={{ background: '#05040f' }}>
      <Shader frag={GLSL.noise + GLSL.color + AURORA} scale={.5} u={{ uC0: c0, uC1: c1, uC2: c2, uC3: [0, 0, 0, 0], uRad: 34, uGlow: lerp(.15, .9, lg), uOrb: [lerp(760, 960, lg), lerp(250, 470, lg)], uExpo: .62 }} />
      {/* 玻璃上的内容（DOM）：和着色器里的玻璃同一个矩形 */}
      <div style={{ ...rectStyle(c0), opacity: fade(c0), padding: '26px 32px', fontFamily: F.en, color: GL.text }}>
        <div style={{ fontSize: 22, color: GL.sub, letterSpacing: '.1em' }}>Listening · 0:0{Math.floor(t) % 10}</div>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center', height: 70, marginTop: 10 }}>
          {Array.from({ length: 22 }, (_, i) => <div key={i} style={{ width: 8, borderRadius: 4, background: GL.accent, height: 10 + 50 * Math.abs(Math.sin(t * 6 + i * .7) * Math.sin(t * 2.3 + i * .3)) }} />)}
        </div>
      </div>
      <div style={{ ...rectStyle(c1), opacity: fade(c1) * k(t, T('reply') + .3, T('reply') + .8), padding: '34px 40px', fontFamily: F.en, color: GL.text }}>
        <div style={{ fontSize: 26, color: GL.accent, display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ width: 22, height: 22, borderRadius: 11, background: `radial-gradient(${GL.text}, ${GL.accent})`, display: 'inline-block' }} />Aurora</div>
        <div style={{ fontFamily: F.cn, fontSize: 40, fontWeight: 500, lineHeight: 1.6, marginTop: 26 }}>
          {['十点，慢慢吃早餐。', '四点，去湖边走走。', '晚上，什么也不安排。'].map((s, i) => <div key={i} style={{ opacity: k(t, T('reply') + .8 + i * .5, T('reply') + 1.2 + i * .5) }}>{s}</div>)}
        </div>
      </div>
      <div style={{ ...rectStyle(c2), opacity: fade(c2) * k(t, T('reply') + 1, T('reply') + 1.4), padding: '34px 40px', fontFamily: F.en, color: GL.text, fontSize: 30 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span>◐  Focus</span>
          <span style={{ width: 84, height: 46, borderRadius: 23, background: 'rgba(255,255,255,.25)', position: 'relative' }}><span style={{ position: 'absolute', top: 5, left: lerp(5, 43, k(t, T('reply') + 1.8, T('reply') + 2.1, E.snap)), width: 36, height: 36, borderRadius: 18, background: '#fff' }} /></span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 40 }}><span>✺  Glow</span>
          <span style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,.25)', position: 'relative' }}><span style={{ position: 'absolute', left: 0, top: 0, height: 6, borderRadius: 3, width: `${lerp(10, 62, k(t, T('reply') + 2, T('reply') + 2.8))}%`, background: GL.accent }} /></span></div>
      </div>
      {lg > 0 && <div style={{ position: 'absolute', top: 380, width: W, textAlign: 'center', opacity: lg }}>
        <div style={{ fontFamily: F.en, fontWeight: 300, fontSize: 180, color: GL.text, letterSpacing: '.04em', textShadow: '0 0 40px rgba(160,140,255,.6)' }}>Aurora</div>
        <div style={{ fontFamily: F.cn, fontWeight: 300, fontSize: 32, color: GL.sub, letterSpacing: '.4em', marginTop: 10 }}>Think in light. · 思考，自有光</div>
      </div>}
      {sub && <div style={{ position: 'absolute', bottom: 78, width: W, textAlign: 'center', fontFamily: F.cn, fontWeight: 400, fontSize: 48, color: GL.text, opacity: k(t, sub.t0, sub.t0 + .4) * (1 - k(t, sub.t1, sub.t1 + .25)), textShadow: '0 2px 20px rgba(40,20,90,.6)' }}
        dangerouslySetInnerHTML={{ __html: sub.text.replace(/\*\*(.+?)\*\*/g, `<span style="color:${GL.pink}">$1</span>`) }} />}
    </AbsoluteFill>
  );
};
