"""vo.json → vo.timing.json；按阅读速度初估字幕时长，不产生配音。
用法：python scripts/silent.py P。字段：start/gap/base/perChar；每句 id/text/gap/hold/at。
**词**、「词」用于强调，标点不增加字数；words 按显示文本均分，供 T() 对齐。
"""
import argparse
import json
import math
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent

def number(value, name):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
        raise ValueError(f'{name} 必须是非负有限数字')
    return float(value)

def build_timing(vo):
    base = number(vo.get('base', 1.0), 'base')
    per = number(vo.get('perChar', .14), 'perChar')
    gap0 = number(vo.get('gap', .5), 'gap')
    cursor = number(vo.get('start', .3), 'start')
    lines = vo.get('lines')
    if not isinstance(lines, list) or not lines:
        raise ValueError('lines 需要至少一句字幕')
    result, ids = [], set()
    for i, line in enumerate(lines):
        ident = line.get('id')
        if not isinstance(ident, str) or not ident or re.search(r'[\s.@+\-]', ident) or ident in ids:
            raise ValueError(f'字幕 id 无效或重复: {ident}')
        ids.add(ident)
        if not isinstance(line.get('text'), str) or not line['text'].strip():
            raise ValueError(f'{ident} 需要非空 text')
        start = cursor + (number(line.get('gap', gap0), f'{ident}.gap') if i else 0)
        if 'at' in line:
            start = number(line['at'], f'{ident}.at')
            if i and start < cursor:
                raise ValueError(f'{ident}.at 与上一句重叠')
        text = line['text'].replace('**', '')
        count = len(re.sub(r'[\s，。、；：！？“”‘’「」（）—…,.;:!?"\'()\-]', '', text))
        duration = base + count * per + number(line.get('hold', 0), f'{ident}.hold')
        if duration <= 0:
            raise ValueError(f'{ident} 时长必须大于 0')
        step = duration / len(text)
        result.append({
            'id': ident, 'text': line['text'], 't0': round(start, 3), 't1': round(start + duration, 3),
            'words': [{'w': c, 't0': round(start + j * step, 3), 't1': round(start + (j + 1) * step, 3)} for j, c in enumerate(text)],
        })
        cursor = start + duration
    return {'duration': round(cursor, 3), 'lines': result}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('project')
    args = parser.parse_args()
    if args.project in ('.', '..') or not args.project.strip() or re.search(r'[/\\\x00-\x1f]', args.project):
        parser.error('项目名必须是 projects/ 下的单个目录名')
    directory = ROOT / 'projects' / args.project
    try:
        timing = build_timing(json.loads((directory / 'vo.json').read_text(encoding='utf-8')))
    except (ValueError, OSError) as error:
        parser.error(str(error))
    (directory / 'vo.timing.json').write_text(json.dumps(timing, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    for line in timing['lines']:
        print(f"{line['id']:>4} {line['t0']:7.2f}-{line['t1']:7.2f}  {line['text']}")
    print(f"总长 {timing['duration']:.2f}s")

if __name__ == '__main__':
    main()
