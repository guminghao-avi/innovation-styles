// 示例 · 16 位像素风：320×180 的横版世界向右卷动（远山 / 近山 / 松林 / 砖地 4 层视差），小人一路跑、一路吃金币；
// 天空和所有景物的颜色走一遍 黎明 → 正午 → 黄昏 → 夜（调色板轮换，Bayer 抖动逐像素切换）→ PIXEL QUEST。
// 风格说明：references/风格_17_16位像素.md；工具：@styles/pixel16
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Canvas2D, makeVO, useT, rnd, F, W } from '@kit';
import { PW, PH, slot, bayer, hex } from '@styles/pixel16';
import { vnoise } from '@styles/pixel/palette';
import timing from './vo.timing.json';
import beats from './beats.json';

const { T } = makeVO(timing as any, beats);
export const DURATION = T('a2.end') + 1.2;
const tauAt = (t: number) => Math.min(3.15, t / (DURATION - .8) * 3.15);
let IMG: ImageData | null = null;
const HERO = ['....rrrr....', '...rrrrrr...', '...sssww....', '..sssssss...', '...ssss.....', '..bbbbbbb...', '.bbbbbbbbb..', '.sbbbbbbbs..', '..bbbbbbb...', '..yy...yy...', '.yy.....yy..', 'kk.......kk.'];
const HERO_RUN = ['..bbb.bbb...', '.yy...yy....', 'kk.....kk...', '..bb.bb.....', '...yy.yy....', '...kk.kk....'];
const HC: Record<string, string> = { r: '#e8343a', s: '#f2b48c', w: '#ffffff', b: '#2f56c8', y: '#3a2a20', k: '#141414' };

const draw = (g: CanvasRenderingContext2D, t: number) => {
  g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
  if (!IMG) IMG = g.createImageData(PW, PH);
  const buf = new Uint32Array(IMG.data.buffer), tau = tauAt(t), cam = Math.floor(t * 34);
  const far = (x: number) => 78 + Math.floor(vnoise((x + cam * .2) * .02, 1) * 34 + vnoise((x + cam * .2) * .07, 2) * 10);
  const near = (x: number) => 104 + Math.floor(vnoise((x + cam * .5) * .03, 5) * 26);
  for (let x = 0; x < PW; x++) {
    const hf = far(x), hn = near(x);
    for (let y = 0; y < PH; y++) {
      let c: number;
      if (y >= 150) {                                           // 砖地：顶上两行草
        const wx = x + cam, row = Math.floor((y - 150) / 8);
        c = y < 153 ? slot(tau, 6, x, y) : ((wx + (row % 2) * 8) % 16 === 0 || (y - 150) % 8 === 0) ? slot(tau, 8, x, y) : slot(tau, 7, x, y);
      } else if (y >= hn) c = slot(tau, 3, x, y);
      else if (y >= hf) c = slot(tau, 2, x, y);
      else c = (y / 110) > bayer(x + 2, y + 1) * 1.2 ? slot(tau, 1, x, y) : slot(tau, 0, x, y);   // 天：两色抖动渐变
      buf[y * PW + x] = c;
    }
  }
  g.putImageData(IMG, 0, 0);
  // 太阳 / 月亮：沿一条弧线走过天空（逐像素画圆）
  const day = Math.min(1, tau / 2.6), sx = Math.round(30 + day * 260), sy = Math.round(90 - Math.sin(day * Math.PI) * 70), night = tau > 2.6;
  g.fillStyle = night ? '#e6ecff' : tau > 1.8 ? '#ffb347' : '#fff3b0';
  const mx = night ? 250 : sx, my = night ? 30 : sy, R = night ? 7 : 10;
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= R * R && !(night && (dx + 3) ** 2 + (dy - 1) ** 2 < 30)) g.fillRect(mx + dx, my + dy, 1, 1);
  if (night) for (let i = 0; i < 40; i++) { g.fillStyle = rnd(i, Math.floor(t * 3)) > .3 ? '#ffffff' : '#7a86c8'; g.fillRect(Math.floor(rnd(i, 1) * PW), Math.floor(rnd(i, 2) * 70), 1, 1); }
  // 云
  g.fillStyle = night ? '#2a3466' : '#ffffff';
  for (let i = 0; i < 4; i++) { const cx = Math.round(((i * 97 - cam * .1 - t * 3) % 380 + 380) % 380) - 30, cy = 18 + i * 9; g.fillRect(cx, cy, 24, 4); g.fillRect(cx + 4, cy - 3, 14, 3); g.fillRect(cx + 9, cy - 5, 6, 2); }
  // 松林（近景层，0.8 倍速）
  for (let i = 0; i < 20; i++) {
    const tx = Math.round(((i * 23 - cam * .8) % 460 + 460) % 460) - 40, h = 18 + Math.floor(rnd(i, 3) * 16);
    for (let k = 0; k < h; k++) { const w = Math.floor((k / h) * 7) + 1; g.fillStyle = hex(slot(tau, k % 4 < 2 ? 5 : 4, tx, k)); g.fillRect(tx - w, 150 - h + k, w * 2 + 1, 1); }
  }
  // 金币（转：宽度 1→5→1），小人跑过时吃掉
  for (let i = 0; i < 8; i++) {
    const wx = 140 + i * 46, x = wx - cam; if (x < 40 || x > PW) continue;
    const w = [1, 3, 5, 3][Math.floor(t * 8 + i) % 4]; g.fillStyle = '#ffd23f'; g.fillRect(x - Math.floor(w / 2), 128 + (i % 2) * -8, w, 7); g.fillStyle = '#b8860b'; g.fillRect(x - Math.floor(w / 2), 134 + (i % 2) * -8, w, 1);
  }
  // 小人：8fps 跑步两帧
  const f = Math.floor(t * 8) % 2, hx = 60, hy = 136 + (f ? -1 : 0);
  const rows = f ? [...HERO.slice(0, 9), ...HERO_RUN.slice(0, 3)] : [...HERO.slice(0, 9), ...HERO_RUN.slice(3)];
  rows.forEach((r, y) => [...r].forEach((c, x) => { if (HC[c]) { g.fillStyle = HC[c]; g.fillRect(hx + x, hy + y, 1, 1); } }));
};

