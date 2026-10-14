// 复古 Synthwave（80s · VHS）—— 说明见 references/风格_16_复古Synthwave.md
import SYNTH from './synth.frag';
export { SYNTH };
export const SW = { pink: '#ff3fd1', cyan: '#3df2ff', yellow: '#ffd93d', purple: '#2a0a48', chrome: 'linear-gradient(180deg, #e9f6ff 0%, #9fd3ff 42%, #2a2a5e 50%, #ffb3f0 58%, #ffffff 100%)' };
/** 棕榈树剪影（Canvas2D）：树干是一条弯曲的锥形，叶子是几片弯刀形；sway 随风摆 */
export const palm = (g: CanvasRenderingContext2D, x: number, y: number, h: number, sway: number, col = '#12021f') => {
  g.fillStyle = col; g.strokeStyle = col;
  const top: [number, number] = [x + h * .18 + sway * 10, y - h];
  g.beginPath(); g.moveTo(x - 9, y); g.quadraticCurveTo(x + h * .05, y - h * .5, top[0] - 4, top[1]); g.lineTo(top[0] + 4, top[1]); g.quadraticCurveTo(x + h * .09, y - h * .5, x + 9, y); g.fill();
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (.05 + .9 * i / 6) + sway * .05, L = h * (.42 + .1 * Math.sin(i * 2.1));
    const ex = top[0] + Math.cos(a) * L, ey = top[1] + Math.sin(a) * L * .55 + L * .35;
    g.beginPath(); g.moveTo(top[0], top[1]); g.quadraticCurveTo(top[0] + Math.cos(a) * L * .5, top[1] + Math.sin(a) * L * .6 - 18, ex, ey);
    g.quadraticCurveTo(top[0] + Math.cos(a) * L * .55, top[1] + Math.sin(a) * L * .5 - 2, top[0], top[1] + 6); g.fill();
  }
};
