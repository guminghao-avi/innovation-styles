"""本地参考视频 → 带时间码的静帧、总览、元数据和可选音轨。只采样，不判定风格。
例：python3 scripts/study_video.py reference.mp4 --name amber-ink --frames 12 --audio
"""
import argparse
from datetime import datetime, timezone
from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parent.parent


def run(command):
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode:
        raise ValueError(result.stderr.strip()[-2500:] or f'命令失败: {command[0]}')
    return result.stdout


def finite(value, label):
    value = float(value)
    if not math.isfinite(value):
        raise ValueError(f'{label} 必须是有限数字')
    return value


def file_hash(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def sample_times(start, end, count, fps, explicit=None):
    if explicit is not None:
        values = [finite(part, '取帧时间') for part in explicit.split(',')]
        if not 1 <= len(values) <= 36 or any(t < start or t >= end for t in values):
            raise ValueError('--times 需含 1–36 个位于分析区间内的时间（不含结束点）')
        return sorted(set(values))
    if not 1 <= count <= 36:
        raise ValueError('--frames 必须为 1–36')
    last = max(start, end - max(1 / fps if fps > 0 else 0.1, 0.05))
    return sorted(set(round(start + (last - start) * i / max(1, count - 1), 6) for i in range(count)))


def contact_sheet(frames, output):
    arguments = ['ffmpeg', '-v', 'error', '-y']
    filters = []
    font = ROOT / 'fonts/IBMPlexMono-Bold.ttf'
    font_name = str(font).replace('\\', '/').replace(':', '\\:').replace("'", "\\'")
    font_filter = f"fontfile='{font_name}':" if font.exists() else ''
    for i, frame in enumerate(frames):
        arguments += ['-i', str(output / frame['file'])]
        filters.append(
            f'[{i}:v]scale=480:270:force_original_aspect_ratio=decrease,'
            'pad=480:270:(ow-iw)/2:(oh-ih)/2:color=0x17202d,'
            'drawbox=x=0:y=0:w=140:h=28:color=black@0.7:t=fill,'
            f"drawtext={font_filter}text='{frame['time']:.3f}s':x=8:y=6:fontsize=16:fontcolor=white[s{i}]"
        )
    columns = min(4, len(frames))
    tiles = ''.join(f'[s{i}]' for i in range(len(frames)))
    if len(frames) == 1:
        filters.append(tiles + 'null[out]')
    else:
        layout = '|'.join(f'{i % columns * 480}_{i // columns * 270}' for i in range(len(frames)))
        filters.append(tiles + f'xstack=inputs={len(frames)}:layout={layout}:fill=0x17202d[out]')
    arguments += ['-filter_complex_threads', '1', '-filter_complex', ';'.join(filters), '-map', '[out]', '-frames:v', '1', str(output / 'sheet.png')]
    run(arguments)


def study(args):
    source = Path(args.video).expanduser().resolve()
    if not source.is_file():
        raise ValueError('需要可读取的本地视频文件；视频链接先由可用工具获取为本地素材')
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', args.name) or len(args.name) > 64:
        raise ValueError('--name 使用小写字母、数字、短横线，最长 64 字符')
    if args.width < 0:
        raise ValueError('--width 必须非负；0 表示原尺寸')
    probe = json.loads(run(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(source)]))
    streams = probe.get('streams', [])
    video = next((s for s in streams if s.get('codec_type') == 'video' and not s.get('disposition', {}).get('attached_pic')), None)
    if not video:
        raise ValueError('文件没有可用的视频画面')
    duration = finite(probe.get('format', {}).get('duration', video.get('duration', 0)), '视频时长')
    start = finite(args.start, '--start')
    end = duration if args.end is None else finite(args.end, '--end')
    if not 0 <= start < end <= duration:
        raise ValueError('分析区间必须满足 0 ≤ start < end ≤ 视频时长')
    try:
        fps = float(Fraction(video.get('avg_frame_rate', '0/1')))
    except (ValueError, ZeroDivisionError):
        fps = 0
    times = sample_times(start, end, args.frames, fps, args.times)
    has_audio = any(s.get('codec_type') == 'audio' for s in streams)
    # 先验证输入，再创建独立批次；不覆盖或删除既有分析。
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    output = Path(args.output_root).expanduser().resolve() / args.name / stamp
    output.mkdir(parents=True, exist_ok=False)
    (output / 'frames').mkdir()
    frames = []
    for index, seconds in enumerate(times):
        relative = f'frames/frame_{index + 1:03d}_t{seconds:010.3f}.png'
        target = output / relative
        command = ['ffmpeg', '-v', 'error', '-y', '-ss', str(seconds), '-i', str(source), '-map', f"0:{video['index']}", '-frames:v', '1']
        if args.width:
            command += ['-vf', f"scale=w='min(iw,{args.width})':h=-2"]
        run(command + [str(target)])
        if not target.is_file() or target.stat().st_size == 0:
            raise ValueError(f'{seconds:.3f}s 没有取到画面，检查源视频或改用更早的时间')
        frames.append({'time': seconds, 'file': relative})
    contact_sheet(frames, output)
    audio = None
    if args.audio and has_audio:
        audio = 'reference-audio.wav'
        run(['ffmpeg', '-v', 'error', '-y', '-ss', str(start), '-i', str(source), '-t', str(end - start), '-map', '0:a:0', '-vn', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', str(output / audio)])
    metadata = {
        'source': {'path': str(source), 'sha256': file_hash(source), 'bytes': source.stat().st_size,
                   'duration': duration, 'video_stream': video, 'has_audio': has_audio},
        'range': {'start': start, 'end': end},
        'sampling': {'timestamp_kind': 'requested_seek_time', 'width_limit': args.width, 'frames': frames, 'audio': audio, 'audio_start': start if audio else None},
        'sheet': 'sheet.png', 'status': 'sampled',
    }
    (output / 'study.json').write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return {'directory': str(output), 'metadata': str(output / 'study.json'), 'sheet': str(output / 'sheet.png'),
            'frames': len(frames), 'range': metadata['range'], 'audio': str(output / audio) if audio else None}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('video')
    parser.add_argument('--name', default='reference-study')
    parser.add_argument('--start', type=float, default=0)
    parser.add_argument('--end', type=float)
    parser.add_argument('--frames', type=int, default=12)
    parser.add_argument('--times', help='源视频绝对时间，逗号分隔；提供时覆盖 --frames')
    parser.add_argument('--width', type=int, default=960)
    parser.add_argument('--audio', action='store_true')
    parser.add_argument('--output-root', default=str(ROOT / 'studies'))
    args = parser.parse_args()
    try:
        result = study(args)
    except (ValueError, OSError, KeyError) as error:
        parser.error(str(error))
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
