"""Build index.html from src/. Run from the repo root: python3 tools/build.py"""
import json, os, subprocess
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = lambda f: open(os.path.join(root, "src", f), encoding="utf-8").read()
bank = json.loads(src("questions.json"))
app = src("app.js")
shell = src("shell.html").replace('<meta charset="utf-8">\n', "", 1)
head = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="EA Ledger Drill: a 3D Midtown Manhattan study town for the IRS Enrolled Agent exam (tax year 2025), with 600 checked questions, spaced repetition and a PSI-style exam sim.">
<meta name="author" content="Chris Hidalgo">
<meta name="copyright" content="© 2026 Chris Hidalgo. All rights reserved.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="EA Drill">
<meta name="theme-color" content="#0b0a1a">
<script type="importmap">{ "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js", "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/" } }</script>
<style>html, body { margin: 0; } :root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); } img { max-width: 100%; }</style>
"""

# The bank goes into the page as one run of script blocks per EA part (the CPA-only questions last), in pieces of about
# 100 KB. Each piece tells the launch screen's tracker (src/intro.js) that it has arrived, so a station's lights come on when
# that part's questions are really in. Every question keeps its index, so app.js rebuilds the bank in questions.json order.
grp = lambda q: "cpa" if q.get("exam") == "cpa" else "bank" + str(q.get("part"))
groups = {"bank1": [], "bank2": [], "bank3": [], "cpa": []}
for i, q in enumerate(bank): groups[grp(q)].append([i, q])
bank_js, bank_kb = "", {}
for key, items in groups.items():
    pieces, cur, size = [], [], 0
    for it in items:
        cur.append(it); size += len(json.dumps(it, ensure_ascii=False))
        if size > 100_000: pieces.append(cur); cur, size = [], 0
    if cur or not pieces: pieces.append(cur)
    bank_kb[key] = round(sum(len(json.dumps(it, ensure_ascii=False)) for it in items) / 1000)
    for n, piece in enumerate(pieces):
        js = json.dumps(piece, ensure_ascii=False).replace("</", "<\\/")
        bank_js += f'<script>(window.__bank = window.__bank || []).push({js}); window.Boot && Boot.set("{key}", {round((n + 1) / len(pieces), 3)});</script>\n'
counts = [len(groups[k]) for k in ("bank1", "bank2", "bank3")]

def git(*a):
    try: return subprocess.run(["git", *a], cwd=root, capture_output=True, text=True).stdout.strip()
    except Exception: return ""
# the launch screen's build string: the last commit's date and hash, so building twice gives the same file
build = f"{git('log', '-1', '--format=%cd', '--date=format:%Y.%m.%d') or 'dev'} · {git('rev-parse', '--short', 'HEAD') or 'dev'} · {len(bank)} questions"
intro = src("intro.js").replace("__BUILD__", build).replace("__BANKKB__", json.dumps(bank_kb)).replace("__COUNTS__", json.dumps(counts))
town = src("town.js").replace("__TSQ__", src("tsq-map.json"))   # the real Times Square, made by tools/tsq_map.py from OpenStreetMap
# order matters: the launch screen and its ride come before the bank, so they're on screen while it streams in
out = (head + shell + "\n<script>\n" + src("mascot.js") + "\n</script>\n<script>\n" + intro + "\n</script>\n<script>\n" + src("introart.js") + "\n</script>\n<script>\n" + src("intro3d.js")
       + "\n</script>\n" + bank_js + "<script>\n" + app + "\n</script>\n<script type=\"module\">\n" + town + "\n</script>\n\n</html>\n")
open(os.path.join(root, "index.html"), "w", encoding="utf-8").write(out)
print(f"index.html: {len(out):,} bytes, {len(bank)} questions")
