// 第二段以后的游戏 UI：状态面板（随剧情换行）、获得物品、横幅、目标清单 → 一天一格、世界里的小标签和对话气泡
import React from 'react';
import { F, W, H, k, E, seg, spring, typed, lerp, rnd, clamp } from '@kit';
import { T, C } from './common';
import { pileN, hullAt, PLANK_IN, CH, PILE, isleCamX, VIEW } from './Isle';

export const px: React.CSSProperties = { fontFamily: F.pixel, WebkitFontSmoothing: 'none', fontSmooth: 'never' as any, lineHeight: 1 };
const q5 = (v: number) => Math.round(v / 5) * 5;
/** 世界坐标 → 屏幕（像素 5 倍，camY 50） */
export const W2S = (wx: number, wy: number, camX: number, camY = VIEW.camY, s = VIEW.px): [number, number] => [(wx - camX) * s + s / 2, (wy - camY) * s + s / 2];
/** 像素风的淡入淡出：按 4 级跳，不是平滑的 */
export const stepA = (v: number) => Math.round(clamp(v) * 4) / 4;

export const Icon: React.FC<{ rows: string[]; pal: Record<string, string>; s?: number; style?: React.CSSProperties }> = ({ rows, pal, s = 4, style }) => (
  <svg width={rows[0].length * s} height={rows.length * s} shapeRendering="crispEdges" style={{ display: 'inline-block', ...style }}>
    {rows.flatMap((r, y) => [...r].map((c, x) => pal[c] ? <rect key={x + ',' + y} x={x * s} y={y * s} width={s} height={s} fill={pal[c]} /> : null))}
  </svg>
);
export const PLANK = ['..........', '.bbbbbbbb.', 'baaaaaaaab', 'bbbbbbbbbb', '.cccccccc.'];
const PLANK_PAL = { a: '#9a6a3e', b: '#6a4428', c: '#3e2818' };
const BOOK = ['.aaaaaa.', 'abbbbbba', 'abbbbbba', 'abbbbbba', 'acccccca', '.aaaaaa.'];
const MOONI = ['..aaa...', '.aa.....', 'aa......', 'aa......', 'aa....a.', '.aa..aa.', '..aaaa..'];
const TALK = ['aaaaaaaaaa', 'abbbbbbbba', 'abccbccbba', 'abbbbbbbba', 'aaaaaaaaaa', '..aa......', '.aa.......'];
const RAFTI = ['............', '.a.a.a.a.a..', 'bbbbbbbbbbbb', 'cccccccccccc', '.d........d.'];

// ================= 状态面板 =================
export type Row = { label: string; value: React.ReactNode; flash?: number };
const Panel: React.FC<{ rows: Row[]; a: number }> = ({ rows, a }) => (
  <div style={{ position: 'absolute', left: 64, top: 64, padding: '28px 36px 20px', minWidth: 520, opacity: a, background: 'rgba(10,12,24,.72)', boxShadow: `0 0 0 4px ${C.ui}` }}>
    <div style={{ ...px, position: 'absolute', left: 24, top: -18, fontSize: 24, color: C.ui, background: '#0b0d18', padding: '6px 12px', letterSpacing: '.2em' }}>STATUS</div>
    {rows.map((r, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 24, height: 60, background: r.flash ? `rgba(242,193,78,${.18 * r.flash})` : undefined }}>
        <div style={{ ...px, width: 120, fontSize: 36, color: C.ui }}>{r.label}</div>
        <div style={{ ...px, fontSize: 48, color: C.text }}>{r.value}</div>
      </div>
    ))}
  </div>
);
const gold = (s: React.ReactNode) => <span style={{ color: C.gold, textShadow: '0 0 18px rgba(242,193,78,.6)' }}>{s}</span>;
const red = (s: React.ReactNode, on = true) => <span style={{ color: on ? C.redHot : C.red, textShadow: on ? '0 0 16px rgba(232,52,74,.8)' : undefined }}>{s}</span>;
const cold = (s: React.ReactNode) => <span style={{ color: C.cold }}>{s}</span>;
const bar = (v: number, n = 10, col = C.gold) => (
  <span style={{ letterSpacing: 0, fontSize: 30, verticalAlign: 'middle' }}>{Array.from({ length: n }, (_, i) => <span key={i} style={{ color: i < Math.round(v * n) ? col : '#2a3050' }}>▮</span>)}</span>
);

