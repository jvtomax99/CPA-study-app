import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, IW, Phone} from './Phone';

// Effects for the how-to video, in the Interpreter Hub promo's language: a dark city behind
// everything, neon type, two-line headlines with a highlight box, a phone in 3D with UI cards
// floating out of it, a mascot who reacts, whip cuts and sound on every beat.

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const CYAN = '#5fd4ff';
export const PINK = '#ff4f7b';
export const MONO = '"DejaVu Sans Mono", ui-monospace, monospace';

/** A one-shot sound at frame `at` (relative to the enclosing sequence). */
export const Sfx: React.FC<{at: number; name: 'whoosh' | 'tick' | 'pop' | 'chime' | 'buzz' | 'hit'; volume?: number}> = ({at, name, volume = 0.5}) => (
  <Sequence from={Math.max(0, at)} durationInFrames={60} layout="none" name={`sfx:${name}`}>
    <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);

/** The night city from the app, blurred and drifting, under a dark grade and vignette. */
export const Backdrop: React.FC<{src?: string; bright?: number}> = ({src = 'town-3d', bright = 0.55}) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 160) * 40, zoom = 1.25 + frame / 6000;
  return (
    <AbsoluteFill style={{background: '#06060f', overflow: 'hidden'}}>
      <Img src={staticFile(`shots/${src}.png`)} style={{position: 'absolute', left: -140 + drift, top: -200, width: 1360, height: 2340, objectFit: 'cover', filter: `blur(16px) saturate(1.3) brightness(${bright})`, transform: `scale(${zoom})`}} />
      <AbsoluteFill style={{background: 'radial-gradient(120% 80% at 50% 40%, rgba(10,10,30,0.15), rgba(4,4,12,0.85) 75%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,4,14,0.7) 0%, rgba(4,4,14,0) 28%, rgba(4,4,14,0) 70%, rgba(4,4,14,0.85) 100%)'}} />
      <Bokeh />
    </AbsoluteFill>
  );
};

/** Soft city lights floating up. */
const Bokeh: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({length: 26}, (_, i) => {
        const x = random(`bx${i}`) * 1080, size = 14 + random(`bs${i}`) * 60, speed = 0.3 + random(`bv${i}`) * 0.8;
        const y = ((random(`by${i}`) * 2100 - frame * speed) % 2100 + 2100) % 2100 - 90;
        const hue = random(`bh${i}`) < 0.6 ? C.amber : random(`bh${i}`) < 0.8 ? CYAN : PINK;
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: size, background: hue, opacity: 0.08 + 0.12 * random(`bo${i}`), filter: `blur(${size / 5}px)`}} />;
      })}
    </>
  );
};

/** Huge outlined words sliding behind the action. */
export const GhostText: React.FC<{text: string; top?: number; speed?: number; color?: string}> = ({text, top = 420, speed = 1.2, color = 'rgba(255,255,255,0.07)'}) => {
  const frame = useCurrentFrame();
  const row = (dir: number, y: number) => (
    <div style={{position: 'absolute', top: y, left: -400 + dir * ((frame * speed) % 900) - (dir < 0 ? 900 : 0), whiteSpace: 'nowrap', fontSize: 230, fontWeight: 900, letterSpacing: -6, color: 'transparent', WebkitTextStroke: `3px ${color}`, fontFamily: FONT, textTransform: 'uppercase'}}>
      {`${text} · `.repeat(6)}
    </div>
  );
  return <AbsoluteFill style={{overflow: 'hidden'}}>{row(1, top)}{row(-1, top + 250)}</AbsoluteFill>;
};

/** Glowing neon type. */
export const Neon: React.FC<{children: React.ReactNode; color?: string; size?: number; style?: React.CSSProperties}> = ({children, color = CYAN, size = 120, style}) => (
  <div style={{fontFamily: FONT, fontWeight: 900, fontSize: size, letterSpacing: -size / 30, lineHeight: 1, color: '#fff', textShadow: `0 0 8px ${color}, 0 0 24px ${color}, 0 0 60px ${color}, 0 0 110px ${color}`, ...style}}>{children}</div>
);

/** Spaced monospace kicker, typed on. */
export const Kicker: React.FC<{text: string; at?: number; color?: string; style?: React.CSSProperties}> = ({text, at = 0, color = CYAN, style}) => {
  const frame = useCurrentFrame();
  const n = Math.floor(interpolate(frame, [at, at + text.length * 1.2], [0, text.length], clamp));
  return <div style={{fontFamily: MONO, fontSize: 34, letterSpacing: 14, color, textTransform: 'uppercase', textShadow: `0 0 18px ${color}`, ...style}}>{text.slice(0, n)}<span style={{opacity: frame % 16 < 8 && n < text.length ? 1 : 0}}>▍</span></div>;
};

