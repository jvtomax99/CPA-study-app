Drafted from the code on 2026-11-10. Gaps marked TO FILL for Jose.

# SPEC: Above the Line

## What it is

A study app for the IRS Enrolled Agent exam (SEE, tax year 2025 law, testing window
July 1, 2026 to February 28, 2027) and, in CPA mode, the CPA sections REG, FAR, AUD
and TCP. A free web page on GitHub Pages that installs to the Home Screen. Progress
stays on the device.

Live: https://jvtomax99.github.io/CPA-study-app/

## Who it's for

- TO FILL: who studies with it. Jose directs the build; the page footer and README
  name Chris Hidalgo as the copyright holder. Is the real user Jose, Chris, or both?
- TO FILL: which exam comes first (EA or CPA), and the exam dates.
- What the code assumes they need: short drills on a phone, an honest read on
  readiness, a sim close to the real exam, and a reason to come back each day (the
  city, the streak).

## Features (built)

Screens: Today, City, Map, Exam and More tabs, plus Drill, session summary, daily
summary, exam setup, exam, break and results.

1. **Question bank.** 972 questions in `src/questions.json`: 600 EA (200 per part)
   and 372 CPA-only (REG 111, FAR 82, AUD 100, TCP 79). CPA mode also reuses EA
   questions tagged for REG or TCP, so REG has 571 and TCP 246. Each one was written
   by one agent and checked against its cited source by another.
   - Done when: every question shows its source, and `tools/abbrev.py` finds no
     abbreviation used before it is spelled out.
2. **EA and CPA modes.** A switch swaps the bank, parts and areas. Progress is kept
   by question id, so an answer counts in both modes.
   - Done when: switching modes keeps all progress and shows that mode's parts or
     sections.
3. **Drill with spaced repetition.** Reviews come back after 5 minutes, then 1, 3, 7,
   16 and 35 days. Flagging. The drill card shows the area's tower, mastery before
   and after, a verdict with the buddy, and source pills.
   - Done when: a user answers a question, sees right or wrong with the explanation
     and source, and a missed question comes back sooner than a right one.
4. **Honest readiness.** "I guessed" turns a lucky right answer into a miss. A
   session summary on leaving Drill (3 or more answers) splits new questions from
   reviews. Sim results show the score on questions never seen before.
   - Done when: a guessed answer counts as a miss in mastery and in the summary.
5. **Daily goal, streak and daily summary.**
   - Done when: reaching the daily goal offers today's summary with mastery change
     per area.
6. **Exam sim.** EA: 100 questions, 3.5 hours, three locked sections with a break.
   CPA: the multiple-choice half of each section (REG 72, FAR 50, AUD 78, TCP 68).
   Exam dates per part on the Exam tab.
   - Done when: a user finishes a sim and sees the score, the score by area and the
     never-seen score.
7. **3D city.** Each content area is a tower on a real Times Square (from
   OpenStreetMap) that is finished floor by floor as it is mastered. Dusk and Day.
   Full-screen 3D with map gestures, compass and Street view. Tap a tower to drill.
   Slow devices drop to a lighter mode on their own (`?gfx=low`, `?gfx=high`,
   `?fps=1`).
   - Done when: mastering questions in an area visibly adds floors to its tower, and
     the city stays smooth on a phone (not yet proven on a real phone).
8. **Launch screen.** On phones (portrait), a 14-second film: writers running in the
   train yard, the graffiti car with the buddy, the chase along the El, the bridge,
   the dive to LAST STOP, with the title ABOVE THE LINE, then Tap to Start on its
   last frame. On landscape screens, or when the film can't start, the 3D ride past
   one station per part, each lighting up as that part's questions load; landscape
   screens end on a Blender-rendered Tap to Start, portrait ones on the film's last
   frame. The film has recorded effects and a New York
   beat that keeps playing while Tap to Start waits; the ride has its synthesized sound and beat.
   `?intro=0`, `?intro=1`, `?intro=title`, `?ride=3d`. More has Replay the intro.
   - Done when: the film (or the ride) plays on launch and Tap to Start opens the app
     once the bank has loaded.
   - Not in this version: a film for landscape screens, each part's
     readiness over the film, the film waiting at a station that hasn't loaded.
9. **Greeting and study buddy.** Night Midtown header with the user's name, a tax
   quote of the day and a buddy, a grown-up New York accountant, who blinks, smiles,
   winks, dozes and gives pep talks.
   - Done when: tapping the buddy changes his face and his line; tapping the
     calculator starts a drill.
