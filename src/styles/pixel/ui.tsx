// 自渡风 · 游戏 UI：全部像素字（F.pixel，字号 12 的倍数），UI 也走 4px 网格。
//   PixelSub   字幕：深色底条 + 左竖线，逐字打出；**词** = 金（自己），「词」= 冷蓝（别人）
//   HUD        左上角状态面板（STATUS 标签 + 一行行 标签/数值），scaleY 弹开
//   Menu       RPG 选择菜单：标题打字机、选项被划掉变灰 + 红色标签弹出、最后一项上锁 / 解锁
//   Toast      右上角"获得物品"卡（图标 + 名字 + ×1），从右滑入
//   SlamTitle  片名砸下来：大号金色像素字 + 8px 硬投影 + 辉光，下面英文副标题打字机
//   Icon       字符画 → SVG 方块（锁、木板、心……）
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { F, W, H, k, E, seg, spring, typed, lerp, rnd } from '@kit';
import { C } from './palette';

export const px: React.CSSProperties = { fontFamily: F.pixel, WebkitFontSmoothing: 'none', fontSmooth: 'never' as any, lineHeight: 1 };
export const q4 = (v: number) => Math.round(v / 4) * 4;
/** 透明度也按 4 档走（像素游戏没有细腻的淡入） */
export const stepA = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 4) / 4;

export const Icon: React.FC<{ rows: string[]; pal: Record<string, string>; s?: number; style?: React.CSSProperties }> = ({ rows, pal, s = 4, style }) => (
  <svg width={rows[0].length * s} height={rows.length * s} shapeRendering="crispEdges" style={{ display: 'inline-block', ...style }}>
    {rows.flatMap((r, y) => [...r].map((c, x) => pal[c] ? <rect key={x + ',' + y} x={x * s} y={y * s} width={s} height={s} fill={pal[c]} /> : null))}
  </svg>
);
export const ICONS = {
  lock: { rows: ['..aaaa..', '.a....a.', '.a....a.', 'bbbbbbbb', 'bbbccbbb', 'bbbccbbb', 'bbbbbbbb'], pal: { a: '#8a6d2a', b: '#8a6d2a', c: '#1a1408' } },
  plank: { rows: ['..........', '.bbbbbbbb.', 'baaaaaaaab', 'bbbbbbbbbb', '.cccccccc.'], pal: { a: '#9a6a3e', b: '#6a4428', c: '#3e2818' } },
  heart: { rows: ['.aa.aa.', 'abbabba', 'abbbbba', '.abbba.', '..aba..', '...a...'], pal: { a: '#7a1a28', b: '#e8344a' } },
};

/** RPG 窗口边框：白 4px + 黑 4px + 灰 4px 三层硬边 */
export const frame = (a = 1): React.CSSProperties => ({
  background: `rgba(13,16,32,${.94 * a})`,
  boxShadow: `0 0 0 4px ${C.text}, 0 0 0 8px #0d1020, 0 0 0 12px ${C.ui}, 0 24px 60px rgba(0,0,0,.6)`,
});

// ---------------- 字幕 ----------------
type Line = { id: string; text: string; t0: number; t1: number };
export const PixelSub: React.FC<{ t: number; lines: Line[]; bottom?: number }> = ({ t, lines, bottom = 96 }) => {
  const cur = lines.find(l => t >= l.t0 && t < l.t1 + .35);
  if (!cur) return null;
  const chars: { c: string; h: number }[] = []; let h = 0;
  for (const c of [...cur.text.replace(/\*\*/g, '\u0001')]) {
    if (c === '\u0001') { h = h === 1 ? 0 : 1; continue; }
    if (c === '「') { h = 2; continue; } if (c === '」') { h = 0; continue; }
    chars.push({ c, h });
  }
  const n = Math.floor((t - cur.t0) / .032) + 1, out = t > cur.t1 + .2 ? 0 : 1;
  return (
    <div style={{ position: 'absolute', left: 0, width: W, bottom, display: 'flex', justifyContent: 'center', opacity: out }}>
      <div style={{ ...px, fontSize: 48, letterSpacing: '.08em', color: C.text, padding: '12px 32px', background: 'rgba(10,12,24,.82)', borderLeft: `4px solid ${C.ui}`, whiteSpace: 'pre' }}>
        {chars.map((o, i) => (
          <span key={i} style={{ opacity: i < n ? 1 : 0, color: o.h === 1 ? C.gold : o.h === 2 ? C.cold : undefined,
            textShadow: o.h === 1 ? '0 0 16px rgba(242,193,78,.55)' : o.h === 2 ? '0 0 16px rgba(150,175,255,.5)' : undefined }}>{o.c}</span>
        ))}
      </div>
    </div>
  );
};