/** 第二段（岛上 + 第一次出海）的状态面板 */
export const HUDIsle: React.FC<{ t: number }> = ({ t }) => {
  if (t >= T('fIn')) return null;
  const n = pileN(t), hull = hullAt(t);
  const lastIn = PLANK_IN().filter(p => t >= p).pop() ?? -9, fl = Math.max(0, 1 - (t - lastIn) / .4);
  let st: React.ReactNode = gold('准备出发');
  if (t >= T('d2')) st = gold('收集材料');
  if (t >= T('craft')) st = gold('合成中');
  if (t >= T('launch')) st = gold('航行中');
  if (t >= T('crack')) st = red('船体异常', Math.floor(t * 5) % 2 === 0);
  if (t >= T('sink')) st = red('船体损毁');
  if (t >= T('swim')) st = cold('落水');
  if (t >= T('fetch')) st = gold('修理中');
  if (t >= T('lv2')) st = gold('准备出发');
  const day = 1287 + Math.round(14 * seg(t, T('rush'), T('rushEnd'))) + (t >= T('wake') ? 1 : 0);
  const rows: Row[] = [{ label: '状态', value: st }];
  if (t < T('craftEnd')) {
    rows.push({ label: '已等待', value: `DAY ${day}` });
    rows.push(t < T('d2') ? { label: '信号', value: <span>发出 415<span style={{ color: C.ui }}> / </span>回应 0</span> }
      : { label: '木板', value: <span>{n >= 12 ? gold(`${n}/12`) : `${n}/12`} {bar(n / 12, 12, C.gold)}</span>, flash: fl });
  } else {
    rows.push({ label: '船体', value: hull >= 200 ? <span>{gold('Lv.2')} {bar(1, 10, C.gold)}</span> : <span>{hull < 60 ? red(`${hull}%`, hull > 0 && Math.floor(t * 5) % 2 === 0) : `${hull}%`} {bar(hull / 100, 10, hull < 60 ? C.red : C.gold)}</span> });
    rows.push({ label: '木板', value: `${n}/12`, flash: fl });
  }
  return <Panel rows={rows} a={1} />;
};

// ================= 获得物品（右上角，排队弹出） =================
type ToastE = { t: number; icon: 'plank' | 'book' | 'moon' | 'raft' | 'talk'; name: string; sub: string };
export const TOASTS = (): ToastE[] => [
  { t: PLANK_IN()[1], icon: 'plank', name: '木板 ×1', sub: '改过一版的简历' },
  { t: PLANK_IN()[2], icon: 'plank', name: '木板 ×1', sub: '一天一格' },
  { t: T('d7.end') - .4, icon: 'book', name: '新技能', sub: '学会了，就是你的' },
  { t: PLANK_IN()[4], icon: 'moon', name: '体力 回满', sub: '睡了一觉' },
];
export const Toasts: React.FC<{ t: number; list: ToastE[] }> = ({ t, list }) => {
  const cur = list.filter(e => t >= e.t && t < e.t + 2.4).pop(); if (!cur) return null;
  const a = t - cur.t, x = lerp(620, 0, k(a, 0, .3, E.snap)) + lerp(0, 620, k(a, 2.05, 2.4, E.in));
  const ic = cur.icon === 'plank' ? <Icon rows={PLANK} pal={PLANK_PAL} s={8} /> : cur.icon === 'book' ? <Icon rows={BOOK} pal={{ a: '#e6e9f2', b: '#c94f4f', c: '#9aa0b8' }} s={8} />
    : cur.icon === 'moon' ? <Icon rows={MOONI} pal={{ a: C.gold }} s={8} /> : cur.icon === 'talk' ? <Icon rows={TALK} pal={{ a: C.gold, b: '#fff0b8', c: '#0b0d18' }} s={8} /> : <Icon rows={RAFTI} pal={{ a: '#c9cee0', b: '#9a6a3e', c: '#6a4428', d: '#3e2818' }} s={8} />;
  return (
    <div style={{ position: 'absolute', right: 64 - q5(x), top: 64, padding: '24px 36px', display: 'flex', alignItems: 'center', gap: 28, background: 'rgba(10,12,24,.86)', boxShadow: `0 0 0 4px ${C.gold}` }}>
      {ic}
      <div>
        <div style={{ ...px, fontSize: 24, color: C.goldDim, letterSpacing: '.2em', marginBottom: 12 }}>获得</div>
        <div style={{ ...px, fontSize: 48, color: C.text }}>{cur.name}</div>
        <div style={{ ...px, fontSize: 24, color: C.ui, marginTop: 12, letterSpacing: '.1em' }}>{cur.sub}</div>
      </div>
    </div>
  );
};

