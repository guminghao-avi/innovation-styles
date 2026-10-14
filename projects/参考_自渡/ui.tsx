// 游戏 UI：选择菜单、HUD 状态面板、获得物品、片名、字幕 —— 全部像素字（字号 12 的倍数）
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { F, W, H, k, E, clamp, seg, spring, typed, lerp, rnd } from '@kit';
import timing from './vo.timing.json';
import { T, C } from './common';
import { camY, TITLE_W, timeLapse } from './World';

const px: React.CSSProperties = { fontFamily: F.pixel, WebkitFontSmoothing: 'none', fontSmooth: 'never' as any, lineHeight: 1 };
const q4 = (v: number) => Math.round(v / 4) * 4;   // UI 也按 4px 网格走

/** 像素图标：字符画 → SVG 方块 */
const Icon: React.FC<{ rows: string[]; pal: Record<string, string>; s?: number; style?: React.CSSProperties }> = ({ rows, pal, s = 4, style }) => (
  <svg width={rows[0].length * s} height={rows.length * s} shapeRendering="crispEdges" style={{ display: 'inline-block', ...style }}>
    {rows.flatMap((r, y) => [...r].map((c, x) => pal[c] ? <rect key={x + ',' + y} x={x * s} y={y * s} width={s} height={s} fill={pal[c]} /> : null))}
  </svg>
);
const LOCK = ['..aaaa..', '.a....a.', '.a....a.', 'bbbbbbbb', 'bbbccbbb', 'bbbccbbb', 'bbbbbbbb'];
const PLANK = ['..........', '.bbbbbbbb.', 'baaaaaaaab', 'bbbbbbbbbb', '.cccccccc.'];

/** 像素窗口边框（RPG 对话框） */
const frame = (a = 1): React.CSSProperties => ({
  background: `rgba(13,16,32,${.94 * a})`,
  boxShadow: `0 0 0 4px #e6e9f2, 0 0 0 8px #0d1020, 0 0 0 12px ${C.ui}, 0 24px 60px rgba(0,0,0,.6)`,
});

