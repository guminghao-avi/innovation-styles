// 那我呢 —— 双鱼座总是先替别人找好理由；别人的难处他全懂了，自己的难过却没地方放
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Scene } from '@kit';
import { T } from './common';
import { Hook } from './A';
import { Deep } from './B';
import { Focus } from './C';
import { Sea } from './D';
import { Night } from './E';
import { Mirror } from './F';
import { Pisces } from './G';
import { Sub } from './ui';

export const DURATION = T('h3.end') + 9;
export const Main: React.FC = () => (
  <AbsoluteFill style={{ background: '#000' }}>
    <Scene a={T('bIn') - .1} b={T('c1') + .2} name="下沉的话"><Deep /></Scene>
    <Scene a={T('c1') - 1.6} b={T('d2.end') + 1.6} name="焦点"><Focus /></Scene>
    <Scene a={T('d2') - .5} b={T('e1') + .4} name="看海"><Sea /></Scene>
    <Scene a={T('e1') - .8} b={T('f1') + .3} name="落下"><Night /></Scene>
    <Scene a={T('f1') - 1.3} b={T('g1')} name="倒影"><Mirror /></Scene>
    <Scene a={T('g1') - 1.8} b={DURATION} name="双鱼 / 片名"><Pisces /></Scene>
    <Scene a={0} b={T('bIn') + 1.5} name="墨"><Hook /></Scene>
    <Sub hide={['h2']} />
  </AbsoluteFill>
);
