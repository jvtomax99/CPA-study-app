import { orderBasis } from "./model.mjs";
import { PRESETS, EXAMPLES } from "./presets.mjs";
import { readFileSync } from "node:fs";
// Run from the repo root: node tools/basis-order/test.mjs  (bank cases against the bank's answer, examples against their stated results)
const bank = Object.fromEntries(JSON.parse(readFileSync(process.argv[2] || "src/questions.json", "utf8")).map((q) => [q.id, q]));
const money = (s) => Number((s.match(/\$([\d,]+)/) || [])[1]?.replace(/,/g, ""));
let bad = 0;
const report = (ok, ...rest) => { if (!ok) bad++; console.log(ok ? "ok " : "BAD", ...rest); };
for (const p of PRESETS) {
  const r = orderBasis(p.input), q = bank[p.id], said = money(q.choices[q.answer]);
  report(r.deducted === p.answer && said === p.answer, p.id, "deducts", r.deducted, "bank says", q.choices[q.answer], "suspended", r.suspended, "end", JSON.stringify(r.end));
}
const matches = (want, got) => Object.entries(want).every(([k, v]) => (typeof v === "object" ? matches(v, got[k]) : got[k] === v));
for (const e of EXAMPLES) { const r = orderBasis(e.input); report(matches(e.expect, r), e.id, JSON.stringify({ deducted: r.deducted, suspended: r.suspended, gain: r.gain, restored: r.restored, ndCarried: r.ndCarried, end: r.end })); }
process.exit(bad ? 1 : 0);
