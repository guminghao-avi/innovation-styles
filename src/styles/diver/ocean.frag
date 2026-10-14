// 潜水戴夫风 · 海（全分辨率、平滑，像"3D 渲染"的那一半）：按深度变色 + 光柱 + 焦散 + 两侧礁壁剪影 + 海床 + 水面
// 世界纵坐标 = 深度（米），屏幕中线对应 uDepth，uPPM = 每米多少像素。不做 ACES：这是明快的风格化海，颜色直接就是 sRGB。
uniform float uDepth, uPPM, uFloor, uCamX, uRedLoss;
vec3 waterCol(float d) {
  vec3 c = mix(vec3(.30, .86, .90), vec3(.07, .52, .78), smoothstep(0., 12., d));
  c = mix(c, vec3(.03, .22, .50), smoothstep(10., 30., d));
  return mix(c, vec3(.01, .07, .20), smoothstep(28., 60., d));
}
float caust(vec2 p, float t) {             // 焦散：两层扭过的网格亮线
  vec2 q = p + .35 * vec2(sin(p.y * 1.7 + t * .9), cos(p.x * 1.5 - t * .8));
  vec2 f = abs(fract(q) - .5);
  float a = smoothstep(.06, 0., min(f.x, f.y));
  q = p * 1.37 + .4 * vec2(cos(p.y * 1.3 - t * .7), sin(p.x * 1.9 + t));
  f = abs(fract(q) - .5);
  return max(a, smoothstep(.05, 0., min(f.x, f.y)) * .8);
}
void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes * vec2(1920., 1080.);
  float d = uDepth + (px.y - 540.) / uPPM;            // 这个像素的深度（米）
  float wx = (px.x - 960.) / uPPM + uCamX;             // 世界横坐标（米）
  float t = uTime;
  // 水面（微微起伏）以上：天空
  float surf = .25 * sin(wx * .9 + t * 1.6) + .12 * sin(wx * 2.3 - t * 2.1);
  if (d < surf) {
    vec3 sky = mix(vec3(.62, .88, 1.), vec3(.36, .70, .98), clamp(-d / 8., 0., 1.));
    sky += vec3(1., .93, .75) * exp(-pow(length((px - vec2(1500., 540. - (uDepth + 6.) * uPPM)) / 260.), 2.)) * .5;
    gl_FragColor = vec4(dither(sky), 1.); return;
  }
  vec3 c = waterCol(max(d, 0.));
  // 水面下方那一层亮的"镜面"
  c += vec3(.55, .95, 1.) * exp(-(d - surf) * uPPM / 10.) * .55;
  // 光柱：斜着从水面打下来，越深越淡
  float u = wx * .9 + d * .32;
  float rays = pow(vnoise(vec2(u * 1.1, t * .12)), 3.) * 1.4 + pow(vnoise(vec2(u * 2.7 + 9., t * .2)), 4.) * .8;
  c += vec3(.7, 1., .95) * rays * .32 * exp(-max(d, 0.) / 14.);
  // 两侧礁壁：三层剪影，越远越被水色吞掉（视差：远层随镜头横移慢）
  for (int i = 2; i >= 0; i--) {
    float fi = float(i), par = 1. - fi * .28;
    float x = (px.x - 960.) / uPPM * (1. - fi * .2) + uCamX * par;
    float edge = 7.5 + fi * 2.2 + 1.6 * fbm(vec2(d * .25 + fi * 4., fi)) + .8 * sin(d * .6 + fi);
    float m = max(smoothstep(edge - .06, edge + .06, -x - fi * 1.5), smoothstep(edge - .06, edge + .06, x - 3. - fi * 1.5));
    vec3 rock = mix(vec3(.05, .16, .26), waterCol(d), .35 + fi * .25);
    rock *= .85 + .35 * fbm(vec2(x * 1.5, d * 1.5) + fi);
    rock += vec3(.6, 1., .95) * caust(vec2(x, d) * 1.3, t) * .08 * exp(-d / 10.) * (1. - fi * .4);   // 礁石上的焦散
    c = mix(c, rock, m * (1. - fi * .12));
  }
  // 海床
  float fl = uFloor + .5 * sin(wx * .4) + .3 * sin(wx * 1.3 + 1.);
  if (d > fl) {
    vec3 sand = mix(vec3(.55, .62, .55), waterCol(d), .55) * (.85 + .25 * vnoise(vec2(wx * 6., d * 6.)));
    sand += vec3(.6, 1., .9) * caust(vec2(wx, d) * 1.6, t) * .22 * exp(-uFloor / 30.);
    c = mix(c, sand, smoothstep(fl, fl + .08, d));
  }
  // 浅水处空气里也有一点焦散的晃动
  c += vec3(.5, 1., .9) * caust(vec2(wx, d) * .8, t * .7) * .035 * exp(-max(d, 0.) / 5.);
  // 字幕区（下 1/4）略压暗
  c *= mix(1., .82, smoothstep(760., 1080., px.y));
  gl_FragColor = vec4(dither(c), 1.);
}
