/* Two exams share one bank. EA mode drills the EA questions. CPA mode (state.exam "cpa") drills REG: every question
   tagged REG, filed under its first REG area, plus the CPA-only questions (exam "cpa", such as business law).
   Progress is keyed by question id, so an answer counts in both modes. useExam() swaps BANK, DOMAINS, PARTS and byId. */
/* the bank arrives in pieces ahead of this script (see tools/build.py), each question with its index in questions.json */
const BANK_ALL = (() => { const a = []; for (const piece of window.__bank || []) for (const [i, q] of piece) a[i] = q; return a.filter(Boolean); })();
const EA_BANK = BANK_ALL.filter(q => q.exam !== "cpa");
const REG_BANK = BANK_ALL.filter(q => q.exam === "cpa" ? q.part === "REG" : (q.cpa || []).some(t => t.startsWith("REG")))
  .map(q => q.exam === "cpa" ? q : Object.assign({}, q, { part: "REG", domain: q.cpa.find(t => t.startsWith("REG")) }));
/* TCP: every question tagged TCP, filed under its TCP area. A question can sit in both REG and TCP, so CPA mode holds a copy per
   section and byId follows the current section (indexById). */
const TCP_BANK = BANK_ALL.filter(q => (q.cpa || []).some(t => t.startsWith("TCP")))
  .map(q => Object.assign({}, q, { part: "TCP", domain: q.cpa.find(t => t.startsWith("TCP")) }));
/* AUD: the CPA-only questions written for it (exam "cpa", part "AUD"); no EA question carries an AUD tag */
const AUD_BANK = BANK_ALL.filter(q => q.exam === "cpa" && q.part === "AUD");
/* FAR: the CPA-only questions written for it (exam "cpa", part "FAR") */
const FAR_BANK = BANK_ALL.filter(q => q.exam === "cpa" && q.part === "FAR");
const CPA_BANK = REG_BANK.concat(FAR_BANK, AUD_BANK, TCP_BANK);
let BANK = EA_BANK;
const EA_DOMAINS = {
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
/* REG areas from the AICPA's 2026 blueprint (effective January 2026). n is the midpoint of each area's weight range, w the range itself. */
const REG_DOMAINS = {
  "REG-I": { part: "REG", name: "Ethics, Professional Responsibilities and Federal Tax Procedures", short: "Ethics and procedures", n: 15, w: "10–20%", bld: "the practitioner's office" },
  "REG-II": { part: "REG", name: "Business Law", short: "Business law", n: 20, w: "15–25%", bld: "the courthouse" },
  "REG-III": { part: "REG", name: "Federal Taxation of Property Transactions", short: "Property", n: 10, w: "5–15%", bld: "the Bank" },
  "REG-IV": { part: "REG", name: "Federal Taxation of Individuals", short: "Individuals", n: 27, w: "22–32%", bld: "the brownstones" },
  "REG-V": { part: "REG", name: "Federal Taxation of Entities", short: "Entities", n: 28, w: "23–33%", bld: "the Midtown tower" },
  /* AUD areas from the same 2026 blueprint */
  "AUD-I": { part: "AUD", name: "Ethics, Professional Responsibilities and General Principles", short: "Ethics and principles", n: 20, w: "15–25%", bld: "the practitioner's office" },
  "AUD-II": { part: "AUD", name: "Assessing Risk and Developing a Planned Response", short: "Risk and planning", n: 30, w: "25–35%", bld: "the Midtown tower" },
  "AUD-III": { part: "AUD", name: "Performing Further Procedures and Obtaining Evidence", short: "Procedures and evidence", n: 35, w: "30–40%", bld: "the courthouse" },
  "AUD-IV": { part: "AUD", name: "Forming Conclusions and Reporting", short: "Conclusions and reporting", n: 15, w: "10–20%", bld: "the post office" },
  /* TCP areas from the same 2026 blueprint */
  "TCP-I": { part: "TCP", name: "Tax Compliance and Planning for Individuals and Personal Financial Planning", short: "Individuals and planning", n: 35, w: "30–40%", bld: "the planner's office" },
  "TCP-II": { part: "TCP", name: "Entity Tax Compliance", short: "Entity compliance", n: 35, w: "30–40%", bld: "the loft building" },
  "TCP-III": { part: "TCP", name: "Entity Tax Planning", short: "Entity planning", n: 15, w: "10–20%", bld: "the townhouse mansion" },
  "TCP-IV": { part: "TCP", name: "Property Transactions (disposition of assets)", short: "Property transactions", n: 15, w: "10–20%", bld: "the Bank" },
  /* FAR areas from the same 2026 blueprint */
  "FAR-I": { part: "FAR", name: "Financial Reporting", short: "Financial reporting", n: 35, w: "30–40%", bld: "the Midtown tower" },
  "FAR-II": { part: "FAR", name: "Select Balance Sheet Accounts", short: "Balance sheet accounts", n: 35, w: "30–40%", bld: "the Bank" },
  "FAR-III": { part: "FAR", name: "Select Transactions", short: "Select transactions", n: 30, w: "25–35%", bld: "the loft building" }
};
let DOMAINS = EA_DOMAINS;
const EA_PARTS = { 1: "Individuals", 2: "Businesses", 3: "Representation" };
/* CPA sections in the order of the section signs */
const CPA_PARTS = { REG: "Regulation", FAR: "Financial Accounting and Reporting", AUD: "Auditing and Attestation", TCP: "Tax Compliance and Planning" };
/* the sim each live section gets: the multiple-choice half of the real exam, as the 2026 blueprint counts it */
const SIMS = { REG: { mcq: 72, tbs: 8 }, FAR: { mcq: 50, tbs: 7 }, AUD: { mcq: 78, tbs: 7 }, TCP: { mcq: 68, tbs: 7 } };
const LIVE_SECTIONS = new Set(Object.keys(SIMS));
let PARTS = EA_PARTS;
const CPA = { "REG-I": "REG ethics and procedures", "REG-III": "REG property", "REG-IV": "REG individuals", "REG-V": "REG entities", "TCP-I": "TCP individuals", "TCP-II": "TCP entity compliance", "TCP-III": "TCP entity planning", "TCP-IV": "TCP property" };
const MIN = 60e3, DAY = 864e5;
const INTERVALS = [5 * MIN, DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY];
const KEY = "eaTaxTown.v2", OLDKEY = "eaLedgerDrill.v1";
let byId = Object.fromEntries(BANK.map(q => [q.id, q]));

/* ---------- state ---------- */
function blank() { return { v: 2, exam: "ea", items: {}, log: [], part: "1", goal: 20, exams: [], examRun: null, shown: {}, lastBackup: 0, reminder: null, name: "", nameAsked: false, examDates: {} }; }
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
const isCpa = () => state.exam === "cpa";
/* The parts (EA) or sections (CPA) in order: numbers for EA, as the rest of the app expects, codes for CPA */
const partKeys = () => isCpa() ? Object.keys(CPA_PARTS) : [1, 2, 3];
const PL = p => isCpa() ? String(p) : 'Part ' + p;
const isLive = p => !isCpa() || LIVE_SECTIONS.has(String(p));
/* a part bullet (EA: round, numbered) or section sign (CPA: rounded rectangle, its code) */
const partSign = (p, cls = "") => `<span class="bul${isCpa() ? " sec" : ""}${cls}" data-part="${p}" aria-hidden="true">${p}</span>`;
function useExam(x) {
  const cpa = x === "cpa";
  if (cpa && !isCpa() && !(state.part in CPA_PARTS)) state.eaPart = state.part;
  state.exam = cpa ? "cpa" : "ea";
  BANK = cpa ? CPA_BANK : EA_BANK; DOMAINS = cpa ? REG_DOMAINS : EA_DOMAINS; PARTS = cpa ? CPA_PARTS : EA_PARTS;
  if (cpa && !LIVE_SECTIONS.has(state.part)) state.part = "REG";
  if (!cpa && !(state.part in EA_PARTS)) state.part = state.eaPart || "1";
  indexById();
  drawSignage();
}
/* byId: every EA question, or in CPA mode the current section's copies */
function indexById() { byId = Object.fromEntries((isCpa() ? BANK.filter(q => q.part === state.part) : BANK).map(q => [q.id, q])); }
function setPart(p) { state.part = String(p); if (isCpa()) indexById(); }
/* The app bar, sidebar and footer follow the exam: title, part bullets or section signs, and the EA/CPA switch */
function examSwitch() { return `<span class="exsw" role="group" aria-label="Exam"><button type="button" data-ex="ea" aria-pressed="${!isCpa()}">EA</button><button type="button" data-ex="cpa" aria-pressed="${isCpa()}">CPA</button></span>`; }
function drawSignage() {
  const title = "Above the Line", lines = document.querySelector(".appbar .lines");
  if (!lines) return;
  document.body.classList.toggle("cpa", isCpa());
  document.querySelector(".appbar h1").textContent = title;
  lines.innerHTML = partKeys().map(n => partSign(n, isLive(n) ? "" : " off")).join("") + examSwitch() + (isCpa() ? "" : `<span class="t">Tax Year 2025</span>`);
  document.querySelector(".tb-brand").innerHTML = `${title}<div class="tb-sw">${examSwitch()}</div>`;
  const f = document.querySelector("#footnote");
  f.textContent = isCpa() ? "CPA mode covers REG and TCP on the AICPA's 2026 blueprint. Tax questions follow tax year 2025 law as amended through December 31, 2025. Business law questions cite the Uniform Commercial Code, the U.S. Code, the uniform acts and Cornell's Wex legal dictionary. Each was drafted with AI help and independently checked against the source it cites. If one looks wrong, flag it."
    : "Questions follow tax year 2025 law as amended through December 31, 2025, which is what the July 1, 2026 to February 28, 2027 exam window tests. Each was drafted with AI help and independently checked against the IRS source it cites. If one looks wrong, flag it.";
  document.querySelectorAll(".exsw button").forEach(b => b.onclick = () => { if (b.dataset.ex === state.exam) return; useExam(b.dataset.ex); tsView = false; save(); updateFlagDot(); if (view === "more") renderMore(); else renderHome(); });
}
/* an exam sim in progress belongs to the exam it was started in */
useExam(state.examRun ? state.examRun.exam || "ea" : state.exam);
let view = "home";
let drill = null;        // { domain|null, q, reason, perm, picked, flagging }
let sess = null;         // the current drill session: { t, domain, rows: [{ id, ok, g, first }], m0: { area: mastery at its first answer } }
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
  /* first answer of the day: keep each area's mastery as it stood, so the daily summary can show what grew */
  if (!state.day || state.day.k !== dayKey(now)) state.day = { k: dayKey(now), m: Object.fromEntries(Object.keys(DOMAINS).map(d => [d, mastery(d)])) };
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
    if (/Android|iPhone|iPad|Mobi/i.test(navigator.userAgent) && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "Above the Line backup" }); done = true; }
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
  return { exam: state.exam, mastery: m, due, part: state.part, from: Object.assign({}, state.shown) };
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
/* ---------- home: each part drawn as a subway strip map ---------- */
/* Each area is a station on its part's line (LINE, below). The bullet at a station is a transfer to a real line, in that line's official color. */
const ROUTE = { "P1-1": "A", "P1-2": "B", "P1-3": "G", "P1-4": "N", "P1-5": "4", "P1-6": "7", "P2-1": "E", "P2-2": "L", "P2-3": "J", "P3-1": "D", "P3-2": "C", "P3-3": "W", "P3-4": "2", "REG-I": "1", "REG-II": "7", "REG-III": "J", "REG-IV": "4", "REG-V": "L", "AUD-I": "B", "AUD-II": "D", "AUD-III": "F", "AUD-IV": "M", "TCP-I": "5", "TCP-II": "M", "TCP-III": "Z", "TCP-IV": "Q", "FAR-I": "G", "FAR-II": "6", "FAR-III": "R" };
const ROUTE_COLOR = { A: "#0039a6", C: "#0039a6", E: "#0039a6", B: "#ff6319", D: "#ff6319", F: "#ff6319", M: "#ff6319", G: "#6cbe45", J: "#996633", Z: "#996633", L: "#a7a9ac",
  N: "#fccc0a", Q: "#fccc0a", R: "#fccc0a", W: "#fccc0a", 1: "#ee352e", 2: "#ee352e", 3: "#ee352e", 4: "#00933c", 5: "#00933c", 6: "#00933c", 7: "#b933ad" };
