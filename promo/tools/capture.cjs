/* Screenshots of the real app for the how-to video, at iPhone size (390 x 844, 2x).
   Run from the repo root after building: node promo/tools/capture.cjs
   Writes promo/public/shots/*.png and promo/src/layout.json. Progress is seeded so the town is partly built.
   If jsDelivr is blocked, set THREE_DIR to a local three@0.160.0 package folder (as for tools/smoke.js). */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const OUT = path.resolve("promo/public/shots");
fs.mkdirSync(OUT, { recursive: true });

const seed = require("./seed.cjs");
const APP = q => "file://" + path.resolve("index.html") + "?gfx=high&" + q;

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  if (process.env.THREE_DIR) await ctx.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/, r => r.fulfill({ path: path.join(process.env.THREE_DIR, r.request().url().split("three@0.160.0/")[1]), contentType: "text/javascript" }));
  const state = seed();
  await ctx.addInitScript(s => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("eaTaxTown.v2", s); sessionStorage.setItem("seeded", "1"); } }, JSON.stringify(state));
  const p = await ctx.newPage();
  p.on("pageerror", e => console.log("pageerror:", e.message));
  const shot = async (name, opts = {}) => { await p.screenshot({ path: path.join(OUT, name + ".png"), ...opts }); console.log("shot", name); };
  const town = async () => {
    await p.waitForFunction(() => window.Town && window.Town.ready && window.__townDebug && window.__townDebug().calls > 0, null, { timeout: 180000 });
    await p.waitForTimeout(5000);
  };
  const tab = async (t, wait = 1500) => { await p.click(`.tabbar [data-tab="${t}"]`); await p.waitForTimeout(wait); };
  /* positions the video taps and highlights, in screenshot pixels (viewport x 2). A selector, [selector, text],
     or "selector^ancestor" for the closest ancestor; `full` measures from the top of the page, for fullPage shots. */
  const rr = (m, full) => p.evaluate(([m, full]) => Object.fromEntries(Object.entries(m).map(([k, s]) => {
    let e;
    /* [selector, text]: the smallest visible element holding the text */
    if (Array.isArray(s)) e = [...document.querySelectorAll(s[0])].filter(x => x.textContent.includes(s[1]) && x.getClientRects().length)
      .sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height)[0];
    else { const [sel, up] = s.split("^"); e = document.querySelector(sel); if (e && up) e = e.closest(up); }
    if (!e || !e.getClientRects().length) return [k, null];
    const b = e.getBoundingClientRect(), oy = full ? scrollY : 0;
    return [k, [Math.round(b.x * 2), Math.round((b.y + oy) * 2), Math.round(b.width * 2), Math.round(b.height * 2)]];
  })), [m, full]);
  const pageH = () => p.evaluate(() => Math.round(document.documentElement.scrollHeight * 2));
  const layout = {};

  /* the launch screen: partway through the El ride, then Tap to Start */
  await p.goto(APP("intro=full")); await p.waitForTimeout(9000); await shot("ride");
  await p.goto(APP("intro=title")); await p.waitForTimeout(25000); await shot("title");
  layout.title = await rr({ start: ["#intro button, #intro [role=button], #intro *", "Tap to Start"] });

  /* Today, in EA mode */
  await p.goto(APP("intro=0"));
  await town();
  await p.waitForTimeout(12000); /* let the study buddy finish his hello */
  await shot("greet");
  layout.greet = await rr({ play: "#buddyplay", face: "#buddyface", streak: ".greet-pill", guide: "#greetguide", menu: "#morebtn",
    sw: ".appbar .exsw", cpa: '.appbar .exsw [data-ex="cpa"]', parts: ".appbar .lines", tabbar: ".tabbar", card: ".today-card", count: ".countpill",
    ready: ".today-card .ready-row", pills: ".today-card .pills", cta: ".hero-cta", playbtn: "#play", examgo: "#examgo",
    city: '.tabbar [data-tab="city"]', map: '.tabbar [data-tab="map"]', exam: '.tabbar [data-tab="exam"]' });

  /* City: the 3D town, Times Square, a tower's sheet, full screen */
  await tab("city", 6000); await shot("city");
  layout.city = await rr({ ptabs: ".ptabs", ts: "#tsbtn", fs: "#fsbtn", deductions: ["#labels .tag", "Deductions"] });
  await p.click("#tsbtn"); await p.waitForTimeout(4500); await shot("home-ts");
  await p.click("#tsbtn"); await p.waitForTimeout(3000);
  await p.evaluate(() => window.__townPick("P1-3")); await p.waitForTimeout(2500); await shot("area-sheet"); layout.area = await rr({ stats: ".stats3", sheet: ".bsheet" });
  await p.click("#sheetx"); await p.waitForTimeout(500);
  await p.click("#fsbtn"); await p.waitForTimeout(5000); await shot("town-3d");
  await p.keyboard.press("Escape"); await p.waitForTimeout(1500);
  if (await p.$(".town-fs")) { await p.goto(APP("intro=0")); await town(); await tab("city", 3000); }

  /* Map and Exam */
  await tab("map"); await shot("map-full", { fullPage: true });
  layout.map = Object.assign(await rr({ seg: ".partseg", next: [".pane-map *", "Next stop"], head: ".part-head" }, true), { h: await pageH() });
  layout.map.nextCard = await p.evaluate(() => { const e = [...document.querySelectorAll(".pane-map *")].filter(x => /next stop/i.test(x.textContent) && x.children.length).pop(); if (!e) return null;
    let c = e; while (c.parentElement && c.getBoundingClientRect().height < 150) c = c.parentElement; const b = c.getBoundingClientRect(); return [Math.round(b.x * 2), Math.round((b.y + scrollY) * 2), Math.round(b.width * 2), Math.round(b.height * 2)]; });
  await p.evaluate(() => window.scrollTo(0, 0));
  await tab("exam"); await shot("exam-tab");
  layout.examtab = await rr({ day: ".examday", days: ".ed-days", parts: ".ed-parts", sim: "#examnew^section", simbtn: "#examnew" });

  /* CPA mode: Today and City, then back to EA */
  await tab("today", 800);
  await p.click('.appbar .exsw [data-ex="cpa"]'); await p.waitForTimeout(12000); await shot("cpa-today");
  layout.cpa = await rr({ sw: ".appbar .exsw", parts: ".appbar .lines", ready: ".today-card .ready-row" });
  await tab("city", 6000); await shot("cpa-city");
  layout.cpacity = await rr({ ptabs: ".ptabs" });
  await tab("exam"); await shot("cpa-exam"); layout.cpaexam = await rr({ sim: "#examnew^section" });
  await tab("today", 800);
  await p.click('.appbar .exsw [data-ex="ea"]'); await p.waitForTimeout(6000);

  /* drill: question, wrong answer, right answer, flag form */
  await p.click("#play"); await p.waitForSelector(".choice");
  /* put a wrong choice at A and the keyed answer at C, so the video's tap on A shows a miss.
     `drill` is a top-level let in the app's script, visible to evaluate */
  await p.evaluate(() => { const a = drill.q.answer; drill.perm = [(a + 1) % 4, (a + 2) % 4, a, (a + 3) % 4]; renderDrill(); });
  await p.waitForTimeout(400); await shot("drill-q"); layout.drill = await rr({ a: '.choice[data-i="0"]' });
  await p.click('.choice[data-i="0"]'); await p.waitForTimeout(400); await shot("drill-wrong-full", { fullPage: true });
  layout.wrong = Object.assign(await rr({ explain: ".explain", flag: "#flag" }, true), { h: await pageH() });
  await p.click("#flag"); await p.waitForTimeout(300);
  await p.fill("#flagnote", "The 2025 figure looks off per Pub 501"); await shot("drill-flag", { fullPage: true });
  layout.flag = Object.assign(await rr({ form: ".flagform" }, true), { h: await pageH() });
  await p.click("#flagx"); await p.waitForTimeout(200);
  await p.click("#next"); await p.waitForSelector(".choice:not([disabled])");
  const k2 = await p.evaluate(() => { try { return { perm: drill.perm, answer: drill.q.answer }; } catch (e) { return null; } });
  const rightI = k2 ? k2.perm.indexOf(k2.answer) : 0;
  await p.click(`.choice[data-i="${rightI}"]`); await p.waitForTimeout(400); await shot("drill-right");

  /* exam sim: setup, a question, leaving a section, results */
  await p.click("#back"); await p.waitForTimeout(800);
  await p.click("#examgo"); await p.waitForTimeout(400); await shot("exam-setup"); layout.setup = await rr({ card: "#start^section", start: "#start" });
  await p.click("#start"); await p.waitForSelector(".choice");
  /* answer the whole sim at about 72% right, then show question 7 of section 1 */
  await p.evaluate(() => {
    const E = state.examRun; let k = 0;
    for (const id of E.ids) { const a = byId[id].answer; E.ans[id] = (k++ * 37 % 100) < 72 ? a : (a + 1) % 4; }
    E.idx = 6; save(); renderExam(); window.scrollTo(0, 0);
  });
  await p.click("#mark"); await p.waitForTimeout(200);
  await p.evaluate(() => window.scrollTo(0, 0)); await shot("exam-q"); layout.examq = await rr({ timer: "#timer", finish: "#endsec" });
  await p.click("#endsec"); await p.waitForTimeout(300); await shot("exam-leave"); layout.leave = await rr({ confirm: ".confirm", yes: "#yes" });
  await p.click("#yes"); await p.waitForTimeout(300); await shot("exam-break"); layout.brk = await rr({ card: "#resumebrk^section" });
  /* finish fast: jump to section 3 and submit */
  await p.click("#resumebrk"); await p.click("#endsec"); await p.click("#yes"); await p.click("#resumebrk");
  await p.click("#endsec"); await p.click("#yes"); await p.waitForTimeout(500); await shot("exam-results"); layout.res = await rr({ big: ".result-big^section", table: "table.res^section" });

  /* the menu: goal, reminder, backup */
  await p.click("#back"); await p.waitForTimeout(800);
  await p.click("#morebtn"); await p.waitForTimeout(400); await shot("more-full", { fullPage: true });
  layout.more = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll("#app .stack > section")].map(e => { const b = e.getBoundingClientRect(); return [(e.querySelector("h3,h2") || e).textContent.trim(), [Math.round(b.x * 2), Math.round((b.y + scrollY) * 2), Math.round(b.width * 2), Math.round(b.height * 2)]]; })));
  layout.moreH = await pageH();
  fs.writeFileSync(path.resolve("promo/src/layout.json"), JSON.stringify(layout, null, 1) + "\n");
  console.log(JSON.stringify(layout));

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
