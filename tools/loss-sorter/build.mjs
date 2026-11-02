// Loss sorter: a coin sled that runs under four scraper bars, one per loss limitation, in the order the law applies them.
// Run from the repo root: node tools/loss-sorter/build.mjs  ->  art/loss-sorter.html
// The drawing kit in kit/ is from Anatomy (github.com/wheresryan22/anatomy, MIT, commit 1482e84). See kit/LICENSE.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "art");
const kitScript = () => readFileSync(join(HERE, "kit", "iso-kit.mjs"), "utf8").replace(/^export /gm, "");
import { PRESETS, EXAMPLES } from "./presets.mjs";

const WIDTH = 640, HEIGHT = 340, AZ = 58;

const PLATE = { x: -178, y: -44, w: 356, d: 110, r: 8 };
const PLATE_H = 10, FOOT_H = 5;
const RAIL_X = [-152, 152], RAIL_Y = [-11, 6], RAIL_W = 5, RAIL_H = 3;
const SLED = { x: -17, y: -17, w: 34, d: 34, r: 3 }, SLED_Z = RAIL_H, SLED_TOP = 8;
const SEAT_TOP = SLED_TOP + 1.2;
const COIN = 3, COIN_R = 11, BIN_R = 9, MOST = 18, H_MAX = COIN * MOST;
const GAP = 0.8, BAR_H = 5, COL_TOP = 80, PARK = COL_TOP - 8 - BAR_H;
const GATES = [-72, -20, 32, 84];
const START = -132, END = 129;
const BIN = { y: 31, d: 24, w: 30, wall: 1.4, h: 8 };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...GATES.flatMap((g) => [[g, -32, COL_TOP + 6], [g, 28, COL_TOP + 6]])],
  WIDTH, HEIGHT, { pad: 22, azimuth: AZ },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // ruler strip along the front edge
  const strip = { x: -150, y: PLATE.y + PLATE.d - 11, w: 300, d: 5.5, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.6, 0.6, [1.6, 3], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 2.75, 0.6]), at([strip.x + strip.w - 2, strip.y + 2.75, 0.6])], { size: 0.45 }));
  // label plate at the loading end
  const label = { x: -168, y: 30, w: 26, d: 18, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 3, 0.4), { tone: "mid" }));
  for (const y of [35, 39, 43]) out.push(L(k.lineOnTop([label.x + 4, y], [label.x + (y === 43 ? 14 : 22), y], 0.8, P), { tone: "lo", free: true }));
  out.push(D(k.corners(label, 2).map(([x, y]) => at([x, y, 0.8])), { size: 0.4 }));
  // rails with end stops
  for (const y of RAIL_Y) {
    out.push(S(k.slabOf({ x: RAIL_X[0], y, w: RAIL_X[1] - RAIL_X[0], d: RAIL_W, r: 1 }, 0, RAIL_H, P, 3, 0.4), { tone: "mid" }));
    out.push(D([-140, -56, 0, 56, 140].map((x) => at([x, y + RAIL_W / 2, RAIL_H])), { size: 0.4 }));
  }
  for (const x of [RAIL_X[0] - 6, RAIL_X[1]]) {
    out.push(S(k.slabOf({ x, y: -15, w: 6, d: 25, r: 1.2 }, 0, 9, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 3, -10, 9]), at([x + 3, 5, 9])], { size: 0.45 }));
  }
  return out.join("");
}

// Top-level items, each with a reference depth. The live code slots the sled among them.
const items = [];
const put = (ref, svg, attrs = "") => items.push({ depth: k.depthOf(ref, P), svg: `<g data-depth="${k.depthOf(ref, P).toFixed(2)}"${attrs}>${svg}</g>` });

function column(gx, y0) {
  const out = [];
  const flange = { x: gx - 8, y: y0 - 1, w: 16, d: 10, r: 1.5 };
  out.push(S(k.slabOf(flange, 0, 3, P, 3, 0.5), { tone: "mid" }));
  out.push(D(k.corners(flange, 2).map(([x, y]) => at([x, y, 3])), { size: 0.4 }));
  const col = { x: gx - 5, y: y0, w: 10, d: 8, r: 1 };
  out.push(S(k.slabOf(col, 3, COL_TOP - 3, P, 3, 0.5), { tone: "mid", inner: L([20, 50, 76].map((z) => k.sideSeam(col, z, P, 3)).join(""), { tone: "faint" }) }));
  return out.join("");
}

