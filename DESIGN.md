# EA Ledger Drill — Style Reference
> A night in Midtown seen from a subway platform. Dark dusk scenes with lit windows sit over a calm cream page; anything you navigate by is a station sign or a subway map.

**Themes:** light and dark page. Night scenes are always dark; the subway map is always light.

This file describes the app as built (tokens live in `:root` in `src/shell.html`). Use it for every new screen or component. When a change adds or changes a token or a component, update this file in the same pull request.

The app is a phone-width column. Home is split into four sections, each one screen: **Today**, **City**, **Map** and **Exam**, switched by a tab bar along the bottom (a sidebar at 1024px and wider). Every other screen (drill, session summary, exam setup, exam sim, results, More) keeps the single column with no tab bar. Three looks share the app, each with a job:

1. **Night scenes** (Today: greeting, El train and the Today card; City: the 3D town card; the drill header; the daily summary): a dusk gradient with lit gold windows. This is where progress feels rewarding.
2. **Transit signage** (app bar, tab bar and sidebar, part bullets, the strip map on Map): black station signs, Helvetica, official subway line colors, a tan map with white streets. This is how you find your way.
3. **Paper** (question sheet, the Exam section and exam sim, bottom sheets, cards): plain cream and white surfaces with Inter and IBM Plex Serif. This is where you read and answer. The exam sim stays the plainest of all, close to the real PSI test screen.

## Colors

### Page and text (switch with the theme)

| Name | Token | Light | Dark | Role |
|------|-------|-------|------|------|
| Page | `--bg` | `#f2efe7` | `#0e1120` | Page canvas, answer choices at rest, stat tiles |
| Paper | `--paper` | `#ffffff` | `#171b2d` | Cards, question sheet, bottom sheet |
| Ink | `--ink` | `#161c2b` | `#e8ebf3` | Body text, headings, primary button fill |
| Ink Soft | `--ink-soft` | `#5b6478` | `#a0a8bc` | Secondary text, eyebrows, labels |
| Ink Faint | `--ink-faint` | `#8f98ab` | `#6f7890` | Decorative only. About 2.9:1 on white, so never for text someone must read |
| Line | `--line` | `#e2e7f0` | `#262c44` | 1px borders, dividers, empty meter track |

### Feedback (switch with the theme)

| Name | Token | Light | Dark | Role |
|------|-------|-------|------|------|
| Good | `--good` / `--good-soft` | `#2f8f5b` / `#e3f3ea` | `#5cc48a` / `#15301f` | Right answer, "new" chip |
| Bad | `--bad` / `--bad-soft` | `#c6455a` / `#fbe9ec` | `#ee7a8c` / `#3a1b22` | Wrong answer, low timer, destructive buttons |
| Warn | `--warn` / `--warn-soft` | `#b7791f` / `#fbf1df` | `#e6b45a` / `#33281a` | "Review" chip, backup reminder |

### Accent

| Name | Token | Value | Role |
|------|-------|-------|------|
| Amber | `--amber` | `#f5b84a` | The main call to action (the Play button, `.btn.amber` such as Save backup), the flag count dot |
| Amber Deep | `--amber-deep` | `#d98a1c` | Focus ring, hover border on answer choices |
| Amber Ink | `--amber-ink` | `#2b1a03` | Text on amber |

### Night scenes (fixed, both themes)

| Name | Token | Value | Role |
|------|-------|-------|------|
| Dusk Top | `--dusk-top` | `#1a1840` | Top of every night gradient |
| Dusk Mid | `--dusk-mid` | `#33285c` | Middle of the gradient |
| Dusk Low | `--dusk-low` | `#8a4f72` | Horizon |
| Dusk Edge | `--dusk-edge` | `#d9876e` | Sunset glow rising from the bottom edge |
| Night | — | `#0b0a24` / `#090820` | Greeting sky and El track band |
| Lit Window | — | `#ffd27a` | Lit windows on towers, streak and gold highlights in night scenes |
| Chip | `--chip` | `rgba(18,16,46,0.78)` | Labels floating over the 3D town |

### Transit signage and the strip map (fixed, both themes)

