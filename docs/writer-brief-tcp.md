# Brief for writing new CPA TCP practice questions

You are writing practice questions for a study app used by one accountant preparing for the CPA exam's Tax Compliance and Planning (TCP) section. There is no paid review course behind this bank, so it is the main source. A wrong answer key teaches a wrong rule. Accuracy beats volume: if you cannot confirm a rule, write a different question.

Read first:
- /home/claude/tcp-blueprint.txt (the TCP section of the AICPA's 2026 blueprint, effective January 2026). Its "Section assumptions" paragraph and the representative tasks for your area are the scope.
- /home/claude/questions.json (the existing bank; do NOT duplicate a concept already tested there, and match its JSON format exactly). Questions tagged with your TCP area are already in the app; write what they don't cover.

## Two rules from the blueprint
- **No inflation-indexed figures.** The blueprint says candidates "will not be tested on their knowledge of specific tax rate percentages, amounts or limitations that are indexed to inflation." Never key an answer on recalling an indexed amount: the standard deduction, bracket thresholds, contribution limits, the gift tax annual exclusion, the Section 179 limit, the small business gross receipts test, and the like. If a question needs one, give it in the stem. Statutory figures that are not indexed (the 21% corporate rate, the $50,000 Section 1244 loss limit ($100,000 on a joint return), the 20% accuracy penalty) may be keyed.
- **Timing.** The blueprint says that where tax treatment depends on timing, the question gives clear dates, and that candidates otherwise apply current law under the CPA Exam Policy on New Pronouncements. This bank keys tax year 2025 law as amended through December 31, 2025, including P.L. 119-21. Put a 2025 date in every stem where timing matters. Do not write a question whose answer differs between 2025 law and law effective in 2026; write a different question instead.

## What to cover
Stay inside the area your task names. The blueprint's representative tasks by area:
- **Area I, Individuals and Personal Financial Planning (30 to 40%).** A. Nonroutine compliance and planning: incentive compensation, timing income and deductions, estimated tax safe harbors. B. Passive activity and at-risk limits. C. Gift tax compliance and planning, including the donee's basis. D. Personal financial planning: retirement accounts and distributions, education funding, insurance. Routine compliance (filing status, dependents, the standard deduction, basic credits) belongs to REG; don't write it here.
- **Area II, Entity Tax Compliance (30 to 40%).** A. C corporations: net operating losses, consolidated returns, international sourcing as general concepts, and noncash transactions with owners. B. S corporations: noncash contributions and distributions and owner basis. C. Partnerships: elections such as Section 754, and the effects of ownership changes. D. Trusts: types, distributable net income, and allocating between income and corpus. E. Tax-exempt organizations: obtaining and keeping exempt status, and unrelated business income.
- **Area III, Entity Tax Planning (10 to 20%).** A. Formation and liquidation: the tax effects of forming and liquidating each entity type compared side by side, and which entity fits a set of legal characteristics. B. C corporations: using net operating loss and capital loss carryovers, the effect of changing rates on timing income and deductions, estimated tax payments that avoid the underpayment penalty, and shareholder-corporation transactions in noncash property. State and local apportionment questions must give every apportionment factor in the stem. C. S corporations: built-in gains tax on a proposed sale, terminating the election, shareholder loans and repayments, and the election to distribute from accumulated earnings and profits before the accumulated adjustments account. D. Partnerships: contributing appreciated or depreciated property, guaranteed payments and nonliquidating distributions, and selling a partnership interest.
- **Area IV, Property Transactions (10 to 20%).** A. Like-kind exchanges and involuntary conversions: realized, recognized and deferred gain, and the basis of what is received. B. Character of gains and losses: Section 1231 netting and the five-year lookback, Section 1245 and 1250 recapture, unrecaptured Section 1250 gain, Section 1244 losses, and installment sales. C. Related parties: who is related, attribution of stock and partnership ownership, a later sale to an outsider of property bought from a related party, and imputed interest. Imputed interest questions must give the applicable federal rate in the stem.

The blueprint concentrates Remembering and Understanding in Areas I and II, so Areas III and IV lean on application and analysis. At least two thirds of your questions should be fact patterns with a computation or a planning comparison, not recall.

## Verification (required)
Confirm every rule from a primary source with WebSearch or WebFetch: the Internal Revenue Code (law.cornell.edu/uscode or uscode.house.gov), Treasury Regulations (ecfr.gov), and IRS publications and form instructions for 2025 (irs.gov), such as Pub 544 (sales and other dispositions), Pub 541 (partnerships), Pub 542 (corporations), Pub 537 (installment sales), and the Form 1120-S, 1065, 4797, 8824 and 6252 instructions. Cite the Code section, for example "IRC 1031(d); Treas. Reg. 1.1031(d)-2". Prep-course blogs and Wikipedia do not count.

## Question quality
- 4 choices, exactly one defensibly correct. Distractors should be errors a candidate actually makes: using fair market value where basis belongs, forgetting boot, netting Section 1231 without the lookback, applying corporate rules to a partnership.
- Mix formats like the real exam: direct questions, incomplete sentences, and some "All of the following EXCEPT".
- Stems must contain every fact needed: the entity type, dates, bases, fair market values, holding periods and any elections. No trick wording.
- Spread across the subtopics in your area; don't cluster.
- "explain": 2 to 3 plain sentences: why the key is right and why the most tempting wrong choice is wrong. Show the arithmetic.
- Writing style: plain English. No em dashes, no ampersands. Use "and".
- Abbreviations: spell out each one the first time a question uses it, as "accumulated adjustments account (AAA)", then use the short form. Every card stands alone and its choices are shuffled, so a term the stem doesn't define is spelled out in each choice that uses it. Run `python3 tools/abbrev.py <file>` to check.

## Output
Write ONLY a JSON array of question objects to the output file named in your task, with these fields:
- "id": "tcp" plus the area number ("tcp1-" to "tcp4-") plus a three-digit number in the range your task gives you.
- "part": "TCP". "domain": the area tag, "TCP-I" to "TCP-IV". "exam": "cpa". "cpa": [the same tag].
- "group": the blueprint group letter within the area.
- "q", "choices", "answer" (0-based index into "choices"), "explain", "source", as in questions.json.

Validate that the file parses with python3 before finishing. Then reply with the count per group, and a short list of any rules you could not confirm from a primary source (there should be none in the file).
