"""Make the launch screen's rendered Tap to Start (art/intro-plate/). Run from the repo root, one step at a time:
  python3 tools/intro_plate.py fetch      Poly Haven textures and the night HDRI (CC0) into build/intro-plate/tex
  python3 tools/intro_plate.py art        the app's graffiti and LAST STOP letter strokes from src/introart.js (Playwright)
  python3 tools/intro_plate.py render     every render, phone then desktop (about 75 minutes on 4 CPU cores)
  python3 tools/intro_plate.py assemble   the film finish, the cut-outs and the WebP files; prints the rects for src/intro.js
build/ is not committed. The Meshy props go in build/intro-plate/meshy/ by hand (Meshy text-to-3D, realistic, PBR on):
  tank.glb    weathered cedar wood rooftop water tank on a steel stand, New York City rooftop water tower, vertical wooden
              staves bound with rusty steel hoops, conical shingled roof with a small hatch, realistic
  signal.glb  old subway tunnel railway signal, black weathered cast iron housing with two round lenses, one red one green,
              hooded visors, mounted on a short steel post, realistic
  lamp.glb    vintage industrial wall lamp for a subway tunnel, cast iron bracket, glass globe with a wire cage guard, grimy
  box.glb     old trackside electrical relay cabinet on two short steel legs, weathered gray painted steel, rust streaks,
              padlocked door, conduit pipe running into the ground, realistic
Renders use the same seed, so the cut-outs match the base pixel for pixel outside what changes."""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(root, "build", "intro-plate"); R_ = os.path.join(A, "renders"); OUT = os.path.join(root, "art", "intro-plate")
BL = [sys.executable, os.path.join(root, "tools", "blender", "intro_plate.py"), "--assets", A]
TEX = {"red_brick_03": ["Diffuse", "nor_gl", "Rough", "Displacement"], "gravel_floor_02": ["Diffuse", "nor_gl", "Rough", "Displacement"],
       "rusty_metal_02": ["Diffuse", "nor_gl", "Rough"], "dark_wooden_planks": ["Diffuse", "nor_gl", "Rough"],
       "concrete_wall_006": ["Diffuse", "nor_gl", "Rough"], "castle_brick_02_white": ["Diffuse", "nor_gl", "Rough"]}
curl = lambda *a: subprocess.run(["curl", "-sSf", *a], check=True, capture_output=True).stdout

def fetch():
    os.makedirs(A + "/tex", exist_ok=True)
    for t, maps in TEX.items():
        f = json.loads(curl("https://api.polyhaven.com/files/" + t))
        for m in maps: curl("-o", f"{A}/tex/{t}_{m}.jpg", f[m]["2k"]["jpg"]["url"])
    h = json.loads(curl("https://api.polyhaven.com/files/modern_buildings_night")); curl("-o", A + "/tex/night.hdr", h["hdri"]["2k"]["hdr"]["url"])

def art():
    """the pieces as transparent PNGs (2048 by 600, the size wild() expects), the tags, and the letter strokes"""
    os.makedirs(A + "/art", exist_ok=True)
    js = open(os.path.join(root, "src", "introart.js")).read().replace("window.IntroArt = { side, end, neon, portal, wall };", "window.IntroArt = { side, end, neon, portal, wall, wild, tag, rng, G, WIDE };")
    open(A + "/art/introart-x.js", "w").write(js); open(A + "/art/page.html", "w").write('<!doctype html><script src="introart-x.js"></script>')
    node = r"""const { chromium } = require('playwright'); const fs = require('fs'); const dir = process.argv[1];
(async () => { const b = await chromium.launch(); const p = await b.newPage(); await p.goto('file://' + dir + '/page.html');
  const out = await p.evaluate(() => { const A = IntroArt, res = {};
    const piece = (word, sc, seed) => { const c = document.createElement('canvas'); c.width = 2048; c.height = 600; A.wild(c.getContext('2d'), A.rng(seed), word, 1024, 300, 190, 1500, sc); return c.toDataURL(); };
    const sc = [{ dots: "#ff3fa4", fill: ["#ff4fa8", "#ff9e3a", "#ffe86a"], block: "#2a1452" }, { dots: "#ffd23a", fill: ["#2fd36b", "#1e9bff", "#ffe03a"], block: "#2a1452" },
                { dots: "#7ae03a", fill: ["#ffe03a", "#7ae03a", "#2fd3c4"], block: "#1a1240" }, { dots: "#ff3fa4", fill: ["#ff6a1a", "#ff3fa4", "#b34bff"], block: "#2a1452" }];
    res.uptown = piece("UPTOWN", sc[0], 693); res.bronx = piece("BRONX", sc[1], 694); res.queens = piece("QUEENS", sc[2], 31); res.harlem = piece("HARLEM", sc[3], 17); res.bklyn = piece("BKLYN", sc[3], 18);
    const t = document.createElement('canvas'); t.width = 2048; t.height = 1024; const x = t.getContext('2d'), r = A.rng(5), T = ["TAX", "EA", "SEE", "IRA", "AUDIT", "PASS", "LEDGER"];
    for (let i = 0; i < 40; i++) A.tag(x, r, T[i % T.length], 40 + r() * 1900, 40 + r() * 940, 34 + r() * 22, ["#f4f4f4", "#111", "#ff3fa4", "#2fd3ff", "#ffe03a"][i % 5]);
    res.tags = t.toDataURL(); res.G = A.G; res.WIDE = A.WIDE; return res; });
  for (const k in out) if (typeof out[k] === 'string') fs.writeFileSync(dir + '/' + k + '.png', Buffer.from(out[k].split(',')[1], 'base64'));
  fs.writeFileSync(dir + '/glyphs.json', JSON.stringify({ G: out.G, WIDE: out.WIDE })); await b.close(); })();"""
    subprocess.run(["node", "-e", node, A + "/art"], check=True)

