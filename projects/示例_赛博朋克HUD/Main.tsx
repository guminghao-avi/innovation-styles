// 示例 · 赛博朋克 HUD：瞄准系统开机（刻度环展开、数据逐行打出）→ 全息地球飞转搜索 → 转到长江口，锁定框收拢、整屏转橙色警报
// 风格说明：references/风格_12_赛博朋克HUD.md；工具：@styles/hud（真实海岸线：Natural Earth 1:110m）
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Canvas2D, makeVO, useT, k, E, lerp, clamp, F, W } from '@kit';
import { HUDC, GlobeView, drawGlobe, project, ticks, arc, bracket, telemetry } from '@styles/hud';
import timing from './vo.timing.json';
import beats from './beats.json';

const { T } = makeVO(timing as any, beats);
export const DURATION = T('a3.end') + 1;
const TGT = { lon: 121.8, lat: 31.4 };
const mixC = (a: string, b: string, u: number) => a.split(',').map((v, i) => Math.round(lerp(+v, +b.split(',')[i], clamp(u)))).join(',');

const view = (t: number): GlobeView => {
  const spin = -40 + 210 * E.inOut(clamp((t - T('search')) / (T('lock') - T('search'))));
  const lk = E.film(clamp((t - T('lock') + .6) / 1.4));
  return { cx: 1080, cy: 520, r: Math.max(0, lerp(330, 400, lk) * k(t, 0, .6, E.snap)), lon0: lerp(spin, TGT.lon, lk), lat0: lerp(18, TGT.lat - 8, lk) };
};

const draw = (g: CanvasRenderingContext2D, t: number) => {
  g.fillStyle = '#03070c'; g.fillRect(0, 0, 1920, 1080);
  const alert = k(t, T('lock') + .3, T('lock') + .7), col = mixC(HUDC.cyan, HUDC.orange, alert), hot = mixC(HUDC.cyanHot, HUDC.orangeHot, alert);
  // 背景细网格
  g.strokeStyle = `rgba(${HUDC.dim},.18)`; g.lineWidth = 1;
  for (let x = 0; x < 1920; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1080); g.stroke(); }
  for (let y = 0; y < 1080; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(1920, y); g.stroke(); }
  const v = view(t), boot = k(t, 0, .8);
  g.save(); g.globalCompositeOperation = 'lighter';
  // 地球 + 扫描线
  drawGlobe(g, v, { col, a: boot, scan: t < T('lock') ? v.lon0 + 90 - ((t * 120) % 180) : undefined });
  // 刻度环（开机时一圈圈展开）
  ticks(g, v.cx, v.cy, v.r + 40 * k(t, .1, .7, E.snap), 120, t * .15, col, .5);
  arc(g, v.cx, v.cy, v.r + 90, t * .6, t * .6 + 1.2 * k(t, .2, .9), col, .7, 3);
  arc(g, v.cx, v.cy, v.r + 90, t * .6 + Math.PI, t * .6 + Math.PI + .5 * k(t, .3, 1), col, .5, 3);
  arc(g, v.cx, v.cy, v.r + 120, -t * .3, -t * .3 + 2.4 * k(t, .4, 1.1), col, .25, 1.5);
  // 目标：锁定框从大收到小
  const [tx, ty, tz] = project(v, TGT.lon, TGT.lat);
  const lk = E.snap(clamp((t - T('lock') - .1) / .6));
  if (t > T('lock') - .2 && tz > 0) {
    const s = lerp(320, 70, lk), blink = Math.floor(t * 6) % 2 ? 1 : .55;
    bracket(g, tx - s / 2, ty - s / 2, s, s, 22, hot, .9 * blink, 3);
    g.strokeStyle = `rgba(${hot},.8)`; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(tx - 140, ty); g.lineTo(tx - 50, ty); g.moveTo(tx + 50, ty); g.lineTo(tx + 140, ty); g.moveTo(tx, ty - 140); g.lineTo(tx, ty - 50); g.moveTo(tx, ty + 50); g.lineTo(tx, ty + 140); g.stroke();
    g.fillStyle = `rgba(${hot},1)`; g.beginPath(); g.arc(tx, ty, 6, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 3; i++) { const u = ((t - T('lock')) * .9 + i / 3) % 1; arc(g, tx, ty, 10 + u * 90, 0, Math.PI * 2, hot, (1 - u) * .6, 2); }
  }
  // 屏幕四角
  bracket(g, 40, 40, 1840, 1000, 60, col, .6, 2);
  // 左侧数据
  telemetry(g, 90, 140, t, ['SYS BOOT ......... [OK]', 'OPTIC CORE v4.2.# [OK]', 'GYRO ALIGN 0.00## [OK]', 'UPLINK QKD-7 #.## [OK]', 'SEARCH MODE ENGAGED',
    t > T('lock') ? 'TGT-03 LOCKED' : 'SCANNING ...', `AZM ${(v.lon0 + 360).toFixed(2)}`, `ELV ${v.lat0.toFixed(2)}`], col, F.mono, 20);
  g.font = `64px ${F.mono}`; g.fillStyle = `rgba(${hot},.95)`;
  g.fillText((t < T('lock') ? 1700 - t * 37 : lerp(1500, 77.9, lk)).toFixed(1), 90, 520);
  g.font = `18px ${F.mono}`; g.fillStyle = `rgba(${col},.6)`; g.fillText('SLANT RNG  KM', 90, 556);
  g.restore();
};

export const Main: React.FC = () => {
  const t = useT(), v = view(t), [tx, ty] = project(v, TGT.lon, TGT.lat), lk = k(t, T('lock') + .3, T('lock') + .6);
  const sub = (timing as any).lines.find((l: any) => t >= l.t0 && t < l.t1 + .25), alert = t > T('lock') + .3;
  const c = alert ? `rgb(${HUDC.orange})` : `rgb(${HUDC.cyan})`;
  return (
    <AbsoluteFill style={{ background: '#03070c' }}>
      <Canvas2D draw={draw} />
      {lk > 0 && <div style={{ position: 'absolute', left: tx - 560, top: ty - 70, width: 380, opacity: lk, border: `2px solid ${c}`, background: 'rgba(40,16,0,.55)', padding: '14px 20px', clipPath: `inset(0 ${(1 - lk) * 100}% 0 0)` }}>
        <div style={{ fontFamily: F.mono, fontSize: 16, color: c, letterSpacing: '.2em' }}>ALERT 03 · TARGET LOCKED</div>
        <div style={{ fontFamily: F.cn, fontWeight: 900, fontSize: 52, color: `rgb(${HUDC.orangeHot})`, textShadow: `0 0 18px ${c}` }}>目标锁定</div>
        <div style={{ fontFamily: F.mono, fontSize: 22, color: c }}>N31°24′  E121°48′</div>
      </div>}
      {/* 扫描线 + 暗角 */}
      <AbsoluteFill style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0 1px, transparent 1px 3px)', pointerEvents: 'none' }} />
      {sub && <div style={{ position: 'absolute', bottom: 80, width: W, textAlign: 'center' }}>
        <span style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 48, color: '#dff9ff', borderLeft: `4px solid ${c}`, borderRight: `4px solid ${c}`, padding: '8px 32px', background: 'rgba(0,20,30,.6)', textShadow: `0 0 12px ${c}` }}
          dangerouslySetInnerHTML={{ __html: sub.text.replace(/\*\*(.+?)\*\*/g, `<span style="color:rgb(${HUDC.orange})">$1</span>`) }} />
      </div>}
    </AbsoluteFill>
  );
};
