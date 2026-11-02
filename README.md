# EA Ledger Drill

A study app for the IRS Enrolled Agent exam (SEE), tax year 2025 law, for the July 1, 2026 to February 28, 2027 testing window.

**Live:** https://jvtomax99.github.io/CPA-study-app/

- 600 multiple-choice questions, 200 per part, weighted to the official PSI content outline, each checked against the IRS source it cites
- Spaced-repetition drill, a PSI-style exam sim (100 questions, 3.5 hours, three locked sections), daily goal and streak
- A 3D Midtown Manhattan with Times Square at the center: each content area is a building that gets painted as it's mastered
- Progress is saved in the browser on the device. More > Backup saves and loads a backup file.
- Slow devices switch the town to a lighter mode automatically. Add `?gfx=low` or `?gfx=high` to the URL to force it, or `?fps=1` to show a frame-rate meter.

## Editing

`index.html` is built. Edit the files in `src/`, then run `python3 tools/build.py` from the repo root.

- `src/questions.json`: the question bank
- `src/app.js`: drill, exam sim, progress, backup
- `src/town.js`: the 3D city (three.js 0.160 from jsDelivr)
- `src/shell.html`: page markup and styles
- `tools/smoke.js`: headless test of the town, drill, flagging, exam sim and backup. Run `node tools/smoke.js` after building.
- `docs/`: content outlines and the briefs used to write and fact-check questions. See `docs/HANDOFF.md`.
