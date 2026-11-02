const BANK = __BANK__;
const DOMAINS = {
  "P1-1": { part: 1, name: "Preliminary Work and Taxpayer Data", short: "Prelim work", n: 14, bld: "the tax prep shop" },
  "P1-2": { part: 1, name: "Income and Assets", short: "Income", n: 17, bld: "the Bank" },
  "P1-3": { part: 1, name: "Deductions and Credits", short: "Deductions", n: 17, bld: "the brownstones" },
  "P1-4": { part: 1, name: "Taxation", short: "Taxation", n: 15, bld: "the walk-up" },
  "P1-5": { part: 1, name: "Advising the Individual Taxpayer", short: "Advising", n: 11, bld: "the planner's office" },
  "P1-6": { part: 1, name: "Specialized Returns for Individuals", short: "Estates", n: 11, bld: "the townhouse mansion" },
  "P2-1": { part: 2, name: "Business Entities and Considerations", short: "Entities", n: 30, bld: "the Midtown tower" },
  "P2-2": { part: 2, name: "Business Tax Preparation", short: "Business prep", n: 37, bld: "the loft building" },
  "P2-3": { part: 2, name: "Specialized Returns and Taxpayers", short: "Specialized", n: 18, bld: "the rooftop farm" },
  "P3-1": { part: 3, name: "Practices and Procedures", short: "Practice rules", n: 26, bld: "the practitioner's office" },
  "P3-2": { part: 3, name: "Representation before the IRS", short: "Representation", n: 25, bld: "the courthouse" },
  "P3-3": { part: 3, name: "Specific Areas of Representation", short: "Collections", n: 20, bld: "the collections office" },
  "P3-4": { part: 3, name: "Filing Process", short: "Filing", n: 14, bld: "the post office" }
};
const PARTS = { 1: "Individuals", 2: "Businesses", 3: "Representation" };
const CPA = { "REG-I": "REG ethics and procedures", "REG-III": "REG property", "REG-IV": "REG individuals", "REG-V": "REG entities", "TCP-I": "TCP individuals", "TCP-II": "TCP entity compliance", "TCP-III": "TCP entity planning", "TCP-IV": "TCP property" };
const MIN = 60e3, DAY = 864e5;
const INTERVALS = [5 * MIN, DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY];
const KEY = "eaTaxTown.v2", OLDKEY = "eaLedgerDrill.v1";
const byId = Object.fromEntries(BANK.map(q => [q.id, q]));

