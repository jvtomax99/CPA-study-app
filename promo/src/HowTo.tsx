import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, FadeIn, Phone, Shot} from './Phone';
import {ChromeSteps, HomeScreen, SafariSteps} from './Mocks';
import {SCENES, Scene, TOTAL} from './timeline';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Inter, from public/fonts (OFL), loaded before the first frame.
const fontHandle = delayRender('Inter');
new FontFace('Inter', `url(${staticFile('fonts/inter-latin-var.woff2')})`, {weight: '100 900'})
  .load()
  .then((f) => { document.fonts.add(f); continueRender(fontHandle); })
  .catch(() => continueRender(fontHandle));

/** Line i's start in the scene, plus `sec` seconds. */
const at = (s: Scene, i: number, sec = 0) => s.lines[i].start + Math.round(sec * 30);
const end = (s: Scene, i: number, sec = 0) => s.lines[i].start + s.lines[i].dur + Math.round(sec * 30);

const PhoneStage: React.FC<{children: React.ReactNode}> = ({children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame, fps, config: {damping: 200}, durationInFrames: 14});
  return <div style={{position: 'absolute', left: 226, top: 250, opacity: p, transform: `translateY(${(1 - p) * 30}px)`}}><Phone>{children}</Phone></div>;
};

const Card: React.FC<{at: number; title: string; body?: string; accent?: string}> = ({at: a, title, body, accent = C.amber}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - a, fps, config: {damping: 200}, durationInFrames: 16});
  if (frame < a) return null;
  return (
    <div style={{background: 'rgba(255,255,255,0.97)', borderRadius: 34, padding: '34px 40px', borderLeft: `14px solid ${accent}`, opacity: p, transform: `translateY(${(1 - p) * 40}px)`, boxShadow: '0 24px 50px -20px rgba(0,0,0,0.5)'}}>
      <div style={{fontSize: 50, fontWeight: 800, color: C.ink, letterSpacing: -1, lineHeight: 1.15}}>{title}</div>
      {body && <div style={{fontSize: 36, color: '#4a5266', marginTop: 12, lineHeight: 1.35}}>{body}</div>}
    </div>
  );
};

/** A dark callout over the phone's screen (inside the phone). */
const Callout: React.FC<{from: number; to?: number; children: React.ReactNode; top?: number}> = ({from, to = 99999, children, top = 360}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [from, from + 10, to - 8, to], [0, 1, 1, 0], clamp);
  if (o <= 0) return null;
  return (
    <div style={{position: 'absolute', inset: 0, background: `rgba(10,12,30,${0.55 * o})`}}>
      <div style={{position: 'absolute', left: 30, right: 30, top, opacity: o, transform: `translateY(${(1 - o) * 30}px)`, fontFamily: FONT}}>{children}</div>
    </div>
  );
};
const Pill: React.FC<{children: React.ReactNode; bg?: string; color?: string}> = ({children, bg = '#fff', color = C.ink}) => (
  <div style={{background: bg, color, borderRadius: 26, padding: '22px 26px', fontSize: 32, fontWeight: 700, lineHeight: 1.25, textAlign: 'center'}}>{children}</div>
);

