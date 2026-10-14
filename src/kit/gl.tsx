// 全屏片元着色器：<Shader frag={GLSL} u={{ uFoo: 1, uCol: [1,.5,.2] }} scale={.5} />
// 内置 uniform：uTime（场景局部秒）、uRes（像素）、uFrame。frag 只写 main 及其依赖；需要噪声就把 GLSL.noise 拼在前面。
// 没有 GPU：swangle 软件渲染，耗时 ≈ 像素数 × 每像素运算量。体积光/光线步进用 scale .5（或 .35）+ CSS 放大，柔和画面看不出来。
import React, { useLayoutEffect, useRef } from 'react';
import { useCurrentFrame } from 'remotion';
import { FPS, W, H } from './time';

type U = Record<string, number | number[]>;
const VERT = 'attribute vec2 p; varying vec2 vUv; void main(){ vUv = p*.5+.5; gl_Position = vec4(p,0.,1.); }';
const HEAD = 'precision highp float; varying vec2 vUv; uniform vec2 uRes; uniform float uTime; uniform float uFrame;\n';

export const Shader: React.FC<{ frag: string; u?: U; scale?: number; t?: number; style?: React.CSSProperties; blend?: React.CSSProperties['mixBlendMode'] }> = ({ frag, u = {}, scale = 1, t, style, blend }) => {
  const f = useCurrentFrame(), ref = useRef<HTMLCanvasElement>(null);
  const st = useRef<{ gl: WebGLRenderingContext; prog: WebGLProgram; loc: Record<string, WebGLUniformLocation | null> } | null>(null);
  const cw = Math.round(W * scale), ch = Math.round(H * scale);
  useLayoutEffect(() => {
    if (!st.current) {
      const gl = ref.current!.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false })!;
      const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('GLSL 编译失败:\n' + gl.getShaderInfoLog(s) + '\n' + src.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n')); return s; };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, HEAD + frag)); gl.linkProgram(prog);
      gl.useProgram(prog);
      const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const pl = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(pl); gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
      st.current = { gl, prog, loc: {} };
    }
    const { gl, prog, loc } = st.current;
    const L = (n: string) => (n in loc ? loc[n] : (loc[n] = gl.getUniformLocation(prog, n)));
    gl.viewport(0, 0, cw, ch);
    gl.uniform2f(L('uRes'), cw, ch); gl.uniform1f(L('uTime'), t ?? f / FPS); gl.uniform1f(L('uFrame'), f);
    for (const [n, v] of Object.entries(u)) {
      const l = L(n); if (!l) continue;
      if (typeof v === 'number') gl.uniform1f(l, v);
      else if (v.length === 2) gl.uniform2fv(l, v); else if (v.length === 3) gl.uniform3fv(l, v); else if (v.length === 4) gl.uniform4fv(l, v);
      else gl.uniform1fv(l, v);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
  useLayoutEffect(() => () => { st.current?.gl.getExtension('WEBGL_lose_context')?.loseContext(); st.current = null; }, []);
  return <canvas ref={ref} width={cw} height={ch} style={{ position: 'absolute', inset: 0, width: W, height: H, mixBlendMode: blend, ...style }} />;
};

/** 常用 GLSL 片段：拼到 frag 前面用，例如 frag={GLSL.noise + GLSL.color + myMain} */
export const GLSL = {
  noise: `
float hash1(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec2 hash2(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash1(i),hash1(i+vec2(1,0)),u.x), mix(hash1(i+vec2(0,1)),hash1(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; mat2 r=mat2(.8,.6,-.6,.8); for(int i=0;i<5;i++){ v+=a*vnoise(p); p=r*p*2.02; a*=.5; } return v; }
vec3 mod289(vec3 x){ return x-floor(x*(1./289.))*289.; } vec4 mod289(vec4 x){ return x-floor(x*(1./289.))*289.; }
vec4 permute(vec4 x){ return mod289(((x*34.)+1.)*x); } vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159-.85373472095314*r; }
float snoise(vec3 v){ const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx); vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy); vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i); vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y); vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.)); vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3))); }
`,
  color: `
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d){ return a+b*cos(6.28318*(c*t+d)); }
vec3 toSRGB(vec3 c){ return pow(clamp(c,0.,1.), vec3(1./2.2)); }
float luma(vec3 c){ return dot(c, vec3(.2126,.7152,.0722)); }
// 输出前抖动 ±0.5/255：消除暗部渐变色带（光晕、天空必加）
vec3 dither(vec3 c){ vec2 p = gl_FragCoord.xy + fract(uTime*7.31)*vec2(97.,53.); float n = fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453) + fract(sin(dot(p+.71, vec2(39.35,11.13)))*24634.63) - 1.; return c + n/255.; }
`,
  sdf: `
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float sdSphere(vec3 p, float r){ return length(p)-r; }
float sdBox(vec3 p, vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }
float sdTorus(vec3 p, vec2 t){ vec2 q=vec2(length(p.xz)-t.x,p.y); return length(q)-t.y; }
float smin(float a, float b, float k){ float h=clamp(.5+.5*(b-a)/k,0.,1.); return mix(b,a,h)-k*h*(1.-h); }
`,
};
