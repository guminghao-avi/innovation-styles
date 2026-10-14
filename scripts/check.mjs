// 每次生成项目专用的临时配置，调用 tsc CLI；兼容 TypeScript 7，不改共享 tsconfig。
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { DEFAULT_PROJ, ROOT, projDir } from './webpack.mjs';

const { values } = parseArgs({ options: { proj: { type: 'string' }, all: { type: 'boolean' } } });
if (values.all && values.proj) throw new Error('--all 与 --proj 二选一');
const projects = values.all
  ? fs.readdirSync(path.join(ROOT, 'projects')).filter(p => !p.startsWith('_qa') && fs.existsSync(path.join(projDir(p), 'Main.tsx')))
  : [values.proj || DEFAULT_PROJ];
for (const proj of projects) {
  const dir = projDir(proj);
  if (!fs.existsSync(path.join(dir, 'Main.tsx'))) throw new Error(`项目不存在: ${proj}`);
  const key = createHash('sha256').update(dir).digest('hex').slice(0, 16);
  const config = path.join(os.tmpdir(), `innovation-styles-tsconfig-${key}.json`);
  fs.writeFileSync(config, JSON.stringify({
    extends: path.join(ROOT, 'tsconfig.json'),
    compilerOptions: { paths: {
      '@kit': [path.join(ROOT, 'src/kit')], '@kit/*': [path.join(ROOT, 'src/kit/*')],
      '@styles/*': [path.join(ROOT, 'src/styles/*')], '@proj/*': [path.join(dir, '*')],
    } },
    include: [path.join(ROOT, 'src/**/*.ts'), path.join(ROOT, 'src/**/*.tsx'), path.join(dir, '**/*.ts'), path.join(dir, '**/*.tsx')],
  }, null, 2));
  const result = spawnSync(process.execPath, [path.join(ROOT, 'node_modules/typescript/bin/tsc'), '-p', config], { stdio: 'inherit', cwd: ROOT });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = 1;
  else console.log(`类型检查通过: ${proj}`);
}