/* ---------- state ---------- */
function blank() { return { v: 2, items: {}, log: [], part: "1", goal: 20, exams: [], examRun: null, shown: {}, lastBackup: 0, reminder: null, guideSeen: false }; }
function load() {
  let s = null;
  try { const raw = localStorage.getItem(KEY); if (raw) s = JSON.parse(raw); } catch (e) {}
  if (!s) {
    try {
      const old = JSON.parse(localStorage.getItem(OLDKEY) || "null");
      if (old && old.items) s = { items: old.items, log: old.log || [], part: old.filter && old.filter.part !== "all" ? old.filter.part : "1" };
    } catch (e) {}
  }
  if (!s || typeof s !== "object" || typeof s.items !== "object") return blank();
  return Object.assign(blank(), s);
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
let state = load();
let view = "home";
let drill = null;        // { domain|null, q, reason, perm, picked, flagging }
let sheetOpen = null;
let tsView = false;

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const st = id => state.items[id] || { box: 0, due: 0, seen: 0, right: 0, last: 0, flag: false, note: "" };
function setSt(id, p) { state.items[id] = Object.assign(st(id), p); save(); }
const pct = x => Math.round(x * 100);

/* ---------- numbers ---------- */
function inBank(d) { return BANK.filter(q => q.domain === d && !st(q.id).flag); }
function mastery(d) {
  const qs = inBank(d); if (!qs.length) return 0;
  return qs.reduce((a, q) => a + Math.min(st(q.id).box, 4), 0) / (4 * qs.length);
}
function accuracy(d) {
  let s = 0, r = 0; for (const q of BANK) if (q.domain === d) { s += st(q.id).seen; r += st(q.id).right; }
  return s ? r / s : null;
}
function partDomains(p) { return Object.keys(DOMAINS).filter(k => String(DOMAINS[k].part) === String(p)); }
function readiness(p) {
  const ds = partDomains(p); const w = ds.reduce((a, d) => a + DOMAINS[d].n, 0);
  return ds.reduce((a, d) => a + DOMAINS[d].n * mastery(d), 0) / w;
}
function isDue(q, now) { const s = st(q.id); return s.seen && !s.flag && s.due <= now; }
function dueIn(filterFn) { const now = Date.now(); return BANK.filter(q => filterFn(q) && isDue(q, now)).length; }
function dayKey(t) { const d = new Date(t); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
function todayCount() { const k = dayKey(Date.now()); return state.log.filter(r => dayKey(r.t) === k).length; }
function streak() {
  const days = new Set(state.log.map(r => dayKey(r.t)));
  let n = 0, t = Date.now();
  if (!days.has(dayKey(t))) t -= DAY;
  while (days.has(dayKey(t))) { n++; t -= DAY; }
  return n;
}
function gap(p) {
  let best = null;
  for (const d of partDomains(p)) {
    const m = mastery(d); const cost = DOMAINS[d].n * (1 - m);
    if (!best || cost > best.cost) best = { d, m, cost };
  }
  return best;
}

/* ---------- recording an answer ---------- */
function record(q, ok, mode) {
  const s = st(q.id), now = Date.now();
  const wasDue = !s.seen || s.due <= now;
  let box = s.box, due = s.due;
  if (!ok) { box = 0; due = now + INTERVALS[0]; }
  else if (wasDue) { box = Math.min(s.box + 1, 5); due = now + INTERVALS[box]; }
  setSt(q.id, { seen: s.seen + 1, right: s.right + (ok ? 1 : 0), box, due, last: now });
  state.log.push({ id: q.id, ok, t: now, m: mode });
  if (state.log.length > 4000) state.log = state.log.slice(-4000);
  save();
}

/* ---------- picking the next question ---------- */
function weightFor(d) { const a = accuracy(d); return (DOMAINS[d].n / 37) * (1.3 - (a == null ? 0.5 : a)) * (1.15 - mastery(d)); }
function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
function weightedPick(list) {
  const ws = list.map(q => weightFor(q.domain)); let r = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}
function pickNext(domain, part, exclude) {
  const now = Date.now();
  const pool = BANK.filter(q => !st(q.id).flag && (domain ? q.domain === domain : String(q.part) === String(part)));
  if (!pool.length) return null;
  const usable = pool.length > 1 ? pool.filter(q => q.id !== exclude) : pool;
  const due = usable.filter(q => isDue(q, now)), fresh = usable.filter(q => !st(q.id).seen);
  let q, reason;
  if (due.length && (!fresh.length || Math.random() < 0.7)) {
    due.sort((a, b) => weightFor(b.domain) * (1 + (now - st(b.id).due) / DAY) - weightFor(a.domain) * (1 + (now - st(a.id).due) / DAY));
    q = due[0]; reason = "review";
  } else if (fresh.length) { q = weightedPick(fresh); reason = "new"; }
  else { q = usable.slice().sort((a, b) => st(a.id).due - st(b.id).due)[0]; reason = "ahead"; }
  return { q, reason, perm: shuffle([0, 1, 2, 3]), picked: null, flagging: false };
}

/* ---------- small UI helpers ---------- */
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2600); }
/* ---------- backup files ---------- */
function backupAge() { return state.lastBackup ? Math.floor((Date.now() - state.lastBackup) / DAY) : null; }
function backupLine() { const a = backupAge(); return a == null ? "No backup file saved yet." : a === 0 ? "Last backup file: today." : a === 1 ? "Last backup file: yesterday." : `Last backup file: ${a} days ago.`; }
function backupDue() { return state.log.length >= 10 && (backupAge() == null || backupAge() >= 7); }
async function saveBackupFile() {
  const now = Date.now(), name = `ea-ledger-progress-${new Date(now).toISOString().slice(0, 10)}.json`;
  const data = JSON.stringify({ app: "ea-ledger-drill", version: 2, savedAt: now, state: Object.assign({}, state, { lastBackup: now }) });
  let done = false;
  try {
    const file = new File([data], name, { type: "application/json" });
    if (/Android|iPhone|iPad|Mobi/i.test(navigator.userAgent) && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "EA Ledger Drill backup" }); done = true; }
  } catch (e) { if (e && e.name === "AbortError") return false; }
  if (!done) {
    try { const url = URL.createObjectURL(new Blob([data], { type: "application/json" })), a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); done = true; } catch (e) {}
  }
  if (done) { state.lastBackup = now; save(); toast("Backup file saved. Keep it somewhere safe, like iCloud Drive, Google Drive or your email."); }
  else toast("Couldn't save a file here. Use Copy backup instead.");
  return done;
}
function readBackup(text) {
  const o = JSON.parse(text), s = o && o.state && typeof o.state === "object" ? o.state : o;
  if (!s || typeof s.items !== "object") throw new Error("shape");
  return { state: s, savedAt: (o && o.savedAt) || s.lastBackup || 0 };
}
async function copyText(text, fb) {
  try { await navigator.clipboard.writeText(text); toast("Copied."); }
  catch (e) { if (fb) { fb.hidden = false; fb.value = text; fb.select(); } toast("Couldn't copy automatically. The text is selected below."); }
}
function ring(done, goal) {
  const f = Math.min(1, done / Math.max(goal, 1)), r = 12, c = 2 * Math.PI * r;
  return `<svg viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="${r}" fill="none" stroke="var(--line)" stroke-width="4"/><circle cx="15" cy="15" r="${r}" fill="none" stroke="var(--amber-deep)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${c * f} ${c}" transform="rotate(-90 15 15)"/></svg>`;
}
const ICON = {
  fire: '<svg viewBox="0 0 16 16" fill="none"><path d="M8 1.5c.4 2.3-1.9 3.4-1.9 5.6 0 .9.5 1.6 1.2 2-.1-1.3.7-2.2 1.6-2.9.2 1.7 2.1 2.5 2.1 4.4A3.1 3.1 0 0 1 8 13.9 3.9 3.9 0 0 1 4.1 10c0-3.9 3.8-5.2 3.9-8.5Z" fill="#ff9d3b"/><path d="M8 13.9c-1.2 0-2-.9-2-2 0-1.4 1.3-2 1.8-3.2.5 1 2.2 1.6 2.2 3.2 0 1.1-.9 2-2 2Z" fill="#ffd36b"/></svg>',
  clock: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8.5" r="5.6"/><path d="M8 5.6v3l2 1.4M6.4 1.6h3.2" stroke-linecap="round"/></svg>',
  goal: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="5.8"/><circle cx="8" cy="8" r="2.4"/></svg>',
  moon: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M10.6 1.4a6.6 6.6 0 1 0 4 10.9A5.6 5.6 0 0 1 10.6 1.4Z"/></svg>',
  sun: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="currentColor"/><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9 13 13M3 13l1.1-1.1M11.9 4.1 13 3"/></svg>'
};
function skyNow() { if (state.sky === "day" || state.sky === "dusk") return state.sky; return "dusk"; }

