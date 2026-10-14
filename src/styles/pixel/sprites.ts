// 自渡风 · 像素精灵：矩形拼格子 + 边光；小人（坐 / 举灯 / 划桨 / 站 / 扔 / 跪 / 躺 / 游）、远处的小剪影、提灯
// 小人约 20~28 像素高，朝右；换 Pal 就是别的人。动画帧用 Math.floor(t * 6~8) 跳帧，不插值。
import { C, mixHex } from './palette';
type Ctx = CanvasRenderingContext2D;

export type R = [number, number, number, number, string];  // x0, y0, x1, y1（含端点）, 颜色
export type Sprite = Map<string, string>;
export const sprite = (rs: R[], holes: [number, number][] = []): Sprite => {
  const m: Sprite = new Map();
  for (const [x0, y0, x1, y1, c] of rs) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m.set(x + ',' + y, c);
  for (const [x, y] of holes) m.delete(x + ',' + y);
  return m;
};
/** 画精灵：ox/oy = 原点（像素坐标）；rim = 光从右边来时的边光颜色和强度；flip 水平翻转 */
export const drawSprite = (g: Ctx, s: Sprite, ox: number, oy: number, rim?: { col: string; a: number; dir: 1 | -1 }, flip = false) => {
  s.forEach((c, key) => {
    const [x, y] = key.split(',').map(Number);
    let col = c;
    if (rim && rim.a > .02 && !s.has((x + rim.dir) + ',' + y)) col = mixHex(c, rim.col, rim.a);
    else if (rim && rim.a > .02 && !s.has(x + ',' + (y - 1))) col = mixHex(c, rim.col, rim.a * .2);
    g.fillStyle = col; g.fillRect(ox + (flip ? -x : x), oy + y, 1, 1);
  });
};

// 小人：朝右（望着海）。原点 = 脚底左侧，y 向上为负。Pal 换颜色就是别的人
export type Pal = { hair: string; skin: string; skinD: string; coat: string; coatD: string; coatL: string; pant: string; shoe: string; scarf: string; scarfD: string; tail: boolean };
export const HERO: Pal = { hair: '#1a1424', skin: '#d9a27c', skinD: '#a8745a', coat: '#34506e', coatD: '#263b54', coatL: '#46678a', pant: '#2c3254', shoe: '#121424', scarf: '#e0ac3e', scarfD: '#a87a26', tail: true };
const other = (coat: string, coatD: string, coatL: string, hair = '#241a1a', pant = '#2a2c3c'): Pal =>
  ({ hair, skin: '#d29a76', skinD: '#9c6c52', coat, coatD, coatL, pant, shoe: '#121424', scarf: coatD, scarfD: coatD, tail: false });
