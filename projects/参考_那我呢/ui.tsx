import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Reveal, F, FPS, W, k, E } from '@kit';
import timing from './vo.timing.json';

export const useGT = () => useCurrentFrame() / FPS;
const HI = '#9FE6EE', SELF = '#F6A9C6', SAID = '#C3CBD6';

/** 字幕：逐字虚焦对焦；**词** = 珍珠青（他），「词」= 玫瑰（他自己的感受），“引号里” = 冷白（说出口的话） */
export const Sub: React.FC<{ hide?: string[] }> = ({ hide = [] }) => {
  const t = useGT();
  const cur = (timing as any).lines.find((l: any) => t >= l.t0 - .1 && t < l.t1 + .5 && !hide.includes(l.id));
  if (!cur) return null;
  const chars: { c: string; hi: number; said: boolean }[] = [];
  let said = false, hi = 0;
  for (const c of [...cur.text.replace(/\*\*/g, '\u0001')]) {
    if (c === '\u0001') { hi = hi === 1 ? 0 : 1; continue; }
    if (c === '「') { hi = 2; continue; }
    if (c === '」') { hi = 0; continue; }
    if (c === '“') said = true;
    chars.push({ c, hi, said });
    if (c === '”') said = false;
  }
  const out = 1 - k(t, cur.t1 + .05, cur.t1 + .5, E.in);
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 92, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: W / 2 - 800, width: 1600, bottom: 20, height: 210, opacity: .5 * out, background: 'radial-gradient(closest-side, rgba(0,0,0,.8), rgba(0,0,0,0))' }} />
      <div style={{ position: 'relative', fontFamily: F.serif, fontWeight: 500, fontSize: 44, letterSpacing: '.09em', color: '#ECEAE4', whiteSpace: 'pre', textShadow: '0 2px 6px rgba(0,0,0,.85)' }}>
        {chars.map(({ c, hi: h, said: sd }, i) => {
          const a = cur.t0 + i * .035, p = k(t, a, a + .6, E.out);
          const col = h === 1 ? HI : h === 2 ? SELF : sd ? SAID : undefined;
          return <span key={i} style={{ display: 'inline-block', opacity: p * out, filter: p < .97 ? `blur(${((1 - p) * 9).toFixed(1)}px)` : undefined,
            color: col, fontWeight: sd && !h ? 400 : undefined,
            textShadow: h === 1 ? '0 0 18px rgba(90,210,230,.5), 0 2px 6px rgba(0,0,0,.85)' : h === 2 ? '0 0 18px rgba(240,110,160,.5), 0 2px 6px rgba(0,0,0,.85)' : undefined }}>{c}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
};

/** 读数：宋体小标签 + Garamond 数字 */
export const Readout: React.FC<{ x: number; y: number; label: string; value: string; a: number; align?: 'left' | 'right'; color?: string; size?: number; sub?: string; glowc?: string }> =
  ({ x, y, label, value, a, align = 'left', color = '#BFEFF4', size = 60, sub, glowc = 'rgba(90,210,230,.25)' }) => a <= .003 ? null : (
  <div style={{ position: 'absolute', left: align === 'left' ? x : undefined, right: align === 'right' ? W - x : undefined, top: y, opacity: a, textAlign: align }}>
    <div style={{ fontFamily: F.serif, fontSize: 21, letterSpacing: '.32em', color: 'rgba(236,230,220,.62)', marginBottom: 8 }}>{label}</div>
    <div style={{ fontFamily: F.gara, fontSize: size, lineHeight: 1, color, letterSpacing: '.02em', textShadow: `0 0 24px ${glowc}` }}>{value}</div>
    {sub && <div style={{ fontFamily: F.serif, fontSize: 21, letterSpacing: '.18em', color: 'rgba(236,230,220,.5)', marginTop: 12 }}>{sub}</div>}
  </div>
);

/** 片名 */
export const Title: React.FC<{ t: number }> = ({ t }) => {
  const out = 1 - k(t, 6.6, 7.8, E.inOut), line = k(t, 1.4, 3.2, E.film);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: out }}>
      <div style={{ fontFamily: F.serif, fontWeight: 600, fontSize: 104, color: '#F3EEEA', letterSpacing: '.45em', marginLeft: '.45em', textShadow: '0 0 34px rgba(240,140,180,.28)' }}>
        <Reveal text="那我呢" t={t} t0={.3} stagger={.3} dur={1.6} mode="blur" />
      </div>
      <div style={{ width: 520 * line, height: 1, background: 'linear-gradient(90deg, rgba(255,230,240,0), rgba(255,230,240,.85), rgba(255,230,240,0))', margin: '44px 0 32px' }} />
      <div style={{ fontFamily: F.gara, fontSize: 26, letterSpacing: '.7em', marginLeft: '.7em', color: 'rgba(250,244,246,.88)', opacity: k(t, 2.2, 3.4) }}>PISCES</div>
    </AbsoluteFill>
  );
};