// ================= 横幅（屏幕中间砸下来） =================
type BannerE = { t: number; dur: number; text: string; sub?: string; tone: 'gold' | 'red' };
export const BANNERS = (): BannerE[] => [
  { t: T('rushEnd') + .1, dur: 1.6, text: '材料已集齐', sub: '木板 12/12', tone: 'gold' },
  { t: T('craftEnd'), dur: 2.0, text: '合成成功', sub: '木筏 Lv.1', tone: 'gold' },
  { t: T('e3') - .12, dur: 2.6, text: '船体损毁', sub: 'HULL 0%', tone: 'red' },
  { t: T('lv2'), dur: 1.6, text: '合成成功', sub: '木筏 Lv.2 · 钉得更牢', tone: 'gold' },
];
export const Banners: React.FC<{ t: number; list: BannerE[] }> = ({ t, list }) => {
  const b = list.find(e => t >= e.t && t < e.t + e.dur); if (!b) return null;
  const a = t - b.t, s = lerp(1.5, 1, spring(a, 3.2, .45)), out = 1 - k(a, b.dur - .25, b.dur, E.in);
  const col = b.tone === 'red' ? C.red : C.gold, glowc = b.tone === 'red' ? 'rgba(232,52,74,.6)' : 'rgba(242,193,78,.55)';
  return (
    <div style={{ position: 'absolute', left: 0, width: W, top: 340, display: 'flex', justifyContent: 'center', opacity: stepA(out) }}>
      <div style={{ transform: `scale(${s}, ${s * Math.max(.05, k(a, 0, .12))})`, padding: '28px 72px 24px', background: 'rgba(10,12,24,.88)', boxShadow: `0 0 0 4px ${col}, 0 0 0 8px #0b0d18, 0 0 0 12px ${col}55`, textAlign: 'center' }}>
        <div style={{ ...px, fontSize: 84, color: col, letterSpacing: '.2em', marginLeft: '.2em', textShadow: `6px 6px 0 #0b0d18, 0 0 36px ${glowc}` }}>{b.text}</div>
        {b.sub && <div style={{ ...px, fontSize: 36, color: C.ui, marginTop: 20, letterSpacing: '.2em' }}>{b.sub}</div>}
      </div>
    </div>
  );
};

// ================= 年度目标 → 一天一格 =================
const GOALS = ['存下两万块', '考一个证', '读完 12 本书', '每周运动三次'];
export const Goals: React.FC<{ t: number }> = ({ t }) => {
  const t0 = T('goals'), tg = T('grid'), tc = T('d6.end') + .1;
  if (t < t0 || t > tc + .35) return null;
  const open = k(t, t0, t0 + .22, E.snap), close = 1 - k(t, tc, tc + .3, E.in);
  const toGrid = k(t, tg, tg + .35, E.inOut);
  const left = 1120, top = 300, Wd = 700;
  return (
    <div style={{ position: 'absolute', left, top, width: Wd, padding: '36px 44px', transformOrigin: 'center top', transform: `scaleY(${Math.max(.02, open * close)})`, background: 'rgba(10,12,24,.9)', boxShadow: `0 0 0 4px #e6e9f2, 0 0 0 8px #0d1020, 0 0 0 12px ${C.ui}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ ...px, fontSize: 36, color: C.text, letterSpacing: '.1em' }}>{toGrid < .5 ? '年度目标' : '一天一格'}</div>
        <div style={{ ...px, fontSize: 36, color: toGrid < .5 ? C.red : C.gold, opacity: toGrid < .5 && Math.floor(t * 3) % 2 ? .45 : 1 }}>{toGrid < .5 ? '剩余 79 天' : `已完成 ${Math.max(0, Math.min(12, Math.floor((t - tg - .4) / .13)))} / 79`}</div>
      </div>
      <div style={{ height: 4, margin: '24px 0 28px', backgroundImage: `linear-gradient(90deg, ${C.ui} 50%, transparent 50%)`, backgroundSize: '16px 4px' }} />
      {toGrid < .5 ? (
        <div style={{ opacity: stepA(1 - toGrid * 2) }}>
          {GOALS.map((g, i) => (
            <div key={i} style={{ ...px, fontSize: 48, color: C.text, height: 72, display: 'flex', alignItems: 'center', gap: 24, opacity: t > t0 + .15 + i * .1 ? 1 : 0 }}>
              <span style={{ display: 'inline-block', width: 36, height: 36, boxShadow: `inset 0 0 0 4px ${C.ui}` }} />{g}
              <span style={{ ...px, fontSize: 24, color: C.gray, marginLeft: 'auto' }}>0%</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(14, 36px)', gap: 8, opacity: stepA((toGrid - .5) * 2) }}>
          {Array.from({ length: 79 }, (_, i) => {
            const on = t >= tg + .4 + i * .13 && i < 12;
            const pop = on ? lerp(1.5, 1, spring(t - tg - .4 - i * .13, 4, .5)) : 1;
            return <div key={i} style={{ width: 36, height: 36, transform: `scale(${pop})`, background: on ? C.gold : 'transparent', boxShadow: on ? '0 0 14px rgba(242,193,78,.6)' : `inset 0 0 0 4px #2a3050` }} />;
          })}
        </div>
      )}
    </div>
  );
};

