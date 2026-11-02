# Handoff: EA Ledger Drill

**Working on now:** night Midtown 3D town, ported into the app and committed; waiting for Jose's push. Not yet tried on a real phone.
- `src/town.js` was rewritten; its interface for app.js is unchanged (mount, unmount, update, highlight, setSky, setView, celebrate, labels, tap-to-drill). three.js addons load through an importmap that `tools/build.py` puts in the page head.
- Layout (meters, north is -z, the Times Square canyon runs along x = 0): the 13 study towers line the canyon walls in 44 m deep lots. Part 1 = the two north blocks, Part 2 = the middle block, Part 3 = the block before the screen tower. Each part's camera looks down the open canyon at an angle so no building blocks its towers and the labels spread out.
- A study tower is finished cladding below the cut and a bare concrete frame (work lights) above, with orange netting, a hoist and, for the current part, a crane. 100% lights a gold crown and fires fireworks. Tower height scales with the area's exam weight.
- Facade shader draws every window per pixel (about 10,000 tower blocks in one instanced draw); ground shader does streets, plaza, park, streetlight pools and traffic streams; screens are one scrolling atlas plus five live-number canvases; bloom via EffectComposer, off in low mode. Cabs on the avenue = reviews due (up to 30).
- Dusk is now the default sky (app.js skyNow); the Day button still switches. Legend text on the home screen was rewritten for towers.
- About 140 to 170 draw calls (old town about 320 after the speed-up, 1,750 before it).
- `preview/canyon.html` is the standalone look preview (URL params view, sky, m, gfx); keep it as a sandbox for visual tweaks.
- Test: `node tools/smoke.js`; `THREE_DIR` now points at the three@0.160.0 package folder (build/ and examples/), not build/.

**Before that:** 3D town performance pass, committed and waiting for Jose's push. Not yet tried on a real phone.
- Draw calls per frame went from about 1,750 to about 320. Static meshes are merged into one mesh per material (`mergeStatic` in town.js), and `mat()` reuses materials with the same color, roughness and metalness.
- The shadow map is redrawn only when the sun or camera moves, the paint moves or the view changes. Moving things (cars, bus, walkers, pigeons, crane jibs, flags) no longer cast shadows.
- Phones (coarse pointer) render at most 1.5x pixel density, down from 2x.
- Auto low mode: if the town averages under about 36 fps for 3 seconds, it hides the crowd, steam, art panels and pigeons, drops to 1x pixels and 30 fps, and remembers that for 7 days (localStorage `eaTaxTown.gfx`). `?gfx=low` or `?gfx=high` forces a level (`high` also clears the saved one). `?fps=1` shows an on-screen meter (fps, draws, level, pixel ratio) for checking a real phone.
- Test: `node tools/smoke.js` after building (town draw budget, 3D tap, drill, flagging, exam sim, backup). In a sandbox that blocks jsDelivr, set `THREE_DIR` to a local three@0.160.0 build folder.

**Before that:**
- Backup file buttons (Save/Load backup file in More, plus a home-screen reminder after 7 days without a backup).
- Question bank grew from 69 to 600 (200 per part). Every batch was written by one agent and fact-checked by a separate one against primary IRS sources; fixes are already applied.
- The 3D town became Midtown Manhattan: Times Square canyon (north-west block), screen walls, screen tower, theater marquee, red steps, yellow cabs, water towers, dusk mode, fireworks on finishing a building, "Times Sq" camera view.
- Hosting: GitHub Pages from `main` (repo is public). Vercel was considered and skipped; switch only if adding server features (online sync, AI help).

**Decided and pending:**
- Full online sync was discussed (own Firebase project, separate from the Interpreter Hub's). Jose picked backup files instead for now.
- Not proven: performance on a real phone. Open the live site with `?fps=1` on the phone and read the meter. Auto low mode already cuts the crowd, steam and art panels on slow devices.
- The bank tests 2025 law. The next SEE window (about July 2027) tests 2026 law; dollar figures will need a refresh.

**How questions are made:** `docs/writer-brief*.md` and `docs/checker-brief*.md`, with `docs/outline-part1.md` and `docs/outline-part23.md`.
