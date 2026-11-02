/* Screenshots of the real app for the how-to video, at iPhone size (390 x 844, 2x).
   Run from the repo root after building: node promo/tools/capture.cjs
   Writes promo/public/shots/*.png. Progress is seeded so the town is partly built.
   If jsDelivr is blocked, set THREE_DIR to a local three@0.160.0 package folder (as for tools/smoke.js). */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const OUT = path.resolve("promo/public/shots");
fs.mkdirSync(OUT, { recursive: true });

const seed = require("./seed.cjs");

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

  await p.goto("file://" + path.resolve("index.html") + "?gfx=high");
  await town();
  await shot("home");

  /* Times Square view */
  await p.click("#tsbtn"); await p.waitForTimeout(4500); await shot("home-ts");
  await p.click("#tsbtn"); await p.waitForTimeout(3000);

  /* tap a tower: the area sheet */
  await p.evaluate(() => window.__townPick("P1-3")); await p.waitForTimeout(2500); await shot("area-sheet");
  await p.click("#sheetx"); await p.waitForTimeout(500);

  /* full-screen 3D */
  await p.click("#fsbtn"); await p.waitForTimeout(5000); await shot("town-3d");
  await p.keyboard.press("Escape"); await p.waitForTimeout(1500);
  if (await p.$(".town-fs")) { await p.goto("file://" + path.resolve("index.html") + "?gfx=high"); await town(); }

  /* drill: question, wrong answer, right answer, flag form */
  await p.click("#play"); await p.waitForSelector(".choice");
  /* put a wrong choice at A and the keyed answer at C, so the video's tap on A shows a miss */
  await p.evaluate(() => { const a = drill.q.answer; drill.perm = [(a + 1) % 4, (a + 2) % 4, a, (a + 3) % 4]; renderDrill(); });
  await p.waitForTimeout(400); await shot("drill-q");
  /* `drill` is a top-level let in the app's script, visible to evaluate */
  const keyed = await p.evaluate(() => { try { return { perm: drill.perm, answer: drill.q.answer }; } catch (e) { return null; } });
  const wrongI = keyed ? keyed.perm.findIndex(o => o !== keyed.answer) : 1;
  await p.click(`.choice[data-i="${wrongI}"]`); await p.waitForTimeout(400); await shot("drill-wrong-full", { fullPage: true });
  await p.click("#flag"); await p.waitForTimeout(300);
  await p.fill("#flagnote", "The 2025 figure looks off per Pub 501"); await shot("drill-flag", { fullPage: true });
  await p.click("#flagx"); await p.waitForTimeout(200);
  await p.click("#next"); await p.waitForSelector(".choice:not([disabled])");
  const k2 = await p.evaluate(() => { try { return { perm: drill.perm, answer: drill.q.answer }; } catch (e) { return null; } });
  const rightI = k2 ? k2.perm.indexOf(k2.answer) : 0;
  await p.click(`.choice[data-i="${rightI}"]`); await p.waitForTimeout(400); await shot("drill-right");

  /* exam sim: setup, a question, the break, results */
  await p.click("#back"); await p.waitForTimeout(800);
  await p.click("#examgo"); await p.waitForTimeout(400); await shot("exam-setup");
  await p.click("#start"); await p.waitForSelector(".choice");
  /* answer the whole sim at about 72% right, then show question 7 of section 1 */
  await p.evaluate(() => {
    const E = state.examRun; let k = 0;
    for (const id of E.ids) { const a = byId[id].answer; E.ans[id] = (k++ * 37 % 100) < 72 ? a : (a + 1) % 4; }
    E.idx = 6; save(); renderExam(); window.scrollTo(0, 0);
  });
  await p.click("#mark"); await p.waitForTimeout(200);
  await p.evaluate(() => window.scrollTo(0, 0)); await shot("exam-q");
  await p.click("#endsec"); await p.waitForTimeout(300); await shot("exam-leave");
  await p.click("#yes"); await p.waitForTimeout(300); await shot("exam-break");
  /* finish fast: jump to section 3 and submit */
  await p.click("#resumebrk"); await p.click("#endsec"); await p.click("#yes"); await p.click("#resumebrk");
  await p.click("#endsec"); await p.click("#yes"); await p.waitForTimeout(500); await shot("exam-results");

  /* More: goal, reminder, backup */
  await p.click("#back"); await p.waitForTimeout(800);
  await p.click("#morebtn"); await p.waitForTimeout(400); await shot("more-full", { fullPage: true });

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
