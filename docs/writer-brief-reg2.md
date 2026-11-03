# Brief for writing new CPA REG Area II (Business Law) practice questions

You are writing practice questions for a study app used by one accountant preparing for the CPA exam's Regulation (REG) section. There is no paid review course behind this bank, so it is the main source. A wrong answer key teaches a wrong rule. Accuracy beats volume: if you cannot confirm a rule, write a different question.

Read first:
- /home/claude/CPA_Exam_Blueprints_2026.pdf, REG Area II (Business Law, 15 to 25% of REG). The 2026 blueprint took effect January 2026.
- /home/claude/questions.json (the existing bank; do NOT duplicate a concept already tested there, and match its JSON format exactly). Some Area II group D topics (employment taxes, worker classification, the premium tax credit) are already covered as tax questions. Write the legal side of them, not the tax computations again.

## What to cover
Area II has five groups. Stay inside the groups your task lists.
- A. Agency: actual (express and implied) and apparent authority, ratification; duties an agent owes the principal and the principal owes the agent; liability of principal and agent to third parties, including disclosed, partially disclosed and undisclosed principals, and respondeat superior.
- B. Contracts: formation (offer, acceptance, consideration, capacity, legality), contract types (bilateral and unilateral, express and implied, void, voidable and unenforceable), statute of frauds, performance and discharge, breach and remedies. Know when the common law governs (services, real estate) and when Uniform Commercial Code (UCC) Article 2 governs (sale of goods), and test the differences: mirror image rule versus 2-207, firm offers, modification without consideration, perfect tender and cure.
- C. Debtor-creditor: rights of debtors, creditors and guarantors (sureties), including the surety's defenses and rights of reimbursement, subrogation and contribution; distribution in bankruptcy (secured claims, then priority claims under 11 U.S.C. 507, then general unsecured); secured versus unsecured creditors; attachment and perfection of a security interest under UCC Article 9 (filing, possession, control, automatic perfection of a purchase-money security interest in consumer goods) and priority among creditors.
- D. Federal laws: types of bankruptcy (Chapters 7, 11 and 13; voluntary and involuntary petitions), the automatic stay, preferences and fraudulent transfers, discharge, debts that are not discharged and grounds to deny a discharge; federal employment tax law (who must withhold and pay, trust fund recovery); qualified health plans, the employer mandate and the premium tax credit; employee versus independent contractor; foreign anti-bribery law under the Foreign Corrupt Practices Act (FCPA).
- E. Business structure: formation, operation and termination of general and limited partnerships, limited liability partnerships, limited liability companies (LLCs) and corporations; their legal characteristics (liability shield, piercing the corporate veil, transferability); rights, duties and authority of owners, managers, directors and officers (fiduciary duties, the business judgment rule, shareholder rights).

The blueprint says Area II is tested mainly at the Remembering and Understanding level, the lower end of its skill scale, and its representative tasks are "recall", "explain" and "identify ... given a specific scenario". Write about half as short fact patterns that ask which rule applies or what result follows, and half as direct recall. No computations.

## Which rule to key
The blueprint limits REG to its listed References. For business law those are the Revised Model Business Corporation Act, the Revised Uniform Partnership Act, the Revised Uniform Limited Partnership Act, the Uniform Commercial Code, the Bankruptcy Abuse Prevention and Consumer Protection Act of 2005, the Patient Protection and Affordable Care Act, the Foreign Corrupt Practices Act of 1977, and current business law textbooks. No uniform LLC act is listed, so keep LLC questions to traits every state shares.
Key the majority rule: the official text of the UCC, the federal statute, and the common-law rule most states follow. Do not key a minority rule or one state's variation. If a question turns on whether a party is a merchant, a consumer or an insider, the stem must say so.

## Verification (required)
Cite primary sources wherever one exists, and fetch it to confirm the rule:
- UCC official text: law.cornell.edu/ucc (Article 2 for sales, Article 9 for secured transactions). Cite as "UCC 2-205".
- Bankruptcy: title 11 of the U.S. Code on uscode.house.gov or law.cornell.edu/uscode. Cite as "11 U.S.C. 547(b)".
- FCPA: 15 U.S.C. 78dd-1 to 78dd-3 (anti-bribery) and 78m (books and records).
- Employment tax and worker status: the IRC (sections 3101, 3111, 3301, 3402, 6672), IRS Pub 15 and Pub 15-A (2025), Rev. Rul. 87-41.
- Health coverage: IRC 4980H (employer mandate), 36B (premium tax credit), 5000A (individual mandate; the penalty amount is $0 since 2019).
- Common-law rules with no statute (most of agency, common-law contracts, suretyship, partnership and corporate fiduciary duties): cite the Cornell Legal Information Institute's Wex entry (law.cornell.edu/wex) for the rule. Wex is a secondary source; the blueprint's own References include current business law textbooks, which is the role Wex plays here. Use it only for long-settled rules that every summary states the same way. Name a Restatement section only if a free source you fetched quotes that section.
- Revised Uniform Partnership Act, Revised Uniform Limited Partnership Act and the Model Business Corporation Act: uniformlaws.org is blocked from this environment. Cite the rule through Wex, or through a state statute that adopts the uniform text if you can fetch it, and say which in "source".
Prep-course blogs, law firm marketing pages and Wikipedia do not count.

Avoid questions keyed on a dollar figure that is adjusted for inflation (for example the bankruptcy dollar thresholds in 11 U.S.C. 104, which were last adjusted April 1, 2025). Testing that a threshold exists or what it applies to is fine. Avoid rules that changed recently or where the courts are split.

## Question quality
- 4 choices, exactly one defensibly correct. Distractors should be errors a candidate actually makes: applying the common-law rule to a sale of goods, mixing up apparent and implied authority, using the insider look-back period for a non-insider, treating a guarantor as released by a change that does not release it.
- Mix formats like the real exam: direct questions, incomplete sentences, and some "All of the following EXCEPT".
- Stems must contain every fact needed (dates, whether a party is a merchant, whether a writing was signed, how the security interest was perfected). No trick wording.
- Spread across the subtopics in your groups; don't cluster.
- "explain": 2 to 3 plain sentences: why the key is right and why the most tempting wrong choice is wrong. Name the rule, not just the citation.
- "source": the source(s) you confirmed, e.g. "UCC 2-207(2)" or "11 U.S.C. 547(b), (c)(2)" or "Cornell LII Wex, apparent authority".
- Writing style: plain English. No em dashes, no ampersands. Use "and".
- Abbreviations: spell out each one the first time a question uses it, as "purchase-money security interest (PMSI)", then use the short form. Every card stands alone and its choices are shuffled, so a term the stem doesn't define is spelled out in each choice that uses it. Run `python3 tools/abbrev.py` to check; `--fix` spells them out for you.

## Output
Write ONLY a JSON array of question objects to the output file named in your task, with these fields:
- "id": "reg2-" plus a three-digit number in the range your task gives you.
- "part": "REG". "domain": "REG-II". "exam": "cpa". "cpa": ["REG-II"].
- "group": the blueprint group letter, "A" to "E".
- "q", "choices", "answer" (0-based index into "choices"), "explain", "source", as in questions.json.

Validate that the file parses with python3 before finishing. Then reply with: the count per group, and a short list of any rules you could not confirm from a source above (there should be none in the file).
