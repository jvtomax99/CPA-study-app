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

  /* greeting + study buddy: the numbers spiral plays, he lands with Play on his calculator, a thought cloud types,
     the name prompt comes once and the greeting uses the name, a tap brings a new cloud */
  check(!!(await p.waitForSelector(".buddy-canvas", { timeout: 15000 }).catch(() => null)), "buddy: the number spiral starts on Home");
  await p.waitForFunction(() => !document.querySelector(".buddy-canvas") && !document.querySelector(".buddy-pending, .buddy-wait"), null, { timeout: 60000 }).catch(() => {});
  check(await p.evaluate(() => { const i = document.querySelector(".buddy-art"); return !document.querySelector(".buddy-canvas") && i.naturalWidth > 0 && getComputedStyle(document.querySelector(".buddy-body")).opacity === "1" && getComputedStyle(document.querySelector(".buddy-play")).opacity === "1"; }), "buddy: the spiral clears and he is up with Play on his calculator");
  check(await p.evaluate(() => /\w/.test((document.querySelector(".buddy-thought .bc-l1") || {}).textContent || "") || !!document.querySelector(".buddy-status").textContent), "buddy: his thought cloud has a pep talk");
  check(!!(await p.waitForSelector("#namein", { timeout: 20000 }).catch(() => null)), "greeting: asks for a name once");
  await p.fill("#namein", "Sam"); await p.click("#nameform button[type=submit]");
  check(await p.evaluate(() => document.querySelector(".greet-name").textContent === "Sam" && !document.querySelector("#scrim")), "greeting: says hello with the saved name");
  await p.click("#buddyface", { force: true });
  check(await p.evaluate(() => document.querySelectorAll(".buddy-thought").length === 1), "buddy: tapping him gives one new cloud");
  check(await p.evaluate(() => { const e = document.querySelector(".buddy-expr"); return !!e && e.style.backgroundPosition !== "" && !/^0(\.000)?% /.test(e.style.backgroundPosition); }), "buddy: tapping him changes his face");
  await p.click("#buddyplay", { force: true });
  check(!!(await p.$(".choice")), "buddy: Play on his calculator starts a drill");
  await p.click("#back"); await p.waitForSelector("#stage", { state: "attached" });

  /* Home sections: Today opens first; the tab bar (a sidebar at this width) switches to the town, the map and exam sims */
  check(await p.evaluate(() => document.body.classList.contains("tabs") && document.querySelector(".panes").dataset.tab === "today" && !!document.querySelector("#play").getClientRects().length), "tabs: Home opens on Today with Play");
  await p.click(".tabbar [data-tab=exam]");
  check(await p.evaluate(() => !!document.querySelector("#examnew").getClientRects().length && !document.querySelector("#play").getClientRects().length), "tabs: Exam shows the exam sims");
  check(await p.evaluate(() => !document.documentElement.classList.contains("nightpage")), "night page: Exam stays on paper");
  await p.click(".tabbar [data-tab=city]");
  check(await p.evaluate(() => !!document.querySelector("#stage").getClientRects().length && !document.querySelector("#play").getClientRects().length), "tabs: City shows the town");
  check(await p.evaluate(() => document.documentElement.classList.contains("nightpage")), "night page: City is a night scene");

  /* town */
  await p.waitForFunction(() => window.Town && window.Town.ready && window.__townDebug && window.__townDebug().calls > 0, null, { timeout: 120000 }); /* wait for a real rendered frame */
  await p.evaluate(() => document.querySelector("#stage").scrollIntoView({ block: "center" })); /* the greeting sits above the town */
  await p.waitForTimeout(4000);
  const dbg = await p.evaluate(() => window.__townDebug());
  check(await p.evaluate(() => { const s = getComputedStyle(document.querySelector("#stage canvas")); return (s.webkitMaskImage || s.maskImage || "none") === "none" && getComputedStyle(document.querySelector(".hero")).getPropertyValue("--fh").trim() !== ""; }), "home town fades in by overlay, not a canvas mask");
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
  /* iPhone Safari blacks out a WebGL canvas below a CSS mask line once it moves to full screen: keep masks off the canvas */
  check(await p.evaluate(() => { const s = getComputedStyle(document.querySelector(".town-fs canvas")); return (s.webkitMaskImage || s.maskImage || "none") === "none"; }), "the 3D canvas carries no CSS mask");
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

  await p.click(".tabbar [data-tab=today]");
  /* the how-to video: the greeting's How to use button opens it; More keeps a button */
  check(!!(await p.$("#greetguide")), "guide: the greeting has How to use");
  await p.click("#greetguide");
  check(await p.evaluate(() => { const v = document.querySelector("#guidevid"); return !!v && v.getAttribute("src") === "media/how-to-use.mp4"; }), "guide: How to use opens the video");
  check(fs.existsSync(path.resolve("media/how-to-use.mp4")), "guide: media/how-to-use.mp4 is in the repo");
  await p.click("#guideclose"); await p.waitForTimeout(300);
  check(!(await p.$("#guidevid")) && !!(await p.$("#greetguide")), "guide: closing it returns to Home");
  await p.click("#morebtn"); check(!!(await p.$("#guidemore")), "guide: More has Watch the guide"); await p.click("#back");
  await p.waitForFunction(() => window.Town && window.Town.ready && document.querySelector("#stage canvas"), null, { timeout: 30000 }).catch(() => {});

  /* drill and flagging */
  await p.click("#play");
  check(await p.evaluate(() => !document.body.classList.contains("tabs") && getComputedStyle(document.querySelector(".tabbar")).display === "none"), "tabs: the tab bar hides in a drill");
  await p.click(".choice >> nth=0");
  check(!!(await p.$(".explain")), "drill: answering shows the explanation");
  await p.click("#flag"); await p.fill("#flagnote", "smoke test"); await p.click("#flagsave");
  const flagged = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem("eaTaxTown.v2")).items).filter(x => x.flag && x.note === "smoke test").length);
  check(flagged === 1, "drill: flag as wrong saves the note");
  check(!!(await p.$(".choice")), "drill: moves on to the next question after flagging");

  /* honest readiness: "I guessed" turns a right answer into a miss; leaving after 3 answers shows a session summary */
  const ci = await p.evaluate(() => drill.perm.indexOf(drill.q.answer)), gid = await p.evaluate(() => drill.q.id);
  await p.click(`.choice >> nth=${ci}`);
  const logN = await p.evaluate(() => JSON.parse(localStorage.getItem("eaTaxTown.v2")).log.length);
  await p.click("#guess");
  const gs = await p.evaluate(id => { const s = JSON.parse(localStorage.getItem("eaTaxTown.v2")); return { it: s.items[id], last: s.log[s.log.length - 1], n: s.log.length }; }, gid);
  check(gs.it.box === 0 && gs.it.right === 0 && gs.it.due - Date.now() < 6 * 60e3 && gs.last.g === 1 && !gs.last.ok && gs.n === logN && !(await p.$("#guess")), "drill: I guessed counts a right answer as a miss");
  await p.click("#next"); await p.click(".choice >> nth=0");
  await p.click("#back");
  check(await p.evaluate(() => !!document.querySelector("#sumgo") && /was a guess, counted as a miss/.test(document.querySelector("#app .card .muted").textContent) && document.querySelectorAll("table.res tbody tr").length >= 1), "drill: leaving after 3 answers shows the session summary");

  /* loss sorter: a linked question's explanation opens the figure in a sheet on that question's case (sess reset so Back goes home, not to the summary) */
  await p.evaluate(() => { sess = null; drill = { q: BANK.find(q => q.id === "p2d1b-023"), reason: "new", perm: [0, 1, 2, 3], picked: null, flagging: false, domain: null, guessed: false }; renderDrill(); });
  await p.click(".choice >> nth=2"); await p.click(".machine[data-fig=loss-sorter]");
  const fig = await (await p.waitForSelector(".figsheet iframe")).contentFrame();
  await fig.waitForSelector("[data-deducted]");
  check(await fig.evaluate(() => document.querySelector("[data-deducted]").textContent === "$18,000" && /^Jo/.test(document.querySelector("[aria-pressed=true]").textContent)), "loss sorter: opens on Jo's case and deducts $18,000");
  await p.click("#figx");
  check(!(await p.$("#scrim")), "loss sorter: Close shuts the sheet");
  /* basis order: Ray's question opens it on his case; stepping to the end shows the $8,000 the bank gives, and the election gives $10,000 */
  await p.evaluate(() => { drill = { q: BANK.find(q => q.id === "p2d1b-024"), reason: "new", perm: [0, 1, 2, 3], picked: null, flagging: false, domain: null, guessed: false }; renderDrill(); });
  await p.click(".choice >> nth=1"); await p.click(".machine[data-fig=basis-order]");
  const bo = await (await p.waitForSelector(".figsheet iframe")).contentFrame();
  await bo.waitForSelector("[data-out=deducted]"); await bo.focus(".iso-stage"); await bo.press(".iso-stage", "End");
  check(await bo.evaluate(() => document.querySelector("[data-out=deducted]").textContent === "$8,000" && document.querySelector("[data-out=suspended]").textContent === "$4,000" && /^Ray$/.test(document.querySelector("[aria-pressed=true]").textContent)), "basis order: opens on Ray's case and deducts $8,000");
  await bo.click("[data-in=election]");
  check(await bo.evaluate(() => document.querySelector("[data-out=deducted]").textContent === "$10,000"), "basis order: the election deducts $10,000");
  await p.click("#figx");

  /* exam sim */
  await p.click("#back"); await p.click("#examgo"); await p.click("#start");
  await p.click(".choice >> nth=1"); await p.click("#endsec"); await p.click("#yes");
  check(!!(await p.$("#resumebrk")), "exam: finishing section 1 gives the break screen");
  await p.click("#resumebrk");
  const run = await p.evaluate(() => JSON.parse(localStorage.getItem("eaTaxTown.v2")).examRun);
  check(run && run.sec === 1 && Object.keys(run.ans).length === 1, "exam: section 2 starts with the answer kept");
  check(run && Array.isArray(run.fresh) && run.fresh.length > 90, "exam: the sim remembers which questions were new");
  await p.click("#endsec"); await p.click("#yes"); await p.click("#resumebrk"); await p.click("#endsec"); await p.click("#yes");
  check(await p.evaluate(() => /never seen/.test((document.querySelector(".fresh") || {}).textContent || "")), "exam: results show the score on never-seen questions");

  /* figures: More lists every figure, and Open shows it in the same sheet the drill uses */
  await p.click("#morebtn");
  check(await p.evaluate(() => document.querySelectorAll("[data-figure]").length === Object.keys(FIGURES).length), "figures: More lists every figure");
  await p.click("[data-figure=basis-order]");
  const mf = await (await p.waitForSelector(".figsheet iframe")).contentFrame();
  await mf.waitForSelector("[data-out=deducted]");
  check(await mf.evaluate(() => document.querySelector("[data-out=deducted]").textContent === "$8,000"), "figures: Open shows the basis order on its first case");
  await p.click("#figx");

  /* backup */
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
