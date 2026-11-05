/* Launch screen art: the graffiti-covered stainless cars, drawn in canvas while the page loads (src/intro3d.js maps them
   onto the train). The productions are original: hand-built wildstyle letters from angular stroke skeletons (no font),
   New York words, tax-word tags, and the study buddy as the character. No real writers' pieces, tags or crews, and no
   transit marks (no route bullets, car numbers or logos). One car side is 10.2 m by 3.0 m, drawn on a 2048 by 600 grid. */
(() => {
  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const W = 2048, H = 600;
  const DOORS = [0.17, 0.5, 0.83], DW = 120, WIN_Y = 150, WIN_H = 130;
  /* graffiti palette (art only; see DESIGN.md, Launch screen) */
  const SCHEMES = [
    { bg: ["#e8324a", "#ff8a1f"], dots: "#ffd23a", fill: ["#2fd36b", "#1e9bff", "#ffe03a"], cloud: "#1d58c9", block: "#2a1452" },
    { bg: ["#1d58c9", "#3fc6ff"], dots: "#ff3fa4", fill: ["#ff4fa8", "#ff9e3a", "#ffe86a"], cloud: "#ffd23a", block: "#2a1452" },
    { bg: ["#7b2fd6", "#ff3fa4"], dots: "#7ae03a", fill: ["#ffe03a", "#7ae03a", "#2fd3c4"], cloud: "#2fd3c4", block: "#1a1240" },
    { bg: ["#0f8f5a", "#c6ff3a"], dots: "#ffffff", fill: ["#ff6a1a", "#ff3fa4", "#b34bff"], cloud: "#ffffff", block: "#2a1452" },
  ];
  const WORDS = ["UPTOWN", "BRONX", "NYC", "QUEENS", "HARLEM", "BKLYN"];
  const TAGS = ["TAX", "EA", "SEE", "IRA", "AUDIT", "PASS", "LEDGER"];

  /* letter skeletons in a 0..1 box, y down */
  const G = {
    A: [[[0, 1], [0.5, 0], [1, 1]], [[0.2, 0.64], [0.8, 0.64]]],
    B: [[[0, 1], [0, 0], [0.72, 0], [0.92, 0.2], [0.7, 0.47], [0, 0.47]], [[0.7, 0.47], [1, 0.72], [0.82, 1], [0, 1]]],
    C: [[[1, 0.12], [0.86, 0], [0.16, 0], [0, 0.2], [0, 0.8], [0.16, 1], [0.86, 1], [1, 0.88]]],
    D: [[[0, 0], [0, 1], [0.68, 1], [1, 0.72], [1, 0.28], [0.68, 0], [0, 0]]],
    E: [[[1, 0], [0, 0], [0, 1], [1, 1]], [[0, 0.5], [0.72, 0.5]]],
    F: [[[1, 0], [0, 0], [0, 1]], [[0, 0.5], [0.7, 0.5]]],
    Z: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
    V: [[[0, 0], [0.5, 1], [1, 0]]],
    G: [[[1, 0.12], [0.86, 0], [0.16, 0], [0, 0.2], [0, 0.8], [0.16, 1], [0.86, 1], [1, 0.86], [1, 0.56], [0.55, 0.56]]],
    H: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]],
    I: [[[0.5, 0], [0.5, 1]]],
    K: [[[0, 0], [0, 1]], [[1, 0], [0, 0.56]], [[0.34, 0.4], [1, 1]]],
    L: [[[0, 0], [0, 1], [1, 1]]],
    M: [[[0, 1], [0, 0], [0.5, 0.56], [1, 0], [1, 1]]],
    N: [[[0, 1], [0, 0], [1, 1], [1, 0]]],
    O: [[[0.2, 0], [0.8, 0], [1, 0.2], [1, 0.8], [0.8, 1], [0.2, 1], [0, 0.8], [0, 0.2], [0.2, 0]]],
    P: [[[0, 1], [0, 0], [0.8, 0], [1, 0.2], [1, 0.36], [0.8, 0.55], [0, 0.55]]],
    Q: [[[0.2, 0], [0.8, 0], [1, 0.2], [1, 0.8], [0.8, 1], [0.2, 1], [0, 0.8], [0, 0.2], [0.2, 0]], [[0.62, 0.68], [1.08, 1.12]]],
    R: [[[0, 1], [0, 0], [0.8, 0], [1, 0.2], [1, 0.36], [0.8, 0.55], [0, 0.55]], [[0.42, 0.55], [1, 1]]],
    S: [[[1, 0.1], [0.86, 0], [0.14, 0], [0, 0.16], [0, 0.34], [0.14, 0.47], [0.86, 0.53], [1, 0.66], [1, 0.84], [0.86, 1], [0.14, 1], [0, 0.9]]],
    T: [[[0, 0], [1, 0]], [[0.5, 0], [0.5, 1]]],
    U: [[[0, 0], [0, 0.8], [0.2, 1], [0.8, 1], [1, 0.8], [1, 0]]],
    W: [[[0, 0], [0.22, 1], [0.5, 0.36], [0.78, 1], [1, 0]]],
    X: [[[0, 0], [1, 1]], [[1, 0], [0, 1]]],
    Y: [[[0, 0], [0.5, 0.5], [1, 0]], [[0.5, 0.5], [0.5, 1]]],
  };
  const WIDE = { W: 1.3, M: 1.15, I: 0.3, Y: 0.95, X: 0.95 };
  let F = null; /* one scratch canvas, reused for every letter fill */

  /* wildstyle: tilted, overlapping letters (each with its own outline, so they interlock), arrows off stroke ends,
     a 3D block, a black outline with a white inner line, a fade fill with splotches, cuts and shines */
  function wild(x, r, word, cx, cy, h, span, sc) {
    const t = h * 0.29, ol = h * 0.06, chars = [...word].filter(c => G[c]);
    const base = chars.map(c => (WIDE[c] || 0.78) * h), gap = -0.16 * h;
    const natural = base.reduce((a, b) => a + b, 0) + gap * (chars.length - 1), sx = Math.min(1.45, Math.max(0.8, span / natural));
    let px = cx - natural * sx / 2;
    const L = chars.map((c, i) => {
      const w = base[i] * sx, l = { c, x: px, w, y: cy - h / 2 + (r() - 0.5) * h * 0.22, h: h * (1 + (r() - 0.4) * 0.22), rot: (r() - 0.5) * 0.2, skew: -0.2 + r() * 0.12, arrows: [] };
      const strokes = G[c];
      for (let k = 0; k < 1 + (r() < 0.6 ? 1 : 0); k++) { const st = strokes[Math.floor(r() * strokes.length)], end = r() < 0.5; l.arrows.push({ p: end ? st[st.length - 1] : st[0], q: end ? st[st.length - 2] : st[1], len: 0.35 + r() * 0.45 }); }
      px += w + gap * sx; return l;
    });
    const pt = (l, p) => [l.x + (p[0] + (1 - p[1]) * -l.skew) * l.w, l.y + p[1] * l.h];
    const frame = (o, l) => { o.translate(l.x + l.w / 2, l.y + l.h / 2); o.rotate(l.rot); o.translate(-(l.x + l.w / 2), -(l.y + l.h / 2)); };
    const tip = (l, a) => { const [ax, ay] = pt(l, a.p), [bx, by] = pt(l, a.q); let dx = ax - bx, dy = ay - by; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m; return { ax, ay, dx, dy, tx: ax + dx * a.len * h * 0.6, ty: ay + dy * a.len * h * 0.6 }; };
    const draw = (o, l, width, color) => {
      o.save(); frame(o, l); o.lineJoin = "miter"; o.miterLimit = 5; o.lineCap = "square"; o.lineWidth = width; o.strokeStyle = color; o.fillStyle = color;
      o.beginPath();
      for (const st of G[l.c]) st.forEach((p, i) => { const [qx, qy] = pt(l, p); i ? o.lineTo(qx, qy) : o.moveTo(qx, qy); });
      for (const a of l.arrows) { const k = tip(l, a); o.moveTo(k.ax, k.ay); o.lineTo(k.tx, k.ty); }
      o.stroke();
      const grow = (width - t) / 2;
      for (const a of l.arrows) { const k = tip(l, a), s = t * 1.05 + grow; o.beginPath(); o.moveTo(k.tx + k.dx * s * 1.6, k.ty + k.dy * s * 1.6); o.lineTo(k.tx - k.dy * s, k.ty + k.dx * s); o.lineTo(k.tx + k.dy * s, k.ty - k.dx * s); o.closePath(); o.fill(); }
      o.restore();
    };
    for (let k = 10; k > 0; k--) L.forEach(l => { x.save(); x.translate(k * h * 0.011, k * h * 0.013); draw(x, l, t + ol * 2, k > 8 ? "#111" : sc.block); x.restore(); });
    const g = x.createLinearGradient(cx - natural * sx / 2, 0, cx + natural * sx / 2, 0); sc.fill.forEach((c, i) => g.addColorStop(i / (sc.fill.length - 1), c));
    if (!F || F.width !== x.canvas.width || F.height !== x.canvas.height) { F = document.createElement("canvas"); F.width = x.canvas.width; F.height = x.canvas.height; }
    const q = F.getContext("2d"), k0 = x.canvas.width / W;
    L.forEach(l => {
      draw(x, l, t + ol * 2, "#111");
      draw(x, l, t + ol * 0.7, "#fff");
      q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, F.width, F.height); q.setTransform(k0, 0, 0, k0, 0, 0);
      q.globalCompositeOperation = "source-over"; draw(q, l, t, "#000");
      q.globalCompositeOperation = "source-atop"; q.fillStyle = g; q.fillRect(0, 0, W, H);
      for (let i = 0; i < 10; i++) { q.globalAlpha = 0.5; q.fillStyle = [sc.fill[2], "#fff", sc.dots, sc.fill[0]][i % 4]; q.beginPath(); q.arc(l.x + r() * l.w, l.y + r() * l.h, h * (0.03 + r() * 0.08), 0, 7); q.fill(); }
      q.globalAlpha = 1; q.fillStyle = "rgba(0,0,0,0.2)"; q.fillRect(l.x - h, l.y + l.h * 0.62, l.w + 2 * h, l.h);
      q.strokeStyle = "#111"; q.lineWidth = Math.max(3, h * 0.018);
      for (let i = 0; i < 2; i++) { const yy = l.y + l.h * (0.2 + r() * 0.6); q.beginPath(); q.moveTo(l.x - 10, yy); q.lineTo(l.x + l.w + 10, yy - h * 0.08); q.stroke(); }
      x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(F, 0, 0); x.restore();
    });
    x.lineCap = "round"; x.strokeStyle = "#fff"; x.fillStyle = "#fff";
    L.forEach(l => { for (let i = 0; i < 2; i++) { const sx2 = l.x + l.w * (0.15 + r() * 0.6), sy = l.y + l.h * (0.1 + r() * 0.3); x.lineWidth = h * 0.02; x.beginPath(); x.moveTo(sx2, sy); x.lineTo(sx2 + h * 0.06, sy - h * 0.03); x.stroke(); x.beginPath(); x.arc(sx2 + h * 0.1, sy - h * 0.05, h * 0.012, 0, 7); x.fill(); } });
    for (let i = 0; i < 5; i++) { const l = L[Math.floor(r() * L.length)]; star(x, l.x + r() * l.w, l.y + r() * l.h, h * (0.04 + r() * 0.04), "#fff"); }
  }
  function star(x, cx, cy, s, c) { x.save(); x.translate(cx, cy); x.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? s * 0.28 : s; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fillStyle = c; x.fill(); x.restore(); }
  /* a tag: the same skeletons as thin marker strokes, slanted, with an underline swash and drips */
  function tag(x, r, word, px, py, h, color) {
    x.save(); x.translate(px, py); x.rotate(-0.12 + r() * 0.1); x.lineCap = "round"; x.lineJoin = "round"; x.lineWidth = h * 0.12; x.strokeStyle = color; x.fillStyle = color;
    let cx = 0;
    for (const c of word) { const st = G[c]; if (!st) { cx += h * 0.4; continue; } const w = (WIDE[c] || 0.7) * h * 0.62;
      x.beginPath(); for (const s of st) s.forEach((p, i) => { const qx = cx + (p[0] + (1 - p[1]) * 0.3) * w + (r() - 0.5) * h * 0.05, qy = p[1] * h; i ? x.lineTo(qx, qy) : x.moveTo(qx, qy); }); x.stroke(); cx += w + h * 0.12; }
    x.beginPath(); x.moveTo(-h * 0.1, h * 1.15); x.quadraticCurveTo(cx * 0.5, h * 1.45, cx + h * 0.3, h * 0.95); x.stroke();
    for (let i = 0; i < 3; i++) { const dx = r() * cx; x.fillRect(dx, h, h * 0.06, h * (0.3 + r() * 0.8)); }
    x.restore();
  }
  function steel(x, w, h, door) {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#d9dde6"); g.addColorStop(0.5, "#b9bfcc"); g.addColorStop(1, "#8b91a3");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 9) { x.fillStyle = "rgba(255,255,255,0.18)"; x.fillRect(i, h * 0.56, 3, h * 0.44); x.fillStyle = "rgba(40,44,70,0.22)"; x.fillRect(i + 4, h * 0.56, 2, h * 0.44); }
    x.fillStyle = "rgba(40,44,70,0.35)"; x.fillRect(0, h * 0.54, w, 4); x.fillRect(0, 26, w, 3);
    if (door) for (const f of DOORS) { const cx = f * w; x.strokeStyle = "rgba(30,32,52,0.7)"; x.lineWidth = 3; x.strokeRect(cx - DW, 40, DW * 2, h - 70); }
  }
  function windowRects() {
    const rects = [];
    for (const f of DOORS) { const cx = f * W; rects.push([cx - DW + 26, WIN_Y - 10, DW - 46, WIN_H + 20], [cx + 20, WIN_Y - 10, DW - 46, WIN_H + 20]); }
    for (const [a, b] of [[30, DOORS[0] * W - DW - 40], [DOORS[DOORS.length - 1] * W + DW + 40, W - 30]]) rects.push([a, WIN_Y, b - a, WIN_H]);
    for (let i = 0; i < DOORS.length - 1; i++) { const a = DOORS[i] * W + DW + 40, b = DOORS[i + 1] * W - DW - 40, wd = (b - a - 30) / 2; rects.push([a, WIN_Y, wd, WIN_H], [a + wd + 30, WIN_Y, wd, WIN_H]); }
    return rects;
  }
  function production(x, r, word, sc, buddy) {
    const phase = r() * 6, top = WIN_Y + WIN_H - 20;
    x.save(); x.beginPath(); x.moveTo(0, H);
    for (let px = 0; px <= W; px += 40) x.lineTo(px, top - 30 - Math.max(0, Math.sin(px * 0.006 + phase)) * 150 + r() * 14);
    x.lineTo(W, H); x.closePath(); x.clip();
    const g = x.createLinearGradient(0, top, 0, H); g.addColorStop(0, sc.bg[0]); g.addColorStop(1, sc.bg[1]); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.globalAlpha = 0.85; x.fillStyle = sc.dots; for (let i = 0; i < 26; i++) { x.beginPath(); x.arc(r() * W, top + r() * (H - top), 10 + r() * 40, 0, 7); x.fill(); }
    x.globalAlpha = 1; x.fillStyle = sc.cloud; x.strokeStyle = "#fff"; x.lineWidth = 8; x.beginPath(); x.moveTo(0, H * 0.84);
    for (let px = 0; px <= W; px += 60) { const hh = 30 + r() * 70; x.lineTo(px, H * 0.84 - hh); x.lineTo(px + 40, H * 0.84 - hh); }
    x.lineTo(W, H); x.lineTo(0, H); x.closePath(); x.fill(); x.stroke();
    x.restore();
    wild(x, r, word, W * 0.45, H * 0.735, 165, W * 0.68, sc);
    if (buddy) { const bw = 230, bh = bw * buddy.height / buddy.width; x.save(); x.shadowColor = "#111"; x.shadowOffsetX = 8; x.shadowOffsetY = 8; x.drawImage(buddy, W * 0.9 - bw / 2, H - bh - 10, bw, bh); x.restore(); }
    for (let i = 0; i < 6; i++) tag(x, r, TAGS[(i * 3 + word.length) % TAGS.length], 40 + r() * (W - 260), top - 40 + r() * 40, 26 + r() * 12, ["#111", "#fff", "#ff3fa4"][i % 3]);
  }
  /* one car side: { map, em } canvases at the given scale (1 = 2048 by 600) */
  function side(car, flip, buddy, scale = 1) {
    const map = document.createElement("canvas"); map.width = Math.round(W * scale); map.height = Math.round(H * scale);
    const x = map.getContext("2d"), r = rng(car * 11 + (flip ? 8 : 3)); x.scale(scale, scale);
    steel(x, W, H, true); production(x, r, WORDS[(car * 2 + (flip ? 1 : 0)) % WORDS.length], SCHEMES[(car + (flip ? 2 : 0)) % SCHEMES.length], buddy);
    for (const [rx, ry, rw, rh] of windowRects()) { x.fillStyle = "#123049"; x.fillRect(rx, ry, rw, rh); x.strokeStyle = "#2b2f40"; x.lineWidth = 8; x.strokeRect(rx, ry, rw, rh); }
    x.strokeStyle = "rgba(20,20,30,0.8)"; x.lineWidth = 4; for (const f of DOORS) { x.beginPath(); x.moveTo(f * W, 40); x.lineTo(f * W, H - 30); x.stroke(); }
    const em = document.createElement("canvas"); em.width = 512; em.height = 150; const e = em.getContext("2d"); e.scale(512 / W, 150 / H);
    e.fillStyle = "#000"; e.fillRect(0, 0, W, H); for (const [rx, ry, rw, rh] of windowRects()) { e.fillStyle = "#7fe3ff"; e.fillRect(rx, ry, rw, rh); e.fillStyle = "rgba(255,255,255,0.5)"; e.fillRect(rx, ry, rw, 8); }
    return { map, em };
  }
  /* a car end: the lead car's front has headlights and a lit cab window; the rear has red markers */
  function end(kind) {
    const c = document.createElement("canvas"); c.width = 280; c.height = 300; const x = c.getContext("2d"); x.scale(0.5, 0.5);
    steel(x, 560, 600, false);
    for (let i = 0; i < 560; i += 10) { x.fillStyle = "rgba(40,44,70,0.18)"; x.fillRect(i, 300, 3, 300); }
    x.fillStyle = "#2b2f40"; x.fillRect(205, 70, 150, 470); x.fillStyle = "#123049"; x.fillRect(222, 100, 116, 150);
    x.fillRect(40, 100, 140, 150); x.fillRect(380, 100, 140, 150);
    x.fillStyle = "#1a1d2a"; x.fillRect(220, 24, 120, 40);
    x.strokeStyle = "#e6e8ee"; x.lineWidth = 7; for (const gx of [190, 370]) { x.beginPath(); x.moveTo(gx, 120); x.lineTo(gx, 460); x.stroke(); }
    x.strokeStyle = "rgba(20,20,30,0.7)"; x.lineWidth = 3; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(30, 300 + i * 40); x.lineTo(180, 340 + i * 40); x.moveTo(180, 300 + i * 40); x.lineTo(30, 340 + i * 40); x.stroke(); }
    for (const hx of [120, 440]) { x.fillStyle = "#e9e4d4"; x.beginPath(); x.arc(hx, 470, 32, 0, 7); x.fill(); x.strokeStyle = "#333"; x.lineWidth = 6; x.stroke(); }
    const em = document.createElement("canvas"); em.width = 140; em.height = 150; const e = em.getContext("2d"); e.scale(0.25, 0.25); e.fillStyle = "#000"; e.fillRect(0, 0, 560, 600);
    if (kind === "front") { e.fillStyle = "#fff4dc"; for (const hx of [120, 440]) { e.beginPath(); e.arc(hx, 470, 30, 0, 7); e.fill(); } e.fillStyle = "#ffb43a"; for (const hx of [120, 440]) { e.beginPath(); e.arc(hx, 395, 14, 0, 7); e.fill(); } e.fillStyle = "#7fe3ff"; e.fillRect(40, 100, 140, 150); }
    else if (kind === "rear") { e.fillStyle = "#ff3b3b"; for (const hx of [120, 440]) { e.beginPath(); e.arc(hx, 470, 22, 0, 7); e.fill(); } }
    return { map: c, em };
  }
  /* a neon sign: the same skeletons as glass tubes (a soft glow, then the bright core), on a dark backing board */
  function neon(word, color, board = true) {
    const h = 64, pad = 26, chars = [...word];
    const ws = chars.map(c => c === " " ? h * 0.45 : (WIDE[c] || 0.7) * h * 0.75), w = Math.ceil(ws.reduce((a, b) => a + b, 0) + h * 0.22 * (chars.length - 1) + pad * 2);
    const c = document.createElement("canvas"); c.width = w; c.height = h + pad * 2; const x = c.getContext("2d");
    if (board) { x.fillStyle = "#0c0b16"; x.fillRect(0, 0, c.width, c.height); x.strokeStyle = "#2a2840"; x.lineWidth = 4; x.strokeRect(2, 2, c.width - 4, c.height - 4); }
    const path = () => { x.beginPath(); let cx = pad; chars.forEach((ch, i) => { const st = G[ch]; if (st) for (const s2 of st) s2.forEach((p, k) => { const qx = cx + p[0] * ws[i], qy = pad + p[1] * h; k ? x.lineTo(qx, qy) : x.moveTo(qx, qy); }); cx += ws[i] + h * 0.22; }); };
    x.lineCap = "round"; x.lineJoin = "round";
    x.save(); x.shadowColor = color; x.shadowBlur = 22; x.strokeStyle = color; x.lineWidth = 9; path(); x.stroke(); x.restore();
    x.strokeStyle = "#ffffff"; x.lineWidth = 3.5; path(); x.stroke();
    return c;
  }
  /* the tunnel portal's face, 32 m by 14 m on a 2048 by 896 grid (64 px a meter), arch centered: x -16..16, y -1..13 */
  const PX = 64, px = X => (X + 16) * PX, py = Y => (13 - Y) * PX;
  function archPath(x, r, cy = 5.6) { x.beginPath(); x.moveTo(px(-r), py(-1)); x.lineTo(px(-r), py(cy)); x.arc(px(0), py(cy), r * PX, Math.PI, 0, false); x.lineTo(px(r), py(-1)); }
  /* the brick portal: two productions flanking the arch, tags, a stone ring round the opening */
  function portal() {
    const c = document.createElement("canvas"); c.width = 2048; c.height = 896; const x = c.getContext("2d"), r = rng(99 * 7);
    x.fillStyle = "#4a2224"; x.fillRect(0, 0, c.width, c.height);
    for (let y = 0; y < c.height; y += 18) { x.fillStyle = "rgba(0,0,0,0.3)"; x.fillRect(0, y, c.width, 3); for (let X = (y / 18 % 2) * 22; X < c.width; X += 44) x.fillRect(X, y, 3, 18); }
    const sc = [{ dots: "#ff3fa4", fill: ["#ff4fa8", "#ff9e3a", "#ffe86a"], block: "#2a1452" }, { dots: "#ffd23a", fill: ["#2fd36b", "#1e9bff", "#ffe03a"], block: "#2a1452" }];
    x.save(); x.scale(1, 896 / 600 * 0.62); x.translate(0, 120);
    wild(x, r, "UPTOWN", 470, 380, 150, 560, sc[0]); wild(x, r, "BRONX", 1580, 380, 150, 520, sc[1]); x.restore();
    for (let i = 0; i < 14; i++) tag(x, r, TAGS[i % TAGS.length], 40 + r() * 1900, 40 + r() * 760, 30 + r() * 16, ["#fff", "#111", "#ff3fa4", "#2fd3ff"][i % 4]);
    x.lineWidth = 0.6 * PX; x.strokeStyle = "#7a7280"; archPath(x, 4.75); x.stroke();
    return c;
  }
  /* the approach walls: only their top 2.6 m shows above the deck, so the art is a band, 2048 by 256 for 50 m */
  function wall(flip) {
    const c = document.createElement("canvas"); c.width = 2048; c.height = 256; const x = c.getContext("2d"), r = rng(flip ? 31 : 17);
    x.fillStyle = "#4a2224"; x.fillRect(0, 0, 2048, 256);
    for (let y = 0; y < 256; y += 14) { x.fillStyle = "rgba(0,0,0,0.3)"; x.fillRect(0, y, 2048, 3); for (let X = (y / 14 % 2) * 18; X < 2048; X += 36) x.fillRect(X, y, 3, 14); }
    x.fillStyle = "#6e6676"; x.fillRect(0, 0, 2048, 14);   /* the coping stones on top */
    const words = flip ? ["QUEENS", "HARLEM"] : ["BKLYN", "NYC"], sc = [{ dots: "#7ae03a", fill: ["#ffe03a", "#7ae03a", "#2fd3c4"], block: "#1a1240" }, { dots: "#ff3fa4", fill: ["#ff6a1a", "#ff3fa4", "#b34bff"], block: "#2a1452" }];
    words.forEach((w, i) => wild(x, r, w, 520 + i * 1000, 150, 120, 700, sc[i]));
    for (let i = 0; i < 12; i++) tag(x, r, TAGS[i % TAGS.length], r() * 1950, 30 + r() * 170, 22 + r() * 8, ["#fff", "#111", "#ff3fa4"][i % 3]);
    return c;
  }
  window.IntroArt = { side, end, neon, portal, wall };
})();
