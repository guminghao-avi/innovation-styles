// CSS 3D 世界 + 虚拟镜头：DOM 元素按世界坐标摆放，镜头关键帧移动，移动时自动加方向动态模糊
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FPS, W, H, keys, E, useT } from './time';
import { DirBlur } from './core';

export type Cam = { x: number; y: number; z: number; rx: number; ry: number; rz: number; s: number };
/** camAt(t, [[0, {x:960, y:540}], [2, {x:2400, s:1.3, ry:-8}]], E.film) */
export const camAt = (t: number, ks: [number, Partial<Cam>][], ease = E.film) => keys<Cam>(t, ks, ease);
/** 手持感：叠加在镜头上的低频漂移（amp 像素） */
export const handheld = (t: number, amp = 6, seed = 0) => ({
  x: amp * (Math.sin(t * .71 + seed) * .6 + Math.sin(t * 1.93 + seed * 2) * .3 + Math.sin(t * 4.1 + seed) * .1),
  y: amp * (Math.sin(t * .53 + seed * 3) * .6 + Math.sin(t * 2.31 + seed) * .3 + Math.sin(t * 3.7 + seed * 5) * .1),
  rz: amp * .02 * Math.sin(t * .37 + seed),
});

/** 世界坐标里 (960, 540) = 镜头 s=1 时的屏幕中心 */
export const World: React.FC<{ cam: ((t: number) => Partial<Cam>) | Partial<Cam>; blur?: number; perspective?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ cam, blur = .35, perspective = 2200, children, style }) => {
  const t = useT();
  const get = (tt: number): Cam => ({ x: W / 2, y: H / 2, z: 0, rx: 0, ry: 0, rz: 0, s: 1, ...(typeof cam === 'function' ? cam(tt) : cam) });
  const c = get(t), p = get(t - 1 / FPS);
  const vx = (p.x - c.x) * c.s, vy = (p.y - c.y) * c.s;
  const inner = (
    <AbsoluteFill style={{ perspective, perspectiveOrigin: '50% 50%', overflow: 'hidden', ...style }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transformStyle: 'preserve-3d', transformOrigin: '0 0',
        transform: `translate3d(${W / 2}px, ${H / 2}px, ${-c.z}px) rotateX(${c.rx}deg) rotateY(${c.ry}deg) rotateZ(${c.rz}deg) scale(${c.s}) translate(${-c.x}px, ${-c.y}px)` }}>
        {children}
      </div>
    </AbsoluteFill>
  );
  return blur ? <DirBlur vx={vx} vy={vy} k={blur}>{inner}</DirBlur> : inner;
};
/** 世界里摆一个元素：(x, y, z) 是元素中心 */
export const At: React.FC<{ x: number; y: number; z?: number; rx?: number; ry?: number; rz?: number; s?: number; o?: number; w?: number; h?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, z = 0, rx = 0, ry = 0, rz = 0, s = 1, o = 1, w, h, children, style }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, opacity: o, transformStyle: 'preserve-3d',
    transform: `translate(-50%, -50%) translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`, ...style }}>
    {children}
  </div>
);
