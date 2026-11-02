import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, Sequence, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, FadeIn, IW, SW, Shot} from './Phone';
import {ChromeSteps, HomeScreen, SafariSteps} from './Mocks';
import {Backdrop, Buddy, Burst, CYAN, GhostText, Headline, Kicker, MusicBed, Neon, PINK, Phone3D, Pop, PopCard, Sfx, Sweep, WhipIn, WordSubs, clamp} from './Fx';
import {SCENES, Scene, TOTAL} from './timeline';
import layout from './layout.json';

// Positions measured from the app by tools/capture.cjs, in screenshot pixels: [x, y, w, h].
type R = number[];
const G = layout.greet as Record<string, R>, HM = layout.home as Record<string, R>, MO = layout.more as Record<string, R>;
const mid = (r: R) => ({x: r[0] + r[2] / 2, y: r[1] + r[3] / 2});
const box = (r: R, from: number, to: number, pad = 10) => ({from, to, x: r[0] - pad, y: r[1] - pad, w: r[2] + 2 * pad, h: r[3] + 2 * pad});

// Inter, from public/fonts (OFL), loaded before the first frame.
const fontHandle = delayRender('Inter');
new FontFace('Inter', `url(${staticFile('fonts/inter-latin-var.woff2')})`, {weight: '100 900'})
  .load()
  .then((f) => { document.fonts.add(f); continueRender(fontHandle); })
  .catch(() => continueRender(fontHandle));

/** Line i's start in the scene, plus `sec` seconds; and its end. */
const at = (s: Scene, i: number, sec = 0) => s.lines[i].start + Math.round(sec * 30);
const end = (s: Scene, i: number, sec = 0) => s.lines[i].start + s.lines[i].dur + Math.round(sec * 30);

// Where the phone sits, and the scale from screenshot pixels to video pixels (for floating cards).
const PH = {left: 120, top: 420, scale: 0.86};
const K = (SW / IW) * PH.scale;
const SCREEN = {left: PH.left + 14 * PH.scale, top: PH.top + 14 * PH.scale};

// Headlines, Hub style. The segmented bar counts these scenes.
const HEAD: Record<string, [string, string]> = {
  ios: ['On iPhone,', 'Add to Home Screen.'],
  android: ['On Android,', 'Install the App.'],
  icon: ['Then Always', 'Open It From Here.'],
  home: ['Your Buddy Says Hi.', 'Your Tax City Waits.'],
  towers: ['Every Tower', 'Is an Exam Area.'],
  views: ['Times Square.', 'The Whole City in 3D.'],
  drill: ['Tap Play.', 'Learn Why.'],
  spacing: ['Miss It? 5 Minutes.', 'Nail It? Weeks.'],
  flag: ['Looks Wrong?', 'Flag It.'],
  exam: ['100 Questions.', '3.5 Hours. 3 Sections.'],
  results: ['Your Score,', 'Area by Area.'],
  more: ['Goal. Reminder.', 'Backup.'],
};
const ORDER = Object.keys(HEAD);

/** A phone scene: city behind, headline, phone in 3D with its screen, floating cards, the buddy. */
const PhoneScene: React.FC<{s: Scene; bg?: string; ghost?: string; pops?: Pop[]; hops?: number[]; children: React.ReactNode; color?: string}> = ({s, bg, ghost, pops = [], hops = [], children, color}) => {
  const [a, b] = HEAD[s.id];
  return (
    <AbsoluteFill>
      <Backdrop src={bg} />
      {ghost && <GhostText text={ghost} top={760} />}
      <Phone3D left={PH.left} top={PH.top} scale={PH.scale}>{children}</Phone3D>
      {pops.map((p, i) => (
        <React.Fragment key={i}>
          <PopCard {...p} phoneLeft={SCREEN.left} phoneTop={SCREEN.top} k={K} />
          <Sfx at={p.at} name="pop" volume={0.45} />
        </React.Fragment>
      ))}
      <Buddy hops={[...hops, ...pops.map((p) => p.at)]} />
      <Headline a={a} b={b} step={ORDER.indexOf(s.id)} steps={ORDER.length} color={color} />
    </AbsoluteFill>
  );
};

