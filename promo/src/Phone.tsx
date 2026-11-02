import React from 'react';
import {Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';

// The phone's screen in the video, and the screenshots' size (390 x 844 at 2x).
export const SW = 600, SH = 1298;
export const IW = 780, IH = 1688;
const K = SW / IW;

export const C = {
  ink: '#161c2b', paper: '#ffffff', bg: '#f3f5f9', amber: '#f5b84a', amberDeep: '#d98a1c',
  duskTop: '#1a1840', duskMid: '#33285c', duskLow: '#8a4f72', good: '#2f8f5b', bad: '#c6455a',
};
export const FONT = 'Inter, system-ui, sans-serif';

/** A camera key: centre (x, y) in screenshot pixels and zoom, reached at frame `at`. */
export type Cam = {at: number; x?: number; y?: number; z?: number};
export type Tap = {at: number; x: number; y: number};
export type Box = {from: number; to: number; x: number; y: number; w: number; h: number};

const ease = Easing.bezier(0.45, 0, 0.2, 1);
function camAt(frame: number, cams: Cam[], h: number) {
  const keys = cams.map((c) => ({at: c.at, x: c.x ?? IW / 2, y: c.y ?? IH / 2, z: c.z ?? 1}));
  if (!keys.length) keys.push({at: 0, x: IW / 2, y: IH / 2, z: 1});
  let c = keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1], b = keys[i];
    if (frame >= b.at) c = b;
    else if (frame > a.at) {
      const p = interpolate(frame, [Math.max(a.at, b.at - 36), b.at], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
      c = {at: frame, x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p, z: a.z + (b.z - a.z) * p};
      break;
    }
  }
  const hw = IW / 2 / c.z, hh = IH / 2 / c.z; // keep the screen filled
  return {x: Math.min(Math.max(c.x, hw), IW - hw), y: Math.min(Math.max(c.y, hh), h - hh), z: c.z};
}

/** One screenshot on the phone's screen, with camera moves, taps and highlight boxes. */
export const Shot: React.FC<{src: string; h?: number; cams?: Cam[]; taps?: Tap[]; boxes?: Box[]; dim?: number}> = ({src, h = IH, cams = [], taps = [], boxes = [], dim = 0}) => {
  const frame = useCurrentFrame();
  const c = camAt(frame, cams, h);
  const s = K * c.z;
  const left = SW / 2 - c.x * s, top = SH / 2 - c.y * s;
  const toScreen = (x: number, y: number) => ({x: left + x * s, y: top + y * s});
  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: C.bg}}>
      <Img src={staticFile(`shots/${src}.png`)} style={{position: 'absolute', left, top, width: IW * s, height: h * s}} />
      {dim > 0 && <div style={{position: 'absolute', inset: 0, background: `rgba(10,12,30,${dim})`}} />}
      {boxes.map((b, i) => {
        const o = interpolate(frame, [b.from, b.from + 8, b.to - 6, b.to], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        if (o <= 0) return null;
        const p = toScreen(b.x, b.y);
        return <div key={i} style={{position: 'absolute', left: p.x - 6, top: p.y - 6, width: b.w * s + 12, height: b.h * s + 12, borderRadius: 18, border: `5px solid ${C.amber}`, boxShadow: `0 0 0 9999px rgba(10,12,30,${0.35 * o}), 0 0 30px ${C.amber}`, opacity: o}} />;
      })}
      {taps.map((t, i) => <TapRing key={i} at={t.at} {...toScreen(t.x, t.y)} />)}
    </div>
  );
};

/** A finger tap: a dot that presses in and a ring that spreads. */
export const TapRing: React.FC<{at: number; x: number; y: number}> = ({at, x, y}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < -10 || t > 26) return null;
  const dot = interpolate(t, [-10, 0, 8, 26], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const press = interpolate(t, [-4, 0, 6], [1, 0.8, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const ring = interpolate(t, [0, 22], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <>
      <div style={{position: 'absolute', left: x - 34, top: y - 34, width: 68, height: 68, borderRadius: 34, background: 'rgba(22,28,43,0.42)', border: '4px solid #fff', boxShadow: '0 4px 14px rgba(0,0,0,0.35)', opacity: dot, transform: `scale(${press})`}} />
      {t >= 0 && <div style={{position: 'absolute', left: x - 34, top: y - 34, width: 68, height: 68, borderRadius: 34, border: `4px solid ${C.amber}`, opacity: 1 - ring, transform: `scale(${1 + ring * 1.6})`}} />}
    </>
  );
};

/** The phone body. Children fill the screen. */
export const Phone: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{position: 'relative', width: SW + 28, height: SH + 28, borderRadius: 86, background: '#07070f', padding: 14, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6), inset 0 0 0 2px #2a2a3a', ...style}}>
    <div style={{position: 'relative', width: SW, height: SH, borderRadius: 72, overflow: 'hidden', background: C.bg}}>{children}</div>
  </div>
);

/** Fades children in from frame `at`. */
export const FadeIn: React.FC<{at: number; dur?: number; children: React.ReactNode; rise?: number}> = ({at, dur = 10, rise = 0, children}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{position: 'absolute', inset: 0, opacity: o, transform: `translateY(${(1 - o) * rise}px)`}}>{children}</div>;
};
