# 创意短片 · 风格版

一个可以直接运行的创意短片 skill。给它主题、文字或想法，它会选择视觉母题、写字幕、设计镜头，再用 Remotion 生成原创动画。也可以传入参考视频，拆解风格、制作原创试片，验证后保存为可复用的风格。

默认输出 **1920×1080 / 30fps / 3 分钟以内**，字幕叙事，只有音效。用户可以指定时长、尺寸或声音要求。

![四种风格，每种两帧实渲预览](references/风格总览.png)

| 风格 | 画面与故事 |
|---|---|
| 自渡风 | 暗夜像素、提灯角色、HUD；把困境和行动变成游戏机制 |
| 潜水戴夫风 | 明亮海底、平滑环境与原创像素角色；把知识做成任务和图鉴 |
| 写实电影感 | 着色器光影、发光母题、宋体字幕；用场景变化表达情绪 |
| 纸艺手绘 | 剪纸、纸纹、墨线小人、定格运动；生活比喻的小剧场 |

海底风格借鉴《潜水员戴夫》的视觉语言，随附角色与界面由代码绘制，不包含游戏原始素材。

## 参考视频学习模式

用户传一段视频，skill 会按这条流程处理：

1. 抽帧、记录时间码、查看连续运动，按需要提取音轨。
2. 拆解构图、色光、材质、字幕、运动、转场和声音，区分观察与实现推测。
3. 做约 10–20 秒原创试片，对照参考修正关键差异。
4. 用户要求沉淀时，将验证过的方法保存成风格文档、组件和原创示例，登记到 [风格库](references/风格库.md)。

可以直接这样说：

```text
用 $innovation-styles 学习我上传的视频风格，命名为“暖色墨线”。先拆解，再做一段 15 秒原创试片，验证后沉淀到风格库。新片仍然只有音效。
```

下次调用：

```text
用 $innovation-styles 的“暖色墨线”风格，做一条 30 秒关于拖延的短片。
```

这是将经验保存为文件和可复用代码，不涉及训练模型。只要求模仿做片时，分析保留在该项目；明确要求学习/沉淀时完成入库。原视频、抽帧和音轨默认保存在本地 `studies/`，不随 Git 提交。当前尚未登记用户参考视频的新风格。

本地视频的采样入口：

```bash
python3 scripts/study_video.py '/绝对路径/参考视频.mp4' --name amber-ink --start 0 --end 20 --frames 12 --audio
```

分析区间需在视频时长内，也可省略 `--start/--end` 采样整段。脚本负责准备证据，风格分析和原创实现由使用 skill 的 AI 完成。完整规则见 [参考视频学习与沉淀](references/参考视频学习.md)。

## 安装 skill

Codex：

```bash
git clone https://github.com/guminghao-avi/innovation-styles.git ~/.codex/skills/innovation-styles
```

Claude Code：

```bash
git clone https://github.com/guminghao-avi/innovation-styles.git ~/.claude/skills/innovation-styles
```

如果目标目录已存在，先检查已有内容再选择位置。也可下载仓库 ZIP，将完整文件夹命名为 `innovation-styles`，放到相应工具的 skill 目录；代码、字体和参考文档都要一起保留。

调用示例：

```text
用 $innovation-styles 做一条 20 秒纸艺手绘短片，主题是“为什么计划越多越不想开始”。字幕叙事，只有音效，直接交付 MP4。
```

## 运行示例

需要 **Node.js 22.18+（推荐 24）、Python 3.10+、FFmpeg 与 ffprobe**。下面命令在仓库根目录执行：

```bash
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
npm run check
npm test
npm run studio
```

Studio 默认打开纸艺示例。渲染代表静帧：

```bash
node scripts/render.mjs --proj '示例_纸艺手绘' --stills 1.5,11
```

生成示例声音并导出 MP4：

```bash
.venv/bin/python projects/示例_纸艺手绘/gen_sound.py
.venv/bin/python scripts/sound.py 示例_纸艺手绘
node scripts/render.mjs --proj '示例_纸艺手绘' --video
```

Windows 将 `.venv/bin/python` 换成 `.venv\Scripts\python.exe`。Remotion 首次渲染会下载 Chrome Headless Shell；默认使用软件 WebGL。机器较慢时先跑静帧或 1–3 秒测试片，再决定渲染块长和并发数。

## 包含什么

- [SKILL.md](SKILL.md)：选风格、创作、视觉检查和成片交付的入口。
- [制作与验收](references/制作与验收.md)：时间轴、声音、缓存、续渲与最终 MP4 验收。
- [参考视频学习](references/参考视频学习.md) 与 [风格库](references/风格库.md)：视频拆解、原创试片、风格沉淀及后续调用。
- `src/kit/`：时间、Canvas、GLSL、镜头、字幕和字体工具。
- `src/styles/`：四种视觉风格的绘画与 UI 组件。
- `projects/示例_*/`：四部约 20–25 秒短片的完整源码和声音编排。
- `projects/参考_*/`：两部历史长片源码，用于学习镜头和结构。

仓库不包含本地虚拟环境、依赖目录、音频、成片和渲染缓存；示例成片可按上面的命令生成。静帧按批次保留，画面输入变化会生成新缓存目录；修改声音或调色时可以只重新合成。详细流程见制作与验收文档。

随附字体的作者与许可见 [字体许可](fonts/LICENSES.md)。配音功能仅在明确要求时调用联网的 Edge TTS 服务，台词会发送到该服务。其余默认字幕、画面与音效合成在本地完成。

## 验证记录

2026-10-14，在 macOS Apple Silicon、Node.js 24.15.0、Python 3.13 环境验证：六个自带项目类型检查通过，七项运行逻辑回归检查通过，四种风格各渲出代表静帧并查看；2 秒编码测试通过，短音频补静音后仍为 1920×1080、30fps、60 帧，完整解码成功。预览图来自本次实渲。未对四部示例重新全片编码，未测试 Windows/Linux 或联网 TTS。

同日新增参考视频学习模式：用本地纸艺视频验证了采样总览与音轨输出，并用合成测试视频验证取帧、指定区间、原尺寸、无音轨、无效输入与批次保留；当前 `npm test` 共 11 项通过。尚未用用户新参考视频完整跑过风格提炼、原创试片与入库流程。
