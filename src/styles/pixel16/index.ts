// 16 位像素风（明亮像素冒险 · PIXEL QUEST）—— 说明见 references/风格_17_16位像素.md
// 和"自渡风"的区别：这是白天、明亮、饱和的横版游戏世界（16 位机的味道），重点是"调色板轮换"：
// 场景只用调色板里的"槽位"上色，一天的光 = 把每个槽位换成另一套颜色；两套之间用 Bayer 抖动逐像素切换（不是平滑渐变）。
//   PALS / slot(t, i, x, y)   一天里的 4 套调色板（黎明 / 正午 / 黄昏 / 夜），按时间 + 像素位置取色
//   SLOTS                     槽位含义：0 天顶 1 天底 2 远山 3 近山 4 树暗 5 树亮 6 草 7 土 8 土缝 9 高光
import { bayer, u32 } from '../pixel/palette';
export const PW = 320, PH = 180;
const P = (a: string[]) => a.map(u32);
export const PALS = [
  P(['#2a2c6e', '#f2a07b', '#7a6aa8', '#4e4a8a', '#1f3d4a', '#2f6a5a', '#6aa84f', '#8a5a3a', '#5a3a28', '#fff1c4']),   // 黎明
  P(['#3c8ce7', '#9fdcff', '#8fb6e0', '#5a86c8', '#1e6b3a', '#3fa34d', '#7ed957', '#b0703a', '#7a4a26', '#ffffff']),   // 正午
  P(['#3a1f5c', '#ff8a4c', '#8a4a7a', '#5a2e5e', '#2a2a3a', '#4a4a4a', '#c8a040', '#8a4a2a', '#5a2a1a', '#ffe08a']),   // 黄昏
  P(['#06081e', '#1a2250', '#24305e', '#18204a', '#0a1a22', '#15302e', '#2a4a3a', '#3a2a30', '#221820', '#c8d4ff']),   // 夜
];
/** τ 在 0..4 之间循环（0 黎明 → 1 正午 → 2 黄昏 → 3 夜 → 4 = 黎明），像素按 Bayer 阈值决定用哪一套 */
export const slot = (tau: number, i: number, x: number, y: number) => {
  const a = Math.floor(tau) % 4, f = tau - Math.floor(tau);
  return f > bayer(x, y) ? PALS[(a + 1) % 4][i] : PALS[a][i];
};
export { bayer, u32 };
/** u32（ImageData 用的 ABGR）→ '#rrggbb'（fillStyle 用） */
export const hex = (v: number) => '#' + [v & 255, (v >>> 8) & 255, (v >>> 16) & 255].map(c => c.toString(16).padStart(2, '0')).join('');