export const OTHERS: Pal[] = [
  other('#6e3a44', '#4e2830', '#8a4c58'), other('#3e6a4c', '#2c4c36', '#52865e', '#3a2a1e'), other('#6a5a3a', '#4c4028', '#86744c'),
  other('#4a3e6e', '#342c50', '#5e508a', '#120e16'), other('#2e5e6a', '#20444c', '#407a88', '#30241c'),
];
const head = (x: number, y: number, P: Pal): R[] => [
  [x + 1, y, x + 5, y, P.hair], [x, y + 1, x + 6, y + 2, P.hair], [x, y + 3, x + 3, y + 5, P.hair], [x + 1, y + 6, x + 3, y + 6, P.hair],
  [x + 4, y + 3, x + 6, y + 5, P.skin], [x + 4, y + 6, x + 5, y + 6, P.skinD], [x + 6, y + 2, x + 6, y + 2, P.hair],
];
const eye = (x: number, y: number): R => [x + 5, y + 3, x + 5, y + 4, '#2a1a20'];
export const scarfTail = (x: number, y: number, t: number, P: Pal = HERO): R[] => {
  if (!P.tail) return [];
  const f = Math.floor(t * 6) % 3;   // 6fps 跳帧飘动
  return f === 0 ? [[x - 3, y, x - 1, y, P.scarf], [x - 5, y + 1, x - 3, y + 1, P.scarfD]]
    : f === 1 ? [[x - 3, y, x - 1, y, P.scarf], [x - 6, y - 1, x - 4, y - 1, P.scarfD]]
      : [[x - 4, y, x - 1, y, P.scarf], [x - 6, y, x - 5, y, P.scarfD]];
};
const sitBody = (t: number, P: Pal): R[] => [
  ...head(2, -19, P), eye(2, -19),
  [2, -12, 8, -11, P.scarf], ...scarfTail(2, -12, t, P),
  [1, -10, 7, -4, P.coat], [1, -10, 2, -4, P.coatD],
  [0, -4, 7, -1, P.pant],
  [6, -8, 11, -5, P.pant], [9, -8, 12, -1, P.pant], [10, -1, 14, 0, P.shoe], [0, 0, 7, 0, P.pant],
];
/** 坐着抱膝；raise = 举灯 */
export const sitSprite = (t: number, raise = false, P: Pal = HERO) => sprite([
  ...sitBody(t, P),
  ...(raise
    ? [[8, -10, 9, -9, P.coatL], [9, -22, 10, -10, P.coatL], [9, -23, 10, -23, P.skin]] as R[]
    : [[5, -9, 11, -8, P.coatL], [12, -9, 12, -8, P.skin]] as R[]),
]);
/** 坐着划桨：手往前伸，ph = 划桨相位 0..1（手的位置跟着桨走）；返回精灵 + 手的位置 */
export const rowSprite = (t: number, ph: number, P: Pal = HERO) => {
  const hx = 10 + Math.round(Math.cos(ph * Math.PI * 2) * 2), hy = -10 + Math.round(Math.sin(ph * Math.PI * 2) * 1);
  return { s: sprite([...sitBody(t, P), [5, -9, hx - 1, -9, P.coatL], [5, -10, hx - 1, -10, P.coatL], [hx, hy, hx + 1, hy + 1, P.skin]]), hand: [hx + 1, hy + 1] as [number, number] };
};
/** 站立，右手提灯 */
export const standSprite = (t: number, P: Pal = HERO) => sprite([
  ...head(2, -27, P), eye(2, -27),
  [2, -20, 8, -19, P.scarf], ...scarfTail(2, -20, t, P),
  [1, -18, 7, -9, P.coat], [1, -18, 2, -9, P.coatD],
  [7, -17, 8, -11, P.coatL], [8, -10, 9, -10, P.skin],
  [2, -8, 6, -1, P.pant], [4, -4, 4, -1, '#1c2036'], [2, 0, 3, 0, P.shoe], [5, 0, 7, 0, P.shoe],
]);
/** 站立扔东西：k = 0 手举到脑后，1 甩出去 */
export const throwSprite = (t: number, k: number, P: Pal = HERO) => sprite([
  ...head(2, -27, P), eye(2, -27),
  [2, -20, 8, -19, P.scarf], ...scarfTail(2, -20, t, P),
  [1, -18, 7, -9, P.coat], [1, -18, 2, -9, P.coatD],
  ...(k < .5 ? [[3, -24, 4, -17, P.coatL], [2, -26, 3, -25, P.skin]] as R[] : [[7, -18, 10, -17, P.coatL], [11, -19, 12, -18, P.skin]] as R[]),
  [2, -8, 6, -1, P.pant], [4, -4, 4, -1, '#1c2036'], [2, 0, 3, 0, P.shoe], [5, 0, 7, 0, P.shoe],
]);
/** 跪着敲钉子：up = 锤子举起 */
export const kneelSprite = (t: number, up: boolean, P: Pal = HERO) => sprite([
  ...head(3, -21, P), eye(3, -21),
  [3, -14, 9, -13, P.scarf], ...scarfTail(3, -14, t, P),
  [2, -12, 8, -5, P.coat], [2, -12, 3, -5, P.coatD],
  [1, -4, 9, -1, P.pant], [9, -3, 12, -1, P.pant], [0, 0, 4, 0, P.shoe],
  ...(up ? [[8, -12, 9, -11, P.coatL], [10, -16, 11, -12, P.coatL], [10, -17, 11, -17, P.skin], [9, -20, 13, -19, '#5a5a66'], [11, -18, 11, -18, '#3a2a18']] as R[]
    : [[8, -11, 12, -10, P.coatL], [13, -10, 13, -9, P.skin], [13, -8, 14, -6, '#3a2a18'], [12, -6, 16, -5, '#5a5a66']] as R[]),
]);
/** 躺下睡觉（头朝左） */
export const lieSprite = (t: number, P: Pal = HERO) => sprite([
  [0, -6, 5, -1, P.hair], [4, -6, 6, -4, P.skin], [6, -5, 7, -1, P.scarf],
  [8, -5, 17, -1, P.coat], [8, -5, 17, -5, P.coatL], [18, -4, 25, -1, P.pant], [26, -4, 27, -1, P.shoe],
]);
/** 在水里：只露出头和手 */
export const swimSprite = (t: number, P: Pal = HERO) => {
  const f = Math.floor(t * 5) % 2;
  return sprite([
    ...head(2, -8, P), eye(2, -8), [2, -1, 8, -1, P.scarf],
    ...(f ? [[9, -3, 10, -2, P.skin], [-1, -1, 0, -1, P.skin]] as R[] : [[9, -1, 10, -1, P.skin], [-1, -3, 0, -2, P.skin]] as R[]),
  ]);
};
/** 远处的人：6 个像素高的小剪影 */
export const miniPerson = (g: Ctx, x: number, y: number, P: Pal, sit = false) => {
  g.fillStyle = P.hair; g.fillRect(x, y - (sit ? 5 : 7), 2, 1);
  g.fillStyle = P.skin; g.fillRect(x + 1, y - (sit ? 4 : 6), 1, 1);
  g.fillStyle = P.hair; g.fillRect(x, y - (sit ? 4 : 6), 1, 1);
  g.fillStyle = P.coat; g.fillRect(x, y - (sit ? 3 : 5), 2, sit ? 2 : 3);
  g.fillStyle = P.pant; if (sit) g.fillRect(x, y - 1, 3, 1); else g.fillRect(x, y - 2, 2, 2);
};
/** 提灯（左上角原点，4×7）。on = 亮度 0..1 */
export const drawLantern = (g: Ctx, x: number, y: number, on: number) => {
  const glass = mixHex('#5a4520', C.gold, on), core = mixHex('#6a5226', C.goldHot, on);
  g.fillStyle = '#3a2a18'; g.fillRect(x + 1, y, 2, 1); g.fillRect(x, y + 1, 4, 1); g.fillRect(x, y + 6, 4, 1);
  g.fillStyle = glass; g.fillRect(x, y + 2, 4, 4);
  g.fillStyle = core; g.fillRect(x + 1, y + 3, 2, 2);
};
