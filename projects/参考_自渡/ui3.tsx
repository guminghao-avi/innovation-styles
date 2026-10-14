// 第三、四段的 UI：状态面板（积水 / 距离 / 回应）、砸下来的话、对话气泡、小标签
import React from 'react';
import { k, E, seg, spring, typed, lerp, rnd } from '@kit';
import { T, C } from './common';
import { px, stepA, Toasts } from './ui2';
import { WORDS, wordT, waterAt, kmAt, isWide, voyageView } from './Voyage';

const gold = (s: React.ReactNode) => <span style={{ color: C.gold, textShadow: '0 0 18px rgba(242,193,78,.6)' }}>{s}</span>;
const red = (s: React.ReactNode, on = true) => <span style={{ color: on ? C.redHot : C.red, textShadow: on ? '0 0 16px rgba(232,52,74,.8)' : undefined }}>{s}</span>;
const cold = (s: React.ReactNode) => <span style={{ color: C.cold }}>{s}</span>;
const bar = (v: number, n: number, col: string) => (
  <span style={{ letterSpacing: 0, fontSize: 30, verticalAlign: 'middle' }}>{Array.from({ length: n }, (_, i) => <span key={i} style={{ color: i < Math.round(v * n) ? col : '#2a3050' }}>▮</span>)}</span>
);

export const HUDSea: React.FC<{ t: number }> = ({ t }) => {
  if (t < T('fIn') || t >= T('you')) return null;
  const w = waterAt(t), blink = Math.floor(t * 5) % 2 === 0, wide = isWide(t);
  let st: React.ReactNode = gold('航行中');
  if (t >= T('rain0')) st = cold('暴雨');
  if (w >= 60) st = red('积水警告', blink);
  if (t >= T('flow')) st = cold('排水中');
  if (t >= T('row')) st = gold('航行中');
  if (wide) st = cold('……');
  if (t >= T('lamps')) st = gold('发现灯光');
  if (t >= T('rope')) st = gold('组队中');
  if (t >= T('dawn')) st = gold('天亮了');
  const rows: [string, React.ReactNode, number?][] = [['状态', st]];
  if (!wide) {
    rows.push(['积水', <span>{w >= 60 ? red(`${w}%`, blink) : `${w}%`} {bar(w / 100, 10, w >= 60 ? C.red : C.cold)}</span>]);
    rows.push(['距离', `${kmAt(t).toFixed(1)} km`]);
  } else {
    const rp = t - T('reply'), on = rp >= 0;
    rows.push(['距离', `${kmAt(t).toFixed(1)} km`]);
    rows.push(['信号', <span>发出 416<span style={{ color: C.ui }}> / </span>{on ? gold('回应 1') : '回应 0'}</span>, on && rp < 1 ? 1 - rp : 0]);
  }
  return (
    <div style={{ position: 'absolute', left: 64, top: 64, padding: '28px 36px 20px', minWidth: 520, background: 'rgba(10,12,24,.72)', boxShadow: `0 0 0 4px ${C.ui}` }}>
      <div style={{ ...px, position: 'absolute', left: 24, top: -18, fontSize: 24, color: C.ui, background: '#0b0d18', padding: '6px 12px', letterSpacing: '.2em' }}>STATUS</div>
      {rows.map(([l, v, fl], i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 24, height: 60, background: fl ? `rgba(242,193,78,${.25 * fl})` : undefined }}>
          <div style={{ ...px, width: 120, fontSize: 36, color: C.ui }}>{l}</div>
          <div style={{ ...px, fontSize: 48, color: C.text }}>{v}</div>
        </div>
      ))}
    </div>
  );
};

