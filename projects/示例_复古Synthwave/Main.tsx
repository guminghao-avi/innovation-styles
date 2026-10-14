// 示例 · 复古 Synthwave：录像带"PLAY ▶"（开头一下跟踪错位）→ 条纹落日、线框山、霓虹网格向前滚、两边棕榈树
// → 跑车尾灯冲向地平线 → 铬字 NEON DRIVE + 霓虹手写 Midnight。风格说明：references/风格_16_复古Synthwave.md；工具：@styles/synth
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Shader, Canvas2D, GLSL, makeVO, useT, k, E, lerp, F, W, spring } from '@kit';
import { SYNTH, SW, palm } from '@styles/synth';
import timing from './vo.timing.json';
import beats from './beats.json';

const { T } = makeVO(timing as any, beats);
export const DURATION = T('a3.end') + 1;
const HZ = 600;

export const Main: React.FC = () => {
  const t = useT(), go = k(t, T('a3'), T('a3') + 2.2, E.in);
  const track = t < .45 ? 120 + t * 900 : (t > 5.2 && t < 5.45 ? 300 + (t - 5.2) * 1600 : -1);
  const tt = t - T('title');
  const sub = (timing as any).lines.find((l: any) => t >= l.t0 && t < l.t1 + .25);
  return (
    <AbsoluteFill style={{ background: '#0b0216' }}>
      <Shader frag={GLSL.noise + GLSL.color + SYNTH} scale={.5} u={{ uSpeed: 1.2 + go * 5, uHz: HZ, uSun: 0, uTrack: track, uExpo: .8 }} />
      <Canvas2D draw={(g, tt2) => {
        // 棕榈树：两边，往两侧退（向前开的感觉）
        for (let i = 0; i < 3; i++) { const z = ((tt2 * (.25 + go * .8) + i / 3) % 1), s = .3 + z * 1.6, x = 960 - (260 + z * 1100), x2 = 960 + (260 + z * 1100);
          palm(g, x, HZ + 30 + z * 420, 260 * s, Math.sin(tt2 * 1.3 + i)); palm(g, x2, HZ + 30 + z * 420, 260 * s, Math.sin(tt2 * 1.2 + i + 1)); }
        // 跑车尾部（越来越小 = 冲向地平线）
        const cs = lerp(1, .18, go), cx = 960, cy = lerp(1000, HZ + 18, go);
        g.save(); g.translate(cx, cy); g.scale(cs, cs);
        g.fillStyle = '#0d0418'; g.beginPath(); g.moveTo(-260, 0); g.lineTo(-240, -90); g.lineTo(-150, -120); g.lineTo(-110, -190); g.lineTo(110, -190); g.lineTo(150, -120); g.lineTo(240, -90); g.lineTo(260, 0); g.closePath(); g.fill();
        g.globalCompositeOperation = 'lighter';
        for (const sx of [-1, 1]) { g.fillStyle = '#ff2a4a'; g.fillRect(sx > 0 ? 120 : -220, -80, 100, 16);
          const gr = g.createRadialGradient(sx * 170, -72, 0, sx * 170, -72, 140); gr.addColorStop(0, 'rgba(255,40,80,.8)'); gr.addColorStop(1, 'rgba(255,40,80,0)'); g.fillStyle = gr; g.fillRect(sx * 170 - 140, -212, 280, 280); }
        g.restore();
      }} />
      {tt > 0 && <div style={{ position: 'absolute', top: 130, width: W, textAlign: 'center', transform: `scale(${spring(tt, 2, .55)})` }}>
        <div style={{ fontFamily: F.en, fontWeight: 700, fontStyle: 'italic', fontSize: 190, letterSpacing: '.02em', background: SW.chrome, WebkitBackgroundClip: 'text', color: 'transparent', WebkitTextStroke: '3px #ffffff', filter: 'drop-shadow(0 0 18px rgba(255,63,209,.7)) drop-shadow(0 6px 0 #3a0a5a)' }}>NEON DRIVE</div>
        <div style={{ fontFamily: F.fun, fontStyle: 'italic', fontSize: 130, color: '#ffd6f6', marginTop: -70, marginLeft: 380, transform: 'rotate(-8deg)', textShadow: `0 0 8px ${SW.pink}, 0 0 24px ${SW.pink}, 0 0 60px ${SW.pink}`, opacity: k(tt, .4, .8) }}>Midnight</div>
      </div>}
      {/* VHS 屏显 + 扫描线 */}
      <div style={{ position: 'absolute', left: 80, top: 60, fontFamily: F.mono, fontSize: 44, color: '#fff', textShadow: '3px 3px 0 rgba(0,0,0,.6)', opacity: Math.floor(t * 2) % 2 || t > 2 ? 1 : 0 }}>PLAY ▶</div>
      <div style={{ position: 'absolute', right: 80, bottom: 170, fontFamily: F.mono, fontSize: 34, color: '#fff', textShadow: '3px 3px 0 rgba(0,0,0,.6)', textAlign: 'right' }}>JUL. 15 1986<br />SP {`0:00:${String(Math.floor(t)).padStart(2, '0')}`}</div>
      <AbsoluteFill style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,.25) 0 2px, transparent 2px 4px)', pointerEvents: 'none' }} />
      {sub && <div style={{ position: 'absolute', bottom: 70, width: W, textAlign: 'center', fontFamily: F.cn, fontWeight: 800, fontStyle: 'italic', fontSize: 50, color: '#fff', textShadow: `0 0 10px ${SW.pink}, 3px 3px 0 #3a0a5a` }}
        dangerouslySetInnerHTML={{ __html: sub.text.replace(/\*\*(.+?)\*\*/g, `<span style="color:${SW.cyan};text-shadow:0 0 12px ${SW.cyan}">$1</span>`) }} />}
    </AbsoluteFill>
  );
};
