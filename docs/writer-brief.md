# Brief for writing new IRS SEE Part 1 practice questions

You are writing practice questions for an Enrolled Agent study app used by one accountant preparing for SEE Part 1. He has no paid review course, so this bank is his main source. A wrong answer key teaches him a wrong rule. Accuracy beats volume: if you cannot confirm a fact, write a different question.

Read first:
- /home/claude/outline-part1.md (official content outline and the tax-year rule)
- /home/claude/questions.json (the existing bank; do NOT duplicate any concept already tested there, and match its JSON format exactly)

## The tax-year rule
The exam window tests law as amended through Dec 31, 2025, for calendar year 2025. That INCLUDES P.L. 119-21 (signed July 4, 2025), which changed several 2025 figures retroactively (standard deduction, SALT cap, CTC, senior deduction, tips and overtime deductions, car loan interest, etc.). Never use 2024 or 2026 figures as the key. Wrong choices may use 2024/2026 figures as distractors.

## Verification (required)
For every dollar threshold, percentage, phaseout, date or count that depends on the year, confirm it from a primary source with WebSearch/WebFetch: irs.gov publications, form instructions (2025 versions), Rev. Procs (Rev. Proc. 2024-40 has most 2025 inflation figures), Notices, IRS newsroom pages on P.L. 119-21, the IRC (law.cornell.edu or uscode.house.gov), eCFR. Prep-course blogs and Wikipedia do not count. Long-settled rules (e.g. 2-of-5-year test) still need a correct cite but need not be re-fetched.
Avoid questions keyed on inflation-adjusted penalty dollar amounts. Avoid provisions whose 2025 treatment is unsettled or awaiting guidance.

## Question quality
- 4 choices, exactly one defensibly correct. Distractors should be plausible errors a candidate actually makes (prior-year figure, wrong phaseout, confusing two forms).
- Mix formats like the real exam: direct questions, incomplete sentences, and some "All of the following EXCEPT".
- At least a third should be applied scenarios with a computation or a fact pattern, not pure recall.
- Stems must contain every fact needed (filing status, age, AGI, dates). No trick wording.
- Spread across the outline subtopics for your areas; don't cluster.
- "explain": 2 to 3 plain sentences: why the key is right and why the most tempting wrong choice is wrong. Show the arithmetic for computations.
- "source": the primary source(s), e.g. "IRS Pub 590-B (2025); IRC 408(d)(3)".
- "cpa": CPA blueprint tags from this set only: REG-I (ethics/procedures), REG-III (property transactions), REG-IV (individuals), REG-V (entities), TCP-I (individuals/planning), TCP-II (entity compliance), TCP-III (entity planning), TCP-IV (property transactions).
- Writing style: plain English. No em dashes, no ampersands. Use "and".
- "part": 1. "answer": 0-based index into "choices".

## Output
Write ONLY a JSON array of question objects to the output file named in your task (same fields as questions.json: id, part, domain, q, choices, answer, explain, source, cpa). Validate it parses with python3 before finishing. Then reply with: the count per domain, and a short list of any facts you could not confirm from a primary source (there should be none in the file).
