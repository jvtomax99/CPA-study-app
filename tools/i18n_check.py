"""The interface language check (src/i18n.js). Lists every English text the app passes to t() or tn(), marks with
data-t, data-th or data-ta in shell.html, or translates from a list (buildings, rivers, the buddy's lines), and checks
src/i18n-ja.js has each one with the same {placeholders}. Run from the repo root: python3 tools/i18n_check.py
(--list prints the keys instead; --sheet writes docs/ja-strings.md, the English and Japanese side by side for a
native speaker to read through). Fails if a key is missing or a placeholder differs."""
import re, json, sys, os
keys = []
def add(k):
    if k not in keys: keys.append(k)
S = r'"((?:[^"\\]|\\.)*)"'
for f in ["src/shell.html", "src/mascot.js", "src/intro.js", "src/app.js", "src/town.js"]:
    s = open(f, encoding="utf-8").read()
    if f.endswith(".html"):
        for m in re.finditer(r'<(\w+)[^>]*\bdata-t\b[^>]*>([^<]*)<', s): add(m.group(2).strip())
        for m in re.finditer(r'<p[^>]*\bdata-th\b[^>]*>(.*?)</p>', s): add(m.group(1).strip())
        for m in re.finditer(r'aria-label="([^"]*)"[^>]*\bdata-ta\b', s): add(m.group(1))
        continue
    for m in re.finditer(r'\btn\([^,]+,\s*' + S + r',\s*' + S, s): add(json.loads('"' + m.group(1) + '"')); add(json.loads('"' + m.group(2) + '"'))
    for m in re.finditer(r'(?<![\w.])t\(' + S, s): add(json.loads('"' + m.group(1) + '"'))
    for m in re.finditer(r'(?<![\w.])t\((?:waiting \? )' + S + r' : ' + S, s): add(json.loads('"' + m.group(1) + '"')); add(json.loads('"' + m.group(2) + '"'))
app = open("src/app.js", encoding="utf-8").read()
for m in re.finditer(r'bld: "([^"]+)"', app): add(m.group(1))
for m in re.finditer(r'const RIVER = \{([^}]*)\}', app):
    for v in re.findall(r'"([^"]+)"', m.group(1)): add(v)
for m in re.finditer(r'const PRAISE = \[([^\]]*)\]', app): [add(v) for v in re.findall(r'"([^"]+)"', m.group(1))]
for m in re.finditer(r'CONSOLE = \[([^\]]*)\]', app): [add(v) for v in re.findall(r'"([^"]+)"', m.group(1))]
mas = open("src/mascot.js", encoding="utf-8").read()
for m in re.finditer(r'const PEP = \[([^\]]*)\]', mas): [add(v) for v in re.findall(r'"([^"]+)"', m.group(1))]
if "--sheet" in sys.argv:
    src = open("src/i18n-ja.js", encoding="utf-8").read()
    ja = json.loads(src[src.index("{"):src.rindex("}") + 1])
    cell = lambda x: x.replace("|", "\\|").replace("\n", " ")
    rows = "\n".join(f"| {i} | {cell(k)} | {cell(ja.get(k, '(missing)'))} |" for i, k in enumerate(keys, 1))
    open("docs/ja-strings.md", "w", encoding="utf-8").write(f"""# Japanese interface: review sheet

Every English text in the app's menus and buttons, with the Japanese shown in its place (src/i18n-ja.js).
Made by `python3 tools/i18n_check.py --sheet`; edit src/i18n-ja.js, not this file, then run it again.
{{name}}, {{n}} and the like are filled in by the app. The buddy's lines keep one space where his thought
cloud breaks them in two. Questions, answers and explanations stay English on purpose.

For a native speaker: mark any line that reads wrong or stiff, with the better wording.

| # | English | 日本語 |
|---|---|---|
{rows}
""")
    print(f"docs/ja-strings.md: {len(keys)} rows"); sys.exit(0)
if "--list" not in sys.argv:
    src = open("src/i18n-ja.js", encoding="utf-8").read()
    ja = json.loads(src[src.index("{"):src.rindex("}") + 1])
    miss = [k for k in keys if k not in ja]; extra = [k for k in ja if k not in keys]
    print(f"i18n: {len(keys)} keys, {len(miss)} missing, {len(extra)} unused")
    for k in miss: print("MISSING", json.dumps(k, ensure_ascii=False))
    for k in extra: print("UNUSED", json.dumps(k, ensure_ascii=False))
    ph = lambda x: sorted(re.findall(r"\{(\w+)\}", x))
    off = [k for k in keys if k in ja and ph(k) != ph(ja[k])]
    for k in off: print("PLACEHOLDERS DIFFER", json.dumps(k, ensure_ascii=False))
    sys.exit(1 if miss or off else 0)
print(json.dumps(keys, ensure_ascii=False, indent=0))
