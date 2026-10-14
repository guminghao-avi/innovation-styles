// 给 Remotion Studio 用：PROJ=<片名> npx remotion studio src/index.ts ；渲染走 scripts/render.mjs（同一套配置）
import { Config } from '@remotion/cli/config';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_PROJ, projDir, withProj } from './scripts/webpack.mjs';
const proj = process.env.PROJ || DEFAULT_PROJ;
Config.overrideWebpackConfig(withProj(proj));
const publicDir = path.join(projDir(proj), 'public');
fs.mkdirSync(publicDir, { recursive: true });
Config.setPublicDir(publicDir);
Config.setChromiumOpenGlRenderer('swangle');
