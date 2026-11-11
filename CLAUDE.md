# CLAUDE.md

## This project

**Above the Line**: a study app for the IRS Enrolled Agent exam (SEE, tax year 2025 law) with a CPA mode for the REG, FAR, TCP and AUD sections. Drill with spaced repetition, a PSI-style exam sim, a 3D night Times Square whose towers grow as you master each area.

- **Live:** https://jvtomax99.github.io/CPA-study-app/ (GitHub Pages, served from `main`).
- Progress is saved only in the browser on the device (More > Backup saves a file).
- `index.html` is built. Never edit it by hand: edit `src/`, then run `python3 tools/build.py` from the repo root.
- `src/`: `questions.json` (the bank), `app.js` (drill, sim, progress, backup), `town.js` (the 3D city, three.js 0.160 from jsDelivr), `tsq-map.json` (real Times Square from OpenStreetMap, made by `tools/tsq_map.py`), `mascot.js` (greeting and study buddy), `shell.html` (markup and styles), `intro*.js` (the launch screen).
- `art/`: images, tower models (`tower-*.glb` from `tools/blender/towers.py`), the loss sorter and basis order figures. `preview/`: draft pages.
- `tools/`: the build, `smoke.js` (headless test; run `node tools/smoke.js` after building), `abbrev.py` (spells out abbreviations in the bank), icon, reminder and figure builders. `promo/`: the Remotion project for the how-to video.
- `docs/`: content outlines and the writer and checker briefs used to write and fact-check questions (one pair per section).
- Every question is checked against the source it cites. AICPA blueprint text and owner uploads never go in the repo (it is public).
- `tools/smoke.js` currently fails on main (software WebGL is slow; see `docs/HANDOFF.md`).

**Design:** follow DESIGN.md for colors, type, corner radius, shadows, motion and components. Don't add a new color, font size, weight, radius or shadow without adding it there. When a change adds or changes a token or a component, update DESIGN.md in the same pull request.

## This project: how the general rules apply here

- **Hosting:** GitHub Pages from `main`, no branch previews. Merging to `main` is going live. So the "preview" here is Playwright screenshots at phone width plus desktop, sent as files, and a short "try this" list. Build `index.html` before taking them.
- **After merging:** wait for the Pages deploy, then tell Jose and send a phone notification that it is live, naming the change, even if he's in the chat. If the deploy fails, notify him of that instead.
- **Real user:** not written down. The copyright line names Chris Hidalgo. Ask Jose who studies with it and put the answer in SPEC.md.
- **Plan and phases:** SPEC.md (drafted from the code on 2026-11-10, gaps marked TO FILL for Jose) holds the Phases list, including the Times Square plan from `docs/HANDOFF.md` (1 map, 2 cars, 3 people, 4 color).
- **Handoffs:** new handoffs go in `HANDOFF.md` at the repo root. `docs/HANDOFF.md` is older notes (a long running log of what shipped, sources and network setup). Leave it as it is; read it for history.
- **Extras Jose asked for here, kept:**
  - End every reply with what Jose has to do, in a line starting "You need to:" (approve a push, answer a question, reload the app, and so on). If there's nothing, write "You need to: nothing."
  - When Jose needs to approve a push, give it as a clickable button, not only as text.
  - Always clickable suggestions (Jose, 2026-11-11): every question or next step goes out as buttons, recommended first, never only as text.
  - Links and domains to paste: all of them in one code block, one per line, never split into several blocks (Jose, 2026-11-11).
  - UI or design options: mock up every option before he chooses, on a scratch copy of the app (never the repo), render them with Playwright and send the screenshots with the suggestions.
  - UI changes (`index.html`, `src/`, `art/`, `preview/`): send before and after screenshots rendered with Playwright.
  - Environment settings: exact values in a code block, one entry per line, plus where to paste them.
  - Ask with a clickable button before adding a tool that isn't a project package (program, plugin, connector, browser extension or allowed domain). Once approved, install it yourself if you can; if only Jose can, give him the exact steps.

