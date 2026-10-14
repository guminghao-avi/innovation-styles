// 自渡 —— 「谁能救我？」的选项一个个变灰，最后锁着的那个，是你自己
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { FPS, rnd, Scene } from '@kit';
import { T } from './common';
import { World } from './World';
import { Isle } from './Isle';
import { Voyage } from './Voyage';
import { HUDSea, Words, Talk, SeaToasts } from './ui3';
import { Finale } from './Finale';
import { Menu2, HUDEnd, EndTitle } from './ui4';
import { Menu, HUD, Toast, Title, Sub } from './ui';
import { HUDIsle, Toasts, TOASTS, Banners, BANNERS, Goals, IsleTags } from './ui2';

export const DURATION = T('end') + 8.5;

/** 屏幕震动：按 5px（一个像素格）走 */
const shake = (t: number): [number, number] => {
  const hits: [number, number, number][] = [   // [时刻, 幅度(格), 时长]
    [T('opt1'), 1, .1], [T('opt2'), 1, .1], [T('opt3'), 1, .1], [T('opt4'), 1, .1], [T('lock'), 2, .2],
    [T('slam'), 3, .3], [T('grab'), 1, .1],
    [T('unlock'), 2, .25], [T('end') + .5, 3, .3],
    [T('crack'), 1, .15], [T('crack') + .6, 1, .15], [T('sink'), 2, .3], [T('e3') - .12, 2, .2],
    ...[0, 1, 2, 3, 4, 5].map(i => [T('words') + [0, .45, .95, 1.6, 2.15, 2.6][i] + .45, 1, .12] as [number, number, number]),
  ];
  for (const [h, amp, d] of hits) {
    const a = t - h;
    if (a >= 0 && a < d) { const f = Math.floor(a * FPS); return [Math.round((rnd(f, h) - .5) * 2 * amp) * 5, Math.round((rnd(f, h + 1) - .5) * 2 * amp) * 5]; }
  }
  return [0, 0];
};

export const Main: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const [sx, sy] = shake(t);
  const open = t < T('dIn');
  return (
    <AbsoluteFill style={{ background: '#07080f' }}>
      <AbsoluteFill style={{ transform: sx || sy ? `translate(${sx}px, ${sy}px) scale(1.02)` : undefined }}>
        <Scene a={0} b={T('dIn')} name="片头 · 孤岛"><World /></Scene>
        <Scene a={T('dIn')} b={T('fIn')} name="捡木板 · 下水就沉"><Isle /></Scene>
        <Scene a={T('fIn')} b={T('you')} name="暴雨 · 夜航 · 航道"><Voyage /></Scene>
        <Scene a={T('you')} b={DURATION} name="天亮 · 我自己 · 片尾"><Finale /></Scene>
        {open && <><Title t={t} /><HUD t={t} /><Toast t={t} /><Menu t={t} /></>}
        {!open && <>
          <IsleTags t={t} />
          <HUDIsle t={t} />
          <Goals t={t} />
          <Toasts t={t} list={TOASTS()} />
          <Banners t={t} list={BANNERS()} />
          <Words t={t} />
          <HUDSea t={t} />
          <Talk t={t} />
          <SeaToasts t={t} />
          <Menu2 t={t} />
          <HUDEnd t={t} />
          <EndTitle t={t} dur={DURATION} />
        </>}
      </AbsoluteFill>
      <Sub t={t} />
    </AbsoluteFill>
  );
};
