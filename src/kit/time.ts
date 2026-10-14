// 时间工具：全部用「秒」思考。组件里 useT() 拿到所在 Scene 的局部秒数
import { useCurrentFrame, Easing } from 'remotion';
export const FPS = 30, W = 1920, H = 1080, CX = W / 2, CY = H / 2;
export const useT = () => useCurrentFrame() / FPS;
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const E = {
  lin: (t: number) => t,
  out: Easing.out(Easing.cubic), in: Easing.in(Easing.cubic), inOut: Easing.inOut(Easing.cubic),
  expo: Easing.out(Easing.exp), expoIn: Easing.in(Easing.exp), expoInOut: Easing.inOut(Easing.exp),
  quint: Easing.inOut(Easing.poly(5)), back: Easing.out(Easing.back(1.6)),
  snap: Easing.bezier(.16, 1, .3, 1),        // 快进慢停（产品动效最常用）
  film: Easing.bezier(.45, 0, .1, 1),        // 电影推拉：起步稳、收尾长
  sine: Easing.inOut(Easing.sin),
};
/** 区间进度 + 缓动：k(t, 1.2, 1.8, E.expo) */
export const k = (t: number, a: number, b: number, e: (x: number) => number = E.out) => e(seg(t, a, b));
/** 入场/出场包络 0..1：dur 是停留时长 */
export const env = (t: number, dur: number, i = .25, o = .3) => Math.min(seg(t, 0, i), 1 - seg(t, dur, dur + o));
/** 确定性随机（不要用 Math.random） */
export const rnd = (i: number, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
export const rr = (i: number, s: number, a: number, b: number) => lerp(a, b, rnd(i, s));
export const typed = (str: string, p: number) => { const c = [...str]; return c.slice(0, Math.floor(clamp(p) * c.length + .0001)).join(''); };
/** 阻尼弹簧（解析解，确定性）：t 秒后从 0 到 1 的值；zeta<1 会回弹 */
export const spring = (t: number, freq = 2.2, zeta = .55) => {
  if (t <= 0) return 0; const w = 2 * Math.PI * freq;
  if (zeta >= 1) return 1 - (1 + w * t) * Math.exp(-w * t);
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + (zeta * w / wd) * Math.sin(wd * t));
};
/** 关键帧插值：keys(t, [[0,{x:0}],[1.2,{x:300}]], E.quint)；s/z 这类缩放量用对数插值更自然 */
export function keys<T extends Record<string, number>>(t: number, ks: [number, Partial<T>][], ease: (x: number) => number = E.quint, logKeys: string[] = ['s']): T {
  const all = new Set<string>(); ks.forEach(([, v]) => Object.keys(v).forEach(k => all.add(k)));
  const val = (v: any, k: string) => v[k] ?? (k === 's' ? 1 : 0);
  let i = ks.findIndex(([kt]) => kt >= t);
  if (i <= 0) { const v = ks[i === 0 ? 0 : ks.length - 1][1]; const o: any = {}; all.forEach(k => (o[k] = val(v, k))); return o; }
  const [t0, a] = ks[i - 1], [t1, b] = ks[i], e = ease(seg(t, t0, t1)), o: any = {};
  all.forEach(k => { const x = val(a, k), y = val(b, k); o[k] = logKeys.includes(k) && x > 0 && y > 0 ? Math.exp(lerp(Math.log(x), Math.log(y), e)) : lerp(x, y, e); });
  return o;
}