/** The Hub's headline: a segmented bar, a white line, then a line in a highlight box. */
export const Headline: React.FC<{a: string; b: string; step: number; steps: number; color?: string}> = ({a, b, step, steps, color = C.amber}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p1 = spring({frame: frame - 2, fps, config: {damping: 200}, durationInFrames: 14});
  const p2 = spring({frame: frame - 9, fps, config: {damping: 200}, durationInFrames: 14});
  const box = interpolate(frame, [8, 18], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  return (
    <div style={{position: 'absolute', left: 64, right: 64, top: 96, fontFamily: FONT}}>
      <div style={{display: 'flex', gap: 10, marginBottom: 26}}>
        {Array.from({length: steps}, (_, i) => (
          <div key={i} style={{flex: 1, height: 7, borderRadius: 4, background: i < step ? color : i === step ? `rgba(255,255,255,${0.35 + 0.65 * box})` : 'rgba(255,255,255,0.18)', boxShadow: i <= step ? `0 0 12px ${color}` : 'none'}} />
        ))}
      </div>
      <div style={{fontSize: 72, fontWeight: 850, color: '#fff', letterSpacing: -2, lineHeight: 1.05, opacity: p1, transform: `translateX(${(1 - p1) * -60}px)`}}>{a}</div>
      <div style={{marginTop: 10, display: 'inline-block', position: 'relative', opacity: p2, transform: `translateX(${(1 - p2) * -60}px)`}}>
        <div style={{position: 'absolute', inset: '-2px -14px', background: color, borderRadius: 10, transformOrigin: 'left', transform: `scaleX(${box})`, boxShadow: `0 0 30px ${color}88`}} />
        <div style={{position: 'relative', fontSize: 72, fontWeight: 850, color: '#140c00', letterSpacing: -2, lineHeight: 1.05}}>{b}</div>
      </div>
    </div>
  );
};

/** Subtitles that light up word by word (timed by letters, so close to the voice). */
export const WordSubs: React.FC<{text: string; start: number; dur: number}> = ({text, start, dur}) => {
  const frame = useCurrentFrame();
  if (frame < start - 3) return null;
  const words = text.replace(/E A/g, 'EA').replace(/I R S/g, 'IRS').split(' ');
  const total = words.reduce((a, w) => a + w.length + 1, 0);
  let acc = 0;
  const o = interpolate(frame, [start - 3, start + 3], [0, 1], clamp);
  return (
    <div style={{position: 'absolute', left: 56, right: 56, top: 1700, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: o}}>
      <div style={{fontFamily: FONT, fontSize: 46, fontWeight: 700, lineHeight: 1.28, textAlign: 'center', textWrap: 'balance', textShadow: '0 2px 14px rgba(0,0,0,0.8)'} as React.CSSProperties}>
        {words.map((w, i) => {
          const t0 = start + (acc / total) * dur; acc += w.length + 1;
          const on = frame >= t0, now = on && frame < start + (acc / total) * dur;
          return <span key={i} style={{color: now ? C.amber : on ? '#fff' : 'rgba(255,255,255,0.42)'}}>{w} </span>;
        })}
      </div>
    </div>
  );
};

/** A whip-zoom cut: the scene punches in from a blur with a flash. */
export const WhipIn: React.FC<{children: React.ReactNode}> = ({children}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 12], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const flash = interpolate(frame, [0, 2, 10], [0.0, 0.45, 0], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `scale(${1.18 - 0.18 * p})`, filter: `blur(${(1 - p) * 14}px)`, opacity: 0.3 + 0.7 * p}}>{children}</AbsoluteFill>
      <AbsoluteFill style={{background: '#fff', opacity: flash, pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};

/** A diagonal light sweep across whatever it covers. */
export const Sweep: React.FC<{at: number; dur?: number}> = ({at, dur = 26}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + dur], [-0.4, 1.4], clamp);
  if (frame < at || frame > at + dur) return null;
  return <AbsoluteFill style={{background: `linear-gradient(115deg, transparent ${p * 100 - 18}%, rgba(255,255,255,0.32) ${p * 100}%, transparent ${p * 100 + 18}%)`, mixBlendMode: 'screen', pointerEvents: 'none'}} />;
};

/** Gold stars bursting out from a point. */
export const Burst: React.FC<{at: number; x: number; y: number; n?: number; color?: string}> = ({at, x, y, n = 18, color = C.amber}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > 40) return null;
  const p = Easing.out(Easing.cubic)(t / 40);
  return (
    <>
      {Array.from({length: n}, (_, i) => {
        const a = (i / n) * Math.PI * 2 + random(`ba${i}`) * 0.4, r = (120 + random(`br${i}`) * 260) * p, s = 18 + random(`bz${i}`) * 26;
        return <div key={i} style={{position: 'absolute', left: x + Math.cos(a) * r - s / 2, top: y + Math.sin(a) * r - s / 2, fontSize: s, lineHeight: 1, color, opacity: 1 - p, textShadow: `0 0 12px ${color}`, transform: `rotate(${t * 9}deg)`}}>✦</div>;
      })}
    </>
  );
};

