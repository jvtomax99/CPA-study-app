"""Build art/buddy-face.webp, the strip of the study buddy's eye and mouth frames, from the faces in
docs/art/buddy-faces/. Run from the repo root: python3 tools/buddy_face.py  (needs numpy and Pillow)

The sources are head crops (x 448-1344, y 478-1150) of 1792 x 2400 edits of the buddy's picture
(docs/art/buddy-faces/reference.webp), 01-original.webp being that picture itself. tools/buddy_bust.py makes
art/buddy-bust.webp from the same picture at 360 / 1792 scale starting at row 30, so the crop is exactly the
bust's pixels 90-270 across and 90-225 down, and every face is scaled straight onto them. The edits must sit on
the original to the pixel (the tool stops if one has moved). Colour drifts a little from one edit to the next,
so each face is pulled toward the original's colour where the two agree (a low-pass correction learned from
the skin round the eyes and mouth).

What a frame takes from its face:
  L, R  everything inside that lens, cut a little inside the rim so only the bust's own rim ever shows
        (generated rims wander by a pixel or so and would double up);
  M     the mouth, where it differs from the original, inside an ellipse round it, feathered.
Everything else in a frame is see-through, so the bust shows round it; "rest" is see-through throughout.
Prints the window (bust px) and frame order that src/mascot.js's FACE must match. """
import json, os
import numpy as np
from PIL import Image, ImageDraw

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(root, "docs", "art", "buddy-faces")
BOX = (90, 90, 270, 225)  # where the head crops sit on the bust
SRC = {1: "01-original", 2: "02-blink1", 3: "03-blink2", 4: "04-shut", 5: "05-wink", 6: "06-smile",
       7: "07-laugh", 8: "08-surprised", 9: "09-encourage", 10: "10-doubt", 11: "11-sleep"}
# frame name: parts taken, as (source, part). L is the lens on the picture's left, the eye he winks with.
# "wink1" and "wink2" are that eye alone from the two blink steps; "laugh1" is the shut eyes with the smile's
# mouth, the step into the laugh.
FRAMES = [
    ("rest", []),
    ("blink1", [(2, "L"), (2, "R")]), ("blink2", [(3, "L"), (3, "R")]), ("shut", [(4, "L"), (4, "R")]),
    ("wink1", [(2, "L")]), ("wink2", [(3, "L")]), ("wink", [(5, "L"), (5, "R"), (5, "M")]),
    ("smile", [(6, "L"), (6, "R"), (6, "M")]), ("laugh1", [(4, "L"), (4, "R"), (6, "M")]), ("laugh", [(7, "L"), (7, "R"), (7, "M")]),
    ("surprised", [(8, "L"), (8, "R"), (8, "M")]), ("encourage", [(9, "L"), (9, "R"), (9, "M")]),
    ("doubt", [(10, "L"), (10, "R"), (10, "M")]), ("sleep", [(11, "L"), (11, "R"), (11, "M")]),
]
# The lens openings and the mouth zone on the bust (px): centre and full width and height, measured by eye
# on art/buddy-bust.webp.
LENS = {"L": ((148, 134), (41, 39)), "R": ((212.2, 132.8), (42.5, 38.5))}
SHRINK = 3
MOUTH = ((178, 186), (76, 56))

bust = np.array(Image.open(os.path.join(root, "art", "buddy-bust.webp")).convert("RGBA"), np.float32)
B = bust[:, :, :3]
H, W = B.shape[:2]
x0, y0, x1, y1 = BOX
inbox = np.zeros((H, W), np.float32); inbox[y0:y1, x0:x1] = 1

def blur(a, s):
    """Gaussian blur of a 2D or 3D float array, edges repeated."""
    r = max(1, int(s * 3 + 0.5)); k = np.exp(-0.5 * (np.arange(-r, r + 1) / s) ** 2); k /= k.sum()
    for ax in (0, 1):
        pad = [(0, 0)] * a.ndim; pad[ax] = (r, r)
        p = np.pad(a, pad, mode="edge"); n = a.shape[ax]
        a = sum(k[j] * np.take(p, range(j, j + n), axis=ax) for j in range(2 * r + 1))
    return a
def ellipse(c, ax):
    """Filled ellipse (centre, full axes) as a soft-edged mask, drawn at 4 times the size."""
    m = Image.new("L", (W * 4, H * 4), 0)
    ImageDraw.Draw(m).ellipse([(c[0] - ax[0] / 2) * 4, (c[1] - ax[1] / 2) * 4, (c[0] + ax[0] / 2) * 4, (c[1] + ax[1] / 2) * 4], fill=255)
    return np.array(m.resize((W, H), Image.LANCZOS), np.float32) / 255