/* ---------- Home: the town ---------- */
function townData() {
  const m = {}, due = {}, now = Date.now();
  for (const d in DOMAINS) { m[d] = mastery(d); due[d] = BANK.filter(q => q.domain === d && isDue(q, now)).length; }
  return { mastery: m, due, part: state.part, from: Object.assign({}, state.shown) };
}
function pushTown() {
  const data = townData(); data.sky = skyNow(); data.view = tsView ? "ts" : "part";
  { const p = state.part, g = gap(p); data.hud = { part: p, ready: pct(readiness(p)), due: dueIn(q => String(q.part) === p), streak: streak(), today: todayCount(), goal: state.goal, gap: g && g.m < 0.999 ? DOMAINS[g.d].short : "" }; }
  const finished = Object.keys(DOMAINS).filter(d => (state.shown[d] ?? 1) < 0.999 && data.mastery[d] >= 0.999);
  if (finished.length) setTimeout(() => toast(finished.length > 1 ? `${finished.length} buildings finished. Their flags are up.` : `You finished ${DOMAINS[finished[0]].bld}. ${DOMAINS[finished[0]].name} is fully mastered.`), 1800);
  window.__townData = data;
  if (window.Town && window.Town.ready) window.Town.update(data);
  state.shown = Object.assign({}, data.mastery); save();
}
/* ---------- home cards ---------- */
const examShare = d => Math.round(DOMAINS[d].n / 85 * 100);
const hueOf = d => partDomains(DOMAINS[d].part).indexOf(d) % 6;
function areaCard(d) {
  const D = DOMAINS[d], m = mastery(d), a = accuracy(d), qs = inBank(d), now = Date.now();
  const due = qs.filter(q => isDue(q, now)).length;
  const learned = qs.filter(q => st(q.id).box >= 3).length, unseen = qs.filter(q => !st(q.id).seen).length;
  const meta = [`${examShare(d)}% of the exam`, esc(D.bld), a == null ? "not started" : pct(a) + "% right"];
  if (due) meta.push(`<b>${due} due</b>`);
  return `<section class="card area-card hue-${hueOf(d)}">
    <button class="area-top" data-sheet="${d}"><i class="gem" aria-hidden="true"></i>
      <span class="nm">${esc(D.name)}</span><span class="pct">${pct(m)}%</span><span class="area-meta">${meta.join(" · ")}</span></button>
    <span class="meter"><i style="width:${pct(m)}%"></i></span>
    <div class="area-foot"><span><span>${learned} learned</span> · <span>${qs.length - learned - unseen} shaky</span> · <span>${unseen} unseen</span></span><button class="soft" data-drill="${d}">Practice</button></div>
  </section>`;
}
function renderHome() {
  view = "home";
  const p = state.part, r = readiness(p), g = gap(p), dueP = dueIn(q => String(q.part) === p);
  const done = todayCount(), sk = streak();
  const coach = g ? (g.m >= 0.999 ? `Every building in Part ${p} is finished. Keep reviews up to date.` :
    `Finish <b>${esc(DOMAINS[g.d].bld)}</b> (${esc(DOMAINS[g.d].name)}, ${DOMAINS[g.d].n} of 85 scored questions).`) : "";
  const exams = state.exams.slice(-6);
  $("#app").innerHTML = `
  <section class="hero${skyNow() === "dusk" ? " night" : ""}" aria-label="Your tax city">
    <div class="hero-top">
      <div class="hero-main">
        <div><div class="eyebrow">Your tax city</div><div class="ready">${pct(r)}%</div><div class="ready-sub">ready for Part ${p}</div></div>
        ${coach ? `<div class="coach">${coach}</div>` : ""}
      </div>
      <button class="buddy" id="buddy" type="button" aria-label="Your study buddy. Tap for a pep talk.">
        <span class="buddy-halo"></span>
        <span class="buddy-body"><img class="buddy-art" src="${window.Mascot ? window.Mascot.src : "art/mascot.webp"}" alt="" width="235" height="440" decoding="async"><span class="buddy-shine"></span></span>
        <span class="buddy-glint a" aria-hidden="true">✦</span><span class="buddy-glint b" aria-hidden="true">✦</span>
        <span class="buddy-status" aria-live="polite"></span>
      </button>
    </div>
    <div class="pills">
      <span class="pill">${ICON.fire}${sk} day${sk === 1 ? "" : "s"}</span>
      <span class="pill">${ICON.clock}${dueP} due</span>
      <span class="pill">${ICON.goal}${done}/${state.goal} today</span>
    </div>
    <div class="ptabs" role="tablist">
      ${[1, 2, 3].map(n => `<button class="ptab" role="tab" data-part="${n}" aria-selected="${String(n) === p}"><b>Part ${n}</b>${PARTS[n]}</button>`).join("")}
    </div>
    <div class="stage-fade" aria-hidden="true"></div>
    <div class="stage" id="stage">
      <div class="shadow-under"></div>
      <div class="labels" id="labels"></div>
      <div class="stage-msg" id="stagemsg">Building your town…</div>
      <div class="stagebtns"><button class="sky" id="fsbtn" type="button" aria-label="Open the city full screen in 3D"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.8 20 7.2v9.6L12 21.2 4 16.8V7.2z"/><path d="M4 7.2 12 11.6l8-4.4M12 11.6v9.6"/></svg>3D</button><button class="sky" id="tsbtn" type="button">${tsView ? "Part " + p : "Times Sq"}</button><button class="sky" id="skybtn" type="button">${skyNow() === "dusk" ? ICON.sun + "Day" : ICON.moon + "Dusk"}</button></div>
    </div>
    <div class="hero-cta">
      <button class="cta play" id="play">${dueP ? `Play: ${dueP} due` : "Play"}</button>
      <button class="cta exam" id="examgo">Exam sim</button>
    </div>
  </section>
  <p class="legend">Each tower is one exam area. Finished floors are mastered; bare concrete, orange netting and a crane mark what's left. Cabs on the avenue are reviews due. A finished tower lights a gold crown. The big screens show your live numbers and 2025 tax facts. Tap a tower to drill it.</p>
  <div class="stack">
    ${state.guideSeen ? "" : `<section class="card pad focus-tile"><h2>How to use this app</h2>
      <div class="muted small">A 2-minute guide with narration. Step one: add this app to your Home Screen, so your progress is kept.</div>
      <div class="row"><button class="btn amber" id="guidego">Watch the guide</button><button class="btn ghost" id="guidex">Not now</button></div></section>`}
    ${backupDue() ? `<section class="card pad" style="display:grid;gap:8px;border-color:var(--warn)"><h2>Back up your progress</h2>
      <div class="muted small">${backupLine()} Your progress lives only on this device. Save a backup file so a lost phone or a cleared browser doesn't erase it.</div>
      <div class="row"><button class="btn amber" id="homebackup">Save backup file</button></div></section>` : ""}
    ${g && g.m < 0.999 ? `<section class="card pad focus-tile"><h2>Focus next</h2><div class="big">${esc(DOMAINS[g.d].name)}</div>
      <div class="muted small">${pct(g.m)}% mastered · ${DOMAINS[g.d].n} scored questions on the exam · ${inBank(g.d).length} in the bank</div>
      <div><button class="btn primary" data-drill="${g.d}">Practice it</button></div></section>` : ""}
    <div class="spread part-head"><h2>Part ${p} · ${PARTS[p]}</h2><span class="hint">${BANK.filter(q => String(q.part) === p).length} questions</span></div>
    ${partDomains(p).map(areaCard).join("")}
    <section class="card pad"><div class="spread"><h2>Exam sims</h2>${state.examRun ? `<button class="btn amber" id="resume">Resume exam</button>` : ""}</div>
      ${exams.length ? `<div class="hist" style="margin-top:12px">${exams.map(e => `<div><span class="b" style="height:${Math.max(6, e.score * 56)}px"></span><span>${pct(e.score)}%</span><span>P${e.part} · ${new Date(e.t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>`).join("")}</div>`
        : `<p class="muted small" style="margin:8px 0 0">No exam sims yet. A full Part 1 sim is 100 questions in 3.5 hours, in three sections, like the real test.</p>`}
    </section>
  </div>`;
  $("#app").querySelectorAll(".ptab").forEach(b => b.onclick = () => { state.part = b.dataset.part; tsView = false; save(); renderHome(); });
  $("#fsbtn").onclick = () => { if (window.Town && window.Town.fullscreen) window.Town.fullscreen(true); };
  $("#tsbtn").onclick = () => { tsView = !tsView; $("#tsbtn").textContent = tsView ? "Part " + state.part : "Times Sq"; if (window.Town && window.Town.setView) window.Town.setView(tsView ? "ts" : "part"); };
  $("#play").onclick = () => startDrill(null);
  if ($("#guidego")) $("#guidego").onclick = openGuide;
  if ($("#guidex")) $("#guidex").onclick = () => { state.guideSeen = true; save(); renderHome(); toast("The guide is in More whenever you want it."); };
  if ($("#homebackup")) $("#homebackup").onclick = async () => { if (await saveBackupFile()) renderHome(); };
  $("#skybtn").onclick = () => {
    state.sky = skyNow() === "dusk" ? "day" : "dusk"; save();
    const dusk = state.sky === "dusk";
    $("#skybtn").innerHTML = dusk ? ICON.sun + "Day" : ICON.moon + "Dusk";
    $(".hero").classList.toggle("night", dusk);
    if (window.Town && window.Town.setSky) window.Town.setSky(state.sky);
  };
  $("#examgo").onclick = () => renderExamSetup();
  if ($("#resume")) $("#resume").onclick = () => renderExam();
  $("#app").querySelectorAll("[data-drill]").forEach(b => b.onclick = () => startDrill(b.dataset.drill));
  $("#app").querySelectorAll("[data-sheet]").forEach(b => b.onclick = () => openArea(b.dataset.sheet));
  if (window.Mascot) window.Mascot.mount($(".hero"));
  mountTown();
}
function mountTown() {
  const stage = $("#stage");
  window.__townPick = d => openArea(d);
  pushTown();
  if (window.Town && window.Town.ready) { window.Town.mount(stage); $("#stagemsg").hidden = true; }
  else if (window.__townFailed) { $("#stagemsg").textContent = "The 3D town couldn't load on this device. Everything else works; your areas are listed below."; }
  else window.__townMountWhenReady = stage;
}
window.__townReady = () => {
  if (view === "home" && $("#stage")) { window.Town.mount($("#stage")); window.Town.update(window.__townData); $("#stagemsg").hidden = true; }
};
window.__townFail = () => { window.__townFailed = true; const m = $("#stagemsg"); if (m) m.textContent = "The 3D town couldn't load on this device. Everything else works; your areas are listed below."; };
window.__townLabels = () => ({ names: Object.fromEntries(Object.entries(DOMAINS).map(([k, d]) => [k, d.short])) });