GATES.forEach((gx, i) => {
  put([gx, -28, 0], column(gx, -32));
  // the scraper bar: built with its bottom at z = 0, lifted live
  const bar = { x: gx - 3.5, y: -24, w: 7, d: 44, r: 0.8 };
  const barSvg = [
    S(k.slabOf(bar, 0, BAR_H, P, 3, 0.4), { tone: "hi", crease: "lo" }),
    L(k.lineOnTop([gx, -24], [gx, 20], BAR_H, P), { tone: "faint" }),
    D([at([gx, -21, BAR_H]), at([gx, 17, BAR_H])], { size: 0.45 }),
  ].join("");
  put([gx, -2, 0], `<g data-bar="${i}" transform="${k.translateAlong(P, [0, 0, PARK])}">${barSvg}</g>`);
  // front column with the height knob on top
  const knob = [gx, 24];
  put([gx, 24, 0], column(gx, 20) + [
    S(k.cylinder(knob[0], knob[1], 3.2, COL_TOP, 1.4, P, 24), { tone: "mid" }),
    S(k.cylinder(knob[0], knob[1], 4.6, COL_TOP + 1.4, 4, P, 32), { tone: "mid" }),
    L(k.knurl(knob[0], knob[1], 4.6, COL_TOP + 1.4, COL_TOP + 5.4, 30, P), { tone: "lo" }),
    L(k.lineOnTop(knob, [knob[0] + 4.6, knob[1]], COL_TOP + 5.4, P), { tone: "hi" }),
    D([at([knob[0], knob[1], COL_TOP + 5.4])], { size: 0.5, tone: "hi" }),
  ].join(""));
  // the drawer in front of the gate that catches what the bar scrapes off
  const x0 = gx - BIN.w / 2, y0 = BIN.y;
  const floor = { x: x0, y: y0, w: BIN.w, d: BIN.d, r: 1.5 };
  const back = { x: x0, y: y0, w: BIN.w, d: BIN.wall, r: 0.5 };
  const left = { x: x0, y: y0 + BIN.wall, w: BIN.wall, d: BIN.d - 2 * BIN.wall, r: 0.3 };
  const right = { x: x0 + BIN.w - BIN.wall, y: y0 + BIN.wall, w: BIN.wall, d: BIN.d - 2 * BIN.wall, r: 0.3 };
  const front = { x: x0, y: y0 + BIN.d - BIN.wall, w: BIN.w, d: BIN.wall, r: 0.5 };
  const pull = { x: gx - 5, y: y0 + BIN.d, w: 10, d: 2.2, r: 0.8 };
  const cy = y0 + BIN.d / 2;
  const svg = [
    `<path class="iso-halo" d="${k.haloOf(k.insetPlan(floor, 2), 0, 0.1, P)}" style="filter:blur(3px)"/>`,
    S(k.slabOf(floor, 0, 1.2, P, 3, 0.4), { tone: "mid" }),
    S(k.slabOf(back, 1.2, BIN.h, P, 2), { tone: "mid" }),
    S(k.slabOf(left, 1.2, BIN.h, P, 2), { tone: "mid" }),
    L(k.ring(gx, cy, BIN_R + 1.2, 1.2, P, 40), { tone: "faint" }),
    `<g data-bin="${i}"></g>`,
    S(k.slabOf(right, 1.2, BIN.h, P, 2), { tone: "mid" }),
    S(k.slabOf(front, 1.2, BIN.h, P, 2, 0.3), { tone: "mid" }),
    k.faceTextSvg(k.sideMatrix([gx, y0 + BIN.d], 7.2, P, "left"), String(i + 1), { size: 5, tone: "hi", anchor: "middle" }),
    S(k.slabOf(pull, 3.4, 2.4, P, 2, 0.3), { tone: "mid" }),
    D([at([gx - 3.6, y0 + BIN.d + 1.1, 5.8]), at([gx + 3.6, y0 + BIN.d + 1.1, 5.8])], { size: 0.4 }),
  ].join("");
  put([gx, cy, 0], svg);
});