function Visual({s}: {s: Scene}) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  switch (s.id) {
    case 'intro': {
      const p = spring({frame: frame - 4, fps, config: {damping: 14, mass: 0.8}});
      const q = interpolate(frame, [18, 32], [0, 1], clamp);
      return (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 50}}>
          <Img src={staticFile('icons/icon-512.png')} style={{width: 360, height: 360, borderRadius: 80, transform: `scale(${p})`, boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6)'}} />
          <div style={{textAlign: 'center', opacity: q, transform: `translateY(${(1 - q) * 30}px)`}}>
            <div style={{fontSize: 96, fontWeight: 800, color: '#fff', letterSpacing: -3}}>EA Ledger Drill</div>
            <div style={{fontSize: 56, fontWeight: 600, color: C.amber, marginTop: 14}}>How to use it</div>
          </div>
        </AbsoluteFill>
      );
    }
    case 'why': {
      const p = spring({frame, fps, config: {damping: 200}});
      const bob = Math.sin(frame / 12) * 6;
      return (
        <AbsoluteFill style={{padding: '230px 70px 0'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 40, opacity: p}}>
            <div style={{position: 'relative', transform: `translateY(${bob}px)`}}>
              <Img src={staticFile('icons/icon-512.png')} style={{width: 220, height: 220, borderRadius: 50, boxShadow: `0 0 60px ${C.amber}`}} />
            </div>
            <div style={{fontSize: 78, fontWeight: 800, color: '#fff', letterSpacing: -2, lineHeight: 1.05}}>Add it to your <span style={{color: C.amber}}>Home Screen</span> first</div>
          </div>
          <div style={{display: 'grid', gap: 34, marginTop: 70}}>
            <Card at={at(s, 1)} title="Your progress lives on this phone" body="No account, no cloud copy." />
            <Card at={at(s, 2)} title="Safari can erase it" body="A website's saved data can be cleared after 7 days without a visit." accent={C.bad} />
            <Card at={at(s, 2, 4.6)} title="A Home Screen app keeps it" body="It has its own storage, so your progress stays put." accent={C.good} />
          </div>
        </AbsoluteFill>
      );
    }
    case 'ios':
      return <PhoneStage><SafariSteps dots={at(s, 1, 1.2)} share={end(s, 1, -0.3)} sheet={end(s, 1)} addRow={at(s, 2, 1.0)} form={at(s, 3, -0.2)} add={end(s, 3, -0.5)} /></PhoneStage>;
    case 'android':
      return <PhoneStage><ChromeSteps dots={at(s, 0, 2.0)} pick={at(s, 0, 3.9)} dialog={at(s, 0, 4.5)} install={end(s, 0, 0.1)} /></PhoneStage>;
    case 'icon':
      return (
        <PhoneStage>
          <HomeScreen tap={at(s, 0, 1.6)} glowFrom={0} />
          <Callout from={at(s, 1)} to={at(s, 2)}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18}}>
              <Pill>Safari<div style={{fontSize: 24, fontWeight: 500, color: '#666', marginTop: 8}}>its own progress</div></Pill>
              <Pill>Home Screen app<div style={{fontSize: 24, fontWeight: 500, color: '#666', marginTop: 8}}>its own progress</div></Pill>
            </div>
            <div style={{marginTop: 24}}><Pill bg={C.amber}>Study in one place</Pill></div>
          </Callout>
          <Callout from={at(s, 2)}>
            <div style={{display: 'grid', gap: 18}}>
              <Pill>In Safari: More › Save backup file</Pill>
              <div style={{textAlign: 'center', fontSize: 60, color: C.amber, lineHeight: 1}}>↓</div>
              <Pill>In the app: More › Load backup file</Pill>
            </div>
          </Callout>
        </PhoneStage>
      );
    case 'home':
      return (
        <PhoneStage>
          <Shot src="home" cams={[{at: 0}, {at: at(s, 0, 0.8), x: 260, y: 330, z: 1.5}, {at: at(s, 1), x: 390, y: 680, z: 1.3}, {at: end(s, 1, -0.6), x: 390, y: 780, z: 1.2}]}
            boxes={[{from: at(s, 0, 1.2), to: at(s, 1), x: 44, y: 190, w: 320, h: 210}, {from: at(s, 1, 0.2), to: at(s, 1, 2.3), x: 48, y: 590, w: 440, h: 180}, {from: at(s, 1, 2.4), to: s.dur, x: 48, y: 782, w: 684, h: 112}]}
            taps={[{at: end(s, 1, -0.4), x: 350, y: 838}]} />
        </PhoneStage>
      );
    case 'towers':
      return (
        <PhoneStage>
          <Shot src="home" cams={[{at: 0, x: 390, y: 900, z: 1.1}, {at: 30, x: 380, y: 1150, z: 1.6}]} taps={[{at: at(s, 1, -0.2), x: 234, y: 1164}]} />
          <FadeIn at={at(s, 1, 0.3)}><Shot src="area-sheet" boxes={[{from: at(s, 1, 0.9), to: s.dur, x: 34, y: 1250, w: 712, h: 420}]} /></FadeIn>
        </PhoneStage>
      );
    case 'views':
      return (
        <PhoneStage>
          <Shot src="home" taps={[{at: 12, x: 480, y: 946}]} />
          <FadeIn at={22}><Shot src="home-ts" cams={[{at: 22, x: 390, y: 1000, z: 1.0}, {at: 60, x: 390, y: 1150, z: 1.35}]} taps={[{at: at(s, 0, 2.6), x: 319, y: 946}]} /></FadeIn>
          <FadeIn at={at(s, 0, 3.0)}><Shot src="town-3d" cams={[{at: at(s, 0, 3.0), z: 1}, {at: at(s, 0, 3.4), z: 1.12, x: 420}]} /></FadeIn>
        </PhoneStage>
      );
    case 'drill':
      return (
        <PhoneStage>
          <Shot src="home" taps={[{at: 6, x: 248, y: 1627}]} />
          <FadeIn at={16}><Shot src="drill-q" taps={[{at: at(s, 0, 1.9), x: 380, y: 812}]} /></FadeIn>
          <FadeIn at={at(s, 0, 2.2)}><Shot src="drill-wrong-full" h={2672} cams={[{at: 0, y: 844}, {at: at(s, 0, 3.6), y: 1820}]} /></FadeIn>
        </PhoneStage>
      );
    case 'spacing': {
      const steps = ['1 day', '3 days', '1 week', '16 days', '35 days'];
      const w = at(s, 0), r = at(s, 0, 2.6);
      return (
        <PhoneStage>
          <Shot src="drill-right" dim={0.15} />
          <Callout from={w} top={300}>
            <div style={{display: 'grid', gap: 22}}>
              <Pill bg="#fbe9ec" color={C.bad}>Wrong: back in 5 minutes</Pill>
              {frame >= r && <Pill bg="#e3f3ea" color={C.good}>Right: it waits longer each time</Pill>}
              <div style={{display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center'}}>
                {steps.map((x, i) => {
                  const o = interpolate(frame, [r + 12 + i * 9, r + 20 + i * 9], [0, 1], clamp);
                  return <div key={x} style={{opacity: o, transform: `scale(${0.8 + 0.2 * o})`, background: C.amber, color: '#2b1a03', borderRadius: 20, padding: '14px 20px', fontSize: 30, fontWeight: 800}}>{x}</div>;
                })}
              </div>
            </div>
          </Callout>
        </PhoneStage>
      );
    }
    case 'flag':
      return (
        <PhoneStage>
          <Shot src="drill-flag" h={2940} cams={[{at: 0, y: 1500}, {at: 8, y: 2096}]} boxes={[{from: at(s, 0, 0.6), to: s.dur, x: 36, y: 2040, w: 708, h: 380}]} />
        </PhoneStage>
      );
    case 'exam':
      return (
        <PhoneStage>
          <Shot src="exam-setup" taps={[{at: at(s, 0, 0.6), x: 206, y: 1004}]} boxes={[{from: at(s, 0, 1.4), to: at(s, 0, 3.6), x: 34, y: 560, w: 712, h: 260}]} />
          <FadeIn at={at(s, 0, 3.7)}><Shot src="exam-q" taps={[{at: at(s, 1, -0.2), x: 166, y: 340}]} /></FadeIn>
          <FadeIn at={at(s, 1, 0.2)}><Shot src="exam-leave" boxes={[{from: at(s, 1, 0.4), to: at(s, 1, 2.2), x: 22, y: 432, w: 736, h: 316}]} taps={[{at: at(s, 1, 2.2), x: 196, y: 672}]} /></FadeIn>
          <FadeIn at={at(s, 1, 2.5)}><Shot src="exam-break" boxes={[{from: at(s, 1, 2.9), to: s.dur, x: 22, y: 180, w: 736, h: 530}]} /></FadeIn>
        </PhoneStage>
      );
    case 'results':
      return (
        <PhoneStage>
          <Shot src="exam-results" cams={[{at: 0, y: 844}, {at: at(s, 0, 1.4), y: 1000, z: 1.0}]} boxes={[{from: at(s, 0, 1.6), to: s.dur, x: 22, y: 780, w: 736, h: 760}]} />
        </PhoneStage>
      );
    case 'more':
      return (
        <PhoneStage>
          <Shot src="more-full" h={3982} cams={[{at: 0, y: 900}, {at: at(s, 0, 3.6), y: 900}, {at: at(s, 0, 4.4), y: 2391}]}
            boxes={[{from: at(s, 0, 1.0), to: at(s, 0, 2.2), x: 20, y: 655, w: 740, h: 350}, {from: at(s, 0, 2.2), to: at(s, 0, 3.6), x: 20, y: 1014, w: 740, h: 728}, {from: at(s, 0, 4.4), to: s.dur, x: 20, y: 2007, w: 740, h: 768}]} />
        </PhoneStage>
      );
    case 'outro': {
      const p = spring({frame, fps, config: {damping: 200}});
      const q = interpolate(frame, [at(s, 0, 2.6), at(s, 0, 3.0)], [0, 1], clamp);
      return (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 40, padding: 70}}>
          <Img src={staticFile('icons/icon-512.png')} style={{width: 260, height: 260, borderRadius: 60, opacity: p, boxShadow: `0 0 ${40 + 20 * Math.sin(frame / 8)}px ${C.amber}`}} />
          <div style={{textAlign: 'center', opacity: p}}>
            <div style={{fontSize: 84, fontWeight: 800, color: '#fff', letterSpacing: -2, lineHeight: 1.1}}>Add it to your <span style={{color: C.amber}}>Home Screen</span>.</div>
            <div style={{fontSize: 60, fontWeight: 700, color: '#fff', marginTop: 24, opacity: q}}>Always open it from there.</div>
          </div>
          <div style={{fontSize: 38, color: 'rgba(255,255,255,0.7)', marginTop: 30, opacity: p}}>jvtomax99.github.io/CPA-study-app</div>
        </AbsoluteFill>
      );
    }
    default:
      return null;
  }
}

