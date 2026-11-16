import scriptEn from './script.json';
import timingEn from './timing.json';
import scriptJa from './script-ja.json';
import timingJa from './timing-ja.json';
import {JA} from './lang';

export const FPS = 30;
const LEAD = 0.5; // silence before a scene's first line, seconds
const GAP = 0.35; // between lines
const TAIL = 0.75; // after a scene's last line

export type Line = {text: string; file: string; start: number; dur: number}; // frames, from the scene's start
export type Scene = {id: string; label: string; from: number; dur: number; lines: Line[]};

const f = (s: number) => Math.round(s * FPS);
const script = JA ? scriptJa : scriptEn;
const t = (JA ? timingJa : timingEn) as Record<string, number>;
// Japanese narration is ElevenLabs mp3 in public/voice-ja/ (tools/voice_ja.py); English is Kokoro wav in public/voice/
export const VOICE_DIR = JA ? 'voice-ja' : 'voice';

let at = 0;
export const SCENES: Scene[] = (script as {id: string; label: string; lines: string[]}[]).map((s) => {
  let cur = f(LEAD);
  const lines = s.lines.map((text, i) => {
    const file = `${s.id}-${i}.${JA ? 'mp3' : 'wav'}`;
    const dur = f(t[file]);
    const line = {text, file, start: cur, dur};
    cur += dur + f(GAP);
    return line;
  });
  const dur = cur - f(GAP) + f(TAIL);
  const scene = {id: s.id, label: s.label, from: at, dur, lines};
  at += dur;
  return scene;
});
export const TOTAL = at;
export const sceneById = (id: string) => SCENES.find((s) => s.id === id)!;
