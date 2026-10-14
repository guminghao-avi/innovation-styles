// 液态流动（Liquid · SDF 融球）：二维距离场里的"果冻"——圆、胶囊、圆环用 smin（平滑并集）粘在一起 → 粘连、拉丝、融合；
// 把距离场当高度场算法线 → 饱满的高光、边缘暗、内部透光；下方一面暗色"水面"倒影。
// 场景：一滴落下（uDrop = 下落进度，uSplash = 溅开后的秒数）→ 溅成几颗小水珠 → 被吸进 "drop" 四个字母的形状里。
uniform float uDrop, uSplash, uForm, uWob;
float smin(float a, float b, float k) { float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
float sdCap(vec2 p, vec2 a, vec2 b, float r) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h) - r; }
float sdRing(vec2 p, vec2 c, float R, float w) { return abs(length(p - c) - R) - w; }
float sdArc(vec2 p, vec2 c, float R, float w, float a0, float a1) {   // 圆弧（a0..a1 弧度，y 向下）
  vec2 q = p - c; float a = atan(q.y, q.x); a = clamp(a, a0, a1);
  return length(q - vec2(cos(a), sin(a)) * R) - w;
}
float word(vec2 p, float w) {          // "drop"：字母中心 y = 560，x 依次 640 / 860 / 1060 / 1290
  float R = 64.;
  float d = min(sdRing(p, vec2(640., 560.), R, w), sdCap(p, vec2(640. + R, 400.), vec2(640. + R, 624.), w));
  d = min(d, min(sdCap(p, vec2(830., 500.), vec2(830., 624.), w), sdArc(p, vec2(900., 560.), 64., w, -3.1416, -1.25)));
  d = min(d, sdRing(p, vec2(1060., 560.), R, w));
  d = min(d, min(sdRing(p, vec2(1290., 560.), R, w), sdCap(p, vec2(1290. - R, 500.), vec2(1290. - R, 730.), w)));
  return d;
}
float scene(vec2 p) {
  float w = 26. * uForm;
  // 字母轻轻"晃"（果冻）：按 y 做一点横向偏移
  vec2 q = p + vec2(sin(p.y * .03 + uTime * 6.) * 3. * uWob, 0.);
  float d = uForm > .01 ? word(q, max(1., w)) : 1e5;
  // 下落的那一滴（拉长的水滴）
  if (uDrop < 1.) { vec2 c = vec2(960., mix(-120., 520., uDrop * uDrop)); d = smin(d, sdCap(p, c - vec2(0., 50. * uDrop), c, 46.), 30.); }
  // 溅开的小水珠：沿抛物线飞出，越往后越被吸回字母里（smin 让它们和字母粘连、拉丝）
  if (uSplash > 0.) for (int i = 0; i < 7; i++) {
    float fi = float(i), a = -2.6 + fi * .87, sp = 520. + 160. * hash1(vec2(fi, 7.));
    float tt = uSplash; vec2 c = vec2(960., 540.) + vec2(cos(a), sin(a)) * sp * tt + vec2(0., 900. * tt * tt);
    vec2 home = vec2(640. + fi * 110., 560. + 40. * sin(fi * 2.));
    c = mix(c, home, smoothstep(.25, .9, tt));
    float r = (34. - fi * 2.) * (1. - smoothstep(.6, 1.1, tt));
    if (r > 1.) d = smin(d, length(p - c) - r, 38.);
  }
  return d;
}
vec3 shade(vec2 p, float d) {
  vec2 e = vec2(1.5, 0.);
  vec2 g = vec2(scene(p + e.xy) - scene(p - e.xy), scene(p + e.yx) - scene(p - e.yx));
  float h = clamp(-d / 30., 0., 1.);                       // 离边缘越远越"高"
  vec3 n = normalize(vec3(g * (1. - h) * 1.2, .7 + h));
  vec3 L = normalize(vec3(-.5, -.6, .7));
  float diff = max(0., dot(n, L)), spec = pow(max(0., dot(reflect(-L, n), vec3(0., 0., 1.))), 60.);
  vec3 base = mix(vec3(1., .42, .12), vec3(.95, .12, .55), smoothstep(560., 1380., p.x));
  vec3 col = base * (.35 + .75 * diff) + base * base * .5 * h;  // 内部透光（越厚越饱和）
  col *= mix(.55, 1., smoothstep(0., 8., -d));               // 边缘暗一圈
  col += vec3(1.) * spec * 1.6 + vec3(1., .9, .95) * pow(1. - h, 6.) * .12;
  return col;
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes * vec2(1920., 1080.);
  vec3 bg = mix(vec3(.16, .04, .2), vec3(.05, .01, .08), length((p - vec2(960., 520.)) / vec2(1400., 900.)));
  vec3 col = bg;
  float d = scene(p);
  float m = 1. - smoothstep(-1., 1., d);
  if (m > 0.) col = mix(col, shade(p, d), m);
  col += vec3(1., .3, .6) * exp(-max(0., d) / 40.) * .08 * uForm;    // 外发光
  // 水面倒影：基线以下镜像、压暗、带一点波纹
  float base = 762.;
  if (p.y > base) {
    vec2 r = vec2(p.x + sin(p.y * .12 + uTime * 3.) * 4., 2. * base - p.y);
    float dr = scene(r), mr = 1. - smoothstep(-1., 1., dr);
    col = mix(col, shade(r, dr) * .28, mr * smoothstep(1000., base, p.y));
  }
  gl_FragColor = vec4(dither(toSRGB(col)), 1.);
}
