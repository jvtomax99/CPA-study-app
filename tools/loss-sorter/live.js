
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const sledG = svg.querySelector('[data-part="sled"]');
const stackG = sledG.querySelector("[data-stack]");
const bars = [...svg.querySelectorAll("[data-bar]")];
const bins = [...svg.querySelectorAll("[data-bin]")];
const slots = [...svg.querySelectorAll("[data-depth]")].map((el) => ({ el, depth: Number(el.dataset.depth) }));
const readout = document.querySelector("[data-readout]");
if (matchMedia("(pointer: coarse)").matches) { const hint = document.querySelector('[data-corner="hint"]'); if (hint) hint.textContent = "Drag to push the sled"; }
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
const NUM = ["loss", "basis", "atRisk", "passiveIncome", "otherBusinessIncome"];
const BOX = ["passThrough", "passive", "joint"];
const field = (name) => document.querySelector(`[data-in="${name}"]`);

let input = null, result = null, cv = 1;
const shown = { h0: 0, after: [0, 0, 0, 0], bar: CFG.GATES.map(() => CFG.PARK) };
const goal = { h0: 0, after: [0, 0, 0, 0], bar: CFG.GATES.map(() => CFG.PARK) };

function stackSvg(cx, cy, r, z, h, lit) {
  if (h < 0.08) return "";
  const seams = [];
  for (let s = CFG.COIN; s < h - 0.4; s += CFG.COIN) seams.push(sideArc(cx, cy, r, z + s, P, 28));
  return solidSvg(cylinder(cx, cy, r, z, h, P, 44, 0.5), { tone: "hi", lit, inner: seams.length ? lineSvg(seams.join(""), { tone: "lo" }) : "" })
    + lineSvg(ring(cx, cy, r - 1.8, z + h, P, 40), { tone: "faint" });
}

function compute() {
  result = sortLoss(input);
  cv = coinValue(result.loss, 18);
  const u = CFG.COIN / cv;
  goal.h0 = result.loss * u;
  goal.after = result.gates.map((g) => g.out * u);
  goal.bar = result.gates.map((g) => {
    const h = g.limit * u;
    return !isFinite(h) || h > CFG.H_MAX + 2 ? CFG.PARK : Math.min(CFG.PARK, CFG.SEAT_TOP + h + CFG.GAP);
  });
  const limitText = (g, i) => {
    if (i === 0 && !input.passThrough) return "no basis gate";
    if (i === 1 && !isFinite(g.limit)) return "not limiting";
    if (i === 2 && !input.passive) return "not passive";
    return money(g.limit);
  };
  result.gates.forEach((g, i) => {
    document.querySelector(`[data-limit="${i}"]`).textContent = limitText(g, i);
    document.querySelector(`[data-held="${i}"]`).textContent = money(g.held);
  });
  document.querySelector("[data-deducted]").textContent = money(result.deducted);
  document.querySelector("[data-coin]").textContent = money(cv);
  field("basis").disabled = !input.passThrough;
  field("passiveIncome").disabled = !input.passive;
  run();
}

function fill(values) {
  for (const n of NUM) field(n).value = values[n] === null || values[n] === undefined ? "" : Number(values[n]).toLocaleString("en-US");
  for (const b of BOX) field(b).checked = !!values[b];
}
function readFields() {
  const v = {};
  for (const n of NUM) { const raw = field(n).value.replace(/[^0-9.]/g, ""); v[n] = raw === "" ? (n === "atRisk" ? null : 0) : Number(raw); }
  for (const b of BOX) v[b] = field(b).checked;
  return v;
}
function setCase(i) {
  const c = CASES[i];
  input = { ...c.input };
  fill(input);
  document.querySelector("[data-note]").textContent = c.note;
  document.querySelectorAll("[data-preset]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.preset) === i)));
  compute();
  restartTour();
}
document.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => setCase(Number(b.dataset.preset))));
document.querySelectorAll("[data-in]").forEach((el) => el.addEventListener(el.type === "checkbox" ? "change" : "input", () => {
  input = readFields();
  document.querySelectorAll("[data-preset]").forEach((b) => b.setAttribute("aria-pressed", "false"));
  document.querySelector("[data-note]").textContent = "Your own numbers.";
  compute();
}));

