// Basis order: S corporation stock and debt basis for one year, step by step in the order Form 7203 applies it.
// Run from the repo root: node tools/basis-order/build.mjs  ->  art/basis-order.html
// Draws with the Anatomy kit already in tools/loss-sorter/kit (github.com/wheresryan22/anatomy, MIT). See that folder's LICENSE.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../loss-sorter/kit/iso-kit.mjs";
import { PRESETS, EXAMPLES } from "./presets.mjs";
const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = join(HERE, "..", "loss-sorter", "kit", "iso-kit.mjs");
const OUT = join(HERE, "..", "..", "art");

const WIDTH = 640, HEIGHT = 290, AZ = 58;
const PLATE = { x: -140, y: -56, w: 280, d: 114, r: 8 };
const PLATE_H = 10, FOOT_H = 5;
// Back row: the two accounts. Front row: one drawer per step, in order.
const STACKS = { stock: [-32, -26], debt: [32, -26] };
const DRAWER = { y: 14, d: 26, w: 58, wall: 1.4, h: 8 };
const DRAWER_X = [-96, -32, 32, 96];
const COIN = 3, COIN_R = 12, BIN_R = 8, MOST = 18, H_MAX = COIN * MOST;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [STACKS.stock[0], STACKS.stock[1], H_MAX + 8], [STACKS.debt[0], STACKS.debt[1], H_MAX + 8]],
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
  // a groove between the two rows
  out.push(L(k.lineOnTop([-126, 4], [126, 4], 0, P), { tone: "faint" }));
  // names engraved in front of the two pedestals
  for (const [name, [x, y]] of Object.entries(STACKS)) {
    out.push(k.faceTextSvg(k.topMatrix([x, y + 22], 0, P), name.toUpperCase(), { size: 6, tone: "mid", anchor: "middle" }));
  }
  return out.join("");
}

const svg = k.figureSvg({
  width: WIDTH, height: HEIGHT,
  label: "Two coin stacks, stock basis and debt basis, sit behind a row of four numbered drawers. Step 1 pours the year's income onto the stock stack. Step 2 takes distributions off stock only. Steps 3 and 4 take nondeductible expenses and then losses off stock first and then debt. Anything over basis lands in the right half of that drawer. Step 5 moves any net increase from stock back onto the loan.",
  body: [base(), `<g data-scene></g>`],
});

const ROWS = [
  ["income", "1 Income", "Form 7203 line 4", "Raises stock basis."],
  ["distributions", "2 Distributions", "lines 6-7", "Off stock only. Over stock basis: capital gain, IRC 1368(b)(2)."],
  ["nondeductible", "3 Nondeductible", "lines 8-10", "Off stock, then debt. Over both: gone, unless the election is made."],
  ["loss", "4 Losses", "line 11, Part III", "Off stock, then debt. Over both: suspended until there is basis."],
  ["restore", "5 Restore debt", "line 12, Part II", "A net increase goes back onto the loan before it stays in stock."],
];
const panel = `
<section class="bo-panel" aria-label="Inputs">
  <div class="bo-steps" role="group" aria-label="Step">
    <button type="button" data-step="-1" aria-label="Previous step">‹</button>
    <span data-stepname>Start</span>
    <button type="button" data-step="1" aria-label="Next step">›</button>
    <label class="bo-check"><input type="checkbox" data-in="election"> Election: losses before nondeductibles (Reg. 1.1367-1(g))</label>
  </div>
  <div class="bo-presets" role="group" aria-label="Cases">
    ${[...PRESETS, ...EXAMPLES].map((p, i) => `<button type="button" data-preset="${i}"${i === 0 ? ' aria-pressed="true"' : ""}>${p.name}</button>`).join("")}
  </div>
  <p class="bo-note" data-note></p>
  <div class="bo-fields">
    <label>Stock basis, start<input data-in="stock" inputmode="numeric"></label>
    <label>Debt basis, start<input data-in="debt" inputmode="numeric"></label>
    <label>Loan balance owed to you<input data-in="debtFace" inputmode="numeric"></label>
    <label>Income items<input data-in="income" inputmode="numeric"></label>
    <label>Distributions<input data-in="distributions" inputmode="numeric"></label>
    <label>Nondeductible expenses<input data-in="nondeductible" inputmode="numeric"></label>
    <label>Losses and deductions<input data-in="loss" inputmode="numeric"></label>
  </div>
  <table class="bo-table">
    <thead><tr><th>Step</th><th>Amount</th><th>Stock after</th><th>Debt after</th><th>Rule</th></tr></thead>
    <tbody>
      <tr><td>Start</td><td></td><td data-cell="start-stock"></td><td data-cell="start-debt"></td><td></td></tr>
      ${ROWS.map(([key, name, line, rule]) => `<tr data-row="${key}"><td>${name}<small>${line}</small></td><td data-cell="${key}-amount"></td><td data-cell="${key}-stock"></td><td data-cell="${key}-debt"></td><td>${rule}</td></tr>`).join("")}
    </tbody>
  </table>
  <dl class="bo-out">
    <div><dt>Loss deducted</dt><dd data-out="deducted"></dd></div>
    <div><dt>Loss suspended</dt><dd data-out="suspended"></dd></div>
    <div><dt>Capital gain</dt><dd data-out="gain"></dd></div>
    <div><dt data-out="ndLabel">Nondeductibles lost</dt><dd data-out="nd"></dd></div>
    <div><dt>Coin</dt><dd data-out="coin"></dd></div>
  </dl>
  <p class="bo-src">Order: Treas. Reg. 1.1367-1(f) and (g); Form 7203 (Rev. 12-2022) and its instructions; debt restoration, Reg. 1.1367-2(c)(1). One loan, and no accumulated earnings and profits.</p>
</section>`;

