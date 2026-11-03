"""Spell out abbreviations the first time each question uses them.

Every card stands alone (drills shuffle questions, and the choices on each card),
so "first use" is per card: the stem defines a term for its choices and explanation,
a choice defines a term only for itself, and the explanation counts a term as defined
if the stem or any choice defined it.

  python3 tools/abbrev.py            check src/questions.json, list undefined abbreviations, exit 1 if any
  python3 tools/abbrev.py --fix      rewrite src/questions.json with the terms spelled out
  python3 tools/abbrev.py IN [OUT]   check IN, or with --fix write the result to OUT
"""
import json, re, sys

# abbreviation: full term. A lowercase term is lowercased mid-sentence and capitalized
# at the start of a sentence; a capitalized term (a name) keeps its capitals.
GLOSSARY = {
    "AAA": "accumulated adjustments account",
    "ACTC": "additional child tax credit",
    "ADS": "alternative depreciation system",
    "AFSP": "Annual Filing Season Program",
    "AFTR": "Annual Federal Tax Refresher",
    "AGI": "adjusted gross income",
    "ALE": "applicable large employer",
    "AMT": "alternative minimum tax",
    "AMTI": "alternative minimum taxable income",
    "AOTC": "American opportunity tax credit",
    "ATI": "adjusted taxable income",
    "BBA": "Bipartisan Budget Act of 2015",
    "BSA": "Bank Secrecy Act",
    "CAF": "Centralized Authorization File",
    "CAMT": "corporate alternative minimum tax",
    "CAP": "Collection Appeals Program",
    "CCC": "Commodity Credit Corporation",
    "CDP": "collection due process",
    "CE": "continuing education",
    "CFR": "Code of Federal Regulations",
    "CNC": "currently not collectible",
    "COD": "cancellation of debt",
    "CSED": "collection statute expiration date",
    "CTC": "child tax credit",
    "DNI": "distributable net income",
    "DRD": "dividends received deduction",
    "DSUE": "deceased spousal unused exclusion",
    "EA": "enrolled agent",
    "EFIN": "electronic filing identification number",
    "EIC": "earned income credit",
    "EIN": "employer identification number",
    "EITC": "earned income tax credit",
    "ERO": "electronic return originator",
    "FBAR": "Report of Foreign Bank and Financial Accounts",
    "FICA": "Federal Insurance Contributions Act",
    "FinCEN": "Financial Crimes Enforcement Network",
    "FMV": "fair market value",
    "FOIA": "Freedom of Information Act",
    "FTC": "Federal Trade Commission",
    "FUTA": "Federal Unemployment Tax Act",
    "HDHP": "high deductible health plan",
    "HOH": "head of household",
    "HSA": "health savings account",
    "IP PIN": "Identity Protection Personal Identification Number",
    "IRA": "individual retirement arrangement",
    "IRC": "Internal Revenue Code",
    "IRD": "income in respect of a decedent",
    "IRM": "Internal Revenue Manual",
    "ISO": "incentive stock option",
    "ITIN": "individual taxpayer identification number",
    "LLC": "limited liability company",
    "LPA": "licensed public accountant",
    "MACRS": "modified accelerated cost recovery system",
    "MAGI": "modified adjusted gross income",
    "MFA": "multifactor authentication",
    "MFS": "married filing separately",
    "NFTL": "notice of federal tax lien",
    "NII": "net investment income",
    "NIIT": "net investment income tax",
    "NOL": "net operating loss",
    "NQDC": "nonqualified deferred compensation",
    "ODC": "credit for other dependents",
    "OID": "original issue discount",
    "PIN": "personal identification number",
    "PLR": "private letter ruling",
    "PTIN": "preparer tax identification number",
    "PTP": "publicly traded partnership",
    "QBI": "qualified business income",
    "QCD": "qualified charitable distribution",
    "QDOT": "qualified domestic trust",
    "RAL": "refund anticipation loan",
    "REIT": "real estate investment trust",
    "RIC": "regulated investment company",
    "RMD": "required minimum distribution",
    "SALT": "state and local tax",
    "SE": "self-employment",
    "SEE": "Special Enrollment Examination",
    "SEP": "simplified employee pension",
    "SEP-IRA": "simplified employee pension individual retirement arrangement",
    "SHOP": "Small Business Health Options Program",
    "SIMPLE": "Savings Incentive Match Plan for Employees",
    "SSA": "Social Security Administration",
    "SSN": "Social Security number",
    "SSTB": "specified service trade or business",
    "TAM": "technical advice memorandum",
    "TAS": "Taxpayer Advocate Service",
    "TDS": "Transcript Delivery System",
    "TFRP": "trust fund recovery penalty",
    "TIN": "taxpayer identification number",
    "TPSO": "third party settlement organization",
    "UBIA": "unadjusted basis immediately after acquisition",
    "UBTI": "unrelated business taxable income",
    "UNICAP": "uniform capitalization",
}
# All caps but not abbreviations to spell out: everyday terms, emphasis, literal words,
# and parts of form, schedule, notice or program names.
KNOWN = {"IRS", "CPA", "ID", "PDF", "TV", "SUV", "UPS", "FedEx", "XYZ", "EXCEPT", "NOT", "REVOKE", "WITHDRAW",
         "Q1", "Q2", "Q3", "Q4", "II", "III", "IV", "VI", "CP2000", "EE", "OIC", "AI", "SECURE"}