/** The opening: tax symbols spiral in, lock into a ring around A = L + E, and collapse into the icon. */
const Intro: React.FC<{s: Scene}> = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const glyphs = ['$', '%', 'W-2', '1040', '+', '÷', '∑', '7', '=', '¢', '1099', '±'];
  const cx = 540, cy = 760;
  const collapse = interpolate(frame, [40, 54], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const icon = spring({frame: frame - 52, fps, config: {damping: 10, mass: 0.7}});
  const title = spring({frame: frame - 64, fps, config: {damping: 200}});
  const flash = interpolate(frame, [52, 54, 66], [0, 0.85, 0], clamp);
  return (
    <AbsoluteFill>
      <Backdrop src="home-ts" bright={0.4} />
      <GhostText text="EA Ledger Drill" top={380} speed={1.6} />
      {glyphs.map((g, i) => {
        const a0 = (i / glyphs.length) * Math.PI * 2;
        const inP = interpolate(frame, [i * 1.5, 26 + i * 1.5], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        const r = (900 - 680 * inP) * (1 - collapse), a = a0 + frame / 22 + (1 - inP) * 2;
        if (collapse >= 1) return null;
        return <div key={g} style={{position: 'absolute', left: cx + Math.cos(a) * r, top: cy + Math.sin(a) * r * 0.85, transform: 'translate(-50%,-50%)', fontFamily: FONT, fontWeight: 900, fontSize: 64, color: '#fff', opacity: inP, textShadow: `0 0 18px ${i % 2 ? CYAN : C.amber}, 0 0 40px ${i % 2 ? CYAN : C.amber}`}}>{g}</div>;
      })}
      {collapse < 1 && <div style={{position: 'absolute', left: cx, top: cy, transform: `translate(-50%,-50%) scale(${1 - collapse})`, opacity: interpolate(frame, [18, 28], [0, 1], clamp), whiteSpace: 'nowrap'}}><Neon color={C.amber} size={84}>A = L + E</Neon></div>}
      <div style={{position: 'absolute', left: cx - 190, top: cy - 190, width: 380, height: 380, transform: `scale(${icon})`, WebkitBoxReflect: 'below 30px linear-gradient(transparent 70%, rgba(255,255,255,0.18))'} as React.CSSProperties}>
        <Img src={staticFile('icons/icon-512.png')} style={{width: 380, height: 380, borderRadius: 86, boxShadow: `0 0 80px ${C.amber}, 0 40px 80px rgba(0,0,0,0.6)`}} />
        <AbsoluteFill style={{borderRadius: 86, overflow: 'hidden'}}><Sweep at={70} dur={30} /></AbsoluteFill>
      </div>
      <Burst at={53} x={cx} y={cy} n={22} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 1240, textAlign: 'center', opacity: title, transform: `translateY(${(1 - title) * 40}px)`}}>
        <Neon color={C.amber} size={104}>EA Ledger Drill</Neon>
        <Kicker text="How to use it" at={74} style={{marginTop: 34}} />
      </div>
      <AbsoluteFill style={{background: '#fff', opacity: flash}} />
      <Sfx at={2} name="whoosh" volume={0.5} />
      <Sfx at={52} name="hit" volume={0.6} />
      <Sfx at={56} name="chime" volume={0.35} />
    </AbsoluteFill>
  );
};

