"""Build index.html from src/. Run from the repo root: python3 tools/build.py"""
import json, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = lambda f: open(os.path.join(root, "src", f), encoding="utf-8").read()
bank = json.loads(src("questions.json"))
app = src("app.js").replace("__BANK__", json.dumps(bank, ensure_ascii=False).replace("</", "<\\/"))
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
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="EA Drill">
<meta name="theme-color" content="#0b0a1a">
<script type="importmap">{ "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js", "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/" } }</script>
<style>html, body { margin: 0; } :root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); } img { max-width: 100%; }</style>
"""
out = head + shell + "\n<script>\n" + src("mascot.js") + "\n</script>\n<script>\n" + app + "\n</script>\n<script type=\"module\">\n" + src("town.js") + "\n</script>\n\n</html>\n"
open(os.path.join(root, "index.html"), "w", encoding="utf-8").write(out)
print(f"index.html: {len(out):,} bytes, {len(bank)} questions")
