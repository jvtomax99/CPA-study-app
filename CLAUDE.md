# CLAUDE.md: Above the Line

A study app for the IRS Enrolled Agent exam (SEE, tax year 2025 law) with a
CPA mode for the REG, FAR, TCP and AUD sections: drill with spaced
repetition, a PSI-style exam sim, and a 3D night Times Square whose towers
grow as you master each area. Live at
https://jvtomax99.github.io/CPA-study-app/.

Read first: `SPEC.md` (what, who, phases; gaps marked TO FILL for Jose),
`docs/ARCHITECTURE.md` (map of files and how data moves), `DESIGN.md`
(look). The rules shared by all of Jose's projects are in
`.claude/rules/general.md`; where this file differs, this file wins.

## Rules for this repo

- **`index.html` is built.** Never edit it by hand. Edit `src/`, run
  `python3 tools/build.py` from the repo root, and commit both.
- **Checks.** `node .github/site-check.cjs` with the pages listed in
  `.github/workflows/site-check.yml`; it also runs on every pull request and
  must be green before asking Jose to push. A new page goes into that list.
  `node tools/smoke.js` after building is the headless test, but it fails on
  `main` today because software WebGL is slow (`docs/HANDOFF.md`).
- **Every question is checked against the source it cites**, using the
  writer and checker briefs in `docs/`.
- **Public repo.** AICPA blueprint text and owner uploads never go in it.
  Paid raw files (fonts, models) can't be committed either
  (`docs/assets.md`, section 9); before any purchase ask Jose: free assets,
  or GitHub Pro or a move to Vercel so the repo can go private.
- **Design tokens.** Don't add a color, font size, weight, radius or shadow
  without adding it to `DESIGN.md` in the same pull request.
- **Real user.** Not written down; the copyright line names Chris Hidalgo.
  Ask Jose who studies with it and put the answer in `SPEC.md`.
- **Progress lives only in the browser** (More > Backup saves a file), so a
  change to the stored state must still read old saves.

## Preview and going live

- **Preview.** There are no branch previews, and merging to `main` is going
  live. Build `index.html`, then send Playwright screenshots at phone width
  and desktop plus a short "try this" list.
- **On Jose's "push":** open the pull request if it isn't open and merge it
  yourself; don't ask a second time. Wait for the Pages deploy, then send a
  phone notification that it is live, naming the change, even if he's in the
  chat. If the deploy fails, notify him of that instead.
- **Handoffs.** New ones go in root `HANDOFF.md`. `docs/HANDOFF.md` is an
  older running log; read it for history and leave it as it is.

## Extras Jose asked for here

- End every reply with a line starting "You need to:" saying what Jose has
  to do (approve a push, answer a question, reload the app). If nothing:
  "You need to: nothing."
- A push that needs his approval is a clickable button, not only text.
- UI or design options: mock up every option on a scratch copy of the app
  (never the repo), render them with Playwright and send the screenshots
  with the suggestions before he chooses.
- UI changes (`index.html`, `src/`, `art/`, `preview/`): send before and
  after screenshots.
- Environment settings: exact values in a code block, one entry per line,
  plus where to paste them.
- Ask with a button before adding a program, plugin, connector, browser
  extension or allowed domain. Once approved, install it yourself if you
  can; if only Jose can, give him the exact steps.

## Tools

- **Taste skill** (`.claude/skills/taste/`): it asks for the Playwright MCP
  server. In a cloud session use the installed Playwright instead and run
  its `references/extract.js` with `page.evaluate`.
- **Refactor.** `docs/refactor.md`, run when Jose asks for "Refactor:
  CLEANUP.md items ...".