/** The hook: why the Home Screen matters, as neon type, a countdown and a strike. */
const Hook: React.FC<{s: Scene}> = ({s}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const l1 = at(s, 1), l2 = at(s, 2), keep = at(s, 2, 4.6);
  const count = Math.max(0, 7 - Math.floor(interpolate(frame, [l2 + 20, l2 + 95], [0, 7.99], clamp)));
  const strike = interpolate(frame, [l2 + 100, l2 + 108], [0, 1], clamp);
  const pop = (f: number) => spring({frame: frame - f, fps, config: {damping: 12, mass: 0.6}});
  const phase = frame < l1 ? 0 : frame < l2 ? 1 : frame < keep ? 2 : 3;
  const shake = phase === 2 && frame > l2 + 100 && frame < l2 + 112 ? Math.sin(frame * 3) * 10 : 0;
  return (
    <AbsoluteFill style={{transform: `translateX(${shake}px)`}}>
      <Backdrop src="town-3d" bright={phase === 2 ? 0.3 : 0.45} />
      <GhostText text={phase === 2 ? '7 days' : 'Home Screen'} top={300} color={phase === 2 ? 'rgba(255,79,123,0.1)' : 'rgba(255,255,255,0.07)'} />
      {phase === 0 && (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 40, paddingBottom: 300}}>
          <Kicker text="The most important step" at={4} />
          <div style={{transform: `scale(${pop(20)})`}}><Neon color={C.amber} size={150}>Home</Neon></div>
          <div style={{transform: `scale(${pop(30)})`}}><Neon color={C.amber} size={150}>Screen.</Neon></div>
        </AbsoluteFill>
      )}
      {phase === 1 && (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 30, paddingBottom: 300}}>
          <Kicker text="Your progress lives" at={l1} />
          <div style={{transform: `scale(${pop(l1 + 14)})`}}><Neon color={CYAN} size={130}>On This Phone.</Neon></div>
          <div style={{opacity: interpolate(frame, [l1 + 40, l1 + 50], [0, 1], clamp)}}><Neon color={CYAN} size={70} style={{opacity: 0.85}}>No account. No cloud.</Neon></div>
        </AbsoluteFill>
      )}
      {phase === 2 && (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 20, paddingBottom: 300}}>
          <Kicker text="Safari can erase it in" at={l2} color={PINK} />
          <div style={{position: 'relative'}}>
            <Neon color={PINK} size={300}>{count}</Neon>
            <div style={{position: 'absolute', left: -60, right: -60, top: '48%', height: 22, background: PINK, borderRadius: 11, boxShadow: `0 0 30px ${PINK}`, transformOrigin: 'left', transform: `scaleX(${strike}) rotate(-8deg)`}} />
          </div>
          <Neon color={PINK} size={90}>{count === 1 ? 'Day' : 'Days'}</Neon>
          {strike > 0.5 && <div style={{marginTop: 30, transform: `scale(${pop(l2 + 106)}) rotate(-3deg)`, background: PINK, color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 56, padding: '18px 40px', borderRadius: 40, boxShadow: `0 0 40px ${PINK}`}}>Progress Erased.</div>}
        </AbsoluteFill>
      )}
      {phase === 3 && (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', gap: 40, paddingBottom: 300}}>
          <Kicker text="Unless it's on your" at={keep} color="#7dffb0" />
          <div style={{width: 300, height: 300, transform: `scale(${pop(keep + 8)})`}}>
            <Img src={staticFile('icons/icon-512.png')} style={{width: 300, height: 300, borderRadius: 68, boxShadow: '0 0 70px #3ddc84'}} />
          </div>
          <div style={{transform: `scale(${pop(keep + 16)})`}}><Neon color="#3ddc84" size={130}>Home Screen.</Neon></div>
          <Burst at={keep + 8} x={540} y={760} color="#7dffb0" />
        </AbsoluteFill>
      )}
      {/* sounds live outside the phases so each plays through */}
      <Sfx at={20} name="hit" volume={0.45} />
      <Sfx at={l1 + 14} name="pop" volume={0.5} />
      {Array.from({length: 8}, (_, i) => <Sfx key={i} at={l2 + 20 + Math.round((i * 75) / 7.99)} name="tick" volume={0.5} />)}
      <Sfx at={l2 + 100} name="buzz" volume={0.5} />
      <Sfx at={keep + 8} name="chime" volume={0.4} />
    </AbsoluteFill>
  );
};