function openArea(d) {
  const D = DOMAINS[d], m = mastery(d), a = accuracy(d), due = BANK.filter(q => q.domain === d && isDue(q, Date.now())).length;
  const solid = inBank(d).filter(q => st(q.id).box >= 3).length;
  $("#layer").innerHTML = `<div class="scrim" id="scrim"><div class="bsheet" role="dialog" aria-label="${esc(D.name)}">
    <div class="grab"></div>
    <div><div class="eyebrow" style="color:var(--ink-soft)">Part ${D.part} · ${esc(D.bld)}</div><h3 style="font-size:20px;margin-top:4px">${esc(D.name)}</h3></div>
    <div class="stats3"><div><small>Mastered</small><b>${pct(m)}%</b></div><div><small>Right</small><b>${a == null ? "–" : pct(a) + "%"}</b></div><div><small>Due</small><b>${due}</b></div></div>
    <p class="muted small" style="margin:0">${D.n} of 85 scored questions on the exam come from this area. ${inBank(d).length} questions in the bank, ${solid} answered right three times with spacing.</p>
    <div class="row"><button class="btn amber" id="sheetgo">Drill ${esc(D.short)}</button><button class="btn ghost" id="sheetx">Close</button></div>
  </div></div>`;
  $("#scrim").onclick = e => { if (e.target.id === "scrim") closeLayer(); };
  $("#sheetx").onclick = closeLayer;
  $("#sheetgo").onclick = () => { closeLayer(); startDrill(d); };
  if (window.Town && window.Town.highlight) window.Town.highlight(d);
}
/* the how-to video (media/how-to-use.mp4, made in promo/) */
function openGuide() {
  if (!state.guideSeen) { state.guideSeen = true; save(); }
  $("#layer").innerHTML = `<div class="scrim" id="scrim"><div class="bsheet" role="dialog" aria-label="How to use this app">
    <div class="grab"></div>
    <video id="guidevid" src="media/how-to-use.mp4" poster="media/how-to-use.jpg" controls playsinline autoplay preload="metadata" style="display:block;margin:0 auto;max-height:72vh;max-width:100%;aspect-ratio:9/16;background:#000;border-radius:14px"></video>
    <div class="row" style="justify-content:space-between;align-items:center"><span class="hint">Step one: add this app to your Home Screen.</span><button class="btn ghost" id="guideclose">Close</button></div>
  </div></div>`;
  $("#scrim").onclick = e => { if (e.target.id === "scrim") closeGuide(); };
  $("#guideclose").onclick = closeGuide;
}
function closeGuide() { const v = $("#guidevid"); if (v) v.pause(); closeLayer(); if (view === "home") renderHome(); }
function closeLayer() { $("#layer").innerHTML = ""; if (window.Town && window.Town.highlight) window.Town.highlight(null); }

