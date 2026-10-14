// 示例 · 3D 渲染（软糯）：一地粉色胶囊，镜头缓缓滑过 → 铬球从天而降、弹两下，胶囊被砸出一圈涟漪 → "soft." 落下来
// 风格说明：references/风格_09_3D渲染.md；工具：@styles/soft3d（光线步进着色器）
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Shader, GLSL, makeVO, useT, lerp, F, W, spring } from '@kit';
import { SOFT3D, bounceY } from '@styles/soft3d';
import timing from './vo.timing.json';
import beats from './beats.json';

const { T } = makeVO(timing as any, beats);
export const DURATION = T('title') + 3;
const BR = .5, TOP = .62 + BR, H0 = 5.5;

export const Main: React.FC = () => {
  const t = useT();
  const b = bounceY(t - T('drop'), H0 - TOP, 16, .42);
  const ballY = t < T('drop') ? 9 : TOP + b.y;
  const firstHit = Math.sqrt(2 * (H0 - TOP) / 16) + T('drop');
  const cam = [Math.sin(t * .12) * 1.6 - .4, lerp(2.3, 1.7, Math.min(1, t / DURATION)), 5.6 - t * .08];
  const sub = (timing as any).lines.find((l: any) => t >= l.t0 && t < l.t1 + .3);
  const tt = t - T('title');
  return (
    <AbsoluteFill style={{ background: '#f7d9df' }}>
      <Shader frag={GLSL.noise + GLSL.color + SOFT3D} scale={.5} u={{ uCam: cam, uTgt: [0, .55, 0], uBall: [0, ballY, 0], uBallR: BR, uImpact: t > firstHit ? t - firstHit : -1, uImpXZ: [0, 0], uExpo: .8 }} />
      {tt > 0 && <div style={{ position: 'absolute', top: 70, width: W, textAlign: 'center' }}>
        <div style={{ fontFamily: F.en, fontWeight: 700, fontSize: 230, color: '#fff', letterSpacing: '-.03em', textShadow: '0 18px 40px rgba(190,80,110,.35)' }}>
          {[...'soft.'].map((c, i) => { const s = spring(tt - i * .08, 2.4, .45); return <span key={i} style={{ display: 'inline-block', transform: `translateY(${(1 - s) * -160}px) scale(${1 + (1 - s) * .3}, ${Math.max(.01, s)})` }}>{c}</span>; })}
        </div>
        <div style={{ fontFamily: F.serif, fontSize: 34, letterSpacing: '.8em', color: '#9a4a63', opacity: Math.min(1, Math.max(0, (tt - .6) * 2)) }}>柔软着陆</div>
      </div>}
      {sub && <div style={{ position: 'absolute', bottom: 86, width: W, textAlign: 'center', fontFamily: F.cn, fontWeight: 600, fontSize: 50, color: '#7a2f48', textShadow: '0 2px 18px rgba(255,255,255,.7)' }}
        dangerouslySetInnerHTML={{ __html: sub.text.replace(/\*\*(.+?)\*\*/g, '<span style="color:#e2557c">$1</span>') }} />}
    </AbsoluteFill>
  );
};
