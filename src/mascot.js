/* The greeting at the top of Home, with the study buddy. Ported from Dr. Smiley's hello in
   the Interp app (home-polish.js / home-polish.css there):
   - a night Midtown skyline (drawn here, no photo), "Good morning," and the date, the
     person's name in Parisienne, a tax quote of the day in Lora italic;
   - the buddy as a bust popping out of a gold-coin disc, with a ring of numbers turning
     behind it (Dr. Smiley's ring is the Hackensack mark's sixteen squares);
   - a "Play" button on the calculator he holds (where Dr. Smiley has his "Ask" badge);
   - the hello, once per app load: numbers and equations spiral in from the edges, lock
     into a ring around "A = L + E", pulse, then spin down into him with a flash and gold
     stars. He springs in, Play lights up on his calculator, his name is written in, and
     a thought cloud types a pep talk. Tapping him gives a hop and a new pep talk.
   renderHome (app.js) puts Mascot.greeting(...) at the top and calls Mascot.mount(). */
(() => {
  const TAU = Math.PI * 2;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ART = "art/buddy-bust.webp";
  const art = new Image(); art.decoding = "async"; art.src = ART;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* Bust geometry, in fractions of his picture's width S (art/buddy-bust.webp, cut from the
     full figure; it is S wide and ART_H * S tall, reaching below the calculator so his body
     fills the whole disc). The disc sits round his shoulders; his head pops out above its
     centre line, and so does the calculator he holds, over the disc's lower right rim. */
  const DISC = { x: 0.48, y: 0.80, r: 0.34 }, ART_H = 464 / 360;
  // The calculator and his hand, measured on the picture, from where its left edge meets the
  // disc round to the top-right corner (clockwise in reverse: bottom, right side, top).
  const CALC = [[0.5475, 1.2], [0.8625, 1.269], [0.9625, 1.2125], [0.975, 1.0875], [1.006, 0.9125], [1.01, 0.8]];
  // Clip for the picture: above the disc's centre line, the disc below it, plus the calculator.
  const FACE_CLIP = (() => {
    const P = (x, y) => `${(x * 100).toFixed(2)}% ${(y / ART_H * 100).toFixed(2)}%`;
    const pts = [P(-0.4, -0.4), P(1.4, -0.4), P(1.4, DISC.y)];
    for (let i = CALC.length - 1; i >= 0; i--) pts.push(P(CALC[i][0], CALC[i][1]));
    // round the disc from where the calculator's left edge meets it, to the left rim
    const a0 = Math.acos((0.5375 - DISC.x) / DISC.r);
    for (let k = 0; k <= 10; k++) { const a = a0 + (Math.PI - a0) * k / 10; pts.push(P(DISC.x + DISC.r * Math.cos(a), DISC.y + DISC.r * Math.sin(a))); }
    pts.push(P(-0.4, DISC.y));
    return `polygon(${pts.join(",")})`;
  })();

  /* Quote of the day. Wording as published:
     Franklin, letter to Jean-Baptiste Le Roy, Nov. 13, 1789.
     Holmes, dissenting, Compañía General de Tabacos de Filipinas v. Collector, 275 U.S. 87, 100 (1927).
     Learned Hand, Helvering v. Gregory, 69 F.2d 809, 810 (2d Cir. 1934).
     Marshall, McCulloch v. Maryland, 17 U.S. 316, 431 (1819).
     Conan Doyle, "A Scandal in Bohemia" (1891), Sherlock Holmes speaking. */
  const QUOTES = [
    ["In this world nothing can be said to be certain, except death and taxes.", "Benjamin Franklin"],
    ["Taxes are what we pay for civilized society.", "Oliver Wendell Holmes Jr."],
    ["Any one may so arrange his affairs that his taxes shall be as low as possible.", "Judge Learned Hand"],
    ["The power to tax involves the power to destroy.", "Chief Justice John Marshall"],
    ["It is a capital mistake to theorize before one has data.", "Arthur Conan Doyle"]
  ];

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

  /* ---------- the night Midtown skyline, drawn once ---------- */
  let skyline = "";
  function drawSkyline() {
    if (skyline) return skyline;
    let seed = 7; const R = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const W = 400, H = 280, out = [];
    out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">
      <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#090822"/><stop offset=".45" stop-color="#17143e"/><stop offset=".75" stop-color="#33255a"/><stop offset="1" stop-color="#6b3d5e"/></linearGradient>
      <radialGradient id="g" cx=".5" cy="1" r=".7"><stop offset="0" stop-color="#d9876e" stop-opacity=".45"/><stop offset="1" stop-color="#d9876e" stop-opacity="0"/></radialGradient>
      <radialGradient id="m" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff6dc" stop-opacity=".5"/><stop offset="1" stop-color="#fff6dc" stop-opacity="0"/></radialGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#s)"/><rect y="${H * 0.45}" width="${W}" height="${H * 0.55}" fill="url(#g)"/>`);
    for (let i = 0; i < 60; i++) out.push(`<circle cx="${(R() * W).toFixed(1)}" cy="${(R() * H * 0.5).toFixed(1)}" r="${(0.3 + R() * 0.8).toFixed(2)}" fill="#fff" opacity="${(0.25 + R() * 0.6).toFixed(2)}"/>`);
    out.push(`<circle cx="214" cy="38" r="22" fill="url(#m)"/><path d="M214 28a10 10 0 1 0 9 14 8 8 0 0 1-9-14z" fill="#fff3d0"/>`);
    const windows = (x, y, w, h, p, lit) => {
      for (let wy = y + 5; wy < h + y - 4; wy += 6) for (let wx = x + 3; wx < x + w - 3; wx += 5)
        if (R() < p) out.push(`<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="2.4" height="3.2" fill="${lit[Math.floor(R() * lit.length)]}" opacity="${(0.5 + R() * 0.5).toFixed(2)}"/>`);
    };
    // far blocks
    for (let x = -6; x < W;) { const w = 14 + R() * 18, h = 50 + R() * 70; out.push(`<rect x="${x.toFixed(1)}" y="${(H - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#2a2354"/>`); windows(x, H - h, w, h, 0.08, ["#8f84c9", "#c9b4ff"]); x += w + 1; }
    // two landmarks: a stepped tower with a mast, a tower with a stepped crown and spire
    const step = (cx, base, tiers, color) => { let y = base; for (const [w, h] of tiers) { y -= h; out.push(`<rect x="${cx - w / 2}" y="${y}" width="${w}" height="${h + 1}" fill="${color}"/>`); windows(cx - w / 2, y, w, h, 0.22, ["#ffd27a", "#ffe9b0", "#9be3b8"]); } return y; };
    let top = step(92, H, [[40, 120], [30, 36], [20, 18], [12, 10]], "#1d1946");
    out.push(`<rect x="90.5" y="${top - 26}" width="3" height="26" fill="#1d1946"/><circle cx="92" cy="${top - 27}" r="1.6" fill="#ff5d6c"/>`);
    top = step(300, H, [[34, 150], [24, 16]], "#1d1946");
    for (let k = 0; k < 4; k++) out.push(`<path d="M${300 - 12 + k * 3} ${top - k * 7} q${12 - k * 3} -${10 - k} ${24 - k * 6} 0" fill="none" stroke="#e7d9a8" stroke-width="1.4" opacity=".85"/>`);
    out.push(`<path d="M300 ${top - 50} L302 ${top - 26} L298 ${top - 26}Z" fill="#e7d9a8"/><circle cx="300" cy="${top - 51}" r="1.4" fill="#ff5d6c"/>`);
    // near blocks
    for (let x = -4; x < W;) { const w = 18 + R() * 26, h = 24 + R() * 60; out.push(`<rect x="${x.toFixed(1)}" y="${(H - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#120f30"/>`); windows(x, H - h, w, h, 0.16, ["#ffd27a", "#ffe9b0", "#ffb35c"]); x += w + 2; }
    out.push(`<rect y="${H - 8}" width="${W}" height="8" fill="#0b0a22"/></svg>`);
    skyline = "data:image/svg+xml," + encodeURIComponent(out.join(""));
    return skyline;
  }

  /* ---------- the greeting markup ---------- */
  const RING_GLYPHS = ["$", "7", "%", "+", "3", "÷", "=", "9", "×", "Σ", "−", "0"];
  function greeting({ name, pill }) {
    const now = new Date(), h = now.getHours();
    const hello = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    const day = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5), [q, who] = QUOTES[day % QUOTES.length];
    const nm = (name || "").trim(), shown = nm || "Welcome";
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const ring = RING_GLYPHS.map((g, i) => { const a = i / RING_GLYPHS.length * TAU - Math.PI / 2;
      return `<span class="rg" style="left:${(50 + 50 * Math.cos(a)).toFixed(2)}%;top:${(50 + 50 * Math.sin(a)).toFixed(2)}%;--i:${i}"><i>${g}</i></span>`; }).join("");
    return `<section class="greet" aria-label="Greeting">
      <div class="greet-sky" style="background-image:url(&quot;${drawSkyline()}&quot;)"></div>
      <div class="greet-scrim"></div>
      <div class="greet-text">
        <div class="greet-meta"><span class="greet-eyebrow">${hello}${nm ? "," : ""}</span><time datetime="${iso}">${now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</time></div>
        <h2 class="greet-name${shown.length > 9 ? " is-long" : ""}">${esc(shown)}</h2>
        <div class="greet-row">
          <div class="greet-side">${pill ? `<span class="greet-pill">${pill}</span>` : ""}</div>
          <div class="buddy" id="buddy">
            <span class="buddy-ring" aria-hidden="true">${ring}</span>
            <span class="buddy-disc" aria-hidden="true"></span>
            <span class="buddy-fig">
              <button class="buddy-face" id="buddyface" type="button" aria-label="Your study buddy. Tap for a pep talk.">
                <span class="buddy-body"><img class="buddy-art" src="${ART}" alt="" width="360" height="464" decoding="async" style="clip-path:${FACE_CLIP}"><span class="buddy-shine" style="clip-path:${FACE_CLIP}"></span></span>
              </button>
              <button class="buddy-play" id="buddyplay" type="button" aria-label="Play: start a drill"><span class="bp-key"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7.5-4.5z" fill="currentColor"/></svg>Play</span></button>
            </span>
            <span class="buddy-glint a" aria-hidden="true">✦</span><span class="buddy-glint b" aria-hidden="true">✦</span>
            <span class="buddy-status" aria-live="polite"></span>
          </div>
        </div>
        <blockquote class="greet-quote">“${esc(q)}”<cite>${esc(who)}</cite></blockquote>
      </div>
    </section>`;
  }

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
  function makeCloud(face, text) {
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
    // To his left, level with his face, the dots trailing to his head.
    const b = face.getBoundingClientRect(), room = document.documentElement.clientWidth - 4;
    const edge = b.left + b.width * 0.08;
    // never over the name: when he stands level with it, the cloud opens just below it
    const nameEl = document.querySelector(".greet-name"), nameBottom = nameEl ? nameEl.getBoundingClientRect().bottom - 2 : -1e9;
    let left = edge - 156, top = Math.max(b.top + b.width * 0.12, nameBottom), sc = 1;
    if (left < 8) { sc = Math.max(0.7, (edge - 8) / 156); left = edge - 156 * sc; el.style.transformOrigin = "100% 0"; }
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
  function think(root, text, holdStill) {
    stopCloud();
    const face = root.querySelector(".buddy-face"), status = root.querySelector(".buddy-status");
    if (status) status.textContent = text;
    const c = makeCloud(face, text), w = window.innerWidth;
    const me = { c, frame: 0, onResize: () => { if (window.innerWidth !== w) stopCloud(); } };
    cloud = me; window.addEventListener("resize", me.onResize, { passive: true });
    // With reduced motion the cloud just sits there, finished, for its 6.5 seconds.
    if (holdStill) c.update(2500);
    let t0 = null;
    const step = now => {
      if (cloud !== me) return;
      if (!root.isConnected) return stopCloud();
      if (t0 === null) t0 = now;
      if (holdStill ? now - t0 > 6500 : !c.update(now - t0)) return stopCloud();
      me.frame = requestAnimationFrame(step);
    };
    me.frame = requestAnimationFrame(step);
  }

  /* ---------- the hello: numbers and equations spiral into him ---------- */
  const TOKENS = ["7", "$", "%", "+", "3", "÷", "=", "9", "×", "1040", "Σ", "−", "0", "W-2"];
  const TOKEN_INK = ["#FFD27A", "#FFFFFF", "#9BE3B8"];
  const RING = 70, OPEN_END = 3400, FACE_AT = 2380, ENTER_MS = 460, PLAY_AT = FACE_AT + 380, PEN_AT = 2650, CLOUD_AT = 2880, END = 4300;
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

  let played = false, running = null, onDone = null;
  const done = () => { const f = onDone; onDone = null; if (f) setTimeout(f, 1200); };

  async function hello(greet, root) {
    const body = root.querySelector(".buddy-fig");
    root.classList.add("buddy-pending");
    try { await art.decode(); } catch (e) { root.classList.remove("buddy-pending"); done(); return; }
    if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 600))]);
    if (!root.isConnected) return;
    if (reduced.matches || document.hidden || !root.animate) { root.classList.remove("buddy-pending"); think(root, pickPep(), true); done(); return; }

    const canvas = document.createElement("canvas");
    canvas.className = "buddy-canvas"; canvas.setAttribute("aria-hidden", "true");
    const ctx = canvas.getContext("2d");
    if (!ctx) { root.classList.remove("buddy-pending"); done(); return; }
    greet.appendChild(canvas);
    const box = greet.getBoundingClientRect(), face = root.querySelector(".buddy-face").getBoundingClientRect();
    const w = box.width, h = box.height, bx = face.left - box.left + face.width * 0.5, by = face.top - box.top + face.width * 0.6;
    // The ring forms where it fits inside the card, then glides into him as it spins down.
    const fx = Math.max(RING + 26, Math.min(bx, w - RING - 26)), fy = Math.max(RING + 20, Math.min(by, h - RING - 20));
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
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 0.86, f, st };
    }
    function drawOpening(t) {
      ctx.clearRect(0, 0, w, h);
      const collapse = smooth(win(t, 1750, 2350)), spin = easeIn3(win(t, 1750, 2350)) * TAU * 1.5;
      const glide = smooth(win(t, 1700, 2300)); cx = fx + (bx - fx) * glide; cy = fy + (by - fy) * glide;
      const beat = Math.sin(Math.PI * win(t, 1650, 1780)), scale = 1 + 0.08 * beat;
      const rays = smooth(win(t, 1050, 1450)) * (1 - smooth(win(t, 1800, 2250)));
      if (rays > 0) {
        const len = Math.max(170, h * 0.5);
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
        const s = 17 * k, z = 0.7 + 0.3 * back(win(t, 1100, 1450), 2);
        lctx.save(); lctx.translate(cx, cy); lctx.rotate(spin); lctx.scale(z, z);
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

    // Browser animations, moved along by the same clock as the canvas.
    let anims = [];
    const anim = (el, frames, opts) => { if (!el) return; const a = el.animate(frames, opts); a.pause(); a.currentTime = 0; anims.push(a); };
    anim(root.querySelector(".buddy-disc"), [{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "none" }], { duration: 450, delay: FACE_AT - 120, fill: "backwards", easing: "cubic-bezier(.3,1.4,.5,1)" });
    anim(root.querySelector(".buddy-ring"), [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: FACE_AT, fill: "backwards", easing: "ease-out" });
    anim(root.querySelector(".buddy-shine"), [{ opacity: 0, backgroundPosition: "100% 0" }, { opacity: 0.5, offset: 0.3 }, { opacity: 0, backgroundPosition: "0% 0" }], { duration: 950, delay: 2710, easing: "ease-in-out" });
    root.querySelectorAll(".buddy-glint").forEach((el, i) => anim(el, [{ opacity: 0, transform: "scale(.3) rotate(-25deg)" }, { opacity: 0.9, transform: "scale(1.05) rotate(15deg)", offset: 0.4 }, { opacity: 0, transform: "scale(.5) rotate(35deg)" }], { duration: 600, delay: 2940 + i * 550 }));
    // the name is written in, left to right, once he has landed
    anim(greet.querySelector(".greet-name"), [{ clipPath: "inset(-20% 100% -20% 0)", opacity: 0.6 }, { clipPath: "inset(-20% 0% -20% 0)", opacity: 1 }], { duration: 1100, delay: PEN_AT, fill: "backwards", easing: "cubic-bezier(.45,.1,.4,1)" });

    let frame = 0, last = null, elapsed = 0, entered = false, thought = false;
    root.classList.add("buddy-entering", "buddy-wait");
    // Play lights up on his calculator just after he lands
    anim(root.querySelector(".buddy-play"), [{ opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1.18, offset: 0.6 }, { opacity: 1, scale: 1 }], { duration: 420, delay: PLAY_AT, fill: "backwards", easing: "ease-out" });
    const land = () => { entered = true; body.style.transform = ""; body.style.opacity = ""; root.classList.remove("buddy-entering"); };
    const stop = () => {
      cancelAnimationFrame(frame); anims.forEach(a => a.cancel()); anims = [];
      if (!entered) land(); canvas.remove(); root.classList.remove("buddy-pending", "buddy-wait");
      if (running === stop) running = null;
    };
    if (running) running(); running = stop;
    root.classList.remove("buddy-pending");
    const place = t => {
      if (entered) return;
      if (t < FACE_AT) { body.style.opacity = "0"; return; }
      const pose = enterPose(t - FACE_AT); if (!pose) return land();
      body.style.transform = pose.transform; body.style.opacity = String(pose.opacity);
    };
    place(0);
    const draw = now => {
      if (!root.isConnected) return stop();
      // A short stall (the 3D town loading) slows the hello down instead of skipping it;
      // a very slow device still finishes within a few seconds.
      if (last !== null) elapsed += Math.min(100, Math.max(0, now - last));
      last = now;
      anims.forEach(a => { a.currentTime = elapsed; });
      place(elapsed);
      if (elapsed >= PLAY_AT) root.classList.remove("buddy-wait");
      if (elapsed >= CLOUD_AT && !thought) { thought = true; think(root, pickPep()); }
      if (elapsed < OPEN_END) drawOpening(elapsed);
      else if (!canvas.hidden) canvas.hidden = true;
      if (elapsed >= END) { stop(); done(); return; }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
  }

  /* ---------- tap: a hop, a puff of numbers, a new pep talk ---------- */
  function hop(root) {
    const body = root.querySelector(".buddy-fig");
    if (!reduced.matches && body.animate) {
      body.animate([
        { transform: "none" }, { transform: "translateY(2px) scale(1.06,.92)", offset: 0.15 },
        { transform: "translateY(-12px) scale(.96,1.05)", offset: 0.45 }, { transform: "translateY(1px) scale(1.05,.95)", offset: 0.75 }, { transform: "none" }
      ], { duration: 620, easing: "ease-out" });
      ["+", "$", "%", "=", "7"].forEach((g, i) => {
        const s = document.createElement("span"); s.className = "buddy-puff"; s.textContent = g; s.setAttribute("aria-hidden", "true");
        s.style.left = (56 + i * 7) + "%"; s.style.top = "62%"; root.appendChild(s);
        const dx = (i - 2) * 14 + (Math.random() * 8 - 4), dy = -50 - Math.random() * 30;
        s.animate([{ opacity: 0, transform: "translate(-50%,-50%) scale(.4)" }, { opacity: 1, transform: `translate(calc(-50% + ${dx * 0.4}px), calc(-50% + ${dy * 0.4}px)) scale(1.1)`, offset: 0.3 }, { opacity: 0, transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.8) rotate(${dx}deg)` }],
          { duration: 900, delay: i * 40, easing: "ease-out", fill: "backwards" }).onfinish = () => s.remove();
      });
    }
    think(root, pickPep(), reduced.matches);
  }

  /* Like Dr. Smiley's fitWave: when the name leaves room beside it, he moves up so his head
     sits level with the name and no empty band opens up beside him. A long name keeps him
     on the line below. */
  let fitBound = false;
  function fit() {
    const greet = document.querySelector(".greet"); if (!greet) return;
    const name = greet.querySelector(".greet-name"), root = greet.querySelector(".buddy");
    const text = name.firstChild; if (!text) return;
    root.style.removeProperty("--lift"); name.style.fontSize = "";
    const range = document.createRange(); range.selectNodeContents(name);
    let nr = range.getBoundingClientRect();
    const br = root.getBoundingClientRect(), room = br.left - 10 - nr.left;
    if (nr.width > room) {
      // shrink the script name to fit beside him, but not below 38px
      const size = parseFloat(getComputedStyle(name).fontSize) * room / nr.width;
      if (size < 38) return;
      name.style.fontSize = size.toFixed(1) + "px"; nr = range.getBoundingClientRect();
    }
    root.style.setProperty("--lift", Math.round(name.getBoundingClientRect().height * 0.85) + "px");
  }
  window.Mascot = {
    src: ART,
    greeting,
    /* Wires the greeting renderHome just wrote. onPlay: the calculator Play button's action. afterHello: run
       once the first hello has finished (or right away if it already played). */
    mount({ onPlay, afterHello } = {}) {
      const greet = document.querySelector(".greet"), root = greet && greet.querySelector(".buddy");
      if (!root) return;
      root.querySelector(".buddy-face").onclick = () => hop(root);
      root.querySelector(".buddy-play").onclick = () => { if (onPlay) onPlay(); };
      onDone = afterHello || null;
      fit();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
      if (!fitBound) { fitBound = true; window.addEventListener("resize", fit, { passive: true }); }
      if (!played) { played = true; hello(greet, root); }
      else done();
    }
  };
})();
