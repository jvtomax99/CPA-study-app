# Brief for writing new CPA AUD practice questions

You are writing practice questions for a study app used by one accountant preparing for the CPA exam's Auditing and Attestation (AUD) section. There is no paid review course behind this bank, so it is the main source. A wrong answer key teaches a wrong rule. Accuracy beats volume: if you cannot confirm a rule, write a different question.

Read first:
- /home/claude/aud-blueprint.txt (the AUD section of the AICPA's 2026 blueprint, effective January 2026). Its "Section assumptions" paragraph, its References list and the representative tasks for your area are the scope.
- /home/claude/questions.json (the existing bank; do NOT duplicate a concept already tested there, and match its JSON format exactly). Questions tagged with your AUD area are already in the app; write what they don't cover.
- The source folder your task names. It holds the standards as PDFs the owner downloaded with their own AICPA login. Read them with `pdftotext`. Do not copy them anywhere else, and do not quote more than a sentence from any of them in a question.

## Three rules from the blueprint
- **Name the entity and the engagement.** The blueprint says that where requirements differ, the question names the entity type ("an audit of an issuer", "an audit of a nonissuer"), and it names other engagements as "review engagement", "compilation engagement", "examination", "agreed-upon procedures" and so on. Every stem must say which. Key nonissuer audits to the AICPA standards (AU-C), issuer audits to the PCAOB standards (AS), and attestation, review and compilation work to AT-C and AR-C. A question that would have different answers under AU-C and AS must say which one applies.
- **Use the right word for the role.** The blueprint uses "auditor" for audits, "practitioner" for attestation engagements and "accountant" for review, compilation and preparation engagements. Use the same words.
- **Only the listed References.** The blueprint limits AUD to its References: the SASs, PCAOB standards and ethics and independence rules, GAO Government Auditing Standards (the Yellow Book), the Single Audit Act, 2 CFR 200, the SQMSs, SSARSs, SSAEs, AICPA Audit and Accounting Guides, the AICPA Code of Professional Conduct, Titles III and IV of the Sarbanes-Oxley Act, 29 CFR 2509.75-9 (Department of Labor independence), SEC independence rules, COSO's Internal Control Integrated Framework, and current textbooks. Do not test anything outside them.

## Timing
Key the current codified text in the source PDFs. Some standards in them took effect for periods or engagements beginning on or after December 15, 2025 (SAS No. 146, SSAE No. 23), so a December 31, 2025 year-end still used the earlier wording: write questions whose answer is the same under both. Others are codified but not yet effective: SAS No. 149 on group audits (section 600; the current text is kept as 600A until December 15, 2026), SAS No. 150 on confirmations (in the appendixes of section 505 until 2028), and SAS No. 151 on fraud, which is not in the PDF yet, so keep fraud questions to basics. Before keying any rule, check its effective date in the source. Do not write a question whose answer differs between a standard now in force and a superseded one still in use, or one that takes effect in 2026 or 2027 (quality management and the 2024 Yellow Book revision are the likely traps); write a different question instead. Put a date in the stem wherever timing matters, such as subsequent events, report dates and documentation deadlines.

## What to cover
Stay inside the area your task names. The blueprint's groups by area:
- **Area I, Ethics, Professional Responsibilities and General Principles (15 to 25%).** A. Ethics and independence: the AICPA Code (principles, rules, interpretations, both conceptual frameworks), SEC and PCAOB independence and ethics, GAO independence, and Department of Labor independence for employee benefit plan audits. B. Professional skepticism and judgment, including auditor biases. C. Nature and scope of audits (issuer and nonissuer), Yellow Book engagements and single audits, attestation and accounting and review services engagements. D. Preconditions for an engagement and terms of engagement. E. Engagement documentation. F. Communicating planned scope and timing, and internal control deficiencies, to management and those charged with governance. G. Engagement quality and the firm's quality management.
- **Area II, Assessing Risk and Developing a Planned Response (25 to 35%).** A. Overall strategy and the engagement plan. B. Understanding the entity and its environment, including external factors (supply and demand, elasticity, marginal cost and revenue). C. COSO, the control environment, entity-level and IT general controls, business processes and controls, service organizations (SOC 1 versus SOC 2, using a SOC 1 Type 2 report), limits of controls and management override. D. Materiality for the statements as a whole, and tolerable misstatement and performance materiality. E. Assessing and responding to the risks of material misstatement, whether due to fraud or error, at the statement and assertion levels. F. Using the work of others: internal audit, specialists, component auditors and referred-to auditors. G. Specific risk areas: compliance with laws and regulations, accounting estimates, related parties, and when a single audit is required.
- **Area III, Performing Further Procedures and Obtaining Evidence (30 to 40%).** A. Requesting, transforming and validating data, and data analytics. B. Sufficient appropriate evidence. C. Sampling: choosing the population and method, and projecting results. D. Tests of controls and tests of details, analytical procedures, external confirmations. E. Special matters: estimates, investments in securities, inventory, litigation, claims and assessments, going concern, and single audit compliance testing. F. Summarizing misstatements and evaluating control deficiencies. G. Written representations. H. Subsequent events and subsequently discovered facts.
- **Area IV, Forming Conclusions and Reporting (10 to 20%).** A. Audit reports: opinion types, emphasis-of-matter and other-matter paragraphs, and integrated audits of internal control. B. Attestation reports: examinations, reviews, agreed-upon procedures. C. Preparation, compilation and review engagements. D. Reporting on compliance. E. Comparatives and consistency, other information, interim reviews, supplementary information, Yellow Book and single audit reports, special-purpose frameworks.

The blueprint concentrates Remembering and Understanding in Areas I and IV, and Analysis and Evaluation in Areas II and III. For Areas II and III, at least two thirds of your questions should be fact patterns that make the candidate assess a risk, choose a procedure, evaluate evidence or compute something (materiality, a sample projection, an analytical expectation). For Areas I and IV, about half can be direct recall.

## Verification (required)
Confirm every rule from a primary source and cite it by paragraph:
- AICPA standards from the PDFs in your source folder: "AU-C 705.08", "AT-C 215.35", "AR-C 80.17", "SQMS 1.30", "ET 1.295.010". Use the paragraph number printed in the standard, not a page number.
- PCAOB standards, ethics and independence rules (pcaobus.org), cited as "AS 2201.62" or "PCAOB Rule 3523".
- SEC independence: 17 CFR 210.2-01 (law.cornell.edu/cfr). Sarbanes-Oxley Titles III and IV: 15 U.S.C. 7241 to 7266 (law.cornell.edu/uscode).
- Single audits: 2 CFR 200 subpart F (law.cornell.edu/cfr), cited as "2 CFR 200.501(a)", and 31 U.S.C. 7501 to 7507.
- Yellow Book: GAO-24-106786 (gao.gov), cited as "GAS 3.21". Department of Labor: 29 CFR 2509.75-9.
- COSO: cite the principle number. Economics: an open textbook such as OpenStax Principles of Economics.
If a source is not in your folder and its website will not load, do not write that question. Prep-course blogs, firm summaries and Wikipedia do not count.

## Question quality
- 4 choices, exactly one defensibly correct. Distractors should be errors a candidate actually makes: applying a PCAOB rule to a nonissuer, confusing a review with a compilation, picking a qualified opinion where the misstatement is pervasive, treating a nonresponse to a positive confirmation as evidence.
- Mix formats like the real exam: direct questions, incomplete sentences, and some "All of the following EXCEPT".
- Stems must contain every fact needed: the entity type, the engagement type, the framework, dates, amounts and benchmarks. Give materiality benchmarks and percentages in the stem; the standards don't set them. No trick wording.
- Spread across the groups in your area; don't cluster.
- "explain": 2 to 3 plain sentences: why the key is right and why the most tempting wrong choice is wrong. Show any arithmetic.
- Writing style: plain English. No em dashes, no ampersands. Use "and".
- Abbreviations: spell out each one the first time a question uses it, as "tolerable misstatement (TM)", then use the short form. Every card stands alone and its choices are shuffled, so a term the stem doesn't define is spelled out in each choice that uses it. Run `python3 tools/abbrev.py <file>` to check.

## Output
Write ONLY a JSON array of question objects to the output file named in your task, with these fields:
- "id": "aud" plus the area number ("aud1-" to "aud4-") plus a three-digit number in the range your task gives you.
- "part": "AUD". "domain": the area tag, "AUD-I" to "AUD-IV". "exam": "cpa". "cpa": [the same tag].
- "group": the blueprint group letter within the area.
- "q", "choices", "answer" (0-based index into "choices"), "explain", "source", as in questions.json.

Validate that the file parses with python3 before finishing. Then reply with the count per group, and a short list of any rules you could not confirm from a primary source (there should be none in the file).