# Wording a word-for-word swap would get wrong, rewritten before the swap.
REWRITE = {
    "modified AGI": "MAGI",
    "The LLC is 20% of up to": "The lifetime learning credit is 20% of up to",  # p1d3-023: LLC = lifetime learning credit
    "his employer's EIN in place": "the EIN of his employer in place",
    "(IRC 1311 through 1314)": "(sections 1311 through 1314 of the Internal Revenue Code)",
    "Identity Protection PIN": "Identity Protection Personal Identification Number",
    "under the centralized (BBA) audit regime": "under the centralized audit regime of the Bipartisan Budget Act of 2015 (BBA)",
    "26 CFR 601.503(a)": "section 601.503(a) of the IRS Statement of Procedural Rules",
    # p3d1-006: spell out SEE in the stem, so it doesn't lengthen only the key and one other choice
    "now wants to become an enrolled agent. Which statement is correct?":
        "now wants to become an enrolled agent. Which statement about whether she must pass the Special Enrollment Examination (SEE) is correct?",
}
# Left as abbreviations on purpose, by question. Spelling them out would make the key stand out by length.
LEAVE = {"p1d4-023": {"IRA"}}

PLURAL_ES = ("s", "x", "ch", "sh")
def plural(term):
    if term.endswith("y") and term[-2] not in "aeiou": return term[:-1] + "ies"
    if term.endswith(PLURAL_ES): return term + "es"
    return term + "s"
def possessive(term): return term + "'s"
def article(term):
    w = term.lower()
    return "an" if w[0] in "aeio" or w.startswith(("unrelated", "unadjusted")) else "a"

KEYS = sorted(GLOSSARY, key=len, reverse=True)
# (?<![\w-]) and (?![\w-]) skip form names like 1099-NEC, 990-EZ and SS-8.
TOKEN = re.compile(r"(?<![\w-])(" + "|".join(re.escape(k) for k in KEYS) + r")(s)?('s)?(?![\w-])")
CAPS = re.compile(r"(?<![\w-])([A-Z][A-Za-z]*[A-Z][A-Za-z0-9]*?)(s)?(?![\w-])")

def at_sentence_start(text, i):
    return i == 0 or re.search(r"[.?!:]\s+[\"']?$|^[\"']$", text[:i]) is not None

def in_parens(text, i):
    return text[:i].count("(") > text[:i].count(")")

def is_definition(text, m):
    return m.start() > 0 and text[m.start() - 1] == "(" and text[m.end():m.end() + 1] == ")"

FULLS = sorted({v.lower() for v in GLOSSARY.values()}, key=len, reverse=True)

def tag_written_out(text, defined):
    """If the full term is already written out before the first bare abbreviation,
    put the abbreviation after it ("net operating loss (NOL) carryover ... NOL deduction")
    instead of spelling the term out a second time."""
    for abbr, full in GLOSSARY.items():
        if abbr in defined: continue
        first = next((m for m in TOKEN.finditer(text) if m.group(1) == abbr), None)
        if not first or is_definition(text, first): continue
        low = text.lower()
        for m in re.finditer(r"\b" + re.escape(full.lower()) + r"\b", low[:first.start()]):
            s, e = m.span()
            # skip "adjusted gross income" inside "modified adjusted gross income", and
            # "net investment income" inside "net investment income tax"
            if any(len(f) > len(full) and (low.startswith(f, s) or low[:e].endswith(f)) for f in FULLS): continue
            if in_parens(text, s) or text[e:e + 2] == " (": break
            text = text[:e] + f" ({abbr})" + text[e:]
            break
    return text

