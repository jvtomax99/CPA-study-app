// Loss limitation order for one pass-through or business loss, tax year 2025.
// Basis (IRC 1366(d) / 704(d)), then at-risk (465), then passive (469): Treas. Reg. 1.469-2T(d)(6).
// Then excess business loss (461(l)): Instructions for Form 461 (2025), "Ordering Rules".
// Thresholds: Rev. Proc. 2024-40, sec. 2.32 ($313,000; $626,000 joint).
export const THRESHOLD = { single: 313000, joint: 626000 };
export function sortLoss(input) {
  const loss = Math.max(0, input.loss || 0);
  const gates = [
    { key: "basis", on: !!input.passThrough, limit: input.basis },
    { key: "atRisk", on: input.atRisk !== null && input.atRisk !== undefined && input.atRisk !== "", limit: input.atRisk },
    { key: "passive", on: !!input.passive, limit: input.passiveIncome },
    { key: "ebl", on: true, limit: THRESHOLD[input.joint ? "joint" : "single"] + Math.max(0, input.otherBusinessIncome || 0) },
  ];
  let left = loss;
  for (const gate of gates) {
    const limit = gate.on ? Math.max(0, Number(gate.limit) || 0) : Infinity;
    gate.limit = limit;
    gate.in = left;
    gate.out = Math.min(left, limit);
    gate.held = left - gate.out;
    left = gate.out;
  }
  return { loss, gates, deducted: left, held: loss - left };
}
// A coin value that keeps the tallest stack at 25 coins or fewer.
export function coinValue(amount, most = 25) {
  const raw = Math.max(amount, 1) / most;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const step of [1, 2, 2.5, 5, 10]) if (step * exp >= raw) return step * exp;
  return 10 * exp;
}