// ================= 1. 选择菜单「谁能救我？」 =================
const OPTS = [
  { label: '家人', tag: '自顾不暇', at: 'opt1' }, { label: '朋友', tag: '已读不回', at: 'opt2' },
  { label: '公司', tag: '已被优化', at: 'opt3' }, { label: '运气', tag: '余额不足', at: 'opt4' },
];
export const Menu: React.FC<{ t: number }> = ({ t }) => {
  const close = T('close');
  if (t > close + .4) return null;
  const hClose = 1 - k(t, close, close + .18, E.in), wClose = 1 - k(t, close + .18, close + .32, E.in);
  const head = typed('谁能救我？', seg(t, -.12, .45));
  const optsIn = (i: number) => t >= .4 + i * .06;
  // 光标：跳到下一个选项（提前 .3 秒）
  const stops = [...OPTS.map(o => T(o.at)), T('lock')];
  let cur = 0; stops.forEach((s, i) => { if (t >= s - .3) cur = i; });
  const blink = Math.floor(t * 4) % 2 === 0;
  const lockT = t - T('lock');
  const Wd = 760, Ht = 528;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', left: W / 2 - Wd / 2, top: q4(H / 2 - Ht / 2 - 40), width: Wd, height: Ht, transform: `scale(${Math.max(.01, wClose)}, ${Math.max(.008, hClose)})`, ...frame() }}>
        <div style={{ ...px, position: 'absolute', left: 52, top: 44, fontSize: 24, color: C.ui, letterSpacing: '.3em' }}>SYSTEM · 01</div>
        <div style={{ ...px, position: 'absolute', left: 52, top: 96, fontSize: 60, color: C.text, letterSpacing: '.06em' }}>
          {head}<span style={{ opacity: head.length < 5 || blink ? 1 : 0, color: C.gold }}>_</span>
        </div>
        <div style={{ position: 'absolute', left: 52, right: 52, top: 184, height: 4, backgroundImage: `linear-gradient(90deg, ${C.ui} 50%, transparent 50%)`, backgroundSize: '16px 4px' }} />
        {[...OPTS, { label: '？？？', tag: '未解锁', at: 'lock' }].map((o, i) => {
          if (!optsIn(i)) return null;
          const at = T(o.at), on = t >= at, a = t - at, isLock = i === 4;
          const flash = on && a < .1;
          const gl = on && a < .2 ? Math.round((rnd(Math.floor(t * 30), i) - .5) * 4) * 4 : 0;   // 按下瞬间横向撕裂
          const col = isLock ? (on ? C.goldDim : C.text) : on ? C.gray : C.text;
          const tagS = on ? lerp(1.6, 1, spring(a, 3.2, .45)) : 0;
          const shakeL = isLock && on && a < .35 ? Math.round(Math.sin(a * 70) * 2) * 4 * (1 - a / .35) : 0;
          return (
            <div key={i} style={{ position: 'absolute', left: 52, right: 52, top: 224 + i * 60, height: 56, background: flash ? (isLock ? '#3a2e10' : '#5a1220') : undefined }}>
              <div style={{ ...px, position: 'absolute', left: 8, top: 4, fontSize: 48, color: C.gold, opacity: cur === i && (t < stops[i] || blink || isLock) ? 1 : 0 }}>▶</div>
              <div style={{ ...px, position: 'absolute', left: 72 + gl + shakeL, top: 4, fontSize: 48, color: col, letterSpacing: '.08em' }}>
                {o.label}
                {on && !isLock && <div style={{ position: 'absolute', left: -8, right: -8, top: 22, height: 4, background: C.red, opacity: .9 }} />}
              </div>
              {on && (
                <div style={{ ...px, position: 'absolute', right: 0, top: 10, fontSize: 36, color: isLock ? C.goldDim : C.red, transform: `scale(${tagS})`, transformOrigin: 'right center', display: 'flex', alignItems: 'center', gap: 16 }}>
                  {isLock && <Icon rows={LOCK} pal={{ a: '#8a6d2a', b: '#8a6d2a', c: '#1a1408' }} s={4} />}
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

// ================= 2. HUD（左上角一直挂着） =================
const dayAt = (t: number) => { const p = seg(t, T('roll0'), T('roll1')); return Math.max(1, Math.round(1 + 1286 * Math.pow(p, 2.2))); };
export const sentAt = (t: number) => {
  const p = seg(t, T('roll0'), T('roll1'));
  let n = Math.round(36 + 375 * Math.pow(p, 2.2));
  [0, 1, 2, 3].forEach(i => { if (t >= T('sig') + i * .62) n++; });
  return n;
};
export const HUD: React.FC<{ t: number }> = ({ t }) => {
  const t0 = T('iris') + .9; if (t < t0) return null;
  const a = t - t0, open = k(a, 0, .25, E.snap);
  const dim = 1 - .55 * k(t, T('tilt'), T('tilt') + 1, E.inOut) * (1 - k(t, T('down') + .6, T('down') + 1.4));
  const ready = t - T('ready');
  const st = ready < 0 ? '等待救援' : typed('准备出发', seg(ready, .25, .7));
  const noR = t - T('noReply'), redOn = noR >= 0 && noR < 1.4 && Math.floor(noR * 5) % 2 === 0;
  const rolling = t >= T('roll0') && t < T('roll1'), tl = timeLapse(t);
  const row = (label: string, val: React.ReactNode, i: number) => (
    <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 24, height: 60, opacity: a > .15 + i * .12 ? 1 : 0 }}>
      <div style={{ ...px, width: 120, fontSize: 36, color: C.ui }}>{label}</div>
      <div style={{ ...px, fontSize: 48, color: C.text }}>{val}</div>
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: 64, top: 64, padding: '28px 36px 20px', minWidth: 520, opacity: dim, transformOrigin: 'left top', transform: `scaleY(${Math.max(.02, open)})`,
      background: 'rgba(10,12,24,.72)', boxShadow: `0 0 0 4px ${C.ui}` }}>
      <div style={{ ...px, position: 'absolute', left: 24, top: -18, fontSize: 24, color: C.ui, background: '#0b0d18', padding: '6px 12px', letterSpacing: '.2em' }}>STATUS</div>
      {row('状态', ready < 0 ? <span style={{ color: C.cold }}>{st}</span> : (
        ready < .25
          ? <span style={{ position: 'relative', display: 'inline-block', color: C.gray }}>等待救援<span style={{ position: 'absolute', left: -4, right: -4, top: 22, height: 4, background: C.red }} /></span>
          : <span style={{ color: C.gold, textShadow: '0 0 18px rgba(242,193,78,.6)' }}>{st}<span style={{ opacity: st.length < 4 ? 1 : 0 }}>_</span></span>
      ), 0)}
      {row('已等待', <span style={{ color: rolling ? C.text : C.text, letterSpacing: '.04em' }}>DAY {String(dayAt(t)).padStart(4, '0')}<span style={{ ...px, fontSize: 24, color: C.ui, marginLeft: 16, opacity: tl > .2 ? 1 : 0 }}>▶▶</span></span>, 1)}
      {row('信号', <span>发出 {sentAt(t)}<span style={{ color: C.ui }}> / </span><span style={{ color: redOn ? C.redHot : C.text, textShadow: redOn ? '0 0 16px rgba(232,52,74,.8)' : undefined }}>回应 0</span></span>, 2)}
    </div>
  );
};

// ================= 3. 获得物品 =================
export const Toast: React.FC<{ t: number }> = ({ t }) => {
  const a = t - T('grab'); if (a < 0) return null;
  const x = lerp(560, 0, k(a, 0, .35, E.snap)) + lerp(0, 600, k(t, T('dIn') - .6, T('dIn') - .2, E.in));
  return (
    <div style={{ position: 'absolute', right: 64 - q4(x), top: 64, padding: '24px 36px', display: 'flex', alignItems: 'center', gap: 28, background: 'rgba(10,12,24,.82)', boxShadow: `0 0 0 4px ${C.gold}` }}>
      <Icon rows={PLANK} pal={{ a: '#9a6a3e', b: '#6a4428', c: '#3e2818' }} s={8} />
      <div>
        <div style={{ ...px, fontSize: 24, color: C.goldDim, letterSpacing: '.2em', marginBottom: 12 }}>获得物品</div>
        <div style={{ ...px, fontSize: 48, color: C.text }}>木板 <span style={{ color: C.gold }}>×1</span></div>
      </div>
    </div>
  );
};

// ================= 4. 片名（钉在世界的天空里，跟着镜头走） =================
export const Title: React.FC<{ t: number }> = ({ t }) => {
  const a = t - T('slam'); if (a < -.05) return null;
  const s = lerp(1.8, 1, spring(a, 3, .42));
  const y = (TITLE_W.y - camY(t)) * 5 + 2;
  const sub = typed('FERRY YOURSELF ACROSS', seg(a, .7, 1.5));
  return (
    <div style={{ position: 'absolute', left: 0, width: W, top: y, height: 0, opacity: Math.round((1 - seg(t, T('dIn') - .9, T('dIn') - .1)) * 4) / 4 }}>
      <div style={{ position: 'absolute', left: 0, width: W, top: -84, textAlign: 'center', transform: `scale(${s})`, opacity: a < 0 ? 0 : 1 }}>
        <span style={{ ...px, fontSize: 168, letterSpacing: '.3em', marginLeft: '.3em', color: C.gold,
          textShadow: `8px 8px 0 #3a2a10, 0 0 48px rgba(242,193,78,${.55 + .4 * Math.exp(-a / .3)})` }}>自渡</span>
      </div>
      <div style={{ ...px, position: 'absolute', left: 0, width: W, top: 116, textAlign: 'center', fontSize: 36, color: C.ui, letterSpacing: '.3em' }}>{sub}</div>
    </div>
  );
};

// ================= 5. 字幕：像素字 + 深色底条；**词** = 金（自己），「词」= 冷蓝（别人的船） =================
export const Sub: React.FC<{ t: number }> = ({ t }) => {
  const cur = (timing as any).lines.find((l: any) => t >= l.t0 && t < l.t1 + .35);
  if (!cur) return null;
  const chars: { c: string; h: number }[] = []; let h = 0;
  for (const c of [...cur.text.replace(/\*\*/g, '\u0001')]) {
    if (c === '\u0001') { h = h === 1 ? 0 : 1; continue; }
    if (c === '「') { h = 2; continue; } if (c === '」') { h = 0; continue; }
    chars.push({ c, h });
  }
  const n = Math.floor((t - cur.t0) / .032) + 1, out = t > cur.t1 + .2 ? 0 : 1;
  return (
    <div style={{ position: 'absolute', left: 0, width: W, bottom: 96, display: 'flex', justifyContent: 'center', opacity: out }}>
      <div style={{ ...px, fontSize: 48, letterSpacing: '.08em', color: C.text, padding: '12px 32px', background: 'rgba(10,12,24,.82)', borderLeft: `4px solid ${C.ui}`, whiteSpace: 'pre' }}>
        {chars.map((o, i) => (
          <span key={i} style={{ opacity: i < n ? 1 : 0, color: o.h === 1 ? C.gold : o.h === 2 ? C.cold : undefined,
            textShadow: o.h === 1 ? '0 0 16px rgba(242,193,78,.55)' : o.h === 2 ? '0 0 16px rgba(150,175,255,.5)' : undefined }}>{o.c}</span>
        ))}
      </div>
    </div>
  );
};
