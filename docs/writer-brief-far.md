# Brief for writing new CPA FAR practice questions

You are writing practice questions for a study app used by one accountant preparing for the CPA exam's Financial Accounting and Reporting (FAR) section. There is no paid review course behind this bank, so it is the main source. A wrong answer key teaches a wrong rule. Accuracy beats volume: if you cannot confirm a rule, write a different question.

Read first:
- /home/claude/far-blueprint.txt (the FAR section of the AICPA's 2026 blueprint, effective January 2026). Its "Section assumptions" paragraph, its References list and the representative tasks for your area are the scope.
- /home/claude/far-sources/ (FASB Concepts Statements, Accounting Standards Updates (ASUs), GASB Statements and AU-C 800, uploaded by the owner). These are the primary sources for this section. Read the files your area needs before writing.
- /home/claude/questions.json (the existing bank; do NOT duplicate a concept already tested there, and match its JSON format exactly). Questions tagged with your FAR area are already in the app; write what they don't cover.

## Three rules from the blueprint
- **Default entity.** The blueprint says each question applies to a for-profit business entity reporting under U.S. GAAP unless the fact pattern says otherwise. A not-for-profit question must say "not-for-profit" or "nongovernmental, not-for-profit". A government question must say "local government", "state", "municipality" or "city". Never mix IFRS into a key; IFRS is not in the 2026 FAR References.
- **Stay inside the References.** Eligible sources are the FASB Accounting Standards Codification, FASB Concepts Statements, the GASB Codification and GASB Statements, the Securities Exchange Act of 1934, Regulation S-X (17 CFR 210), Regulation S-K (17 CFR 229), and AU-C 800 (special purpose frameworks). Government content is foundational only: measurement focus, basis of accounting and which fund records an activity. Don't write government-wide reconciliations, GASB pension or lease measurement, or budgetary entries.
- **Lessees only.** Leases are tested from the lessee side. Don't write lessor questions.

## Timing and new standards
Key the Codification as amended by ASUs issued through December 31, 2025. Do not write a question whose answer differs between a standard in effect and one that has been issued but is not yet effective for all entities (for example, ASU 2024-03 on expense disaggregation, and ASU 2023-09 on income tax disclosures for entities other than public business entities). If a recent ASU changed the rule, either write to the part both versions share or write a different question. Put a year-end date in every stem where timing matters.

## What to cover
Stay inside the area your task names. The blueprint's groups by area:
- **Area I, Financial Reporting (30 to 40%).** A. For-profit general-purpose statements: classified balance sheet, single-step and multi-step income statement including discontinued operations and foreign currency transaction gains and losses, other comprehensive income items, changes in equity, indirect-method cash flows, consolidation eliminations and noncontrolling interests, and notes. B. Nongovernmental not-for-profit statements: financial position, activities with and without donor restrictions and releases, expenses by nature and function, and cash flows. C. State and local government concepts: measurement focus, basis of accounting and the purpose of each fund type. D. Public company reporting: the purpose of Forms 10-Q, 10-K and 8-K; Form 10-Q Part I Items 1 to 3 and Form 10-K Part II Items 7, 7A and 8; basic and diluted earnings per share with options, preferred stock, convertible preferred and convertible debt. E. Special purpose frameworks: statement titles, cash or modified cash to accrual conversions, and income tax basis statements. F. Ratios and performance metrics, and budget-to-actual variances.
- **Area II, Select Balance Sheet Accounts (30 to 40%).** A. Cash and cash equivalents and bank reconciliations. B. Trade receivables: credit loss and returns allowances, transfers (secured borrowing, factoring, assignment, pledging) and rollforwards. C. Inventory: costing methods, lower of cost and net realizable value and lower of cost or market (LIFO and retail), rollforwards. D. Property, plant and equipment: cost, capitalized interest, depreciation, impairment, disposals and nonmonetary exchanges. E. Investments: financial assets at fair value, at amortized cost, and equity method. F. Intangible assets, mainly finite-lived. G. Payables and accrued liabilities. H. Debt: notes and bonds payable, effective interest amortization, extinguishment, and debt covenant calculations. I. Equity: issuance, stock dividends, splits and treasury stock.
- **Area III, Select Transactions (25 to 35%).** A. Accounting changes and error corrections. B. Contingencies and commitments. C. Revenue recognition: the five-step model, and contributions received by not-for-profit entities (conditional versus unconditional, restricted versus unrestricted). D. Income taxes: temporary versus permanent differences, deferred tax assets and liabilities, valuation allowances. E. Fair value measurement and the fair value hierarchy. F. Lessee accounting: classification, initial measurement of the right-of-use asset and lease liability, and finance versus operating expense patterns. G. Subsequent events: recognized versus nonrecognized.

The blueprint tests FAR at Remembering and Understanding, Application and Analysis, with Application the largest share (45 to 55%) and Area II the heaviest in analysis. At least two thirds of your questions should be fact patterns with a computation, a journal entry, or a reconciliation, not recall.

## Verification (required)
Confirm every rule from a primary source. Use the files in /home/claude/far-sources/ first: an ASU quotes the Codification paragraphs it adds or amends, and the Concepts Statements give definitions. For SEC questions use law.cornell.edu: 17 CFR 210 (Regulation S-X), 17 CFR 229 (Regulation S-K, Items 303 and 305 for Form 10-K Items 7 and 7A), and 15 U.S.C. 78m for Exchange Act reporting. Cite the Codification paragraph through the ASU that states it, for example "ASC 842-20-30-1, as stated in ASU 2016-02", or the GASB Statement and paragraph, for example "GASB Statement 34, para. 16". A current accounting textbook is a listed Reference, so OpenStax Principles of Accounting (openstax.org) may support a mechanical procedure such as a bank reconciliation layout, but never as the only source for a recognition or measurement rule. Prep-course blogs and Wikipedia do not count. If no file in far-sources supports a rule, don't write that question; list the gap in your reply.

## Question quality
- 4 choices, exactly one defensibly correct. Distractors should be errors a candidate actually makes: using the stated rate where the effective rate belongs, recording a conditional contribution as revenue, treating a nonrecognized subsequent event as recognized, forgetting the noncontrolling interest's share, using straight-line amortization for a bond premium.
- Mix formats like the real exam: direct questions, incomplete sentences, and some "All of the following EXCEPT".
- Stems must contain every fact needed: entity type, dates, year-end, rates (stated and market), useful lives, salvage values, tax rates, fair values and any elections. No trick wording.
- Spread across the groups in your area; don't cluster.
- "explain": 2 to 3 plain sentences: why the key is right and why the most tempting wrong choice is wrong. Show the arithmetic.
- Writing style: plain English. No em dashes, no ampersands. Use "and".
- Abbreviations: spell out each one the first time a question uses it, as "net realizable value (NRV)", then use the short form. Every card stands alone and its choices are shuffled, so a term the stem doesn't define is spelled out in each choice that uses it. Run `python3 tools/abbrev.py <file>` to check.

## Output
Write ONLY a JSON array of question objects to the output file named in your task, with these fields:
- "id": "far" plus the area number ("far1-" to "far3-") plus a three-digit number in the range your task gives you.
- "part": "FAR". "domain": the area tag, "FAR-I" to "FAR-III". "exam": "cpa". "cpa": [the same tag].
- "group": the blueprint group letter within the area.
- "q", "choices", "answer" (0-based index into "choices"), "explain", "source", as in questions.json.

Validate that the file parses with python3 before finishing. Then reply with the count per group, and a short list of any rules you could not confirm from a primary source (there should be none in the file).