const RIVER = { 1: "Hudson River", 2: "East River", 3: "Harlem River", REG: "Hudson River", AUD: "East River", TCP: "Harlem River", FAR: "Bronx River" };
const routeBullet = r => `<span class="rbul${"NQRW".includes(r) ? " dk" : ""}" style="background:${ROUTE_COLOR[r]}">${r}</span>`;
/* Painted building art per area goes in art/area-<id>.webp (e.g. art/area-p1-1.webp), transparent background.
   Add the id here once its file is in; until then the station shows the drawn building below, lit to mastery. */
const ART = new Set([]);
/* Drawn building per area: s = shapes (b body, t trim), w = windows [x, y, w, h], lit bottom-up with mastery */
const grid = (x0, y0, cols, rows, dx, dy, w, h) => { const a = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) a.push([x0 + c * dx, y0 + r * dy, w, h]); return a; };
const BLD = {
  "P1-1": { s: '<rect class="b" x="8" y="26" width="44" height="48"/><rect class="t" x="6" y="23" width="48" height="4" rx="1"/><rect class="t" x="10" y="46" width="40" height="5"/><path class="t" d="M8 56h44l-2 6H10z"/><rect class="b" x="26" y="64" width="8" height="10" opacity=".6"/>',
    w: [[11,64,13,9],[36,64,13,9]].concat(grid(12, 29, 3, 2, 14.5, 8, 7, 6)) },
  "P1-2": { s: '<path class="t" d="M4 28L30 14L56 28Z"/><rect class="t" x="5" y="28" width="50" height="3"/><rect class="b" x="7" y="31" width="46" height="37"/><rect class="t" x="9" y="31" width="3.5" height="37"/><rect class="t" x="20.5" y="31" width="3.5" height="37"/><rect class="t" x="36" y="31" width="3.5" height="37"/><rect class="t" x="47.5" y="31" width="3.5" height="37"/><rect class="t" x="5" y="68" width="50" height="2.5"/><rect class="t" x="3" y="71" width="54" height="3"/>',
    w: [[14,56,5,9],[26,56,8,12],[41,56,5,9],[14,44,5,9],[27,44,6,9],[41,44,5,9],[14,34,5,7],[27,34,6,7],[41,34,5,7]] },
  "P1-3": { s: '<rect class="b" x="3" y="24" width="18" height="50"/><rect class="b" x="21" y="20" width="18" height="54"/><rect class="b" x="39" y="26" width="18" height="48"/><rect class="t" x="2" y="22" width="20" height="3"/><rect class="t" x="20" y="18" width="20" height="3"/><rect class="t" x="38" y="24" width="20" height="3"/><path class="t" d="M5 74l6-7h3v7zM23 74l6-7h3v7zM41 74l6-7h3v7z"/>',
    w: grid(6, 35, 6, 3, 0, 10, 4, 6).map((w, i) => [[6, 13, 24, 31, 42, 49][i % 6], w[1], 4, 6]).concat([[24,26,4,5],[31,26,4,5]]) },
  "P1-4": { s: '<rect class="t" x="35" y="6" width="10" height="9" rx="1"/><path class="t" d="M34 6l6-4 6 4z"/><rect class="t" x="36" y="15" width="1.5" height="5"/><rect class="t" x="42.5" y="15" width="1.5" height="5"/><rect class="b" x="12" y="20" width="36" height="54"/><rect class="t" x="10" y="18" width="40" height="3"/>' + [30, 40, 50, 60].map(y => `<rect class="t" x="10" y="${y + 6}" width="18" height="1.4"/><path class="t" d="M12 ${y + 6}L26 ${y - 4}L27.2 ${y - 3.2}L13.2 ${y + 6.8}z"/>`).join(""),
    w: grid(16, 24, 2, 5, 8, 10, 6, 6).concat(grid(38, 24, 1, 5, 0, 10, 6, 6)) },
  "P1-5": { s: '<rect class="b" x="10" y="22" width="40" height="52"/><rect class="b" x="17" y="10" width="26" height="13"/><rect class="t" x="16" y="8" width="28" height="2.5"/><rect class="t" x="9" y="20" width="42" height="2.5"/><rect class="t" x="29" y="2" width="1.5" height="6"/>',
    w: grid(13, 27.6, 4, 7, 9.2, 6.4, 7.6, 4).concat(grid(19.5, 13, 3, 1, 7.5, 0, 6, 4)) },
  "P1-6": { s: '<rect class="t" x="11" y="12" width="4" height="10"/><rect class="t" x="45" y="12" width="4" height="10"/><path class="t" d="M6 34L11 20H49L54 34Z"/><rect class="b" x="6" y="34" width="48" height="40"/><rect class="t" x="4" y="32" width="52" height="3"/><path class="t" d="M24 74v-11a6 6 0 0 1 12 0v11z"/>',
    w: [[18,25,5,6],[27.5,25,5,6],[37,25,5,6],[10,38,6,8],[19,38,6,8],[27,38,6,8],[35,38,6,8],[44,38,6,8],[10,52,6,9],[19,52,6,9],[35,52,6,9],[44,52,6,9]] },
  /* Midtown tower: art deco setbacks and a spire */
  "P2-1": { s: '<rect class="t" x="29.2" y="0" width="1.6" height="10"/><rect class="b" x="24" y="10" width="12" height="9"/><rect class="b" x="19" y="19" width="22" height="12"/><rect class="b" x="14" y="31" width="32" height="43"/><rect class="t" x="23" y="9" width="14" height="2"/><rect class="t" x="18" y="18" width="24" height="2"/><rect class="t" x="13" y="30" width="34" height="2"/>',
    w: grid(17, 35, 4, 6, 7, 6.4, 4.5, 4).concat(grid(22, 22, 3, 1, 6, 0, 4, 5), [[27.5,13,5,4]]) },
  /* loft building: cast-iron front, big windows */
  "P2-2": { s: '<rect class="b" x="5" y="24" width="50" height="50"/><rect class="t" x="3" y="21" width="54" height="4"/><rect class="t" x="5" y="36" width="50" height="1.5"/><rect class="t" x="5" y="48" width="50" height="1.5"/><rect class="t" x="5" y="60" width="50" height="1.5"/>',
    w: grid(8, 27, 4, 4, 12, 12, 9, 7.5) },
  /* rooftop farm: low block with a greenhouse and planters on the roof */
  "P2-3": { s: '<path class="t" d="M14 40V32L24 26L34 32V40Z" opacity=".85"/><rect class="t" x="38" y="35" width="14" height="5" rx="1"/><path class="t" d="M40 35c1-4 3-4 4 0M46 35c1-5 3-5 4 0"/><rect class="b" x="6" y="40" width="48" height="34"/><rect class="t" x="4" y="38" width="52" height="3"/>',
    w: grid(10, 45, 4, 3, 11.5, 9.5, 7, 6).concat([[18,33,4,5],[26,33,4,5]]) },
  /* practitioner's office: four floors and a door canopy */
  "P3-1": { s: '<rect class="b" x="12" y="24" width="36" height="50"/><rect class="t" x="10" y="21" width="40" height="4"/><rect class="t" x="22" y="62" width="16" height="2.5"/><rect class="b" x="26" y="65" width="8" height="9" opacity=".6"/>',
    w: grid(16, 28, 3, 4, 10.5, 8.5, 7, 5.5).concat([[16,65,6,6],[38,65,6,6]]) },
  /* courthouse: colonnade with a stepped tower */
  "P3-2": { s: '<path class="t" d="M23 18L30 8L37 18Z"/><rect class="b" x="21" y="18" width="18" height="24"/><path class="t" d="M3 46L30 38L57 46Z"/><rect class="b" x="5" y="46" width="50" height="23"/>' + [7, 15, 23, 33, 41, 49].map(x => `<rect class="t" x="${x}" y="46" width="3" height="23"/>`).join("") + '<rect class="t" x="3" y="69" width="54" height="2.5"/><rect class="t" x="1" y="71.5" width="58" height="2.5"/>',
    w: [[11.5,52,2.5,12],[19.5,52,2.5,12],[28,52,4,15],[37.5,52,2.5,12],[45.5,52,2.5,12]].concat(grid(24, 22, 2, 3, 7, 6.5, 5, 4)) },
  /* collections office: a plain slab of narrow windows */
  "P3-3": { s: '<rect class="b" x="9" y="16" width="42" height="58"/><rect class="t" x="8" y="14" width="44" height="3"/><rect class="t" x="9" y="66" width="42" height="1.5"/>',
    w: grid(12, 20, 6, 7, 6.4, 6.4, 3.6, 4.2) },
  /* post office: a long colonnade with a flagpole */
  "P3-4": { s: '<rect class="t" x="29.3" y="14" width="1.4" height="20"/><path class="t" d="M30.7 14h9v6h-9z" opacity=".9"/><rect class="b" x="2" y="38" width="56" height="31"/><rect class="t" x="1" y="35" width="58" height="4"/>' + [4, 12, 20, 28, 36, 44, 52].map(x => `<rect class="t" x="${x}" y="44" width="3" height="25"/>`).join("") + '<rect class="t" x="1" y="69" width="58" height="2.5"/><rect class="t" x="0" y="71.5" width="60" height="2.5"/>',
    w: grid(8, 48, 6, 1, 8, 0, 3, 16).concat(grid(8, 40, 6, 1, 8, 0, 3, 2.5)) }
};
/* REG areas reuse the EA buildings that fit them */
Object.assign(BLD, { "REG-I": BLD["P3-1"], "REG-II": BLD["P3-2"], "REG-III": BLD["P1-2"], "REG-IV": BLD["P1-3"], "REG-V": BLD["P2-1"], "AUD-I": BLD["P3-1"], "AUD-II": BLD["P2-1"], "AUD-III": BLD["P3-2"], "AUD-IV": BLD["P3-4"], "TCP-I": BLD["P1-5"], "TCP-II": BLD["P2-2"], "TCP-III": BLD["P1-6"], "TCP-IV": BLD["P1-2"], "FAR-I": BLD["P2-1"], "FAR-II": BLD["P1-2"], "FAR-III": BLD["P2-2"] });
function bldSvg(d, m) {
  const B = BLD[d], order = B.w.map((w, i) => i).sort((a, b) => B.w[b][1] - B.w[a][1] || B.w[a][0] - B.w[b][0]);
  const on = new Set(order.slice(0, Math.floor(m * B.w.length + 1e-9)));
  return `<svg class="bld" viewBox="0 0 60 76" aria-hidden="true">${B.s}${B.w.map((w, i) => `<rect class="w${on.has(i) ? " on" : ""}" x="${w[0]}" y="${w[1]}" width="${w[2]}" height="${w[3]}" rx=".5"/>`).join("")}</svg>`;
}
const stopsLine = m => `<span class="stops" aria-hidden="true"><i style="width:calc((100% - 10px) * ${m})"></i>${[0, 0.25, 0.5, 0.75, 1].map(x => `<b class="${m > 0 && m + 1e-9 >= x ? "on" : ""}" style="left:calc(5px + (100% - 10px) * ${x})"></b>`).join("")}</span>`;
function stripMap(p, focus) {
  const now = Date.now();
  const rows = partDomains(p).map(d => {
    const D = DOMAINS[d], m = mastery(d), due = inBank(d).filter(q => isDue(q, now)).length, share = D.w ? D.w.replace(/%$/, "") : Math.round(D.n / 85 * 100);
    const art = ART.has(d) ? `<img src="art/area-${d.toLowerCase()}.webp" alt="" loading="lazy">` : bldSvg(d, m);
    const prog = `<span class="prog">${stopsLine(m)}<span class="pc${m ? "" : " zero"}">${m ? pct(m) + "%" : "Not started"}</span></span>`;
    const where = `<span class="hood">${esc(D.bld.replace(/^the /, ""))}</span><span>${share}% of exam</span>${due ? `<b>${due} due</b>` : ""}`;
    if (d === focus) return `<div class="srow"><span class="sdot"></span><div class="sbox">
      <div class="shd">${routeBullet(ROUTE[d])}<span>Next stop</span></div>
      <div class="snm">${esc(D.name)}</div><div class="swhere">${where}</div>${prog}
      <button class="sgo" data-drill="${d}">Practice <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4l4 4-4 4"/></svg></button>
      <span class="sart" aria-hidden="true">${art}</span></div></div>`;
    return `<button class="srow${m >= 0.999 ? " done" : ""}" data-drill="${d}" aria-label="Practice ${esc(D.name)}, ${pct(m)}% mastered"><span class="sdot"></span>
      <span class="stxt"><span class="snm">${esc(D.name)}</span><span class="swhere">${routeBullet(ROUTE[d])}${where}</span>${prog}</span>
      <span class="sart" aria-hidden="true">${art}</span></button>`;
  }).join("");
  return `<section class="smap" style="--line:${LINE[p]}"><div class="river" aria-hidden="true"><span>${RIVER[p]}</span></div><div class="rail" aria-hidden="true"></div>${rows}</section>`;
}
/* The elevated line between the greeting and the town card: a two-car train in the part's route color, parked at readiness r (0 to 1). */
/* CPA sections take the colors of their section signs: REG A C E blue, FAR G green, AUD B D F M orange, TCP N Q R W yellow */
const LINE = { 1: "#ee352e", 2: "#00933c", 3: "#b933ad", REG: "#0039a6", FAR: "#6cbe45", AUD: "#ff6319", TCP: "#fccc0a" };
function elCar(p, lead) {
  const c = LINE[p], id = lead ? "elB" : "elA", wx = lead ? [8, 42, 76, 110] : [8, 46, 84, 122], sx = lead ? [38, 72, 106] : [40, 78, 116];
  return `<svg class="el-car" viewBox="0 0 180 46" aria-hidden="true">
    <defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f5f9"/><stop offset=".5" stop-color="#c3c9d3"/><stop offset="1" stop-color="#8e96a4"/></linearGradient>
      <linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4cf"/><stop offset="1" stop-color="#f6c766"/></linearGradient></defs>
    <path d="${lead ? "M2 8Q2 4 6 4H158Q171 4 176 13L178 20V36H2Z" : "M2 8Q2 4 6 4H174Q178 4 178 8V36H2Z"}" fill="url(#${id}s)"/>
    <rect x="6" y="4.6" width="${lead ? 150 : 168}" height="1.6" rx=".8" fill="#fff" opacity=".7"/>
    ${wx.map(x => `<rect x="${x}" y="10" width="28" height="12" rx="2.5" fill="url(#${id}w)"/><path d="M${x + 6} 10h7l-6 12h-7z" fill="#fff" opacity=".22"/>`).join("")}
    ${sx.map(x => `<rect x="${x}" y="7" width="2" height="27" fill="#8a92a1" opacity=".5"/>`).join("")}
    <rect x="2" y="25" width="176" height="3" fill="${c}"/><rect x="2" y="33" width="176" height="3" fill="#6f7787"/>
    ${lead ? `<path d="M165 8.5L173 14.5V21H165Z" fill="#1b2236"/><circle cx="151" cy="16" r="7" fill="${c}"/>
      <text x="151" y="19.6" text-anchor="middle" font-family="Helvetica Neue, Inter, sans-serif" font-weight="700" font-size="10.5" fill="#fff">${p}</text>
      <circle cx="175.5" cy="28" r="1.8" fill="#fff6cc"/>` : ""}
    <rect x="12" y="36" width="156" height="3" fill="#17162b"/><rect x="18" y="37" width="32" height="5" rx="2.5" fill="#0f0e1d"/><rect x="130" y="37" width="32" height="5" rx="2.5" fill="#0f0e1d"/>
    ${[25, 43, 137, 155].map(x => `<circle cx="${x}" cy="42" r="3.2" fill="#2b2945" stroke="#4a4770" stroke-width=".8"/>`).join("")}
  </svg>`;
}
function elLine(p, r) {
  const at = Math.min(1, Math.max(0, r || 0)).toFixed(3);
  return `<div class="el${skyNow() === "day" ? " day" : ""}" aria-hidden="true"><div class="el-cols"><i></i></div><div class="el-deck"><i></i></div>
    <div class="el-sign"><b>EXAM READY</b><i></i></div>
    <div class="el-train" style="--r:${at}">${elCar(p, false)}${elCar(p, true)}<i class="el-beam"></i></div></div>`;
}
/* ---------- exam day: a date per part, counted down on Today and Exam ---------- */
const WINDOW_END = "2027-02-28"; /* the July 1, 2026 to February 28, 2027 testing window */
const examDate = p => (state.examDates || {})[p] || "";
function daysTo(iso) { const [y, m, d] = iso.split("-").map(Number), now = new Date(); now.setHours(0, 0, 0, 0); return Math.round((new Date(y, m - 1, d) - now) / 864e5); }
const fmtDay = (iso, o) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, o || { month: "short", day: "numeric" }); };
const bestSim = p => { const s = state.exams.filter(e => String(e.part) === String(p)).map(e => e.score); return s.length ? Math.max(...s) : null; };
function countPill(p) {
  const iso = examDate(p); if (!iso) return "";
  const d = daysTo(iso);
  if (d < 0) return "";
  return `<div class="countpill">${d === 0 ? `<b>Exam day</b> Good luck on ${PL(p)}` : `<b>${d}</b> day${d === 1 ? "" : "s"} to ${PL(p)} <span>· ${fmtDay(iso)}</span>`}</div>`;
}
function examDayCard(p) {
  const iso = examDate(p), d = iso ? daysTo(iso) : null;
  const head = !iso ? `<p class="muted small" style="margin:8px 0 0">Set your ${PL(p)} date to count down to it.</p>`
    : d < 0 ? `<p class="muted small" style="margin:8px 0 0">${PL(p)} was on ${fmtDay(iso, { weekday: "short", month: "short", day: "numeric" })}. Set your next date.</p>`
    : `<div class="ed-days">${d === 0 ? "Today" : d}${d === 0 ? "" : `<span>day${d === 1 ? "" : "s"}</span>`}</div>
      <div class="muted small">${PL(p)} · ${fmtDay(iso, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}${isCpa() ? (d === 0 ? " · good luck" : "") : iso > WINDOW_END ? ` · <b class="ed-warn">after the window closes Feb 28</b>` : d === 0 ? " · good luck" : " · the window closes Feb 28"}</div>`;
  return `<section class="card pad examday"><div class="ed-top"><div><h2>Exam day</h2>${head}</div><button class="btn" type="button" data-setdate="${p}">${iso && d >= 0 ? "Change" : "Set date"}</button></div>
    <div class="ed-parts">${partKeys().map(n => { const r = readiness(String(n)), b = bestSim(n), di = examDate(String(n));
      return !isLive(n) ? `<div class="ed-row off">${partSign(n)}<span class="ed-mid"><span class="ed-nm">${PARTS[n]}</span><span class="ed-sub">Not in the app yet</span></span></div>` : `<button class="ed-row" type="button" data-setdate="${n}" aria-label="${PL(n)}, ${PARTS[n]}: ${pct(r)}% ready${di ? ", exam " + fmtDay(di) : ", no date set"}">${partSign(n)}
        <span class="ed-mid"><span class="ed-nm">${PARTS[n]}</span><span class="meter"><i style="width:${pct(r)}%;--hue:${LINE[n]}"></i></span><span class="ed-sub">${di ? fmtDay(di) : "No date"}${b != null ? ` · best sim ${pct(b)}%` : ""}</span></span>
        <span class="ed-num">${pct(r)}%</span></button>`; }).join("")}</div></section>`;
}
function askExamDate(p) {
  const iso = examDate(p), today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  $("#layer").innerHTML = `<div class="scrim" id="scrim"><form class="bsheet" id="dateform" role="dialog" aria-label="${PL(p)} exam date"><div class="grab"></div>
    <h3>When is your ${PL(p)} exam?</h3>
    <input id="datein" class="namein" type="date" value="${iso}" min="${today.toISOString().slice(0, 10)}" aria-label="${PL(p)} exam date">
    <p class="hint" id="datewarn" style="margin:0"></p>
    <div class="row"><button class="btn primary" type="submit">Save</button>${iso ? `<button class="btn ghost" type="button" id="dateclear">Clear date</button>` : ""}<button class="btn ghost" type="button" id="datecancel">Cancel</button></div></form></div>`;
  const warn = () => { const v = $("#datein").value; $("#datewarn").textContent = isCpa() ? "Pick the date on your Prometric appointment." : v && v > WINDOW_END ? "That's after the window closes on February 28, 2027. Check the date with PSI." : "The current testing window closes February 28, 2027."; };
  $("#datein").oninput = warn; warn();
  $("#scrim").onclick = e => { if (e.target.id === "scrim") closeLayer(); };
  $("#datecancel").onclick = closeLayer;
  if ($("#dateclear")) $("#dateclear").onclick = () => { delete state.examDates[p]; save(); closeLayer(); renderHome(); };
  $("#dateform").onsubmit = e => { e.preventDefault(); const v = $("#datein").value; closeLayer(); if (v) { state.examDates = Object.assign({}, state.examDates, { [p]: v }); save(); renderHome(); } };
}

