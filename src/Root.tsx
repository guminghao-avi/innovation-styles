// 每部片子 projects/<片名>/Main.tsx 必须导出：Main（组件）和 DURATION（秒）
import React from 'react';
import { Composition } from 'remotion';
import { Main, DURATION } from '@proj/Main';
import { FPS, W, H } from './kit/time';
export const Root: React.FC = () => (
  <Composition id="Main" component={Main} durationInFrames={Math.ceil(DURATION * FPS)} fps={FPS} width={W} height={H} />
);
