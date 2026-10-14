// 示例 · 液态流动：一滴橙粉色的"果冻"落下 → 溅开成几颗水珠，拉着丝被吸回去 → 长成 "drop" 四个字母，晃两下 → 万物始于一滴
// 风格说明：references/风格_18_液态流动.md；工具：@styles/liquid（SDF 融球着色器）
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Shader, GLSL, makeVO, useT, k, E, clamp, F, W } from '@kit';
import { LIQUID } from '@styles/liquid';
import timing from './vo.timing.json';
import beats from './beats.json';

const { T } = makeVO(timing as any, beats);
export const DURATION = T('a3.end') + 1;

export const Main: React.FC = () => {
  const t = useT(), hit = T('hit');
  const drop = clamp(t / hit), splash = t > hit ? (t - hit) / 2.6 : 0;
  const form = k(t, hit + .5, hit + 2.4, E.out), wob = Math.exp(-Math.max(0, t - hit - 2.2) * 1.5) * form;
  const sub = (timing as any).lines.find((l: any) => t >= l.t0 && t < l.t1 + .25);
  return (
    <AbsoluteFill style={{ background: '#12031a' }}>
      <Shader frag={GLSL.noise + GLSL.color + LIQUID} scale={.5} u={{ uDrop: drop, uSplash: Math.min(1.2, splash), uForm: form, uWob: wob }} />
      <div style={{ position: 'absolute', top: 300, width: W, textAlign: 'center', fontFamily: F.serif, fontSize: 40, letterSpacing: '.8em', color: '#f7b8d8', opacity: k(t, T('title') + .6, T('title') + 1.4) }}>万物始于一滴</div>
      {sub && <div style={{ position: 'absolute', bottom: 70, width: W, textAlign: 'center', fontFamily: F.cn, fontWeight: 700, fontSize: 50, color: '#ffe3f1', textShadow: '0 0 20px rgba(255,80,160,.5)' }}
        dangerouslySetInnerHTML={{ __html: sub.text.replace(/\*\*(.+?)\*\*/g, '<span style="color:#ff8a3c">$1</span>') }} />}
    </AbsoluteFill>
  );
};