/** The close: the icon over the city, the rule one more time, the address. */
const Outro: React.FC<{s: Scene}> = ({s}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - 4, fps, config: {damping: 11, mass: 0.7}});
  const l2 = spring({frame: frame - at(s, 0, 2.6), fps, config: {damping: 200}});
  return (
    <AbsoluteFill>
      <Backdrop src="home-ts" bright={0.6} />
      <GhostText text="Home Screen" top={250} />
      <div style={{position: 'absolute', left: 540 - 160, top: 300, width: 320, height: 320, transform: `scale(${p})`, WebkitBoxReflect: 'below 26px linear-gradient(transparent 70%, rgba(255,255,255,0.2))'} as React.CSSProperties}>
        <Img src={staticFile('icons/icon-512.png')} style={{width: 320, height: 320, borderRadius: 72, boxShadow: `0 0 ${60 + 25 * Math.sin(frame / 8)}px ${C.amber}`}} />
      </div>
      <Burst at={6} x={540} y={460} n={24} />
      <div style={{position: 'absolute', left: 70, right: 70, top: 1000, textAlign: 'center'}}>
        <Neon color={C.amber} size={96} style={{opacity: p}}>Add It to Your Home Screen.</Neon>
        <div style={{marginTop: 40, display: 'inline-block', background: C.amber, color: '#140c00', fontFamily: FONT, fontWeight: 900, fontSize: 64, padding: '12px 30px', borderRadius: 14, opacity: l2, transform: `translateY(${(1 - l2) * 30}px)`, boxShadow: `0 0 40px ${C.amber}88`}}>Always Open It There.</div>
        <div style={{marginTop: 50, opacity: l2}}><span style={{fontFamily: '"DejaVu Sans Mono", monospace', fontSize: 36, color: '#fff', background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.3)', padding: '12px 26px', borderRadius: 40}}>jvtomax99.github.io/CPA-study-app</span></div>
      </div>
      <Buddy enter={at(s, 0, 3.4)} hops={[at(s, 0, 4.2)]} x={850} y={1450} h={250} />
      <Sfx at={4} name="hit" volume={0.5} />
      <Sfx at={6} name="chime" volume={0.4} />
    </AbsoluteFill>
  );
};

