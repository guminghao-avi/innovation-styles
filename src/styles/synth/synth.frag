// 复古 Synthwave（80s · VHS）：紫红渐变天 + 星 + 条纹落日 + 线框山（霓虹描边）+ 透视霓虹网格地面（向前滚）+ VHS 跟踪错位带。
uniform float uSpeed, uHz, uSun, uTrack, uExpo;
float ridge(float x) {                                  // 低多边形山脊：分段线性
  float i = floor(x), f = fract(x);
  float a = hash1(vec2(i, 3.)), b = hash1(vec2(i + 1., 3.));
  float h = mix(a, b, f);
  return h * (.55 + .45 * smoothstep(2., 9., abs(x)));   // 中间低（让出太阳）、两边高
}
void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes * vec2(1920., 1080.);
  // VHS 跟踪错位：一条横带整体右移 + 噪声
  float band = smoothstep(18., 0., abs(px.y - uTrack)) * step(0., uTrack);
  px.x += band * (24. + 30. * hash1(vec2(floor(px.y / 3.), floor(uTime * 30.))));
  float hz = uHz, y = px.y;
  vec3 col;
  if (y < hz) {
    float u = y / hz;
    col = mix(vec3(.03, .005, .08), vec3(.42, .03, .36), pow(u, 1.8));
    col = mix(col, vec3(1., .35, .35), pow(u, 6.) * .8);
    vec2 sg = floor(px / 3.); col += vec3(.9) * step(.997, hash1(sg)) * (1. - u) * .8;
    // 太阳：上黄下粉，下半部分被越来越宽的横条切开
    vec2 sc = vec2(960., hz - 190. + uSun); float r = 250., d = length(px - sc);
    if (d < r) {
      float v = (px.y - (sc.y - r)) / (2. * r);
      vec3 s = mix(vec3(1., .78, .12), vec3(1., .08, .45), smoothstep(.1, .95, v));
      float stripe = v > .45 ? step(.3 + (v - .45) * 1.4, fract((px.y - sc.y) / 26.)) : 0.;
      col = mix(col, s * 1.1, (1. - stripe) * smoothstep(r, r - 2., d));
    }
    col += vec3(1., .25, .5) * exp(-max(0., d - r) / 90.) * .22;
    // 线框山：山脊以下暗紫色，山脊线霓虹粉
    float mx = (px.x - 960.) / 140., top = hz - ridge(mx) * 230.;
    if (y > top) { col = mix(vec3(.08, .02, .14), vec3(.18, .03, .25), (y - top) / 230.); float g = fract(mx); col += vec3(.9, .2, .9) * smoothstep(.04, 0., min(g, 1. - g)) * .25 * (1. - (y - top) / 260.); }
    col += vec3(1., .3, 1.) * exp(-abs(y - top) / 2.5) * 1.2 + vec3(1., .2, .8) * exp(-abs(y - top) / 14.) * .25;
  } else {
    // 地面：透视网格。z = k / (y - hz)，x 方向按 z 拉开；横线往前滚
    float dy = y - hz + .5, z = 260. / dy, wx = (px.x - 960.) / dy * 2.6;
    float gx = abs(fract(wx) - .5), gz = abs(fract(z - uTime * uSpeed) - .5);
    float lw = .02 + .01 * z;
    float lines = smoothstep(.5 - lw, .5, gx) + smoothstep(.5 - lw * 2.4, .5, gz) * smoothstep(60., 6., z);
    col = vec3(.03, .0, .06) + vec3(.25, .02, .25) * exp(-dy / 30.);
    col += vec3(1., .2, .85) * lines * (.45 + .4 * exp(-dy / 200.)) * smoothstep(80., 12., z);   // 远处淡掉，否则摩尔纹
    col += vec3(1., .4, .6) * exp(-dy / 6.) * .8;                 // 地平线一道亮
  }
  col *= 1. - .25 * band;
  col = aces(col * uExpo);
  gl_FragColor = vec4(dither(toSRGB(col)), 1.);
}
