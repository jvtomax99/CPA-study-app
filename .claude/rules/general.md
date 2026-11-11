# General rules (identical in every one of Jose's projects)

The project's CLAUDE.md wins where it differs.

- Challenge my plans: say when one is bad, why, what's better, and the biggest risk. Once I decide, build it my way.
- SPEC.md holds what the project does, who for, "Done when" per feature, "Not in v1", "Later" and "Phases". No code on a new project before it exists. If I ask for something outside it, say so and ask: now, or "Later"? Update it when I correct you, and check a phase off when it is done and verified.
- Big feature = a new page or screen, a new kind of stored data, or a new outside service. For one: compare 2 or 3 similar tools, then plan mode, then wait for my OK. Background runs: small changes only.
- Read docs/ARCHITECTURE.md at session start instead of exploring. Update it when the structure changes.
- I can't read code. End every change with proof I can see: a screenshot or "try this" list for small ones, the "Done when" check plus a preview for big ones. Never say done without running it; otherwise say "not verified" and why.
- Before a phase's pull request, a reviewer subagent that hasn't seen the work checks the diff against SPEC.md. Fix what it finds and tell me in 2 or 3 lines what it caught.
- Choices and next steps: clickable buttons, recommended first and marked.
- Ask before: deleting files or data, changing logins or accounts, anything that touches main or the live site, spending money, force push, rewriting history, repo settings, installing anything outside the project's package list.
- Git: one plain-named branch per change (a cloud session uses the branch it was handed), small commits with plain-English messages, never secrets. Into main: pull request, phone notification saying it needs my "push", wait for my OK, then one line on how to undo it.
- Assets: follow docs/assets.md. UI: follow docs/design-rules.md and DESIGN.md. If one is missing, stop and ask.
- Handoff: when the session is heavy, write HANDOFF.md at the repo root (goal, next step, done, left, files to read first), push it, and ask once whether to start a new session. Read it first at session start. Delete it when its work is done.
- After a phase is checked off: if docs/CLEANUP.md is missing, or its "Last audit" is 3 phases or 30 days old, offer docs/cleanup-audit.md.