const Label: React.FC<{text: string}> = ({text}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 10], [0, 1], clamp);
  if (!text) return null;
  return (
    <div style={{position: 'absolute', top: 110, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: o}}>
      <div style={{background: C.amber, color: '#2b1a03', fontSize: 40, fontWeight: 800, padding: '16px 34px', borderRadius: 40, letterSpacing: -0.5}}>{text}</div>
    </div>
  );
};

const Subtitle: React.FC<{s: Scene}> = ({s}) => {
  const frame = useCurrentFrame();
  const line = [...s.lines].reverse().find((l) => frame >= l.start - 3);
  if (!line) return null;
  const o = interpolate(frame, [line.start - 3, line.start + 4], [0, 1], clamp);
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 1610, height: 270, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{color: '#fff', fontSize: 44, fontWeight: 600, lineHeight: 1.3, textAlign: 'center', opacity: o, textWrap: 'balance', textShadow: '0 2px 12px rgba(0,0,0,0.5)'} as React.CSSProperties}>{line.text.replace(/E A/g, 'EA').replace(/I R S/g, 'IRS')}</div>
    </div>
  );
};

export const HowTo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{fontFamily: FONT, background: `radial-gradient(120% 70% at 50% 0%, ${C.duskMid} 0%, ${C.duskTop} 55%, #0b0a1a 100%)`}}>
      <div style={{position: 'absolute', left: 0, top: 0, height: 8, width: `${(100 * frame) / TOTAL}%`, background: C.amber}} />
      {SCENES.map((s) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.dur} name={s.id}>
          <Visual s={s} />
          <Label text={s.label} />
          <Subtitle s={s} />
          {s.lines.map((l) => (
            <Sequence key={l.file} from={l.start} durationInFrames={l.dur + 2} name={l.file} layout="none">
              <Audio src={staticFile(`voice/${l.file}`)} />
            </Sequence>
          ))}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