function sled() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(SLED, 3), SLED_Z, 0.1, P)}" style="filter:blur(4px)"/>`];
  const handle = [SLED.x - 3, 0];
  out.push(S(k.slabOf({ x: SLED.x - 2, y: -2, w: 3, d: 4, r: 0.8 }, SLED_Z + 1, 3, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(handle[0], handle[1], 2.8, SLED_Z + 0.5, 5, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(handle[0], handle[1], 2.8, SLED_Z + 0.5, SLED_Z + 5.5, 18, P), { tone: "lo" }));
  out.push(S(k.slabOf(SLED, SLED_Z, SLED_TOP - SLED_Z, P, 5, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(SLED, 2.5), SLED_TOP, P, 5), { tone: "faint" }));
  out.push(D(k.corners(SLED, 4).map(([x, y]) => at([x, y, SLED_TOP])), { size: 0.45 }));
  out.push(D([-10, -3.5, 3.5, 10].map((x) => at([x, SLED.y + SLED.d - 1.4, SLED_TOP])), { size: 0.38, tone: "lo" }));
  out.push(S(k.cylinder(0, 0, COIN_R + 1.6, SLED_TOP, SEAT_TOP - SLED_TOP, P, 48, 0.4), { tone: "mid" }));
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "A coin sled on two rails runs under four scraper bars. Each bar is set to the height of one loss limitation: basis, at-risk, passive, then excess business loss. Coins above a bar are scraped into the drawer in front of it. What is still on the sled at the end of the rails is deducted this year.",
  body: [
    base(),
    ...items.sort((a, b) => a.depth - b.depth).map((it) => it.svg),
    `<g data-part="sled">${sled()}<g data-stack></g></g>`,
  ],
});

const panel = `
<section class="ls-panel" aria-label="Inputs">
  <div class="ls-presets" role="group" aria-label="Cases">
    ${[...PRESETS, ...EXAMPLES].map((p, i) => `<button type="button" data-preset="${i}"${i === 0 ? ' aria-pressed="true"' : ""}>${p.name}</button>`).join("")}
  </div>
  <p class="ls-note" data-note></p>
  <div class="ls-fields">
    <div class="ls-row"><span class="ls-k ls-k-solo">Loss</span><label>Loss for the year<input data-in="loss" inputmode="numeric"></label></div>
    <div class="ls-row"><span class="ls-k">1 Basis<label class="ls-check"><input type="checkbox" data-in="passThrough"> From a partnership or S corp</label></span><label>Stock + debt basis, or outside basis<input data-in="basis" inputmode="numeric"></label></div>
    <div class="ls-row"><span class="ls-k">2 At-risk<small>Leave blank if it doesn't limit</small></span><label>Amount at risk<input data-in="atRisk" inputmode="numeric"></label></div>
    <div class="ls-row"><span class="ls-k">3 Passive<label class="ls-check"><input type="checkbox" data-in="passive"> No material participation</label></span><label>Passive income from other activities<input data-in="passiveIncome" inputmode="numeric"></label></div>
    <div class="ls-row"><span class="ls-k">4 Excess business loss<label class="ls-check"><input type="checkbox" data-in="joint"> Married filing jointly</label></span><label>Other net business income<input data-in="otherBusinessIncome" inputmode="numeric"></label></div>
  </div>
  <table class="ls-table">
    <thead><tr><th>Gate</th><th>Limit</th><th>Held back</th><th>What happens to it</th></tr></thead>
    <tbody>
      <tr><td>1 Basis<small>IRC 1366(d), 704(d)</small></td><td data-limit="0"></td><td data-held="0"></td><td>Suspended. Carries forward with no time limit until there is basis to absorb it.</td></tr>
      <tr><td>2 At-risk<small>IRC 465</small></td><td data-limit="1"></td><td data-held="1"></td><td>Carried over to next year as a deduction from the same activity.</td></tr>
      <tr><td>3 Passive<small>IRC 469</small></td><td data-limit="2"></td><td data-held="2"></td><td>Suspended passive loss. Carries forward until there is passive income or the whole activity is sold.</td></tr>
      <tr><td>4 Excess business loss<small>IRC 461(l)</small></td><td data-limit="3"></td><td data-held="3"></td><td>Becomes part of the NOL carryover.</td></tr>
      <tr class="ls-total"><td colspan="2">Deducted for 2025</td><td data-deducted></td><td class="ls-coin">Coin = <span data-coin></span></td></tr>
    </tbody>
  </table>
  <p class="ls-src">Order: basis, at-risk, passive (Treas. Reg. 1.469-2T(d)(6)), then excess business loss (Instructions for Form 461 (2025), Ordering Rules). 2025 threshold $313,000, $626,000 joint (Rev. Proc. 2024-40, sec. 2.32). Passive gate leaves out the $25,000 rental allowance and real estate professionals.</p>
</section>`;