def on_bust(i):
    """Face i laid over the bust's pixels (the bust itself outside the head crop)."""
    im = Image.open(os.path.join(DOCS, SRC[i] + ".webp")).convert("RGB").resize((x1 - x0, y1 - y0), Image.LANCZOS)
    out = B.copy(); out[y0:y1, x0:x1] = np.array(im, np.float32)
    return out

lens = {p: blur(ellipse(c, (ax[0] - SHRINK, ax[1] - SHRINK)), 0.8) for p, (c, ax) in LENS.items()}
lenses = blur(lens["L"] + lens["R"], 1)
zone = ellipse(*MOUTH) > 0.5
ones = np.ones((H, W), np.float32)
base = on_bust(1)
lowpass = lambda img, wt, s: blur(img * wt[..., None], s) / np.maximum(blur(wt, s)[..., None], 1e-3)

cache = {}
def corrected(i):
    if i not in cache:
        f = on_bust(i)
        still = np.median(np.abs(f - base).mean(2)[(inbox > 0) & (lenses < 0.05) & ~zone])  # brows and cheeks may change; the head as a whole must not
        if still > 6: raise SystemExit(f"{SRC[i]} does not sit on the original; make it again")
        agree = (blur(np.abs(f - base).mean(2), 2) < 18).astype(np.float32) * inbox
        agree[lenses > 0.05] = 0  # learn colour from skin, not eyes
        f = f + (lowpass(base, agree, 8) - lowpass(f, agree, 8)) * inbox[..., None]
        f = f + (lowpass(B, ones, 3) - lowpass(base, ones, 3))  # what the bust's cut and compression changed
        cache[i] = f
    return cache[i]
def mouth_mask(i):
    d = blur(np.abs(corrected(i) - base).mean(2), 1.5)
    a = (d > 12) & zone
    if not a.any(): return np.zeros((H, W), np.float32)
    # keep the largest connected patch
    lab, n = np.zeros((H, W), int), 0; best, size = 0, 0
    for y, x in zip(*np.nonzero(a)):
        if lab[y, x]: continue
        n += 1; lab[y, x] = n; stack, cnt = [(y, x)], 0
        while stack:
            v, u = stack.pop(); cnt += 1
            for dv, du in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q, r = v + dv, u + du
                if 0 <= q < H and 0 <= r < W and a[q, r] and not lab[q, r]: lab[q, r] = n; stack.append((q, r))
        if cnt > size: best, size = n, cnt
    a = (blur((lab == best).astype(np.float32), 2.5) > 0.12) & zone  # grow it a little and close its gaps
    return blur(a.astype(np.float32), 2)

frames, union = [], np.zeros((H, W), np.float32)
for name, parts in FRAMES:
    out, keep = B.copy(), ones.copy()
    for i, p in parts:
        a = mouth_mask(i) if p == "M" else lens[p]
        out = out * (1 - a[..., None]) + corrected(i) * a[..., None]; keep = keep * (1 - a)
    alpha = 1 - keep  # one layer over the bust that gives the same picture
    col = np.where(alpha[..., None] > 1e-3, (out - B * keep[..., None]) / np.maximum(alpha[..., None], 1e-3), B)
    frames.append((name, np.clip(col, 0, 255), alpha)); union = np.maximum(union, alpha)

ys, xs = np.nonzero(union > 0.004)
fx0, fy0, fx1, fy1 = int(xs.min()) - 2, int(ys.min()) - 2, int(xs.max()) + 3, int(ys.max()) + 3
w, h = fx1 - fx0, fy1 - fy0
strip = np.zeros((h, w * len(frames), 4), np.uint8)
for n, (name, col, alpha) in enumerate(frames):
    a = alpha[fy0:fy1, fx0:fx1].copy(); a[:2] = a[-2:] = 0; a[:, :2] = a[:, -2:] = 0  # clear border: no bleed between frames
    strip[:, n * w:(n + 1) * w, :3] = col[fy0:fy1, fx0:fx1].astype(np.uint8)
    strip[:, n * w:(n + 1) * w, 3] = np.round(a * 255).astype(np.uint8)
out = os.path.join(root, "art", "buddy-face.webp")
Image.fromarray(strip, "RGBA").save(out, "WEBP", quality=92, method=6)
print(json.dumps({"x": fx0, "y": fy0, "w": w, "h": h, "frames": [f[0] for f in frames], "bytes": os.path.getsize(out)}))
