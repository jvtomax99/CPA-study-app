import { sortLoss, coinValue } from "./model.mjs";
import { PRESETS, EXAMPLES } from "./presets.mjs";
import { readFileSync } from "node:fs";
// Run from the repo root: node tools/loss-sorter/test.mjs  (checks each bank case against the bank's answer)
const bank = Object.fromEntries(JSON.parse(readFileSync(process.argv[2] || "src/questions.json", "utf8")).map((q) => [q.id, q]));
let bad = 0;
for (const p of PRESETS) {
  const r = sortLoss(p.input), q = bank[p.id];
  const said = Number(q.choices[q.answer].replace(/[^0-9].*$/, "").replace(/[$,]/g, "") || q.choices[q.answer].match(/\$([\d,]+)/)[1].replace(/,/g, ""));
  const ok = r.deducted === p.answer && said === p.answer;
  if (!ok) bad++;
  console.log(ok ? "ok " : "BAD", p.id, "machine", r.deducted, "bank says", q.choices[q.answer], "held", r.gates.map((g) => g.held).join("/"), "coin", coinValue(r.loss, 18));
}
for (const e of EXAMPLES) { const r = sortLoss(e.input); console.log("ex ", e.id, "deducted", r.deducted, "held", r.gates.map((g) => g.held).join("/"), "coin", coinValue(r.loss, 18)); }
process.exit(bad ? 1 : 0);