| Name | Value | Role |
|------|-------|------|
| Sign Black | `#111` (app bar), `#141414` (map) | Station sign bands, station outlines, the Practice button on the map |
| Sign Rule | `#ffffff` | The 2px white rule along the top of a sign |
| Part 1 line | `#ee352e` | Part 1 bullet, rail and progress line |
| Part 2 line | `#00933c` | Part 2 bullet, rail and progress line |
| Part 3 line | `#b933ad` | Part 3 bullet, rail and progress line |
| Route colors | A C E `#0039a6` · B D F M `#ff6319` · G `#6cbe45` · J Z `#996633` · L `#a7a9ac` · N Q R W `#fccc0a` (black text) · 1 2 3 `#ee352e` · 4 5 6 `#00933c` · 7 `#b933ad` | Transfer bullets at map stations (`ROUTE_COLOR` in app.js). Official subway colors; never approximate them |
| Map Tan | `#f1e3bf` | Map ground; white street lines run across it at 62° and −28° |
| River | `#b4d6ee`, label `#2a7cc0` | The river strip down the map's left edge |
| Neighborhood Blue | `#135f9f` | All-caps building labels on the map |
| Map Building | `#5b5446` body, `#8c8471` trim, `#3f3a30` dark window, `#ffd25e` lit window | The drawn building at each station |

## Typography

### Inter — the interface
Everything that isn't reading text or signage: buttons, labels, cards, stats. Loaded at 400 to 800.
- **Weights in use:** 400 body, 600 and 650 buttons and chips, 700 headings and labels, 800 big numbers and verdicts. For new work use 400, 600, 700 and 800 only.
- **Numbers:** always `font-variant-numeric: tabular-nums` where they change or line up (percentages, timers, stats).

### IBM Plex Serif — reading text (`--f-read`)
Only for exam content: the question (19px, 17.5px under 420px wide), answer choices (16px) and explanations (16px, line-height 1.55, max 65ch). A serif tells you "this is the test", and that should be the only thing it signals.

### Helvetica Neue — signage (`--f-sign`, falls back to Inter)
The app bar title (27px/700), the part line under it, and the whole strip map: station names 18px/700, Next stop name 20px, neighborhood labels 11px/700 uppercase with 0.06em tracking. iPhones render real Helvetica Neue; other devices fall back to Inter.

### Lora italic and Parisienne — the greeting only
Lora italic 500 for the buddy's quote, Parisienne for your name. Never anywhere else.

### Type scale (common roles)

| Role | Family | Weight | Size | Notes |
|------|--------|--------|------|-------|
| Eyebrow / section label | Inter | 700 | 11–13px | Uppercase, 0.06–0.08em tracking, Ink Soft |
| Small / meta | Inter | 400–600 | 12.5–13px | |
| Body | Inter | 400 | 15px | line-height 1.5 (set on `body`) |
| Button | Inter | 650 | 15px | |
| Card title | Inter | 700 | 17px | −0.01em |
| Big number | Inter | 800 | 20px | Stat tiles, timer |
| Summary headline | Inter | 800 | 23px | |
| Question | IBM Plex Serif | 400 | 19px | |
| Station name | Helvetica Neue | 700 | 18px | |
| App bar title | Helvetica Neue | 700 | 27px | |

The stylesheet holds 28 distinct font sizes today. New work picks from the sizes above rather than adding more.

## Spacing and layout

- **Column:** max-width 640px, centered, side gutters `max(16px, safe-area inset)`.
- **Home at 1024px and wider:** a 232px sidebar on the left; the content area gets 32px side padding and a 1116px max width. Today and Map sit side by side (columns 1.05fr and 1fr, 28px apart) with Today sticky at the top; City and Exam span both columns.
- **Tab bar clearance:** while the tab bar shows, the column's bottom padding is `96px + safe-area inset` and toasts rise above the bar.
- **Stack gap:** 14px between cards on Home.
- **Card padding:** 16px (`.pad`); the question body uses 18px 16px.
- **Base unit:** 2px steps in practice; prefer multiples of 4 for new work.
- **Tap targets:** at least 42px tall (the app bar menu button is 42px).
- **Safe areas:** the app bar, sheets, toasts and exam bar all pad for `env(safe-area-inset-*)`. Keep that on anything fixed to an edge.

### Corner radius

| Use | Value |
|-----|-------|
| Night scene cards (greeting, town, joined as one piece) | 28px |
| Bottom sheet top corners | 24px |
| Hero buttons (Play, Exam sim) | 18px |
| Cards and sheets | `--r-lg` 22px |
| Stat tiles, buttons, answer choices | 12px |
| Medium and small tokens | `--r-md` 14px, `--r-sm` 10px |
| Signs and the strip map's Next stop box | 4–10px (square, like real signage) |
| Chips, pills, meters | 999px |
| Bullets, station dots, round buttons | 50% |

## Components

### Station sign app bar
Full-bleed black `#111` band with a 2px white rule 7px from the top, the title in Helvetica Neue 27px/700, and three part bullets (22px circles in the part line colors, the current part at full opacity with a black and white double ring, the others at 40%). A 42px round menu button with a white 2px border sits at the right; an amber dot on it counts flagged questions.