def render():
    os.makedirs(R_, exist_ok=True)
    for cam in ("phone", "desk"):
        run = lambda *a: subprocess.run(BL + ["--cam", cam, *a], check=True, stdout=subprocess.DEVNULL)
        run("--out", f"{R_}/{cam}-base.png", "--mastery", "0.4")
        run("--out", f"{R_}/{cam}-neon.png", "--region", "neon", "--neon", "0.01", "--mastery", "0.4")
        for k in range(11): run("--out", f"{R_}/{cam}-tower-{k}.png", "--region", "tower", "--mastery", str(k / 10))
        print(cam, "rendered")

def finish(a, seed=3):
    """the film finish (soft bloom on the brights, a gentle vignette, fine grain) on a whole frame, 0..1 floats"""
    h, w = a.shape[:2]; lum = a @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    br = np.clip((lum - 0.72) / 0.28, 0, 1)[..., None] * a; bl = np.zeros_like(a); sc = min(w, h) / 780
    for r, k in ((6, 0.35), (18, 0.3), (48, 0.25)):
        bl += np.asarray(Image.fromarray((br * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r * sc))).astype(np.float32) / 255 * k
    a = 1 - (1 - a) * (1 - bl); yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 * 0.6 + ((yy - h * 0.45) / (h / 2)) ** 2); a = a * (1 - 0.32 * np.clip(d - 0.35, 0, 1) ** 1.6)[..., None]
    g = np.random.default_rng(seed).normal(0, 0.018, (h, w, 1)).astype(np.float32); return np.clip(a + g * (0.4 + 0.6 * (1 - a)), 0, 1)

def assemble(cams=("phone", "desk")):
    """each layer is pasted into the raw base, finished as a whole frame, then cut out, so it matches the base exactly"""
    os.makedirs(OUT, exist_ok=True); rects = {}
    rgb = lambda p: np.asarray(Image.open(p).convert("RGB")).astype(np.float32) / 255
    save = (lambda a, p: Image.fromarray((a * 255 + 0.5).astype(np.uint8)).save(p, "WEBP", quality=82, method=6))
    for cam in cams:
        base = rgb(f"{R_}/{cam}-base.png"); h, w = base.shape[:2]; save(finish(base), f"{OUT}/{cam}.webp")
        rects[cam] = {"w": w, "h": h}
        for name, files in (("neon", [f"{cam}-neon.png"]), ("tower", [f"{cam}-tower-{k}.png" for k in range(11)])):
            # a region render is full size and transparent outside its border: that border is the cut-out
            x0, y0, x1, y1 = Image.open(f"{R_}/{files[0]}").getchannel("A").getbbox(); r = {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0}; rects[cam][name] = r
            for f in files:
                a = base.copy(); a[y0:y1, x0:x1] = rgb(f"{R_}/{f}")[y0:y1, x0:x1]
                out = finish(a)[y0:y1, x0:x1]
                save(out, f"{OUT}/{f.replace('.png', '.webp')}")
    for f in sorted(os.listdir(OUT)): print(f"{f:22} {os.path.getsize(os.path.join(OUT, f)) // 1024:4} KB")
    prev = json.load(open(A + "/rects.json")) if os.path.exists(A + "/rects.json") else {}; prev.update(rects); rects = prev
    json.dump(rects, open(A + "/rects.json", "w"))
    print("const PLATE =", json.dumps(rects, separators=(", ", ": ")).replace('"', ""))

if __name__ == "__main__":
    {"fetch": fetch, "art": art, "render": render, "assemble": lambda: assemble(sys.argv[2:] or ("phone", "desk"))}[sys.argv[1]]()
