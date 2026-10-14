// 水下：从水面一路往下 —— 体积光束、越深越暗；海底是一片透视的沙地，上面晃着焦散光
uniform float uCam, uExpo, uFloor, uSurf, uDim;
float caustic(vec2 uv, float time) {
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.;
  vec2 i = p; float c = 1.; float inten = .005;
  for (int n = 0; n < 4; n++) {
    float tt = time * (1. - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1. / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= 4.; c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.);
}
void main() {
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes * vec2(1920., 1080.);
  float t = uTime;
  float wy = fc.y + uCam;                       // 世界 y（向下为正）
  float depth = clamp((wy - uSurf) / 2000., 0., 1.);
  vec3 col = mix(vec3(.022, .06, .075), vec3(.002, .006, .01), pow(depth, .6));
  // 体积光：从水面斜着打下来，越深越淡
  float rx = fc.x + (fc.x - 960.) * (wy / 1600.) * .35 - wy * .12;
  float rays = pow(fbm(vec2(rx * .0055, t * .05)), 4.) * 3.2;
  col += vec3(.022, .062, .07) * rays * pow(1. - depth, 2.2);
  // 水面
  float sl = uSurf - uCam + 7. * sin(fc.x * .007 + t * .8) + 4. * sin(fc.x * .019 - t * 1.3);
  float above = smoothstep(sl + 2., sl - 2., fc.y);
  vec3 surf = vec3(.07, .16, .18) * (.55 + .9 * fbm(vec2(fc.x * .008, fc.y * .05 + t * .25))) + vec3(.25, .42, .45) * smoothstep(3., 0., abs(fc.y - sl)) * .4;
  col = mix(col, surf, above);
  col += vec3(.05, .1, .11) * exp(-(fc.y - sl) / 60.) * (1. - above) * .5;
  // 海底：地平线在屏幕 yh，往下是透视的沙地
  float yh = uFloor - uCam;
  if (fc.y > yh) {
    float dy = fc.y - yh;
    float Z = 420. / (dy + 6.);                  // 越靠近地平线越远
    vec2 gp = vec2((fc.x - 960.) * Z * .0042, Z * 1.6);
    float sand = .55 + .3 * fbm(gp * 3.) + .25 * vnoise(gp * 22.) * smoothstep(2.5, .5, Z);
    float ripples = .5 + .5 * sin(gp.y * 9. + fbm(gp * 2.) * 6.);
    sand *= .85 + .2 * ripples;
    float ca = caustic(gp * .55 + vec2(0., 0.), t * .55) ;
    ca += .5 * caustic(gp * .55 + vec2(.37, .19), t * .55 + 1.7);
    float near = smoothstep(14., .6, Z);
    vec3 ground = vec3(.05, .1, .1) * sand * (.35 + .65 * near) + vec3(.16, .32, .32) * ca * near * .8;
    float fog = exp(-Z * .12);
    float edge = smoothstep(0., 18., dy);
    col = mix(col, ground, fog * edge);
  }
  col *= 1. - uDim;
  col *= mix(1., .6, smoothstep(780., 1080., fc.y));
  col = aces(col * uExpo);
  gl_FragColor = vec4(dither(toSRGB(col)), 1.);
}