let sx = CFG.START, aim = CFG.START, touring = true, clock = 0, idle = 0;
let frame = 0, last = 0, visible = false, slotIndex = -1;
const RUN = 7, HOLD = 2.6, BACK = 1.4, REST = 1.2;
const ease = (t) => t * t * (3 - 2 * t);
function tourAt(t) {
  const c = t % (RUN + HOLD + BACK + REST) - REST;
  if (c < 0) return CFG.START;
  if (c < RUN) return CFG.START + (CFG.END - CFG.START) * ease(c / RUN);
  if (c < RUN + HOLD) return CFG.END;
  if (c < RUN + HOLD + BACK) return CFG.END - (CFG.END - CFG.START) * ease((c - RUN - HOLD) / BACK);
  return CFG.START;
}
function restartTour() { clock = 0; touring = !still.matches; if (still.matches) { aim = sx = CFG.END; } run(); }

function draw() {
  sledG.setAttribute("transform", translateAlong(P, [sx, 0, 0]));
  let h = shown.h0, held = 0, cutting = 0;
  const binH = [];
  CFG.GATES.forEach((gx, i) => {
    const a0 = gx - 40, a1 = gx - 15;
    const p = ease(clamp((sx - a0) / (a1 - a0), 0, 1));
    const after = Math.min(shown.after[i], h);
    const cut = h - after;
    h -= p * cut;
    binH.push(p * cut);
    if (p >= 1) held += result.gates[i].held;
    else if (p > 0 && result.gates[i].held > 0) cutting = i + 1;
    bars[i].setAttribute("transform", translateAlong(P, [0, 0, shown.bar[i]]));
  });
  stackG.innerHTML = stackSvg(0, 0, CFG.COIN_R, CFG.SEAT_TOP, h, true);
  bins.forEach((b, i) => { b.innerHTML = stackSvg(CFG.GATES[i], CFG.BIN_CY, CFG.BIN_R, CFG.BIN_FLOOR, binH[i], false); });
  const d = depthOf([sx, 0, 0], P);
  let idx = slots.findIndex((s) => s.depth > d);
  if (idx !== slotIndex) {
    slotIndex = idx;
    const parent = slots[0].el.parentNode;
    if (idx < 0) parent.appendChild(sledG); else parent.insertBefore(sledG, slots[idx].el);
  }
  const passed = CFG.GATES.filter((gx) => sx >= gx - 15).length;
  const text = sx >= CFG.END - 0.5 ? `Deducted ${money(result.deducted)} · held back ${money(result.held)}` : cutting ? `Gate ${cutting} scraping off ${money(result.gates[cutting - 1].held)}` : `On the sled ${money(result.loss - held)} · held back ${money(held)}`;
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(passed));
  stage.setAttribute("aria-valuetext", text);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; aim = tourAt(clock); }
  const f = calm ? 1 : 1 - Math.exp(-dt / (touring ? 0.05 : 0.22));
  sx += (aim - sx) * f;
  if (Math.abs(aim - sx) < 0.02) sx = aim;
  const g = calm ? 1 : 1 - Math.exp(-dt / 0.25);
  let moving = false;
  const follow = (cur, to) => { const n = cur + (to - cur) * g; if (Math.abs(to - n) < 0.01) return to; moving = true; return n; };
  shown.h0 = follow(shown.h0, goal.h0);
  shown.after = shown.after.map((v, i) => follow(v, goal.after[i]));
  shown.bar = shown.bar.map((v, i) => follow(v, goal.bar[i]));
  draw();
  const settled = !touring && sx === aim && !moving;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } else if (!visible && result) draw(); }
function steer(to) {
  touring = false;
  aim = clamp(to, CFG.START, CFG.END);
  clearTimeout(idle);
  idle = setTimeout(() => { if (!still.matches) { touring = true; clock = 0; aim = CFG.START; } run(); }, 5000);
  run();
}
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (e) => {
  const box = svg.getBoundingClientRect();
  steer(CFG.START + clamp(((e.clientX - box.left) / box.width - 0.12) / 0.76, 0, 1) * (CFG.END - CFG.START));
});
const STOPS = [CFG.START, ...CFG.GATES.map((g) => g + 22), CFG.END];
stage.addEventListener("keydown", (e) => {
  const here = STOPS.reduce((b, s, i) => (Math.abs(s - aim) < Math.abs(STOPS[b] - aim) ? i : b), 0);
  let to = null;
  if (e.key === "ArrowRight" || e.key === "ArrowUp") to = Math.min(STOPS.length - 1, here + 1);
  if (e.key === "ArrowLeft" || e.key === "ArrowDown") to = Math.max(0, here - 1);
  if (e.key === "Home") to = 0;
  if (e.key === "End") to = STOPS.length - 1;
  if (to === null) return;
  e.preventDefault();
  steer(STOPS[to]);
});
const start = Number(new URLSearchParams(location.search).get("case")) || 0;
setCase(clamp(start, 0, CASES.length - 1));
Object.assign(shown, { h0: goal.h0, after: [...goal.after], bar: [...goal.bar] });
if (still.matches) touring = false;
draw();
