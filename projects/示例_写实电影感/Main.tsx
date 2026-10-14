// 示例 · 写实电影感（节选自《回声》的思路）：夜湖地平线上，一句话的波形响起又散掉 → 在脑子里一百遍（红、乱）
// → 最后一次带着回声衰减 → 黎明 → 片名。风格说明：references/风格_写实电影感.md；工具：@styles/cinema
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Shader, Canvas2D, GLSL, makeVO, useT, k, E, clamp, rnd } from '@kit';
import { LAKE, glow, glowLine, CineSub, CineTitle, Readout, AMBER, AMBER_HOT, RED } from '@styles/cinema';
import timing from './vo.timing.json';
import beats from './beats.json';

const { T } = makeVO(timing as any, beats);
export const DURATION = T('title') + 7.6;
const HY = 600;

// 「那我先走啦，你们慢慢吃。」的波形：音节包络 × 几组正弦的绝对值（上下镜像画）
const SENT = 1.96;
const SYL: [number, number, number][] = [[0, .15, .7], [.15, .29, .55], [.29, .45, .82], [.45, .6, 1], [.6, .78, .62], [1.25, 1.36, .6], [1.36, 1.46, .45], [1.46, 1.58, .72], [1.58, 1.69, .58], [1.69, 1.83, .78], [1.85, 1.9, .3], [1.91, 1.96, .22]];
const RF: [number, number, number][] = [[61, .3, .55], [133, 1.7, .3], [271, 4.1, .2], [547, 2.2, .12], [1103, .9, .07], [2213, 5, .04], [4447, 3.3, .025]];
const envAt = (x: number) => { let e = 0; for (const [s, en, a] of SYL) { const u = (x - s) / (en - s); if (u >= 0 && u <= 1.3) e += a * (1 - Math.exp(-u * 12)) * Math.pow(Math.max(0, 1 - u / 1.3), 1.25); } return Math.min(1.05, e); };
const roughAt = (x: number) => { let s = 0; for (const [f, p, a] of RF) s += a * Math.sin(2 * Math.PI * f * x + p); return Math.pow(Math.abs(s) / 1.305, .72); };
const waveH = (x: number) => (x < -.02 || x > SENT + .02 ? 0 : envAt(x) * (.16 + .84 * roughAt(x)));

/** 在地平线上画一遍：play = 播到句子第几秒，amp 像素，wsc 横向拉伸，jit = 失真（脑子里的那一百遍） */
const drawWave = (g: CanvasRenderingContext2D, play: number, amp: number, a: number, col: string, wsc = 1, jit = 0, seed = 0) => {
  for (const sgn of [1, -1]) {
    const pts: number[] = [];
    for (let i = 0; i <= 600; i++) {
      const u = i / 600, x = -.03 + (SENT + .06) * u;
      let h = x <= play ? waveH(x) * amp : 0;
      if (jit) h *= 1 + jit * (Math.sin(x * 2900 + seed) * .5 + Math.sin(x * 7300 + seed * 3) * .3);
      pts.push(960 + (u - .5) * 1400 * wsc, HY - sgn * h * (sgn < 0 ? .9 : 1));
    }
    glowLine(g, pts, col, AMBER_HOT, a * (sgn < 0 ? .4 : 1), 1);
  }
};

export const Main: React.FC = () => {
  const t = useT();
  const dawn = k(t, T('last') - 1, T('title') + 2.5, E.sine);
  const fin = k(t, 0, .3) * (1 - k(t, T('title') + 6.4, T('title') + 7.6, E.inOut));
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Shader frag={GLSL.noise + GLSL.color + LAKE} scale={.5} u={{ uCy: HY, uAmp: 0, uFade: fin, uExpo: .9 + .3 * dawn, uDrift: t * .004, uFar: .32, uDawn: dawn, uXc: .5, uW: .012 }} />
      <Canvas2D draw={(g, tt) => {
        g.globalCompositeOperation = 'lighter';
        // 平静的地平线
        g.fillStyle = `rgba(160,185,230,${.18 * (1 - dawn)})`; g.fillRect(0, HY - .5, 1920, 1);
        // 1）说出口：两秒播完，然后像真的声音一样散掉
        if (tt < T('storm') + .4) {
          const play = clamp((tt - T('say')) / SENT) * SENT, dec = Math.exp(-Math.max(0, tt - T('decay')) * 2);
          drawWave(g, play, 120 * dec, fin * (1 - k(tt, T('storm'), T('storm') + .4)), AMBER);
          if (play < SENT) glow(g, 960 + (play / SENT - .5) * 1400, HY, 50, AMBER_HOT, .8);
        }
        // 2）脑子里的一百遍：一遍比一遍快、比一遍红、比一遍乱，叠在一起
        if (tt > T('storm') && tt < T('calm') + .6) {
          const out = 1 - k(tt, T('calm') - .2, T('calm') + .6, E.inOut);
          for (let r = 0; r < 26; r++) {
            const s0 = T('storm') + Math.pow(r / 26, .7) * 2.6; if (tt < s0) continue;
            const pl = clamp((tt - s0) / (SENT / (1 + r * .35))) * SENT, u = r / 26;
            const col = `255,${Math.round(170 - 110 * u)},${Math.round(80 - 40 * u)}`;
            drawWave(g, pl, 120 * (1 + u * .6), (.18 + .3 * (1 - u)) * out, col, 1 + (rnd(r, 1) - .5) * .04, u * .9, r);
          }
          glow(g, 960, HY, 500, RED, .12 * k(tt, T('storm'), T('calm')) * out);
        }
        // 3）最后一次：带着回声散掉（每一声回声更轻、更宽、更晚）
        if (tt > T('last') - .2) {
          const dec = (d: number) => Math.exp(-Math.max(0, tt - T('fade') - d) * .85);
          ([[0, 1, 1], [.55, .5, 1.12], [1.1, .27, 1.26], [1.65, .14, 1.42], [2.2, .07, 1.6]] as const).forEach(([d, gain, wsc]) => {
            const lt = tt - T('last') - d; if (lt < 0) return;
            drawWave(g, clamp(lt / 2.1) * SENT, 120 * gain * dec(d) * fin, (d === 0 ? 1 : .7) * fin * Math.min(1, gain * 2.4), AMBER, wsc);
          });
          const warm = k(tt, T('fade') + 1, T('title'), E.inOut) * fin;
          g.fillStyle = `rgba(255,190,120,${.35 * warm})`; g.fillRect(0, HY - .6, 1920, 1.2);
        }
      }} />
      <Readout x={1560} y={360} label="时长" value="1.96 s" a={k(t, T('a1@两秒'), T('a1@两秒') + .6) * (1 - k(t, T('a1.end'), T('a1.end') + .6))} right />
      <Readout x={1560} y={360} label="重播" value={`第 ${Math.min(100, Math.max(1, Math.round(100 * Math.pow(clamp((t - T('storm')) / 2.8), 1.6))))} 遍`} a={k(t, T('storm'), T('storm') + .4) * (1 - k(t, T('calm'), T('calm') + .6))} color="#F09A70" right />
      {t > T('title') - .5 && <CineTitle t={t - T('title')} text="回声" en="ECHO" bright y={-170} />}
      <CineSub t={t} lines={(timing as any).lines} />
    </AbsoluteFill>
  );
};
