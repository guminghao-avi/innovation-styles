// 潜水戴夫风 · 休闲游戏 UI：粗描边圆角面板（像能按下去的按钮）、明快的黄 / 珊瑚红 / 青、弹性入场。
//   Panel       通用面板（深海蓝底 + 6px 墨色描边 + 4px 浅青内边 + 硬投影）
//   O2Bar       左上角氧气条（气瓶图标 + 分格条 + 数值；低于 25% 变红闪）
//   DepthGauge  右侧深度计（刻度跟着深度滚动，指针处大字 "12.4m"）
//   Dialog      字幕 = 对话框：头像 + 名牌 + 打字机 + ▼；**词** 珊瑚红、「词」黄色
//   CatchCard   "GET!" 图鉴卡：放射光 + 精灵 + 名字 + 星级 + NEW 角标，弹入
//   CoinPop     "+120" 金币飘字
//   IntroCard   角色登场卡：斜切色带从左扫进来，名字 + 一句外号（定格感）
//   GridSVG     把 sprites.ts 的 Grid 渲染成 SVG（UI 里放像素图）
import React from 'react';
import { F, W, H, k, E, seg, spring, typed, lerp, clamp } from '@kit';
import { Grid, INK } from './sprites';

export const D = { ink: INK, panel: '#17325c', panel2: '#21467e', rim: '#8ff3ff', yellow: '#ffd23f', coral: '#ff6b4a', aqua: '#3ee6d6', white: '#f7fbff', dim: '#9fb6d8', red: '#ff3b4e' };
export const pxf: React.CSSProperties = { fontFamily: F.pixel, WebkitFontSmoothing: 'none', lineHeight: 1 };
export const fun: React.CSSProperties = { fontFamily: F.fun, lineHeight: 1 };

export const panel = (r = 18): React.CSSProperties => ({
  background: `linear-gradient(${D.panel2}, ${D.panel})`, borderRadius: r,
  boxShadow: `inset 0 0 0 4px ${D.rim}55, 0 0 0 6px ${D.ink}, 0 10px 0 6px rgba(5,15,35,.55)`,
});
export const Panel: React.FC<{ style?: React.CSSProperties; children?: React.ReactNode; r?: number }> = ({ style, children, r }) => <div style={{ position: 'absolute', ...panel(r), ...style }}>{children}</div>;

