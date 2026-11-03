# CLAUDE.md

## Working rules
- Before editing any file, show the proposed diff and wait for approval.
- For UI changes (index.html, src/, art/, preview/), also send before/after
  screenshots rendered with Playwright.
- Never commit or push without explicit approval.
- When a push needs my approval, ask with clickable buttons ("Push" and
  "Hold"), not a line asking me to type "push".
- Once I approve a push, open the pull request and merge it into main
  yourself. Don't ask a second time to merge.
- After merging, wait for the GitHub Pages deploy and tell me when the update
  is live, naming the change. If the deploy fails, tell me that instead.
- End every reply with what I have to do, in a line starting "You need to:"
  (approve a diff, approve a push, reload the app, and so on). If there's
  nothing, write "You need to: nothing."

## Design
- Follow DESIGN.md for colors, type, corner radius, shadows, motion and
  components. Don't add a new color, font size, weight, radius or shadow
  without adding it there.
- When a change adds or changes a token or a component, update DESIGN.md in
  the same pull request.
