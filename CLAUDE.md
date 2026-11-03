# CLAUDE.md

## Working rules
- Before editing any file, show the proposed diff and wait for approval.
- For UI changes (index.html, src/, art/, preview/), also send before/after
  screenshots rendered with Playwright.
- Never commit or push without explicit approval.
- Once I approve a push, open the pull request and merge it into main
  yourself. Don't ask a second time to merge.
- After merging, wait for the GitHub Pages deploy and tell me when the update
  is live, naming the change. If the deploy fails, tell me that instead.
- Always send me a phone notification when an update goes live, naming the
  change, even if I'm in the chat. If the deploy fails, notify me of that
  instead.
- End every reply with what I have to do, in a line starting "You need to:"
  (approve a diff, approve a push, reload the app, and so on). If there's
  nothing, write "You need to: nothing."
- When I need to approve a diff or a push, give it to me as a clickable
  button, not only as text.
- When you suggest UI or design options, mock up every option before I
  choose: build them on a scratch copy of the app (never the repo), render
  them with Playwright, and send the screenshots with the suggestions.

## Design
- Follow DESIGN.md for colors, type, corner radius, shadows, motion and
  components. Don't add a new color, font size, weight, radius or shadow
  without adding it there.
- When a change adds or changes a token or a component, update DESIGN.md in
  the same pull request.