// ================= 砸下来的话：一块块压在木筏上，"流过去"时化成水淌走 =================
const SLOT: [number, number][] = [[-160, -10], [150, -10], [-250, -92], [220, -92], [-220, -176], [200, -176]];
export const Words: React.FC<{ t: number }> = ({ t }) => {
  if (t < T('words') - .2 || t > T('dry') + .5 || isWide(t)) return null;
  const v = voyageView(t), rx = (v.raftSX + 12) * v.px, ry = (v.raftY - v.camY) * v.px;
  return (
    <>
      {WORDS.map((w, i) => {
        const t0 = wordT(i), a = t - t0; if (a < 0) return null;
        const fall = Math.min(1, a / .45), land = a >= .45;
        const [ox, oy] = SLOT[i];
        let y = lerp(-140, ry + oy - 60, fall * fall), x = rx + ox;
        // 落定时被压扁一下
        const sq = land ? 1 + .25 * Math.exp(-(a - .45) * 14) * Math.cos((a - .45) * 30) : 1;
        // 流过去：一个字一个字往下淌，变成水的颜色
        const fl = seg(t, T('flow') + i * .22, T('flow') + i * .22 + 1.4);
        const col = fl > 0 ? (fl > .5 ? '#6a76b4' : '#9aa6d8') : i % 2 ? '#c94f5a' : '#a8a2b8';
        return (
          <div key={i} style={{ ...px, position: 'absolute', left: Math.round(x / 6) * 6, top: Math.round(y / 6) * 6, transform: `translateX(-50%) scale(${1 / sq}, ${sq})`, transformOrigin: 'center bottom',
            fontSize: i === 2 || i === 4 ? 60 : 72, color: col, letterSpacing: '.04em', whiteSpace: 'pre', textShadow: '6px 6px 0 #0b0b14', opacity: stepA(1 - fl) }}>
            {[...w].map((c, j) => <span key={j} style={{ display: 'inline-block', transform: `translateY(${Math.round(fl * (80 + 60 * rnd(j, i)) / 6) * 6}px)` }}>{c}</span>)}
          </div>
        );
      })}
    </>
  );
};

// ================= 对话气泡（远景，木筏上方） =================
const Bubble: React.FC<{ x: number; y: number; text: string; p: number; tone?: 'white' | 'gold'; tail?: 'left' | 'right' }> = ({ x, y, text, p, tone = 'white', tail = 'left' }) => {
  const s = typed(text, p), bg = tone === 'gold' ? '#fff0b8' : '#e6e9f2';
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: 'translate(-50%, -100%)' }}>
      <div style={{ ...px, fontSize: 48, color: '#0b0d18', background: bg, padding: '18px 28px', boxShadow: `0 0 0 4px #0b0d18`, whiteSpace: 'pre', minWidth: 60 }}>{s || ' '}</div>
      <div style={{ position: 'absolute', [tail === 'left' ? 'left' : 'right']: 36, bottom: -16, width: 16, height: 16, background: bg, boxShadow: '4px 4px 0 #0b0d18' }} />
    </div>
  );
};
export const Talk: React.FC<{ t: number }> = ({ t }) => {
  if (!isWide(t) || t >= T('you')) return null;
  const a = T('ask'), r = T('reply'), out: React.ReactNode[] = [];
  if (t >= a && t < T('g8') + .2) out.push(<Bubble key="a" x={(96 + 2) * 5} y={(204 - 26 - 50) * 5} text="能帮我一下吗？" p={seg(t, a, a + .9)} />);
  if (t >= r && t < T('g8') + .2) out.push(<Bubble key="r" x={(146 + 12) * 5} y={(200 - 30 - 50) * 5 - 110} text="来了！" p={seg(t, r, r + .35)} tone="gold" tail="left" />);
  const ro = T('rope') + .6;
  if (t >= ro && t < ro + 1.6) out.push(<div key="c" style={{ ...px, position: 'absolute', left: (118 + 6) * 5, top: (200 - 50) * 5 - 120 - Math.min(20, (t - ro) * 30), transform: 'translateX(-50%)', fontSize: 36, color: C.gold, opacity: stepA(1 - seg(t, ro + 1.1, ro + 1.6)), textShadow: '0 0 12px rgba(242,193,78,.6)' }}>已连接</div>);
  return <>{out}</>;
};
export const SEA_TOASTS = () => [{ t: T('reply') + .5, icon: 'talk' as const, name: '回应 ×1', sub: '你开口了，有人听见' }];
export const SeaToasts: React.FC<{ t: number }> = ({ t }) => <Toasts t={t} list={SEA_TOASTS()} />;
