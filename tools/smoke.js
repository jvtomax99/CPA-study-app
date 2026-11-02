/* Headless smoke test: town loads and stays under a draw-call budget, tapping a building opens it,
   drill + flagging, exam sim through a section break, backup save and load.
   Run from the repo root after building: node tools/smoke.js
   If jsDelivr is blocked (some cloud sandboxes), set THREE_DIR to a local three@0.160.0 package folder (the one holding build/ and examples/). */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path"), os = require("os");
const DRAW_BUDGET = 450;
const fails = []; const check = (ok, what) => { console.log((ok ? "PASS " : "FAIL ") + what); if (!ok) fails.push(what); };

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 }, acceptDownloads: true });
  if (process.env.THREE_DIR) await ctx.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/, r => r.fulfill({ path: path.join(process.env.THREE_DIR, r.request().url().split("three@0.160.0/")[1]), contentType: "text/javascript" }));
  const p = await ctx.newPage(); const errors = []; p.on("pageerror", e => errors.push(e.message));
  await p.goto("file://" + path.resolve("index.html") + "?gfx=high");

  /* town */
  await p.waitForFunction(() => window.Town && window.Town.ready && window.__townDebug && window.__townDebug().calls > 0, null, { timeout: 120000 }); /* wait for a real rendered frame */
  await p.waitForTimeout(4000);
  const dbg = await p.evaluate(() => window.__townDebug());
  check(dbg.calls > 50 && dbg.calls < DRAW_BUDGET, `town draws ${dbg.calls} per frame (budget ${DRAW_BUDGET})`);
  await p.evaluate(() => document.querySelectorAll("#labels .tag").forEach(t => { t.style.pointerEvents = "none"; })); /* make the tap hit the 3D mesh, not a label */
  const spot = await p.evaluate(() => window.__townDebug().screenOf("P1-3"));
  if (spot) await p.mouse.click(spot.x, spot.y);
  check(!!(await p.waitForSelector("#sheetgo", { timeout: 10000 }).catch(() => null)), "tapping a building in 3D opens its area");
  if (await p.$("#sheetx")) await p.click("#sheetx");

  /* full screen 3D: open, drag the map, tap a tower, drill it, Escape closes */
  await p.click("#fsbtn");
  await p.waitForFunction(() => window.__townDebug().fs && document.querySelector(".town-fs canvas"), null, { timeout: 10000 }).catch(() => {});
  check(await p.evaluate(() => window.__townDebug().fs && !!document.querySelector(".town-fs canvas")), "3D button opens the city full screen");
  check(await p.evaluate(() => document.querySelectorAll(".town-fs .labels .tag").length) === 13, "full screen labels all 13 towers");
  await p.waitForTimeout(1500);
  const t0 = await p.evaluate(() => window.__townDebug().target);
  await p.mouse.move(550, 450); await p.mouse.down(); await p.mouse.move(450, 380, { steps: 6 }); await p.mouse.up();
  await p.waitForTimeout(1500);
  const t1 = await p.evaluate(() => window.__townDebug().target);
  check(Math.hypot(t1[0] - t0[0], t1[2] - t0[2]) > 5, "dragging moves around the city");
  await p.evaluate(() => document.querySelectorAll(".town-fs .labels .tag").forEach(t => { t.style.pointerEvents = "none"; }));
  const fspot = await p.evaluate(() => window.__townDebug().screenOf("P1-3"));
  if (fspot) await p.mouse.click(fspot.x, fspot.y);
  await p.waitForFunction(() => window.__townDebug().picked && !document.querySelector(".fs-card").hidden, null, { timeout: 10000 }).catch(() => {});
  check(await p.evaluate(() => !!window.__townDebug().picked && !document.querySelector(".fs-card").hidden), "tapping a tower in full screen shows its card");
  if (await p.$("[data-fs=drill]")) await p.click("[data-fs=drill]");
  check(!!(await p.waitForSelector("#sheetgo", { timeout: 10000 }).catch(() => null)) && await p.evaluate(() => !window.__townDebug().fs), "Drill in the card closes 3D and opens the area");
  if (await p.$("#sheetx")) await p.click("#sheetx");
  await p.click("#fsbtn"); await p.waitForTimeout(800); await p.keyboard.press("Escape"); await p.waitForTimeout(800);
  check(await p.evaluate(() => !window.__townDebug().fs && !!document.querySelector("#stage canvas")), "Escape closes full screen and the town returns to home");

  /* the how-to video: Home's one-time card opens it; closing drops the card; More keeps a button */
  check(!!(await p.$("#guidego")), "guide: Home shows the how-to card to a new user");
  await p.click("#guidego");
  check(await p.evaluate(() => { const v = document.querySelector("#guidevid"); return !!v && v.getAttribute("src") === "media/how-to-use.mp4"; }), "guide: Watch opens the video");
  check(fs.existsSync(path.resolve("media/how-to-use.mp4")), "guide: media/how-to-use.mp4 is in the repo");
  await p.click("#guideclose"); await p.waitForTimeout(300);
  check(!(await p.$("#guidevid")) && !(await p.$("#guidego")), "guide: closing it removes the Home card");
  await p.click("#morebtn"); check(!!(await p.$("#guidemore")), "guide: More has Watch the guide"); await p.click("#back");
  await p.waitForFunction(() => window.Town && window.Town.ready && document.querySelector("#stage canvas"), null, { timeout: 30000 }).catch(() => {});

  /* drill and flagging */
  await p.click("#play"); await p.click(".choice >> nth=0");
  check(!!(await p.$(".explain")), "drill: answering shows the explanation");
  await p.click("#flag"); await p.fill("#flagnote", "smoke test"); await p.click("#flagsave");
  const flagged = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem("eaTaxTown.v2")).items).filter(x => x.flag && x.note === "smoke test").length);
  check(flagged === 1, "drill: flag as wrong saves the note");
  check(!!(await p.$(".choice")), "drill: moves on to the next question after flagging");

  /* exam sim */
  await p.click("#back"); await p.click("#examgo"); await p.click("#start");
  await p.click(".choice >> nth=1"); await p.click("#endsec"); await p.click("#yes");
  check(!!(await p.$("#resumebrk")), "exam: finishing section 1 gives the break screen");
  await p.click("#resumebrk");
  const run = await p.evaluate(() => JSON.parse(localStorage.getItem("eaTaxTown.v2")).examRun);
  check(run && run.sec === 1 && Object.keys(run.ans).length === 1, "exam: section 2 starts with the answer kept");

  /* backup */
  await p.click("#morebtn");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#savefile")]);
  const file = path.join(os.tmpdir(), "ea-smoke-backup.json"); await dl.saveAs(file);
  const saved = JSON.parse(fs.readFileSync(file, "utf8"));
  check(saved.app === "ea-ledger-drill" && Object.keys(saved.state.items).length > 0, "backup: file saves with progress in it");
  await p.evaluate(() => { localStorage.removeItem("eaTaxTown.v2"); });
  await p.reload(); await p.click("#morebtn");
  await p.setInputFiles("#fileinput", file); await p.click("#loadyes");
  const restored = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("eaTaxTown.v2")).items).length);
  check(restored === Object.keys(saved.state.items).length, "backup: loading the file restores progress");

  check(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
  console.log(fails.length ? `\n${fails.length} failed` : "\nall passed");
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
