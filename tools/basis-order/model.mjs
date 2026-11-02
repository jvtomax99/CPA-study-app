// S corporation shareholder basis for one year, in the order Form 7203 (Rev. 12-2022) and Treas. Reg. 1.1367-1(f) apply it.
// 1 Income raises stock basis (lines 3-5).
// 2 Distributions come off stock only (lines 6-7). Any excess over stock basis is gain, IRC 1368(b)(2). Assumes no accumulated E&P.
// 3 Nondeductible expenses, then 4 losses, come off stock and then debt (Reg. 1.1367-1(f)(3)-(4), 1.1367-2(b)).
//   The Reg. 1.1367-1(g) election swaps 3 and 4. Without it, nondeductibles over stock plus debt basis are gone; with it they carry forward.
// 5 A net increase (income minus distributions, nondeductibles and losses) restores earlier reductions of debt basis
//   before it stays in stock (Reg. 1.1367-2(c)(1); Form 7203 line 12 and line 23 instructions). One loan only.
export function orderBasis(input) {
  const n = (k) => Math.max(0, Number(input[k]) || 0);
  const face = n("debtFace"), income = n("income"), dist = n("distributions"), nd = n("nondeductible"), loss = n("loss");
  let stock = n("stock"), debt = Math.min(n("debt"), face);
  const start = { stock, debt }, steps = [];
  const mark = (step) => steps.push({ ...step, stock, debt });

  stock += income;
  mark({ key: "income", amount: income, toStock: income });

  const offStock = Math.min(dist, stock); stock -= offStock;
  mark({ key: "distributions", amount: dist, fromStock: offStock, fromDebt: 0, over: dist - offStock });

  const take = (key, amount) => {
    const s = Math.min(amount, stock); stock -= s;
    const d = Math.min(amount - s, debt); debt -= d;
    mark({ key, amount, fromStock: s, fromDebt: d, over: amount - s - d });
  };
  for (const key of input.election ? ["loss", "nondeductible"] : ["nondeductible", "loss"]) take(key, key === "loss" ? loss : nd);

  const net = income - dist - nd - loss;
  const restore = net > 0 ? Math.min(net, face - debt) : 0;
  stock -= restore; debt += restore;
  mark({ key: "restore", amount: restore, net });

  const step = (k) => steps.find((s) => s.key === k);
  const L = step("loss"), N = step("nondeductible");
  return {
    start, steps, end: { stock, debt },
    gain: step("distributions").over,
    deducted: L.fromStock + L.fromDebt, suspended: L.over,
    ndCarried: input.election ? N.over : 0, ndLost: input.election ? 0 : N.over,
    restored: restore,
  };
}