### Night scene: greeting, El train, Today card
One continuous dark piece with 28px outer corners on Today: the greeting (drawn night Midtown, the study buddy on a gold coin, name in Parisienne, quote in Lora italic; the quote is hidden under 560px wide so Play stays above the tab bar), then the elevated subway line with a two-car train parked at the part's readiness, then the Today card on the dusk gradient. Shadow `0 24px 48px -24px rgba(26,24,64,0.55)`. Always dark, whatever the page theme.

### Today card
It says one thing, then offers one action. Top to bottom:
1. **Day one** (nothing answered yet): "Your first stop" with the area's route bullet (40px, ringed), its name in Helvetica 24px/700 and "The Bank · 20% of exam · 40 questions". Play starts that area. No stats are shown.
   **After that:** "Your tax city", readiness in Amber 52px/800 with "ready for Part 1" beside it, and a Next stop line (route bullet and area name). Play is the usual mixed drill.
2. Stat pills, only for numbers above zero (due, today's count). The streak lives in the greeting badge, not here.
3. Play and Exam sim.

### Town card (City)
The 3D town on the dusk gradient with 28px corners: the part switcher, then the stage with its 3D, Times Sq and Day/Dusk buttons. The stage fills the screen above the tab bar (at least 340px; on desktop 420px to 760px). Same shadow as the other night scenes.

The town legend (what cabs, netting and cranes mean) lives in How to use, not on Home.

### Part switcher (City)
Three 40px round line bullets in the part colors, the current one at full opacity with the app bar's black and white double ring, the others at 45%, and the current part's name beside them ("PART 1" eyebrow over "Individuals" in Helvetica 16px/700).

### Glass controls
Every secondary control on a night scene shares one style: white at 10% with a 1px white border at 22%, 999px radius, a 6 to 8px backdrop blur, white 13 to 14px/700 text. That covers the greeting badge (its text in Lit Window gold), How to use, the stat pills and Exam sim. The 3D, Times Sq and Day buttons sit on the moving 3D scene, so they use a darker glass (`rgba(18,16,46,0.6)`) to stay readable. The only solid button on a night scene is gold Play.

### Hero buttons: Play and Exam sim
The two big buttons on the Today card: 18px radius, 16px 12px padding, 18px/800. **Play** is a gold gradient (`#ffd27a` to Amber) with Amber Ink text and a 4px Amber Deep bottom edge that presses down on tap. **Exam sim** is frosted glass: white at 16% with a 24% white border and a 10px backdrop blur.

### Strip map (Map section)
Each exam part is a subway strip map: a tan map with white streets, a 38px river strip on the left (Hudson, East or Harlem River), and a 7px rail in the part's line color. Each area is a station row:
- 19px white station dot with a 3px black outline (filled black with a white ring once the area is mastered)
- station name in Helvetica 18px/700 with a tan halo so streets don't cut through it
- a transfer bullet in its route color, the building as an all-caps Neighborhood Blue label, exam share, and reviews due in red
- a five-stop progress line: track `#c9c2b0`, fill in the part color, stops turn from tan-outlined to black-outlined as they're passed
- the area's drawn building on the right, windows lit bottom-up with mastery

Tapping a row starts that area's drill. The area with the biggest gap gets a white **Next stop** box instead: 4px radius, 1.5px `#8c8471` border, a header with its route bullet and "NEXT STOP", the name at 20px, and a black 6px-radius Practice button.

### Tab bar and sidebar (Home only)
A station-sign band fixed to the bottom of the screen: Sign Black `#111` with a 2px white rule along its top edge, four equal buttons (Today, City, Map, Exam), each a 24px line icon (1.8 stroke, round caps) over an 11px/700 uppercase label with 0.06em tracking. Labels are white at 60% at rest and full white when current; the current tab also gets a 4px Amber bar sitting on the white rule. Buttons are at least 52px tall, the bar pads for the home indicator, and on screens wider than 640px the buttons stay inside the 640px column. z-index 30: above the page, below bottom sheets (40), toasts (50) and full-screen 3D (60).

At 1024px and wider the same element becomes a 232px sidebar down the left edge: the app name in Helvetica 20px/700 under a 2px white rule, then the sections as rows (icon beside a 13px label, 48px tall, 10px radius), with the current row on white at 10% and a 3px Amber bar at the sidebar's left edge. Map drops out because the map sits beside Today, and More (with the flag count in an Amber pill) sits at the bottom. The app bar is hidden while the sidebar shows.

### Part switcher (Map)
A segmented control on Paper with a 1px Line border, 14px radius and the card shadow: three 42px buttons, each a part bullet and "Part n" in 15px/600. The current part sits on the Page color in Ink with its bullet at full strength; the others are Ink Soft with bullets at 40%.

### Cards
`.card`: Paper fill, 1px Line border, 22px radius, `--shadow`. Section titles inside use the eyebrow style (13px/700 uppercase, Ink Soft).

### Buttons
`.btn`: 12px radius, 11px 16px padding, 15px/650.
- **amber** — the main action on a screen. One per screen.
- **primary** — Ink fill with Paper text, for strong actions that aren't the main one.
- plain — Paper fill with a Line border.
- **ghost** — no fill or border, Ink Soft text (Close, Cancel).
- **danger** — red text and border, no fill.
On signage and the map, buttons follow the sign style instead: black fill, white text, 6px radius.

### Question sheet (drill and exam)
A Paper sheet (22px radius) with a header row (area and tax year), the question in IBM Plex Serif, and answer choices as 12px-radius rows on the Page color with a 1.5px Line border and a letter column. Selected: Ink border on Paper. Right: Good fill and border. Wrong: Bad fill and border. Others dim to 55%. The explanation sits below a dashed divider.

### Drill header and daily summary
Drill only (not the exam): a dusk header with the area's 12-floor tower whose windows light to mastery and animate on an answer, the verdict with the buddy, and dollar figures underlined in the explanation. The daily summary uses the same dusk gradient, white text, gold `#ffd27a` streak line and translucent white stat tiles.

### Exam sim
Deliberately plain, like the PSI test screen: a sticky top bar on the Page color with an 800-weight tabular timer (red under the low-time threshold) and a grid of question numbers. No dusk, no buddy, no celebrations.

### Bottom sheet
Slides up over a `rgba(10,12,30,0.45)` scrim: Paper, 24px top corners, a 40×5px grab bar, a title, three stat tiles (Page fill, 12px radius, 11px uppercase label over a 20px/800 number) and a button row.

### Toast
Ink pill fixed at the bottom center, Paper text, above the home indicator.

## Elevation

- **Card shadow** (`--shadow`, light): `0 1px 0 0 inset rgba(255,255,255,0.8), 0 1px 2px rgba(20,43,67,0.06), 0 8px 20px -12px rgba(22,55,90,0.22)`. Dark: `0 1px 0 0 inset rgba(255,255,255,0.04), 0 8px 24px -12px rgba(0,0,0,0.6)`.
- **Night scene shadow:** `0 24px 48px -24px rgba(26,24,64,0.55)`, plus a 1px inset white highlight at 12% along the top.
- **Map callout:** `0 6px 14px -8px rgba(0,0,0,0.35)`.
- Use these three. Don't invent new shadows.

## Imagery

No photos. The 3D town (three.js, `src/town.js`) is a Midtown night or autumn day with 13 towers, one per exam area, whose floors fill as you master the area. The study buddy is a painted character with drawn facial expressions (`src/mascot.js`). Everything else is drawn in SVG: towers with lit windows, the El train, map buildings, and the figures in `art/` (loss sorter, basis order). Painted art per area can replace a map building later through the `ART` set in app.js.

## Motion

- **Interface transitions** (taps, hover, things appearing) run at 120ms to 260ms today. For new work: 120ms for a press, 160ms for hover and color, 260ms for something that moves or appears.
- **Scene animation** lives only in night scenes and can be slow: the train pulling in (1.8s), the cars bobbing (0.6s), the buddy breathing (3.8s), the number ring turning (24s), windows lighting on an answer.
- Animate with `transform` and `opacity`.
- Respect `prefers-reduced-motion`: no idle or looping animation, no scrolling backgrounds, and state changes appear instantly.

## Do's

- Put each new screen in one of the three looks (night scene, signage, paper), and say which in the pull request.
- Use the tokens. A new color needs a role and a row in this file.
- Use subway line colors only on bullets, rails and progress lines, and always the official values.
- Keep one amber button per screen; it's the thing to tap next.
- Use IBM Plex Serif only for question, choice and explanation text.
- Use tabular numbers for every changing number.
- Check text contrast at 4.5:1 or better in both themes (map text is fixed, so check it on Map Tan).
- Send before/after Playwright screenshots in light and dark for any UI change (see CLAUDE.md).

## Don'ts

- Don't add a new font family, weight, radius or shadow without adding it here first.
- Don't use Ink Faint for text someone has to read.
- Don't make night scenes follow the light theme, or the map follow the dark theme.
- Don't put the dusk header, the buddy or streaks in the exam sim.
- Don't use subway colors for buttons, links or body text.
- Don't use real logos or names of the MTA, IRS or PSI on drawn signage.