### Old rules settled (Jose, 2026-11-10)

The general rules win: no diff before every edit, Claude commits and pushes its own branch without asking, and project packages install without asking. Kept from the old rules: on Jose's "push", open the pull request (if not open yet) and merge it yourself; don't ask a second time.

- **Public repo, paid assets.** The repo is public (checked 2026-11-10) and GitHub Pages on a free plan needs it public, so paid raw files (fonts, models) can't be committed here (docs/assets.md, section 9). Before any purchase, ask Jose: keep to free assets, or GitHub Pro / a move to Vercel so the repo can go private.
- **Taste skill.** Saved in `.claude/skills/taste/` (Senlin's, MIT; `SOURCE.md` there says where from). It asks for the Playwright MCP server; in a cloud session use the Playwright already installed instead (run its `references/extract.js` with `page.evaluate`).
- **Refactor prompt.** docs/refactor.md, run when Jose asks for "Refactor: CLEANUP.md items ...".
- **Site check.** Every pull request runs `.github/site-check.cjs` on GitHub ("Site check": missing files, links starting with "/", script errors at phone and desktop width). It must be green before asking Jose to push. Run it locally with `node .github/site-check.cjs` and the pages listed in `.github/workflows/site-check.yml`. A new page goes into that list.

# General rules (all of Jose's website projects)

Same in every project. Where the "This project" section above differs, it wins.

## Planning

- **Challenge me.** Question my ideas; no sugarcoating. Say plainly when a plan is bad, why, and what's better; name the biggest risk I'm missing. Skip small stuff. Once I've decided after hearing you out, build it my way.
- **SPEC.md** (repo root): what it does and who for (if not me, who and what they need); one or two "Done when" lines per feature; "Not in v1"; "Later"; "Phases" (build order, a checkbox list per phase, each phase one or two sessions; check it off when done and verified). New project: write it with me before any code. Existing project without one: draft it from the code, then ask me to fill the gaps and "Not in v1". Keep it current. If I ask for something not in it or on "Not in v1", say so and ask: now, or "Later"?
- **Cleanup check.** After a phase is checked off, read "Last audit" at the top of docs/CLEANUP.md. If 3 phases have been completed since then, or it's been over 30 days, or the file is missing, offer docs/cleanup-audit.md with buttons: "Run it now" (recommended), "Next session", "Skip this time". If cleanup-audit.md is missing, ask me for the prompt and save it there.
- **docs/ARCHITECTURE.md**: short and current (main folders, key files, how data moves). Read it at session start instead of exploring; update it when the structure changes.
- **Big feature** = a new page or screen, a new kind of stored data, or a new outside service. Everything else is small.
- **Big features and new projects:** first look at 2 or 3 similar tools and tell me in a few lines how they do it and where mine can be better (new ideas go to "Later" unless I approve). Before any coding, use plan mode: what you'll build and how, in plain words, with assumptions listed separately; wait for my OK. Whenever I correct you, update SPEC.md. In a scheduled or background run, do small changes only and leave the plan. If the real user isn't me, remind me to check the plan with them.

## Proof and reporting

- **Show me it works.** I can't check code, so every feature ends with proof I can see. Never say "fixed", "works" or "done" without running or testing it; say what you checked, or "not verified" and why. Small change: a screenshot or a short "try this" list. Big feature: check its "Done when" line and give me the link to a preview I can open on my phone (what a preview is here: "This project").
- **Review before the pull request.** After a phase or big feature, and before opening its pull request, a separate reviewer subagent checks the changes for bugs, broken behavior and mismatches with SPEC.md, without seeing how the code was written. Fix what it finds; tell me in 2 or 3 lines what it caught.
- **Reports:** status updates extremely concise, fragments fine. Explanations in plain full sentences. After a meaningful change, 2 or 3 plain sentences on what changed and why.
- **Ask first** before: deleting data or files I may need, changing logins or accounts, pushing to main, deploying to the live site, anything that costs money.

## Usage

- **Keep the session light.** Read only the parts of files you need. Show me only the lines of logs and test output that matter. Big searches and many-file reads go to a subagent so only its summary comes back.
- **Helpers.** Haiku subagents for repetitive work (searching, test results, summaries, checklists). Planning, decisions and code changes stay on the main model; check helpers' results before relying on them.
- **New session triggers** (tokens or share of context, whichever first; a new session costs 20k to 40k to catch up): under 150k or 50%, keep going. 150k to 300k or 50% to 75%, finish the step, then hand off. Over 300k or 75%, hand off now, even mid-task. Over 100k and the next task is unrelated: hand off. Over 100k and I tell you I've been away over an hour: hand off. Ask once with buttons, "Start a new session" (recommended) and "Keep going"; if I keep going, don't ask again until the next trigger. If I say keep going past 75%, warn me once and write HANDOFF.md anyway (auto-compact is off, so a full session just stops).
- **HANDOFF.md** (repo root, short, pointing to what exists): the goal and exact next step; what's done (commits) and what's left; this session's decisions (also added to SPEC.md); files to look at first. Overwrite it each time; in a cloud session commit and push it on the current branch. At session start, if it exists, read it first and confirm the next step with me. Delete it once its work is done (phase checked off, pull request opened).
- **Effort.** No ultracode or max effort unless I ask.
- **Keep CLAUDE.md lean.** Suggest a one-line addition for a lasting decision; remove lines that no longer apply. Keep it short: it loads every session.

## Environment and installs

- **Settings to save** (API key, environment variable, setup step): one copy-and-paste block in the format that place expects, plus one line saying exactly where to paste it. Secrets I hold: YOUR_VALUE_HERE. Never put secrets in code or commit them.
- **Ask first, with buttons** (recommended first, plus Skip), before installing anything that changes my computer, costs money, needs an account or connects to my apps (plugins, MCP servers, connectors, system programs). Say what it is and why it helps. On yes, install it yourself and check it works. Don't ask about what's installed already. In a scheduled or background run, skip it and tell me what you skipped and why.
- **Project packages:** install without asking, mention them, and add them to the package list (package.json, requirements.txt) so one command restores everything.
- **Making installs stick:** the environment's setup script runs the project's install command; for system tools outside the project, give me the copy-and-paste line to add to it.

## Git and GitHub

- **Branches.** Never commit to main. One branch per feature or fix with a plain name (add-quiz-scores). Pull the latest main and check for uncommitted work first. (A cloud session handed a branch name uses it.)
- **Commits.** Small steps, plain-English messages ("Add score screen after practice quiz"). Never commit secrets, keys or .env files; keep them in .gitignore.
- **Pushing.** A feature branch: push freely. Into main: (1) a pull request with a short plain summary, the "Done when" check and the preview link (or screenshots where there are no previews); (2) a phone notification naming the change and saying it needs my "push" (if you can't notify, put that at the very top of your message); (3) wait for my OK before merging.
- **Never without asking** (if I ask for one, first explain what it will do and what can't be undone): force push; deleting a branch with work not in main; rewriting or resetting history (git reset --hard, rebase on main); changing repo settings (like making a repo public).
- **Big files.** GitHub rejects files over 100 MB: warn me before committing one and suggest compressing it or Git LFS.
- **Undo.** After a merge, one line on how to undo it if it breaks the live site.

## Assets and design

- **Assets** (models, textures, icons, fonts, images, sounds, templates): read docs/assets.md first and follow it. If it's missing, stop, ask me to paste my asset rules, and create it before starting.
- **Design** (any page or UI): read docs/design-rules.md and DESIGN.md first and follow them. If design-rules.md is missing, stop, ask me to paste my design rules, and create it before starting.
