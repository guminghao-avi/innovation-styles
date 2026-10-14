// 弥散渐变 + 玻璃拟态：极光渐变底（几团大色块按扭曲噪声缓慢流动）+ 最多 4 块"磨砂玻璃"（圆角矩形，在同一个着色器里算）。
// 玻璃 = 底图按"离边缘多近"做透镜折射 + RGB 三通道错开一点（色散）+ 提亮 + 磨砂颗粒 + 左上亮边 + 内阴影。
// 比 CSS backdrop-filter 便宜得多（软件渲染下大面积模糊很慢），而且折射 / 色散 CSS 做不出来。
uniform vec4 uC0, uC1, uC2, uC3;      // 每块玻璃：x, y, w, h（像素，左上角）；w = 0 表示没有
uniform float uRad, uGlow, uExpo;
uniform vec2 uOrb;                    // 一颗光球的位置（像素）
float sdRR(vec2 p, vec4 r) { vec2 c = r.xy + r.zw * .5, b = r.zw * .5 - uRad; vec2 q = abs(p - c) - b; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - uRad; }
vec3 aurora(vec2 p) {
  vec2 uv = p / 1080.; float t = uTime * .08;
  vec2 w = uv + .35 * vec2(fbm(uv * 1.3 + t), fbm(uv * 1.3 - t + 4.));
  vec3 c = vec3(.025, .02, .09);
  c += vec3(.42, .20, .95) * exp(-pow(length(w - vec2(.55 + .2 * sin(t * 2.), .35)) / .38, 2.));
  c += vec3(.10, .45, 1.0) * exp(-pow(length(w - vec2(1.25, .7 + .1 * cos(t * 1.7))) / .42, 2.));
  c += vec3(.95, .30, .70) * exp(-pow(length(w - vec2(1.5 + .2 * cos(t), .15)) / .3, 2.)) * .7;
  c += vec3(.15, .85, .95) * exp(-pow(length(w - vec2(.25, .85)) / .3, 2.)) * .45;
  c += vec3(1.) * exp(-pow(length(p - uOrb) / 140., 2.)) * uGlow;          // 光球
  return c;
}
vec4 glass(vec2 p, vec4 r) {
  if (r.z <= 0.) return vec4(0.);
  float d = sdRR(p, r); if (d > 1.5) return vec4(0.);
  float m = 1. - smoothstep(-1., 1., d);
  float edge = clamp(-d / 60., 0., 1.);                       // 0 = 边上，1 = 里面
  vec2 c = r.xy + r.zw * .5, dir = normalize(p - c + .001);
  vec2 off = dir * (1. - edge) * 26.;                          // 透镜：越靠边折射越多
  vec3 col = vec3(aurora(p - off * 1.08).r, aurora(p - off).g, aurora(p - off * .92).b);   // 色散
  col = col * .85 + vec3(.13, .12, .2);                        // 提亮（磨砂的白雾）
  col += (vnoise(p * .9) - .5) * .03;                          // 颗粒
  float top = clamp(1. - (p.y - r.y) / 30., 0., 1.) * clamp(1. - (p.x - r.x) / (r.z * .7), 0., 1.);
  col += vec3(.5) * smoothstep(-2.5, 0., d) * (.35 + .65 * top);          // 亮边（左上更亮）
  col *= 1. - .25 * smoothstep(-24., 0., d) * (1. - top);                // 下右内阴影
  return vec4(col, m);
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes * vec2(1920., 1080.);
  vec3 col = aurora(p);
  // 玻璃的投影：底下压暗一圈
  float sh = min(min(sdRR(p - vec2(0., 24.), uC0), uC1.z > 0. ? sdRR(p - vec2(0., 24.), uC1) : 1e5), min(uC2.z > 0. ? sdRR(p - vec2(0., 24.), uC2) : 1e5, uC3.z > 0. ? sdRR(p - vec2(0., 24.), uC3) : 1e5));
  if (uC0.z > 0.) col *= 1. - .35 * (1. - smoothstep(-10., 50., sh));
  vec4 g0 = glass(p, uC0), g1 = glass(p, uC1), g2 = glass(p, uC2), g3 = glass(p, uC3);
  col = mix(col, g0.rgb, g0.a); col = mix(col, g1.rgb, g1.a); col = mix(col, g2.rgb, g2.a); col = mix(col, g3.rgb, g3.a);
  col = aces(col * uExpo);
  gl_FragColor = vec4(dither(toSRGB(col)), 1.);
}