/* Home is four sections, each one screen: Today (greeting, readiness, Play), City (the 3D town), Map (the strip map) and
   Exam (sims). The tab bar in shell.html switches them; at 1024px and wider it becomes a sidebar and Today sits beside the
   map. Every launch opens on Today; within a visit Home comes back to the section you left. */
let homeTab = "today", greetStale = false;
function setHomeTab(t) {
  homeTab = t;
  const panes = $(".panes"); if (!panes) return;
  panes.dataset.tab = t; $(".tabbar").dataset.cur = t; syncPage();
  document.querySelectorAll(".tabbar [data-tab]").forEach(b => b.dataset.tab === t ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  window.scrollTo(0, 0);
  const todayShown = $(".pane-today").getClientRects().length > 0;
  /* the buddy's thought cloud floats on <body>, so it would stay on screen over another section */
  if (!todayShown) document.querySelectorAll(".buddy-thought").forEach(e => e.remove());
  /* the greeting's hello can't play while it's hidden: if Home was drawn on another section, draw it again now it shows */
  if (greetStale && todayShown) { greetStale = false; renderHome(); } /* clear it first: renderHome calls setHomeTab before it re-checks */
}
function renderHome() {
  view = "home";
  document.querySelectorAll(".appbar .bul").forEach(b => b.classList.toggle("on", b.dataset.part === state.part));
  const p = state.part, r = readiness(p), g = gap(p), dueP = dueIn(q => String(q.part) === p);
  const done = todayCount(), sk = streak(), night = skyNow() === "dusk" ? " night" : "";
  /* Day one: nothing answered yet, so the card names the first stop instead of a row of zeros, and Play starts that area */
  const firstRide = !BANK.some(q => st(q.id).seen), next = g && g.m < 0.999 ? g.d : null;
  const heroTop = firstRide && next
    ? `<div class="eyebrow">Your first stop</div>
      <div class="first">${routeBullet(ROUTE[next])}<div><div class="first-nm">${esc(DOMAINS[next].name)}</div>
        <div class="first-sub">${esc(DOMAINS[next].bld.replace(/^the /, "The "))} · ${DOMAINS[next].w || Math.round(DOMAINS[next].n / 85 * 100) + "%"} of exam · ${inBank(next).length} questions</div></div></div>`
    : `<div class="eyebrow">Your tax city</div><div class="ready-row"><div class="ready">${pct(r)}%</div><div class="ready-sub">ready for ${PL(p)}</div></div>
      <div class="next-line">${next ? `<b>Next stop</b>${routeBullet(ROUTE[next])}<span>${esc(DOMAINS[next].name)}</span>` : `Every building in ${PL(p)} is finished. Keep reviews up to date.`}</div>`;
  const pills = [dueP ? `${ICON.clock}${dueP} due` : "", done ? `${ICON.goal}${done}/${state.goal} today` : ""].filter(Boolean);
  const exams = state.exams.slice(-6);
  $("#app").innerHTML = `<div class="panes" data-tab="${homeTab}">
  <div class="pane pane-today">
  ${window.Mascot ? `<div class="nightline">${window.Mascot.greeting({ name: state.name, pill: sk ? `${ICON.fire}${sk}-day streak` : isCpa() ? "★ Future CPA" : "★ Future EA", extra: `<button class="greet-guide" id="greetguide" type="button" aria-label="Watch the 2-minute how-to video"><span class="gg-play"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 1l7 4-7 4z" fill="currentColor"/></svg></span>How to use</button>` })}${elLine(p, r)}</div>` : ""}
  <section class="today-card${night}" aria-label="Today">
    <div class="hero-top">${countPill(p)}${heroTop}</div>
    ${pills.length && !firstRide ? `<div class="pills">${pills.map(x => `<span class="pill">${x}</span>`).join("")}</div>` : ""}
    <div class="hero-cta">
      <button class="cta play" id="play">${dueP ? `Play: ${dueP} due` : "Play"}</button>
      <button class="cta exam" id="examgo">Exam sim</button>
    </div>
  </section>
  ${backupDue() ? `<section class="card pad" style="display:grid;gap:8px;border-color:var(--warn)"><h2>Back up your progress</h2>
      <div class="muted small">${backupLine()} Your progress lives only on this device. Save a backup file so a lost phone or a cleared browser doesn't erase it.</div>
      <div class="row"><button class="btn amber" id="homebackup">Save backup file</button></div></section>` : ""}
  </div>
  <div class="pane pane-city">
  <section class="hero${night}" aria-label="Your tax city">
    <div class="ptabs" role="tablist" aria-label="Exam part">
      ${partKeys().map(n => `<button class="ptab${isCpa() ? " sec" : ""}" role="tab"${isLive(n) ? "" : " disabled"} data-part="${n}" aria-selected="${String(n) === p}" aria-label="${PL(n)}, ${PARTS[n]}" style="--lc:${LINE[n]}">${n}</button>`).join("")}
      <span class="pname" aria-hidden="true"><small>${PL(p)}</small>${PARTS[p]}</span>
    </div>
    <div class="stage-fade" aria-hidden="true"></div>
    <div class="stage" id="stage">
      <div class="shadow-under"></div>
      <div class="labels" id="labels"></div>
      <div class="stage-msg" id="stagemsg">Building your town…</div>
      <div class="stagebtns"><button class="sky" id="fsbtn" type="button" aria-label="Open the city full screen in 3D"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.8 20 7.2v9.6L12 21.2 4 16.8V7.2z"/><path d="M4 7.2 12 11.6l8-4.4M12 11.6v9.6"/></svg>3D</button><button class="sky" id="tsbtn" type="button">${tsView ? PL(p) : "Times Sq"}</button><button class="sky" id="skybtn" type="button">${skyNow() === "dusk" ? ICON.sun + "Day" : ICON.moon + "Dusk"}</button></div>
    </div>
  </section>
  </div>
  <div class="pane pane-map">
    <div class="partseg" role="group" aria-label="Exam part">${partKeys().map(n => `<button type="button" data-part="${n}" aria-pressed="${String(n) === p}"${isLive(n) ? "" : " disabled"}>${partSign(n)}${isCpa() ? "" : PL(n)}</button>`).join("")}</div>
    <div class="spread part-head"><h2>${PL(p)} · ${PARTS[p]}</h2><span class="hint">${BANK.filter(q => String(q.part) === p).length} questions</span></div>
    ${stripMap(p, g && g.m < 0.999 ? g.d : null)}
  </div>
  <div class="pane pane-exam">
    ${examDayCard(p)}
    <section class="card pad" style="display:grid;gap:10px;align-content:start"><h2>Exam sim</h2>
      <p class="muted small" style="margin:0">${isCpa() ? `A sim is the multiple-choice half of ${p}: ${SIMS[p].mcq} questions in two locked testlets of ${SIMS[p].mcq / 2}, in 2 hours.` : "A full sim is 100 questions in 3.5 hours, in three locked sections, on a plain screen like the real test."}</p>
      <div class="row">${state.examRun ? `<button class="btn amber" id="resume">Resume exam</button><button class="btn" id="examnew">New exam sim</button>` : `<button class="btn amber" id="examnew">Set up an exam sim</button>`}</div>
    </section>
    <section class="card pad"><h2>Past sims</h2>
      ${exams.length ? `<div class="hist" style="margin-top:12px">${exams.map(e => `<div><span class="b" style="height:${Math.max(6, e.score * 56)}px"></span><span>${pct(e.score)}%</span><span>${/^\d$/.test(e.part) ? "P" + e.part : e.part} · ${new Date(e.t).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div>`).join("")}</div>`
        : `<p class="muted small" style="margin:8px 0 0">No exam sims yet.</p>`}
    </section>
  </div>
  </div>`;
  setHomeTab(homeTab);
  const pickPart = n => { setPart(n); tsView = false; save(); renderHome(); };
  $("#app").querySelectorAll(".ptab, .partseg button").forEach(b => b.onclick = () => pickPart(b.dataset.part));
  $("#fsbtn").onclick = () => { if (window.Town && window.Town.fullscreen) window.Town.fullscreen(true); };
  $("#tsbtn").onclick = () => { tsView = !tsView; $("#tsbtn").textContent = tsView ? PL(state.part) : "Times Sq"; if (window.Town && window.Town.setView) window.Town.setView(tsView ? "ts" : "part"); };
  $("#play").onclick = () => startDrill(firstRide ? next : null);
  if ($("#greetguide")) $("#greetguide").onclick = openGuide;
  if ($("#homebackup")) $("#homebackup").onclick = async () => { if (await saveBackupFile()) renderHome(); };
  $("#skybtn").onclick = () => {
    state.sky = skyNow() === "dusk" ? "day" : "dusk"; save();
    const dusk = state.sky === "dusk";
    $("#skybtn").innerHTML = dusk ? ICON.sun + "Day" : ICON.moon + "Dusk";
    document.querySelectorAll(".hero, .today-card").forEach(e => e.classList.toggle("night", dusk));
    if ($(".el")) $(".el").classList.toggle("day", !dusk);
    if (window.Town && window.Town.setSky) window.Town.setSky(state.sky);
  };
  $("#examgo").onclick = () => renderExamSetup();
  $("#examnew").onclick = () => renderExamSetup();
  $("#app").querySelectorAll("[data-setdate]").forEach(b => b.onclick = () => askExamDate(b.dataset.setdate));
  if ($("#resume")) $("#resume").onclick = () => renderExam();
  $("#app").querySelectorAll("[data-drill]").forEach(b => b.onclick = () => startDrill(b.dataset.drill));
  $("#app").querySelectorAll("[data-sheet]").forEach(b => b.onclick = () => openArea(b.dataset.sheet));
  greetStale = !$(".pane-today").getClientRects().length;
  if (window.Mascot && !greetStale) window.Mascot.mount({ onPlay: () => startDrill(null), afterHello: state.nameAsked ? null : () => { if (view === "home" && !$("#scrim")) askName(); } });
  mountTown();
}
/* Asked once, after the first hello: the greeting's name. Changeable in More. */
function askName() {
  state.nameAsked = true; save();
  $("#layer").innerHTML = `<div class="scrim" id="scrim"><form class="bsheet" id="nameform" role="dialog" aria-label="Your name"><div class="grab"></div>
    <h3>What should your study buddy call you?</h3>
    <input id="namein" class="namein" autocomplete="given-name" maxlength="24" placeholder="First name" aria-label="First name">
    <div class="row"><button class="btn primary" type="submit">Save</button><button class="btn ghost" type="button" id="nameskip">Not now</button></div>
    <p class="hint" style="margin:0">It stays on this device. Change it any time in More.</p></form></div>`;
  $("#scrim").onclick = e => { if (e.target.id === "scrim") closeLayer(); };
  $("#nameskip").onclick = closeLayer;
  $("#nameform").onsubmit = e => { e.preventDefault(); const v = $("#namein").value.trim(); closeLayer(); if (v) { state.name = v; save(); renderHome(); } };
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
  /* Close sits at the top, and the video is sized to the visible screen (dvh), so neither hides under Safari's toolbar */
  $("#layer").innerHTML = `<div class="scrim" id="scrim"><div class="bsheet" role="dialog" aria-label="How to use this app" style="max-height:100vh;max-height:100dvh;overflow-y:auto">
    <div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin:0">How to use</h3>
      <button class="btn" id="guideclose" aria-label="Close" style="width:44px;height:44px;padding:0;border-radius:50%;display:grid;place-items:center;font-size:20px;line-height:1">✕</button></div>
    <video id="guidevid" src="media/how-to-use.mp4" poster="media/how-to-use.jpg" controls playsinline autoplay preload="metadata" style="display:block;margin:0 auto;max-height:72vh;max-height:calc(100dvh - 170px);max-width:100%;aspect-ratio:9/16;background:#000;border-radius:14px"></video>
    <span class="hint">Step one: add this app to your Home Screen.</span>
    <p class="muted small" style="margin:0"><b>Reading the town.</b> Each tower is one exam area. Finished floors are mastered; bare concrete, orange netting and a crane mark what's left. Cabs on the avenue are reviews due. A finished tower lights up its crown. The big screens show your live numbers and 2025 tax facts. Tap a tower to drill it.</p>
  </div></div>`;
  $("#scrim").onclick = e => { if (e.target.id === "scrim") closeGuide(); };
  $("#guideclose").onclick = closeGuide;
}
function closeGuide() { const v = $("#guidevid"); if (v) v.pause(); closeLayer(); if (view === "home") renderHome(); }
function closeLayer() { $("#layer").innerHTML = ""; if (window.Town && window.Town.highlight) window.Town.highlight(null); }

/* ---------- Drill ---------- */
function startDrill(domain, keep) {
  if (window.Town && window.Town.unmount) window.Town.unmount();
  if (!keep || !sess) sess = { t: Date.now(), domain, rows: [], m0: {} };
  drill = pickNext(domain, state.part, null); if (drill) drill.domain = domain;
  drill = drill || { domain, q: null };
  renderDrill(); window.scrollTo(0, 0);
}
function nextQ() { const d = drill.domain, run = drill.run || 0; drill = pickNext(d, state.part, drill.q && drill.q.id) || { q: null }; drill.domain = d; drill.run = run; renderDrill(); }
/* The area's tower on the question card: 12 floors of 3 windows, lit up to the area's mastery.
   After an answer, windows that just lit glow in and windows that just went dark flicker out. */
function towerSvg(m, prev) {
  const F = 12, W = 3, N = F * W, lit = Math.floor(m * N + 1e-9), was = prev == null ? lit : Math.floor(prev * N + 1e-9);
  let w = "";
  for (let i = 0; i < N; i++) {
    const f = Math.floor(i / W), x = 10 + (i % W) * 9.5, y = 73 - (f + 1) * 5;
    const c = i < lit ? (i >= was ? "on pop" : "on") : (i < was ? "drop" : "off");
    w += `<rect class="${c}" x="${x}" y="${y + 1.2}" width="7" height="2.8" rx="0.6" style="--d:${(i - Math.min(lit, was)) * 60}ms"/>`;
  }
  return `<svg class="dtower" viewBox="0 0 48 80" aria-hidden="true"><rect class="spire${m >= 0.999 ? " gold" : ""}" x="22.5" y="3" width="3" height="10" rx="1"/><rect class="body" x="7" y="12" width="34" height="62" rx="1.5"/>${w}<rect class="base" x="2" y="74" width="44" height="3" rx="1"/></svg>`;
}
const PRAISE = ["Nailed it.", "That's the one.", "Clean.", "Right on the money.", "Exactly."], CONSOLE = ["Tricky one. The rule's below.", "Close. Read why below.", "This one comes back in 5 minutes.", "Good one to miss now, not in July."];
const pickLine = a => a[Math.floor(Math.random() * a.length)];
/* Questions whose explanation links to a drawn figure in art/, with the case each one opens on */
const FIGURES = {
  "loss-sorter": { title: "Loss sorter", label: "Loss sorter: the basis, at-risk, passive and excess business loss limits in order", link: "See it on the loss sorter" },
  "basis-order": { title: "Basis order", label: "Basis order: S corporation stock and debt basis, step by step in the order Form 7203 applies it", link: "See the basis order, step by step" },
};
/* What each figure shows, for the Figures card in More */
const FIGURE_ABOUT = {
  "loss-sorter": "A loss runs past four limits in the order the law applies them: basis, at-risk, passive, then excess business loss.",
  "basis-order": "One year of S corporation stock and debt basis: income, distributions, nondeductible expenses, losses, then debt restored.",
};
const MACHINE = { "p2d1a-018": [["loss-sorter", 0]], "p2d1b-023": [["loss-sorter", 1], ["basis-order", 1]], "p2d1b-024": [["basis-order", 0], ["loss-sorter", 2]], "p2d2a-006": [["loss-sorter", 3]] };
function openMachine(fig, n) {
  const f = FIGURES[fig];
  $("#layer").innerHTML = `<div class="scrim" id="scrim"><div class="bsheet figsheet" role="dialog" aria-label="${f.title}"><div class="grab"></div>
    <div class="figbar"><b>${f.title}</b><button class="btn ghost" id="figx" type="button">Close</button></div>
    <iframe src="art/${fig}.html?case=${n}" title="${f.label}"></iframe></div></div>`;
  $("#figx").onclick = closeLayer;
  $("#scrim").onclick = e => { if (e.target.id === "scrim") closeLayer(); };
}
const figs = t => t.replace(/\$\d[\d,]*(?:\.\d+)?|\b\d+(?:\.\d+)?%|\b\d{1,3}(?:,\d{3})+\b/g, m => `<mark class="fig">${m}</mark>`);
function renderDrill() {
  view = "drill";
  const scope = drill.domain ? DOMAINS[drill.domain].name : `${PL(state.part)} · ${PARTS[state.part]}`;
  const top = `<div class="qbar"><button class="btn ghost" id="back">‹ Town</button><span class="goal">${ring(todayCount(), state.goal)}${todayCount()}/${state.goal} today</span></div>`;
  if (!drill.q) {
    $("#app").innerHTML = top + `<div class="sheet pad"><p>No questions available in ${esc(scope)}. They may all be flagged.</p></div>`;
    $("#back").onclick = leaveDrill; return;
  }
  const q = drill.q, D = DOMAINS[q.domain], answered = drill.picked != null, s = st(q.id);
  const reason = { review: ["review", "Due for review"], new: ["new", "New question"], ahead: ["", "Reviewing early"] }[drill.reason];
  const choices = drill.perm.map((o, i) => {
    let c = "choice";
    if (answered) c += o === q.answer ? " right" : o === drill.picked ? " wrong" : " dim";
    const mark = answered && o === q.answer ? "✓" : answered && o === drill.picked ? "✕" : "ABCD"[i];
    return `<button class="${c}" data-i="${i}"${answered ? " disabled" : ""}><span class="L">${mark}</span><span>${esc(q.choices[o])}</span></button>`;
  }).join("");
  let after = "";
  if (answered) {
    const ok = drill.picked === q.answer, cpa = isCpa() || q.exam === "cpa" ? "" : (q.cpa || []).map(t => CPA[t] || t).join("; ");
    const dm = (drill.mAfter - drill.mBefore) * 100, delta = Math.abs(dm) < 0.05 ? "" : `<span class="delta ${dm > 0 ? "up" : "down"}">${dm > 0 ? "+" : "−"}${Math.abs(dm).toFixed(1)}%</span>`;
    const sub = ok && !drill.guessed && drill.run >= 3 ? `${drill.run} in a row. Keep going.` : drill.line;
    after = `<div class="explain"><div class="verdict ${drill.guessed ? "gs" : ok ? "ok" : "no"}"><img class="vbuddy" src="art/buddy-bust.webp" alt=""><div class="vt"><b>${drill.guessed ? "Right, but a guess" : ok ? "Correct" : "Not quite. It's " + "ABCD"[drill.perm.indexOf(q.answer)] + "."}</b><span>${esc(sub)}</span></div>${delta}</div>
      <p>${figs(esc(q.explain))}</p>${(MACHINE[q.id] || []).map(([fig, n]) => `<button class="machine" type="button" data-fig="${fig}" data-case="${n}">${FIGURES[fig].link} ›</button>`).join("")}
      <div class="meta"><span class="mk">Source</span>${q.source.split(";").map(x => `<span class="pill">${esc(x.trim())}</span>`).join("")}${cpa ? `<span class="mk">Also counts for CPA</span><span class="pill cpa">${esc(cpa)}</span>` : ""}</div></div>`;
    after += drill.flagging ? `<div class="flagform"><label for="flagnote" class="hint">What looks wrong? Jose will see this note.</label>
        <textarea id="flagnote" placeholder="e.g. The 2025 figure is $X per Pub 501"></textarea>
        <div class="row"><button class="btn danger" id="flagsave">Flag this question</button><button class="btn ghost" id="flagx">Cancel</button></div></div>`
      : `<div class="actions">${drill.goalHit ? `<button class="btn amber" id="summary">See today's summary</button>` : `<button class="btn primary" id="next">Next question</button>`}${ok && !drill.guessed ? `<button class="btn" id="guess" title="Counts this as a miss, so it comes back soon">I guessed</button>` : ""}<button class="btn ghost" id="flag">Flag as wrong</button></div>`;
  }
  $("#app").innerHTML = top + `
    <article class="sheet drillsheet${answered ? (drill.picked === q.answer ? " is-ok" : " is-no") : ""}">
      <div class="dhead"><div class="id"><span class="k">${PL(q.part)} · ${PARTS[q.part]} ${q.domain === "REG-II" || q.part === "AUD" || q.part === "FAR" ? "" : " · TY 2025"}</span><span class="d">${esc(D.name)}</span>
        <span class="m">${answered && drill.mBefore != null && pct(drill.mBefore) !== pct(drill.mAfter) ? `Mastery ${pct(drill.mBefore)}% <i>→</i> <b${drill.mAfter < drill.mBefore ? ' class="dn"' : ""}>${pct(drill.mAfter)}%</b>` : `Mastery <b>${pct(mastery(q.domain))}%</b>`}</span></div>
        ${towerSvg(mastery(q.domain), answered ? drill.mBefore : null)}</div>
      <div class="qbody"><div class="reason"><span class="chip ${reason[0]}">${reason[1]}</span>${s.seen ? `seen ${s.seen}× · ${s.right} right` : ""}</div><p class="qtext">${esc(q.q)}</p></div>
      <div class="choices">${choices}</div>${after}
    </article>${answered ? "" : `<p class="hint">Keys: A to D (or 1 to 4) to answer, G if you got it right by guessing, Enter for the next question.</p>`}`;
  $("#back").onclick = leaveDrill;
  $("#app").querySelectorAll(".choice").forEach(b => b.onclick = () => answerDrill(+b.dataset.i));
  if ($("#next")) $("#next").onclick = nextQ;
  if ($("#guess")) $("#guess").onclick = markGuess;
  if ($("#summary")) $("#summary").onclick = renderSummary;
  document.querySelectorAll(".explain .machine").forEach(b => (b.onclick = () => openMachine(b.dataset.fig, Number(b.dataset.case))));
  if ($("#flag")) $("#flag").onclick = () => { drill.flagging = true; renderDrill(); setTimeout(() => $("#flagnote") && $("#flagnote").focus(), 0); };
  if ($("#flagx")) $("#flagx").onclick = () => { drill.flagging = false; renderDrill(); };
  if ($("#flagsave")) $("#flagsave").onclick = () => { setSt(q.id, { flag: true, note: $("#flagnote").value.trim(), flaggedAt: Date.now() }); toast("Flagged. It stays out of practice until it's unflagged."); updateFlagDot(); nextQ(); };
}
function answerDrill(i) {
  if (!drill.q || drill.picked != null) return;
  drill.picked = drill.perm[i];
  const before = todayCount(), ok = drill.picked === drill.q.answer;
  drill.mBefore = mastery(drill.q.domain);
  drill.prev = Object.assign({}, st(drill.q.id));
  if (sess) { if (!(drill.q.domain in sess.m0)) sess.m0[drill.q.domain] = drill.mBefore; drill.row = { id: drill.q.id, ok, g: false, first: !drill.prev.seen }; sess.rows.push(drill.row); }
  record(drill.q, ok, "drill");
  drill.mAfter = mastery(drill.q.domain);
  drill.run = ok ? (drill.run || 0) + 1 : 0; drill.line = pickLine(ok ? PRAISE : CONSOLE);
  if (before < state.goal && todayCount() >= state.goal) drill.goalHit = true;
  renderDrill();
}
/* "I guessed": a right answer that was luck is scheduled as a miss, so it comes back in 5 minutes and doesn't add to mastery.
   It undoes the right answer (item state and log entry) and records a miss in its place, marked g in the log. */
function markGuess() {
  const q = drill.q; if (!q || drill.picked !== q.answer || drill.guessed) return;
  state.items[q.id] = drill.prev;
  const last = state.log[state.log.length - 1]; if (last && last.id === q.id) state.log.pop();
  record(q, false, "drill"); state.log[state.log.length - 1].g = 1; save();
  drill.guessed = true; drill.mAfter = mastery(q.domain); drill.run = 0;
  drill.line = "Counted as a miss, so it comes back in 5 minutes.";
  if (drill.row) drill.row.g = true;
  renderDrill();
}
function leaveDrill() { if (sess && sess.rows.length >= 3) renderSession(); else renderHome(); }
/* Session summary (renderSession; the daily summary is renderSummary), shown when leaving a drill after 3 or more answers. Guesses count as misses.
   "New" means never answered before this session's first try, the closest thing in Drill to an exam-day number. */
function renderSession() {
  view = "session";
  const S = sess, rows = S.rows, n = rows.length, good = r => r.ok && !r.g;
  const right = rows.filter(good).length, guessed = rows.filter(r => r.g).length;
  const fresh = rows.filter(r => r.first), rev = rows.filter(r => !r.first);
  const mins = Math.max(1, Math.round((Date.now() - S.t) / MIN));
  const scope = S.domain ? DOMAINS[S.domain].name : `${PL(state.part)} · ${PARTS[state.part]}`;
  const missed = [...new Map(rows.filter(r => !good(r)).map(r => [r.id, r])).values()];
  const stat = (label, list) => list.length ? `<div><span class="hint">${label}</span><b>${list.filter(good).length} of ${list.length}</b><span class="small muted">${pct(list.filter(good).length / list.length)}% right</span></div>` : "";
  $("#app").innerHTML = `<div class="qbar"><button class="btn ghost" id="back">‹ Town</button><span class="goal">${ring(todayCount(), state.goal)}${todayCount()}/${state.goal} today</span></div>
  <section class="card pad" style="display:grid;gap:10px">
    <div class="eyebrow" style="color:var(--ink-soft)">Session · ${esc(scope)} · ${mins} min</div>
    <div class="result-big">${pct(right / n)}%</div>
    <div class="muted">${right} of ${n} right.${guessed ? ` ${guessed} more ${guessed === 1 ? "was a guess, counted as a miss" : "were guesses, counted as misses"}.` : ""}</div>
    <div class="sessstats">${stat("New questions", fresh)}${stat("Reviews", rev)}</div>
    ${fresh.length ? `<p class="hint" style="margin:0">Your first try on a new question is the best read on exam day. Reviews are easier because you've seen the answer.</p>` : ""}
  </section>
  <section class="card" style="margin-top:14px;overflow-x:auto"><div class="pad"><h2>Mastery</h2></div>
    <table class="res"><thead><tr><th style="padding-left:16px">Area</th><th style="text-align:right">Now</th><th style="text-align:right;padding-right:16px">Change</th></tr></thead>
    <tbody>${Object.keys(S.m0).sort().map(d => { const dm = (mastery(d) - S.m0[d]) * 100, z = Math.abs(dm) < 0.05; return `<tr><td style="padding-left:16px">${esc(DOMAINS[d].name)}</td><td class="n">${pct(mastery(d))}%</td><td class="n" style="padding-right:16px;color:${z ? "var(--ink-soft)" : dm > 0 ? "var(--good)" : "var(--bad)"}">${z ? "no change" : (dm > 0 ? "+" : "−") + Math.abs(dm).toFixed(1) + "%"}</td></tr>`; }).join("")}</tbody></table></section>
  <section class="card" style="margin-top:14px"><div class="pad spread"><h2>Missed or guessed</h2><span class="hint">${missed.length}</span></div>
    ${missed.map(r => { const q = byId[r.id]; return `<details class="miss"><summary>${esc(q.q)}</summary><div class="body">
      ${r.g ? `<span class="hint">You got this one right by guessing.</span>` : ""}<span style="color:var(--good)"><b>Correct:</b> ${esc(q.choices[q.answer])}</span>
      <span style="font-family:var(--f-read)">${esc(q.explain)}</span><span class="hint">${esc(q.source)}</span></div></details>`; }).join("") || `<p class="pad muted" style="margin:0">None. Every answer was right without guessing.</p>`}
  </section>
  <div class="row" style="margin-top:14px"><button class="btn primary" id="sumgo">Keep drilling</button><button class="btn" id="sumhome">Back to town</button></div>`;
  $("#back").onclick = renderHome; $("#sumhome").onclick = renderHome;
  $("#sumgo").onclick = () => startDrill(S.domain, true);
  window.scrollTo(0, 0);
}

/* ---------- Daily summary: shown once the daily goal is reached in a drill ---------- */
function todayStats() {
  const k = dayKey(Date.now()), rows = state.log.filter(r => dayKey(r.t) === k);
  let right = 0, run = 0, best = 0, ms = 0;
  rows.forEach((r, i) => {
    if (r.ok) { right++; run++; best = Math.max(best, run); } else run = 0;
    ms += i ? Math.min(r.t - rows[i - 1].t, 3 * MIN) : 40e3; /* gaps over 3 minutes count as a break */
  });
  const areas = [...new Set(rows.map(r => byId[r.id] && byId[r.id].domain).filter(Boolean))];
  return { n: rows.length, right, best, min: Math.max(1, Math.round(ms / MIN)), areas, missed: rows.length - right };
}
function renderSummary() {
  view = "summary";
  const t = todayStats(), m0 = (state.day && state.day.k === dayKey(Date.now()) && state.day.m) || {}, sk = streak();
  const towers = t.areas.sort((a, b) => a.localeCompare(b)).map(d => { const now = mastery(d), was = m0[d] == null ? now : m0[d], dm = Math.round((now - was) * 100);
    return `<div class="sumtower">${towerSvg(now, was)}<b>${esc(DOMAINS[d].short)}</b><span class="${dm < 0 ? "dn" : ""}">${dm > 0 ? "+" : dm < 0 ? "−" : "±"}${Math.abs(dm)}%</span></div>`; }).join("");
  $("#app").innerHTML = `<div class="qbar"><button class="btn ghost" id="back">‹ Town</button><span class="goal">${ring(todayCount(), state.goal)}${todayCount()}/${state.goal} today</span></div>
  <article class="sheet summary">
    <div class="sumhead"><img class="sumbuddy" src="art/buddy-bust.webp" alt="">
      <div><span class="k">${new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</span><h2>Daily goal done${state.name ? `, ${esc(state.name)}` : ""}.</h2>
      <span class="sk">${ICON.fire}${sk} day${sk === 1 ? "" : "s"} in a row</span></div></div>
    <div class="sumstats"><div><b>${t.n}</b><span>answered</span></div><div><b>${t.n ? pct(t.right / t.n) : 0}%</b><span>right</span></div><div><b>${t.min}</b><span>min</span></div><div><b>${t.best}</b><span>best run</span></div></div>
    <div class="sumtowers"><h3>What you built today</h3><div class="row">${towers}</div></div>
    <p class="summiss">${t.missed ? `You missed ${t.missed}. Each comes back in 5 minutes, then again tomorrow if you get it.` : "Nothing missed today."}</p>
    <div class="actions"><button class="btn primary" id="keepgo">Keep going</button><button class="btn ghost" id="totown">Back to town</button></div>
  </article>`;
  $("#back").onclick = renderHome; $("#totown").onclick = renderHome;
  $("#keepgo").onclick = () => { drill.goalHit = false; nextQ(); };
  window.scrollTo(0, 0);
}

/* ---------- Exam sim ---------- */
function buildExam(p) {
  const ds = partDomains(p), W = ds.reduce((a, d) => a + DOMAINS[d].n, 0);
  const avail = Object.fromEntries(ds.map(d => [d, shuffle(inBank(d))]));
  const SIM = isCpa() ? SIMS[p].mcq : 100, total = Math.min(SIM, ds.reduce((a, d) => a + avail[d].length, 0));
  const want = Object.fromEntries(ds.map(d => [d, Math.round(total * DOMAINS[d].n / W)]));
  let ids = [];
  for (const d of ds) ids.push(...avail[d].splice(0, want[d]).map(q => q.id));
  const rest = shuffle(ds.flatMap(d => avail[d]));
  while (ids.length < total && rest.length) ids.push(rest.pop().id);
  ids = shuffle(ids.slice(0, total));
  const n = ids.length, s1 = Math.round(n * 0.34), s2 = Math.round(n * 0.67), half = Math.round(n / 2);
  return { exam: state.exam, part: p, ids, fresh: ids.filter(id => !st(id).seen), perms: Object.fromEntries(ids.map(id => [id, shuffle([0, 1, 2, 3])])), ans: {}, marked: {},
    sections: isCpa() ? [[0, half], [half, n]] : [[0, s1], [s1, s2], [s2, n]], sec: 0, idx: 0, start: Date.now(), breakMs: 0, onBreak: null,
    dur: isCpa() ? Math.round(120 * MIN * n / SIMS[p].mcq) : Math.round(210 * MIN * n / 100), confirm: false };
}
function eaSimText(n, avail, p) { return `<p style="margin:0">${n} questions, ${Math.round(210 * n / 100)} minutes, in three sections like the real PSI test. Once you leave a section you can't go back to it. Between sections you get an optional break that stops the clock. No answers are shown until the end.</p>
${n < 100 ? `<p class="hint" style="margin:0">The real exam has 100 questions. The ${PL(p)} bank only has ${avail} so far, so this sim is shorter.</p>` : `<p class="hint" style="margin:0">Questions are drawn in proportion to the official outline, so heavier areas get more.</p>`}`; }
function cpaSimText(n, avail, p) {
  const S = SIMS[p], short = partDomains(p).filter(d => inBank(d).length < Math.round(S.mcq * DOMAINS[d].n / 100));
  return `<p style="margin:0">${n} multiple-choice questions in ${Math.round(120 * n / S.mcq)} minutes, in two testlets. Once you submit a testlet you can't go back to it. No answers are shown until the end.</p>
    <p class="hint" style="margin:0">The real ${p} exam has ${S.mcq} multiple-choice questions and ${S.tbs} task-based simulations in 4 hours, each half the score (AICPA 2026 blueprint). This sim is the multiple-choice half; 2 hours is the app's estimate for it, not an AICPA figure.</p>
    <p class="hint" style="margin:0">Questions are drawn by the 2026 blueprint weights.${short.length ? ` ${short.map(d => DOMAINS[d].short).join(", ")} ${short.length > 1 ? "have" : "has"} too few questions so far, so the sim fills in from other areas.` : ""}</p>`;
}
function renderExamSetup() {
  if (window.Town && window.Town.unmount) window.Town.unmount();
  view = "examsetup";
  const p = state.part, avail = BANK.filter(q => String(q.part) === p && !st(q.id).flag).length, n = Math.min(isCpa() ? SIMS[p].mcq : 100, avail);
  $("#app").innerHTML = `<div class="qbar"><button class="btn ghost" id="back">‹ Town</button></div>
  <section class="card pad" style="display:grid;gap:14px">
    <div><div class="eyebrow" style="color:var(--ink-soft)">Exam sim</div><h3 style="font-size:22px;margin-top:4px">${PL(p)}: ${PARTS[p]}</h3></div>
    <div class="row">${partKeys().map(k => `<button class="btn${String(k) === p ? " primary" : ""}" data-p="${k}"${isLive(k) ? "" : " disabled"}>${PL(k)}</button>`).join("")}</div>
    ${isCpa() ? cpaSimText(n, avail, p) : eaSimText(n, avail, p)}
    ${state.examRun ? `<div class="confirm"><b>You have an exam in progress (${PL(state.examRun.part)}).</b><div class="row"><button class="btn amber" id="resume">Resume it</button><button class="btn danger" id="discard">Discard it</button></div></div>`
      : `<div><button class="btn amber" id="start" ${n ? "" : "disabled"}>Start the exam</button></div>`}
  </section>`;
  $("#back").onclick = renderHome;
  $("#app").querySelectorAll("[data-p]").forEach(b => b.onclick = () => { setPart(b.dataset.p); save(); renderExamSetup(); });
  if ($("#start")) $("#start").onclick = () => { state.examRun = buildExam(p); save(); renderExam(); };
  if ($("#resume")) $("#resume").onclick = renderExam;
  if ($("#discard")) $("#discard").onclick = () => { state.examRun = null; save(); renderExamSetup(); };
}
/* an EA sim has three sections, a CPA sim two testlets */
const lastSec = E => E.sec >= E.sections.length - 1;
const secWord = E => (E.exam || "ea") === "cpa" ? "testlet" : "section";
function examLeft(E) { const now = E.onBreak || Date.now(); return E.dur - (now - E.start - E.breakMs); }
function fmt(ms) { ms = Math.max(0, ms); const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ":" : "") + String(m).padStart(h ? 2 : 1, "0") + ":" + String(x).padStart(2, "0"); }
let examTick = null;
function renderExam() {
  if (window.Town && window.Town.unmount) window.Town.unmount();
  view = "exam"; const E = state.examRun; if (!E) return renderHome();
  if ((E.exam || "ea") !== state.exam) useExam(E.exam || "ea");
  if (String(E.part) !== state.part) setPart(E.part);
  clearInterval(examTick);
  if (E.onBreak) return renderBreak();
  if (examLeft(E) <= 0) return finishExam(true);
  const [a, b] = E.sections[E.sec], id = E.ids[E.idx], q = byId[id], perm = E.perms[id], chosen = E.ans[id];
  const answeredInSec = E.ids.slice(a, b).filter(x => E.ans[x] != null).length;
  $("#app").innerHTML = `
  <div class="exam-top">
    <div class="spread"><div><div class="eyebrow" style="color:var(--ink-soft)">${PL(E.part)} sim · ${secWord(E)} ${E.sec + 1} of ${E.sections.length}</div><div class="timer" id="timer">${fmt(examLeft(E))}</div></div>
      <button class="btn" id="endsec">${!lastSec(E) ? "Finish " + secWord(E) : "Finish exam"}</button></div>
    <div class="progressbar"><i style="width:${100 * Object.keys(E.ans).length / E.ids.length}%"></i></div>
  </div>
  ${E.confirm ? `<div class="confirm" style="margin-bottom:12px"><b>${!lastSec(E) ? `Leave ${secWord(E)} ${E.sec + 1}? You can't come back to these questions.` : "Submit the exam?"}</b>
    <span class="small">${b - a - answeredInSec ? `${b - a - answeredInSec} unanswered in this section count as wrong.` : "Every question in this section is answered."}</span>
    <div class="row"><button class="btn amber" id="yes">${!lastSec(E) ? "Leave " + secWord(E) : "Submit"}</button><button class="btn ghost" id="no">Keep working</button></div></div>` : ""}
  <article class="sheet">
    <div class="sheet-head"><div class="id"><span class="k">Question ${E.idx + 1} of ${E.ids.length}</span><span class="d">${esc(DOMAINS[q.domain].name)}</span></div><div class="yr"><small>Tax year</small><b>2025</b></div></div>
    <div class="qbody"><p class="qtext">${esc(q.q)}</p></div>
    <div class="choices">${perm.map((o, i) => `<button class="choice${chosen === o ? " sel" : ""}" data-i="${i}"><span class="L">${"ABCD"[i]}</span><span>${esc(q.choices[o])}</span></button>`).join("")}</div>
    <div class="actions"><button class="btn" id="prev" ${E.idx <= a ? "disabled" : ""}>‹ Previous</button><button class="btn primary" id="nxt" ${E.idx >= b - 1 ? "disabled" : ""}>Next ›</button>
      <button class="btn ghost" id="mark">${E.marked[id] ? "Unmark" : "Mark for review"}</button></div>
  </article>
  <section class="card pad" style="margin-top:14px;display:grid;gap:10px"><div class="spread"><h2>${secWord(E) === "testlet" ? "Testlet" : "Section"} ${E.sec + 1}</h2><span class="hint">${answeredInSec} of ${b - a} answered</span></div>
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
    /* EA: a break between sections, like PSI. CPA: straight on to the next testlet */
    if (!lastSec(E)) { E.sec++; E.idx = E.sections[E.sec][0]; if ((E.exam || "ea") === "cpa") { save(); renderExam(); } else { E.onBreak = Date.now(); save(); renderBreak(); } }
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
  const fresh = E.fresh ? { n: E.fresh.length, right: E.fresh.filter(id => E.ans[id] === byId[id].answer).length } : null;
  const res = { t: Date.now(), part: E.part, n: E.ids.length, right, score: right / E.ids.length, per, timeUp, fresh,
    missed: E.ids.filter(id => E.ans[id] !== byId[id].answer).map(id => ({ id, picked: E.ans[id] == null ? null : E.ans[id] })) };
  state.exams.push(res); if (state.exams.length > 30) state.exams = state.exams.slice(-30);
  state.examRun = null; save(); renderResults(res);
}
/* Questions you'd drilled before the sim can be answered from memory, so the score on never-seen ones is the honest number. */
function freshLine(res) {
  const f = res.fresh; if (!f) return "";
  const seenN = res.n - f.n, seenR = res.right - f.right;
  if (!f.n) return `<div class="fresh">You had practiced every question in this sim before, so this score partly measures memory of the answers.</div>`;
  if (f.n < 10) return `<div class="fresh">Only ${f.n} of these questions were new to you (${f.right} right), too few to read on their own. The rest you'd practiced, so this score partly measures memory.</div>`;
  return `<div class="fresh"><b>${pct(f.right / f.n)}%</b> on the ${f.n} questions you'd never seen${seenN ? `, ${pct(seenR / seenN)}% on the ${seenN} you'd practiced` : ""}. The never-seen score is the better read on exam day.</div>`;
}
function renderResults(res) {
  view = "results";
  $("#app").innerHTML = `<div class="qbar"><button class="btn ghost" id="back">‹ Town</button></div>
  <section class="card pad" style="display:grid;gap:8px">
    <div class="eyebrow" style="color:var(--ink-soft)">Part ${res.part} exam sim${res.timeUp ? " · time ran out" : ""}</div>
    <div class="result-big">${pct(res.score)}%</div><div class="muted">${res.right} of ${res.n} correct</div>
    ${freshLine(res)}
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
function updateFlagDot() { const n = new Set(BANK.filter(q => st(q.id).flag).map(q => q.id)).size; $("#flagdot").textContent = $("#tbflag").textContent = n || ""; $("#morebtn").setAttribute("aria-label", n ? `More, ${n} flagged` : "More"); }
function renderMore() {
  if (window.Town && window.Town.unmount) window.Town.unmount();
  view = "more";
  const flagged = [...new Map(BANK.filter(q => st(q.id).flag).map(q => [q.id, q])).values()];
  const counts = partKeys().filter(isLive).map(p => `${PL(p)}: ${BANK.filter(q => q.part === p).length}`).join(" · ");
  /* daily reminder: one calendar file per half hour lives in reminders/ (made by tools/make_reminders.py) */
  const REM_TIMES = []; for (let h = 5; h < 24; h++) for (const m of ["00", "30"]) REM_TIMES.push(String(h).padStart(2, "0") + m);
  const fmtT = t => { const h = +t.slice(0, 2); return `${h % 12 || 12}:${t.slice(2)} ${h < 12 ? "AM" : "PM"}`; };
  const rem = state.reminder || {}, remPick = rem.pick || rem.time || "1900";
  $("#app").innerHTML = `<div class="qbar"><button class="btn ghost" id="back">‹ Town</button></div>
  <div class="stack" style="margin-top:0">
    <section class="card pad" style="display:grid;gap:10px"><h3>How to use this app</h3>
      <p class="muted small" style="margin:0">A 2-minute guide with narration: adding the app to your Home Screen, the town, drills, exam sims and backups.</p>
      <div class="row"><button class="btn primary" id="guidemore">Watch the guide</button></div></section>
    <section class="card pad" style="display:grid;gap:10px"><h3>Launch screen</h3>
      <p class="muted small" style="margin:0">The El ride into the tax town plays each time the app starts. Your phone keeps the app open in the background, so to see it now, replay it here.</p>
      <div class="row"><button class="btn" id="introreplay">Replay the intro</button></div></section>
    <section class="card pad" style="display:grid;gap:10px"><h3>Your name</h3>
      <form class="row" id="nameset"><input id="namemore" class="namein" style="flex:1;min-width:0" autocomplete="given-name" maxlength="24" placeholder="First name" value="${esc(state.name || "")}" aria-label="First name"><button class="btn primary" type="submit">Save</button></form>
      <p class="hint" style="margin:0">Your study buddy says hello with it on Home.</p></section>
    <section class="card pad" style="display:grid;gap:10px"><h3>Daily goal</h3>
      <div class="row">${[10, 20, 30, 50].map(g => `<button class="btn${state.goal === g ? " primary" : ""}" data-goal="${g}">${g} a day</button>`).join("")}</div></section>
    <section class="card pad" style="display:grid;gap:10px"><h3>Daily reminder</h3>
      <p class="muted small" style="margin:0">Get a phone alert at the same time every day. It goes into your phone's Calendar as a repeating "EA practice" event, and the event links back to this app.</p>
      <div class="row" style="align-items:center"><label for="remtime" class="small">Remind me at</label>
        <select id="remtime" class="btn">${REM_TIMES.map(t => `<option value="${t}"${t === remPick ? " selected" : ""}>${fmtT(t)}</option>`).join("")}</select></div>
      <div class="row"><a class="btn primary" id="remadd" style="text-decoration:none" href="reminders/ea-practice-${remPick}.ics">Add to my calendar</a></div>
      ${rem.at ? `<p class="small" style="margin:0"><b>You added a ${fmtT(rem.time)} reminder on ${new Date(rem.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.</b></p>` : ""}
      <p class="hint" style="margin:0">iPhone: tap Add All when the event appears. Android: open the downloaded file with your Calendar app. To change the time or stop the reminder, delete the "EA practice" event in Calendar, then add a new one here.</p></section>
    <section class="card pad" style="display:grid;gap:10px"><h3>Figures</h3>
      <p class="muted small" style="margin:0">Drawn machines that show a rule working. Each one also opens from the questions it reproduces, after you answer.</p>
      ${Object.entries(FIGURES).map(([fig, f]) => `<div style="border-top:1px solid var(--line);padding-top:10px;display:grid;gap:6px"><b>${f.title}</b><span class="small">${FIGURE_ABOUT[fig]}</span><span class="hint">Linked from ${Object.values(MACHINE).filter(list => list.some(([x]) => x === fig)).length} questions</span><div><button class="btn" data-figure="${fig}">Open</button></div></div>`).join("")}</section>
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
  /* load the page fresh, without any ?intro= setting, so the launch screen runs from the start */
  $("#introreplay").onclick = () => { location.href = location.pathname; };
  $("#app").querySelectorAll("[data-figure]").forEach(b => (b.onclick = () => openMachine(b.dataset.figure, 0)));
  $("#nameset").onsubmit = e => { e.preventDefault(); state.name = $("#namemore").value.trim(); state.nameAsked = true; save(); toast(state.name ? `Saved. Hi, ${state.name}!` : "Name cleared."); };
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
      let b; try { b = readBackup(String(r.result)); } catch (err) { toast("That file isn't an Above the Line backup."); return; }
      const when = b.savedAt ? new Date(b.savedAt).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "an unknown date";
      const answered = Object.values(b.state.items).filter(x => x && x.seen).length;
      $("#loadconfirm").innerHTML = `<div class="confirm"><b>Replace the progress on this device with the backup from ${esc(when)}?</b><span class="small">The backup has ${answered} questions answered. What's on this device now will be replaced.</span><div class="row"><button class="btn amber" id="loadyes">Replace with backup</button><button class="btn ghost" id="loadno">Cancel</button></div></div>`;
      $("#loadyes").onclick = () => { state = Object.assign(blank(), b.state, { lastBackup: b.savedAt || Date.now(), examRun: null }); useExam(state.exam); save(); updateFlagDot(); toast("Backup loaded."); renderMore(); };
      $("#loadno").onclick = () => { $("#loadconfirm").innerHTML = ""; };
    };
    r.readAsText(f); e.target.value = "";
  };
  $("#import").onclick = () => { try { const s = JSON.parse($("#importtext").value); if (!s || typeof s.items !== "object") throw 0; s.examRun = null; state = Object.assign(blank(), s); useExam(state.exam); save(); updateFlagDot(); toast("Backup restored."); renderMore(); } catch (e) { toast("That isn't a valid backup. Paste the full text you copied."); } };
  $("#reset").onclick = () => {
    $("#resetrow").innerHTML = `<span>Erase everything on this device?</span><button class="btn danger" id="ry">Yes, erase</button><button class="btn ghost" id="rn">Cancel</button>`;
    $("#ry").onclick = () => { state = blank(); useExam("ea"); save(); updateFlagDot(); toast("Progress erased."); renderMore(); };
    $("#rn").onclick = renderMore;
  };
}

/* ---------- wiring ---------- */
$("#morebtn").onclick = () => (view === "more" ? renderHome() : renderMore());
document.querySelectorAll(".tabbar [data-tab]").forEach(b => b.onclick = () => (view === "home" ? setHomeTab(b.dataset.tab) : (homeTab = b.dataset.tab, renderHome())));
$("#tbmore").onclick = () => $("#morebtn").click();
/* the tab bar shows only while Home's sections are on screen: drill, exam and More keep their own screens */
/* On a phone, Today and City are night scenes edge to edge: the page itself turns to night sky (see .nightsky in shell.html) */
function syncPage() {
  const tabs = !!$("#app > .panes");
  document.body.classList.toggle("tabs", tabs);
  document.documentElement.classList.toggle("nightpage", tabs && (homeTab === "today" || homeTab === "city"));
}
new MutationObserver(syncPage).observe($("#app"), { childList: true });
document.addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = (e.target.tagName || "").toLowerCase(); if (tag === "textarea" || tag === "input" || tag === "select") return;
  const k = e.key.toLowerCase(), i = "abcd".indexOf(k) >= 0 ? "abcd".indexOf(k) : "1234".indexOf(k);
  if (e.key === "Escape" && $("#scrim")) return $("#guidevid") ? closeGuide() : closeLayer();
  if (view === "drill" && drill && drill.q) {
    if (drill.picked == null && i >= 0) { e.preventDefault(); answerDrill(i); }
    else if (drill.picked != null && !drill.flagging && (k === "enter" || k === "n")) { e.preventDefault(); drill.goalHit ? renderSummary() : nextQ(); }
    else if (drill.picked != null && !drill.flagging && k === "g") { e.preventDefault(); markGuess(); }
  } else if (view === "exam" && state.examRun && !state.examRun.onBreak && i >= 0) {
    const btn = $("#app").querySelectorAll(".choice")[i]; if (btn) { e.preventDefault(); btn.click(); }
  }
});
updateFlagDot();
/* the launch screen (src/intro.js): it opens the app itself on Tap to Start or one of its side buttons */
/* the launch screen's progress: EA readiness per part (the three stations), every EA area for the tower, and the next stop
   in the exam you're studying (the same area the Today card names) */
