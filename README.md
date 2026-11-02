# EA Ledger Drill

A study app for the IRS Enrolled Agent exam (SEE), tax year 2025 law, for the July 1, 2026 to February 28, 2027 testing window.

**Live:** https://jvtomax99.github.io/CPA-study-app/

- 600 multiple-choice questions, 200 per part, weighted to the official PSI content outline, each checked against the IRS source it cites
- Spaced-repetition drill, a PSI-style exam sim (100 questions, 3.5 hours, three locked sections), daily goal and streak
- Honest readiness: "I guessed" turns a lucky right answer into a miss, a session summary when you leave Drill splits new questions from reviews, and sim results show your score on questions you'd never seen
- A night Midtown Manhattan in 3D: each content area is a tower on the Times Square canyon that gets finished floor by floor as it's mastered. Dusk is neon Times Square; Day is an autumn afternoon with tree-lined walk-up streets west of the canyon
- Progress is saved in the browser on the device. More > Backup saves and loads a backup file.
- Slow devices switch the town to a lighter mode automatically. Add `?gfx=low` or `?gfx=high` to the URL to force it, or `?fps=1` to show a frame-rate meter.

## Editing

`index.html` is built. Edit the files in `src/`, then run `python3 tools/build.py` from the repo root.

- `src/questions.json`: the question bank
- `src/app.js`: drill, session summary, exam sim, progress, backup
- `src/town.js`: the 3D city (three.js 0.160 from jsDelivr)
- `src/mascot.js`: the greeting at the top of Home (drawn night Midtown, your name, a tax quote of the day) and the study buddy in it: numbers spiral into him, he pops out of a gold-coin disc with a ring of numbers behind him, the calculator he holds pops out over the rim with PLAY lit up on its screen, and a thought cloud types a pep talk. Tap him for another; tap the calculator to drill. His picture is `art/buddy-bust.webp`. The name is asked once and can be changed in More.
- `src/shell.html`: page markup and styles
- `tools/blender/towers.py`: models the study towers in headless Blender, one design per facade style (glass with a sloped lit top, Art Deco limestone with a brass crown and spire, brick with pinnacles and a copper roof, dark glass with a lit steel lattice), and writes `art/tower-*.glb`. Run it with the `bpy` package: `pip install bpy==5.2.3`, then `python tools/blender/towers.py art`. The town fetches the models at start; a style whose model can't load (opened from a local file, or offline) keeps its boxes.
- `tools/make_reminders.py`: writes the daily-reminder calendar files in `reminders/`
- `tools/make_icons.js`: draws the app icon into `icons/` (used by `manifest.webmanifest`)
- `tools/loss-sorter/`: the loss sorter, a drawn machine that sorts a loss through the basis, at-risk, passive and excess business loss limits in order. The drill links to it from the four questions it reproduces. Run `node tools/loss-sorter/build.mjs` to write `art/loss-sorter.html`, and `node tools/loss-sorter/test.mjs` to check its cases against the bank. Its drawing kit is from [Anatomy](https://github.com/wheresryan22/anatomy) (MIT).
- `tools/smoke.js`: headless test of the greeting and study buddy, the town, drill, flagging, "I guessed", the session summary, exam sim and backup. Run `node tools/smoke.js` after building.
- `docs/`: content outlines and the briefs used to write and fact-check questions. See `docs/HANDOFF.md`.

© 2026 Chris Hidalgo. All rights reserved.
