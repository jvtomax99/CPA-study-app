/* The seeded learner for the how-to video captures (capture.cjs, capture-motion.cjs). */
const fs = require("fs");
/* A believable learner: Part 1 partly built, some CPA sections started, a 7-day streak, 14 of 20 done today,
   some reviews due, and a Part 1 exam date 47 days out. */
function seed() {
  const bank = JSON.parse(fs.readFileSync("src/questions.json", "utf8"));
  const mastered = { "P1-1": 0.8, "P1-2": 0.55, "P1-3": 0.3, "P1-4": 0.62, "P1-5": 0.92, "P1-6": 0.18, "P2-1": 0.25, "P2-2": 0.1, "P3-1": 0.15,
    "REG-II": 0.3, "FAR-I": 0.45, "FAR-II": 0.2, "AUD-I": 0.35, "AUD-II": 0.15, "TCP-I": 0.3, "TCP-II": 0.1 };
  const now = Date.now(), DAY = 864e5, items = {}, log = [];
  const byDomain = {};
  for (const q of bank) (byDomain[q.domain] = byDomain[q.domain] || []).push(q);
  for (const d in byDomain) {
    const m = mastered[d] || 0, qs = byDomain[d], solid = Math.round(qs.length * m);
    qs.forEach((q, i) => {
      if (i < solid) items[q.id] = { box: 4, due: now + 5 * DAY, seen: 4, right: 4, last: now - DAY, flag: false, note: "" };
      else if (i < solid + Math.round(qs.length * 0.25 * (m > 0 ? 1 : 0))) items[q.id] = { box: 1, due: i % 3 ? now - 3600e3 : now + DAY, seen: 2, right: 1, last: now - 2 * DAY, flag: false, note: "" };
    });
  }
  const ids = Object.keys(items);
  for (let day = 6; day >= 1; day--) for (let k = 0; k < 22; k++) log.push({ id: ids[(day * 22 + k) % ids.length], ok: k % 4 !== 0, t: now - day * DAY + k * 60e3, m: "drill" });
  for (let k = 0; k < 14; k++) log.push({ id: ids[k], ok: k % 5 !== 0, t: now - (14 - k) * 60e3, m: "drill" });
  const iso = d => new Date(now + d * DAY - new Date().getTimezoneOffset() * 60e3).toISOString().slice(0, 10);
  const shown = {}; /* what the town last showed; matches mastery so no "finished" toasts */
  return { v: 2, items, log, part: "1", goal: 20, exams: [
    { t: now - 9 * DAY, part: 1, n: 100, right: 58, score: 0.58, per: {}, timeUp: false, missed: [] },
    { t: now - 2 * DAY, part: 1, n: 100, right: 66, score: 0.66, per: {}, timeUp: false, missed: [] }
  ], examRun: null, shown, lastBackup: now - 3 * DAY, reminder: null, sky: "dusk", name: "Alex", nameAsked: true,
    exam: "ea", examDates: { "1": iso(47), REG: iso(96) } };
}
module.exports = seed;
