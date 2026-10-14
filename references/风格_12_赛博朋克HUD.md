# 风格 12：赛博朋克 HUD（FUI · 电影里的科幻界面）

> 示例状态：随附可运行的 Remotion 画面源码；未编排音轨。下文“声音”是制作建议。

> **线框、滚动数据、全息地球 · 瞄准镜开机、搜索、锁定 · 青色界面 → 橙色警报 · 强辉光 + 色散 + 扫描线**
> 来源（新版文档记载；未附原视频，本次未复核原片与工具标签）：参考视频第 08 种（作品「隼眼-9 · 目标锁定」：锁定长江口；原片标签 Three.js 线框 + 辉光后期）。
> 工具：`@styles/hud`（海岸线数据：Natural Earth 1:110m，`land110.json`，公有领域）；示例：`projects/示例_赛博朋克HUD/`。

## 一、一句话认出它
黑底上全是细线：一个线框地球在转，周围一圈圈刻度环、弧段在旋转，左边一列等宽字体的数据在跳，屏幕四角有括号；找到目标后，锁定框从大收到小，整个界面从青色变成橙色。

## 二、什么题目用它
科技 / 军事 / 航天 / 数据追踪 / "侦查"类叙事；悬疑感、找东西、锁定一个答案。也能做"系统检测到你……"的心理梗。

## 三、长什么样
- 颜色只有两个：青 `62,232,255`（常态）、橙 `255,138,42`（警报）；亮色 `200,250,255` / `255,214,170`；底 `#03070c` + 60px 极淡网格。
- 线：1~2px，`lighter` 叠加发光；地球海岸线两遍（4px 淡 + 1.4px 亮）；背面的线压到 5%。
- 数据：IBM Plex Mono 18~20px，逐行"打字"出现，数字每帧跳（`#` 占位随机）；大读数 64px。
- 动效：开机（刻度环从 0 展开、弧段生长）、扫描（一根亮经线扫过地球）、锁定（四角括号从 320px 收到 70px + 闪烁 + 十字准线 + 扩散圆环）、颜色从青插值到橙。
- 后期：强 bloom（.45，阈值 .35）+ 色散 `ca: 2` + DOM 扫描线（`repeating-linear-gradient` 2px 一条）。

## 四、技术实现方案
**一个全分辨率 Canvas2D 画所有线框（正交投影自己算），DOM 只放警报卡片和字幕。**
```ts
import { HUDC, drawGlobe, project, ticks, arc, bracket, telemetry } from '@styles/hud';
const v = { cx: 1080, cy: 520, r: 360, lon0, lat0 };   // 地球视角：中心经纬度
drawGlobe(g, v, { col, a, scan });                    // 经纬网 + 真实海岸线 + 边缘辉光
const [x, y, z] = project(v, 121.8, 31.4);            // 长江口在屏幕上的位置（z>0 才在正面）
bracket(g, x - s/2, y - s/2, s, s, 22, col, a);       // 锁定框
```
- 正交投影：`x = cosφ·sin(λ-λ0)`，`y = cosφ0·sinφ - sinφ0·cosφ·cos(λ-λ0)`，`z = sinφ0·sinφ + cosφ0·cosφ·cos(λ-λ0)`；z<0 的线段画得很淡。
- 转到目标：`lon0` 从"搜索时的飞转"`E.film` 插值到目标经度；`lat0` 到目标纬度 - 8°（让目标落在球心稍下）。
- 海岸线数据来自 `world-atlas` 的 `land-110m.json`（TopoJSON → 已解码成多边形数组，125 个多边形 / 5000 点，75KB）。要国家边界：同包的 `countries-110m.json`。
- 想要真 3D 线框（建筑、地形）：`@remotion/three` + `EdgesGeometry` / `WireframeGeometry`，材质 `LineBasicMaterial` + 加法混合。
- 性能：先测地图与密集线条的代表镜头；后期 bloom 会影响线条观感。
- `post.json`：`{ "grain": 3, "vignette": 0.35, "bloom": 0.45, "bloomThreshold": 0.35, "bloomRadius": 22, "ca": 2 }`（= `HUD_POST`）。

## 五、声音
开机 `glitch` + 一串 `tick`、扫描 `whir`（高）、数据 `type`（很轻）、锁定 `alarm`（两声）+ `impact` 小、警报变色 `riser` 短。

## 六、坑
- 颜色超过两种就乱了；所有元素共用一个 `col`，警报时整体插值。
- 线太粗 = 卡通；1~2px + 发光。
- 文字用比例字体 = 不像界面；数据一律等宽。

## 七、地图数据

组件随附 `src/styles/hud/land110.json`，源码注明基于 Natural Earth 1:110m 海岸线数据。[Natural Earth 使用条款](https://www.naturalearthdata.com/about/terms-of-use/)将其地图数据置于公共领域。此图用于风格演示，不作为地理边界或测量依据。
