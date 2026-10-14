// 弥散渐变 · 玻璃拟态（Aurora · Glassmorphism）—— 说明见 references/风格_14_弥散渐变玻璃拟态.md
// AURORA 着色器：极光底 + 最多 4 块玻璃（uC0..uC3 = [x, y, w, h]，像素）；玻璃上的字、按钮用 DOM 叠在同一位置。
import AURORA from './aurora.frag';
export { AURORA };
export const GL = { text: '#f4f2ff', sub: 'rgba(240,236,255,.62)', accent: '#9fd8ff', pink: '#ff9ad5' };
/** 一块玻璃的 DOM 外框（和着色器里那块对齐；只放内容，不画背景） */
export const rectStyle = (r: number[]) => ({ position: 'absolute' as const, left: r[0], top: r[1], width: r[2], height: r[3] });
