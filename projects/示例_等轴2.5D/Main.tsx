// 示例 · 等轴 2.5D：一块 9×9 的地台按对角线一格格铺开 → 楼、树、风车踩着 240 BPM 的八分音符一个个"长"出来 → 地面上的字 ISOPOLIS
// 风格说明：references/风格_06_等轴2.5D.md；工具：@styles/iso
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Canvas2D, makeVO, useT, k, E, lerp, rnd, F, W } from '@kit';
import { ISO, Cam, isoP, box, tree, groundText, pop, beatAt } from '@styles/iso';
import timing from './vo.timing.json';
import beats from './beats.json';

const { T } = makeVO(timing as any, beats);
export const DURATION = T('title') + 3;
const N = 9;
type Item = { kind: 'bld' | 'tree' | 'mill'; x: number; z: number; h: number; col: string; at: number };
// 城市的"种子"：位置、高度、出现的拍子（先低后高，从中间往外）
const ITEMS: Item[] = (() => {
  const out: Item[] = []; let i = 0;
  const cells: [number, number][] = [];
  for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) cells.push([x, z]);
  cells.sort((a, b) => Math.hypot(a[0] - 4, a[1] - 4) - Math.hypot(b[0] - 4, b[1] - 4) + (rnd(a[0] * 9 + a[1], 1) - .5) * 1.5);
  for (const [x, z] of cells) {
    if ((Math.abs(x - 4) <= 1 && Math.abs(z - 4) <= 1) || rnd(x * 9 + z, 2) < .22) continue;   // 中间 3×3 留成广场
    const r = rnd(x * 9 + z, 3), d = Math.hypot(x - 4, z - 4);
    const kind = r < .55 ? 'bld' : r < .9 ? 'tree' : 'mill';
    out.push({ kind, x, z, h: kind === 'bld' ? .6 + (1 - d / 6) * 2.6 * (.5 + rnd(x, z)) : 0, col: rnd(x, z + 7) < .25 ? ISO.mint : ISO.top, at: beatAt(i++, 240, 1.4) });
  }
  return out;
})();

const draw = (g: CanvasRenderingContext2D, t: number) => {
  g.fillStyle = ISO.bg; g.fillRect(0, 0, 1920, 1080);
  const zoom = lerp(1.25, 1, E.inOut(Math.min(1, t / DURATION)));
  const c: Cam = { cx: 960, cy: 250 - (zoom - 1) * 160, s: 74 * zoom };
  // 地台的"桌面"厚度
  const tileIn = (x: number, z: number) => pop(t - .08 - (x + z) * .06);
  box(g, c, -.3, -.6, -.3, N + .6, .6 * tileIn(0, 0), N + .6, ISO.base, { edge: .3 });
  // 物体按 (x+z) 从远到近画（画家算法）
  const drawable: { o: number; f: () => void }[] = [];
  for (let x = 0; x < N; x++) for (let z = 0; z < N; z++) {
    const p = tileIn(x, z); if (p <= 0) continue;
    box(g, c, x + .04, 0, z + .04, .92, .12 * p, .92, (x + z) % 2 ? ISO.top : '#efeafd', { edge: .4 });   // 地砖是平的：先全部画完
  }
  for (const it of ITEMS) {
    const p = pop(t - it.at); if (p <= 0) continue;
    drawable.push({ o: it.x + it.z, f: () => {
      if (it.kind === 'tree') { tree(g, c, it.x + .5, it.z + .5, .32, p); return; }
      if (it.kind === 'mill') {
        box(g, c, it.x + .45, .12, it.z + .45, .1, 2.2 * p, .1, '#ffffff', { edge: 0 });
        const [hx, hy] = isoP(c, it.x + .5, .12 + 2.2 * p, it.z + .5);
        g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.lineCap = 'round';
        for (let j = 0; j < 3; j++) { const a = t * 3 + j * 2.094 + it.x; g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx + Math.cos(a) * c.s * .7 * p, hy + Math.sin(a) * c.s * .7 * p * .9); g.stroke(); }
        return;
      }
      const h = it.h * p;
      box(g, c, it.x + .12, .12, it.z + .12, .76, h, .76, it.col);
      // 窗：左前面上的小格，晚一点亮
      const lit = k(t, it.at + .4, it.at + .7);
      for (let fy = .35; fy < h - .2; fy += .42) for (let fx = 0; fx < 3; fx++) {
        const x0 = it.x + .2 + fx * .22, y0 = .12 + fy, z0 = it.z + .88;
        const q = [isoP(c, x0, y0, z0), isoP(c, x0 + .14, y0, z0), isoP(c, x0 + .14, y0 + .2, z0), isoP(c, x0, y0 + .2, z0)];
        g.beginPath(); g.moveTo(q[0][0], q[0][1]); q.slice(1).forEach(v => g.lineTo(v[0], v[1])); g.closePath();
        g.fillStyle = rnd(fx + fy * 7, it.x * 9 + it.z) < .5 * lit ? ISO.window : ISO.blue; g.fill();
      }
    } });
  }
  // 中间广场：地面上的字（在地砖之后、楼之前画，才会被前面的楼挡住）
  const tt = t - T('title');
  if (tt > 0) groundText(g, c, 'ISOPOLIS', 4.5, 4.5, .62 * pop(tt), ISO.ink, F.en);
  drawable.sort((a, b) => a.o - b.o).forEach(d => d.f());
};

export const Main: React.FC = () => {
  const t = useT(), cur = (timing as any).lines.find((l: any) => t >= l.t0 && t < l.t1 + .3);
  return (
    <AbsoluteFill style={{ background: ISO.bg }}>
      <Canvas2D draw={draw} />
      {cur && <div style={{ position: 'absolute', bottom: 72, width: W, textAlign: 'center' }}>
        <span style={{ fontFamily: F.cn, fontWeight: 600, fontSize: 50, color: ISO.ink, background: 'rgba(255,255,255,.75)', padding: '14px 34px', borderRadius: 999, boxShadow: '0 10px 30px rgba(80,70,160,.18)' }}
          dangerouslySetInnerHTML={{ __html: cur.text.replace(/\*\*(.+?)\*\*/g, `<span style="color:${ISO.blueD}">$1</span>`) }} />
      </div>}
    </AbsoluteFill>
  );
};
