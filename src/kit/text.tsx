// 文字：逐字揭示、字幕。原则：字是画面的一部分，不是贴上去的 —— 字号、字距、出现方式都要设计
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { FPS, W, H, k, E, clamp, seg, lerp } from './time';
import { F } from './fonts';
import type { VOTiming } from './vo';

type Mode = 'rise' | 'blur' | 'fade' | 'scale' | 'drop';
/** 逐字揭示：t = 场景局部秒（传 useT()），t0 开始，每字间隔 stagger，单字动画 dur
 *  mode：rise 从下浮起 / blur 虚焦对焦（电影片名）/ fade / scale 从大缩回 / drop 从上落下带回弹
 *  out：开始消失的时间（不传就不消失），消失也是逐字 */
export const Reveal: React.FC<{ text: string; t: number; t0?: number; stagger?: number; dur?: number; mode?: Mode; out?: number; style?: React.CSSProperties; charStyle?: (i: number, p: number) => React.CSSProperties }> =
  ({ text, t, t0 = 0, stagger = .06, dur = .7, mode = 'rise', out, style, charStyle }) => {
  const chars = [...text];
  return (
    <div style={{ display: 'inline-block', whiteSpace: 'pre', ...style }}>
      {chars.map((c, i) => {
        const a = t0 + i * stagger;
        let p = k(t, a, a + dur, mode === 'drop' ? E.back : E.snap);
        if (out != null) p *= 1 - k(t, out + i * stagger * .5, out + i * stagger * .5 + dur * .7, E.in);
        const o = clamp(mode === 'blur' ? seg(p, 0, .7) : p);
        const tf = mode === 'rise' ? `translateY(${(1 - p) * .45}em)` : mode === 'scale' ? `scale(${lerp(1.6, 1, p)})` : mode === 'drop' ? `translateY(${(p - 1) * .6}em)` : '';
        const bl = mode === 'blur' ? (1 - p) * 18 : mode === 'scale' ? (1 - p) * 10 : 0;
        return <span key={i} style={{ display: 'inline-block', opacity: o, transform: tf, filter: bl > .3 ? `blur(${bl.toFixed(1)}px)` : undefined, ...(charStyle?.(i, p) || {}) }}>{c}</span>;
      })}
    </div>
  );
};

/** 字幕：跟配音逐句走，长句按标点切成几段（按词时间切换）。片子本身就是"有人在讲"时才加；纯意境片可以不加
 *  look：cinema（细宋体、小字、宽字距）/ doc（纪录片黑体）/ bold（短视频大字，带底） */
export const Subtitles: React.FC<{ vo: VOTiming; look?: 'cinema' | 'doc' | 'bold'; max?: number; bottom?: number; hide?: string[]; color?: string; scrim?: number }> = ({ vo, look = 'cinema', max = 16, bottom = 92, hide = [], color = '#F2EEE6', scrim = .22 }) => {
  const t = useCurrentFrame() / FPS;
  const cur = vo.lines.find(l => t >= l.t0 - .05 && t < l.t1 + .25 && !hide.includes(l.id));
  if (!cur) return null;
  // 按标点切段，每段的时间按字符位置在词里查
  const parts: { s: string; a: number; b: number }[] = [];
  const raw = cur.text.split(/(?<=[，。！？；：、,.!?;…])/).filter(Boolean);
  let buf = '', start = 0, pos = 0;
  const timeAt = (ci: number) => { let n = 0; for (const w of cur.words) { if (n + w.w.length > ci) return w.t0; n += w.w.length; } return cur.t1; };
  raw.forEach((r, i) => { if (buf && (buf + r).length > max) { parts.push({ s: buf, a: timeAt(start), b: timeAt(pos) }); start = pos; buf = ''; } buf += r; pos += r.length; if (i === raw.length - 1) parts.push({ s: buf, a: timeAt(start), b: cur.t1 + .25 }); });
  const p = parts.find(x => t >= x.a - .05 && t < x.b) || parts[parts.length - 1];
  const clean = p.s.replace(/[，。；、,;]+$/g, '').replace(/[，。；、]/g, '　');
  const o = Math.min(seg(t, cur.t0 - .05, cur.t0 + .15), 1 - seg(t, cur.t1 + .05, cur.t1 + .25));
  const st: React.CSSProperties = look === 'cinema'
    ? { fontFamily: F.serif, fontWeight: 500, fontSize: 50, letterSpacing: '.1em', color, textShadow: '0 1px 2px rgba(0,0,0,.85), 0 0 18px rgba(0,0,0,.5)' }
    : look === 'doc'
    ? { fontFamily: F.cn, fontWeight: 500, fontSize: 50, letterSpacing: '.06em', color, textShadow: '0 2px 4px rgba(0,0,0,.8), 0 0 14px rgba(0,0,0,.5)' }
    : { fontFamily: F.cn, fontWeight: 800, fontSize: 58, letterSpacing: '.04em', color: '#fff', background: 'rgba(0,0,0,.55)', padding: '6px 22px', borderRadius: 6 };
  // scrim：字幕后面一层很淡的径向压暗（亮画面上也读得清，又看不出有底）
  return <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: bottom, pointerEvents: 'none' }}>
    {scrim > 0 && look !== 'bold' && <div style={{ position: 'absolute', left: W / 2 - 700, width: 1400, bottom: bottom - 90, height: 240, opacity: o * scrim, background: 'radial-gradient(closest-side, rgba(0,0,0,.85), rgba(0,0,0,0))' }} />}
    <div style={{ opacity: o, position: 'relative', ...st }}>{clean}</div></AbsoluteFill>;
};