/** The study buddy (the app's mascot) in the corner: bobs, and hops on cue. */
export const Buddy: React.FC<{hops?: number[]; enter?: number; x?: number; y?: number; h?: number}> = ({hops = [], enter = 6, x = 812, y = 1330, h = 360}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const inP = spring({frame: frame - enter, fps, config: {damping: 11, mass: 0.7}});
  let hop = 0;
  for (const at of hops) { const t = frame - at; if (t >= 0 && t < 16) hop = Math.max(hop, Math.sin((t / 16) * Math.PI)); }
  const bob = Math.sin(frame / 11) * 6;
  const sq = 1 + hop * 0.06;
  return (
    <div style={{position: 'absolute', left: x, top: y - hop * 60 + bob + (1 - inP) * 420, width: (h * 360) / 464, height: h, transform: `rotate(${Math.sin(frame / 23) * 3 - hop * 6}deg) scale(${1 / sq}, ${sq})`, transformOrigin: 'bottom center', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.6)) drop-shadow(0 0 22px rgba(245,184,74,0.35))'}}>
      <Img src={staticFile('art/buddy-bust.webp')} style={{width: '100%', height: '100%'}} />
    </div>
  );
};

/** A piece of a screenshot lifted out of the phone as a glowing card. */
export type Pop = {at: number; to?: number; src: string; x: number; y: number; w: number; h: number; dx?: number; dy?: number; scale?: number; color?: string};
export const PopCard: React.FC<Pop & {phoneLeft: number; phoneTop: number; k: number}> = ({at, to = 99999, src, x, y, w, h, dx = 120, dy = 0, scale = 1.35, color = C.amber, phoneLeft, phoneTop, k}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 14, mass: 0.8}, durationInFrames: 22});
  const out = interpolate(frame, [to - 8, to], [1, 0], clamp);
  if (frame < at || out <= 0) return null;
  const s = k * (1 + (scale - 1) * p);
  const cx = phoneLeft + (x + w / 2) * k + dx * p, cy = phoneTop + (y + h / 2) * k + dy * p + Math.sin((frame - at) / 14) * 6 * p;
  return (
    <div style={{position: 'absolute', left: cx - (w * s) / 2, top: cy - (h * s) / 2, width: w * s, height: h * s, borderRadius: 26, overflow: 'hidden', opacity: Math.min(1, p * 1.4) * out, border: `4px solid ${color}`, boxShadow: `0 0 0 2px rgba(255,255,255,0.25), 0 0 40px ${color}aa, 0 30px 60px rgba(0,0,0,0.6)`, transform: `perspective(1400px) rotateY(${(1 - p) * -30}deg)`}}>
      <Img src={staticFile(`shots/${src}.png`)} style={{position: 'absolute', left: -x * s, top: -y * s, width: IW * s, maxWidth: 'none'}} />
      <Sweep at={at + 10} />
    </div>
  );
};

/** The phone in 3D: it swings in, settles at a slight angle, drifts, and reflects on the floor. */
export const Phone3D: React.FC<{children: React.ReactNode; left?: number; top?: number; scale?: number; yaw?: number}> = ({children, left = 150, top = 400, scale = 0.86, yaw = -10}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 15, mass: 0.9}, durationInFrames: 26});
  const ry = yaw + (1 - p) * -38 + Math.sin(frame / 50) * 3, rx = 5 + Math.sin(frame / 63) * 2;
  return (
    <div style={{position: 'absolute', left, top, transformOrigin: 'top left', transform: `scale(${scale})`, perspective: 2200}}>
      <div style={{transform: `translateZ(${(1 - p) * -500}px) rotateY(${ry}deg) rotateX(${rx}deg)`, transformStyle: 'preserve-3d', opacity: Math.min(1, p * 1.5), WebkitBoxReflect: 'below 26px linear-gradient(transparent 76%, rgba(255,255,255,0.16))', filter: `drop-shadow(0 0 40px rgba(245,184,74,0.28))`} as React.CSSProperties}>
        <Phone>{children}<Sweep at={8} dur={30} /></Phone>
      </div>
    </div>
  );
};

/** Sound bed for the whole video: music under the voice, faded at the ends. */
export const MusicBed: React.FC<{total: number}> = ({total}) => (
  <Audio src={staticFile('music.mp3')} volume={(f) => 0.16 * interpolate(f, [0, 20, total - 60, total], [0, 1, 1, 0], clamp)} />
);
