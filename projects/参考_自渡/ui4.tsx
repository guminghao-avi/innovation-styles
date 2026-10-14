// 最后一段的 UI：菜单再出现一次（锁裂开 →「我自己」）、特写时的状态、片尾
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { W, H, k, E, seg, spring, typed, lerp, rnd } from '@kit';
import { T, C } from './common';
import { px, stepA, Icon } from './ui2';

const OPTS = [['家人', '自顾不暇'], ['朋友', '已读不回'], ['公司', '已被优化'], ['运气', '余额不足']];
const LOCK = ['..aaaa..', '.a....a.', '.a....a.', 'bbbbbbbb', 'bbbccbbb', 'bbbccbbb', 'bbbbbbbb'];
const LOCK_OPEN = ['..aaaa..', '.a....a.', '.a......', 'bbbbbbbb', 'bbbccbbb', 'bbbccbbb', 'bbbbbbbb'];
const GLYPH = '？＃％＆＊＠￥§※';
const frame = (): React.CSSProperties => ({ background: 'rgba(13,16,32,.94)', boxShadow: `0 0 0 4px #e6e9f2, 0 0 0 8px #0d1020, 0 0 0 12px ${C.ui}, 0 24px 60px rgba(0,0,0,.6)` });

export const Menu2: React.FC<{ t: number }> = ({ t }) => {
  const t0 = T('menu2'), u = T('unlock'), c = T('rise') - .1;
  if (t < t0 || t > c + .4) return null;
  const open = k(t, t0, t0 + .25, E.snap), hClose = 1 - k(t, c, c + .18, E.in), wClose = 1 - k(t, c + .18, c + .32, E.in);
  const blink = Math.floor(t * 4) % 2 === 0, cur = t >= t0 + 1.0 ? 4 : Math.min(3, Math.floor((t - t0 - .4) / .15));
  const ua = t - u, unlocked = ua >= 0;
  const press = T('h4@最后') - .1, pa = t - press;                   // 先按一下：锁还在，抖一抖
  const shakeL = (pa >= 0 && pa < .35 ? Math.round(Math.sin(pa * 70) * 2) * 4 * (1 - pa / .35) : 0) + (ua > -.5 && ua < 0 ? Math.round(Math.sin(ua * 90) * 2) * 4 : 0);
  const label = !unlocked ? '？？？' : ua < .45 ? [...'？？？'].map((_, i) => GLYPH[Math.floor(rnd(Math.floor(t * 30), i) * GLYPH.length)]).join('') : '我自己';
  const Wd = 760, Ht = 528;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: W / 2 - Wd / 2, top: Math.round((H / 2 - Ht / 2 - 40) / 4) * 4, width: Wd, height: Ht, transform: `scale(${Math.max(.01, open * wClose)}, ${Math.max(.008, open * hClose)})`, ...frame() }}>
        <div style={{ ...px, position: 'absolute', left: 52, top: 44, fontSize: 24, color: C.ui, letterSpacing: '.3em' }}>SYSTEM · 02</div>
        <div style={{ ...px, position: 'absolute', left: 52, top: 96, fontSize: 60, color: C.text, letterSpacing: '.06em' }}>{typed('谁能救我？', seg(t, t0 + .1, t0 + .6))}</div>
        <div style={{ position: 'absolute', left: 52, right: 52, top: 184, height: 4, backgroundImage: `linear-gradient(90deg, ${C.ui} 50%, transparent 50%)`, backgroundSize: '16px 4px' }} />
        {OPTS.map(([l, tag], i) => t >= t0 + .3 + i * .06 && (
          <div key={i} style={{ position: 'absolute', left: 52, right: 52, top: 224 + i * 60, height: 56 }}>
            <div style={{ ...px, position: 'absolute', left: 8, top: 4, fontSize: 48, color: C.gold, opacity: cur === i ? 1 : 0 }}>▶</div>
            <div style={{ ...px, position: 'absolute', left: 72, top: 4, fontSize: 48, color: C.gray, letterSpacing: '.08em' }}>{l}<div style={{ position: 'absolute', left: -8, right: -8, top: 22, height: 4, background: C.red, opacity: .9 }} /></div>
            <div style={{ ...px, position: 'absolute', right: 0, top: 10, fontSize: 36, color: C.red, opacity: .8 }}>{tag}</div>
          </div>
        ))}
        {t >= t0 + .54 && (
          <div style={{ position: 'absolute', left: 52, right: 52, top: 224 + 4 * 60, height: 56, background: unlocked && ua < .15 ? '#fff0b8' : unlocked ? `rgba(242,193,78,${.18 + .1 * Math.sin(t * 4)})` : undefined }}>
            <div style={{ ...px, position: 'absolute', left: 8, top: 4, fontSize: 48, color: C.gold, opacity: cur === 4 && (blink || unlocked) ? 1 : 0 }}>▶</div>
            <div style={{ ...px, position: 'absolute', left: 72 + shakeL, top: 4, fontSize: 48, letterSpacing: '.08em', color: unlocked ? C.gold : C.goldDim,
              transform: unlocked ? `scale(${lerp(1.5, 1, spring(ua - .45, 3, .45))})` : undefined, transformOrigin: 'left center',
              textShadow: unlocked && ua >= .45 ? '0 0 24px rgba(242,193,78,.9), 4px 4px 0 #3a2a10' : undefined }}>{label}</div>
            <div style={{ ...px, position: 'absolute', right: 0, top: 10, fontSize: 36, color: unlocked ? C.gold : C.goldDim, display: 'flex', alignItems: 'center', gap: 16 }}>
              {!unlocked && <Icon rows={LOCK} pal={{ a: '#8a6d2a', b: '#8a6d2a', c: '#1a1408' }} s={4} />}
              {unlocked && ua < .5 && <Icon rows={LOCK_OPEN} pal={{ a: C.gold, b: C.gold, c: '#3a2a10' }} s={4} style={{ transform: `translateY(${Math.round(ua * 120 / 4) * 4}px) rotate(${Math.round(ua * 60)}deg)`, opacity: stepA(1 - ua * 2) }} />}
              {unlocked ? '已解锁' : '未解锁'}
            </div>
          </div>
        )}
        {/* 锁裂开：碎片 */}
        {unlocked && ua < .7 && Array.from({ length: 14 }, (_, i) => {
          const ang = rnd(i, 1) * Math.PI * 2, v = 160 + rnd(i, 2) * 260;
          return <div key={i} style={{ position: 'absolute', left: Wd - 120 + Math.cos(ang) * v * ua, top: 224 + 4 * 60 + 24 + Math.sin(ang) * v * ua + 400 * ua * ua, width: 8, height: 8, background: i % 3 ? C.gold : '#fff0b8', opacity: stepA(1 - ua / .7) }} />;
        })}
      </div>
    </AbsoluteFill>
  );
};

