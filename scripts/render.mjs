// 渲染：静帧检查 / 连续帧条 / 分段渲 → 调色后期 → 混音合成成片。中断后重跑同一条命令自动续渲。
//   静帧：   node scripts/render.mjs --proj P --stills 1,5.5,12         → stills/*.png + sheet.png（带时间标签的总览）
//            --stills 12-13/6  表示 12~13 秒均匀取 6 帧（看运动、看转场）；可以和单点混写：1,4,12-13/6
//            --raw  不加后期（对比用）
//   成片：   node scripts/render.mjs --proj P --video [--from 秒 --to 秒] [--chunk 20] [--concurrency 2] [--budget 520]
//            → chunks/*.mov（ProRes 422HQ 10bit 无后期）→ 拼接 → post.json 调色 + 颗粒 → 混 audio/mix.wav → <P>.mp4
//   只合成： node scripts/render.mjs --proj P --video --encode-only        （改了后期参数/音频，不重渲画面）
// --budget：片段之间检查的软预算；单块可以超过预算。暂停后重跑同一命令续渲。
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { ROOT, projDir, withProj } from './webpack.mjs';
import { visualHash } from './render-cache.mjs';

const options = Object.fromEntries([
  ...['proj', 'stills', 'from', 'to', 'chunk', 'concurrency', 'budget', 'crf'].map(k => [k, { type: 'string' }]),
  ...['video', 'encode-only', 'raw', 'png', 'mute', 'clean'].map(k => [k, { type: 'boolean' }]),
]);
const { values: args } = parseArgs({ options });
if (args.clean) throw new Error('--clean 已停用：先列出待删除的缓存文件并获得授权，再逐项清理');
const PROJ = args.proj; if (!PROJ) { console.error('需要 --proj'); process.exit(1); }
if (!args.stills && !args.video) throw new Error('需要 --stills 或 --video');
if (args['encode-only'] && !args.video) throw new Error('--encode-only 需要 --video');
for (const name of ['from', 'to', 'chunk', 'concurrency', 'budget', 'crf']) {
  if (args[name] !== undefined && (!Number.isFinite(+args[name]) || +args[name] < 0)) throw new Error(`--${name} 必须是非负数字`);
}
for (const name of ['chunk', 'concurrency', 'budget']) {
  if (args[name] !== undefined && +args[name] === 0) throw new Error(`--${name} 必须大于 0`);
}
if (args.concurrency && !Number.isInteger(+args.concurrency)) throw new Error('--concurrency 必须是整数');
if (args.crf && +args.crf > 51) throw new Error('--crf 必须在 0–51 之间');
const T0 = Date.now(), el = () => (Date.now() - T0) / 1000, BUDGET = +(args.budget || 520);
const dir = projDir(PROJ), pub = path.join(dir, 'public');
if (!fs.existsSync(path.join(dir, 'Main.tsx'))) throw new Error(`项目不存在: ${PROJ}`);
fs.mkdirSync(pub, { recursive: true });
const chromiumOptions = { gl: 'swangle' };
const ff = a => { const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' }); if (r.error || r.status !== 0) throw new Error('ffmpeg 失败: ' + (r.error?.message || a.join(' '))); };
const nbFrames = f => { const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', f]); return r.status === 0 ? +String(r.stdout).trim() || 0 : 0; };

// ---------- 后期：projects/P/post.json（都可省略）----------
// { "grain": 6, "vignette": .3, "bloom": .25, "bloomThreshold": .62, "bloomRadius": 28, "ca": 1.5, "bars": 2.39, "curves": "ffmpeg curves 参数", "eq": "contrast=1.04:saturation=.95" }
const postPath = path.join(dir, 'post.json');
const post = fs.existsSync(postPath) ? JSON.parse(fs.readFileSync(postPath, 'utf8')) : {};
const postFilter = (W, H, still = false) => {
  const p = { grain: 5, vignette: .25, bloom: .18, bloomThreshold: .62, bloomRadius: 28, ca: 0, ...post };
  const f = [];
  let s = '[0:v]format=gbrpf32le';
  if (p.bloom > 0) {
    const th = p.bloomThreshold;
    f.push(`${s},split[base][bl]`, `[bl]scale=${W / 4}:${H / 4},curves=all='0/0 ${th}/0 1/1',gblur=sigma=${p.bloomRadius / 4},scale=${W}:${H}[glow]`,
      `[base][glow]blend=all_mode=screen:all_opacity=${p.bloom}`);
    s = ''; // 接在 blend 后面
  }
  const chain = [];
  if (p.ca > 0) chain.push(`rgbashift=rh=${-Math.round(p.ca)}:bh=${Math.round(p.ca)}`);
  if (p.eq) chain.push(`eq=${p.eq}`);
  if (p.curves) chain.push(`curves=${p.curves}`);
  if (p.vignette > 0) chain.push(`vignette=angle=${(p.vignette * Math.PI / 2).toFixed(3)}:mode=forward`);
  chain.push('format=yuv444p');
  if (p.grain > 0) chain.push(`noise=c0s=${p.grain}:c0f=${still ? 'u' : 't+u'}`);
  if (p.bars) { const bh = Math.round((H - W / p.bars) / 2); chain.push(`drawbox=x=0:y=0:w=${W}:h=${bh}:color=black:t=fill,drawbox=x=0:y=${H - bh}:w=${W}:h=${bh}:color=black:t=fill`); }
  const tail = chain.join(',');
  if (f.length) { f[f.length - 1] += ',' + tail + '[out]'; return f.join(';'); }
  return `${s},${tail}[out]`;
};

let serveUrl, comp;
const prep = async () => {
  if (serveUrl) return;
  process.stdout.write('打包… ');
  serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src/index.ts'), webpackOverride: withProj(PROJ), publicDir: pub });
  comp = await selectComposition({ serveUrl, id: 'Main', inputProps: {}, chromiumOptions });
  console.log(`${el().toFixed(0)}s  ${comp.width}x${comp.height} ${comp.fps}fps ${(comp.durationInFrames / comp.fps).toFixed(2)}s`);
};

if (args.stills) {
  await prep();
  const out = path.join(dir, 'stills', String(Date.now())); fs.mkdirSync(out, { recursive: true });
  const times = String(args.stills).split(',').flatMap(s => {
    const m = s.match(/^([\d.]+)-([\d.]+)\/(\d+)$/);
    if (!m) return [+s];
    const [a, b, n] = [+m[1], +m[2], +m[3]];
    if (n < 1 || n > 100 || b < a) throw new Error('静帧区间需递增，取帧数需为 1–100');
    return Array.from({ length: n }, (_, i) => a + (b - a) * (n === 1 ? 0 : i / (n - 1)));
  });
  if (times.length > 100 || times.some(s => !Number.isFinite(s) || s < 0 || s >= comp.durationInFrames / comp.fps)) throw new Error('静帧时间必须在片长内，单次最多 100 帧');
  const files = [];
  for (const s of times) {
    const fr = Math.min(comp.durationInFrames - 1, Math.round(s * comp.fps)), f = path.join(out, `t${(fr / comp.fps).toFixed(2).padStart(6, '0')}.png`);
    const t = Date.now();
    await renderStill({ composition: comp, serveUrl, output: f + '.raw.png', frame: fr, imageFormat: 'png', chromiumOptions });
    if (args.raw) fs.renameSync(f + '.raw.png', f);
    else { ff(['-i', f + '.raw.png', '-filter_complex', postFilter(comp.width, comp.height, true), '-map', '[out]', '-frames:v', '1', '-pix_fmt', 'rgb24', f]); }
    files.push([f, fr / comp.fps]); console.log('still', path.basename(f), `${Date.now() - t}ms`);
  }
  // 总览图：3 列 640x360，左上角时间标签
  const cols = Math.min(3, files.length), rows = Math.ceil(files.length / cols), tw = 640, th = 360;
  const font = path.join(ROOT, 'fonts/IBMPlexMono-Bold.ttf');
  const filt = files.map(([, s], i) => `[${i}]scale=${tw}:${th},drawbox=x=0:y=0:w=92:h=30:color=black@0.6:t=fill,drawtext=fontfile=${font}:text='${s.toFixed(2)}':x=8:y=6:fontsize=18:fontcolor=white[s${i}]`).join(';') + ';' +
    files.map((_, i) => `[s${i}]`).join('') + (files.length > 1 ? `xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) * tw}_${Math.floor(i / cols) * th}`).join('|')}:fill=black` : 'null');
  const sheet = path.join(out, 'sheet.png');
  ff([...files.flatMap(([f]) => ['-i', f]), '-filter_complex', filt, '-frames:v', '1', sheet]);
  fs.copyFileSync(sheet, path.join(dir, 'sheet.png'));
  console.log(`总览 ${path.join(dir, 'sheet.png')}  (${cols}x${rows})`);
}

if (args.video) {
  await prep();
  const fps = comp.fps, total = comp.durationInFrames;
  const f0 = Math.round(+(args.from ?? 0) * fps), f1 = Math.round(+(args.to ?? total / fps) * fps);
  if (f0 < 0 || f1 > total || f0 >= f1) throw new Error('视频区间必须满足 0 ≤ from < to ≤ 片长');
  const step = Math.round(+(args.chunk || 20) * fps);
  if (step < 1) throw new Error('--chunk 至少为一帧');
  const cacheKey = visualHash(ROOT, dir, args.png);
  const cdir = path.join(dir, 'chunks', cacheKey); fs.mkdirSync(cdir, { recursive: true });
  console.log(`画面缓存: ${cacheKey}`);
  const chunks = []; for (let a = f0; a < f1; a += step) chunks.push([a, Math.min(f1, a + step)]);
  const cfile = ([a, b]) => path.join(cdir, `c_${String(a).padStart(6, '0')}_${String(b).padStart(6, '0')}.mov`);
  let last = 0;
  if (!args['encode-only']) for (const c of chunks) {
    const f = cfile(c);
    if (fs.existsSync(f) && nbFrames(f) === c[1] - c[0]) continue;
    if (el() + last * 1.15 > BUDGET) { console.log(`⏸ 时间预算用完（${el().toFixed(0)}s），重跑同一条命令继续`); process.exit(3); }
    const t = Date.now(); let lastPct = -1;
    await renderMedia({ composition: comp, serveUrl, codec: 'prores', proResProfile: 'hq', imageFormat: args.png ? 'png' : 'jpeg', jpegQuality: 96,
      frameRange: [c[0], c[1] - 1], outputLocation: f + '.tmp.mov', concurrency: +(args.concurrency || 2), chromiumOptions, overwrite: true, muted: true,
      onProgress: ({ progress }) => { const p = Math.floor(progress * 4); if (p !== lastPct) { lastPct = p; process.stdout.write(`${p * 25}% `); } } });
    fs.renameSync(f + '.tmp.mov', f);
    last = (Date.now() - t) / 1000;
    console.log(`\n块 ${(c[0] / fps).toFixed(1)}-${(c[1] / fps).toFixed(1)}s 完成 ${last.toFixed(0)}s（${(last * 1000 / (c[1] - c[0])).toFixed(0)}ms/帧）  已用 ${el().toFixed(0)}s`);
  }
  const bad = chunks.filter(c => !(fs.existsSync(cfile(c)) && nbFrames(cfile(c)) === c[1] - c[0]));
  if (bad.length) { console.log(`还缺 ${bad.length} 块，重跑同一条命令`); process.exit(2); }
  console.log(`画面 ${chunks.length} 块 OK`);
  const full = f0 === 0 && f1 === total, tag = full ? '' : `_${f0}-${f1}f`;
  const out = path.join(dir, `${PROJ}${tag}.mp4`);
  const temporaryOut = out + '.tmp.mp4';
  const list = path.join(cdir, 'list.txt'); fs.writeFileSync(list, chunks.map(c => `file '${path.basename(cfile(c))}'`).join('\n'));
  const mix = path.join(dir, 'audio/mix.wav'), hasAudio = fs.existsSync(mix) && !args.mute;
  console.log(`合成 ${hasAudio ? '画面 + 后期 + 音频' : '画面 + 后期（没有 audio/mix.wav）'}…`);
  ff(['-f', 'concat', '-safe', '0', '-i', list, ...(hasAudio ? ['-ss', String(f0 / fps), '-t', String((f1 - f0) / fps), '-i', mix] : []),
    '-filter_complex', postFilter(comp.width, comp.height), '-map', '[out]', ...(hasAudio ? ['-map', '1:a', '-af', 'apad', '-c:a', 'aac', '-b:a', '320k'] : []),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', String(args.crf ?? 18), '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-tune', 'film', '-r', String(fps), '-movflags', '+faststart', '-t', String((f1 - f0) / fps), temporaryOut]);
  const n = nbFrames(temporaryOut);
  if (n !== f1 - f0) throw new Error(`成片帧数不符: ${n}，应为 ${f1 - f0}`);
  ff(['-v', 'error', '-xerror', '-i', temporaryOut, '-f', 'null', '-']);
  fs.renameSync(temporaryOut, out);
  console.log(`done  ${out}  ${n} 帧（应为 ${f1 - f0}）  ${el().toFixed(0)}s`);
}