function Visual({s}: {s: Scene}) {
  switch (s.id) {
    case 'intro':
      return <Intro s={s} />;
    case 'why':
      return <Hook s={s} />;
    case 'outro':
      return <Outro s={s} />;
    case 'ios':
      return (
        <PhoneScene s={s} ghost="Share" hops={[at(s, 1, 1.2), end(s, 1, -0.3), at(s, 2, 1.0), end(s, 3, -0.5)]}>
          <SafariSteps dots={at(s, 1, 1.2)} share={end(s, 1, -0.3)} sheet={end(s, 1)} addRow={at(s, 2, 1.0)} form={at(s, 3, -0.2)} add={end(s, 3, -0.5)} />
        </PhoneScene>
      );
    case 'android':
      return (
        <PhoneScene s={s} ghost="Install" hops={[at(s, 0, 2.0), at(s, 0, 3.9), end(s, 0, 0.1)]} color={CYAN}>
          <ChromeSteps dots={at(s, 0, 2.0)} pick={at(s, 0, 3.9)} dialog={at(s, 0, 4.5)} install={end(s, 0, 0.1)} />
        </PhoneScene>
      );
    case 'icon':
      return (
        <PhoneScene s={s} ghost="EA Drill" hops={[at(s, 0, 1.6)]}>
          <HomeScreen tap={at(s, 0, 1.6)} glowFrom={0} />
          <IconCallouts s={s} />
        </PhoneScene>
      );
    case 'home':
      return (
        <PhoneScene s={s} ghost="Hello Alex" hops={[at(s, 0, 1.0), end(s, 0, -0.6), end(s, 2, -0.4)]}
          pops={[{at: at(s, 1, 1.4), to: at(s, 2), src: 'home', x: HM.ready[0], y: HM.ready[1], w: 330, h: HM.ready[3], dx: 330, dy: -20, scale: 1.7},
                 {at: at(s, 2, 0.3), to: s.dur, src: 'home', x: HM.pills[0], y: HM.pills[1], w: 440, h: HM.pills[3], dx: 260, dy: -60, scale: 1.5}]}>
          <Shot src="greet" boxes={[box(G.face, at(s, 0, 0.6), end(s, 0, -1.0))]} taps={[{at: end(s, 0, -0.6), ...mid(G.play)}]} />
          <FadeIn at={at(s, 1, -0.2)}><Shot src="home" cams={[{at: 0}, {at: at(s, 1, 0.8), x: 260, y: mid(HM.ready).y + 40, z: 1.5}, {at: at(s, 2), x: 390, y: mid(HM.pills).y + 80, z: 1.3}, {at: end(s, 2, -0.6), x: 390, y: mid(HM.tabs).y, z: 1.2}]}
            boxes={[box(HM.tabs, at(s, 2, 2.4), s.dur, 6)]} taps={[{at: end(s, 2, -0.4), ...mid(HM.part2)}]} /></FadeIn>
        </PhoneScene>
      );
    case 'towers':
      return (
        <PhoneScene s={s} bg="home-ts" ghost="13 towers" hops={[at(s, 1, -0.2)]}
          pops={[{at: at(s, 1, 1.0), to: s.dur, src: 'area-sheet', x: 34, y: 1258, w: 712, h: 146, dx: 200, dy: -260, scale: 1.45}]}>
          <Shot src="home" cams={[{at: 0, x: 390, y: 900, z: 1.1}, {at: 30, x: 380, y: mid(HM.deductions).y, z: 1.6}]} taps={[{at: at(s, 1, -0.2), ...mid(HM.deductions)}]} />
          <FadeIn at={at(s, 1, 0.3)}><Shot src="area-sheet" /></FadeIn>
        </PhoneScene>
      );
    case 'views':
      return (
        <PhoneScene s={s} bg="home-ts" ghost="Times Square" hops={[12, at(s, 0, 2.6)]} color={CYAN}>
          <Shot src="home" taps={[{at: 12, ...mid(HM.ts)}]} />
          <FadeIn at={22}><Shot src="home-ts" cams={[{at: 22, x: 390, y: 1000, z: 1.0}, {at: 60, x: 390, y: 1150, z: 1.35}]} taps={[{at: at(s, 0, 2.6), ...mid(HM.fs)}]} /></FadeIn>
          <FadeIn at={at(s, 0, 3.0)}><Shot src="town-3d" cams={[{at: at(s, 0, 3.0), z: 1}, {at: at(s, 0, 3.4), z: 1.12, x: 420}]} /></FadeIn>
        </PhoneScene>
      );
    case 'drill':
      return (
        <PhoneScene s={s} ghost="Play" hops={[6, at(s, 0, 1.9)]}>
          <Shot src="home" taps={[{at: 6, ...mid(HM.play)}]} />
          <FadeIn at={16}><Shot src="drill-q" taps={[{at: at(s, 0, 1.9), x: 380, y: 812}]} /></FadeIn>
          <FadeIn at={at(s, 0, 2.2)}><Shot src="drill-wrong-full" h={2672} cams={[{at: 0, y: 844}, {at: at(s, 0, 3.6), y: 1820}]} /></FadeIn>
          <Sfx at={at(s, 0, 2.0)} name="buzz" volume={0.3} />
        </PhoneScene>
      );
    case 'spacing':
      return (
        <PhoneScene s={s} ghost="5 min · 1 day · 35 days" color={CYAN}>
          <Shot src="drill-right" dim={0.15} />
          <SpacingCallout s={s} />
        </PhoneScene>
      );
    case 'flag':
      return (
        <PhoneScene s={s} ghost="Flag" color={PINK}>
          <Shot src="drill-flag" h={2940} cams={[{at: 0, y: 1500}, {at: 8, y: 2096}]} boxes={[{from: at(s, 0, 0.6), to: s.dur, x: 36, y: 2040, w: 708, h: 380}]} />
        </PhoneScene>
      );
    case 'exam':
      return (
        <PhoneScene s={s} ghost="3:30:00" hops={[at(s, 0, 0.6), at(s, 1, -0.2), at(s, 1, 2.2)]}
          pops={[{at: at(s, 0, 4.2), to: at(s, 1, 0.1), src: 'exam-q', x: 24, y: 176, w: 330, h: 110, dx: 380, dy: 40, scale: 2.0}]}>
          <Shot src="exam-setup" taps={[{at: at(s, 0, 0.6), x: 206, y: 1004}]} boxes={[{from: at(s, 0, 1.4), to: at(s, 0, 3.6), x: 34, y: 560, w: 712, h: 260}]} />
          <FadeIn at={at(s, 0, 3.7)}><Shot src="exam-q" taps={[{at: at(s, 1, -0.2), x: 166, y: 340}]} /></FadeIn>
          <FadeIn at={at(s, 1, 0.2)}><Shot src="exam-leave" boxes={[{from: at(s, 1, 0.4), to: at(s, 1, 2.2), x: 22, y: 432, w: 736, h: 316}]} taps={[{at: at(s, 1, 2.2), x: 196, y: 672}]} /></FadeIn>
          <FadeIn at={at(s, 1, 2.5)}><Shot src="exam-break" boxes={[{from: at(s, 1, 2.9), to: s.dur, x: 22, y: 180, w: 736, h: 530}]} /></FadeIn>
        </PhoneScene>
      );
    case 'results':
      return (
        <PhoneScene s={s} ghost="72%" color={CYAN}
          pops={[{at: at(s, 0, 0.4), to: s.dur, src: 'exam-results', x: 34, y: 280, w: 712, h: 300, dx: 160, dy: -120, scale: 1.3, color: CYAN}]}>
          <Shot src="exam-results" cams={[{at: 0, y: 844}, {at: at(s, 0, 1.4), y: 1000, z: 1.0}]} boxes={[{from: at(s, 0, 1.6), to: s.dur, x: 22, y: 780, w: 736, h: 760}]} />
          <Sfx at={at(s, 0, 0.4)} name="chime" volume={0.3} />
        </PhoneScene>
      );
    case 'more':
      return (
        <PhoneScene s={s} ghost="Backup" hops={[at(s, 0, 4.4)]}>
          <Shot src="more-full" h={layout.moreH} cams={[{at: 0, y: mid(MO["Daily goal"]).y + 300}, {at: at(s, 0, 3.6), y: mid(MO["Daily goal"]).y + 300}, {at: at(s, 0, 4.4), y: mid(MO.Backup).y}]}
            boxes={[box(MO["Daily goal"], at(s, 0, 1.0), at(s, 0, 2.2)), box(MO["Daily reminder"], at(s, 0, 2.2), at(s, 0, 3.6)), box(MO.Backup, at(s, 0, 4.4), s.dur)]} />
        </PhoneScene>
      );
    default:
      return null;
  }
}

