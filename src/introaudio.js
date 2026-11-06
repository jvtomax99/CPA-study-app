/* Launch screen sound, all synthesized with Web Audio (no audio files). src/intro3d.js drives it from the story clock:
   setSpeed every frame, and events for the cold-open pass, the station notes, the brakes, the tunnel, the portal burst
   and the tap. Station notes build a chord (C, E, G), one note per station as the train arrives at a lit one.
   Works the same in an OfflineAudioContext, which is how the previews were rendered. */
(() => {
  function build(ctx) {
    const sr = ctx.sampleRate, now = () => ctx.currentTime;
    const rnd = (a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; })(1040);
    /* noise buffers: white and brown (integrated white, deep and rumbly) */
    const noise = (sec, brown) => { const b = ctx.createBuffer(1, sr * sec, sr), d = b.getChannelData(0); let last = 0;
      for (let i = 0; i < d.length; i++) { const w = rnd() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; } return b; };
    const WHITE = noise(2, false), BROWN = noise(4, true);
    const loop = (buf, at = 0) => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; s.start(at); return s; };
    const gain = (v, to) => { const g = ctx.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
    const filt = (type, f, q = 0.7, to) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; if (to) b.connect(to); return b; };
    /* master: a gentle compressor so the burst and the tap can't clip, then the level */
    const master = gain(1.6), comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 4;   /* loud enough for a phone speaker */ comp.attack.value = 0.01; comp.release.value = 0.25;
    /* a brick-wall limiter last, so the burst and the tap never clip */
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.1;
    /* and a soft clipper after it: a tanh curve that tops out at 0.94, so nothing can ever clip */
    const soft = ctx.createWaveShaper(); { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = 0.94 * Math.tanh(x * 1.25) / Math.tanh(1.25); } soft.curve = c; soft.oversample = "2x"; }
    comp.connect(master); master.connect(lim); lim.connect(soft); soft.connect(ctx.destination);
    /* a short generated room: the reverb for the chimes, the horns and the inside of the tunnel */
    const verb = ctx.createConvolver(); { const len = sr * 2.6, b = ctx.createBuffer(2, len, sr); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / len, 3.2); } verb.buffer = b; }
    const wet = gain(0.32, comp); verb.connect(wet);
    const bus = gain(1, comp), send = gain(0.0, verb); bus.connect(send);   /* everything on the bus can be sent to the room */

    /* city: a low hum of traffic, and now and then a distant horn */
    const city = gain(0.05, bus); loop(BROWN).connect(filt("lowpass", 380, 0.5, city));
    function horn(t) { const g = gain(0, verb), f = filt("lowpass", 1400, 0.7, g);
      for (const hz of [349, 440]) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz * (0.98 + rnd() * 0.04); o.connect(f); o.start(t); o.stop(t + 0.9); }
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.025, t + 0.05); g.gain.setValueAtTime(0.025, t + 0.45 + rnd() * 0.3); g.gain.linearRampToValueAtTime(0, t + 0.85); }

    /* the train: a body rumble that opens up with speed, a low drone, and the traction motors' rising whine */
    const train = gain(0, bus), pan = ctx.createStereoPanner(); pan.connect(train);
    const rumbleF = filt("lowpass", 140, 0.9, pan), rumble = gain(0.5, rumbleF); loop(BROWN).connect(rumble);
    const body = filt("bandpass", 420, 0.8, pan), bodyG = gain(0.06, body); loop(WHITE).connect(bodyG);
    const drone = ctx.createOscillator(); drone.type = "sine"; drone.frequency.value = 42; const droneG = gain(0.0, pan); drone.connect(droneG); drone.start();
    const motorF = filt("bandpass", 700, 6, pan), motorG = gain(0, motorF), motor = ctx.createOscillator(); motor.type = "sawtooth"; motor.frequency.value = 90; motor.connect(motorG); motor.start();
    const motor2 = ctx.createOscillator(); motor2.type = "sawtooth"; motor2.frequency.value = 135; motor2.connect(motorG); motor2.start();
    let speed = 0, clackAt = 0, joint = 0;
    function setSpeed(v, t = now(), near = 1) {   /* v in m/s; near: 0 far away, 1 riding beside the train */
      const k = Math.min(1, v / 60), tc = 0.08;
      train.gain.setTargetAtTime(v <= 0 ? 0 : (0.12 + 0.55 * k) * (0.35 + 0.65 * near), t, tc);   /* 0: the train is gone (in the tunnel) */
      rumbleF.frequency.setTargetAtTime(110 + 380 * k, t, tc); bodyG.gain.setTargetAtTime(0.03 + 0.12 * k, t, tc);
      droneG.gain.setTargetAtTime(0.05 + 0.12 * k, t, tc); drone.frequency.setTargetAtTime(38 + 14 * k, t, tc);
      motor.frequency.setTargetAtTime(80 + v * 7.5, t, tc); motor2.frequency.setTargetAtTime(120 + v * 11.2, t, tc); motorF.frequency.setTargetAtTime(500 + v * 16, t, tc);
      motorG.gain.setTargetAtTime(0.012 + 0.05 * k * k, t, tc);
      speed = v; clacks(t, near);
    }
    /* rail joints every 13 m: each car's trucks cross them as clack-clack ... clack-clack */
    function clack(t, level) { const g = gain(0, pan), f = filt("bandpass", 1700 + rnd() * 600, 1.4, g); const s = ctx.createBufferSource(); s.buffer = WHITE; s.connect(f); s.start(t, rnd() * 1.5, 0.06);
      g.gain.setValueAtTime(level * 0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      const o = ctx.createOscillator(), og = gain(0, pan); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.07); o.connect(og); og.gain.setValueAtTime(level * 0.6, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.08); o.start(t); o.stop(t + 0.1); }
    function clacks(t, near) {
      if (speed < 1) return;
      if (!clackAt) clackAt = t;
      while (clackAt < t + 0.12) {   /* schedule a little ahead */
        const lv = (0.25 + 0.75 * near) * Math.min(1, speed / 30), ax = 2.3 / speed;
        clack(clackAt, lv); clack(clackAt + ax, lv * 0.8);
        if (joint % 2 === 0) { clack(clackAt + 2.6 / speed, lv * 0.9); clack(clackAt + (2.6 + 2.3) / speed, lv * 0.7); }
        joint++; clackAt += (13 + (rnd() - 0.5) * 0.6) / speed;
      }
    }
    /* the cold open: the train blasts past the lens, left to right, with the motors' pitch dropping as it goes */
    function pass(t) {
      pan.pan.setValueAtTime(-0.8, t - 0.6); pan.pan.linearRampToValueAtTime(0.85, t + 0.5);
      train.gain.setValueAtTime(train.gain.value, t - 0.6); train.gain.linearRampToValueAtTime(1.15, t); train.gain.linearRampToValueAtTime(0.45, t + 0.8);
      motor.detune.setValueAtTime(180, t - 0.3); motor.detune.linearRampToValueAtTime(-220, t + 0.35); motor.detune.linearRampToValueAtTime(0, t + 1.4);
      motor2.detune.setValueAtTime(180, t - 0.3); motor2.detune.linearRampToValueAtTime(-220, t + 0.35); motor2.detune.linearRampToValueAtTime(0, t + 1.4);
      const g = gain(0, bus), f = filt("bandpass", 900, 0.6, g); loop(WHITE, t - 0.5).connect(f);   /* the air the train pushes */
      g.gain.setValueAtTime(0, t - 0.5); g.gain.linearRampToValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      pan.pan.setValueAtTime(0.85, t + 1.2); pan.pan.linearRampToValueAtTime(0, t + 2.2);
    }
    /* a station note: a bell (inharmonic partials), with a soft attack of the room */
    const NOTES = [523.25, 659.25, 783.99];   /* C5, E5, G5 */
    function bell(hz, t, level = 0.16, dur = 2.6) {
      const g = gain(0, bus), v = gain(0.5, verb); g.connect(v);
      [[1, 1], [2.0, 0.35], [2.76, 0.28], [5.4, 0.12], [8.93, 0.05]].forEach(([r, a]) => {
        const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = hz * r; const og = gain(0, g); o.connect(og);
        og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(a, t + 0.004); og.gain.exponentialRampToValueAtTime(0.0005, t + dur / r ** 0.35); o.start(t); o.stop(t + dur + 0.1); });
      g.gain.setValueAtTime(level, t);
    }
    function chime(k, t = now()) { bell(NOTES[k], t); }
    /* brakes: a squeal of two close partials with a shiver, then the air brake's hiss when it stops */
    function brake(t = now(), dur = 1.1) {
      const g = gain(0, bus), f = filt("bandpass", 3000, 4, g);
      for (const [hz, a] of [[2650, 1], [3980, 0.5], [2710, 0.6]]) { const o = ctx.createOscillator(); o.frequency.value = hz; const lfo = ctx.createOscillator(), lg = gain(28); lfo.frequency.value = 7 + rnd() * 3; lfo.connect(lg); lg.connect(o.frequency); const og = gain(a, f); o.connect(og); o.start(t); lfo.start(t); o.stop(t + dur + 0.2); lfo.stop(t + dur + 0.2); }
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.15); g.gain.setValueAtTime(0.05, t + dur - 0.3); g.gain.linearRampToValueAtTime(0.0, t + dur);
      const h = gain(0, bus), hf = filt("highpass", 2500, 0.7, h); loop(WHITE, t + dur - 0.1).connect(hf);
      h.gain.setValueAtTime(0, t + dur - 0.1); h.gain.linearRampToValueAtTime(0.09, t + dur + 0.05); h.gain.exponentialRampToValueAtTime(0.001, t + dur + 1.6);
    }
    /* sparks: a crackle of tiny clicks, as dense as the sparks are */
    function crackle(t, sec, density) { for (let i = 0; i < sec * density; i++) { const at = t + rnd() * sec, g = gain(0, bus), f = filt("highpass", 3200 + rnd() * 3000, 1, g); const s = ctx.createBufferSource(); s.buffer = WHITE; s.connect(f); s.start(at, rnd(), 0.012);
      g.gain.setValueAtTime(0.06 + rnd() * 0.08, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.012); } }
    /* into the tunnel: the roar swells and then closes in; the room opens up inside */
    function tunnel(t) {
      const g = gain(0, bus), f = filt("bandpass", 300, 0.5, g); loop(WHITE, t - 1.2).connect(f);
      f.frequency.setValueAtTime(300, t - 1.2); f.frequency.exponentialRampToValueAtTime(2200, t); f.frequency.exponentialRampToValueAtTime(260, t + 0.6);
      g.gain.setValueAtTime(0, t - 1.2); g.gain.linearRampToValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.001, t + 2.4);
      rumbleF.frequency.setTargetAtTime(160, t, 0.2); send.gain.setValueAtTime(0, t); send.gain.linearRampToValueAtTime(0.5, t + 0.3);
      train.gain.setTargetAtTime(0.0, t + 0.4, 0.6);
    }
    /* the portal burst: a deep boom with a shimmer on top */
    function burst(t) {
      const o = ctx.createOscillator(), og = gain(0, bus); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(32, t + 1.2); o.connect(og); o.start(t); o.stop(t + 1.6);
      og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(0.5, t + 0.02); og.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      for (const k of [0, 1, 2]) bell(NOTES[k] * 2, t + 0.05 + k * 0.06, 0.05, 2.2);
    }
    /* Tap to Start: a whoosh that rises into the white-out, then the chord resolves an octave up */
    function tap(t = now()) {
      const g = gain(0, bus), f = filt("bandpass", 300, 1.2, g); loop(WHITE, t).connect(f);
      f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(6500, t + 0.62);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.42, t + 0.6); g.gain.exponentialRampToValueAtTime(0.001, t + 1.1);
      for (const k of [0, 1, 2]) bell(NOTES[k], t + 0.62, 0.12, 3); bell(NOTES[0] * 2, t + 0.62, 0.08, 3.2);
      const o = ctx.createOscillator(), og = gain(0, bus); o.frequency.setValueAtTime(60, t + 0.6); o.frequency.exponentialRampToValueAtTime(30, t + 1.6); o.connect(og); o.start(t + 0.6); o.stop(t + 2);
      og.gain.setValueAtTime(0.0, t + 0.6); og.gain.linearRampToValueAtTime(0.35, t + 0.64); og.gain.exponentialRampToValueAtTime(0.001, t + 1.9);
      master.gain.setValueAtTime(master.gain.value, t + 1.4); master.gain.linearRampToValueAtTime(0, t + 3.6);
    }
    return { ctx, master, setSpeed, pass, chime, brake, crackle, tunnel, burst, tap, horn, NOTES };
  }
  window.IntroAudio = { build };
})();
