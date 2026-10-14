import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../scripts/webpack.mjs';

const python = process.env.PYTHON || (fs.existsSync(path.join(ROOT, '.venv/bin/python')) ? path.join(ROOT, '.venv/bin/python') : 'python3');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'innovation-video-study-'));
const source = path.join(directory, '参考 video.mp4');
const silent = path.join(directory, 'silent.mp4');
const outputRoot = path.join(directory, 'studies');
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const call = (file, args = []) => spawnSync(python, [path.join(ROOT, 'scripts/study_video.py'), file, '--output-root', outputRoot, ...args], { encoding: 'utf8' });
const success = result => { assert.equal(result.status, 0, result.stderr); return JSON.parse(result.stdout); };
const pngSize = file => { const data = fs.readFileSync(file); return [data.readUInt32BE(16), data.readUInt32BE(20)]; };

before(() => {
  const result = spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=duration=2:size=160x90:rate=12', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', source], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const copy = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', source, '-an', '-c:v', 'copy', silent], { encoding: 'utf8' });
  assert.equal(copy.status, 0, copy.stderr);
});

test('真实采样生成不同画面、时间码总览和选定音轨，原视频不变', () => {
  const original = hash(source);
  const result = success(call(source, ['--name', 'sample-check', '--start', '0.25', '--end', '1.75', '--frames', '3', '--audio']));
  const metadata = JSON.parse(fs.readFileSync(result.metadata, 'utf8'));
  assert.equal(metadata.source.sha256, original);
  assert.equal(hash(source), original);
  assert.deepEqual(metadata.range, { start: 0.25, end: 1.75 });
  assert.equal(metadata.sampling.frames.length, 3);
  const images = metadata.sampling.frames.map(frame => {
    assert.ok(frame.time >= 0.25 && frame.time < 1.75);
    const file = path.join(result.directory, frame.file);
    assert.deepEqual(pngSize(file), [160, 90]);
    return hash(file);
  });
  assert.equal(new Set(images).size, 3);
  assert.deepEqual(pngSize(result.sheet), [1440, 270]);
  const audio = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', result.audio], { encoding: 'utf8' });
  assert.equal(audio.status, 0, audio.stderr);
  assert.ok(Math.abs(Number(JSON.parse(audio.stdout).format.duration) - 1.5) < 0.01);
});

test('原尺寸指定时间采样可用，无音轨视频不会伪造声音文件', () => {
  const result = success(call(silent, ['--name', 'silent-check', '--times', '0.2,0.8', '--width', '0', '--audio']));
  const metadata = JSON.parse(fs.readFileSync(result.metadata, 'utf8'));
  assert.deepEqual(metadata.sampling.frames.map(f => f.time), [0.2, 0.8]);
  assert.deepEqual(pngSize(path.join(result.directory, metadata.sampling.frames[0].file)), [160, 90]);
  assert.equal(metadata.source.has_audio, false);
  assert.equal(result.audio, null);
  assert.equal(fs.existsSync(path.join(result.directory, 'reference-audio.wav')), false);
});

test('无效区间、时间、帧数和目录名被拒绝，未产生新分析', () => {
  const original = fs.existsSync(outputRoot) ? fs.readdirSync(outputRoot) : [];
  for (const args of [['--start', '2', '--end', '1'], ['--end', 'NaN'], ['--frames', '0'], ['--times', '2'], ['--name', '../outside'], ['--width', '-1']]) {
    const result = call(source, args);
    assert.notEqual(result.status, 0);
  }
  assert.deepEqual(fs.existsSync(outputRoot) ? fs.readdirSync(outputRoot) : [], original);
});

test('同名再次分析创建独立批次，先前证据保留', () => {
  const first = success(call(source, ['--name', 'repeat-check', '--frames', '1']));
  const before = hash(first.metadata);
  const second = success(call(source, ['--name', 'repeat-check', '--frames', '1']));
  assert.notEqual(first.directory, second.directory);
  assert.equal(hash(first.metadata), before);
  assert.ok(fs.existsSync(first.sheet));
  assert.ok(fs.existsSync(second.sheet));
});