/** Over the Home Screen: Safari and the app keep separate progress; move it with a backup. */
const IconCallouts: React.FC<{s: Scene}> = ({s}) => {
  const frame = useCurrentFrame();
  const show = (from: number, to: number) => interpolate(frame, [from, from + 10, to - 8, to], [0, 1, 1, 0], clamp);
  const a = show(at(s, 1), at(s, 2)), b = show(at(s, 2), 99999);
  const pill = (t: string, bg = '#fff', color = C.ink) => <div style={{background: bg, color, borderRadius: 26, padding: '22px 26px', fontSize: 32, fontWeight: 800, textAlign: 'center', fontFamily: FONT}}>{t}</div>;
  return (
    <>
      {a > 0 && <AbsoluteFill style={{background: `rgba(10,12,30,${0.6 * a})`, opacity: a, padding: '360px 30px 0'}}>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18}}>{pill('Safari')}{pill('Home Screen app')}</div>
        <div style={{textAlign: 'center', color: PINK, fontSize: 40, fontWeight: 900, margin: '18px 0', fontFamily: FONT}}>≠ separate progress</div>
        {pill('Study in one place', C.amber, '#140c00')}
      </AbsoluteFill>}
      {b > 0 && <AbsoluteFill style={{background: `rgba(10,12,30,${0.6 * b})`, opacity: b, padding: '330px 30px 0', display: 'grid', alignContent: 'start', gap: 18}}>
        {pill('In Safari: More › Save backup file')}
        <div style={{textAlign: 'center', fontSize: 60, color: C.amber, lineHeight: 1}}>↓</div>
        {pill('In the app: More › Load backup file')}
      </AbsoluteFill>}
    </>
  );
};

