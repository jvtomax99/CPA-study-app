# promo: the how-to video, written in code

A [Remotion](https://www.remotion.dev) 4 project, set up like the Interpreter Hub's `promo/`.
It is not part of the app: nothing in `index.html` loads it. The finished video is
`media/how-to-use.mp4` (with `media/how-to-use.jpg` as its poster), opened by **Watch the guide**
on Home (a one-time card) and in More.

It's a vertical 1080 x 1920 video at 30 fps, about 2 minutes 17 seconds. It opens and closes on
adding the app to the Home Screen, because progress lives only on the device.

## Making it again

From the repo root, after `python3 tools/build.py`:

```
node promo/tools/capture.cjs                     # screenshots of the real app -> promo/public/shots/
python3 promo/tools/voice.py <model folder>      # narration -> promo/public/voice/, promo/src/timing.json
cd promo
npm install
npm run studio                                   # preview, scrub the timeline
npm run render                                   # -> out/how-to-use.mp4
npm run finish                                   # level the voice, compress -> ../media/
```

- **Words:** `src/script.json`. Each scene's lines are spoken and shown as subtitles. After
  changing a line, run `voice.py` again: scene lengths follow the narration.
- **Pictures:** `src/HowTo.tsx` (one `case` per scene: which screenshots, camera moves, taps,
  highlight boxes, all timed from the line starts), `src/Phone.tsx` (the phone, screenshots, taps),
  `src/Mocks.tsx` (simplified drawings of Safari's and Chrome's Add to Home Screen steps; not
  screenshots of iOS or Android).
- **Screenshots:** `tools/capture.cjs` seeds a learner (`tools/seed.cjs`: Part 1 partly built,
  a 7-day streak) and saves each screen at iPhone size (390 x 844 at 2x). Re-run it after a
  visible change to the app. If jsDelivr is blocked, set `THREE_DIR` as for `tools/smoke.js`.
- **Voice:** Kokoro-82M (Apache 2.0), voice `am_michael` at 1.08x speed, run offline. `pip install kokoro-onnx
  soundfile`, then download `kokoro-v1.0.onnx` and `voices-v1.0.bin` from
  https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0 into one folder.
  Acronyms are written spaced out in the script ("E A", "I R S") so it spells them; subtitles
  close them up again.
- **Test stills:** `node tools/stills.mjs 120 900 2400` (frame numbers) writes half-size PNGs to
  `out/stills/`.

In a cloud session, point Remotion at the preinstalled Chromium:

```
export REMOTION_BROWSER=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
```

Licences: Remotion (`node_modules/remotion/LICENSE.md`) is free for individuals, non-profits and
companies of up to three people; other for-profit companies need a company licence. Inter is OFL
(`public/fonts/OFL.txt`). Kokoro's weights are Apache 2.0.