/** 特写时的状态面板：只剩一行 */
export const HUDEnd: React.FC<{ t: number }> = ({ t }) => {
  const a = t - T('closeup') - .6; if (a < 0 || t >= T('end')) return null;
  return (
    <div style={{ position: 'absolute', left: 64, top: 64, padding: '28px 36px 20px', minWidth: 400, background: 'rgba(10,12,24,.6)', boxShadow: `0 0 0 4px ${C.ui}`, transformOrigin: 'left top', transform: `scaleY(${Math.max(.02, k(a, 0, .25, E.snap))})` }}>
      <div style={{ ...px, position: 'absolute', left: 24, top: -18, fontSize: 24, color: C.ui, background: '#0b0d18', padding: '6px 12px', letterSpacing: '.2em' }}>STATUS</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, height: 60 }}>
        <div style={{ ...px, width: 120, fontSize: 36, color: C.ui }}>状态</div>
        <div style={{ ...px, fontSize: 48, color: C.gold, textShadow: '0 0 18px rgba(242,193,78,.6)' }}>{typed('自渡中', seg(a, .3, .8))}</div>
      </div>
    </div>
  );
};

/** 片尾：片名再砸一次 + 一行献词，最后像素淡出到黑 */
export const EndTitle: React.FC<{ t: number; dur: number }> = ({ t, dur }) => {
  const a = t - T('end') - .5; if (a < -.05) return null;
  const s = lerp(1.8, 1, spring(a, 3, .42)), fade = stepA(1 - seg(t, dur - 1.4, dur - .2));
  return (
    <AbsoluteFill style={{ opacity: 1 }}>
      <div style={{ position: 'absolute', left: 0, width: W, top: 250, textAlign: 'center', transform: `scale(${s})`, opacity: a < 0 ? 0 : 1 }}>
        <span style={{ ...px, fontSize: 168, letterSpacing: '.3em', marginLeft: '.3em', color: C.gold, textShadow: `8px 8px 0 #3a2a10, 0 0 48px rgba(242,193,78,${.55 + .4 * Math.exp(-a / .3)})` }}>自渡</span>
      </div>
      <div style={{ ...px, position: 'absolute', left: 0, width: W, top: 470, textAlign: 'center', fontSize: 36, color: '#f6e7c8', letterSpacing: '.3em', textShadow: '0 2px 8px rgba(40,20,30,.8)' }}>{typed('献给每一个，正在造船的人', seg(a, 1.2, 2.6))}</div>
      <div style={{ position: 'absolute', inset: 0, background: '#07080f', opacity: 1 - fade }} />
    </AbsoluteFill>
  );
};
