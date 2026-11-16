/* Backup restore can't run code (security pass, 2026-11-15; tidy() in src/app.js).
   A doctored backup, restored by paste and by file, must not run anything, on restore or
   on the next launch, and a genuine backup must come back unchanged.
   Run from the repo root after building: node tools/backup-check.js [page.html] */
const { chromium } = require("playwright");
const path = require("path");
const page_ = process.argv[2] || "index.html";
const fails = []; const check = (ok, what, d) => { console.log((ok ? "PASS " : "FAIL ") + what + (ok || d === undefined ? "" : " " + JSON.stringify(d).slice(0, 300))); if (!ok) fails.push(what); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); const errors = []; p.on("pageerror", e => errors.push(e.message));
  const url = "file://" + path.resolve(page_) + "?intro=0&sw=off";
  await p.goto(url);
  await p.waitForFunction(() => typeof renderMore === "function" && document.querySelector("#app"), null, { timeout: 60000 });
  await p.waitForTimeout(1500);
  const hit = "window.__pwned=(window.__pwned||0)+1";
  const TAG = `"><img src=x onerror="${hit}">`;
  const evil = { v: 2, exam: "ea", part: "1", items: { "e1-001": { box: 1, due: 0, seen: 1, right: 1, last: 1, flag: false, note: "" } }, log: [],
    goal: `<img src=x onerror="${hit}">`, reminder: { pick: TAG, time: TAG, at: Date.now() },
    exams: [{ t: Date.now(), part: `<img src=x onerror="${hit}">`, n: 10, right: 7, score: 0.7, per: {}, missed: [] }],
    examDates: { "1": TAG }, name: "Ana", shown: {}, lastBackup: 0 };
  // 1. paste restore, then the screens that draw those fields, then a relaunch
  const r1 = await p.evaluate(async ({ evil }) => {
    renderMore(); document.querySelector("#importtext").value = JSON.stringify({ savedAt: Date.now(), state: evil });
    document.querySelector("#import").click(); await new Promise(r => setTimeout(r, 300));
    renderMore(); renderHome(); await new Promise(r => setTimeout(r, 500));
    return { pwned: window.__pwned || 0, goal: state.goal, rem: state.reminder, part: state.exams[0] && state.exams[0].part, dates: state.examDates, kept: !!state.items["e1-001"] };
  }, { evil });
  check(r1.pwned === 0, "a doctored backup pasted in runs nothing (More, Home)", r1);
  check(r1.goal === 20 && r1.rem === null && r1.part === "1" && Object.keys(r1.dates).length === 0, "its doctored fields fall back to fresh values", r1);
  check(r1.kept, "its real progress is kept");
  await p.goto(url); await p.waitForFunction(() => typeof renderMore === "function", null, { timeout: 60000 }); await p.waitForTimeout(1500);
  const r2 = await p.evaluate(async () => { renderMore(); renderHome(); await new Promise(r => setTimeout(r, 500)); return window.__pwned || 0; });
  check(r2 === 0, "and nothing runs on the next launch");
  // 2. something already saved on this phone by an older version is checked on launch too
  await p.evaluate(({ evil }) => localStorage.setItem("eaTaxTown.v2", JSON.stringify(evil)), { evil });
  await p.goto(url); await p.waitForFunction(() => typeof renderMore === "function", null, { timeout: 60000 }); await p.waitForTimeout(1500);
  const r3 = await p.evaluate(async () => { renderMore(); renderHome(); await new Promise(r => setTimeout(r, 500)); return window.__pwned || 0; });
  check(r3 === 0, "doctored saved progress already on the phone runs nothing at launch");
  // 3. a genuine backup comes back unchanged
  const r4 = await p.evaluate(() => {
    const real = { v: 2, exam: "cpa", part: "REG", eaPart: "2", goal: 30, name: "Chris", nameAsked: true, lastBackup: 1763200000000, sky: "day",
      items: { "reg-012": { box: 3, due: 1763300000000, seen: 4, right: 3, last: 1763200000000, flag: true, note: "Check §1031 timing", flaggedAt: 1763200000000 } },
      log: [{ id: "reg-012", ok: true, t: 1763200000000, m: "drill" }, { id: "reg-013", ok: false, t: 1763200000001, m: "drill", g: 1 }],
      exams: [{ t: 1763200000000, part: "REG", n: 72, right: 50, score: 50 / 72, per: { "REG-IV": { n: 20, r: 15 } }, timeUp: false, fresh: { n: 5, right: 4 }, missed: [{ id: "reg-012", picked: 2 }, { id: "reg-013", picked: null }] }],
      shown: { "REG-IV": 0.4 }, day: { k: "2026-11-15", m: { "REG-IV": 0.4 } }, reminder: { pick: "0730", time: "0730", at: 1763200000000 }, examDates: { REG: "2027-01-15" }, examRun: null };
    const back = readBackup(JSON.stringify({ savedAt: 1763200000000, state: real })).state;
    const diff = Object.keys(real).filter(k => JSON.stringify(real[k]) !== JSON.stringify(back[k]));
    // The app's own Copy backup is the bare progress: paste it back through the box.
    renderMore(); document.querySelector("#importtext").value = JSON.stringify(real); document.querySelector("#import").click();
    const pasted = Object.keys(real).filter(k => k !== "lastBackup" && JSON.stringify(real[k]) !== JSON.stringify(state[k]));
    return { diff, pasted, flagKept: back.items["reg-012"].flaggedAt === 1763200000000, guessKept: back.log[1].g === 1, savedAt: readBackup(JSON.stringify({ savedAt: 1763200000000, state: real })).savedAt };
  });
  check(r4.diff.length === 0 && r4.savedAt === 1763200000000, "a genuine backup file comes back unchanged, field for field", r4);
  check(r4.pasted.length === 0, "Copy backup, then paste it back: unchanged", r4.pasted);
  // 4. odd shapes from the review: numbers where text belongs, a part named after an object's
  //    built-ins, an array for a part. None may break More or Home.
  const r5 = await p.evaluate(async () => {
    const out = [];
    for (const bad of [{ reminder: { pick: 1900, time: 1900, at: Date.now() } }, { part: "constructor", examDates: { constructor: "2027-01-01" } },
                       { part: ["2"] }, { part: "__proto__", exams: [{ part: "toString", score: 1, t: 1 }] }, { items: { __proto__: { box: 1 } } }]) {
      try { state = readBackup(JSON.stringify(Object.assign({ items: {} }, bad))).state; useExam(state.exam); renderMore(); renderHome(); out.push(typeof state.part === "string" ? "ok" : "part " + typeof state.part); }
      catch (e) { out.push("threw: " + e.message); }
    }
    return out;
  });
  check(r5.every(x => x === "ok"), "odd shapes in a backup can't break More or Home", r5);
  check(r4.flagKept && r4.guessKept, "a flag's date and the \"I guessed\" mark survive a restore", r4);
  check(errors.length === 0, "no page errors", errors.slice(0, 3));
  await browser.close();
  if (fails.length) { console.log(`${fails.length} failed`); process.exit(1); } else console.log("all passed");
})();