def fix_field(text, defined):
    for a, b in REWRITE.items(): text = text.replace(a, b)
    text = tag_written_out(text, defined)
    out, last, ours = [], 0, set()
    for m in TOKEN.finditer(text):
        abbr, pl, poss = m.group(1), m.group(2), m.group(3)
        if abbr in ours and is_definition(text, m):
            # spelled out earlier in this field, so drop the writer's later "(DSUE)"
            out.append(text[last:m.start() - 2]); last = m.end() + 1; continue
        if abbr in defined: continue
        if text[max(0, m.start() - 9):m.start()] == "Schedule ": continue  # Schedule SE, Schedule AI
        if is_definition(text, m): defined.add(abbr); continue
        full = GLOSSARY[abbr]
        if pl: full = plural(full)
        shown = abbr + (pl or "")
        if poss: full, shown = possessive(full), possessive(shown)
        start = m.start()
        if at_sentence_start(text, start): full = full[0].upper() + full[1:]
        if in_parens(text, start):
            rep = full  # no nested parentheses: write the term out, define it at a later use
        else:
            rep = f"{full} ({shown})"
            end = m.end()
            if abbr == "IRC" and re.match(r" \d", text[end:]): rep += " section"  # IRC 351 -> ... (IRC) section 351
            elif text[end:end + 2] == " (":  # "IRA (no basis)" -> "IRA (IRA, no basis)", not two parentheticals
                rep, end = f"{full} ({shown}, ", end + 2
            defined.add(abbr); ours.add(abbr)
        # fix a/an before the abbreviation
        pre = text[last:start]
        am = re.search(r"\b([Aa]n?) $", pre)
        if am:
            a = article(full)
            a = a[0].upper() + a[1:] if am.group(1)[0] == "A" else a
            pre = pre[:am.start(1)] + a + " "
        out.append(pre); out.append(rep); last = end if not in_parens(text, start) else m.end()
    out.append(text[last:])
    return "".join(out)

def fix_card(x):
    d = set(LEAVE.get(x["id"], ()))
    x["q"] = fix_field(x["q"], d)
    seen = set(d)
    for i, c in enumerate(x["choices"]):
        dc = set(d)
        x["choices"][i] = fix_field(c, dc)
        seen |= dc
    x["explain"] = fix_field(x["explain"], seen)
    return x

def undefined(x):
    """Abbreviations a reader meets before the card spells them out."""
    bad = []
    def scan(text, defined):
        for p in re.findall(r"\(([A-Za-z0-9 -]+)[),]", text):  # (IP PIN), (SEP-IRA), (IRA, no basis): a definition
            if re.search(r"[A-Z].*[A-Z]", p): defined.update(re.findall(r"[A-Za-z0-9]+", p))
        for m in CAPS.finditer(text):
            a = m.group(1)
            if a in KNOWN or a in defined: continue
            if text[max(0, m.start() - 9):m.start()] == "Schedule ": continue
            if m.start() > 0 and text[m.start() - 1] == "(" and text[m.end():m.end() + 1] == ")":
                defined.add(a); continue
            bad.append(a); defined.add(a)
    d = set(LEAVE.get(x["id"], ())); scan(x["q"], d)
    seen = set(d)
    for c in x["choices"]:
        dc = set(d); scan(c, dc); seen |= dc
    scan(x["explain"], seen)
    return bad

def main(argv):
    fix = "--fix" in argv
    args = [a for a in argv if not a.startswith("--")]
    src = args[0] if args else "src/questions.json"
    dst = args[1] if len(args) > 1 else src
    qs = json.load(open(src))
    if fix:
        qs = [fix_card(x) for x in qs]
        with open(dst, "w") as f:
            f.write("[\n" + ",\n".join(json.dumps(x, ensure_ascii=False, indent=0) for x in qs) + "\n]")
    problems = [(x["id"], undefined(x)) for x in qs]
    problems = [(i, b) for i, b in problems if b]
    for i, b in problems: print(f"{i}: {', '.join(b)} not spelled out")
    print(f"{len(problems)} of {len(qs)} questions use an abbreviation before spelling it out")
    return 1 if problems else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
