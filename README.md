# EA Ledger Drill

A study app for the IRS Enrolled Agent exam (SEE), tax year 2025 law, for the July 1, 2026 to February 28, 2027 testing window.

**Live:** https://jvtomax99.github.io/CPA-study-app/

- 600 multiple-choice questions, 200 per part, weighted to the official PSI content outline, each checked against the IRS source it cites
- Spaced-repetition drill, a PSI-style exam sim (100 questions, 3.5 hours, three locked sections), daily goal and streak
- A night Midtown Manhattan in 3D: each content area is a tower on the Times Square canyon that gets finished floor by floor as it's mastered
- Progress is saved in the browser on the device. More > Backup saves and loads a backup file.
- A 2-minute narrated how-to video (`media/how-to-use.mp4`), opened by Watch the guide on Home (once) and in More. It leads with adding the app to the Home Screen, since progress lives only on the device.
- Slow devices switch the town to a lighter mode automatically. Add `?gfx=low` or `?gfx=high` to the URL to force it, or `?fps=1` to show a frame-rate meter.

## Editing

`index.html` is built. Edit the files in `src/`, then run `python3 tools/build.py` from the repo root.

- `src/questions.json`: the question bank
- `src/app.js`: drill, exam sim, progress, backup
- `src/town.js`: the 3D city (three.js 0.160 from jsDelivr)
- `src/mascot.js`: the study buddy on the home card (numbers spiral into him, he springs in, a thought cloud types a pep talk; tap him for another). His picture is `art/mascot.webp`.
- `src/shell.html`: page markup and styles
- `tools/make_reminders.py`: writes the daily-reminder calendar files in `reminders/`
- `tools/make_icons.js`: draws the app icon into `icons/` (used by `manifest.webmanifest`)
- `tools/smoke.js`: headless test of the study buddy, the town, the how-to guide, drill, flagging, exam sim and backup. Run `node tools/smoke.js` after building.
- `promo/`: the Remotion project that makes the how-to video (screenshots, narration, scenes). See `promo/README.md`.
- `docs/`: content outlines and the briefs used to write and fact-check questions. See `docs/HANDOFF.md`.

© 2026 Chris Hidalgo. All rights reserved.
