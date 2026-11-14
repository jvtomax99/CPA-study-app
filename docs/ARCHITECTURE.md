# Architecture: Above the Line

Read this at the start of a session instead of exploring the code. Line counts are
`wc -l` on 2026-11-10; they drift, so re-measure before quoting one.

## How it ships

Static site on GitHub Pages from `main` (root folder). No server, no accounts.
`index.html` is built: edit `src/`, run `python3 tools/build.py` from the repo root,
commit both. three.js 0.160.0 loads from jsDelivr through an importmap in the head.

## Main folders

- `src/`: everything the page is built from.
- `tools/`: the build, data and art scripts, and the smoke test.
- `art/`: built figures, tower models (`tower-*.glb`), buddy art, the intro plate,
  the HDR sky.
- `media/`: the how-to video and its still, and the launch film for phones
  (`intro-phone.mp4`, its first and last frames, the tower cut-out, and its
  sound: `intro-sfx.mp3`, `intro-music.mp3`, `intro-go.mp3`). `icons/` and `manifest.webmanifest`:
  the Home Screen app.
- `reminders/`: 38 calendar files, one per half hour, 5:00 AM to 11:30 PM.
- `preview/canyon.html` (674): standalone 3D look sandbox.
- `promo/`: the Remotion project that makes the how-to video. Not part of the page.
- `docs/`: content outlines, writer and checker briefs, drafts, art sources, older
  notes (`HANDOFF.md`), and the rules files.

## Key files

| File | Lines | What |
|---|---|---|
| `index.html` | 5,193 | Built page (1.6 MB). Never edit by hand |
| `src/questions.json` | 18,146 | The bank: 972 questions |
| `src/app.js` | 1,039 | Banks per mode, state, drill, summaries, exam sim, More, backup |
| `src/town.js` | 1,330 | The 3D city (`window.Town`), a module script |
| `src/tsq-map.json` | 1 (74 KB) | The real Times Square, made by `tools/tsq_map.py` |
| `src/shell.html` | 756 | Page markup and styles, tab bar |
| `src/mascot.js` | 572 | Greeting and study buddy (`Mascot`) |
| `src/intro.js` | 349 | Launch overlay, load tracker (`window.Boot`) and the film player for phones |
| `src/intro3d.js` | 860 | The 3D train ride (landscape screens, and when the film can't start) |
| `src/introart.js` | 202 | Graffiti on the cars, in canvas |
| `src/introaudio.js` | 192 | Launch sound and beat, Web Audio |
| `tools/build.py` | 58 | Builds `index.html` from `src/` |
| `tools/smoke.js` | 190 | Headless test; run after building |
| `tools/tsq_map.py` | 113 | OpenStreetMap download to `src/tsq-map.json` |
| `tools/abbrev.py` | 262 | Checks abbreviations are spelled out (`--fix`) |
| `tools/blender/towers.py` | 237 | Tower models (`pip install bpy==5.2.3`) |
| `tools/blender/intro_plate.py` | 536 | The Tap to Start render |
| `tools/intro_plate.py` | 92 | Downloads and runs the plate render (into `build/`) |
| `tools/buddy_face.py` | 126 | Builds `art/buddy-face.webp` |
| `tools/buddy_bust.py` | 32 | Builds `art/buddy-bust.webp` from `docs/art/buddy-faces/reference.webp` |
| `tools/make_reminders.py` | 57 | Writes `reminders/` |
| `tools/make_icons.js` | 34 | Draws `icons/` |
| `DESIGN.md` | 332 | The look: colors, type, radius, shadows, motion |

## How data moves

1. **Question bank.** `tools/build.py` splits `src/questions.json` into script
   pieces of about 100 KB in four groups (EA parts 1, 2, 3, then CPA-only). Each
   piece pushes onto `window.__bank` and calls `Boot.set`, so the launch screen
   lights a station when its part arrives. `app.js` rebuilds the bank in file order,
   then makes `EA_BANK`, `REG_BANK`, `TCP_BANK`, `AUD_BANK`, `FAR_BANK` and
   `CPA_BANK`. `useExam()` swaps `BANK`, `DOMAINS`, `PARTS` and `byId`.
2. **Progress.** One state object in localStorage under `eaTaxTown.v2` (items by
   question id, answer log, part, goal, exams, the running exam, exam dates,
   reminder time, name). The older key `eaLedgerDrill.v1` is read once if there is
   no state. A backup file is this state.
3. **Other localStorage keys.** `eaTaxTown.gfx` (town graphics level, kept 7 days),
   `eaTaxTown.sound`, `eaTaxTown.music`, `eaTaxTown.introProg`. `shell.html` removes
   the old `eaTaxTown.intro` at start.
4. **3D city.** `app.js` drives `window.Town`: `mount`, `update` (mode, mastery per
   area, reviews due, part), `highlight`, `setSky`, `setView`, `fullscreen`,
   `unmount`. The map comes from `tools/tsq_map.py` to `src/tsq-map.json`, which
   `build.py` inlines into `town.js` as `TSQ`. Tower models are fetched from
   `art/` at start; a style whose model fails keeps plain boxes.
5. **Figures.** `node tools/loss-sorter/build.mjs` and `tools/basis-order/build.mjs`
   write `art/loss-sorter.html` and `art/basis-order.html`; each has a `test.mjs`
   that checks its cases against the bank. The drill links to them.
6. **Questions are made** from `docs/writer-brief*.md` and checked with
   `docs/checker-brief*.md`, against `docs/outline-part1.md` and
   `docs/outline-part23.md`.
