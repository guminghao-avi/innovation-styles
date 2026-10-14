import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../scripts/webpack.mjs';

test('内置风格入口能定位文档、组件和实际使用它的示例，并允许追加新风格', () => {
  const catalog = fs.readFileSync(path.join(ROOT, 'references/风格库.md'), 'utf8');
  const rows = [...catalog.matchAll(/^\| `([a-z0-9-]+)` \|.*?\[说明\]\(([^)]+)\).*?`(src\/styles\/[^`]+)`.*?`(projects\/[^`]+\/Main\.tsx)`/gm)];
  assert.ok(rows.length >= 19, '不能丢失 19 套内置风格');
  assert.equal(new Set(rows.map(row => row[1])).size, rows.length);
  for (const [, id, guide, component, example] of rows) {
    assert.ok(fs.existsSync(path.join(ROOT, 'references', guide)), guide);
    assert.ok(fs.existsSync(path.join(ROOT, component)), component);
    const source = fs.readFileSync(path.join(ROOT, example), 'utf8');
    assert.ok(source.includes(`'@styles/${id}'`) || source.includes(`"@styles/${id}"`), `${example} 没有使用 ${id}`);
  }
});
