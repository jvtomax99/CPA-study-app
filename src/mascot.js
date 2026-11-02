/* The study buddy on the home card. Ported from Dr. Smiley's hello in the Interp app:
   numbers and equations spiral in from the edges, lock into a ring around "A = L + E",
   pulse once, then spin down into him with a flash and a burst of gold stars. He springs
   in, the coach bubble pops up beside him, and a thought cloud types a pep talk.
   The full hello plays once per app load. Tapping him gives a hop and a new pep talk.
   renderHome (app.js) writes the .buddy markup and calls Mascot.mount(hero). */
(() => {
  const TAU = Math.PI * 2;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ART = "art/mascot.webp";
  const art = new Image(); art.decoding = "async"; art.src = ART;

  const PEP = [
    "You’ve got this!", "Small wins add up.", "One tower at a time.", "Progress compounds.",
    "Every question counts.", "Keep the streak alive!", "Ten questions. Go!", "Tax law fears you.",
    "Your future self says thanks.", "Balance the books, then rest.", "Debits left, credits right.",
    "Due reviews first, then new ones.", "Tap me for another."
  ];
  let lastPep = -1;
  function pickPep() {
    let n = Math.floor(Math.random() * (PEP.length - 1));
    if (lastPep >= 0 && n >= lastPep) n++;
    if (lastPep < 0) n = Math.floor(Math.random() * PEP.length);
    lastPep = n; return PEP[n];
  }

  const clamp = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const win = (t, a, b) => clamp((t - a) / (b - a));
  const easeOut3 = x => 1 - Math.pow(1 - clamp(x), 3), easeIn3 = x => Math.pow(clamp(x), 3);
  const back = (x, k) => { x = clamp(x); const c = k + 1; return 1 + c * Math.pow(x - 1, 3) + k * Math.pow(x - 1, 2); };

  /* ---------- thought cloud (Dr. Smiley's "Sparkle Float", in cream and mint) ---------- */
  const BUMPS = [[26,46,19],[46,30,22],[72,24,25],[99,31,21],[117,47,16],[96,56,19],[64,59,20],[34,58,15]];
  const SHAPES = '<rect x="14" y="34" width="112" height="36" rx="18"/>' + BUMPS.map(b => `<circle cx="${b[0]}" cy="${b[1]}" r="${b[2]}"/>`).join("");
  const DOTS = [{ x: 155, y: 37, r: 3.2 }, { x: 145, y: 27, r: 5 }]; /* trailing right, to his head */
  const SPARKS = [[8,8],[132,14],[124,74],[58,-4]];
  const GLYPHS = [[4,10,"$"],[136,4,"%"],[128,80,"+"],[64,-10,"="],[100,-8,"÷"]];
  let cloudSeq = 0;
  function split(text) {
    const w = String(text).split(/\s+/); if (w.length < 2) return [text, ""];
    let best = [text, ""], score = 1e9;
    for (let i = 1; i < w.length; i++) { const a = w.slice(0, i).join(" "), b = w.slice(i).join(" "), s = Math.max(a.length, b.length); if (s < score) { score = s; best = [a, b]; } }
    return best;
  }
  function makeCloud(button, text) {
    const id = "bc" + (++cloudSeq), lines = split(text);
    const el = document.createElement("span");
    el.className = "buddy-thought"; el.setAttribute("aria-hidden", "true");
    el.innerHTML = `<svg class="buddy-cloudsvg" viewBox="-30 -20 180 110" width="180" height="110" focusable="false">
      <defs>
        <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFDF4"/><stop offset=".5" stop-color="#E4F6EA"/><stop offset="1" stop-color="#B6E6C8"/></linearGradient>
        <clipPath id="${id}c">${SHAPES}</clipPath>
        <filter id="${id}s" x="-25%" y="-25%" width="150%" height="170%"><feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#9BE3B8" flood-opacity=".8"/><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#0b0a24" flood-opacity=".35"/></filter>
        <filter id="${id}b"><feGaussianBlur stdDeviation="2.5"/></filter>
      </defs>
      ${DOTS.map(d => `<circle class="bc-dot" cx="${d.x}" cy="${d.y}" r="${d.r}" fill="#EAF8EF" stroke="#fff" stroke-width="1.5" filter="url(#${id}s)"/>`).join("")}
      <g class="bc-body">
        <g filter="url(#${id}s)"><g fill="#fff" stroke="#fff" stroke-width="5" stroke-linejoin="round">${SHAPES}</g><g fill="url(#${id}g)">${SHAPES}</g></g>
        <g clip-path="url(#${id}c)"><ellipse cx="52" cy="18" rx="24" ry="7" fill="#fff" opacity=".85" filter="url(#${id}b)"/><circle cx="102" cy="24" r="3" fill="#fff"/></g>
        <text x="70" y="41" text-anchor="middle" class="bc-text"><tspan class="bc-l1" x="70"></tspan><tspan class="bc-l2" x="70" dy="15"></tspan></text>
      </g>
      ${SPARKS.map((p, i) => `<path class="bc-spark" d="M0 -6 Q0 0 6 0 Q0 0 0 6 Q0 0 -6 0 Q0 0 0 -6Z" fill="${i % 2 ? "#fff" : "#FFD27A"}" opacity="0"/>`).join("")}
      ${GLYPHS.map(g => `<text class="bc-glyph" text-anchor="middle" dominant-baseline="central" opacity="0">${g[2]}</text>`).join("")}
    </svg>`;
    document.body.appendChild(el);
    const b = button.getBoundingClientRect(), room = document.documentElement.clientWidth - 4;
    let left = b.left - 150, top = b.top + 4, sc = 1;
    if (left < 8) { sc = Math.max(0.7, (b.left - 8) / 150); left = b.left - 150 * sc; el.style.transformOrigin = "100% 0"; }
    left = Math.max(8, Math.min(room - 150, left));
    el.style.left = (left + window.scrollX) + "px"; el.style.top = (top + window.scrollY) + "px";
    if (sc < 1) el.style.scale = sc.toFixed(3);
    const q = s => [...el.querySelectorAll(s)];
    const body = el.querySelector(".bc-body"), dots = q(".bc-dot"), sparks = q(".bc-spark"), glyphs = q(".bc-glyph");
    const l1 = el.querySelector(".bc-l1"), l2 = el.querySelector(".bc-l2");
    const G0 = [120, 64];
    let shown = -1;
    function update(ms) {
      const t = ms / 1000, a = t - 0.3;
      const jig = a < 0 ? 0 : Math.exp(-4.2 * a) * Math.sin(a * 22), grow = a < 0 ? 0 : back(a / 0.45, 1.6);
      const out = win(t, 5.3, 6.2);
      const ty = -6 * smooth(win(t, 0.9, 5.3)) - 1.5 * Math.sin(TAU * t / 2) - 18 * smooth(out);
      const op = (a < 0 ? 0 : 1) * (1 - smooth(out));
      el.style.opacity = op > 0 || t < 0.4 ? "1" : "0";
      body.setAttribute("transform", `translate(0 ${ty.toFixed(2)}) translate(${G0[0]} ${G0[1]}) scale(${Math.max(0, grow + 0.1 * jig).toFixed(4)} ${Math.max(0, grow - 0.1 * jig).toFixed(4)}) translate(${-G0[0]} ${-G0[1]})`);
      body.setAttribute("opacity", op.toFixed(3));
      [back(win(t, 0, 0.2), 2.2), back(win(t, 0.1, 0.3), 2.2)].forEach((v, i) => {
        v *= 1 - smooth(win(t, 5.2, 5.5)); const d = DOTS[i];
        dots[i].setAttribute("transform", `translate(${d.x} ${d.y}) scale(${Math.max(0, v).toFixed(3)}) translate(${-d.x} ${-d.y})`);
      });
      const total = lines[0].length + lines[1].length, chars = Math.floor(clamp((t - 0.75) / 0.8) * total);
      if (chars !== shown) { shown = chars; l1.textContent = lines[0].slice(0, chars); l2.textContent = lines[1].slice(0, Math.max(0, chars - lines[0].length)); }
      const lit = t > 0.9 && t < 5.4;
      sparks.forEach((s, i) => { const ph = (t * 1.3 + i * 0.27) % 1, k = lit ? Math.sin(Math.PI * ph) * 1.2 : 0, p = SPARKS[i];
        s.setAttribute("opacity", k > 0 ? 1 : 0); s.setAttribute("transform", `translate(${p[0]} ${(p[1] + ty).toFixed(1)}) rotate(${(ph * 90).toFixed(1)}) scale(${k.toFixed(3)})`); });
      glyphs.forEach((g, i) => { const ph = (t * 0.55 + i * 0.21) % 1, p = GLYPHS[i], on = lit ? Math.sin(Math.PI * ph) * op : 0;
        g.setAttribute("opacity", on.toFixed(3)); g.setAttribute("transform", `translate(${p[0]} ${(p[1] + ty - 8 * ph).toFixed(1)}) rotate(${(ph * 40 - 20).toFixed(1)}) scale(${(0.8 + 0.5 * Math.sin(Math.PI * ph)).toFixed(3)})`); });
      return t < 6.3;
    }
    update(0);
    return { update, remove() { el.remove(); } };
  }

  /* One cloud at a time, on its own clock, taken down when Home goes away. */
  let cloud = null;
  function stopCloud() { if (!cloud) return; cancelAnimationFrame(cloud.frame); cloud.c.remove(); window.removeEventListener("resize", cloud.onResize); cloud = null; }
  function think(button, text, holdStill) {
    stopCloud();
    const status = button.querySelector(".buddy-status");
    if (status) status.textContent = text;
    const c = makeCloud(button, text), w = window.innerWidth;
    const me = { c, frame: 0, onResize: () => { if (window.innerWidth !== w) stopCloud(); } };
    cloud = me; window.addEventListener("resize", me.onResize, { passive: true });
    // With reduced motion the cloud just sits there, finished, for its 6.5 seconds.
    if (holdStill) c.update(2500);
    let t0 = null;
    const step = now => {
      if (cloud !== me) return;
      if (!button.isConnected) return stopCloud();
      if (t0 === null) t0 = now;
      if (holdStill ? now - t0 > 6500 : !c.update(now - t0)) return stopCloud();
      me.frame = requestAnimationFrame(step);
    };
    me.frame = requestAnimationFrame(step);
    return me;
  }

  /* ---------- the opening: numbers and equations spiral into him ---------- */
  const TOKENS = ["7", "$", "%", "+", "3", "÷", "=", "9", "×", "1040", "Σ", "−", "0", "W-2"];
  const TOKEN_INK = ["#FFD27A", "#FFFFFF", "#9BE3B8"];
  const RING = 70, OPEN_END = 3400, FACE_AT = 2380, ENTER_MS = 460, COACH_AT = 2700, CLOUD_AT = 2880;
  const sprite = rgb => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.35, `rgba(${rgb},.4)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return c; };
  let GLOW = null;
  const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  // His arrival as the ring collapses into him: he grows whole, turning upright as he lands.
  function enterPose(t) {
    if (t >= ENTER_MS) return null;
    const p = t / ENTER_MS, spring = 1 - Math.exp(-6 * p) * Math.cos(8 * p);
    const s = 0.08 + 0.92 * Math.min(1.03, spring), angle = -10 * (1 - p) * (1 - p), y = 8 * (1 - p);
    return { opacity: Math.min(1, p * 5), transform: `translate3d(0,${y.toFixed(2)}px,0) rotate(${angle.toFixed(2)}deg) scale(${s.toFixed(4)})` };
  }

  let played = false, running = null;
  function stopOpening() { if (running) running(); }

  async function hello(hero, button) {
    const body = button.querySelector(".buddy-body"), coach = hero.querySelector(".coach");
    button.classList.add("buddy-pending");
    try { await art.decode(); } catch (e) { button.classList.remove("buddy-pending"); return; }
    if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 600))]);
    if (!button.isConnected) return;
    if (reduced.matches || document.hidden || !button.animate) { button.classList.remove("buddy-pending"); think(button, pickPep(), true); return; }

    const canvas = document.createElement("canvas");
    canvas.className = "buddy-canvas"; canvas.setAttribute("aria-hidden", "true");
    const ctx = canvas.getContext("2d");
    if (!ctx) { button.classList.remove("buddy-pending"); return; }
    hero.appendChild(canvas);
    const box = hero.getBoundingClientRect(), b = button.getBoundingClientRect();
    const w = box.width, h = box.height, bx = b.left - box.left + b.width / 2, by = b.top - box.top + b.height * 0.44;
    // The ring forms where it fits inside the card, then glides into him as it spins down.
    const fx = Math.max(RING + 26, Math.min(bx, w - RING - 26)), fy = Math.max(RING + 20, by);
    let cx = fx, cy = fy;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const layer = document.createElement("canvas"); layer.width = canvas.width; layer.height = canvas.height;
    const lctx = layer.getContext("2d");
    if (!GLOW) GLOW = { mint: sprite("150,235,190"), gold: sprite("255,214,130"), white: sprite("255,255,255") };
    const glowAt = (spr, x, y, r, a) => { if (a <= 0 || r <= 0) return; ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = a; ctx.drawImage(spr, x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; };
    const reach = Math.hypot(Math.max(fx, w - fx), Math.max(fy, h - fy)) + 30;
    const N = TOKENS.length, TURN = 1.25 * TAU;

    function star(x, y, r, rot, a, color) {
      if (a <= 0 || r <= 0) return; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = a; ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.quadraticCurveTo(0, 0, 0, r); ctx.quadraticCurveTo(0, 0, -r, 0); ctx.quadraticCurveTo(0, 0, 0, -r); ctx.fill(); ctx.restore();
    }
    function ring(r, a, width, rgb) { if (a <= 0) return; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.8, -0.2, 0, TAU); ctx.strokeStyle = `rgba(${rgb},${a.toFixed(3)})`; ctx.lineWidth = width; ctx.stroke(); }
    // Where token i is at time t: a spiral in from the edge to its slot on the ring,
    // then the whole ring spins down into him.
    function spot(i, t, collapse, spin, scale) {
      const st = 80 + (i % 7) * 70 + (i >= 7 ? 35 : 0);
      const f = back(win(t, st, st + 760), 1.25);
      const slot = i / N * TAU - Math.PI / 2;
      const r = (reach + (RING - reach) * f) * scale * (1 - 0.94 * collapse);
      const a = slot - (1 - f) * TURN + spin;
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.86, f, st, a };
    }
    function drawOpening(t) {
      ctx.clearRect(0, 0, w, h);
      const collapse = smooth(win(t, 1750, 2350)), spin = easeIn3(win(t, 1750, 2350)) * TAU * 1.5;
      const glide = smooth(win(t, 1700, 2300)); cx = fx + (bx - fx) * glide; cy = fy + (by - fy) * glide;
      const beat = Math.sin(Math.PI * win(t, 1650, 1780)), scale = 1 + 0.08 * beat;
      const rays = smooth(win(t, 1050, 1450)) * (1 - smooth(win(t, 1800, 2250)));
      if (rays > 0) {
        const len = Math.max(170, h * 0.35);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(t / 1000 * 0.6); ctx.globalCompositeOperation = "lighter";
        for (let n = 0; n < 10; n++) {
          ctx.rotate(TAU / 10); const gr = ctx.createLinearGradient(0, 0, 0, -len);
          gr.addColorStop(0, `rgba(255,226,160,${((0.3 + 0.2 * beat) * rays).toFixed(3)})`); gr.addColorStop(1, "rgba(255,226,160,0)");
          ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-14, -len); ctx.lineTo(14, -len); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
      glowAt(GLOW.mint, cx, cy, 96 * (1 - collapse * 0.6), (0.4 + 0.3 * beat + 0.15 * rays) * smooth(win(t, 900, 1300)) * (1 - collapse));
      lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.clearRect(0, 0, layer.width, layer.height); lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const alpha = clamp(t / 120) * (1 - smooth(win(t, 2300, 2420))), k = scale * (1 - 0.92 * collapse);
      const landings = [];
      lctx.textAlign = "center"; lctx.textBaseline = "middle";
      for (let i = 0; i < N; i++) {
        const p = spot(i, t, collapse, spin, scale), tok = TOKENS[i];
        if (p.f > 0 && p.f < 1) {
          const pts = []; for (let j = 5; j >= 0; j--) pts.push(spot(i, t - j * 18, collapse, spin, scale));
          for (let j = 1; j < pts.length; j++) { const q = j / pts.length; ctx.beginPath(); ctx.moveTo(pts[j - 1].x, pts[j - 1].y); ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(255,222,150,${(0.4 * q).toFixed(3)})`; ctx.lineWidth = 3 * q; ctx.lineCap = "round"; ctx.stroke(); }
        }
        const size = (tok.length > 2 ? 13 : 20) * k;
        glowAt(GLOW.mint, p.x, p.y, size * 1.3, alpha * 0.5);
        if (alpha > 0 && size > 1) {
          lctx.save(); lctx.translate(p.x, p.y); lctx.rotate((1 - clamp(p.f)) * 3 + spin); lctx.globalAlpha = alpha;
          lctx.font = `800 ${size.toFixed(1)}px Inter, system-ui, sans-serif`;
          lctx.lineWidth = Math.max(1, size * 0.16); lctx.strokeStyle = "rgba(11,10,36,.55)"; lctx.strokeText(tok, 0, 0);
          lctx.fillStyle = TOKEN_INK[i % 3]; lctx.fillText(tok, 0, 0); lctx.restore();
        }
        const land = win(t, p.st + 760, p.st + 1160); if (land > 0 && land < 1) landings.push([p.x, p.y, land, i]);
      }
      // the accounting equation glows in the middle of the ring
      const eq = smooth(win(t, 1100, 1400)) * alpha;
      if (eq > 0) {
        const s = 17 * k;
        lctx.save(); lctx.translate(cx, cy); lctx.rotate(spin); lctx.scale(0.7 + 0.3 * back(win(t, 1100, 1450), 2), 0.7 + 0.3 * back(win(t, 1100, 1450), 2));
        lctx.globalAlpha = eq; lctx.font = `800 ${s.toFixed(1)}px Inter, system-ui, sans-serif`;
        lctx.lineWidth = Math.max(1, s * 0.18); lctx.strokeStyle = "rgba(11,10,36,.6)"; lctx.strokeText("A = L + E", 0, 0);
        lctx.fillStyle = "#FFFFFF"; lctx.fillText("A = L + E", 0, 0); lctx.restore();
      }
      const shine = win(t, 1250, 1650);
      if (shine > 0 && shine < 1) {
        const gx = cx - RING * 1.4 + shine * RING * 2.8, gr = lctx.createLinearGradient(gx - 24, cy - 60, gx + 24, cy + 60);
        gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
        lctx.globalCompositeOperation = "source-atop"; lctx.fillStyle = gr; lctx.fillRect(0, 0, w, h); lctx.globalCompositeOperation = "source-over";
      }
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(layer, 0, 0); ctx.restore();
      for (const [x, y, a, i] of landings) {
        ctx.beginPath(); ctx.arc(x, y, 6 + 14 * easeOut3(a), 0, TAU); ctx.strokeStyle = `rgba(255,236,190,${((1 - a) * 0.8).toFixed(3)})`; ctx.lineWidth = 1.4; ctx.stroke();
        for (let n = 0; n < 3; n++) { const ang = n * 2.1 + i, d = 8 + 14 * easeOut3(a); star(x + Math.cos(ang) * d, y + Math.sin(ang) * d, 4 * (1 - a), a * 3, 1 - a, n % 2 ? "#FFFFFF" : "#FFD27A"); }
      }
      const fl = win(t, 2330, 2780);
      if (fl > 0 && fl < 1) { glowAt(GLOW.white, cx, cy, 30 + 90 * fl, (1 - fl) * 0.95); ring(20 + 140 * easeOut3(fl), (1 - fl) * 0.8, 2.4, "214,255,232"); ring(10 + 96 * easeOut3(fl), (1 - fl) * 0.55, 1.2, "255,226,168"); }
      const bst = win(t, 2360, 3300);
      if (bst > 0 && bst < 1) for (let n = 0; n < 14; n++) {
        const ang = n / 14 * TAU + rnd(n) * 0.2, d = 18 + 96 * easeOut3(bst), sx = cx + Math.cos(ang) * d * 1.2, sy = cy + Math.sin(ang) * d * 0.9;
        glowAt(GLOW.gold, sx, sy, 14 * (1 - bst), (1 - bst) * 0.8); star(sx, sy, 9 * (1 - bst * 0.7), bst * 4, 1 - bst, n % 2 ? "#FFFFFF" : "#FFD45A");
      }
    }

    // Browser animations for the halo, shine, glints and coach bubble, moved along by the same clock.
    let anims = [];
    const anim = (el, frames, opts) => { if (!el) return; const a = el.animate(frames, opts); a.pause(); a.currentTime = 0; anims.push(a); };
    anim(button.querySelector(".buddy-halo"), [{ transform: "scale(.6)", opacity: 0 }, { transform: "scale(1.05)", opacity: 0.45, offset: 0.55 }, { transform: "scale(1.6)", opacity: 1, offset: 0.7 }, { transform: "scale(1)", opacity: 0.6 }], { duration: 3500, easing: "ease-in-out" });
    anim(button.querySelector(".buddy-shine"), [{ opacity: 0, backgroundPosition: "100% 0" }, { opacity: 0.5, offset: 0.3 }, { opacity: 0, backgroundPosition: "0% 0" }], { duration: 950, delay: 2710, easing: "ease-in-out" });
    button.querySelectorAll(".buddy-glint").forEach((el, i) => anim(el, [{ opacity: 0, transform: "scale(.3) rotate(-25deg)" }, { opacity: 0.9, transform: "scale(1.05) rotate(15deg)", offset: 0.4 }, { opacity: 0, transform: "scale(.5) rotate(35deg)" }], { duration: 600, delay: 2940 + i * 550 }));
    anim(coach, [{ opacity: 0, transform: "translateY(8px) scale(.86)" }, { opacity: 1, transform: "none" }], { duration: 460, delay: COACH_AT, fill: "backwards", easing: "cubic-bezier(.3,1.4,.5,1)" });

    let frame = 0, last = null, elapsed = 0, entered = false, thought = false;
    button.classList.add("buddy-entering");
    const land = () => { entered = true; body.style.transform = ""; body.style.opacity = ""; button.classList.remove("buddy-entering"); };
    const stop = () => {
      cancelAnimationFrame(frame); anims.forEach(a => a.cancel()); anims = [];
      if (!entered) land(); canvas.remove(); button.classList.remove("buddy-pending");
      if (running === stop) running = null;
    };
    stopOpening(); running = stop;
    button.classList.remove("buddy-pending");
    const place = t => {
      if (entered) return;
      if (t < FACE_AT) { body.style.opacity = "0"; return; }
      const pose = enterPose(t - FACE_AT); if (!pose) return land();
      body.style.transform = pose.transform; body.style.opacity = String(pose.opacity);
    };
    place(0);
    const draw = now => {
      if (!button.isConnected) return stop();
      // A short stall (the 3D town loading) slows the hello down instead of skipping it;
      // a very slow device still finishes within a few seconds.
      if (last !== null) elapsed += Math.min(100, Math.max(0, now - last));
      last = now;
      anims.forEach(a => { a.currentTime = elapsed; });
      place(elapsed);
      if (elapsed >= CLOUD_AT && !thought) { thought = true; think(button, pickPep()); }
      if (elapsed < OPEN_END) drawOpening(elapsed);
      else return stop();
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
  }

  /* ---------- tap: a hop, a puff of numbers off the calculator, a new pep talk ---------- */
  function hop(button) {
    const body = button.querySelector(".buddy-body");
    if (!reduced.matches && body.animate) {
      body.animate([
        { transform: "none" }, { transform: "translateY(2px) scale(1.06,.92)", offset: 0.15 },
        { transform: "translateY(-16px) scale(.96,1.05)", offset: 0.45 }, { transform: "translateY(1px) scale(1.05,.95)", offset: 0.75 }, { transform: "none" }
      ], { duration: 620, easing: "ease-out" });
      const puff = ["+", "$", "%", "=", "7"];
      puff.forEach((g, i) => {
        const s = document.createElement("span"); s.className = "buddy-puff"; s.textContent = g; s.setAttribute("aria-hidden", "true");
        s.style.left = (62 + i * 6) + "%"; s.style.top = "52%"; button.appendChild(s);
        const dx = (i - 2) * 14 + (Math.random() * 8 - 4), dy = -50 - Math.random() * 30;
        s.animate([{ opacity: 0, transform: "translate(-50%,-50%) scale(.4)" }, { opacity: 1, transform: `translate(calc(-50% + ${dx * 0.4}px), calc(-50% + ${dy * 0.4}px)) scale(1.1)`, offset: 0.3 }, { opacity: 0, transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.8) rotate(${dx}deg)` }],
          { duration: 900, delay: i * 40, easing: "ease-out", fill: "backwards" }).onfinish = () => s.remove();
      });
    }
    think(button, pickPep(), reduced.matches);
  }

  window.Mascot = {
    src: ART,
    mount(hero) {
      const button = hero && hero.querySelector(".buddy");
      if (!button) return;
      button.onclick = () => hop(button);
      if (!played) { played = true; hello(hero, button); }
    },
    leave() { stopOpening(); stopCloud(); }
  };
})();