export const GridSVG: React.FC<{ grid: Grid; s?: number; flip?: boolean; style?: React.CSSProperties }> = ({ grid, s = 6, flip, style }) => {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  grid.m.forEach((_, key) => { const [x, y] = key.split(',').map(Number); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  return (
    <svg width={w * s} height={h * s} shapeRendering="crispEdges" style={{ display: 'block', transform: flip ? 'scaleX(-1)' : undefined, ...style }}>
      {[...grid.m.entries()].map(([key, c]) => { const [x, y] = key.split(',').map(Number); return <rect key={key} x={(x - x0) * s} y={(y - y0) * s} width={s} height={s} fill={c} />; })}
    </svg>
  );
};

/** 弹性入场：0 → 1（带一次回弹）；t 为入场后的秒数 */
export const pop = (t: number) => t <= 0 ? 0 : spring(t, 2.6, .42);

// ---------------- 氧气条 ----------------
export const O2Bar: React.FC<{ t: number; v: number; x?: number; y?: number }> = ({ t, v, x = 56, y = 52 }) => {
  if (t < 0) return null;
  const s = pop(t), low = v < .25, blink = low && Math.floor(t * 4) % 2 === 0, n = 16;
  return (
    <Panel style={{ left: x, top: y, width: 560, height: 92, transform: `scale(${s})`, transformOrigin: 'left top', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 18 }}>
      <svg width="36" height="60" shapeRendering="crispEdges"><rect x="6" y="6" width="24" height="52" rx="8" fill={D.yellow} stroke={D.ink} strokeWidth="4" /><rect x="12" y="0" width="12" height="10" fill="#c9d3dc" stroke={D.ink} strokeWidth="3" /><rect x="11" y="16" width="6" height="30" fill="#fff3a8" /></svg>
      <div style={{ ...pxf, fontSize: 36, color: D.white, width: 60 }}>O₂</div>
      <div style={{ display: 'flex', gap: 4, padding: 6, background: D.ink, borderRadius: 8 }}>
        {Array.from({ length: n }, (_, i) => <div key={i} style={{ width: 16, height: 32, borderRadius: 3, background: i < Math.round(v * n) ? (low ? (blink ? D.red : '#a8202e') : i < n * .3 ? D.coral : D.aqua) : '#24385a' }} />)}
      </div>
      <div style={{ ...pxf, fontSize: 36, color: low ? D.red : D.white, marginLeft: 6 }}>{Math.round(v * 100)}</div>
    </Panel>
  );
};

// ---------------- 深度计 ----------------
export const DepthGauge: React.FC<{ t: number; depth: number; x?: number; ppm?: number }> = ({ t, depth, x = W - 150, ppm = 22 }) => {
  if (t < 0) return null;
  const s = pop(t), top = 150, h = 640, cy = top + h / 2;
  const ticks: React.ReactNode[] = [];
  for (let m = Math.floor(depth - h / 2 / ppm); m <= depth + h / 2 / ppm; m++) {
    if (m < 0) continue;
    const y = cy + (m - depth) * ppm - top, major = m % 5 === 0;
    ticks.push(<div key={m} style={{ position: 'absolute', right: 0, top: y - 1.5, width: major ? 34 : 16, height: 3, background: major ? D.white : D.dim }} />);
    if (major) ticks.push(<div key={'l' + m} style={{ ...pxf, position: 'absolute', right: 44, top: y - 12, fontSize: 24, color: D.dim }}>{m}</div>);
  }
  return (
    <div style={{ position: 'absolute', left: x, top, width: 96, height: h, transform: `scale(${s})`, transformOrigin: 'right center' }}>
      <Panel style={{ inset: 0, overflow: 'hidden' }} r={14}><div style={{ position: 'absolute', right: 10, top: 0, bottom: 0, left: 0 }}>{ticks}</div></Panel>
      <div style={{ position: 'absolute', right: 104, top: h / 2 - 34, ...panel(12), background: D.yellow, boxShadow: `0 0 0 6px ${D.ink}, 0 8px 0 6px rgba(5,15,35,.55)`, padding: '14px 18px', whiteSpace: 'nowrap' }}>
        <span style={{ ...pxf, fontSize: 36, color: D.ink }}>{depth.toFixed(1)}m</span>
      </div>
      <div style={{ position: 'absolute', right: 96, top: h / 2 - 10, width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: `12px solid ${D.yellow}` }} />
    </div>
  );
};

// ---------------- 对话框字幕 ----------------
type Line = { id: string; text: string; t0: number; t1: number };
export const Dialog: React.FC<{ t: number; lines: Line[]; name?: string | ((l: Line) => string); portrait?: Grid; bottom?: number }> = ({ t, lines, name = '旁白', portrait, bottom = 56 }) => {
  const cur = lines.find(l => t >= l.t0 - .05 && t < l.t1 + .4);
  if (!cur) return null;
  const chars: { c: string; h: number }[] = []; let h = 0;
  for (const c of [...cur.text.replace(/\*\*/g, '\u0001')]) {
    if (c === '\u0001') { h = h === 1 ? 0 : 1; continue; }
    if (c === '「') { h = 2; continue; } if (c === '」') { h = 0; continue; }
    chars.push({ c, h });
  }
  const n = Math.floor((t - cur.t0) / .035) + 1, done = n >= chars.length;
  // 同一段对话框不反复弹：只在第一句和隔了 >0.6 秒的句子上弹
  const prev = lines[lines.indexOf(cur) - 1], fresh = !prev || cur.t0 - prev.t1 > .6;
  const s = fresh ? lerp(.6, 1, pop(t - cur.t0 + .05)) : 1, out = 1 - k(t, cur.t1 + .2, cur.t1 + .4);
  const nm = typeof name === 'function' ? name(cur) : name;
  const Wd = 1400;
  return (
    <div style={{ position: 'absolute', left: W / 2 - Wd / 2, bottom, width: Wd, height: 176, transform: `scale(${s})`, transformOrigin: 'center bottom', opacity: out }}>
      <Panel style={{ inset: 0, background: 'linear-gradient(#fffdf6, #f3ead6)', boxShadow: `inset 0 0 0 4px #ffffff, 0 0 0 6px ${D.ink}, 0 10px 0 6px rgba(5,15,35,.55)` }} />
      {portrait && <div style={{ position: 'absolute', left: 22, top: 20, width: 136, height: 136, borderRadius: 12, background: '#9fdcf0', boxShadow: `0 0 0 5px ${D.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}><GridSVG grid={portrait} s={5} /></div>}
      <div style={{ ...fun, position: 'absolute', left: portrait ? 150 : 40, top: -30, fontSize: 34, color: D.ink, background: D.yellow, padding: '10px 26px', borderRadius: 12, boxShadow: `0 0 0 5px ${D.ink}` }}>{nm}</div>
      <div style={{ ...fun, position: 'absolute', left: portrait ? 190 : 56, right: 70, top: 58, fontSize: 52, color: '#2a2f45', letterSpacing: '.03em', whiteSpace: 'pre' }}>
        {chars.map((o, i) => <span key={i} style={{ opacity: i < n ? 1 : 0, color: o.h === 1 ? D.coral : o.h === 2 ? '#e0a200' : undefined }}>{o.c}</span>)}
      </div>
      {done && Math.floor(t * 3) % 2 === 0 && <div style={{ position: 'absolute', right: 40, bottom: 22, width: 0, height: 0, borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderTop: `18px solid ${D.coral}` }} />}
    </div>
  );
};

// ---------------- 图鉴卡 ----------------
export const CatchCard: React.FC<{ t: number; grid: Grid; name: string; sub?: string; stars?: number; isNew?: boolean; out?: number; x?: number; y?: number }> =
  ({ t, grid, name, sub = '', stars = 3, isNew = true, out = 99, x = W / 2, y = 420 }) => {
  if (t < 0 || t > out + .4) return null;
  const s = pop(t) * (1 - k(t, out, out + .3, E.in)), rot = t * 22;
  return (
    <div style={{ position: 'absolute', left: x - 330, top: y - 300, width: 660, height: 560, transform: `scale(${s})` }}>
      {/* 放射光 */}
      <div style={{ position: 'absolute', left: 330 - 520, top: 230 - 520, width: 1040, height: 1040, borderRadius: '50%', opacity: .5,
        background: `repeating-conic-gradient(from ${rot}deg, rgba(255,240,170,.55) 0deg 9deg, rgba(255,240,170,0) 9deg 22.5deg)`, WebkitMaskImage: 'radial-gradient(circle, #000 25%, transparent 68%)' }} />
      <div style={{ ...fun, position: 'absolute', left: 0, right: 0, top: -6, textAlign: 'center', fontSize: 120, color: D.yellow, letterSpacing: '.04em',
        textShadow: `0 6px 0 ${D.ink}, 6px 0 0 ${D.ink}, -6px 0 0 ${D.ink}, 0 -6px 0 ${D.ink}, 6px 6px 0 ${D.ink}, -6px 6px 0 ${D.ink}, 0 16px 0 rgba(5,15,35,.5)`,
        transform: `rotate(-4deg) scale(${lerp(1.5, 1, pop(t - .05))})` }}>GET!</div>
      <Panel style={{ left: 80, top: 140, width: 500, height: 380, background: 'linear-gradient(#fffdf6, #efe3c8)', boxShadow: `inset 0 0 0 6px #ffffff, 0 0 0 6px ${D.ink}, 0 12px 0 6px rgba(5,15,35,.55)` }}>
        <div style={{ position: 'absolute', left: 30, right: 30, top: 28, height: 190, borderRadius: 12, background: 'linear-gradient(#bdeffc, #6fc9e6)', boxShadow: `0 0 0 4px ${D.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <GridSVG grid={grid} s={7} style={{ transform: `translateY(${Math.sin(t * 3) * 5}px)` }} />
        </div>
        <div style={{ ...fun, position: 'absolute', left: 0, right: 0, top: 240, textAlign: 'center', fontSize: 56, color: D.ink }}>{name}</div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 312, textAlign: 'center', fontSize: 40, letterSpacing: 8 }}>
          {Array.from({ length: 3 }, (_, i) => <span key={i} style={{ color: i < stars ? D.yellow : '#c9c0aa', WebkitTextStroke: `2px ${D.ink}`, display: 'inline-block', transform: `scale(${pop(t - .35 - i * .12)})` }}>★</span>)}
        </div>
        {sub && <div style={{ ...pxf, position: 'absolute', left: 0, right: 0, top: 360, textAlign: 'center', fontSize: 24, color: '#8a7f68' }}>{sub}</div>}
      </Panel>
      {isNew && <div style={{ ...pxf, position: 'absolute', left: 500, top: 118, fontSize: 36, color: D.white, background: D.coral, padding: '10px 16px', borderRadius: 10, boxShadow: `0 0 0 5px ${D.ink}`, transform: `rotate(12deg) scale(${pop(t - .25)})` }}>NEW</div>}
    </div>
  );
};

// ---------------- 金币飘字 ----------------
export const CoinPop: React.FC<{ t: number; x: number; y: number; text: string }> = ({ t, x, y, text }) => {
  if (t < 0 || t > 1.6) return null;
  const up = E.out(clamp(t / 1.2)) * 90, a = 1 - k(t, 1.1, 1.6);
  return (
    <div style={{ position: 'absolute', left: x, top: y - up, opacity: a, display: 'flex', alignItems: 'center', gap: 12, transform: `scale(${pop(t)})` }}>
      <svg width="48" height="48"><circle cx="24" cy="24" r="19" fill={D.yellow} stroke={D.ink} strokeWidth="5" /><rect x="20" y="13" width="8" height="22" rx="3" fill="#fff3a8" /></svg>
      <span style={{ ...pxf, fontSize: 60, color: D.yellow, textShadow: `4px 4px 0 ${D.ink}, -4px 4px 0 ${D.ink}, 4px -4px 0 ${D.ink}, -4px -4px 0 ${D.ink}` }}>{text}</span>
    </div>
  );
};

// ---------------- 角色登场卡 ----------------
export const IntroCard: React.FC<{ t: number; name: string; tag: string; dur?: number; col?: string }> = ({ t, name, tag, dur = 2.6, col = D.coral }) => {
  if (t < 0 || t > dur + .5) return null;
  const inn = E.snap(clamp(t / .35)), out = E.in(clamp((t - dur) / .4));
  const x = lerp(-W, 0, inn) + lerp(0, W * 1.2, out);
  return (
    <div style={{ position: 'absolute', left: 0, top: H * .56, width: W, height: 230, transform: `translateX(${x}px) skewY(-6deg)` }}>
      <div style={{ position: 'absolute', inset: 0, background: col, boxShadow: `0 0 0 8px ${D.ink}` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 26, height: 8, background: 'rgba(255,255,255,.35)' }} />
      <div style={{ ...fun, position: 'absolute', left: 820, top: 40, fontSize: 112, color: D.white, textShadow: `6px 6px 0 ${D.ink}`, transform: `translateX(${lerp(200, 0, E.snap(clamp((t - .1) / .4)))}px)` }}>{name}</div>
      <div style={{ ...pxf, position: 'absolute', left: 830, top: 170, fontSize: 36, color: D.ink, transform: `translateX(${lerp(300, 0, E.snap(clamp((t - .2) / .4)))}px)` }}>{typed(tag, seg(t, .3, 1))}</div>
    </div>
  );
};

/** 头顶的 "!" 气泡 */
export const Exclaim: React.FC<{ t: number; x: number; y: number }> = ({ t, x, y }) => {
  if (t < 0 || t > 1.4) return null;
  return <div style={{ ...fun, position: 'absolute', left: x - 30, top: y - 80 - 20 * pop(t), width: 60, height: 76, borderRadius: 16, background: D.white, boxShadow: `0 0 0 5px ${D.ink}`, fontSize: 64, color: D.coral, textAlign: 'center', lineHeight: '76px', transform: `scale(${pop(t)})`, opacity: 1 - k(t, 1.1, 1.4) }}>!</div>;
};
