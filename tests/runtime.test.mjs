import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { ROOT, DEFAULT_PROJ, projDir } from '../scripts/webpack.mjs';
import { visualHash } from '../scripts/render-cache.mjs';
import { makeVO } from '../src/kit/vo.ts';

const python = process.env.PYTHON || (fs.existsSync(path.join(ROOT, '.venv/bin/python')) ? path.join(ROOT, '.venv/bin/python') : 'python3');
const runPython = (code, extraArgs = []) => spawnSync(python, ['-c', code, ...extraArgs], { encoding: 'utf8', cwd: ROOT });
const temporaryRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), 'innovation-styles-test-'));

test('默认项目可用，项目名不能逃出 projects', () => {
  assert.ok(fs.existsSync(path.join(projDir(DEFAULT_PROJ), 'Main.tsx')));
  for (const name of ['..', '.', '../bad', '/tmp/bad', 'a/b', 'a\\b', '']) assert.throws(() => projDir(name));
});

test('修改源码、时间轴、public 素材会换缓存；音频与调色不会', () => {
  const root = temporaryRoot();
  for (const name of ['src', 'fonts', 'scripts', 'projects/P/public', 'projects/P/audio']) fs.mkdirSync(path.join(root, name), { recursive: true });
  const project = path.join(root, 'projects/P');
  fs.writeFileSync(path.join(project, 'Main.tsx'), 'first');
  const original = visualHash(root, project);
  fs.writeFileSync(path.join(project, 'post.json'), '{"bloom":0.3}');
  fs.writeFileSync(path.join(project, 'sound.json'), '{}');
  fs.writeFileSync(path.join(project, 'audio/mix.wav'), 'audio');
  assert.equal(visualHash(root, project), original);
  fs.writeFileSync(path.join(project, 'Main.tsx'), 'second');
  const sourceChanged = visualHash(root, project);
  assert.notEqual(sourceChanged, original);
  fs.writeFileSync(path.join(project, 'vo.timing.json'), '{"duration":2}');
  const timingChanged = visualHash(root, project);
  assert.notEqual(timingChanged, sourceChanged);
  fs.writeFileSync(path.join(project, 'public/image.png'), 'image');
  assert.notEqual(visualHash(root, project), timingChanged);
  assert.notEqual(visualHash(root, project, true), visualHash(root, project));
});

test('Python/TS 跨词关键词、偏移与命名节拍得到相同时间，循环引用报错', () => {
  const directory = temporaryRoot();
  const timing = { duration: 5, lines: [{ id: 'a1', text: '氢聚变成光', t0: 1, t1: 5,
    words: [{ w: '氢聚', t0: 1, t1: 2 }, { w: '变成', t0: 2, t1: 4 }, { w: '光', t0: 4, t1: 5 }] }] };
  const beats = { reveal: 'a1@聚变.end+0.2', loop: 'loop' };
  fs.writeFileSync(path.join(directory, 'vo.timing.json'), JSON.stringify(timing));
  fs.writeFileSync(path.join(directory, 'beats.json'), JSON.stringify(beats));
  const refs = ['a1', 'a1.end-0.3', 'a1@聚变', 'a1@聚变.end', 'reveal+0.5', 2.25];
  const result = runPython('import sys,json;sys.path.insert(0,"scripts");from timeref import Resolver;r=Resolver(sys.argv[1]);print(json.dumps([r.time(v) for v in json.loads(sys.argv[2])]))', [directory, JSON.stringify(refs)]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), refs.map(ref => makeVO(timing, beats).T(ref)));
  assert.throws(() => makeVO(timing, beats).T('loop'), /循环/);
  const loop = runPython('import sys;sys.path.insert(0,"scripts");from timeref import Resolver;Resolver(sys.argv[1]).time("loop")', [directory]);
  assert.notEqual(loop.status, 0);
  assert.match(loop.stderr, /循环/);
});

test('字幕时间轴检查重复 ID、重叠时间和无效数值，不吞掉错误', () => {
  const result = runPython('import sys;sys.path.insert(0,"scripts");from silent import build_timing;v=build_timing({"lines":[{"id":"a1","text":"**光**来了"}]});assert v["lines"][0]["t0"]==0.3;assert "*" not in "".join(w["w"] for w in v["lines"][0]["words"]);\nfor cfg in [{"lines":[{"id":"a1","text":"一"},{"id":"a1","text":"二"}]},{"start":-1,"lines":[{"id":"a1","text":"一"}]},{"lines":[{"id":"a1","text":"一"},{"id":"a2","text":"二","at":0}]},{"perChar":float("nan"),"lines":[{"id":"a1","text":"一"}]}]:\n try: build_timing(cfg)\n except ValueError: pass\n else: raise AssertionError(cfg)');
  assert.equal(result.status, 0, result.stderr);
});

test('--clean 和无效渲染参数报错，保留旧静帧', () => {
  const project = projDir(DEFAULT_PROJ);
  const old = path.join(project, 'stills/t001.50.png');
  const before = fs.existsSync(old) ? fs.readFileSync(old) : null;
  for (const args of [['--clean'], ['--video', '--chunk', '0'], ['--video', '--budget', 'NaN']]) {
    const result = spawnSync(process.execPath, ['scripts/render.mjs', '--proj', DEFAULT_PROJ, ...args], { encoding: 'utf8', cwd: ROOT });
    assert.notEqual(result.status, 0);
  }
  if (before) assert.deepEqual(fs.readFileSync(old), before);
});

test('所有示例配置是有效 JSON，避免调色被静默忽略', () => {
  for (const entry of fs.readdirSync(path.join(ROOT, 'projects'), { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_qa')) continue;
    const directory = path.join(ROOT, 'projects', entry.name);
    for (const name of fs.readdirSync(directory).filter(n => n.endsWith('.json'))) {
      assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8')), `${entry.name}/${name}`);
    }
  }
});

test('全静音混音不生成 NaN，省略 end 时沿用字幕片长', () => {
  const directory = temporaryRoot();
  fs.mkdirSync(path.join(directory, 'scripts'));
  const project = path.join(directory, 'projects/P');
  fs.mkdirSync(project, { recursive: true });
  for (const name of ['sound.py', 'sfx_voice.py', 'timeref.py']) fs.copyFileSync(path.join(ROOT, 'scripts', name), path.join(directory, 'scripts', name));
  fs.writeFileSync(path.join(project, 'vo.timing.json'), JSON.stringify({ duration: 2, lines: [] }));
  fs.writeFileSync(path.join(project, 'sound.json'), JSON.stringify({ music: [], sfx: [] }));
  const result = spawnSync(python, [path.join(directory, 'scripts/sound.py'), 'P'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const check = runPython('import sys,numpy as np,soundfile as sf;x,sr=sf.read(sys.argv[1]);assert len(x)==2*sr;assert np.isfinite(x).all();assert np.max(np.abs(x))==0', [path.join(project, 'audio/mix.wav')]);
  assert.equal(check.status, 0, check.stderr);
});
