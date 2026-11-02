// Facts from the question bank (src/questions.json). Each must reproduce the bank's answer.
export const PRESETS = [
  { id: "p2d1a-018", name: "Sam, partner", answer: 8000, input: { loss: 12000, passThrough: true, basis: 8000, atRisk: null, passive: false, passiveIncome: 0, joint: false, otherBusinessIncome: 0 },
    note: "Basis $8,000 includes his share of partnership liabilities. The question asks for the basis limit only." },
  { id: "p2d1b-023", name: "Jo, S corp", answer: 18000, input: { loss: 30000, passThrough: true, basis: 18000, atRisk: null, passive: false, passiveIncome: 0, joint: false, otherBusinessIncome: 0 },
    note: "Stock basis $10,000 plus debt basis $8,000. Her guarantee of the bank loan adds nothing until she pays on it." },
  { id: "p2d1b-024", name: "Ray, S corp", answer: 8000, input: { loss: 12000, passThrough: true, basis: 8000, atRisk: null, passive: false, passiveIncome: 0, joint: false, otherBusinessIncome: 0 },
    note: "Basis $8,000 is after the ordering rule: $20,000 + $5,000 gain - $15,000 distribution - $2,000 nondeductible expenses." },
  { id: "p2d2a-006", name: "Ken, Schedule C", answer: 50000, input: { loss: 70000, passThrough: false, basis: 0, atRisk: 50000, passive: false, passiveIncome: 0, joint: false, otherBusinessIncome: 0 },
    note: "A sole proprietor has no basis gate. At risk: $20,000 cash plus the $30,000 recourse loan. The nonrecourse seller note is not at risk." },
];
// Made-up cases to show the last two gates. Not from the bank.
export const EXAMPLES = [
  { id: "ex-passive", name: "Example: passive investor", input: { loss: 20000, passThrough: true, basis: 40000, atRisk: 40000, passive: true, passiveIncome: 5000, joint: false, otherBusinessIncome: 0 },
    note: "Made-up case. A limited partner who does not materially participate, with $5,000 of passive income from another activity." },
  { id: "ex-ebl", name: "Example: excess business loss", input: { loss: 900000, passThrough: true, basis: 1000000, atRisk: 1000000, passive: false, passiveIncome: 0, joint: true, otherBusinessIncome: 0 },
    note: "Made-up case. Joint filers who materially participate, with no other business income. The $274,000 excess becomes an NOL carryover." },
];
