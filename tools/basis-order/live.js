const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const scene = svg.querySelector("[data-scene]");
const readout = document.querySelector("[data-readout]");
const stepName = document.querySelector("[data-stepname]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const ease = (t) => t * t * (3 - 2 * t);
const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
const NUM = ["stock", "debt", "debtFace", "income", "distributions", "nondeductible", "loss"];
const field = (name) => document.querySelector(`[data-in="${name}"]`);
const NAMES = { income: "Income", distributions: "Distributions", nondeductible: "Nondeductible", loss: "Losses", restore: "Restore debt" };

// A coin value that keeps the tallest stack at CFG.MOST coins or fewer (same rule as the loss sorter).
function coinValue(amount, most) {
  const raw = Math.max(amount, 1) / most;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const step of [1, 2, 2.5, 5, 10]) if (step * exp >= raw) return step * exp;
  return 10 * exp;
}

let input = null, result = null, cv = 1, u = 1, states = [];
let shown = 0, aim = 0;

function stackSvg(cx, cy, r, z, h, lit) {
  if (h < 0.08) return "";
  const seams = [];
  for (let s = CFG.COIN; s < h - 0.4; s += CFG.COIN) seams.push(sideArc(cx, cy, r, z + s, P, 28));
  return solidSvg(cylinder(cx, cy, r, z, h, P, 44, 0.5), { tone: "hi", lit, inner: seams.length ? lineSvg(seams.join(""), { tone: "lo" }) : "" })
    + lineSvg(ring(cx, cy, r - 1.8, z + h, P, 40), { tone: "faint" });
}

const LABELS = { income: "INCOME", distributions: "DISTRIBUTED", nondeductible: "NONDEDUCTIBLE", loss: "LOSSES" };
function drawerSvg(i, key, left, right, single) {
  const { y: y0, d, w, wall, h } = CFG.DRAWER, gx = CFG.DRAWER_X[i], x0 = gx - w / 2, cy = y0 + d / 2;
  const box = (x, y, bw, bd, z, bh, r = 0.4) => solidSvg(slabOf({ x, y, w: bw, d: bd, r }, z, bh, P, 2), { tone: "mid" });
  const lx = single ? gx : gx - w / 4, rx = gx + w / 4;
  return [
    `<path class="iso-halo" d="${haloOf(insetPlan({ x: x0, y: y0, w, d, r: 1.5 }, 2), 0, 0.1, P)}" style="filter:blur(3px)"/>`,
    solidSvg(slabOf({ x: x0, y: y0, w, d, r: 1.5 }, 0, 1.2, P, 3, 0.4), { tone: "mid" }),
    box(x0, y0, w, wall, 1.2, h),
    box(x0, y0 + wall, wall, d - 2 * wall, 1.2, h),
    lineSvg(ring(lx, cy, CFG.BIN_R + 1.2, 1.2, P, 40), { tone: "faint" }),
    stackSvg(lx, cy, CFG.BIN_R, 1.2, left, false),
    single ? "" : box(gx - wall / 2, y0 + wall, wall, d - 2 * wall, 1.2, h * 0.6),
    single ? "" : lineSvg(ring(rx, cy, CFG.BIN_R + 1.2, 1.2, P, 40), { tone: "faint", dashed: true }),
    single ? "" : stackSvg(rx, cy, CFG.BIN_R, 1.2, right, false),
    box(x0 + w - wall, y0 + wall, wall, d - 2 * wall, 1.2, h),
    box(x0, y0 + d - wall, w, wall, 1.2, h),
    faceTextSvg(sideMatrix([gx, y0 + d], 6.4, P, "left"), String(i + 1), { size: 5, tone: "hi", anchor: "middle" }),
    faceTextSvg(topMatrix([gx, y0 + d + 7], 0, P), LABELS[key], { size: 4.2, tone: "mid", anchor: "middle" }),
  ].join("");
}

