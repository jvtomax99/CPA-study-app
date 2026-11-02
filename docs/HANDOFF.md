# Handoff: EA Ledger Drill

**Working on now:** realistic night Midtown redesign of the 3D town. Step 1 (a standalone preview) is built; waiting for Jose to approve the look before it replaces the live town.
- Preview: `preview/canyon.html` (self-contained, open directly; also published as a private Claude artifact). URL params: `view=canyon|aerial|tower`, `sky=day`, `m=0..100` (study tower mastery), `gfx=low`.
- Approach (agreed): everything built in code, no Google 3D tiles (can't paint per floor, needs billing key, online only) and no downloaded models. Real proportions in meters, north is -z, Times Square canyon along x = 0.
- Facade shader draws every window per pixel from world position (styles: glass curtain wall, stone, prewar brick, dark glass, construction frame), so ~10,000 tower blocks are one instanced draw. Lit windows only at night (`uNight`), street uplight gradient on walls.
- Ground shader: streets, plaza, crosswalks, park, streetlight pools and moving traffic light streams. Screens: one 2048 atlas, every panel scrolls in its own way in one draw, plus fake wet-street reflections. Bloom via EffectComposer (off in low mode).
- Study towers become real towers: finished cladding below the cut, bare concrete frame with work lights, orange netting, crane and hoist above; gold lit crown at 100%.
- About 55 to 70 draw calls total. Not yet tried on a real phone.
- Next if approved: port into src/town.js (needs an importmap in shell.html for the addons), place all 13 study towers with clear camera views, keep labels/tap-to-drill/cars-as-reviews/fireworks/day-dusk, re-run tools/smoke.js.

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
