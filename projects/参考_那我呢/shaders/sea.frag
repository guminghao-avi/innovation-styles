// 海：透视海面（多层方向波 + 细节噪声法线，按距离降细节）+ 菲涅耳反射天空 + 落日波光带 + 湿沙滩
// 线框模式（想象的草稿）↔ 上色模式（想象成真），从地平线往外"显影"；夜里模式反射点光源 + 落点涟漪
uniform vec4 uCam;    // x 偏移, 眼高, 地平线屏幕 y, 焦距
uniform vec4 uMode;   // wire 0..1, paint 进度, grid 展开, fold 收成一点
uniform vec4 uLook;   // sat, expo, night 0..1, calm（浪的大小）
uniform vec4 uSun;    // 方向 x, y（相对视线）, 大小, 亮度
uniform float uShore; // 岸线距离（<=0 没有沙滩）
uniform float uL[32]; // 夜里 8 盏灯：x, y, z, 强度
uniform float uR[24]; // 8 个涟漪：x, z, age
uniform vec3 uWireCol;
uniform vec4 uMoon;   // 月亮方向 x, y, 大小, 亮度（夜里）

vec3 skyCol(vec3 d) {
  float y = d.y;
  vec3 sunD = normalize(vec3(uSun.x, uSun.y, 1.));
  float sd = max(dot(d, sunD), 0.);
  // 落日：地平线橙 → 粉 → 紫 → 深蓝
  vec3 c = mix(vec3(1.05, .36, .12), vec3(.42, .12, .16), smoothstep(.0, .08, y));
  c = mix(c, vec3(.1, .05, .14), smoothstep(.06, .22, y));
  c = mix(c, vec3(.012, .016, .05), smoothstep(.18, .55, y));
  c += vec3(1.4, .55, .2) * pow(sd, 40.) * .8 + vec3(1., .35, .12) * pow(sd, 6.) * .18;
  // 一条条被夕阳照亮的云
  vec2 cp = d.xz / max(y + .04, .02);
  float cl = fbm(vec2(cp.x * .55 + uTime * .006, cp.y * 2.4)) ;
  cl = smoothstep(.5, .8, cl) * smoothstep(.02, .06, y) * smoothstep(.32, .1, y);
  c = mix(c, vec3(.9, .3, .16) * (.25 + 1.4 * pow(sd, 5.)) + vec3(.05, .01, .03), cl * .7);
  // 太阳
  float sun = smoothstep(uSun.z, uSun.z * .8, acos(clamp(sd, -1., 1.)));
  c += vec3(4., 2.3, 1.1) * sun * uSun.w;
  // 夜
  vec3 nc = mix(vec3(.012, .016, .03), vec3(.002, .003, .008), smoothstep(0., .4, y));
  vec2 sp = d.xy / max(d.z, .1) * 900.; vec2 si = floor(sp); float h = hash1(si);
  nc += vec3(.9, .9, 1.) * step(.9982, h) * smoothstep(.0, .05, y) * (.25 + .75 * hash1(si + 3.)) * (.4 + .6 * hash1(si + 7.));
  vec3 mD = normalize(vec3(uMoon.x, uMoon.y, 1.));
  float md = max(dot(d, mD), 0.), ma = acos(clamp(md, -1., 1.));
  nc += vec3(.9, .92, 1.) * smoothstep(uMoon.z, uMoon.z * .85, ma) * 1.6 * uMoon.w;
  nc += vec3(.25, .3, .42) * (pow(md, 400.) * .5 + pow(md, 40.) * .08 + pow(md, 6.) * .02) * uMoon.w;
  return mix(c, nc, uLook.z);
}
float waveH(vec2 p, float t, out vec2 grad) {
  float h = 0.; grad = vec2(0.);
  float A = uLook.w;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float an = fi * 1.37 + .4;
    vec2 dir = vec2(cos(an), sin(an) * .6 + .4); dir = normalize(dir);
    float k = .55 * pow(1.55, fi), a = .16 * A / pow(1.6, fi), w = sqrt(9.8 * k);
    float ph = k * dot(dir, p) - w * t + fi * 2.1;
    h += a * sin(ph); grad += a * k * cos(ph) * dir;
  }
  return h;
}
void main() {
  vec2 fc0 = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes * vec2(1920., 1080.);
  vec2 ctr = vec2(960., uCam.z);
  float fold = uMode.w;
  vec2 fc = ctr + (fc0 - ctr) / max(1. - fold, .002);
  float t = uTime;
  float f = uCam.w;
  vec3 ro = vec3(uCam.x, uCam.y, 0.);
  vec3 rd = normalize(vec3((fc.x - 960.) / f, -(fc.y - uCam.z) / f, 1.));
  vec3 col; float gridA = 0.;
  float hz = smoothstep(0., 1.6, abs(fc.y - uCam.z));     // 地平线线框
  if (rd.y < 0.) {
    float tt = ro.y / -rd.y;
    vec3 pos = ro + rd * tt;
    // 一个像素在地面上的大小（给线框抗锯齿、给法线降细节）
    vec3 rd2 = normalize(vec3((fc.x + 1. - 960.) / f, -(fc.y + 1. - uCam.z) / f, 1.));
    vec3 pos2 = ro + rd2 * (ro.y / -min(rd2.y, -1e-4));
    float px = length(pos2.xz - pos.xz) + 1e-4;
    vec2 g; float h = waveH(pos.xz, t, g);
    float lod = smoothstep(.5, .02, px);
    vec2 q = pos.xz * vec2(1.4, 2.2);
    vec2 gn = vec2(vnoise(q * 2. + t * .4) - vnoise(q * 2. + vec2(.13, 0.) + t * .4), vnoise(q * 2. - t * .3) - vnoise(q * 2. + vec2(0., .13) - t * .3)) * 1.2;
    gn += vec2(vnoise(q * 7. + t) - vnoise(q * 7. + vec2(.07, 0.) + t), vnoise(q * 7. - t * .8) - vnoise(q * 7. + vec2(0., .07) - t * .8)) * .9 * lod;
    g += gn * uLook.w * .55;
    // 涟漪
    for (int i = 0; i < 8; i++) {
      vec2 rp = vec2(uR[i * 3], uR[i * 3 + 1]); float age = uR[i * 3 + 2];
      if (age <= 0.) continue;
      vec2 dd = pos.xz - rp; float d = length(dd);
      float env = exp(-age * .55) * smoothstep(age * 1.1 + .4, age * 1.1 - .2, d) * exp(-d * .25);
      g += normalize(dd + 1e-4) * cos(d * 9. - age * 7.) * env * .45;
    }
    vec3 n = normalize(vec3(-g.x, 1., -g.y));
    vec3 rf = reflect(rd, n); rf.y = abs(rf.y);
    float fres = .02 + .98 * pow(1. - max(dot(-rd, n), 0.), 5.);
    vec3 sky = skyCol(rf) * mix(1., .55, uLook.z);
    vec3 deep = mix(vec3(.008, .012, .024), vec3(.002, .004, .008), uLook.z);
    vec3 water = mix(deep, sky, fres);
    vec3 sunD = normalize(vec3(uSun.x, uSun.y, 1.));
    float sp = pow(max(dot(rf, sunD), 0.), 900.) * 60. + pow(max(dot(rf, sunD), 0.), 90.) * 1.6;
    water += vec3(1.5, .85, .45) * sp * uSun.w * (1. - uLook.z);
    vec3 mD = normalize(vec3(uMoon.x, uMoon.y, 1.));
    float ms = pow(max(dot(rf, mD), 0.), 1400.) * 22. + pow(max(dot(rf, mD), 0.), 160.) * .35;
    water += vec3(.75, .82, 1.) * ms * uMoon.w * uLook.z;
    // 夜里的灯：在水面上拉出一条条倒影
    for (int i = 0; i < 8; i++) {
      vec3 lp = vec3(uL[i * 4], uL[i * 4 + 1], uL[i * 4 + 2]); float li = uL[i * 4 + 3];
      if (li <= 0.) continue;
      vec3 L = normalize(lp - pos); float dist = length(lp - pos);
      float s = pow(max(dot(rf, L), 0.), 700.) * 7. + pow(max(dot(rf, L), 0.), 90.) * .12;
      water += vec3(1., .6, .28) * s * li / (1. + dist * .25);
      water += vec3(1., .55, .25) * li * .25 * exp(-length(lp.xz - pos.xz) * 3.) * smoothstep(.6, 0., lp.y);
    }
    // 沙滩
    if (uShore > 0.) {
      float shore = uShore + .5 * sin(pos.x * .35 + 1.) + .25 * sin(pos.x * .9);
      float swash = .55 * sin(t * .55) + .2 * sin(t * 1.3 + pos.x * .4);
      float wetEdge = shore + swash;
      float sand = smoothstep(wetEdge + .08, wetEdge - .08, pos.z);
      float tex = .55 + .45 * fbm(pos.xz * vec2(1.5, 3.)); tex *= .8 + .35 * (.5 + .5 * sin(pos.z * 7. + fbm(pos.xz * 2.) * 5.)) * lod + .25 * vnoise(pos.xz * vec2(30., 60.)) * lod;
      vec3 dry = vec3(.075, .038, .026) * tex;
      float wet = smoothstep(wetEdge - 1.6, wetEdge, pos.z);
      vec3 wetc = mix(dry * .35, skyCol(vec3(rf.x, abs(reflect(rd, vec3(0., 1., 0.)).y), rf.z)) * .55, .75);
      vec3 sandc = mix(dry * (.55 + .45 * (1. - uLook.z)), wetc, wet);
      sandc *= mix(1., .08, uLook.z);
      float foam = smoothstep(.2, 0., abs(pos.z - wetEdge - .05)) * (.5 + .5 * fbm(pos.xz * 5. + t));
      water = mix(water, sandc, sand) + vec3(1., .8, .7) * foam * .35 * (1. - uLook.z);
    }
    float fog = 1. - exp(-tt * .012);
    col = mix(water, skyCol(vec3(rd.x, .002, rd.z)), fog * .9);
    // 线框：水面上的格子随浪起伏
    vec2 gp = pos.xz + vec2(0., h * 1.6);
    vec2 gw = abs(fract(gp * vec2(1., .5)) - .5) / (vec2(1., .5) * px * 1.2);
    float line = max(1. - min(gw.x, 9.), 1. - min(gw.y, 9.));
    line = clamp(line, 0., 1.) * smoothstep(1.2, .2, px);
    float extent = smoothstep(uMode.z * 900. + 5., uMode.z * 900. - 60., fc.y - uCam.z) * smoothstep(uMode.z * 1300. + 5., uMode.z * 1300. - 80., abs(fc.x - 960.));
    gridA = line * extent * (.25 + .4 * smoothstep(40., 0., tt));
  } else {
    col = skyCol(rd);
    float lat = abs(fract(atan(rd.y, 1.) * 40.) - .5) / .02;
    gridA = clamp(1. - lat, 0., 1.) * .25 * smoothstep(uMode.z * 500., 0., fc.y < uCam.z ? uCam.z - fc.y : 1e4) * uMode.z;
    // 线框里的太阳：一个圈
    vec3 sunD = normalize(vec3(uSun.x, uSun.y, 1.));
    float a = acos(clamp(dot(rd, sunD), -1., 1.));
    gridA = max(gridA, smoothstep(.0012, 0., abs(a - uSun.z * 1.15)) * smoothstep(0., .3, uMode.z));
  }
  // 显影：从地平线往外
  float dd = abs(fc.y - uCam.z) / 540. + .12 * fbm(fc * .004) ;
  float paint = smoothstep(dd - .08, dd + .02, uMode.y * 1.25 - .05);
  vec3 wireC = uWireCol * (gridA + (1. - hz) * 1.4 * step(.001, uMode.z));
  float lum = luma(col);
  col = mix(vec3(lum), col, uLook.x);
  vec3 outc = mix(wireC, col * uLook.y, paint) + wireC * uMode.x * paint * .4;
  outc *= mix(1., .55, smoothstep(820., 1080., fc0.y));
  outc *= 1. - smoothstep(.85, 1., fold);
  outc = aces(outc);
  gl_FragColor = vec4(dither(toSRGB(outc)), 1.);
}
