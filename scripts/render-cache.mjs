// 按画面输入内容分开缓存。音频、调色不影响未调色的 ProRes 片段。
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const visualHash = (root, projectDir, png = false) => {
  const hash = createHash('sha256').update(JSON.stringify({ format: png ? 'png' : 'jpeg96', schema: 1 }));
  const add = file => {
    hash.update(path.relative(root, file)).update('\0').update(fs.readFileSync(file)).update('\0');
  };
  const walk = (dir, accept) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file, accept);
      else if (entry.isFile() && accept(file)) add(file);
    }
  };
  walk(path.join(root, 'src'), () => true);
  walk(path.join(root, 'fonts'), f => f.endsWith('.ttf'));
  walk(path.join(root, 'scripts'), f => f.endsWith('.mjs'));
  for (const name of ['package-lock.json', 'remotion.config.ts']) {
    const file = path.join(root, name);
    if (fs.existsSync(file)) add(file);
  }
  // 源码和时间轴；不遍历生成目录，也不把后期/声音配置算进画面缓存。
  const walkProject = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory() && !['audio', 'chunks', 'stills', 'public', '__pycache__'].includes(entry.name)) walkProject(file);
      else if (entry.isFile() && /\.(tsx?|jsx?|json|frag|glsl|vert)$/.test(entry.name) && !['post.json', 'sound.json', 'vo.json'].includes(entry.name)) add(file);
    }
  };
  walkProject(projectDir);
  walk(path.join(projectDir, 'public'), () => true);
  return hash.digest('hex').slice(0, 20);
};
