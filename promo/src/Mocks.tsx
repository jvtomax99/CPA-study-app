import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, FONT, SH, SW, Shot, TapRing} from './Phone';

// Simplified drawings of the browser steps (not screenshots of iOS or Android), on the phone's screen.

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const useIn = (at: number, dur = 10) => interpolate(useCurrentFrame(), [at, at + dur], [0, 1], clamp);
const useSlide = (at: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - at, fps, config: {damping: 200}, durationInFrames: 16});
};

const Dots: React.FC<{vertical?: boolean; color?: string}> = ({vertical, color = C.ink}) => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill={color} style={{transform: vertical ? 'rotate(90deg)' : undefined}}>
    <circle cx="5" cy="12" r="2.2" /><circle cx="12" cy="12" r="2.2" /><circle cx="19" cy="12" r="2.2" />
  </svg>
);
const ShareIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2f6fed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" /><path d="M7 11H5.5v9.5h13V11H17" />
  </svg>
);
const PlusSquare = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth="2" strokeLinecap="round">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" /><path d="M12 8v8M8 12h8" />
  </svg>
);

const row: React.CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 84, fontSize: 30, color: C.ink, borderBottom: '1px solid #e4e6ec'};

/** iPhone, Safari: the three-dot button, Share, Add to Home Screen, Open as Web App, Add. */
export const SafariSteps: React.FC<{dots: number; share: number; sheet: number; addRow: number; form: number; add: number}> = (t) => {
  const menu = useIn(t.dots + 6, 8) * (1 - useIn(t.sheet, 6));
  const sheetY = useSlide(t.sheet);
  const formY = useSlide(t.form);
  const frame = useCurrentFrame();
  const rowLit = frame >= t.addRow - 4 && frame < t.form;
  const toggleLit = frame >= t.form + 12;
  return (
    <div style={{position: 'absolute', inset: 0, fontFamily: FONT}}>
      <Shot src="home" />
      {/* Safari's bottom bar (iOS 26 compact layout) */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 150, background: 'rgba(246,246,250,0.96)', display: 'flex', alignItems: 'flex-start', paddingTop: 22, gap: 18, justifyContent: 'center'}}>
        <div style={{width: 70, height: 70, borderRadius: 35, background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.12)', display: 'grid', placeItems: 'center', fontSize: 40, color: C.ink}}>‹</div>
        <div style={{width: 340, height: 70, borderRadius: 35, background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.12)', display: 'grid', placeItems: 'center', fontSize: 26, color: '#444'}}>jvtomax99.github.io</div>
        <div style={{width: 70, height: 70, borderRadius: 35, background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.12)', display: 'grid', placeItems: 'center'}}><Dots /></div>
      </div>
      {/* the three-dot menu */}
      {menu > 0 && (
        <div style={{position: 'absolute', right: 24, bottom: 160, width: 330, borderRadius: 30, background: '#fff', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', opacity: menu, transform: `scale(${0.9 + 0.1 * menu})`, transformOrigin: 'bottom right', overflow: 'hidden'}}>
          {['Bookmarks', 'New Tab', 'Share'].map((x) => (
            <div key={x} style={{...row, background: x === 'Share' && frame >= t.share - 6 ? '#fdf0d6' : '#fff', fontWeight: x === 'Share' ? 700 : 500}}>{x}{x === 'Share' && <ShareIcon />}</div>
          ))}
        </div>
      )}
      {/* the share sheet */}
      {sheetY > 0 && (
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: SH * 0.62, background: '#f2f2f7', borderRadius: '40px 40px 0 0', boxShadow: '0 -20px 50px rgba(0,0,0,0.3)', transform: `translateY(${(1 - sheetY) * SH * 0.62}px)`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 20, padding: 28}}>
            <Img src={staticFile('icons/icon-512.png')} style={{width: 84, height: 84, borderRadius: 20}} />
            <div style={{fontSize: 30, fontWeight: 700, color: C.ink}}>EA Ledger Drill<div style={{fontSize: 24, fontWeight: 400, color: '#666'}}>jvtomax99.github.io</div></div>
          </div>
          <div style={{margin: '0 24px', borderRadius: 24, background: '#fff', overflow: 'hidden'}}>
            {['Copy', 'Add to Reading List', 'Add Bookmark'].map((x) => <div key={x} style={row}>{x}</div>)}
            <div style={{...row, background: rowLit ? '#fdf0d6' : '#fff', fontWeight: 700, borderBottom: 'none', boxShadow: rowLit ? `inset 0 0 0 4px ${C.amber}` : undefined}}>Add to Home Screen<PlusSquare /></div>
          </div>
        </div>
      )}
      {/* the Add to Home Screen form */}
      {formY > 0 && (
        <div style={{position: 'absolute', inset: 0, background: '#f2f2f7', transform: `translateY(${(1 - formY) * SH}px)`}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '70px 30px 30px', fontSize: 30}}>
            <span style={{color: '#2f6fed'}}>Cancel</span><b style={{color: C.ink}}>Add to Home Screen</b><b style={{color: '#2f6fed'}}>Add</b>
          </div>
          <div style={{margin: '0 24px', borderRadius: 24, background: '#fff', padding: 28, display: 'flex', gap: 24, alignItems: 'center'}}>
            <Img src={staticFile('icons/icon-512.png')} style={{width: 110, height: 110, borderRadius: 26}} />
            <div style={{fontSize: 32, color: C.ink}}>EA Drill<div style={{fontSize: 24, color: '#888', marginTop: 8}}>jvtomax99.github.io/CPA-study-app</div></div>
          </div>
          <div style={{margin: '24px 24px 0', borderRadius: 24, background: '#fff', ...row, height: 96, borderBottom: 'none', boxShadow: toggleLit ? `0 0 0 5px ${C.amber}` : undefined}}>
            <span style={{fontWeight: 600}}>Open as Web App</span>
            <div style={{width: 92, height: 54, borderRadius: 27, background: '#34c759', position: 'relative'}}><div style={{position: 'absolute', right: 4, top: 4, width: 46, height: 46, borderRadius: 23, background: '#fff'}} /></div>
          </div>
          <div style={{margin: '18px 40px', fontSize: 24, color: '#777', lineHeight: 1.4}}>Keep this on, so it opens as its own app with its own storage.</div>
        </div>
      )}
      <TapRing at={t.dots} x={SW - 24 - 35 - 18 + 18} y={SH - 150 + 22 + 35} />
      <TapRing at={t.share} x={SW - 24 - 165} y={SH - 160 - 42} />
      <TapRing at={t.addRow} x={SW / 2} y={SH * 0.38 + 140 + 3 * 84 + 42} />
      <TapRing at={t.add} x={SW - 58} y={88} />
    </div>
  );
};

/** Android, Chrome: the three-dot menu, then Add to Home screen or Install app. */
export const ChromeSteps: React.FC<{dots: number; pick: number; dialog: number; install: number}> = (t) => {
  const frame = useCurrentFrame();
  const menu = useIn(t.dots + 6, 8) * (1 - useIn(t.dialog, 6));
  const dlg = useIn(t.dialog, 10);
  const lit = frame >= t.pick - 6;
  return (
    <div style={{position: 'absolute', inset: 0, fontFamily: FONT}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 120, background: '#fff', display: 'flex', alignItems: 'flex-end', padding: '0 16px 16px', gap: 14, zIndex: 2}}>
        <div style={{flex: 1, height: 70, borderRadius: 35, background: '#eef0f4', display: 'flex', alignItems: 'center', paddingLeft: 28, fontSize: 26, color: '#444'}}>jvtomax99.github.io/CPA-…</div>
        <div style={{width: 60, height: 70, display: 'grid', placeItems: 'center'}}><Dots vertical /></div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 120, bottom: 0}}><Shot src="home" /></div>
      {menu > 0 && (
        <div style={{position: 'absolute', right: 14, top: 110, width: 380, borderRadius: 18, background: '#fff', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', opacity: menu, transform: `scale(${0.9 + 0.1 * menu})`, transformOrigin: 'top right', zIndex: 3, overflow: 'hidden'}}>
          {['New tab', 'History', 'Bookmarks', 'Downloads'].map((x) => <div key={x} style={row}>{x}</div>)}
          <div style={{...row, background: lit ? '#fdf0d6' : '#fff', fontWeight: 700, height: 'auto', padding: '18px 28px', display: 'block', boxShadow: lit ? `inset 0 0 0 4px ${C.amber}` : undefined}}>Add to Home screen<div style={{fontSize: 22, fontWeight: 500, color: '#777'}}>or: Install app</div></div>
          {['Settings'].map((x) => <div key={x} style={{...row, borderBottom: 'none'}}>{x}</div>)}
        </div>
      )}
      {dlg > 0 && (
        <div style={{position: 'absolute', inset: 0, background: `rgba(0,0,0,${0.45 * dlg})`, display: 'grid', placeItems: 'center', zIndex: 4}}>
          <div style={{width: 500, borderRadius: 30, background: '#fff', padding: 36, opacity: dlg, display: 'grid', gap: 24}}>
            <b style={{fontSize: 34, color: C.ink}}>Install app</b>
            <div style={{display: 'flex', gap: 20, alignItems: 'center'}}><Img src={staticFile('icons/icon-512.png')} style={{width: 90, height: 90, borderRadius: 45}} /><div style={{fontSize: 30, color: C.ink}}>EA Drill</div></div>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: 40, fontSize: 30, fontWeight: 700, color: '#1a73e8'}}><span>Cancel</span><span>Install</span></div>
          </div>
        </div>
      )}
      <div style={{position: 'absolute', inset: 0, zIndex: 5}}>
        <TapRing at={t.dots} x={SW - 46} y={85} />
        <TapRing at={t.pick} x={SW - 200} y={110 + 4 * 84 + 50} />
        <TapRing at={t.install} x={SW / 2 + 180} y={SH / 2 + 98} />
      </div>
    </div>
  );
};

