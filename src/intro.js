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
  const NAMES = ["Individuals", "Businesses", "Representation"];
  let stationI = 0, waiting = false, phase = "wait", has3d = false, failed3d = false, queued = false, exiting = false, scene = null, go = null, notices = () => [];
  $i("#inbuild").textContent = "__BUILD__";
  const setPhase = p => {
    phase = p; el.dataset.phase = p;
    el.classList.toggle("hero", p === "hero");
    paint();
  };
  function paint() {
    const pr = progress(), done = pr >= 0.9999;
    $i("#inbar").style.width = (pr * 100).toFixed(2) + "%";
    const i = has3d ? stationI : Math.max(0, [0, 1, 2].findIndex(k => !Boot.lit(k)));
    /* the station names only mean something while the train is riding past them */
    const riding = has3d && phase !== "hero" && phase !== "wait";
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
  function unlock() {
    if (!soundOn || audio || !window.IntroAudio || exiting) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { if (navigator.audioSession) navigator.audioSession.type = "ambient"; /* respect the silent switch, mix with the user's music */
      const ctx = new AC(); ctx.resume && ctx.resume(); audio = IntroAudio.build(ctx); unlockedAt = performance.now(); } catch (e) { audio = null; }
    paintSound();
  }
  function paintSound() {
    const b = $i("#insnd"); if (!b) return;
    b.setAttribute("aria-pressed", String(soundOn && !!audio));
    b.querySelector("span").textContent = !soundOn ? "Sound off" : audio ? "Sound on" : "Tap for sound";
    b.classList.toggle("off", !soundOn);
  }
  function toggleSound() {
    if (performance.now() - unlockedAt < 800) { paintSound(); return; } /* this same touch just started the sound: keep it on */
    if (soundOn && audio) { soundOn = false; audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.05); }
    else { soundOn = true; if (audio) audio.master.gain.setTargetAtTime(1.6, audio.ctx.currentTime, 0.05); else unlock(); }
    try { localStorage.setItem("eaTaxTown.sound", soundOn ? "on" : "off"); } catch (e) {}
    paintSound();
  }
  const endSound = (tap) => { if (!audio) return; const a = audio; if (tap && soundOn) { a.scratch(); a.tap(); } else { a.stopMusic(); a.master.gain.setTargetAtTime(0, a.ctx.currentTime, 0.08); }
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
  if (mode === "title" || reduce) setPhase("hero");
  /* no ride after 8 seconds (slow network, three.js blocked): Tap to Start on the plain night sky. If the 3D arrives
     later it fades in on the portal shot */
  setTimeout(() => { if (!has3d && phase !== "hero") setPhase("hero"); }, 8000);

  window.Intro = {
    on: true, mode, reduce, el,
    /* app.js hands over the name, the notices and how to open each place */
    begin(opts) { go = opts.go; notices = opts.notices || notices; paint(); },
    /* app.js: readiness per part (0..1), the tower's share of all 13 areas, and the next stop */
    get audio() { return soundOn ? audio : null; },
    get musicOn() { return musicOn; },
    progress(p) {
      window.__introProg = p; try { localStorage.setItem("eaTaxTown.introProg", JSON.stringify(p)); } catch (e) {}
      scene && scene.progress && scene.progress(p); nextStop(p);
    },
    /* intro3d.js */
    attach(s) { if (exiting || !el.isConnected) return false; scene = s; has3d = true; el.classList.add("has3d"); el.insertBefore(s.canvas, el.firstChild); if (mode === "full") toast(); paint(); return true; },
    no3d() { failed3d = true; if (phase !== "hero") setPhase("hero"); },
    phase: setPhase,
    station(i, w) { if (i !== stationI || w !== waiting) { stationI = i; waiting = w; paint(); } },
    get current() { return phase; }
  };
})();
