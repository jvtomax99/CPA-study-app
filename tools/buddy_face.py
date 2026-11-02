"""Build art/buddy-face.webp, the strip of the study buddy's eye and mouth frames, from the faces in
docs/art/buddy-faces/. Run from the repo root: python3 tools/buddy_face.py  (needs opencv-python-headless and Pillow)

The sources are head crops (x 150-780, y 40-660) of 1024 x 1536 edits of the original full-figure render,
01-original.webp being that render itself; art/buddy-bust.webp was cut from it at 0.45 scale. Each face is
aligned to the original (they all sit within half a pixel of it), the original to the bust, and both are
resampled onto the bust's pixels. Colour drifts from one edit to the next, so each face is pulled toward the
original's colour where the two agree (a low-pass correction learned from the skin round the eyes and mouth).

What a frame takes from its face:
  L, R  everything inside that lens, cut a few pixels inside the rim so only the bust's own rim ever shows
        (generated rims wander by a pixel or so and would double up);
  M     the mouth, where it differs from the original, inside an ellipse round it, feathered.
Everything else in a frame is see-through, so the bust shows round it; "rest" is see-through throughout.
Prints the window (bust px) and frame order that src/mascot.js's FACE must match. """
import json, os
import cv2, numpy as np
from PIL import Image

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(root, "docs", "art", "buddy-faces")
CROP = (150, 40)
SRC = {1: "01-original", 2: "02-blink1", 3: "03-blink2", 4: "04-shut", 5: "05-wink", 6: "06-wink-teeth",
       7: "07-laugh", 8: "08-surprised", 9: "09-encourage", 10: "10-doubt", 11: "11-sleep"}
# frame name: parts taken, as (source, part). "smile" is the parted-lips mouth of 06 (a wink came with it,
# so its eyes are left out); "laugh1" is the shut eyes with that mouth, the step into the laugh.
FRAMES = [
    ("rest", []),
    ("blink1", [(2, "L"), (2, "R")]), ("blink2", [(3, "L"), (3, "R")]), ("shut", [(4, "L"), (4, "R")]),
    ("wink1", [(2, "R")]), ("wink2", [(3, "R")]), ("wink", [(5, "L"), (5, "R"), (5, "M")]),
    ("smile", [(6, "M")]), ("laugh1", [(4, "L"), (4, "R"), (6, "M")]), ("laugh", [(7, "L"), (7, "R"), (7, "M")]),
    ("surprised", [(8, "L"), (8, "R"), (8, "M")]), ("encourage", [(9, "L"), (9, "R"), (9, "M")]),
    ("doubt", [(10, "L"), (10, "R"), (10, "M")]), ("sleep", [(11, "L"), (11, "R"), (11, "M")]),
]
# Lens rims and the mouth zone on the bust (px), measured by eye on art/buddy-bust.webp.
LENS = {"L": ((148, 188.5), (66, 59), -10), "R": ((236, 163), (74, 61), -20)}
SHRINK = 6
MOUTH = ((198, 228), (92, 62), -8)

bust = cv2.imread(os.path.join(root, "art", "buddy-bust.webp"), cv2.IMREAD_UNCHANGED)
B = bust[:, :, :3].astype(np.float32)
H, W = B.shape[:2]
gray = lambda x: cv2.cvtColor(x.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
src = {i: cv2.imread(os.path.join(DOCS, n + ".webp")) for i, n in SRC.items()}
ECC = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 400, 1e-7)

def ecc(template, img, init, mask):
    """Affine W with template(p) ~ img(W p), refined from init (same-size images, as OpenCV wants)."""
    pre = cv2.warpAffine(img, init, template.shape[1::-1], flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP)
    R = np.eye(2, 3, dtype=np.float32)
    _, R = cv2.findTransformECC(gray(template), gray(pre), R, cv2.MOTION_AFFINE, ECC, mask, 5)
    return (np.vstack([init, [0, 0, 1]]) @ np.vstack([R, [0, 0, 1]]))[:2].astype(np.float32)

