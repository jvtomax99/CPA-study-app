/* Launch screen: a night El train rides past three stations (one per SEE part) into the tax town, then Tap to Start.
   This file is the overlay and the load tracker; src/intro3d.js draws the ride. Shell markup decides the mode before paint:
   "full" (every launch), "off" (?intro=0, or an exam sim running: straight to Home), "title" (?intro=title: straight
   to Tap to Start). iOS resumes a Home Screen app without reloading it, so the ride plays only when the app really starts.
   window.Boot counts what really loads: three.js (bytes), the bloom passes, the tower models (bytes), the town build and the
   question bank, which streams in with the page after this overlay is up, one run of blocks per part (tools/build.py). A station's platform lights switch on when its stages are done; the train waits at a dark one. */
(() => {
  const mode = window.__introMode || "off", el = document.getElementById("intro");
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

  /* ---------- load tracker ---------- */
  /* weights in KB (the town build counts as 160 KB of work); the bank's come from tools/build.py */
  const W = Object.assign({ three: 670, post: 60, models: 280, town: 160, paint: 80, env: 446 }, __BANKKB__);
  const F = {}; for (const k in W) F[k] = 0;
  const subs = [];
  const set = (k, f) => { if (!(k in F) || !(f > F[k])) return; F[k] = Math.min(1, f); subs.forEach(fn => fn()); };
  /* what each station waits for; the CPA-only questions count toward the progress line but light no station */
  const STAGES = [["three", "bank1", "paint"], ["post", "models", "bank2", "env"], ["town", "bank3"]];
  const progress = () => { let a = 0, b = 0; for (const k in W) { a += W[k] * F[k]; b += W[k]; } return a / b; };
  /* fetch a file and report its bytes; expected covers servers that send a compressed Content-Length */
  async function fetchBuf(url, onFrac, expected = 0) {
    const r = await fetch(url); if (!r.ok) throw new Error(r.status);
    const total = Math.max(+r.headers.get("content-length") || 0, expected);
    if (!r.body || !total) { const b = await r.arrayBuffer(); onFrac(1); return b; }
    const rd = r.body.getReader(), parts = []; let got = 0;
    for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; onFrac(Math.min(0.99, got / total)); }
    const out = new Uint8Array(got); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
    onFrac(1); return out.buffer;
  }
  const imap = (() => { try { return JSON.parse(document.querySelector('script[type="importmap"]').textContent).imports || {}; } catch (e) { return {}; } })();
  /* read three.js once with byte progress; intro3d.js and town.js wait for this, then import() it from the HTTP cache */
  const threeWarm = mode === "off" || !imap.three ? Promise.resolve() : fetchBuf(imap.three, f => set("three", f * 0.97), 670681).catch(() => {});
  /* the four tower models: town.js calls Boot.model(i, url) in place of fetch */
  const mf = [0, 0, 0, 0];
  const model = (i, url) => fetchBuf(url, f => { mf[i] = f; set("models", mf.reduce((a, b) => a + b, 0) / 4); }).catch(() => { mf[i] = 1; set("models", mf.reduce((a, b) => a + b, 0) / 4); return null; });
  setTimeout(() => { for (const k in F) set(k, 1); }, 30000); /* never hold the train longer than 30 seconds */
  window.__introCounts = __COUNTS__; /* questions per part, for the station signs */
  /* your progress as of the last visit (app.js saves it), so the ride shows it before the bank has arrived */
  try { window.__introProg = JSON.parse(localStorage.getItem("eaTaxTown.introProg") || "null"); } catch (e) {}
  window.Boot = { set, done: k => set(k, 1), lit: i => STAGES[i].every(k => F[k] >= 1), progress, loaded: () => progress() >= 0.9999, threeWarm, model, on: fn => subs.push(fn) };

  if (mode === "off" || !el) { window.Intro = { on: false }; return; }

  /* ---------- overlay ---------- */
  const $i = s => el.querySelector(s);
  /* the Next stop line over Tap to Start: the area with the biggest gap, as on the Today card */
  function nextStop(p) {
    const n = $i("#innext"); if (!n || !p || !p.next) return;
    n.querySelector("b").textContent = p.first ? "First stop" : "Next stop";
    n.querySelector("span").textContent = `${p.next.name} · ${Math.round(p.next.m * 100)}% ready`; n.hidden = false;
  }
  nextStop(window.__introProg);
  setTimeout(() => paintSound(), 0);

  /* ---------- the rendered Tap to Start ----------
     The hold is a still rendered in Blender (Cycles; tools/blender/intro_plate.py), files in art/intro-plate/: the cutting
     at track level, the LAST STOP portal and the tax tower. Two layers sit on it, cut from the same render: the tower lit to
     your mastery in tenths (tower-0 to tower-10), and the sign with its neon off, which CSS fades in and out for the flicker.
     Landscape screens get the desktop files (1920 by 1200); portrait screens hold on the film's last frame instead. They load during the
     ride; if they haven't arrived by Tap to Start, the 3D portal stays. Rects are in the plate's pixels. */
  /* ---------- the film ----------
     Portrait screens play a film in place of the 3D ride: media/intro-phone.mp4, 13.6 seconds, 1080 by 1920, cut from
     footage made in Runway for this app (the writers running in the yard, the graffiti car with the study buddy, the El
     curve, the chase along the track, the buddy's mural, the bridge, the dive to LAST STOP), with no sound track
     (its sound is two recorded files, see FSND below). cuts are where the status line moves on to the next part and where
     the dive starts, title is when ABOVE THE LINE shows over the mural, all in seconds.
     Tap to Start holds on the film's last frame (intro-phone-end.webp) with the title back on; the tower above the portal
     is dimmed from the top down to your mastery through a cut-out of its shape (intro-phone-tower.webp). If the film
     can't start within 5 seconds (blocked autoplay, slow network, data saver) the 3D ride plays as before; ?ride=3d asks
     for it. Landscape screens always get the 3D ride. */
  const FILM = { src: "media/intro-phone.mp4", first: "media/intro-phone-start.webp", last: "media/intro-phone-end.webp", mask: "media/intro-phone-tower.webp", wait: "media/intro-wait.webp", cuts: [4.0, 8.0, 10.5], end: 13.6, title: [6.5, 8.0] };
  const PLATE = {phone: {w: 1080, h: 1920, film: true, tower: {x: 331, y: 70, w: 418, h: 721}}, desk: {w: 1920, h: 1200, neon: {x: 637, y: 592, w: 644, h: 291}, tower: {x: 799, y: 0, w: 294, h: 601}}};
  const pk = innerWidth > innerHeight ? "desk" : "phone", P = PLATE[pk], dir = "art/intro-plate/" + pk;
  const step = p => Math.round(Math.max(0, Math.min(1, (p && p.tower) || 0)) * 10);
  const load = src => new Promise(r => { const i = new Image(); i.decoding = "async"; i.onload = () => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()).then(() => r(i)); i.onerror = () => r(null); i.src = src; });
  const plate = { box: el.querySelector(".in-plate"), on: false, step: step(window.__introProg) };
  plate.ready = mode === "off" || !plate.box ? Promise.resolve(null) : P.film ? load(FILM.last).then(i => i ? [i] : null) : Promise.all([load(dir + ".webp"), load(`${dir}-tower-${plate.step}.webp`), load(dir + "-neon.webp")]).then(a => a.every(Boolean) ? a : null);
  const place = (img, r) => Object.assign(img.style, { left: r.x / P.w * 100 + "%", top: r.y / P.h * 100 + "%", width: r.w / P.w * 100 + "%", height: r.h / P.h * 100 + "%" });
  function fit(f) {   /* cover the screen, anchored a little above center so the tower's top and the track both show */
    if (!f) return;
    const k = Math.max(el.clientWidth / P.w, el.clientHeight / P.h), w = P.w * k, h = P.h * k;
    Object.assign(f.style, { width: w + "px", height: h + "px", left: (el.clientWidth - w) / 2 + "px", top: (el.clientHeight - h) * 0.42 + "px" });
  }
  const fitPlate = () => fit(plate.box && plate.box.firstChild);
  /* the film's tower: lit from the ground up to your mastery in tenths (at least the bottom 6%), dark above */
  const shadeTo = (s, k) => { if (s) s.style.clipPath = `inset(0 0 ${Math.max(6, k * 10)}% 0)`; };
  function showPlate() {
    if (plate.on || exiting || phase !== "hero") return;
    plate.ready.then(imgs => {
      if (!imgs || plate.on || exiting) return;
      plate.on = true;
      const f = document.createElement("div"); f.className = "in-plate-frame";
      const [base, tower, neon] = imgs;
      if (P.film) { const sh = document.createElement("i"); sh.className = "tw-shade"; sh.style.webkitMaskImage = sh.style.maskImage = `url(${FILM.mask})`; place(sh, P.tower); shadeTo(sh, plate.step); f.append(base, sh); }
      else { tower.className = "tw"; neon.className = "nf"; place(tower, P.tower); place(neon, P.neon); f.append(base, tower, neon); }
      plate.box.appendChild(f); fitPlate(); window.addEventListener("resize", fitPlate);
      if (!P.film && !tower.src.endsWith(`-tower-${plate.step}.webp`)) swapTower(plate.step);   /* progress came in while it loaded */
      requestAnimationFrame(() => el.classList.add("plate"));
      setTimeout(() => scene && scene.cover && scene.cover(true), reduce ? 0 : 800);   /* once it's faded in, stop drawing the 3D */
    });
  }
  const swapTower = k => P.film ? shadeTo(plate.box && plate.box.querySelector(".tw-shade"), k) : load(`${dir}-tower-${k}.webp`).then(i => { const t = plate.box && plate.box.querySelector(".tw"); if (i && t && plate.step === k) t.src = i.src; });
  function plateProgress(p) {   /* the bank arrived: the tower step for your real mastery */
    const k = step(p); if (k === plate.step) return; plate.step = k; if (plate.on) swapTower(k);
  }
  const NAMES = ["Individuals", "Businesses", "Representation"];
  const film = { on: false, v: null, shot: -1, endedAt: 0, tried: false, lastT: -1, lastMove: 0 };
  let stationI = 0, waiting = false, phase = "wait", has3d = false, failed3d = false, queued = false, exiting = false, scene = null, go = null, notices = () => [];
  $i("#inbuild").textContent = "__BUILD__";
  const setPhase = p => {
    phase = p; el.dataset.phase = p;
    el.classList.toggle("hero", p === "hero");
    if (p === "hero") { showPlate(); if (P.film) filmTitle(true); }
    paint();
  };
  function paint() {
    const pr = progress(), done = pr >= 0.9999;
    $i("#inbar").style.width = (pr * 100).toFixed(2) + "%";
    const i = has3d || film.on ? stationI : Math.max(0, [0, 1, 2].findIndex(k => !Boot.lit(k)));
    /* the station names only mean something while the train is riding past them */
    const riding = (has3d || film.on) && phase !== "hero" && phase !== "wait";
    const where = queued ? "Starting when loaded" : riding ? (waiting ? "Waiting at " : "Arriving at ") + NAMES[i] : phase === "hero" ? "Loading" : "Leaving the yard";
    $i("#instatus").textContent = `${where}... ${(pr * 100).toFixed(2)}%`;
    el.classList.toggle("loading", !done && phase !== "wide");
    if (done && queued) exit(queued);
  }
  Boot.on(paint);

  /* sound (src/introaudio.js): iPhones allow web audio only after a touch, so the ride starts silent and the first touch
     on the launch screen starts it. The speaker button turns it on or off; the choice is saved. */
  let soundOn = true, musicOn = true, audio = null, unlockedAt = 0;
  try { soundOn = localStorage.getItem("eaTaxTown.sound") !== "off"; musicOn = localStorage.getItem("eaTaxTown.music") !== "off"; } catch (e) {}
  /* The film's sound is recorded, not synthesized: effects and a beat made in ElevenLabs. media/intro-sfx.mp3 is the effects,
     mixed to the film's cuts; media/intro-music.mp3 is ten bars of the beat (95 BPM) with a little of itself repeated at
     each end, so it loops between the two times in FSND.loop without a gap for as long as Tap to Start waits. Both play
     through Web Audio from the film's time: the beat dips before the arrival (FSND.duck: down from, back up between) and
     comes straight back. Separate files, so the Sound and Music switches both keep working. */
  const FSND = { sfx: "media/intro-sfx.mp3", music: "media/intro-music.mp3", go: "media/intro-go.mp3", loop: [0.1, 25.368], duck: [12.0, 13.0, 13.6] };
  let fsnd = null; const fbytes = {};
  const filmAt = () => film.endedAt ? FILM.end + (performance.now() - film.endedAt) / 1000 : (film.v && film.v.currentTime) || 0;
  const filmSoundFetch = () => { for (const k of musicOn ? ["sfx", "go", "music"] : ["sfx", "go"]) fbytes[k] = fetch(FSND[k]).then(r => r.ok ? r.arrayBuffer() : null).catch(() => null); };
  function filmSoundStop() { if (!fsnd) return; fsnd.src.forEach(n => { try { n.stop(); } catch (e) {} }); fsnd.src = []; }
  /* start both again from the film's time now: on the first touch, when sound is switched back on, when the film starts or stops */
  function filmSoundSync() {
    if (!fsnd || !fsnd.ready) return; filmSoundStop(); if (!soundOn || exiting) return;
    const { ctx, bufs } = fsnd, t = filmAt(), now = ctx.currentTime, [a, b] = FSND.loop, [d0, d1, d2] = FSND.duck;
    if (bufs.sfx && t < bufs.sfx.duration - 0.05) { const n = ctx.createBufferSource(); n.buffer = bufs.sfx; n.connect(fsnd.sg); n.start(now, t); fsnd.src.push(n); }
    if (!bufs.music) return;
    const n = ctx.createBufferSource(); n.buffer = bufs.music; n.loop = true; n.loopStart = a; n.loopEnd = b; n.connect(fsnd.mg); n.start(now, a + t % (b - a)); fsnd.src.push(n);
    const lvl = x => x < d0 ? 0.8 : x < d0 + 0.3 ? 0.8 - 0.5 * (x - d0) / 0.3 : x < d1 ? 0.3 : x < d2 ? 0.3 + 0.5 * (x - d1) / (d2 - d1) : 0.8, g = fsnd.mg.gain;
    g.cancelScheduledValues(now); g.setValueAtTime(lvl(t), now);
    for (const x of [d0, d0 + 0.3, d1, d2]) if (x > t) g.linearRampToValueAtTime(lvl(x), now + x - t);
  }
  function filmSoundStart(have) {   /* have: a context the browser already let run without a touch */
    const AC = window.AudioContext || window.webkitAudioContext; if (fsnd || !film.v || !AC) return;
    const ctx = have || new AC(); ctx.resume && ctx.resume();
    const sg = ctx.createGain(), mg = ctx.createGain(); sg.connect(ctx.destination); mg.connect(ctx.destination);
    const mine = fsnd = { ctx, sg, mg, bufs: {}, src: [], ready: false };
    const dec = k => (fbytes[k] || Promise.resolve(null)).then(buf => buf ? new Promise(r => ctx.decodeAudioData(buf.slice(0), r, () => r(null))) : null);
    Promise.all([dec("sfx"), dec("music"), dec("go")]).then(([sfx, music, go]) => { if (fsnd !== mine) return; mine.bufs = { sfx, music, go }; mine.ready = true; filmSoundSync(); });
  }
  /* leave: fade both out, then close. On Tap to Start (go) the train rushes off into the tunnel over the fade */
  function filmSoundEnd(ms, go) {
    const f = fsnd; if (!f) return; fsnd = null;
    if (go && soundOn && f.bufs.go) try { const n = f.ctx.createBufferSource(); n.buffer = f.bufs.go; n.connect(f.ctx.destination); n.start(); f.src.push(n); ms = Math.max(ms, f.bufs.go.duration * 1000); } catch (e) {}
    try { const now = f.ctx.currentTime; for (const g of [f.sg.gain, f.mg.gain]) { g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + 0.9); } } catch (e) {}
    setTimeout(() => { f.src.forEach(n => { try { n.stop(); } catch (e) {} }); try { f.ctx.close(); } catch (e) {} }, ms + 60);
  }
  function unlock(e) {
    if (film.v) {   /* the film is on screen: its own sound, not the synthesized ride */
      /* a finger going down is not yet permission to play sound on a phone; the finger lifting is */
      if (e && e.type === "pointerdown" && e.pointerType !== "mouse") return;
      if (!soundOn || fsnd || exiting) return;
      try { if (navigator.audioSession) navigator.audioSession.type = "ambient"; } catch (e) {}
      filmSoundStart(); unlockedAt = performance.now(); paintSound(); return;
    }
    if (!soundOn || audio || !window.IntroAudio || exiting) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { if (navigator.audioSession) navigator.audioSession.type = "ambient"; /* respect the silent switch, mix with the user's music */
      const ctx = new AC(); ctx.resume && ctx.resume(); audio = IntroAudio.build(ctx); unlockedAt = performance.now(); } catch (e) { audio = null; }
    paintSound();
  }
  function paintSound() {
    const b = $i("#insnd"); if (!b) return;
    b.setAttribute("aria-pressed", String(soundOn && !!(audio || fsnd)));
    b.querySelector("span").textContent = !soundOn ? "Sound off" : audio || fsnd ? "Sound on" : "Tap for sound";
    b.classList.toggle("off", !soundOn);
  }
  function toggleSound() {
    if (performance.now() - unlockedAt < 800) { paintSound(); return; } /* this same touch just started the sound: keep it on */
    if (fsnd) { soundOn = !soundOn; if (!soundOn) filmSoundStop(); else filmSoundSync(); }
    else if (soundOn && audio) { soundOn = false; audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.05); }
    else { soundOn = true; if (audio) audio.master.gain.setTargetAtTime(1.6, audio.ctx.currentTime, 0.05); else unlock(); }
    try { localStorage.setItem("eaTaxTown.sound", soundOn ? "on" : "off"); } catch (e) {}
    paintSound();
  }
  const endSound = (tap) => { filmSoundEnd(tap ? 900 : 120, tap); if (!audio) return; const a = audio; if (tap && soundOn) { a.scratch(); a.tap(); } else { a.stopMusic(); a.master.gain.setTargetAtTime(0, a.ctx.currentTime, 0.08); }
    setTimeout(() => { try { a.stopMusic(); a.ctx.close(); } catch (e) {} }, tap ? 3800 : 600); };
  el.addEventListener("pointerdown", unlock, true);
  el.addEventListener("pointerup", unlock, true);
  function exit(where) {
    if (exiting) return;
    if (!Boot.loaded()) { queued = where; paint(); return; } /* a tap during loading starts the app the moment loading finishes */
    exiting = true;
    endSound(where === "menu");
    const finish = () => {
      go && go(where);
      document.documentElement.classList.remove("introing");
      el.classList.add("out");
      setTimeout(() => { scene && scene.dispose(); el.remove(); }, reduce ? 280 : 440);
    };
    if (where === "menu" && !reduce) {
      el.classList.add("flare"); scene && scene.flare();
      setTimeout(() => { el.classList.add("dark"); setTimeout(finish, 380); }, 800); /* 0.6s to white, hold 0.2s, then through dark */
    } else finish();
  }
  function showNotices() {
    const n = document.createElement("div"); n.className = "in-notes"; n.setAttribute("role", "dialog"); n.setAttribute("aria-label", "Notices");
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    n.innerHTML = `<h3>Notices</h3><ul>${notices().map(t => `<li>${esc(t)}</li>`).join("")}</ul><button type="button">Close</button>`;
    n.addEventListener("click", e => e.stopPropagation());
    n.querySelector("button").onclick = () => n.remove();
    el.appendChild(n); n.querySelector("button").focus();
  }
  el.addEventListener("click", e => {
    if (exiting) return;
    const b = e.target.closest("[data-go]");
    if (b) { e.stopPropagation(); if (b.dataset.go === "notices") showNotices(); else if (b.dataset.go === "sound") toggleSound(); else if (b.dataset.go === "skip") exit("menu"); else exit(b.dataset.go); return; }
    if (el.querySelector(".in-notes")) return;
    /* during the ride a touch only starts the sound (the pointerdown above); Skip and Tap to Start leave the ride */
    if (phase !== "hero") return;
    exit("menu");
  });
  document.addEventListener("keydown", e => {
    if (!el.isConnected || exiting) return;
    if (e.key === "Escape" && el.querySelector(".in-notes")) return el.querySelector(".in-notes").remove();
    if ((e.key === "Enter" || e.key === " ") && !e.target.closest("[data-go], .in-notes")) { e.preventDefault(); exit("menu"); }
  });

  /* the welcome toast, for the first two seconds of the ride (or right away if the ride is slow to start). The name comes
     straight from saved progress, since app.js only runs once the whole bank has arrived */
  let toasted = false;
  function toast() {
    if (toasted) return; toasted = true;
    let name = ""; try { name = (JSON.parse(localStorage.getItem("eaTaxTown.v2") || "{}").name || "").trim(); } catch (e) {}
    const t = $i("#intoast"); $i("#intoastt").textContent = name ? `Welcome, ${name}!` : "Welcome!";
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => t.classList.remove("show"), 1900);
  }
  if (mode === "full") setTimeout(toast, 1200);

  /* ---------- the film player ---------- */
  /* ABOVE THE LINE: over the buddy's mural, and again on the last frame */
  const filmTitle = on => { const p = $i("#intitle"); if (p) p.classList.toggle("show", on); };
  function filmTick() {
    const v = film.v; if (exiting || !v || !film.on) return;
    const t = v.currentTime, now = performance.now();
    /* a film that stops moving for 2.5 seconds (lost signal, or the phone paused it) goes to Tap to Start, like one that ended */
    if (t !== film.lastT || document.hidden) { film.lastT = t; film.lastMove = now; }
    if (!film.endedAt && (v.ended || now - film.lastMove > 2500)) { const cut = !v.ended; film.endedAt = now; try { v.pause(); } catch (e) {} if (cut) filmSoundSync(); }
    const n = film.endedAt ? 4 : t < FILM.cuts[0] ? 0 : t < FILM.cuts[1] ? 1 : t < FILM.cuts[2] ? 2 : 3;
    if (n !== film.shot) {
      film.shot = n; if (n < 3) stationI = n;
      const ph = n === 0 ? "wide" : n < 3 ? "stations" : n === 3 ? "dive" : "hero";
      if (ph !== phase) setPhase(ph); else paint();
    }
    filmTitle(n === 4 || (t >= FILM.title[0] && t < FILM.title[1]));
    if (n < 4) requestAnimationFrame(filmTick);
  }
  const noFilm = mode !== "full" || reduce || !P.film || new URLSearchParams(location.search).get("ride") === "3d" || !!(navigator.connection && navigator.connection.saveData);
  film.tried = !noFilm; if (!noFilm && soundOn) filmSoundFetch();
  film.ready = noFilm ? Promise.resolve(false) : new Promise(res => {
    const v = document.createElement("video"), fr = document.createElement("div");
    let settled = false;
    const fail = () => {
      if (settled) return; settled = true;
      try { v.pause(); v.removeAttribute("src"); v.load(); } catch (e) {}   /* and stop downloading it */
      film.askDone && film.askDone(); card(false); film.card && film.card.remove(); fr.remove(); film.v = null; filmSoundEnd(0); paintSound(); res(false);
      /* the 3D ride starts only now: give it the same 8 seconds before Tap to Start on the plain sky */
      setTimeout(() => { if (!has3d && phase !== "hero") setPhase("hero"); }, 8000);
    };
    const ok = () => {
      if (settled) return; settled = true; film.on = true; el.classList.add("film");
      /* no 3D to build: its load stages are done once three.js (the town needs it) has arrived */
      for (const k of ["post", "paint", "env"]) Boot.done(k); threeWarm.then(() => Boot.done("three"));
      film.lastMove = performance.now(); toast(); filmTick(); filmSoundSync(); res(true);   /* a touch before the first frame started the sound early */
    };
    fr.className = "in-film"; v.muted = v.defaultMuted = true; v.playsInline = true; v.preload = "auto"; v.poster = FILM.first; v.disablePictureInPicture = true;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
    v.addEventListener("playing", ok, { once: true }); v.addEventListener("error", fail);
    v.addEventListener("ended", () => { if (film.on) filmTick(); });
    v.src = FILM.src; fr.appendChild(v); el.insertBefore(fr, el.firstChild); film.v = v;
    /* With Sound on, the film first asks the browser for sound without a touch. Where that is allowed (Chrome for an
       installed app, or a site the person plays media on often) the film starts by itself with its sound. Where it is
       refused (every iPhone) the film waits: its first frame holds with "Tap to play" in Tap to Start's place, and the
       first touch starts the film and its sound together, from the first footstep. The same wait covers a phone that
       refuses to start a video by itself (an iPhone in Low Power Mode). With Sound off the film starts by itself. No touch
       in 12 seconds goes to Tap to Start on the last frame. */
    const soundFree = () => {
      const AC = window.AudioContext || window.webkitAudioContext; let ctx = null;
      try { ctx = AC ? new AC() : null; } catch (e) {}
      if (!ctx) return Promise.resolve(null);
      const running = Promise.resolve(ctx.resume ? ctx.resume() : null).then(() => ctx.state === "running", () => false);
      return Promise.race([running, new Promise(r => setTimeout(() => r(false), 400))]).then(yes => { if (yes && ctx.state === "running") return ctx; try { ctx.close(); } catch (e) {} return null; });
    };
    const card = on => {
      if (on && !film.card) { const c = film.card = document.createElement("div"), i = new Image(); c.className = "in-wait"; i.alt = ""; i.decoding = "async"; i.src = FILM.wait; c.appendChild(i); fr.after(c); }
      el.classList.toggle("wait", on);
    };
    const auto = () => { card(false); try { const pl = v.play(); if (pl && pl.catch) pl.catch(refused); } catch (e) { fail(); } setTimeout(() => { if (!film.ask) fail(); }, 5000); };
    const ask = () => {
      if (settled || film.ask) return; film.ask = true;
      const lab = $i("#intap span"), was = lab.textContent; lab.textContent = "Tap to play"; el.classList.add("filmask"); card(true);
      const done = film.askDone = () => { film.askDone = null; card(false); el.classList.remove("filmask"); lab.textContent = was; el.removeEventListener("pointerup", go1, true); };
      const go1 = e => { if (e.target.closest("[data-go]")) return; done(); const p2 = v.play(); if (p2 && p2.catch) p2.catch(fail); setTimeout(fail, 5000); };
      el.addEventListener("pointerup", go1, true);
      for (const k of ["post", "paint", "env"]) Boot.done(k); threeWarm.then(() => Boot.done("three"));
      setTimeout(() => { if (settled || exiting) return; done(); settled = true; film.on = true; el.classList.add("film"); film.endedAt = performance.now(); filmTick(); res(true); }, 12000);
    };
    const refused = e => (e && e.name === "NotAllowedError" ? ask() : fail());
    if (!soundOn) auto();
    else card(true), soundFree().then(ctx => {   /* the card is up at once, so the film's first frame never flashes */
      if (settled || exiting || !film.v) { try { ctx && ctx.close(); } catch (e) {} return; }
      if (!ctx) return ask();
      filmSoundStart(ctx); paintSound(); auto();
    });
  });
  if (mode === "title" || reduce) setPhase("hero");
  /* no ride after 8 seconds (slow network, three.js blocked): Tap to Start on the plain night sky. If the 3D arrives
     later it fades in on the portal shot */
  setTimeout(() => { if (!has3d && !film.tried && phase !== "hero") setPhase("hero"); }, 8000);

  window.Intro = {
    on: true, mode, reduce, el,
    /* intro3d.js waits for this: true when the film is playing, so the 3D ride is not built */
    film: film.ready,
    /* app.js hands over the name, the notices and how to open each place */
    begin(opts) { go = opts.go; notices = opts.notices || notices; paint(); },
    /* app.js: readiness per part (0..1), the tower's share of all 13 areas, and the next stop */
    get audio() { return soundOn ? audio : null; },
    get musicOn() { return musicOn; },
    progress(p) {
      window.__introProg = p; try { localStorage.setItem("eaTaxTown.introProg", JSON.stringify(p)); } catch (e) {}
      scene && scene.progress && scene.progress(p); nextStop(p); plateProgress(p);
    },
    /* intro3d.js */
    attach(s) { if (exiting || !el.isConnected) return false; scene = s; has3d = true; if (plate.on && s.cover) s.cover(true); el.classList.add("has3d"); el.insertBefore(s.canvas, el.firstChild); if (mode === "full") toast(); paint(); return true; },
    no3d() { failed3d = true; if (phase !== "hero") setPhase("hero"); },
    phase: setPhase,
    station(i, w) { if (i !== stationI || w !== waiting) { stationI = i; waiting = w; paint(); } },
    get current() { return phase; }
  };
})();