function compute() {
  result = orderBasis(input);
  const st = result.steps;
  states = [result.start, ...st.map((s) => ({ stock: s.stock, debt: s.debt }))];
  const tallest = Math.max(...states.map((s) => Math.max(s.stock, s.debt)), Math.min(input.debtFace || 0, 1e12), ...st.map((s) => Math.max(s.amount || 0, s.over || 0)));
  cv = coinValue(tallest, CFG.MOST);
  u = CFG.COIN / cv;
  const put = (name, v) => { const el = document.querySelector(`[data-cell="${name}"]`); if (el) el.textContent = v; };
  put("start-stock", money(result.start.stock)); put("start-debt", money(result.start.debt));
  const rows = document.querySelector(".bo-table tbody");
  const order = ["income", "distributions", ...(input.election ? ["loss", "nondeductible"] : ["nondeductible", "loss"]), "restore"];
  order.forEach((key, i) => {
    const s = st.find((x) => x.key === key), row = rows.querySelector(`[data-row="${key}"]`);
    row.firstElementChild.firstChild.textContent = `${i + 1} ${key === "loss" ? "Losses" : key === "nondeductible" ? "Nondeductible" : NAMES[key]}`;
    rows.appendChild(row);
    put(`${key}-amount`, key === "income" || key === "restore" ? money(s.amount) : money(s.amount) + (s.over ? ` (${money(s.over)} over)` : ""));
    put(`${key}-stock`, money(s.stock)); put(`${key}-debt`, money(s.debt));
  });
  const out = (name, v) => (document.querySelector(`[data-out="${name}"]`).textContent = v);
  out("deducted", money(result.deducted)); out("suspended", money(result.suspended)); out("gain", money(result.gain));
  out("ndLabel", input.election ? "Nondeductibles to next year" : "Nondeductibles lost");
  out("nd", money(input.election ? result.ndCarried : result.ndLost));
  out("coin", money(cv));
  run();
}

function order() { return ["income", "distributions", ...(input.election ? ["loss", "nondeductible"] : ["nondeductible", "loss"]), "restore"]; }

function textAt(step) {
  const s = result.steps;
  if (step === 0) return `Start · stock ${money(result.start.stock)} · debt ${money(result.start.debt)}`;
  const x = s.find((q) => q.key === order()[step - 1]);
  if (x.key === "income") return `1 Income +${money(x.amount)} · stock ${money(x.stock)}`;
  if (x.key === "restore") return x.amount ? `5 Restore ${money(x.amount)} to the loan · debt ${money(x.debt)}` : `5 Nothing to restore · deducted ${money(result.deducted)}`;
  const over = x.over ? ` · ${money(x.over)} over basis` : "";
  return `${step} ${NAMES[x.key]} ${money(x.amount)}${over}`;
}

function draw() {
  const k = Math.floor(shown), f = ease(shown - k);
  const a = states[Math.min(k, 5)], b = states[Math.min(k + 1, 5)];
  const stock = a.stock + (b.stock - a.stock) * f, debt = a.debt + (b.debt - a.debt) * f;
  const items = [];
  const add = (x, y, svgText) => items.push({ depth: depthOf([x, y, 0], P), svg: svgText });
  for (const [name, [x, y]] of Object.entries(CFG.STACKS)) {
    const h = (name === "stock" ? stock : debt) * u;
    let g = solidSvg(cylinder(x, y, CFG.COIN_R + 2.5, 0, 3, P, 48, 0.5), { tone: "mid" }) + stackSvg(x, y, CFG.COIN_R, 3, h, true);
    if (name === "debt" && input.debtFace > 0) g += lineSvg(ring(x, y, CFG.COIN_R + 1.2, 3 + input.debtFace * u, P, 44), { tone: "mid", dashed: true });
    add(x, y, g);
  }
  const keys = order();
  for (let i = 0; i < 4; i++) {
    const p = ease(clamp(shown - i, 0, 1));
    const s = result.steps.find((q) => q.key === keys[i]);
    const left = i === 0 ? s.amount * (1 - p) : (s.fromStock + s.fromDebt) * p, right = i === 0 ? 0 : s.over * p;
    add(CFG.DRAWER_X[i], CFG.DRAWER.y + CFG.DRAWER.d / 2, drawerSvg(i, keys[i], left * u, right * u, i === 0));
  }
  let wire = "";
  const r = result.steps.find((q) => q.key === "restore");
  if (r.amount > 0 && shown > 4) {
    const [sx, sy] = CFG.STACKS.stock, [dx, dy] = CFG.STACKS.debt, z0 = 3 + stock * u + 2, z1 = 3 + debt * u + 2, lift = 14;
    const pts = [];
    for (let j = 0; j <= 20; j++) { const t = j / 20; pts.push(iso([sx + (dx - sx) * t, sy + (dy - sy) * t, z0 + (z1 - z0) * t + lift * Math.sin(Math.PI * t)], P)); }
    wire = `<g opacity="${clamp(shown - 4, 0, 1).toFixed(2)}">${lineSvg(pathOf(pts), { tone: "mid", dashed: true, flow: true })}</g>`;
  }
  scene.innerHTML = items.sort((p, q) => p.depth - q.depth).map((x) => x.svg).join("") + wire;
  const step = Math.round(shown);
  const text = textAt(step);
  if (readout.textContent !== text) readout.textContent = text;
  stepName.textContent = step === 0 ? "Start" : `Step ${step} of 5`;
  document.querySelectorAll(".bo-table tbody tr").forEach((tr, i) => (i === step ? tr.setAttribute("data-now", "") : tr.removeAttribute("data-now")));
  stage.setAttribute("aria-valuenow", String(step));
  stage.setAttribute("aria-valuetext", text);
}

