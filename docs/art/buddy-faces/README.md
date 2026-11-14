# Study buddy's faces (source art for art/buddy-bust.webp and art/buddy-face.webp)

The buddy is the grown-up accountant picked on 2026-11-14: round black glasses, brown hair,
stubble, charcoal overcoat over a navy suit, green tie, a pencil tucked behind his ear and the
green calculator held up in one hand (the pose picked later the same day; his other hand is out
of the picture). Everything here was made in Runway (Nano Banana Pro, 2K, 3:4) with the
prompts in `prompts.md`. Not loaded by the app.

`reference.webp` is his picture on white (1792 x 2400). `python3 tools/buddy_bust.py` cuts the
background and scales rows 30 to 2340 to `art/buddy-bust.webp` (360 x 464).

The faces are edits of that picture, kept as head crops (x 448-1344, y 478-1150, which is
exactly the bust's pixels 90-270 across and 90-225 down), WebP quality 92.

| File | Used for |
|---|---|
| `01-original.webp` | the picture itself: what every face is checked and colour-matched against |
| `02-blink1.webp` | `blink1`, and the picture-left eye alone for `wink1` |
| `03-blink2.webp` | `blink2`, and the picture-left eye alone for `wink2` |
| `04-shut.webp` | `shut`, and the eyes of `laugh1` |
| `05-wink.webp` | `wink` (he winks with the eye on the picture's left) |
| `06-smile.webp` | `smile`, and the mouth of `laugh1` |
| `07-laugh.webp` | `laugh` |
| `08-surprised.webp` | `surprised` |
| `09-encourage.webp` | `encourage` |
| `10-doubt.webp` | `doubt` |
| `11-sleep.webp` | `sleep` |

Faces 02 to 08 and 11 were made on this pose and came back on the original with no shift on the
first try. `09-encourage` and `10-doubt` were not made again (the Runway credits ran out): they
are the ones made on the earlier pose, whose head sits in the same place, so
`tools/buddy_face.py` accepts them; make them again on `reference.webp` when there are credits.
Brows and cheeks change in some faces; only the inside of each lens and the mouth are used, so
that doesn't show. Missing: a big open smile (prompt 6 in `prompts.md` was not made) and gaze
frames.

To add a face: make it with the opening in `prompts.md` from `reference.webp`, crop it the same
way, drop it here as `NN-name.webp`, add it to `SRC` and `FRAMES` in `tools/buddy_face.py`, run
`python3 tools/buddy_face.py` (numpy and Pillow), and copy the window and frame list it prints
into `FACE` in `src/mascot.js`. If the bust itself changes, the lens and mouth positions in the
tool and `DISC`, `LINE`, `CALC` and `LCD` in `src/mascot.js` (plus `.buddy-play` and
`.bp-lcd` in `src/shell.html`) are measured on it and must be measured again.
