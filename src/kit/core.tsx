// 场景 / 2D 画布层 / 方向动态模糊
import React, { createContext, useContext, useLayoutEffect, useRef, useId } from 'react';
import { Sequence, AbsoluteFill, useCurrentFrame } from 'remotion';
import { FPS, W, H } from './time';

// ---------- 场景：用秒写 ----------
const SceneCtx = createContext({ a: 0, d: 0 });
export const useScene = () => useContext(SceneCtx);
/** <Scene a={开始秒} b={结束秒} out={结束后多留几秒做交叠}>；子组件里 useT() = 场景局部秒（0 = a）
 *  后写的 Scene 叠在上面；z 可强制层级 */
export const Scene: React.FC<{ a: number; b: number; out?: number; z?: number; children: React.ReactNode; name?: string }> = ({ a, b, out = 0, z, children, name }) => (
  <Sequence from={Math.round(a * FPS)} durationInFrames={Math.max(1, Math.round((b - a + out) * FPS))} name={name} style={z != null ? { zIndex: z } : undefined}>
    <SceneCtx.Provider value={{ a, d: b - a }}>{children}</SceneCtx.Provider>
  </Sequence>
);

// ---------- 2D 画布层：粒子、线条、手绘、数据可视化 ----------
/** draw(g, t, W, H)：t = 场景局部秒。scale<1 降分辨率画（柔和的大面积效果用 .5 省一半以上时间） */
export const Canvas2D: React.FC<{ draw: (g: CanvasRenderingContext2D, t: number, w: number, h: number) => void; scale?: number; style?: React.CSSProperties }> = ({ draw, scale = 1, style }) => {
  const f = useCurrentFrame(), ref = useRef<HTMLCanvasElement>(null);
  const cw = Math.round(W * scale), ch = Math.round(H * scale);
  useLayoutEffect(() => {
    const g = ref.current!.getContext('2d')!;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch); g.save(); g.scale(scale, scale);
    draw(g, f / FPS, W, H); g.restore();
  });
  return <canvas ref={ref} width={cw} height={ch} style={{ position: 'absolute', inset: 0, width: W, height: H, ...style }} />;
};

// ---------- 方向动态模糊（SVG feGaussianBlur 单次；比多采样快且不偏色） ----------
/** const [svg, filter] = useDirBlur(vx, vy)；vx/vy = 这一帧相对上一帧的位移像素 */
export const useDirBlur = (vx = 0, vy = 0, k = .35): [React.ReactNode, string | undefined] => {
  const id = 'mb' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const sx = Math.abs(vx) * k, sy = Math.abs(vy) * k;
  if (sx < .4 && sy < .4) return [null, undefined];
  return [<svg key={id} width="0" height="0" style={{ position: 'absolute' }}><filter id={id} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB"><feGaussianBlur stdDeviation={`${sx.toFixed(2)} ${sy.toFixed(2)}`} /></filter></svg>, `url(#${id})`];
};
export const DirBlur: React.FC<{ vx?: number; vy?: number; k?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ vx = 0, vy = 0, k = .35, children, style }) => {
  const [svg, filter] = useDirBlur(vx, vy, k);
  return <AbsoluteFill style={style}>{svg}<AbsoluteFill style={{ filter }}>{children}</AbsoluteFill></AbsoluteFill>;
};
