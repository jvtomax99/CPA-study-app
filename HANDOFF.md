# Handoff: Japanese interface and Japanese how-to video

Written 2026-11-16. Read this first, then `docs/ARCHITECTURE.md` (item 7, Interface language).

## Goal

Jose's Japanese friend studies with the app and sits the exam in the US, in English. Menus, buttons and
the study buddy in Japanese; every question, choice and explanation stays English; the how-to video in Japanese.

## Done (branch `claude/wonderful-fermat-fzjo8a`, waiting for Jose's push)

- `src/i18n.js` (`t()`, `tn()`, `LANG`) and `src/i18n-ja.js` (360 texts). More > Language · 言語; a phone set
  to Japanese starts in Japanese. `python3 tools/i18n_check.py` (in CI) fails on a text with no Japanese.
- `docs/ja-strings.md`: English and Japanese side by side, for the friend to read through.
- `media/how-to-use-ja.mp4` (3 min 58 s, 22 MB) and its poster: ElevenLabs voice "Sarah", Japanese
  subtitles and headlines, screenshots of the Japanese app. How to make it again: `promo/README.md`.
- `promo/tools/capture.cjs` now serves the app over http (from a file the 3D engine is blocked since 11-15).
- Reviewer subagent: no script errors, English byte-identical apart from the new Language card.

## Left

- The friend should read `docs/ja-strings.md` and watch the video; fixes are one line each in `src/i18n-ja.js`.
- The Japanese video is 22 MB, over the 5 MB flag line (the English one is 18 MB). It isn't kept offline.
- Later (SPEC): Japanese explanations; the 3D town's live screens are English in Japanese mode.

## Still open from the launch-film session (2026-11-14)

- `art/intro-plate/phone*.webp` (13 files, about 800 KB) are unused. Delete them
  only once Jose says yes.
- The how-to video (`media/how-to-use.mp4`) is 18 MB, over the 5 MB flag line.
  It was re-rendered on 2026-11-14 with the grown-up buddy and the launch film.
- The buddy painted on the train in the film has no pencil behind his ear. Fixing
  that needs a new render, which needs credits.
- The buddy's encourage and doubt faces are from an earlier bust. The app doesn't
  use them yet.
- Credits: Runway has 2 left, and Jose doesn't want to spend more for now.
  ElevenLabs is billed separately; its balance can't be read from the session.

## Next step

Jose's push. Then the friend's review of the wording.