// ================= 世界里的小东西：未回复标签、+1、Zzz、体力条 =================
export const IsleTags: React.FC<{ t: number }> = ({ t }) => {
  if (t >= T('fIn')) return null;
  const cx = isleCamX(t), out: React.ReactNode[] = [];
  // 四封信沉下去："未回复"
  [0, 1, 2, 3].forEach(i => {
    const land = T('env1') + i * .55 + .7, a = t - land; if (a < .25 || a > 2.6) return;
    const [x, y] = W2S(188 + i * 13, 192 - (i % 2) * 5 + i * 2 - Math.min(5, a * 8), cx);
    out.push(<div key={'r' + i} style={{ ...px, position: 'absolute', left: q5(x) - 60, top: q5(y) - 60, width: 160, marginLeft: -20, textAlign: 'center', fontSize: 36, color: C.ui, opacity: stepA(1 - seg(a, 2.0, 2.6)) }}>未回复</div>);
  });
  // 木板落进木板堆：+1
  for (const p of PLANK_IN()) {
    const a = t - p; if (a < 0 || a > .9 || t >= T('craft')) continue;
    const [x, y] = W2S(PILE.x + 5, PILE.y - 10 - a * 8, cx);
    out.push(<div key={'p' + p} style={{ ...px, position: 'absolute', left: q5(x) - 40, top: q5(y) - 50, width: 80, textAlign: 'center', fontSize: 48, color: C.gold, opacity: stepA(1 - seg(a, .5, .9)), textShadow: '0 0 12px rgba(242,193,78,.6)' }}>+1</div>);
  }
  // 睡一觉：Zzz + 体力条
  const s0 = T('sleep'), s1 = T('wake');
  if (t >= s0 && t < s1 + .8) {
    [0, 1, 2].forEach(i => {
      const a = ((t - s0) * .9 + i / 3) % 1;
      const [x, y] = W2S(CH.x + 9 + a * 6, CH.y - 22 - a * 14, cx);
      out.push(<div key={'z' + i} style={{ ...px, position: 'absolute', left: q5(x), top: q5(y), fontSize: 36 + i * 12, color: C.cold, opacity: t < s1 ? stepA(Math.sin(a * Math.PI)) : 0 }}>Z</div>);
    });
    const hp = .18 + .82 * seg(t, s0 + .3, s1 - .1), [x, y] = W2S(CH.x - 4, CH.y - 30, cx);
    out.push(
      <div key="hp" style={{ position: 'absolute', left: q5(x) - 40, top: q5(y) - 40, display: 'flex', alignItems: 'center', gap: 12, opacity: stepA(1 - seg(t, s1 + .4, s1 + .8)) }}>
        <span style={{ ...px, fontSize: 36, color: C.ui }}>体力</span>
        <span style={{ display: 'inline-block', width: 220, height: 28, boxShadow: `0 0 0 4px ${C.ui}`, background: '#0b0d18' }}>
          <span style={{ display: 'block', width: `${Math.round(hp * 8) / 8 * 100}%`, height: '100%', background: hp > .9 ? C.gold : '#7fc97a' }} />
        </span>
      </div>);
  }
  // 学东西：书上方一个 "+技能"
  const l = T('learn'); if (t >= l && t < T('d7.end') + .2) {
    const [x, y] = W2S(CH.x + 12, CH.y - 18 - Math.min(4, (t - l) * 6), cx);
    out.push(<div key="sk" style={{ ...px, position: 'absolute', left: q5(x) - 80, top: q5(y) - 40, width: 240, marginLeft: -40, textAlign: 'center', fontSize: 36, color: C.gold, letterSpacing: '.1em' }}>{typed('学习中…', seg(t, l, l + .5))}</div>);
  }
  return <>{out}</>;
};
