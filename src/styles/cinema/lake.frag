// 写实电影感 · 夜湖 / 黎明（来自《回声》）：夜空 + 星 + 月光、三层远山（大气透视）、可选的"前山"（山脊 = 一条函数曲线）、
// 水面倒影（波纹扰动）、薄雾；uDawn 0→1 把整片天换成黎明。线性颜色 × 曝光 → aces → toSRGB → dither。
// 前山：uAmp > 0 时，山脊高度 = ridge(x) * uAmp，ridge 在下面改成你自己的曲线（《回声》里是那句话的波形）。
uniform float uCy, uAmp, uFade, uExpo, uDrift, uFar, uDawn, uXc, uW;
float ridge(float x) { return .55 + .25 * sin(x * 9.) + .12 * sin(x * 23. + 1.) + .06 * sin(x * 61. + 2.); }

vec3 above(vec2 p) {
  float x = uXc + (p.x - 960.) / 1500. * uW;
  float yr = uCy - ridge(x) * uAmp;
  float hgt = uCy - p.y;
  vec3 sky = mix(vec3(.014, .019, .036), vec3(.002, .003, .008), smoothstep(uCy - 80., uCy - 820., p.y));
  sky += vec3(.05, .06, .085) * exp(-pow(length((p - vec2(380., 170.)) / vec2(520., 330.)), 2.)) * .55 * (1. - uDawn);
  float hz = max(0., hgt);
  vec3 dawn = mix(vec3(.9, .42, .16), vec3(.2, .22, .36), smoothstep(0., 420., hz));
  dawn = mix(dawn, vec3(.03, .05, .12), smoothstep(380., 1000., hz));
  dawn += vec3(1., .62, .3) * exp(-pow(length((p - vec2(960., uCy + 40.)) / vec2(520., 160.)), 2.)) * 1.4;
  sky = mix(sky, dawn * .55, uDawn);
  vec2 sg = floor(p / 3.); float st = hash1(sg);
  sky += vec3(.8, .85, 1.) * step(.998, st) * pow(hash1(sg + 3.1), 3.) * .5 * smoothstep(uCy - 150., uCy - 500., p.y) * (1. - uDawn);
  vec3 col = sky;
  for (int i = 2; i >= 0; i--) {                       // 远山：越远越淡、视差越小
    float fi = float(i);
    float xs = (p.x - 960.) / 1920. * mix(.5, 1.1, 1. - fi / 2.) + fi * 3.7 + uDrift * (.2 + .25 * (2. - fi));
    float top = uCy - (60. + 150. * (1. - fi / 2.5)) * (.55 + .9 * fbm(vec2(xs * (2.2 - fi * .5), fi * 7.1))) * uFar;
    float m = smoothstep(top - 1.2, top + 1.2, p.y);
    vec3 fogc = mix(vec3(.008, .011, .02), vec3(.022, .029, .048), fi / 2.);
    vec3 rock = fogc * (.85 + .3 * fbm(vec2(xs * 30., p.y * .02 + fi)));
    rock = mix(rock, mix(vec3(.05, .035, .04), dawn * .3, .25 + fi * .22), uDawn);
    col = mix(col, rock, m);
  }
  float m = smoothstep(yr - 1.2, yr + 1.2, p.y) * step(.5, uAmp);   // 前山：二维噪声梯度打月光
  if (m > 0.) {
    vec2 q = vec2(x * 900., hgt / max(uAmp, 1.) * 9.);
    q += .6 * vec2(fbm(q * .7 + 3.1), fbm(q * .7 + 8.3));
    float e = .05, h0 = fbm(q), hx = fbm(q + vec2(e, 0.)), hy = fbm(q + vec2(0., e));
    vec3 n = normalize(vec3(-(hx - h0) / e, -(hy - h0) / e, .9));
    float lit = max(0., dot(n, normalize(vec3(-.65, .5, .5))));
    vec3 rock = vec3(.004, .005, .008) + vec3(.022, .026, .038) * pow(lit, 3.) * (.3 + .7 * h0) + vec3(.016, .019, .028) * exp(-(p.y - yr) / 34.);
    col = mix(col, rock, m);
  }
  col += mix(vec3(.022, .028, .042), vec3(.12, .07, .05), uDawn) * exp(-max(0., hgt) / 55.) * (.7 + .6 * vnoise(vec2(p.x * .004 + uTime * .05, 1.)));
  return col;
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes * vec2(1920., 1080.);
  vec3 col;
  if (p.y < uCy) col = above(p);
  else {                                               // 水：镜像 + 波纹扰动，越往下越暗
    float d = p.y - uCy;
    vec2 q = vec2(p.x + (vnoise(vec2(p.x * .006, p.y * .11 - uTime * .4)) - .5) * (4. + d * .05), 2. * uCy - p.y + (vnoise(vec2(p.x * .02, p.y * .3)) - .5) * d * .02);
    col = above(q) * .3 + vec3(.002, .003, .006);
    col *= mix(1., .45, smoothstep(uCy + 60., 1080., p.y));
    col *= .9 + .2 * vnoise(vec2(p.x * .003, p.y * .09 - uTime * .3));
  }
  col *= uFade;
  col = aces(col * uExpo);
  gl_FragColor = vec4(dither(toSRGB(col)), 1.);
}
