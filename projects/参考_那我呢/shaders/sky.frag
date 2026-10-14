// 夜空：天空坐标（度）里的程序星点 + 极淡的气辉；镜头和 Canvas 里的星座用同一套 skyP 投影
uniform vec4 uCam;      // cx, cy（度）, s（像素/度）, sy（屏幕中心 y）
uniform float uExpo, uStars, uHaze;
float starLayer(vec2 d, float cell, float px, float thr, float bmul) {
  vec2 c = floor(d / cell), f = d / cell - c;
  vec2 h = hash2(c * 1.31 + cell * 7.1);
  float b = hash1(c + cell * 3.3);
  if (b < thr) return 0.;
  vec2 sp = (c + .15 + .7 * h) * cell;
  float r = length(d - sp) * uCam.z;                       // 屏幕像素距离
  float m = pow((b - thr) / (1. - thr), 3.) * bmul;
  return m * (exp(-r * r / (px * px)) + .12 * exp(-r / (px * 3.)));
}
void main() {
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes * vec2(1920., 1080.);
  vec2 d = vec2(uCam.x, uCam.y) + (fc - vec2(960., uCam.w)) / uCam.z;
  float s = 0.;
  s += starLayer(d, .55, 1.0, .8, .5);
  s += starLayer(d + 17.3, 1.3, 1.2, .78, 1.0);
  s += starLayer(d + 41.7, 3.1, 1.4, .7, 1.8);
  // 星色：偏暖 / 偏冷一点点
  float tint = hash1(floor(d / .55));
  vec3 sc = mix(vec3(.75, .82, 1.), vec3(1., .85, .7), tint);
  vec3 col = sc * s * uStars;
  // 气辉 + 极淡的星际尘埃
  float hz = fbm(d * .09 + 3.) * fbm(d * .21 - 1.7);
  col += vec3(.016, .018, .032) * hz * uHaze;
  col += vec3(.003, .0035, .007) * uHaze;
  col *= mix(1., .55, smoothstep(760., 1080., fc.y));     // 下方留给字幕
  col = aces(col * uExpo);
  gl_FragColor = vec4(dither(toSRGB(col)), 1.);
}