/* ---------- Drill ---------- */
function startDrill(domain) {
  if (window.Town && window.Town.unmount) window.Town.unmount();
  drill = pickNext(domain, state.part, null); if (drill) drill.domain = domain;
  drill = drill || { domain, q: null };
  renderDrill(); window.scrollTo(0, 0);
}
function nextQ() { const d = drill.domain; drill = pickNext(d, state.part, drill.q && drill.q.id) || { q: null }; drill.domain = d; renderDrill(); }
function renderDrill() {
  view = "drill";
  const scope = drill.domain ? DOMAINS[drill.domain].name : `Part ${state.part} · ${PARTS[state.part]}`;
  const top = `<div class="qbar"><button class="btn ghost" id="back">‹ Town</button><span class="goal">${ring(todayCount(), state.goal)}${todayCount()}/${state.goal} today</span></div>`;
  if (!drill.q) {
    $("#app").innerHTML = top + `<div class="sheet pad"><p>No questions available in ${esc(scope)}. They may all be flagged.</p></div>`;
    $("#back").onclick = renderHome; return;
  }
  const q = drill.q, D = DOMAINS[q.domain], answered = drill.picked != null, s = st(q.id);
  const reason = { review: ["review", "Due for review"], new: ["new", "New question"], ahead: ["", "Reviewing early"] }[drill.reason];
  const choices = drill.perm.map((o, i) => {
    let c = "choice";
    if (answered) c += o === q.answer ? " right" : o === drill.picked ? " wrong" : " dim";
    return `<button class="${c}" data-i="${i}"${answered ? " disabled" : ""}><span class="L">${"ABCD"[i]}</span><span>${esc(q.choices[o])}</span></button>`;
  }).join("");
  let after = "";
  if (answered) {
    const ok = drill.picked === q.answer, cpa = (q.cpa || []).map(t => CPA[t] || t).join("; ");
    after = `<div class="explain"><div class="verdict ${ok ? "ok" : "no"}">${ok ? "Correct" : "Not quite. The answer is " + "ABCD"[drill.perm.indexOf(q.answer)] + "."}</div>
      <p>${esc(q.explain)}</p>
      <div class="meta"><span><b>Source:</b> ${esc(q.source)}</span>${cpa ? `<span><b>Also counts for CPA:</b> ${esc(cpa)}</span>` : ""}<span><b>Mastery here:</b> ${pct(mastery(q.domain))}%</span></div></div>`;
    after += drill.flagging ? `<div class="flagform"><label for="flagnote" class="hint">What looks wrong? Jose will see this note.</label>
        <textarea id="flagnote" placeholder="e.g. The 2025 figure is $X per Pub 501"></textarea>
        <div class="row"><button class="btn danger" id="flagsave">Flag this question</button><button class="btn ghost" id="flagx">Cancel</button></div></div>`
      : `<div class="actions"><button class="btn primary" id="next">Next question</button><button class="btn ghost" id="flag">Flag as wrong</button></div>`;
  }
  $("#app").innerHTML = top + `
    <article class="sheet">
      <div class="sheet-head"><div class="id"><span class="k">Part ${q.part} · ${PARTS[q.part]}</span><span class="d">${esc(D.name)}</span></div><div class="yr"><small>Tax year</small><b>2025</b></div></div>
      <div class="qbody"><div class="reason"><span class="chip ${reason[0]}">${reason[1]}</span>${s.seen ? `seen ${s.seen}× · ${s.right} right` : ""}</div><p class="qtext">${esc(q.q)}</p></div>
      <div class="choices">${choices}</div>${after}
    </article>${answered ? "" : `<p class="hint">Keys: A to D (or 1 to 4) to answer, Enter for the next question.</p>`}`;
  $("#back").onclick = renderHome;
  $("#app").querySelectorAll(".choice").forEach(b => b.onclick = () => answerDrill(+b.dataset.i));
  if ($("#next")) $("#next").onclick = nextQ;
  if ($("#flag")) $("#flag").onclick = () => { drill.flagging = true; renderDrill(); setTimeout(() => $("#flagnote") && $("#flagnote").focus(), 0); };
  if ($("#flagx")) $("#flagx").onclick = () => { drill.flagging = false; renderDrill(); };
  if ($("#flagsave")) $("#flagsave").onclick = () => { setSt(q.id, { flag: true, note: $("#flagnote").value.trim(), flaggedAt: Date.now() }); toast("Flagged. It stays out of practice until it's unflagged."); updateFlagDot(); nextQ(); };
}
function answerDrill(i) {
  if (!drill.q || drill.picked != null) return;
  drill.picked = drill.perm[i];
  const before = todayCount();
  record(drill.q, drill.picked === drill.q.answer, "drill");
  if (before < state.goal && todayCount() >= state.goal) toast(`Daily goal done: ${state.goal} questions.`);
  renderDrill();
}

