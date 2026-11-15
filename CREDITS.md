# Credits

One row per asset: what it is, where it came from, its license, whether it was
bought, the price, and which account bought it (`docs/assets.md`, section 11).
Started 2026-11-14 with the launch film and the grown-up study buddy. Assets added
before that (the Poly Haven textures and sky, the Meshy props on the Tap to Start
still, the tower models) are described in `DESIGN.md` and still need rows here.

| Asset | Files | Source | License | Bought | Price | Account |
|---|---|---|---|---|---|---|
| Launch film for phones | `media/intro-phone.mp4`, `media/intro-phone-start.webp`, `media/intro-phone-end.webp`, `media/intro-phone-tower.webp` | Generated in Runway on 2026-11-14 from stills generated there for this app (prompts in the session notes; no stock footage) | Runway's terms for output made on a paid plan; Jose confirmed on 2026-11-14 that they allow use on a public website | Credits | About 3,000 credits across all takes, including ones not used | Jose's Runway workspace |
| Launch card: the buddy on the graffiti wall | `media/intro-wait.webp` | Generated in Runway on 2026-11-14 from the buddy's picture; a spired tower in its skyline painted out here | Same as above | Credits | 20 credits | Jose's Runway workspace |
| Study buddy, grown up | `art/buddy-bust.webp`, `art/buddy-face.webp`, sources in `docs/art/buddy-faces/` | Generated in Runway on 2026-11-14 from the earlier buddy picture | Same as above | Credits | About 500 credits, including two poses not used | Jose's Runway workspace |
| Launch film sound: effects and beat | `media/intro-sfx.mp3`, `media/intro-music.mp3`, `media/intro-go.mp3` | Generated in ElevenLabs on 2026-11-14 (seven sound effects and two instrumentals, the second one used), mixed here | ElevenLabs' terms for output made on Jose's plan; Jose confirmed on 2026-11-14 that they allow use on a public website | Plan credits | Not known: this connection can't read the account's balance | Jose's ElevenLabs account |
| 3D engine | `vendor/three/` (three.js 0.160.0: the module build and the 14 add-on files the app imports) | The `three` package on npm, copied 2026-11-15 | MIT (`vendor/three/LICENSE`) | Free | $0 | None |
| Fonts | `fonts/` (Inter, IBM Plex Serif, Lora italic, Parisienne; Latin and Latin Extended) | Google Fonts, the same files the app loaded from there, copied 2026-11-15 | SIL Open Font License 1.1 | Free | $0 | None |

Keep the Runway and ElevenLabs receipts for the plan and the credit pack.