/** Over the drill: wrong comes back in 5 minutes, right waits longer each time. */
const SpacingCallout: React.FC<{s: Scene}> = ({s}) => {
  const frame = useCurrentFrame();
  const w = at(s, 0), r = at(s, 0, 2.6);
  const steps = ['1 day', '3 days', '1 week', '16 days', '35 days'];
  const o = interpolate(frame, [w, w + 10], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: `rgba(10,12,30,${0.6 * o})`, opacity: o, padding: '300px 30px 0', display: 'grid', alignContent: 'start', gap: 22, fontFamily: FONT}}>
      <div style={{background: '#fbe9ec', color: C.bad, borderRadius: 26, padding: '22px 26px', fontSize: 32, fontWeight: 800, textAlign: 'center'}}>Wrong: back in 5 minutes</div>
      {frame >= r && <div style={{background: '#e3f3ea', color: C.good, borderRadius: 26, padding: '22px 26px', fontSize: 32, fontWeight: 800, textAlign: 'center'}}>Right: it waits longer each time</div>}
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center'}}>
        {steps.map((x, i) => {
          const p = interpolate(frame, [r + 12 + i * 9, r + 20 + i * 9], [0, 1], clamp);
          return <div key={x} style={{opacity: p, transform: `scale(${0.6 + 0.4 * p})`, background: C.amber, color: '#2b1a03', borderRadius: 20, padding: '14px 20px', fontSize: 30, fontWeight: 900, boxShadow: `0 0 ${20 * p}px ${C.amber}`}}>{x}</div>;
        })}
      </div>
      {steps.map((_, i) => <Sfx key={i} at={r + 12 + i * 9} name="tick" volume={0.35} />)}
      <Sfx at={w} name="buzz" volume={0.25} />
      <Sfx at={r} name="chime" volume={0.3} />
    </AbsoluteFill>
  );
};

export const HowTo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{fontFamily: FONT, background: '#06060f'}}>
      <MusicBed total={TOTAL} />
      {SCENES.map((s) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.dur} name={s.id}>
          {s.id === 'intro' ? <Visual s={s} /> : <WhipIn><Visual s={s} /></WhipIn>}
          {s.id !== 'intro' && <Sfx at={0} name="whoosh" volume={0.4} />}
          {s.lines.map((l, i) => (
            <React.Fragment key={l.file}>
              <Sequence from={l.start} durationInFrames={l.dur + 2} name={l.file} layout="none">
                <Audio src={staticFile(`voice/${l.file}`)} />
              </Sequence>
              <Sequence from={l.start - 3} durationInFrames={(s.lines[i + 1]?.start ?? s.dur) - l.start + 3} layout="none">
                <WordSubs text={l.text} start={3} dur={l.dur} />
              </Sequence>
            </React.Fragment>
          ))}
        </Sequence>
      ))}
      <div style={{position: 'absolute', left: 0, top: 0, height: 6, width: `${(100 * frame) / TOTAL}%`, background: C.amber, boxShadow: `0 0 12px ${C.amber}`}} />
    </AbsoluteFill>
  );
};