/** A Home Screen with the app's icon among blank ones. */
export const HomeScreen: React.FC<{tap: number; glowFrom: number}> = ({tap, glowFrom}) => {
  const frame = useCurrentFrame();
  const glow = 0.5 + 0.5 * Math.sin((frame - glowFrom) / 7);
  const on = frame >= glowFrom;
  const cell = (i: number) => {
    const isApp = i === 9;
    return (
      <div key={i} style={{display: 'grid', justifyItems: 'center', gap: 10}}>
        {isApp ? (
          <Img src={staticFile('icons/icon-512.png')} style={{width: 112, height: 112, borderRadius: 26, boxShadow: on ? `0 0 ${20 + 30 * glow}px ${C.amber}` : 'none'}} />
        ) : (
          <div style={{width: 112, height: 112, borderRadius: 26, background: 'rgba(255,255,255,0.16)'}} />
        )}
        <div style={{fontSize: 22, color: '#fff', fontWeight: isApp ? 700 : 400, opacity: isApp ? 1 : 0.5}}>{isApp ? 'EA Drill' : ' '}</div>
      </div>
    );
  };
  return (
    <div style={{position: 'absolute', inset: 0, fontFamily: FONT, background: `linear-gradient(180deg, ${C.duskTop}, ${C.duskMid} 55%, ${C.duskLow})`}}>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', rowGap: 40, padding: '120px 30px 0'}}>{Array.from({length: 20}, (_, i) => cell(i))}</div>
      <TapRing at={tap} x={30 + (540 / 4) * 1.5} y={120 + 50 + 2 * (112 + 10 + 27 + 40)} />
    </div>
  );
};
