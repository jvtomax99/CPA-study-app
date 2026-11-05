# EA Ledger Drill

A study app for the IRS Enrolled Agent exam (SEE), tax year 2025 law, for the July 1, 2026 to February 28, 2027 testing window.

**Live:** https://jvtomax99.github.io/CPA-study-app/

- 600 multiple-choice questions, 200 per part, weighted to the official PSI content outline, each checked against the IRS source it cites
- Spaced-repetition drill, a PSI-style exam sim (100 questions, 3.5 hours, three locked sections), daily goal and streak
- Honest readiness: "I guessed" turns a lucky right answer into a miss, a session summary when you leave Drill splits new questions from reviews, and sim results show your score on questions you'd never seen
- A night Midtown Manhattan in 3D: each content area is a tower on Times Square that gets finished floor by floor as it's mastered. The square itself is real, built from OpenStreetMap: Broadway crossing 7th Avenue in the bowtie, One Times Square on its island between 42nd and 43rd, the red steps at 47th, and the real buildings from 40th to 50th Street between 8th and 6th Avenues with their heights and setbacks. Dusk is neon Times Square; Day is an autumn afternoon with tree-lined walk-up streets west of 8th Avenue
- Progress is saved in the browser on the device. More > Backup saves and loads a backup file.
- A 2-minute narrated how-to video (`media/how-to-use.mp4`), opened by Watch the guide on Home (once) and in More. It leads with adding the app to the Home Screen, since progress lives only on the device.
- A launch screen: an El train covered in graffiti rides past three stations, one per part, into the tax town, in eight cut shots, and each station lights up when that part's questions have loaded. It plays on every launch, and More has Replay the intro. `?intro=0` skips it, `?intro=1` plays the ride, `?intro=title` shows Tap to Start. The cars reflect Poly Haven's Dresden Station Night sky (CC0, `art/intro-env.hdr`). The city around it is drawn in code: brick, limestone and glass towers with rooms you can see into behind the windows, setbacks, fire escapes, storefronts, rooftop water tanks, neon signs and traffic.
- Slow devices switch the town to a lighter mode automatically. Add `?gfx=low` or `?gfx=high` to the URL to force it, or `?fps=1` to show a frame-rate meter.

## Editing

`index.html` is built. Edit the files in `src/`, then run `python3 tools/build.py` from the repo root.

- `src/questions.json`: the question bank
- `src/app.js`: drill, session summary, exam sim, progress, backup
- `src/town.js`: the 3D city (three.js 0.160 from jsDelivr)
- `src/tsq-map.json`: the real Times Square the town builds (buildings, plazas, red steps, Broadway's line, in town meters). Made by `python3 tools/tsq_map.py`, which downloads the area from the OpenStreetMap API (or reads a saved `.osm` file given as an argument). Map data © OpenStreetMap contributors, under the Open Database License; the credit is in the page footer.
- `src/mascot.js`: the greeting at the top of Home (drawn night Midtown, your name, a tax quote of the day) and the study buddy in it: numbers spiral into him, he pops out of a gold-coin disc with a ring of numbers behind him, the calculator he holds pops out over the rim with PLAY lit up on its screen, and a thought cloud types a pep talk. Tap him for another; tap the calculator to drill. His picture is `art/buddy-bust.webp`. The name is asked once and can be changed in More.
- `src/shell.html`: page markup and styles
- `src/intro.js`, `src/introart.js` and `src/intro3d.js`: the launch screen. `intro.js` is the overlay (toast, status, progress line, Tap to Start, the side buttons) and the load tracker `window.Boot`; `introart.js` draws the cars' graffiti (hand-built wildstyle letters, no font) and their ends in canvas; `intro3d.js` is the 3D ride (three.js with bloom, light rays, fog, grain). The build puts both ahead of the question bank, and splits the bank into pieces per part so the tracker sees each part arrive.
- `tools/blender/towers.py`: models the study towers in headless Blender, one design per facade style (glass with a sloped lit top, Art Deco limestone with a brass crown and spire, brick with pinnacles and a copper roof, dark glass with a lit steel lattice), and writes `art/tower-*.glb`. Run it with the `bpy` package: `pip install bpy==5.2.3`, then `python tools/blender/towers.py art`. The town fetches the models at start; a style whose model can't load (opened from a local file, or offline) keeps its boxes.
- `tools/make_reminders.py`: writes the daily-reminder calendar files in `reminders/`
- `tools/make_icons.js`: draws the app icon into `icons/` (used by `manifest.webmanifest`)
- `tools/loss-sorter/`: the loss sorter, a drawn machine that sorts a loss through the basis, at-risk, passive and excess business loss limits in order. The drill links to it from the four questions it reproduces. Run `node tools/loss-sorter/build.mjs` to write `art/loss-sorter.html`, and `node tools/loss-sorter/test.mjs` to check its cases against the bank. Its drawing kit is from [Anatomy](https://github.com/wheresryan22/anatomy) (MIT).
- `tools/basis-order/`: the basis order, a drawn figure that steps S corporation stock and debt basis through one year in the order Form 7203 applies it: income, distributions, nondeductible expenses, losses (or losses first with the Reg. 1.1367-1(g) election), then debt basis restoration. The drill links to it from p2d1b-023 and p2d1b-024, and More lists both figures under Figures. Run `node tools/basis-order/build.mjs` to write `art/basis-order.html`, and `node tools/basis-order/test.mjs` to check its cases against the bank. It uses the loss sorter's copy of the Anatomy kit.
- `tools/abbrev.py`: checks that every question spells out an abbreviation the first time it uses it. `--fix` rewrites `src/questions.json` with the terms spelled out.
- `tools/smoke.js`: headless test of the launch screen, the greeting and study buddy, the town, the how-to guide, drill, flagging, "I guessed", the session summary, exam sim and backup. Run `node tools/smoke.js` after building.
- `promo/`: the Remotion project that makes the how-to video (screenshots, narration, scenes). See `promo/README.md`.
- `docs/`: content outlines and the briefs used to write and fact-check questions. See `docs/HANDOFF.md`.

© 2026 Chris Hidalgo. All rights reserved.
