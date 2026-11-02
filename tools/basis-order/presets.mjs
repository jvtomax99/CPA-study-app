// Facts from the question bank (src/questions.json). Each must reproduce the bank's answer.
export const PRESETS = [
  { id: "p2d1b-024", name: "Ray", answer: 8000,
    input: { stock: 20000, debt: 0, debtFace: 0, income: 5000, distributions: 15000, nondeductible: 2000, loss: 12000, election: false },
    note: "No debt basis and no election. The $10,000 choice is what the election would give." },
  { id: "p2d1b-023", name: "Jo", answer: 18000,
    input: { stock: 10000, debt: 8000, debtFace: 8000, income: 0, distributions: 0, nondeductible: 0, loss: 30000, election: false },
    note: "Her $8,000 direct loan is debt basis. Her guarantee of the bank loan adds nothing until she pays on it." },
];
// Made-up cases, not from the bank. expect is checked by test.mjs.
export const EXAMPLES = [
  { id: "ex-election", name: "Ray, with the election",
    input: { ...PRESETS[0].input, election: true },
    expect: { deducted: 10000, suspended: 2000, ndCarried: 2000, end: { stock: 0, debt: 0 } },
    note: "Made-up variation. Losses go before nondeductibles, and the $2,000 of nondeductibles waits for next year." },
  { id: "ex-restore", name: "Debt basis restored",
    input: { stock: 0, debt: 4000, debtFace: 10000, income: 9000, distributions: 2000, nondeductible: 0, loss: 0, election: false },
    expect: { restored: 6000, gain: 0, end: { stock: 1000, debt: 10000 } },
    note: "Made-up case. Earlier losses cut her $10,000 loan's basis to $4,000. The $7,000 net increase restores the loan first, and $1,000 stays in stock." },
  { id: "ex-gain", name: "Distribution over basis",
    input: { stock: 3000, debt: 5000, debtFace: 5000, income: 1000, distributions: 6000, nondeductible: 0, loss: 0, election: false },
    expect: { gain: 2000, end: { stock: 0, debt: 5000 } },
    note: "Made-up case. Distributions never touch debt basis, so the $2,000 over stock basis is capital gain." },
];
