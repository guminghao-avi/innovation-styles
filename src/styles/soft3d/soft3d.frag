// 3D 渲染 · 软糯材质（光线步进 SDF）：一地胶囊（域重复，一格一个）+ 地面 + 一颗铬球；软阴影、AO、包裹光（wrap）做"软糯"，
// 铬球只反射一张环境（天 / 地渐变 + 一块柔光箱），不再追第二次 —— 便宜，而且看起来已经很像渲染器。
uniform vec3 uCam, uTgt, uBall;
uniform float uImpact, uBallR, uExpo;
uniform vec2 uImpXZ;
const float S = .62, R = .2;                       // 胶囊间距、半径
float h11(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float capH(vec2 id) {                               // 每根胶囊的高度：一点随机 + 冲击波
  float h = .5 + .14 * h11(id);
  if (uImpact > 0.) { float d = length(id * S - uImpXZ); h -= .32 * exp(-pow((d - uImpact * 3.2) / .55, 2.)) * exp(-uImpact * 1.1) + .25 * exp(-d * d * 2.) * exp(-uImpact * 2.5); }
  return max(R + .02, h);
}
float capsule(vec3 p, vec2 id) { vec3 q = p - vec3(id.x * S, 0., id.y * S); float h = capH(id); return length(vec3(q.x, q.y - clamp(q.y, R, h - R), q.z)) - R; }
vec2 map(vec3 p) {
  // 域重复 + 每格高度不同 → 距离场在格子边界不连续：要同时查自己和朝向 p 的三个邻格，否则会"切片"
  vec2 g = p.xz / S, id = floor(g + .5), o = sign(g - id);
  float dc = min(min(capsule(p, id), capsule(p, id + vec2(o.x, 0.))), min(capsule(p, id + vec2(0., o.y)), capsule(p, id + o)));
  vec2 r = vec2(dc, 1.);
  if (p.y < r.x) r = vec2(p.y, 0.);
  float db = length(p - uBall) - uBallR; if (db < r.x) r = vec2(db, 2.);
  return r;
}
vec3 nrm(vec3 p) { vec2 e = vec2(.002, -.002); return normalize(e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x + e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x); }
float shadow(vec3 o, vec3 d) { float r = 1., t = .03; for (int i = 0; i < 18; i++) { float h = map(o + d * t).x; r = min(r, 9. * h / t); t += clamp(h, .03, .3); if (r < .01 || t > 4.) break; } return clamp(r, 0., 1.); }
float ao(vec3 p, vec3 n) { float o = 0., s = 1.; for (int i = 1; i <= 4; i++) { float h = .06 * float(i); o += (h - map(p + n * h).x) * s; s *= .7; } return clamp(1. - 2.2 * o, 0., 1.); }
vec3 env(vec3 r) {                                  // 铬球看到的世界：粉白的天、粉色的地、一块柔光箱
  vec3 c = mix(vec3(.95, .55, .66), vec3(1., .95, .97), smoothstep(.05, .7, r.y));
  c = mix(c, vec3(.32, .12, .22), exp(-pow(r.y / .07, 2.)) * .85);       // 地平线一道暗带：铬的"金属感"全靠这种强对比
  c *= mix(.55, 1., smoothstep(-.6, 0., r.y));
  c += vec3(3.) * smoothstep(.88, .97, dot(r, normalize(vec3(-.5, .7, .4))));
  c += vec3(1.6) * smoothstep(.93, .99, dot(r, normalize(vec3(.7, .5, -.2))));
  return c;
}
void main() {
  vec2 px = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  vec3 f = normalize(uTgt - uCam), rr = normalize(cross(f, vec3(0, 1, 0))), u = cross(rr, f);
  vec3 rd = normalize(f * 1.6 + rr * px.x + u * px.y), ro = uCam;
  float t = 0.; vec2 hit = vec2(-1.);
  for (int i = 0; i < 110; i++) { vec2 h = map(ro + rd * t); if (h.x < .0015 * t) { hit = vec2(t, h.y); break; } t += h.x * .75; if (t > 18.) break; }
  vec3 bg = mix(vec3(1., .86, .89), vec3(.93, .74, .86), px.y + .5);
  vec3 col = bg;
  if (hit.x > 0.) {
    vec3 p = ro + rd * hit.x, n = nrm(p), L = normalize(vec3(-.45, .8, .35));
    float sh = shadow(p + n * .01, L), oc = ao(p, n);
    float wrap = clamp((dot(n, L) + .45) / 1.45, 0., 1.);                 // 包裹光：暗部不死黑 → "软"
    vec3 alb = hit.y < .5 ? vec3(.96, .58, .66) : vec3(1., .55, .65);
    if (hit.y > .5 && hit.y < 1.5) { vec2 id = floor(p.xz / S + .5); alb = mix(vec3(1., .52, .62), vec3(.80, .58, 1.), smoothstep(-6., 6., id.x * S + id.y * S * .3)) * (.94 + .1 * h11(id)); }
    vec3 amb = mix(vec3(.75, .45, .55), vec3(1., .9, .95), n.y * .5 + .5);
    col = alb * (wrap * sh * vec3(1.15, 1.02, .98) + amb * .55) * oc;
    col += vec3(1.) * pow(max(0., dot(reflect(rd, n), L)), 24.) * .25 * sh;   // 柔和高光
    if (hit.y > 1.5) {                                                       // 铬球：环境反射 + 菲涅尔
      vec3 r = reflect(rd, n); float fr = .6 + .4 * pow(1. - max(0., dot(-rd, n)), 3.);
      col = env(r) * fr * mix(.55, 1., sh) * vec3(1., .95, .97);
    }
    col = mix(col, bg, smoothstep(5., 14., hit.x));                          // 远处融进背景（空气透视）
  }
  col = aces(col * uExpo);
  gl_FragColor = vec4(dither(toSRGB(col)), 1.);
}