/* ---------- Exam sim ---------- */
function buildExam(p) {
  const ds = partDomains(p), W = ds.reduce((a, d) => a + DOMAINS[d].n, 0);
  const avail = Object.fromEntries(ds.map(d => [d, shuffle(inBank(d))]));
  const total = Math.min(100, ds.reduce((a, d) => a + avail[d].length, 0));
  const want = Object.fromEntries(ds.map(d => [d, Math.round(total * DOMAINS[d].n / W)]));
  let ids = [];
  for (const d of ds) ids.push(...avail[d].splice(0, want[d]).map(q => q.id));
  const rest = shuffle(ds.flatMap(d => avail[d]));
  while (ids.length < total && rest.length) ids.push(rest.pop().id);
  ids = shuffle(ids.slice(0, total));
  const n = ids.length, s1 = Math.round(n * 0.34), s2 = Math.round(n * 0.67);
  return { part: p, ids, perms: Object.fromEntries(ids.map(id => [id, shuffle([0, 1, 2, 3])])), ans: {}, marked: {},
    sections: [[0, s1], [s1, s2], [s2, n]], sec: 0, idx: 0, start: Date.now(), breakMs: 0, onBreak: null,
    dur: Math.round(210 * MIN * n / 100), confirm: false };
}
function renderExamSetup() {
  if (window.Town && window.Town.unmount) window.Town.unmount();
  view = "examsetup";
  const p = state.part, avail = BANK.filter(q => String(q.part) === p && !st(q.id).flag).length, n = Math.min(100, avail);
  $("#app").innerHTML = `<div class="qbar"><button class="btn ghost" id="back">‹ Town</button></div>
  <section class="card pad" style="display:grid;gap:14px">
    <div><div class="eyebrow" style="color:var(--ink-soft)">Exam sim</div><h3 style="font-size:22px;margin-top:4px">Part ${p}: ${PARTS[p]}</h3></div>
    <div class="row">${[1, 2, 3].map(k => `<button class="btn${String(k) === p ? " primary" : ""}" data-p="${k}">Part ${k}</button>`).join("")}</div>
    <p style="margin:0">${n} questions, ${Math.round(210 * n / 100)} minutes, in three sections like the real PSI test. Once you leave a section you can't go back to it. Between sections you get an optional break that stops the clock. No answers are shown until the end.</p>
    ${n < 100 ? `<p class="hint" style="margin:0">The real exam has 100 questions. The Part ${p} bank only has ${avail} so far, so this sim is shorter.</p>` : `<p class="hint" style="margin:0">Questions are drawn in proportion to the official outline, so heavier areas get more.</p>`}
    ${state.examRun ? `<div class="confirm"><b>You have an exam in progress (Part ${state.examRun.part}).</b><div class="row"><button class="btn amber" id="resume">Resume it</button><button class="btn danger" id="discard">Discard it</button></div></div>`
      : `<div><button class="btn amber" id="start" ${n ? "" : "disabled"}>Start the exam</button></div>`}
  </section>`;
  $("#back").onclick = renderHome;
  $("#app").querySelectorAll("[data-p]").forEach(b => b.onclick = () => { state.part = b.dataset.p; save(); renderExamSetup(); });
  if ($("#start")) $("#start").onclick = () => { state.examRun = buildExam(p); save(); renderExam(); };
  if ($("#resume")) $("#resume").onclick = renderExam;
  if ($("#discard")) $("#discard").onclick = () => { state.examRun = null; save(); renderExamSetup(); };
}
function examLeft(E) { const now = E.onBreak || Date.now(); return E.dur - (now - E.start - E.breakMs); }
function fmt(ms) { ms = Math.max(0, ms); const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ":" : "") + String(m).padStart(h ? 2 : 1, "0") + ":" + String(x).padStart(2, "0"); }
let examTick = null;
function renderExam() {
  if (window.Town && window.Town.unmount) window.Town.unmount();
  view = "exam"; const E = state.examRun; if (!E) return renderHome();
  clearInterval(examTick);
  if (E.onBreak) return renderBreak();
  if (examLeft(E) <= 0) return finishExam(true);
  const [a, b] = E.sections[E.sec], id = E.ids[E.idx], q = byId[id], perm = E.perms[id], chosen = E.ans[id];
  const answeredInSec = E.ids.slice(a, b).filter(x => E.ans[x] != null).length;
  $("#app").innerHTML = `
  <div class="exam-top">
    <div class="spread"><div><div class="eyebrow" style="color:var(--ink-soft)">Part ${E.part} sim · section ${E.sec + 1} of 3</div><div class="timer" id="timer">${fmt(examLeft(E))}</div></div>
      <button class="btn" id="endsec">${E.sec < 2 ? "Finish section" : "Finish exam"}</button></div>
    <div class="progressbar"><i style="width:${100 * Object.keys(E.ans).length / E.ids.length}%"></i></div>
  </div>
  ${E.confirm ? `<div class="confirm" style="margin-bottom:12px"><b>${E.sec < 2 ? `Leave section ${E.sec + 1}? You can't come back to these questions.` : "Submit the exam?"}</b>
    <span class="small">${b - a - answeredInSec ? `${b - a - answeredInSec} unanswered in this section count as wrong.` : "Every question in this section is answered."}</span>
    <div class="row"><button class="btn amber" id="yes">${E.sec < 2 ? "Leave section" : "Submit"}</button><button class="btn ghost" id="no">Keep working</button></div></div>` : ""}
  <article class="sheet">
    <div class="sheet-head"><div class="id"><span class="k">Question ${E.idx + 1} of ${E.ids.length}</span><span class="d">${esc(DOMAINS[q.domain].name)}</span></div><div class="yr"><small>Tax year</small><b>2025</b></div></div>
    <div class="qbody"><p class="qtext">${esc(q.q)}</p></div>
    <div class="choices">${perm.map((o, i) => `<button class="choice${chosen === o ? " sel" : ""}" data-i="${i}"><span class="L">${"ABCD"[i]}</span><span>${esc(q.choices[o])}</span></button>`).join("")}</div>
    <div class="actions"><button class="btn" id="prev" ${E.idx <= a ? "disabled" : ""}>‹ Previous</button><button class="btn primary" id="nxt" ${E.idx >= b - 1 ? "disabled" : ""}>Next ›</button>
      <button class="btn ghost" id="mark">${E.marked[id] ? "Unmark" : "Mark for review"}</button></div>
  </article>
  <section class="card pad" style="margin-top:14px;display:grid;gap:10px"><div class="spread"><h2>Section ${E.sec + 1}</h2><span class="hint">${answeredInSec} of ${b - a} answered</span></div>
    <div class="nav">${E.ids.slice(a, b).map((x, k) => `<button data-go="${a + k}" class="${E.ans[x] != null ? "ans" : ""}${a + k === E.idx ? " cur" : ""}${E.marked[x] ? " mk" : ""}">${a + k + 1}</button>`).join("")}</div>
    <span class="hint">Dark: answered. Dot: marked for review.</span></section>`;
  const t = $("#timer");
  examTick = setInterval(() => { const left = examLeft(E); if (!document.body.contains(t)) return clearInterval(examTick); t.textContent = fmt(left); t.classList.toggle("low", left < 10 * MIN); if (left <= 0) { clearInterval(examTick); finishExam(true); } }, 1000);
  $("#app").querySelectorAll(".choice").forEach(btn => btn.onclick = () => { E.ans[id] = perm[+btn.dataset.i]; save(); if (E.idx < b - 1) { E.idx++; save(); } renderExam(); });
  $("#prev").onclick = () => { E.idx--; save(); renderExam(); };
  $("#nxt").onclick = () => { E.idx++; save(); renderExam(); };
  $("#mark").onclick = () => { E.marked[id] = !E.marked[id]; save(); renderExam(); };
  $("#endsec").onclick = () => { E.confirm = true; save(); renderExam(); window.scrollTo(0, 0); };
  if ($("#no")) $("#no").onclick = () => { E.confirm = false; save(); renderExam(); };
  if ($("#yes")) $("#yes").onclick = () => {
    E.confirm = false;
    if (E.sec < 2) { E.sec++; E.idx = E.sections[E.sec][0]; E.onBreak = Date.now(); save(); renderBreak(); }
    else finishExam(false);
  };
  $("#app").querySelectorAll("[data-go]").forEach(btn => btn.onclick = () => { E.idx = +btn.dataset.go; save(); renderExam(); });
}
function renderBreak() {
  const E = state.examRun; clearInterval(examTick);
  $("#app").innerHTML = `<section class="card pad" style="display:grid;gap:12px;margin-top:8px">
    <div class="eyebrow" style="color:var(--ink-soft)">Scheduled break</div><h3 style="font-size:22px">Section ${E.sec} is done</h3>
    <p style="margin:0">The real exam offers a 10-minute break here, and the clock stops while you take it. Section ${E.sec + 1} is ${E.sections[E.sec][1] - E.sections[E.sec][0]} questions.</p>
    <p class="muted" style="margin:0">Time left on the exam clock: <b>${fmt(examLeft(E))}</b></p>
    <div><button class="btn amber" id="resumebrk">Start section ${E.sec + 1}</button></div></section>`;
  $("#resumebrk").onclick = () => { E.breakMs += Date.now() - E.onBreak; E.onBreak = null; save(); renderExam(); };
}
function finishExam(timeUp) {
  clearInterval(examTick);
  const E = state.examRun; if (!E) return renderHome();
  const per = {}; let right = 0;
  for (const id of E.ids) {
    const q = byId[id], ok = E.ans[id] === q.answer;
    per[q.domain] = per[q.domain] || { n: 0, r: 0 }; per[q.domain].n++; if (ok) { per[q.domain].r++; right++; }
    if (E.ans[id] != null) record(q, ok, "exam");
  }
  const res = { t: Date.now(), part: E.part, n: E.ids.length, right, score: right / E.ids.length, per, timeUp,
    missed: E.ids.filter(id => E.ans[id] !== byId[id].answer).map(id => ({ id, picked: E.ans[id] == null ? null : E.ans[id] })) };
  state.exams.push(res); if (state.exams.length > 30) state.exams = state.exams.slice(-30);
  state.examRun = null; save(); renderResults(res);
}
function renderResults(res) {
  view = "results";
  $("#app").innerHTML = `<div class="qbar"><button class="btn ghost" id="back">‹ Town</button></div>
  <section class="card pad" style="display:grid;gap:8px">
    <div class="eyebrow" style="color:var(--ink-soft)">Part ${res.part} exam sim${res.timeUp ? " · time ran out" : ""}</div>
    <div class="result-big">${pct(res.score)}%</div><div class="muted">${res.right} of ${res.n} correct</div>
    <p class="hint" style="margin:4px 0 0">The real exam reports a scaled score from 200 to 800, with 500 to pass. The IRS doesn't publish how raw answers convert, so this shows your raw percentage. Read it as practice, not a pass prediction.</p>
  </section>
  <section class="card" style="margin-top:14px;overflow-x:auto"><div class="pad"><h2>By content area</h2></div>
    <table class="res"><thead><tr><th style="padding-left:16px">Area</th><th style="text-align:right">Right</th><th style="text-align:right;padding-right:16px">Score</th></tr></thead>
    <tbody>${Object.entries(res.per).sort((a, b) => a[0] < b[0] ? -1 : 1).map(([d, v]) => `<tr><td style="padding-left:16px">${esc(DOMAINS[d].name)}</td><td class="n">${v.r}/${v.n}</td><td class="n" style="padding-right:16px;color:${v.r / v.n >= 0.7 ? "var(--good)" : "var(--bad)"}">${pct(v.r / v.n)}%</td></tr>`).join("")}</tbody></table></section>
  <section class="card" style="margin-top:14px"><div class="pad spread"><h2>Missed questions</h2><span class="hint">${res.missed.length}</span></div>
    ${res.missed.map(m => { const q = byId[m.id]; return `<details class="miss"><summary>${esc(q.q)}</summary><div class="body">
      <span><b>Your answer:</b> ${m.picked == null ? "none" : esc(q.choices[m.picked])}</span><span style="color:var(--good)"><b>Correct:</b> ${esc(q.choices[q.answer])}</span>
      <span style="font-family:var(--f-read)">${esc(q.explain)}</span><span class="hint">${esc(q.source)}</span></div></details>`; }).join("") || `<p class="pad muted" style="margin:0">None. Every answer was right.</p>`}
  </section>`;
  $("#back").onclick = renderHome; window.scrollTo(0, 0);
}

