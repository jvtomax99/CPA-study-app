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
  window.Boot = { set, done: k => set(k, 1), lit: i => STAGES[i].every(k => F[k] >= 1), progress, loaded: () => progress() >= 0.9999, threeWarm, model, on: fn => subs.push(fn) };

  if (mode === "off" || !el) { window.Intro = { on: false }; return; }

  /* ---------- overlay ---------- */
  const $i = s => el.querySelector(s);
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

  function exit(where) {
    if (exiting) return;
    if (!Boot.loaded()) { queued = where; paint(); return; } /* a tap during loading starts the app the moment loading finishes */
    exiting = true;
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
    if (b) { e.stopPropagation(); if (b.dataset.go === "notices") showNotices(); else exit(b.dataset.go); return; }
    if (el.querySelector(".in-notes")) return;
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
    /* intro3d.js */
    attach(s) { if (exiting || !el.isConnected) return false; scene = s; has3d = true; el.classList.add("has3d"); el.insertBefore(s.canvas, el.firstChild); if (mode === "full") toast(); paint(); return true; },
    no3d() { failed3d = true; if (phase !== "hero") setPhase("hero"); },
    phase: setPhase,
    station(i, w) { if (i !== stationI || w !== waiting) { stationI = i; waiting = w; paint(); } },
    get current() { return phase; }
  };
})();
