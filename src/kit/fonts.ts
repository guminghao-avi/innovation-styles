// 字体：import 进打包（不依赖每期 public）。DOM、canvas、SVG 共用 family 名
import { delayRender, continueRender, cancelRender } from 'remotion';
import notoSans from '../../fonts/NotoSansSC.ttf';
import notoSerif from '../../fonts/NotoSerifSC.ttf';
import garamond from '../../fonts/EBGaramond.ttf';
import mono from '../../fonts/IBMPlexMono-Bold.ttf';
import smiley from '../../fonts/SmileySans-Oblique.ttf';
import grotesk from '../../fonts/SpaceGrotesk.ttf';
import pixel from '../../fonts/FusionPixel12.ttf';

export const F = {
  cn: '"NotoSC", sans-serif',                       // 思源黑体，可变字重 100~900
  serif: '"SerifSC", "NotoSC", serif',              // 思源宋体 200~900：电影感/纪录片旁白字幕首选
  gara: '"Garamond", "SerifSC", "NotoSC", serif',   // 英文衬线（片名、年份、数字）
  mono: '"Mono", "NotoSC", monospace',              // 等宽：数据、坐标、时间码
  fun: '"Smiley", "NotoSC"',                         // 得意黑：俏皮
  en: '"Grotesk", "NotoSC"',                         // 几何无衬线：科技感英文
  pixel: '"Pixel", "NotoSC"',                         // 缝合像素字体 12px（OFL）：像素风专用，字号必须是 12 的整数倍才锐利
};
const list: [string, string, string?][] = [
  ['NotoSC', notoSans, '100 900'], ['SerifSC', notoSerif, '200 900'], ['Garamond', garamond, '400 800'],
  ['Mono', mono], ['Smiley', smiley], ['Grotesk', grotesk, '300 700'], ['Pixel', pixel],
];
if (typeof window !== 'undefined' && !(window as any).__fontsLoading) {
  (window as any).__fontsLoading = true;
  const h = delayRender('加载字体');
  Promise.all(list.map(([n, u, w]) => new FontFace(n, `url(${u})`, w ? { weight: w } : {}).load()))
    .then(fs => { fs.forEach(f => document.fonts.add(f)); continueRender(h); })
    .catch(e => cancelRender(new Error('字体加载失败: ' + String(e))));
}