# the original onto the bust: the head only, where the bust is solid
m = (bust[:, :, 3] > 250).astype(np.uint8); m[int(H * 0.55):] = 0
k = 1 / 0.45
W01 = ecc(B, src[1], np.float32([[k, 0, 50 * k - CROP[0]], [0, k, 13 * k - CROP[1]]]), m)
# each face onto the original, leaving out the eyes and mouth
m = np.ones(src[1].shape[:2], np.uint8); m[330 - CROP[1]:600 - CROP[1], 330 - CROP[0]:720 - CROP[0]] = 0
Wi = {i: ecc(src[1], src[i], np.eye(2, 3, dtype=np.float32), m) for i in src if i > 1}

ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
qx = W01[0, 0] * xs + W01[0, 1] * ys + W01[0, 2]; qy = W01[1, 0] * xs + W01[1, 1] * ys + W01[1, 2]
def on_bust(i):
    img = cv2.GaussianBlur(src[i].astype(np.float32), (0, 0), 0.9)  # pre-filter for the 2.2x reduction
    mx, my = qx, qy
    if i > 1:
        A = Wi[i]; mx = A[0, 0] * qx + A[0, 1] * qy + A[0, 2]; my = A[1, 0] * qx + A[1, 1] * qy + A[1, 2]
    return cv2.remap(img, mx, my, cv2.INTER_LINEAR)
base = on_bust(1)

def lowpass(img, wt, s):
    return cv2.GaussianBlur(img * wt[..., None], (0, 0), s) / np.maximum(cv2.GaussianBlur(wt, (0, 0), s)[..., None], 1e-3)
def lens_mask(p):
    a = np.zeros((H, W), np.float32); (c, ax, an) = LENS[p]
    cv2.ellipse(a, (c, (ax[0] - SHRINK, ax[1] - SHRINK), an), 1.0, -1)
    return cv2.GaussianBlur(a, (0, 0), 0.8)
lenses = cv2.GaussianBlur(lens_mask("L") + lens_mask("R"), (0, 0), 1)
ones = np.ones((H, W), np.float32)
cache = {}
def corrected(i):
    if i not in cache:
        f = on_bust(i)
        agree = (cv2.GaussianBlur(np.abs(f - base).mean(2), (0, 0), 2) < 18).astype(np.float32)
        agree[lenses > 0.05] = 0  # learn colour from skin, not eyes
        f = f + (lowpass(base, agree, 8) - lowpass(f, agree, 8))
        f = f + (lowpass(B, ones, 3) - lowpass(base, ones, 3))  # what the bust's cut and compression changed
        cache[i] = f
    return cache[i]
def mouth_mask(i):
    d = cv2.GaussianBlur(np.abs(corrected(i) - base).mean(2), (0, 0), 1.5)
    zone = np.zeros((H, W), np.uint8); cv2.ellipse(zone, MOUTH, 1, -1)
    a = ((d > 14) & (zone > 0)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(a)
    if n <= 1: return np.zeros((H, W), np.float32)
    a = (lab == 1 + np.argmax(st[1:, 4])).astype(np.uint8)
    a = cv2.dilate(cv2.morphologyEx(a, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)), np.ones((7, 7), np.uint8)) * zone
    return cv2.GaussianBlur(a.astype(np.float32), (0, 0), 2.5)

frames, union = [], np.zeros((H, W), np.float32)
for name, parts in FRAMES:
    out, keep = B.copy(), ones.copy()
    for i, p in parts:
        a = mouth_mask(i) if p == "M" else lens_mask(p)
        out = out * (1 - a[..., None]) + corrected(i) * a[..., None]; keep *= 1 - a
    alpha = 1 - keep  # one layer over the bust that gives the same picture
    col = np.where(alpha[..., None] > 1e-3, (out - B * keep[..., None]) / np.maximum(alpha[..., None], 1e-3), B)
    frames.append((name, np.clip(col, 0, 255), alpha)); union = np.maximum(union, alpha)

ys, xs = np.nonzero(union > 0.004)
x0, y0, x1, y1 = int(xs.min()) - 2, int(ys.min()) - 2, int(xs.max()) + 3, int(ys.max()) + 3
w, h = x1 - x0, y1 - y0
strip = np.zeros((h, w * len(frames), 4), np.uint8)
for n, (name, col, alpha) in enumerate(frames):
    a = alpha[y0:y1, x0:x1].copy(); a[:2] = a[-2:] = 0; a[:, :2] = a[:, -2:] = 0  # clear border: no bleed between frames
    strip[:, n * w:(n + 1) * w, :3] = col[y0:y1, x0:x1, ::-1].astype(np.uint8)
    strip[:, n * w:(n + 1) * w, 3] = np.round(a * 255).astype(np.uint8)
out = os.path.join(root, "art", "buddy-face.webp")
Image.fromarray(strip, "RGBA").save(out, "WEBP", quality=90, method=6)
print(json.dumps({"x": x0, "y": y0, "w": w, "h": h, "frames": [f[0] for f in frames], "bytes": os.path.getsize(out)}))