function introProgress() {
  const now = EA_BANK.filter(q => !st(q.id).flag), m = d => { const qs = now.filter(q => q.domain === d); return qs.length ? qs.reduce((a, q) => a + Math.min(st(q.id).box, 4), 0) / (4 * qs.length) : 0; };
  const keys = Object.keys(EA_DOMAINS), w = d => EA_DOMAINS[d].n;
  const parts = [1, 2, 3].map(p => { const ds = keys.filter(d => String(EA_DOMAINS[d].part) === String(p)); return ds.reduce((a, d) => a + w(d) * m(d), 0) / ds.reduce((a, d) => a + w(d), 0); });
  const tower = keys.reduce((a, d) => a + w(d) * m(d), 0) / keys.reduce((a, d) => a + w(d), 0);
  const g = gap(state.part), first = !BANK.some(q => st(q.id).seen);
  return { parts, tower, first, next: g ? { name: DOMAINS[g.d].short, m: g.m } : null };
}
function introNotices() {
  const out = [], w = daysTo(WINDOW_END), flags = new Set(BANK.filter(q => st(q.id).flag).map(q => q.id)).size;
  for (const p of partKeys()) { const iso = examDate(p), d = iso ? daysTo(iso) : -1; if (d >= 0) out.push(d === 0 ? `${PL(p)} is today. Good luck.` : `${PL(p)} is in ${d} day${d === 1 ? "" : "s"}, on ${fmtDay(iso, { month: "long", day: "numeric" })}.`); }
  if (!isCpa() && w >= 0) out.push(`The testing window closes February 28, 2027, in ${w} day${w === 1 ? "" : "s"}.`);
  out.push(backupLine());
  out.push(flags ? `${flags} flagged question${flags === 1 ? " is" : "s are"} waiting in More to be reported.` : "No flagged questions.");
  return out;
}
function introGo(where) {
  const toCard = title => { const h = [...document.querySelectorAll("#app h3")].find(e => e.textContent === title); if (h) h.closest("section").scrollIntoView({ block: "start" }); };
  if (where === "progress") { homeTab = "map"; renderHome(); }
  else if (where === "settings") renderMore();
  else if (where === "report") { renderMore(); toCard("Flagged questions"); }
  else if (where === "reset") { renderMore(); $("#reset").click(); toCard("Start over"); } /* opens the confirm; nothing is erased from the launch screen */
  else renderHome();
}
if (state.examRun) renderExam();
else if (window.Intro && window.Intro.on) { window.Intro.begin({ name: state.name, notices: introNotices, go: introGo }); window.Intro.progress && window.Intro.progress(introProgress()); }
else renderHome();
