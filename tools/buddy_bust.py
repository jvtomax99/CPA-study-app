"""Build art/buddy-bust.webp (360 x 464) from the study buddy's picture, docs/art/buddy-faces/reference.webp
(1792 x 2400 on white). Run from the repo root: python3 tools/buddy_bust.py  (needs numpy and Pillow)

The near-white background is cut by filling in from the picture's edges, the cut is pulled in two pixels and softened so
no white rim is left, and rows 30 to 2340 are scaled to 360 x 464 (1792 / 360 source pixels per bust pixel, the scale
tools/buddy_face.py and the measurements in src/mascot.js rely on). """
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOP, W, H = 30, 360, 464
im = Image.open(os.path.join(root, "docs", "art", "buddy-faces", "reference.webp")).convert("RGB")
sw, sh = im.size
# background: near-white, colourless pixels joined to the picture's edge (the white is not quite even, so a plain
# fill from the corners stops short; the shirt and cuffs are darker and walled in by the coat)
px = np.array(im).astype(int)
cand = (px.min(2) >= 232) & (px.max(2) - px.min(2) <= 12)
m = Image.fromarray((cand * 255).astype(np.uint8)).convert("RGB")
for p in [(0, 0), (sw - 1, 0), (sw // 2, 0), (0, sh // 3), (sw - 1, sh // 3), (5, sh // 2)]:
    if m.getpixel(p) == (255, 255, 255): ImageDraw.floodfill(m, p, (255, 0, 255))
f = np.array(m); solid = ~((f[..., 0] == 255) & (f[..., 1] == 0))
alpha = Image.fromarray((solid * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.3))
box = (0, TOP, sw, TOP + round(H * sw / W))
rgb, al = np.array(im.crop(box), np.float32), np.array(alpha.crop(box), np.float32)[..., None] / 255
pm = Image.fromarray(np.concatenate([rgb * al, al * 255], 2).astype(np.uint8), "RGBA").resize((W, H), Image.LANCZOS)  # premultiplied, so no white bleeds in
p = np.array(pm, np.float32); al = p[..., 3:] / 255
out = np.concatenate([np.where(al > 0.02, np.clip(p[..., :3] / np.maximum(al, 1e-3), 0, 255), 0), p[..., 3:]], 2).astype(np.uint8)
dst = os.path.join(root, "art", "buddy-bust.webp")
Image.fromarray(out, "RGBA").save(dst, "WEBP", quality=92, method=6)
print(dst, os.path.getsize(dst), "bytes")
