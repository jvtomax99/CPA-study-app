# Handoff: launch film, sound and grown-up study buddy

Written 2026-11-14 at the end of a long session. Read this first, then
`docs/ARCHITECTURE.md`.

## Goal

A cinematic New York launch screen for phones and a more grown-up study buddy.
Both are live.

## Done (all merged and live, pull requests #63 to #67)

- **Launch film for phones** (`media/intro-phone.mp4`, 13.6 s, 1080x1920, silent).
  It was cut from Runway footage by `tools`-less scripts in the session scratchpad.
  The cut and its timings are listed in DESIGN.md, Launch screen.
  - Tap to Start holds on the last frame. The title ABOVE THE LINE shows over the
    mural and on that frame.
  - The 3D ride is the fallback: landscape, reduced motion, `?ride=3d`, or a film
    that can't load.
- **Sound** is recorded (ElevenLabs).
  - `media/intro-sfx.mp3` holds the effects, cut to the film.
  - `media/intro-music.mp3` is a ten-bar beat that loops without a gap under
    Tap to Start.
  - `media/intro-go.mp3` is the rush into the tunnel on tap.
  - Playback is Web Audio, in `src/intro.js` (FSND).
- **Waiting for a touch**: browsers block sound before a touch. With Sound on:
  - The app first asks for sound without a touch.
  - Where that's refused (every iPhone), the film waits behind
    `media/intro-wait.webp` (the buddy on a graffiti wall) with "Tap to play".
  - A film that stalls for 2.5 s goes to Tap to Start.
- **Tap to Start** rushes into the tunnel: a CSS scale plus a burst of light.
- **Study buddy**: grown-up accountant, pencil behind his ear, calculator in one
  hand. The art is in `art/buddy-bust.webp` and `art/buddy-face.webp`; the sources
  and prompts are in `docs/art/buddy-faces/`.

## Left / open

- `art/intro-plate/phone*.webp` (13 files, about 800 KB) are unused. Delete them
  only once Jose says yes.
- The how-to video (`media/how-to-use.mp4`, `promo/`) still shows the old kid
  buddy.
- The buddy painted on the train in the film has no pencil behind his ear. Fixing
  that needs a new render, which needs credits.
- The buddy's encourage and doubt faces are from an earlier bust. The app doesn't
  use them yet.
- Credits: Runway has 2 left, and Jose doesn't want to spend more for now.
  ElevenLabs is billed separately; its balance can't be read from the session.

## Next step

Jose checked it on his iPhone: edges and sound are right. The film was re-encoded from 5.6 MB to 4.6 MB (two-pass x264 at 2.7 Mbps, no visible change). Next: whichever leftover Jose picks.

## Files to read first

`src/intro.js` (film player, sound, wait card), the launch rules in
`src/shell.html` (`.in-film`, `.in-wait`, `.in-title`, flare), and DESIGN.md,
Launch screen.