const css = `
.ls-panel{margin-top:14px;font:13px/1.45 var(--anatomy-mono);color:var(--anatomy-text)}
.ls-presets{display:flex;flex-wrap:wrap;gap:6px}
.ls-presets button{font:inherit;color:var(--anatomy-text);background:var(--anatomy-card);border:1px solid var(--anatomy-faint);border-radius:999px;padding:5px 11px;cursor:pointer}
.ls-presets button[aria-pressed="true"]{color:var(--anatomy-strong);border-color:var(--anatomy-mid)}
.ls-note{min-height:2.9em;margin:10px 2px;color:var(--anatomy-muted)}
.ls-fields{display:flex;flex-direction:column}
.ls-row{display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;padding:8px 0;border-top:1px solid var(--anatomy-faint)}
.ls-k{display:flex;flex-direction:column;gap:5px;color:var(--anatomy-strong);font-size:12px}
.ls-k small{color:var(--anatomy-muted)}
.ls-row label{display:flex;flex-direction:column;gap:3px;font-size:12px}
.ls-row label.ls-check{flex-direction:row;align-items:center;gap:7px;color:var(--anatomy-text)}
.ls-row input:not([type]){font:inherit;color:var(--anatomy-strong);background:var(--anatomy-card);border:1px solid var(--anatomy-faint);border-radius:6px;padding:5px 8px}
.ls-row input:disabled{opacity:.45}
.ls-table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px}
.ls-table th{text-align:left;font-weight:400;color:var(--anatomy-muted);border-bottom:1px solid var(--anatomy-faint);padding:4px 6px 4px 0}
.ls-table td{vertical-align:top;border-bottom:1px solid var(--anatomy-faint);padding:6px 6px 6px 0}
.ls-table td small{display:block;color:var(--anatomy-muted)}
.ls-table td[data-held],.ls-table td[data-limit],.ls-table td[data-deducted]{white-space:nowrap;color:var(--anatomy-strong)}
.ls-total td{color:var(--anatomy-strong);border-bottom:none}
.ls-src{color:var(--anatomy-muted);font-size:11px}
.iso-page{margin:16px auto 32px}
.iso-plate{overflow:hidden}
.iso-stage{touch-action:pan-y}
@media (max-width:520px){.iso-page{margin:8px auto 24px;width:calc(100% - 20px)}.ls-row{grid-template-columns:1fr}.iso-stage svg{transform:scale(1.24);transform-origin:50% 55%}.ls-k-solo{display:none}.ls-table th:nth-child(4),.ls-table td:nth-child(4),.ls-coin{display:none}}
`;

const body = `<style>${css}</style>` + k.plateHtml({
  fig: "Fig 1",
  title: "Loss sorter",
  hint: "Hover to push the sled",
  readout: "",
  keys: [
    { mark: "lit", label: "Coins on the sled: loss still deductible" },
    { mark: "raised", label: "Drawers 1 to 4: loss held back at each gate" },
  ],
  caption: "Each bar sits at the height of one limit. The sled meets them in the order the law applies them, so a coin scraped off at gate 1 never reaches gate 2.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Loss sorter: arrow keys move the sled from gate to gate" aria-valuemin="0" aria-valuemax="4" aria-valuenow="0">${svg}</div>`,
}) + panel;

const model = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const live = readFileSync(join(HERE, "live.js"), "utf8");
const consts = `const P = ${JSON.stringify(P)};
const CFG = ${JSON.stringify({ COIN, COIN_R, BIN_R, H_MAX, GAP, PARK, GATES, START, END, SEAT_TOP, BIN_CY: BIN.y + BIN.d / 2, BIN_FLOOR: 1.2 })};
const CASES = ${JSON.stringify([...PRESETS, ...EXAMPLES])};
`;
// Light theme only: the drill card and the sheet it opens in are paper-white in both Day and Dusk.
const html = k.pageHtml({ title: "Loss sorter", theme: "light", body, script: kitScript() + model + consts + live });
writeFileSync(join(OUT, "loss-sorter.html"), html);
console.log(`art/loss-sorter.html: ${html.length.toLocaleString()} bytes`);
