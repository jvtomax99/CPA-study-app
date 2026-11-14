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
     Portrait screens get the phone files (780 by 1690), landscape the desktop ones (1920 by 1200). They load during the
     ride; if they haven't arrived by Tap to Start, the 3D portal stays. Rects are in the plate's pixels. */
  /* ---------- the film ----------
     Portrait screens play a film in place of the 3D ride: media/intro-phone.mp4, 13.6 seconds, 1080 by 1920, cut from
     footage made in Runway for this app (the writers running in the yard, the graffiti car with the study buddy, the El
     curve, the chase along the track, the buddy's mural, the bridge, the dive to LAST STOP), with no sound track
     (src/introaudio.js still makes the sound). cuts are where the status line moves on to the next part and where the dive
     starts, pass is when the train passes the camera, title is when ABOVE THE LINE shows over the mural, all in seconds.
     Tap to Start holds on the film's last frame (intro-phone-end.webp) with the title back on; the tower above the portal
     is dimmed from the top down to your mastery through a cut-out of its shape (intro-phone-tower.webp). If the film
     can't start within 5 seconds (blocked autoplay, slow network, data saver) the 3D ride plays as before; ?ride=3d asks
     for it. Landscape screens always get the 3D ride. */
  const FILM = { src: "media/intro-phone.mp4", first: "media/intro-phone-start.webp", last: "media/intro-phone-end.webp", mask: "media/intro-phone-tower.webp", cuts: [4.0, 8.0, 10.5], pass: 3.7, end: 13.6, title: [6.5, 8.0] };
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
  const film = { on: false, v: null, shot: -1, endedAt: 0 };
  let stationI = 0, waiting = false, phase = "wait", has3d = false, failed3d = false, queued = false, exiting = false, scene = null, go = null, notices = () => [];
  $i("#inbuild").textContent = "__BUILD__";
  const setPhase = p => {
    phase = p; el.dataset.phase = p;
    el.classList.toggle("hero", p === "hero");
    if (p === "hero") showPlate();
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
  /* The film's sound is recorded, not synthesized: effects and a beat made in ElevenLabs and mixed to the film's cuts.
     media/intro-mix.mp3 is effects plus the beat (which dips before the arrival and then carries on under Tap to Start),
     intro-sfx.mp3 the effects alone for Music: Off, intro-music.mp3 the beat alone, looped once the mix has run out.
     They are separate from the silent video so both switches keep working; a touch starts them at the film's time. */
  const FSND = { mix: "media/intro-mix.mp3", sfx: "media/intro-sfx.mp3", music: "media/intro-music.mp3", mixLen: 26.4 };
  let fsnd = null;
  function filmSoundStart() {
    if (fsnd || !film.v) return;
    const main = new Audio(musicOn ? FSND.mix : FSND.sfx), loop = musicOn ? new Audio(FSND.music) : null;
    const at = () => film.endedAt ? FILM.end + (performance.now() - film.endedAt) / 1000 : (film.v && film.v.currentTime) || 0;
    main.preload = "auto"; fsnd = { main, loop };
    if (loop) { loop.preload = "auto"; loop.loop = true; main.addEventListener("ended", () => { if (fsnd && soundOn && !exiting) loop.play().catch(() => {}); }); }
    if (loop && at() > FSND.mixLen - 0.5) { loop.play().catch(() => {}); return; }   /* a late first touch: straight to the beat */
    main.addEventListener("loadedmetadata", () => { try { main.currentTime = Math.min(at(), Math.max(0, main.duration - 0.1)); } catch (e) {} }, { once: true });
    main.play().catch(() => {});
  }
  const filmSoundStop = () => { if (!fsnd) return; fsnd.main.pause(); fsnd.loop && fsnd.loop.pause(); };
  function unlock() {
    if (film.v) {   /* the film is on screen: its own sound, not the synthesized ride */
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
    if (fsnd) { soundOn = !soundOn; if (!soundOn) filmSoundStop(); else (fsnd.loop && (fsnd.main.ended || fsnd.main.error) ? fsnd.loop : fsnd.main).play().catch(() => {}); }
    else if (soundOn && audio) { soundOn = false; audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.05); }
    else { soundOn = true; if (audio) audio.master.gain.setTargetAtTime(1.6, audio.ctx.currentTime, 0.05); else unlock(); }
    try { localStorage.setItem("eaTaxTown.sound", soundOn ? "on" : "off"); } catch (e) {}
    paintSound();
  }
  const endSound = (tap) => { if (fsnd) setTimeout(filmSoundStop, tap ? 1000 : 0); if (!audio) return; const a = audio; if (tap && soundOn) { a.scratch(); a.tap(); } else { a.stopMusic(); a.master.gain.setTargetAtTime(0, a.ctx.currentTime, 0.08); }
    setTimeout(() => { try { a.stopMusic(); a.ctx.close(); } catch (e) {} }, tap ? 3800 : 600); };
  el.addEventListener("pointerdown", unlock, true);
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
    const t = v.currentTime, n = v.ended ? 4 : t < FILM.cuts[0] ? 0 : t < FILM.cuts[1] ? 1 : t < FILM.cuts[2] ? 2 : 3;
    if (n !== film.shot) {
      film.shot = n; if (n < 3) stationI = n;
      const ph = n === 0 ? "wide" : n < 3 ? "stations" : n === 3 ? "dive" : "hero";
      if (ph !== phase) setPhase(ph); else paint();
    }
    filmTitle(n === 4 || (t >= FILM.title[0] && t < FILM.title[1]));
    if (n < 4) requestAnimationFrame(filmTick);
  }
  const noFilm = mode !== "full" || reduce || !P.film || new URLSearchParams(location.search).get("ride") === "3d" || !!(navigator.connection && navigator.connection.saveData);
  film.ready = noFilm ? Promise.resolve(false) : new Promise(res => {
    const v = document.createElement("video"), fr = document.createElement("div");
    let settled = false;
    const fail = () => { if (settled) return; settled = true; try { v.pause(); } catch (e) {} fr.remove(); film.v = null; filmSoundStop(); fsnd = null; paintSound(); res(false); };
    const ok = () => {
      if (settled) return; settled = true; film.on = true; el.classList.add("film");
      /* no 3D to build: its load stages are done once three.js (the town needs it) has arrived */
      for (const k of ["post", "paint", "env"]) Boot.done(k); threeWarm.then(() => Boot.done("three"));
      toast(); filmTick(); res(true);
    };
    fr.className = "in-film"; v.muted = v.defaultMuted = true; v.playsInline = true; v.preload = "auto"; v.poster = FILM.first; v.disablePictureInPicture = true;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-hidden", "true");
    v.addEventListener("playing", ok, { once: true }); v.addEventListener("error", fail);
    v.addEventListener("ended", () => { film.endedAt = performance.now(); if (film.on) filmTick(); });
    v.src = FILM.src; fr.appendChild(v); el.insertBefore(fr, el.firstChild); film.v = v; fit(fr); window.addEventListener("resize", () => fit(fr));
    try { const pl = v.play(); if (pl && pl.catch) pl.catch(fail); } catch (e) { fail(); }
    setTimeout(fail, 5000);
  });
  if (mode === "title" || reduce) setPhase("hero");
  /* no ride after 8 seconds (slow network, three.js blocked): Tap to Start on the plain night sky. If the 3D arrives
     later it fades in on the portal shot */
  setTimeout(() => { if (!has3d && !film.on && phase !== "hero") setPhase("hero"); }, 8000);

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