10. **Backup.** Save and load a backup file, or copy and paste it as text. A reminder
    on Home after 7 days with no backup.
    - Done when: a backup saved on one device restores the same progress on another.
11. **Daily reminder.** Pick a time; the app hands over a repeating calendar event
    (one `.ics` file per half hour in `reminders/`).
    - Done when: the user's calendar alerts them daily at the chosen time.
12. **How-to video.** 2-minute narrated video, from Watch the guide on Home and More.
    - Done when: the video plays on a phone and leads with adding the app to the Home
      Screen.
13. **Figures.** The loss sorter and the basis order, linked from the questions they
    explain and listed in More.
    - Done when: each figure's cases match the bank (`node tools/loss-sorter/test.mjs`,
      `node tools/basis-order/test.mjs`).
14. **Home Screen app.** Manifest, icons and standalone mode.
    - Done when: the app opens full screen from the Home Screen icon.

## Not in v1

TO FILL: Jose to confirm this list. Drawn from decisions in `docs/HANDOFF.md`:

- Online sync between devices (a separate Firebase project was discussed; backup
  files were picked instead).
- Any server: no push notifications, no AI help. Hosting stays on GitHub Pages;
  Vercel only if server features are added.
- Task-based simulations (TBS) in the CPA sim. The sim is the multiple-choice half.

## Later

From `docs/HANDOFF.md` ("Still open" and the "Not done" notes):

- `tools/smoke.js` fails on main: software WebGL takes 2 to 4 s per frame (with
  longer waits it passed the 3D steps but stopped at line 91).
- The El train bullet on Today squeezes REG, TCP and AUD into a one-digit circle.
- FAR questions held for missing sources: far2-020, far2-025, far3-006, far3-019,
  far3-020.
- Buddy faces on the answer card and session summary (`encourage` and `doubt` frames
  are ready); a big open smile; gaze frames. The how-to video still shows the old
  buddy.
- Honest readiness extras: a guess button in the sim, a pass prediction, saved
  session history, a summary when leaving Drill through More, and the never-seen
  score on the Home exam chart.
- Drill card: source links (irs.gov could not be reached to check URLs), and
  app-wide Day and Dusk theming.
- A daily reminder that skips days already practiced (needs a server).
- Refresh dollar figures to 2026 law for the next SEE window (about July 2027).
- Check speed on a real phone with `?fps=1`.
- README still says 600 questions and EA only; it does not mention CPA mode.

## Phases

Built (dates and commits in `git log`):

- [x] Drill and bank: EA bank 69 to 600, spaced repetition, sim, backup files.
- [x] 3D town: night Midtown, neon pass, autumn Day, speed pass, full-screen city.
- [x] Daily reminder and Home Screen icon.
- [x] Drill card redesign and daily summary.
- [x] Honest readiness (pull request #5).
- [x] Figures: loss sorter and basis order.
- [x] Buddy expressions (commit 3324540).
- [x] Times Square phase 1, the map from OpenStreetMap (commit 7780aaa).
- [x] Smoother full-screen 3D moving (commit 01546ea).
- [x] CPA mode: REG, then TCP, AUD, and FAR batch 1 (82 questions, commit 1e1c87c).
- [x] Launch screen: train ride, sound, beat, rendered Tap to Start (through pull
  request #57).
- [x] How-to video refreshed for CPA mode (commit 95a0464).
- [ ] Launch film for phones and the grown-up study buddy (made in Runway; waiting
  on Jose's "push").

In progress or next:

- [ ] Times Square phase 2, cars: lane graph from the map's one-way streets,
  signals, queues (Kenney Car Kit, CC0).
- [ ] Times Square phase 3, people: Quaternius Universal Base Characters (CC0;
  Jose downloads the zip), walk cycles baked in Blender.
- [ ] Times Square phase 4, color.
- [ ] FAR batch 2: consolidation and NCI, discontinued operations, foreign currency,
  classified balance sheet, basic EPS, inventory, property and equipment,
  intangibles, equity, bonds, income taxes, fair value, accounting changes,
  contingencies, subsequent events. Waits on Jose's source uploads (ASUs 2023-09,
  2024-04, 2016-08 and Codification pages).
- [ ] TO FILL: what comes after these.
