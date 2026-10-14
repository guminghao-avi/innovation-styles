// 墨入水：侧面看一滴猩红的墨坠入水中 —— 涡环蘑菇云 + 茎 + 垂下的指状卷须；背光散射；光鱼游过的尾流把墨冲淡
uniform vec4 uDrop;      // x, 水面 y, 入水后秒数 tau（<0 未入水）, 淡出 0..1
uniform float uWk[40];   // 10 个尾流点：x, y, age, strength
uniform float uExpo, uPush, uCool, uSurf;

float inkD(vec2 p, float tau) {
  if (tau < 0.) return 0.;
  vec2 c = vec2(uDrop.x + 18. * sin(tau * .7), uDrop.y + 470. * (1. - exp(-tau / 1.7)) + 26. * tau);
  vec2 w = vec2(fbm(p * .0042 + vec2(0., -tau * .22)), fbm(p * .0042 + vec2(5.2, 1.3 - tau * .19))) - .5;
  vec2 q = p + w * (16. + 34. * tau);
  float R = 26. + 200. * (1. - exp(-tau / 1.3));
  float rr = 9. + 15. * sqrt(tau);
  vec2 d = q - c;
  vec2 e = d / vec2(R, R * .26 + rr * .5);
  float el = length(e);
  float dist = abs(el - 1.) * R * .42;
  float side = clamp(abs(d.x) / R, 0., 1.);
  float ring = exp(-dist * dist / (rr * rr)) * (.45 + 1.2 * side * side);
  float cap = smoothstep(1.08, .2, el) * (.14 + .1 * smoothstep(rr, -rr * 2., d.y));
  vec2 ld = (abs(d) - vec2(R * .93, -rr * .2)) / vec2(rr * 1.35, rr * 1.15);
  float lobes = exp(-length(ld) * 1.5) * 1.1;
  float sy = clamp((q.y - uDrop.y) / (c.y - uDrop.y + 1.), 0., 1.);
  float sw = 5. + 12. * sy + 7. * tau;
  float sx = q.x - uDrop.x - 26. * sin(q.y * .011 + tau * .8) * sy;
  float stem = exp(-sx * sx / (sw * sw)) * smoothstep(uDrop.y - 4., uDrop.y + 30., q.y) * smoothstep(c.y + 10., c.y - 40., q.y) * (.28 + .3 * sy);
  float fg = 0.;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float fx = c.x + R * (-.95 + .31 * fi + .12 * sin(fi * 4.7 + 1.)) ;
    float L = max(0., tau - 1.0 - .35 * fract(fi * .53)) * (15. + 55. * fract(fi * .618 + .31));
    float yy = q.y - c.y - 6.;
    float fw = (3. + 6. * fract(fi * .71 + .4)) * (1. + .2 * tau);
    float fl = exp(-pow((q.x - fx) / fw, 2.)) * smoothstep(-6., 12., yy) * smoothstep(L + 16., L - 26., yy);
    float tip = exp(-length((q - vec2(fx, c.y + 6. + L)) / vec2(fw * 2.4, fw * 1.5)) * 1.6);
    fg += fl * .45 + tip * .75;
  }
  float dens = ring + cap + lobes + stem + fg * smoothstep(.9, 1.8, tau);
  float raw = dens;
  vec2 w2 = vec2(fbm(q * .009 + vec2(1.7, 9.2) + tau * .08), fbm(q * .009 + vec2(8.3, 2.8) - tau * .07));
  float sm = fbm(q * .011 + 3.2 * w2 + vec2(0., -tau * .15));
  float sm2 = fbm(q * .03 + 2. * w2 - vec2(tau * .1, 0.));
  raw *= .55 + .9 * fbm(q * .017 + w2 * 2.);
  dens = raw * (.2 + 2.2 * sm * sm + .5 * sm2 * sm2 * sm);
  dens *= smoothstep(.04, .45, raw) * 2.2;
  return dens * smoothstep(0., .2, tau);
}

void main() {
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes * vec2(1920., 1080.);
  vec2 p = vec2(960., 470.) + (fc - vec2(960., 470.)) / uPush;
  float t = uTime;
  // 水：越往上越亮，斜斜的体积光
  vec3 bg = mix(vec3(.002, .005, .008), vec3(.016, .045, .058), pow(clamp(1. - p.y / 1080., 0., 1.), 2.4));
  float rx = p.x + (p.x - 960.) * (p.y / 1080.) * .35 - p.y * .12;
  float rays = fbm(vec2(rx * .0055, t * .05)) ; rays = pow(rays, 4.) * 3.2;
  bg += vec3(.022, .062, .07) * rays * pow(smoothstep(1080., 0., p.y), 1.5);
  // 水面（从下往上看）：一条起伏的亮带 + 落点的涟漪
  float tau = uDrop.z;
  float rip = 0.;
  if (tau > 0.) { float dx = abs(p.x - uDrop.x); rip = sin(dx * .06 - tau * 9.) * exp(-dx * .006) * exp(-tau * .7) * smoothstep(tau * 260. + 20., tau * 260. - 40., dx); }
  float sl = uSurf + 7. * sin(p.x * .007 + t * .8) + 4. * sin(p.x * .019 - t * 1.3) + 9. * rip;
  float above = smoothstep(sl + 2., sl - 2., p.y);
  vec3 surf = vec3(.07, .16, .18) * (.55 + .9 * fbm(vec2(p.x * .008 + rip * .3, p.y * .05 + t * .25))) + vec3(.25, .42, .45) * smoothstep(3., 0., abs(p.y - sl)) * .4;
  bg = mix(bg, surf, above);
  bg += vec3(.05, .1, .11) * exp(-(p.y - sl) / 60.) * (1. - above) * .5;

  // 墨
  float d0 = inkD(p, tau);
  float clear = 0.;
  for (int i = 0; i < 10; i++) {
    vec2 wp = vec2(uWk[i * 4], uWk[i * 4 + 1]); float age = uWk[i * 4 + 2], st = uWk[i * 4 + 3];
    float r = 40. + 170. * age; vec2 dd = p - wp;
    clear += st * exp(-dot(dd, dd) / (r * r));
  }
  float dens = d0 * exp(-2.6 * clear) * (1. - uDrop.w);
  float lightAt = .3 + 1.1 * exp(-(p.y - uSurf) / 520.);
  vec3 col = bg * exp(-dens * vec3(1.2, 4.2, 4.4));
  col += vec3(.52, .022, .03) * lightAt * (1. - exp(-dens * 1.3)) * exp(-dens * .95);
  col += vec3(.9, .1, .08) * lightAt * dens * exp(-dens * 3.5) * .07;
  // 被冲淡的地方：红变成一层清凉的光
  float coolA = min(clear, 1.2) * (1. - exp(-d0 * 1.4)) * uCool;
  col += vec3(.006, .03, .036) * coolA * (.3 + fbm(p * .012 + t * .15));
  col *= mix(1., .55, smoothstep(760., 1080., fc.y));
  col = aces(col * uExpo);
  gl_FragColor = vec4(dither(toSRGB(col)), 1.);
}
