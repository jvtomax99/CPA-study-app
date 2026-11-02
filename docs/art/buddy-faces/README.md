# Study buddy's faces (source art for art/buddy-face.webp)

Made by Jose in ChatGPT on 2026-11-02 with the prompts in `prompts.md`, editing the original
full-figure render (brownstone stoop, 1024 x 1536) that `art/buddy-bust.webp` was cut from, not
the white `reference.png` the prompts mention. Kept here as head crops (x 150-780, y 40-660 of
the 1024 x 1536 picture), WebP quality 92. Not loaded by the app.

| File | Used for |
|---|---|
| `01-original.webp` | the render itself: what every face is aligned and colour-matched to |
| `02-blink1.webp` | `blink1`, and the right eye alone for `wink1` |
| `03-blink2.webp` | `blink2`, and the right eye alone for `wink2` |
| `04-shut.webp` | `shut`, and the eyes of `laugh1` |
| `05-wink.webp` | `wink` |
| `06-wink-teeth.webp` | asked for as "smile, lips parting" but came back winking: only its mouth is used, for `smile` and `laugh1` |
| `07-laugh.webp` | `laugh` |
| `08-surprised.webp` | `surprised` |
| `09-encourage.webp` | `encourage` (at his size it reads as his normal face) |
| `10-doubt.webp` | `doubt` |
| `11-sleep.webp` | `sleep` |

All sit within half a pixel of the original (no scale or tilt). Colour drifts more with each one
(mean difference outside the face from 5 to 25 of 255, as if each was made from the one before),
which `tools/buddy_face.py` corrects. Missing: the big open smile (prompt 6). To add a face, drop
it here as `NN-name.webp` cut the same way, add it to `SRC` and `FRAMES` in the tool, run
`python3 tools/buddy_face.py`, and copy the window and frame list it prints into `FACE` in
`src/mascot.js`.