let frame = 0, last = 0, visible = false, touring = true, clock = 0, idle = 0;
const HOLD = 1.9, END_HOLD = 3.4;
function tourAim(t) {
  const c = t % (HOLD * 5 + END_HOLD);
  return Math.min(5, Math.floor(c / HOLD));
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { clock += dt; aim = tourAim(clock); }
  const calm = still.matches;
  shown += (aim - shown) * (calm ? 1 : 1 - Math.exp(-dt / 0.28));
  if (Math.abs(aim - shown) < 0.004) shown = aim;
  draw();
  frame = visible && (touring || shown !== aim) ? requestAnimationFrame(tick) : 0;
}
function run() { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } else if (!visible && result) draw(); }
function steer(to) {
  touring = false;
  aim = clamp(to, 0, 5);
  clearTimeout(idle);
  idle = setTimeout(() => { if (!still.matches) { touring = true; clock = 0; } run(); }, 8000);
  run();
}
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("keydown", (e) => {
  const now = Math.round(aim);
  const to = { ArrowRight: now + 1, ArrowUp: now + 1, ArrowLeft: now - 1, ArrowDown: now - 1, Home: 0, End: 5 }[e.key];
  if (to === undefined) return;
  e.preventDefault();
  steer(to);
});
document.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => steer(Math.round(aim) + Number(b.dataset.step))));

function fill(values) {
  for (const n of NUM) field(n).value = Number(values[n] || 0).toLocaleString("en-US");
  field("election").checked = !!values.election;
}
function readFields() {
  const v = {};
  for (const n of NUM) v[n] = Number(field(n).value.replace(/[^0-9.]/g, "")) || 0;
  v.election = field("election").checked;
  return v;
}
function setCase(i) {
  const c = CASES[i];
  input = { ...c.input };
  fill(input);
  document.querySelector("[data-note]").textContent = c.note;
  document.querySelectorAll("[data-preset]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.preset) === i)));
  compute();
}
document.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => { setCase(Number(b.dataset.preset)); steer(0); setTimeout(() => steer(5), 50); }));
document.querySelectorAll("[data-in]").forEach((el) => el.addEventListener(el.type === "checkbox" ? "change" : "input", () => {
  input = readFields();
  document.querySelectorAll("[data-preset]").forEach((b) => b.setAttribute("aria-pressed", "false"));
  document.querySelector("[data-note]").textContent = el.type === "checkbox" ? (input.election ? "With the election: losses come off basis before nondeductibles." : "Without the election: nondeductibles come off basis first.") : "Your own numbers.";
  compute();
}));

const params = new URLSearchParams(location.search);
setCase(clamp(Number(params.get("case")) || 0, 0, CASES.length - 1));
if (params.has("step")) { touring = false; aim = shown = clamp(Number(params.get("step")), 0, 5); }
else if (still.matches) { touring = false; aim = shown = 5; }
draw();