export const Main: React.FC = () => {
  const t = useT(), score = Math.min(8, Math.max(0, Math.floor((t * 34 - 80) / 46) + 1)) * 50 + 100;
  const tt = t - T('title'), sub = (timing as any).lines.find((l: any) => t >= l.t0 && t < l.t1 + .25);
  const px: React.CSSProperties = { fontFamily: F.pixel, WebkitFontSmoothing: 'none', lineHeight: 1 };
  const outline = '4px 0 #1a1030, -4px 0 #1a1030, 0 4px #1a1030, 0 -4px #1a1030, 4px 4px #1a1030, 8px 8px 0 rgba(0,0,0,.35)';
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Canvas2D scale={1 / 6} style={{ imageRendering: 'pixelated' }} draw={draw} />
      <div style={{ ...px, position: 'absolute', left: 48, top: 40, fontSize: 48, color: '#fff', textShadow: outline }}>SCORE {String(score).padStart(6, '0')}</div>
      <div style={{ ...px, position: 'absolute', right: 48, top: 40, fontSize: 48, color: '#ff4a5a', textShadow: outline }}>♥♥♥</div>
      {tt > 0 && <div style={{ position: 'absolute', top: 260, width: W, textAlign: 'center', transform: `translateY(${Math.max(0, 1 - tt * 4) * -400}px)` }}>
        <div style={{ ...px, fontSize: 144, color: '#ffd23f', textShadow: outline, letterSpacing: '.06em' }}>PIXEL QUEST</div>
        <div style={{ ...px, fontSize: 60, color: '#fff', marginTop: 24, textShadow: outline, opacity: Math.floor(t * 2.5) % 2 ? 1 : .2 }}>像素冒险 · PRESS START</div>
      </div>}
      {sub && <div style={{ position: 'absolute', bottom: 54, width: W, textAlign: 'center' }}>
        <span style={{ ...px, fontSize: 48, color: '#fff', background: 'rgba(16,10,40,.85)', padding: '12px 28px', boxShadow: '0 0 0 4px #fff, 0 0 0 8px #1a1030' }}
          dangerouslySetInnerHTML={{ __html: sub.text.replace(/\*\*(.+?)\*\*/g, '<span style="color:#ffd23f">$1</span>') }} />
      </div>}
    </AbsoluteFill>
  );
};