/* ---------- More ---------- */
function updateFlagDot() { const n = BANK.filter(q => st(q.id).flag).length; $("#flagdot").textContent = n ? ` · ${n} flagged` : ""; }
function renderMore() {
  if (window.Town && window.Town.unmount) window.Town.unmount();
  view = "more";
  const flagged = BANK.filter(q => st(q.id).flag);
  const counts = [1, 2, 3].map(p => `Part ${p}: ${BANK.filter(q => q.part === p).length}`).join(" · ");
  /* daily reminder: one calendar file per half hour lives in reminders/ (made by tools/make_reminders.py) */
  const REM_TIMES = []; for (let h = 5; h < 24; h++) for (const m of ["00", "30"]) REM_TIMES.push(String(h).padStart(2, "0") + m);
  const fmtT = t => { const h = +t.slice(0, 2); return `${h % 12 || 12}:${t.slice(2)} ${h < 12 ? "AM" : "PM"}`; };
  const rem = state.reminder || {}, remPick = rem.pick || rem.time || "1900";
  $("#app").innerHTML = `<div class="qbar"><button class="btn ghost" id="back">‹ Town</button></div>
  <div class="stack" style="margin-top:0">
    <section class="card pad" style="display:grid;gap:10px"><h3>How to use this app</h3>
      <p class="muted small" style="margin:0">A 2-minute guide with narration: adding the app to your Home Screen, the town, drills, exam sims and backups.</p>
      <div class="row"><button class="btn primary" id="guidemore">Watch the guide</button></div></section>
    <section class="card pad" style="display:grid;gap:10px"><h3>Daily goal</h3>
      <div class="row">${[10, 20, 30, 50].map(g => `<button class="btn${state.goal === g ? " primary" : ""}" data-goal="${g}">${g} a day</button>`).join("")}</div></section>
    <section class="card pad" style="display:grid;gap:10px"><h3>Daily reminder</h3>
      <p class="muted small" style="margin:0">Get a phone alert at the same time every day. It goes into your phone's Calendar as a repeating "EA practice" event, and the event links back to this app.</p>
      <div class="row" style="align-items:center"><label for="remtime" class="small">Remind me at</label>
        <select id="remtime" class="btn">${REM_TIMES.map(t => `<option value="${t}"${t === remPick ? " selected" : ""}>${fmtT(t)}</option>`).join("")}</select></div>
      <div class="row"><a class="btn primary" id="remadd" style="text-decoration:none" href="reminders/ea-practice-${remPick}.ics">Add to my calendar</a></div>
      ${rem.at ? `<p class="small" style="margin:0"><b>You added a ${fmtT(rem.time)} reminder on ${new Date(rem.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.</b></p>` : ""}
      <p class="hint" style="margin:0">iPhone: tap Add All when the event appears. Android: open the downloaded file with your Calendar app. To change the time or stop the reminder, delete the "EA practice" event in Calendar, then add a new one here.</p></section>
    <section class="card" ><div class="pad spread"><h3>Flagged questions</h3><span class="hint">${flagged.length}</span></div>
      ${flagged.length ? `<div class="pad" style="padding-top:0;display:grid;gap:10px"><div><button class="btn amber" id="copyflags">Copy report for Jose</button></div><textarea id="flagfb" hidden readonly></textarea>
        ${flagged.map(q => `<div style="border-top:1px solid var(--line);padding-top:10px;display:grid;gap:6px"><span class="hint">${esc(q.id)} · ${esc(DOMAINS[q.domain].name)}</span><span style="font-family:var(--f-read)">${esc(q.q)}</span>${st(q.id).note ? `<span class="small" style="background:var(--warn-soft);padding:6px 8px;border-radius:8px">${esc(st(q.id).note)}</span>` : ""}<div><button class="btn ghost" data-unflag="${esc(q.id)}">Unflag</button></div></div>`).join("")}</div>`
        : `<p class="pad muted small" style="margin:0;padding-top:0">None. Tap "Flag as wrong" after answering a question that looks wrong, and it shows up here.</p>`}</section>
    <section class="card pad" style="display:grid;gap:10px"><h3>Backup</h3>
      <p class="muted small" style="margin:0">Your progress lives only in this browser. Save a backup file now and then and keep it somewhere safe, like iCloud Drive, Google Drive or your email. Load it on any phone or computer to pick up where you left off.</p>
      <p class="small" style="margin:0"><b>${backupLine()}</b></p>
      <div class="row"><button class="btn primary" id="savefile">Save backup file</button><button class="btn" id="loadfile">Load backup file</button><input type="file" id="fileinput" accept=".json,application/json" hidden></div>
      <div id="loadconfirm"></div>
      <p class="hint" style="margin:0">On an iPhone, add this app to your Home Screen (Share, then Add to Home Screen). Safari can erase a website's saved data after 7 days of not visiting it; Home Screen apps are exempt.</p>
      <details><summary class="small" style="cursor:pointer">Copy and paste instead</summary>
        <div style="display:grid;gap:10px;margin-top:10px"><div class="row"><button class="btn" id="export">Copy backup</button></div><textarea id="exportfb" hidden readonly></textarea>
        <label for="importtext" class="hint">Restore: paste a backup here. It replaces the progress on this device.</label>
        <textarea id="importtext"></textarea><div class="row"><button class="btn" id="import">Restore</button></div></div></details></section>
    <section class="card pad" style="display:grid;gap:10px"><h3>Start over</h3><p class="muted small" style="margin:0">Erases every answer, review date, exam and flag on this device.</p>
      <div class="row" id="resetrow"><button class="btn danger" id="reset">Erase progress</button></div></section>
    <section class="card pad small muted" style="display:grid;gap:6px"><h3 style="color:var(--ink)">The question bank</h3><span>${BANK.length} questions · ${counts}</span>
      <span>Weights per area come from the PSI Candidate Information Bulletin (revised October 9, 2026). Each question cites the IRS publication, form instructions, Revenue Procedure or Code section it relies on.</span></section>
  </div>`;
  $("#back").onclick = renderHome;
  $("#guidemore").onclick = openGuide;
  $("#app").querySelectorAll("[data-goal]").forEach(b => b.onclick = () => { state.goal = +b.dataset.goal; save(); renderMore(); });
  $("#remtime").onchange = e => { state.reminder = Object.assign({}, state.reminder, { pick: e.target.value }); save(); $("#remadd").href = `reminders/ea-practice-${e.target.value}.ics`; };
  $("#remadd").onclick = () => { const t = $("#remtime").value; state.reminder = { pick: t, time: t, at: Date.now() }; save(); setTimeout(() => { if (view === "more") renderMore(); }, 1200); };
  if ($("#copyflags")) $("#copyflags").onclick = () => copyText(flagged.map(q => `[${q.id}] ${q.q}\nKeyed answer: ${q.choices[q.answer]}\nSource: ${q.source}\nNote: ${st(q.id).note || "(none)"}`).join("\n\n"), $("#flagfb"));
  $("#app").querySelectorAll("[data-unflag]").forEach(b => b.onclick = () => { setSt(b.dataset.unflag, { flag: false, note: "" }); updateFlagDot(); renderMore(); });
  $("#export").onclick = () => copyText(JSON.stringify(state), $("#exportfb"));
  $("#savefile").onclick = async () => { if (await saveBackupFile()) renderMore(); };
  $("#loadfile").onclick = () => $("#fileinput").click();
  $("#fileinput").onchange = e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      let b; try { b = readBackup(String(r.result)); } catch (err) { toast("That file isn't an EA Ledger Drill backup."); return; }
      const when = b.savedAt ? new Date(b.savedAt).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "an unknown date";
      const answered = Object.values(b.state.items).filter(x => x && x.seen).length;
      $("#loadconfirm").innerHTML = `<div class="confirm"><b>Replace the progress on this device with the backup from ${esc(when)}?</b><span class="small">The backup has ${answered} questions answered. What's on this device now will be replaced.</span><div class="row"><button class="btn amber" id="loadyes">Replace with backup</button><button class="btn ghost" id="loadno">Cancel</button></div></div>`;
      $("#loadyes").onclick = () => { state = Object.assign(blank(), b.state, { lastBackup: b.savedAt || Date.now(), examRun: null }); save(); updateFlagDot(); toast("Backup loaded."); renderMore(); };
      $("#loadno").onclick = () => { $("#loadconfirm").innerHTML = ""; };
    };
    r.readAsText(f); e.target.value = "";
  };
  $("#import").onclick = () => { try { const s = JSON.parse($("#importtext").value); if (!s || typeof s.items !== "object") throw 0; s.examRun = null; state = Object.assign(blank(), s); save(); updateFlagDot(); toast("Backup restored."); renderMore(); } catch (e) { toast("That isn't a valid backup. Paste the full text you copied."); } };
  $("#reset").onclick = () => {
    $("#resetrow").innerHTML = `<span>Erase everything on this device?</span><button class="btn danger" id="ry">Yes, erase</button><button class="btn ghost" id="rn">Cancel</button>`;
    $("#ry").onclick = () => { state = blank(); save(); updateFlagDot(); toast("Progress erased."); renderMore(); };
    $("#rn").onclick = renderMore;
  };
}

/* ---------- wiring ---------- */
$("#morebtn").onclick = () => (view === "more" ? renderHome() : renderMore());
document.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (e.target.tagName || "").toLowerCase(); if (tag === "textarea" || tag === "input" || tag === "select") return;
  const k = e.key.toLowerCase(), i = "abcd".indexOf(k) >= 0 ? "abcd".indexOf(k) : "1234".indexOf(k);
  if (e.key === "Escape" && $("#scrim")) return $("#guidevid") ? closeGuide() : closeLayer();
  if (view === "drill" && drill && drill.q) {
    if (drill.picked == null && i >= 0) { e.preventDefault(); answerDrill(i); }
    else if (drill.picked != null && !drill.flagging && (k === "enter" || k === "n")) { e.preventDefault(); nextQ(); }
  } else if (view === "exam" && state.examRun && !state.examRun.onBreak && i >= 0) {
    const btn = $("#app").querySelectorAll(".choice")[i]; if (btn) { e.preventDefault(); btn.click(); }
  }
});
updateFlagDot();
if (state.examRun) renderExam(); else renderHome();
