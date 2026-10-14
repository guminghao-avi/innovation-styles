// Remotion 打包配置：@proj → 当前这一部片子的工程目录；.glsl/.frag 可直接 import 成字符串
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_PROJ = '示例_纸艺手绘';
export const projDir = proj => {
  if (typeof proj !== 'string' || !proj.trim() || proj === '.' || proj === '..' || /[/\\\x00-\x1f]/.test(proj)) {
    throw new Error('项目名必须是 projects/ 下的单个目录名，不能含路径分隔符');
  }
  return path.join(ROOT, 'projects', proj);
};
export const withProj = proj => config => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: { ...(config.resolve?.alias || {}), '@proj': projDir(proj), '@kit': path.join(ROOT, 'src/kit'), '@styles': path.join(ROOT, 'src/styles') },
    modules: [path.join(ROOT, 'node_modules'), 'node_modules'],
  },
  module: { ...config.module, rules: [...(config.module?.rules || []), { test: /\.(glsl|frag|vert)$/, type: 'asset/source' }] },
});