// ---------------- HUD ----------------
export type HudRow = { label: string; value: React.ReactNode; flash?: boolean };
/** t = 距离打开的秒数（<0 不显示） */
export const HUD: React.FC<{ t: number; rows: HudRow[]; title?: string; x?: number; y?: number; dim?: number; minW?: number }> = ({ t, rows, title = 'STATUS', x = 64, y = 64, dim = 1, minW = 520 }) => {
  if (t < 0) return null;
  const open = k(t, 0, .25, E.snap);
  return (
    <div style={{ position: 'absolute', left: x, top: y, padding: '28px 36px 20px', minWidth: minW, opacity: dim, transformOrigin: 'left top', transform: `scaleY(${Math.max(.02, open)})`,
      background: 'rgba(10,12,24,.72)', boxShadow: `0 0 0 4px ${C.ui}` }}>
      <div style={{ ...px, position: 'absolute', left: 24, top: -18, fontSize: 24, color: C.ui, background: '#0b0d18', padding: '6px 12px', letterSpacing: '.2em' }}>{title}</div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 24, height: 60, opacity: t > .15 + i * .12 ? 1 : 0 }}>
          <div style={{ ...px, width: 120, fontSize: 36, color: C.ui }}>{r.label}</div>
          <div style={{ ...px, fontSize: 48, color: r.flash ? C.redHot : C.text, textShadow: r.flash ? '0 0 16px rgba(232,52,74,.8)' : undefined }}>{r.value}</div>
        </div>
      ))}
    </div>
  );
};
/** 进度格：■■■■□□□□ */
export const Bar: React.FC<{ v: number; n?: number; col?: string }> = ({ v, n = 12, col = C.gold }) => (
  <span style={{ display: 'inline-flex', gap: 4, marginLeft: 16, verticalAlign: 'middle' }}>
    {Array.from({ length: n }, (_, i) => <span key={i} style={{ width: 12, height: 24, background: i < Math.round(v * n) ? col : '#2a3050' }} />)}
  </span>
);