const css = `
.bo-panel{margin-top:14px;font:13px/1.45 var(--anatomy-mono);color:var(--anatomy-text)}
.bo-steps{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:12px}
.bo-steps button,.bo-presets button{font:inherit;color:var(--anatomy-text);background:var(--anatomy-card);border:1px solid var(--anatomy-faint);border-radius:999px;padding:5px 11px;cursor:pointer}
.bo-steps [data-stepname]{min-width:13ch;color:var(--anatomy-strong)}
.bo-check{display:flex;align-items:center;gap:7px;font-size:12px}
.bo-presets{display:flex;flex-wrap:wrap;gap:6px}
.bo-presets button[aria-pressed="true"]{color:var(--anatomy-strong);border-color:var(--anatomy-mid)}
.bo-note{min-height:2.9em;margin:10px 2px;color:var(--anatomy-muted)}
.bo-fields{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px 14px}
.bo-fields label{display:flex;flex-direction:column;gap:3px;font-size:12px}
.bo-fields input{font:inherit;color:var(--anatomy-strong);background:var(--anatomy-card);border:1px solid var(--anatomy-faint);border-radius:6px;padding:5px 8px}
.bo-table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px}
.bo-table th{text-align:left;font-weight:400;color:var(--anatomy-muted);border-bottom:1px solid var(--anatomy-faint);padding:4px 6px 4px 0}
.bo-table td{vertical-align:top;border-bottom:1px solid var(--anatomy-faint);padding:6px 6px 6px 0}
.bo-table td small{display:block;color:var(--anatomy-muted)}
.bo-table td[data-cell]{white-space:nowrap;color:var(--anatomy-strong)}
.bo-table tr[data-now] td:first-child{color:var(--anatomy-strong);font-weight:600}
.bo-out{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin:14px 0 0}
.bo-out div{border:1px solid var(--anatomy-faint);border-radius:8px;padding:6px 8px}
.bo-out dt{font-size:11px;color:var(--anatomy-muted)}
.bo-out dd{margin:0;color:var(--anatomy-strong)}
.bo-src{color:var(--anatomy-muted);font-size:11px}
.iso-page{margin:16px auto 32px}
.iso-plate{overflow:hidden}
.iso-stage{touch-action:pan-y}
@media (max-width:520px){.iso-page{margin:8px auto 24px;width:calc(100% - 20px)}.iso-stage svg{transform:scale(1.3);transform-origin:50% 50%}.bo-table th:nth-child(5),.bo-table td:nth-child(5){display:none}}
`;

const body = `<style>${css}</style>` + k.plateHtml({
  fig: "Fig 2",
  title: "Basis order",
  hint: "Arrow keys step through",
  readout: "",
  keys: [
    { mark: "lit", label: "Stacks: stock and debt basis" },
    { mark: "raised", label: "Drawers: left half came off basis, right half was over it" },
  ],
  caption: "The drawers run in the order the law applies them. The dashed ring on the debt stack is the loan balance, the most its basis can be restored to.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Basis order: arrow keys move from step to step" aria-valuemin="0" aria-valuemax="5" aria-valuenow="0">${svg}</div>`,
}) + panel;

const model = readFileSync(join(HERE, "model.mjs"), "utf8").replace(/^export /gm, "");
const live = readFileSync(join(HERE, "live.js"), "utf8");
const consts = `const P = ${JSON.stringify(P)};
const CFG = ${JSON.stringify({ STACKS, DRAWER, DRAWER_X, COIN, COIN_R, BIN_R, MOST })};
const CASES = ${JSON.stringify([...PRESETS, ...EXAMPLES])};
`;
// Light theme only, like the loss sorter: the sheet it opens in is paper-white in both Day and Dusk.
const html = k.pageHtml({ title: "Basis order", theme: "light", body, script: readFileSync(KIT, "utf8").replace(/^export /gm, "") + model + consts + live });
writeFileSync(join(OUT, "basis-order.html"), html);
console.log(`art/basis-order.html: ${html.length.toLocaleString()} bytes`);