// ---------------- 选择菜单 ----------------
export type Opt = { label: string; tag: string; at: number; lock?: boolean };
/** t = 菜单局部秒（0 = 开始打标题）；opts[i].at = 这一项被划掉 / 解锁的局部秒；close = 收起时刻 */
export const Menu: React.FC<{ t: number; title: string; opts: Opt[]; close?: number; sys?: string }> = ({ t, title, opts, close = 99, sys = 'SYSTEM · 01' }) => {
  if (t < 0 || t > close + .4) return null;
  const hClose = 1 - k(t, close, close + .18, E.in), wClose = 1 - k(t, close + .18, close + .32, E.in);
  const head = typed(title, seg(t, 0, .5));
  let cur = 0; opts.forEach((o, i) => { if (t >= o.at - .3) cur = i; });
  const blink = Math.floor(t * 4) % 2 === 0;
  const Wd = 760, Ht = 224 + opts.length * 60 + 32;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: W / 2 - Wd / 2, top: q4(H / 2 - Ht / 2 - 40), width: Wd, height: Ht, transform: `scale(${Math.max(.01, wClose)}, ${Math.max(.008, hClose)})`, ...frame() }}>
        <div style={{ ...px, position: 'absolute', left: 52, top: 44, fontSize: 24, color: C.ui, letterSpacing: '.3em' }}>{sys}</div>
        <div style={{ ...px, position: 'absolute', left: 52, top: 96, fontSize: 60, color: C.text, letterSpacing: '.06em' }}>
          {head}<span style={{ opacity: head.length < [...title].length || blink ? 1 : 0, color: C.gold }}>_</span>
        </div>
        <div style={{ position: 'absolute', left: 52, right: 52, top: 184, height: 4, backgroundImage: `linear-gradient(90deg, ${C.ui} 50%, transparent 50%)`, backgroundSize: '16px 4px' }} />
        {opts.map((o, i) => {
          if (t < .4 + i * .06) return null;
          const on = t >= o.at, a = t - o.at, flash = on && a < .1;
          const gl = on && a < .2 ? Math.round((rnd(Math.floor(t * 30), i) - .5) * 4) * 4 : 0;   // 按下瞬间横向撕裂
          const col = o.lock ? (on ? C.gold : C.text) : on ? C.gray : C.text;
          const tagS = on ? lerp(1.6, 1, spring(a, 3.2, .45)) : 0;
          return (
            <div key={i} style={{ position: 'absolute', left: 52, right: 52, top: 224 + i * 60, height: 56, background: flash ? (o.lock ? '#3a2e10' : '#5a1220') : undefined }}>
              <div style={{ ...px, position: 'absolute', left: 8, top: 4, fontSize: 48, color: C.gold, opacity: cur === i && (t < o.at || blink || o.lock) ? 1 : 0 }}>▶</div>
              <div style={{ ...px, position: 'absolute', left: 72 + gl, top: 4, fontSize: 48, color: col, letterSpacing: '.08em', textShadow: o.lock && on ? '0 0 18px rgba(242,193,78,.6)' : undefined }}>
                {o.label}
                {on && !o.lock && <div style={{ position: 'absolute', left: -8, right: -8, top: 22, height: 4, background: C.red, opacity: .9 }} />}
              </div>
              {(on || o.lock) && (
                <div style={{ ...px, position: 'absolute', right: 0, top: 10, fontSize: 36, color: o.lock ? C.goldDim : C.red, transform: `scale(${o.lock && !on ? 1 : tagS})`, transformOrigin: 'right center', display: 'flex', alignItems: 'center', gap: 16 }}>
                  {o.lock && !on && <Icon {...ICONS.lock} s={4} />}
                  {o.tag}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------------- 获得物品 ----------------
export const Toast: React.FC<{ t: number; icon: keyof typeof ICONS; label?: string; name: string; count?: string; out?: number }> = ({ t, icon, label = '获得物品', name, count = '×1', out = 99 }) => {
  if (t < 0) return null;
  const x = lerp(560, 0, k(t, 0, .35, E.snap)) + lerp(0, 600, k(t, out, out + .4, E.in));
  return (
    <div style={{ position: 'absolute', right: 64 - q4(x), top: 64, padding: '24px 36px', display: 'flex', alignItems: 'center', gap: 28, background: 'rgba(10,12,24,.82)', boxShadow: `0 0 0 4px ${C.gold}` }}>
      <Icon {...ICONS[icon]} s={8} />
      <div>
        <div style={{ ...px, fontSize: 24, color: C.goldDim, letterSpacing: '.2em', marginBottom: 12 }}>{label}</div>
        <div style={{ ...px, fontSize: 48, color: C.text }}>{name} <span style={{ color: C.gold }}>{count}</span></div>
      </div>
    </div>
  );
};

// ---------------- 片名 ----------------
export const SlamTitle: React.FC<{ t: number; text: string; sub?: string; y?: number; out?: number }> = ({ t, text, sub = '', y = 360, out = 99 }) => {
  if (t < -.05) return null;
  const s = lerp(1.8, 1, spring(t, 3, .42)), o = stepA(1 - seg(t, out, out + .8));
  const st = typed(sub, seg(t, .7, 1.5));
  return (
    <div style={{ position: 'absolute', left: 0, width: W, top: y, opacity: o }}>
      <div style={{ textAlign: 'center', transform: `scale(${s})`, opacity: t < 0 ? 0 : 1 }}>
        <span style={{ ...px, fontSize: 168, letterSpacing: '.3em', marginLeft: '.3em', color: C.gold, textShadow: `8px 8px 0 #3a2a10, 0 0 48px rgba(242,193,78,${.55 + .4 * Math.exp(-t / .3)})` }}>{text}</span>
      </div>
      <div style={{ ...px, marginTop: 40, textAlign: 'center', fontSize: 36, color: C.ui, letterSpacing: '.3em' }}>{st}</div>
    </div>
  );
};
