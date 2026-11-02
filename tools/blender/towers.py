"""Headless Blender: model the four study-tower styles for the town.

One GLB per facade style in town.js (0 glass, 1 limestone deco, 2 brick, 3 dark glass), each with:
  Body   setback tiers at unit height (town.js stretches them to the tower's height), so the
         lit-window facade shader and the floor-by-floor cut work on them unchanged
  Frame  the same tiers inset 0.25 m, the bare concrete frame shown above the cut
  Crown  the finished top in meters, sitting on y = 0, shading baked into its color texture
  Glow   lamps in the crown; town.js takes their color, and their emission strength relative to 4 sets how bright they are
  Beacon red light on the mast

Usage: python towers.py OUT_DIR   (writes tower-glass.glb, tower-deco.glb, tower-brick.glb, tower-dark.glb)
"""
import sys, math, os
import bpy, bmesh
import numpy as np

OUT = sys.argv[1]
W, D = 44.0, 31.0   # every study-tower lot in town.js is 44 m (x) by 31 m (z)


# ---------- geometry helpers (Blender is Z-up; the glTF exporter turns it Y-up) ----------
def rect_frustum(bm, hx0, hy0, hx1, hy1, z0, z1, top=True, bottom=False, cx=0.0, cy=0.0):
    """Box, frustum or pyramid (hx1 = hy1 = 0) on a rectangle."""
    lo = [bm.verts.new((cx + sx * hx0, cy + sy * hy0, z0)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    if hx1 <= 1e-6 and hy1 <= 1e-6:
        tip = bm.verts.new((cx, cy, z1))
        for i in range(4): bm.faces.new([lo[i], lo[(i + 1) % 4], tip])
    else:
        hi = [bm.verts.new((cx + sx * hx1, cy + sy * hy1, z1)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        for i in range(4): bm.faces.new([lo[i], lo[(i + 1) % 4], hi[(i + 1) % 4], hi[i]])
        if top: bm.faces.new(hi)
    if bottom: bm.faces.new(lo[::-1])


def box(bm, x0, x1, y0, y1, z0, z1, top=True):
    rect_frustum(bm, (x1 - x0) / 2, (y1 - y0) / 2, (x1 - x0) / 2, (y1 - y0) / 2, z0, z1, top=top, cx=(x0 + x1) / 2, cy=(y0 + y1) / 2)


def tier(bm, hx, hy, ch, z0, z1):
    """Vertical prism on a rectangle with chamfered corners (ch = 0 for a plain box)."""
    if ch <= 0: return box(bm, -hx, hx, -hy, hy, z0, z1)
    pts = [(hx - ch, -hy), (hx, -hy + ch), (hx, hy - ch), (hx - ch, hy), (-hx + ch, hy), (-hx, hy - ch), (-hx, -hy + ch), (-hx + ch, -hy)]
    lo = [bm.verts.new((x, y, z0)) for x, y in pts]; hi = [bm.verts.new((x, y, z1)) for x, y in pts]
    n = len(pts)
    for i in range(n): bm.faces.new([lo[i], lo[(i + 1) % n], hi[(i + 1) % n], hi[i]])
    bm.faces.new(hi)


def prism(bm, r, z0, z1, n=8, r_top=None, cx=0.0, cy=0.0, top=True):
    r_top = r if r_top is None else r_top
    ang = [2 * math.pi * (i + 0.5) / n for i in range(n)]
    lo = [bm.verts.new((cx + r * math.cos(a), cy + r * math.sin(a), z0)) for a in ang]
    if r_top <= 1e-6:
        tip = bm.verts.new((cx, cy, z1))
        for i in range(n): bm.faces.new([lo[i], lo[(i + 1) % n], tip])
        return
    hi = [bm.verts.new((cx + r_top * math.cos(a), cy + r_top * math.sin(a), z1)) for a in ang]
    for i in range(n): bm.faces.new([lo[i], lo[(i + 1) % n], hi[(i + 1) % n], hi[i]])
    if top: bm.faces.new(hi)


def fins(bm, cw, cd, z, h, pitch=1.8, chevron=0.45):
    """Vertical fins around a cw x cd rectangle, taller toward the middle of each face."""
    for axis, length, half in ((0, cw, cd / 2), (1, cd, cw / 2)):
        n = max(3, int(length / pitch))
        for i in range(n + 1):
            t = -length / 2 + length * i / n
            fh = h * (1 - chevron + chevron * (1 - abs(t) / (length / 2)))
            for s in (-1, 1):
                a, b = (half - 0.1, half + 0.35) if s > 0 else (-half - 0.35, -half + 0.1)
                if axis == 0: box(bm, t - 0.25, t + 0.25, a, b, z, z + fh)
                else: box(bm, a, b, t - 0.25, t + 0.25, z, z + fh)


def ring(bm, hx, hy, z, t=0.4, h=0.4):
    """A thin rectangular frame (four bars) at height z."""
    box(bm, -hx, hx, -hy - t / 2, -hy + t / 2, z, z + h); box(bm, -hx, hx, hy - t / 2, hy + t / 2, z, z + h)
    box(bm, -hx - t / 2, -hx + t / 2, -hy, hy, z, z + h); box(bm, hx - t / 2, hx + t / 2, -hy, hy, z, z + h)


# ---------- the four designs: tiers are (fraction of W, fraction of D, chamfer m, z0, z1) with z as a fraction of height ----------
def deco(c, g, tw, td):
    """Limestone Art Deco: brass stepped crown with chevron fins, glowing lantern, spire."""
    box(c, -tw / 2 - 0.4, tw / 2 + 0.4, -td / 2 - 0.4, td / 2 + 0.4, 0, 1.2)
    z = 1.2
    for fx, fy, h in ((0.86, 0.80, 7.5), (0.64, 0.56, 6.5), (0.44, 0.36, 5.5)):
        cw, cd = tw * fx, td * fy
        box(g, -cw / 2 + 0.3, cw / 2 - 0.3, -cd / 2 + 0.3, cd / 2 - 0.3, z, z + h - 0.6)
        box(c, -cw / 2 - 0.25, cw / 2 + 0.25, -cd / 2 - 0.25, cd / 2 + 0.25, z + h - 0.6, z + h)
        fins(c, cw, cd, z, h)
        z += h
    lr = min(tw, td) * 0.17
    prism(g, lr, z, z + 5.0)
    for i in range(8):
        a = 2 * math.pi * i / 8; box(c, lr * math.cos(a) - 0.22, lr * math.cos(a) + 0.22, lr * math.sin(a) - 0.22, lr * math.sin(a) + 0.22, z, z + 5.0)
    prism(c, lr + 0.4, z + 5.0, z + 6.0); z += 6.0
    prism(c, lr * 0.9, z, z + 16.0, r_top=0.35); z += 16.0
    prism(c, 0.35, z, z + 9.0, n=6, r_top=0.12); z += 9.0
    return z


def glass(c, g, tw, td):
    """Glass: a crown sliced at a steep angle, lit edges and ribbons up the slope, a mast at the high end."""
    hx, hy, a = tw / 2, td / 2, 2.0
    rise = tw * 0.8
    v = [c.verts.new(p) for p in [(-hx, -hy, 0), (hx, -hy, 0), (hx, hy, 0), (-hx, hy, 0), (-hx, -hy, a), (hx, -hy, a + rise), (hx, hy, a + rise), (-hx, hy, a)]]
    for f in ((0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7)): c.faces.new([v[i] for i in f])
    s = rise / tw; nrm = np.array([-s, 0, 1]) / math.hypot(s, 1); off = nrm * 0.15
    def ribbon(y, w):
        p = [np.array(q) + off for q in [(-hx, y - w, a), (hx, y - w, a + rise), (hx, y + w, a + rise), (-hx, y + w, a)]]
        g.faces.new([g.verts.new(tuple(q)) for q in p])
    for y in np.linspace(-hy + 0.3, hy - 0.3, 7): ribbon(y, 0.22)
    # a lit band where the crown meets the tower, and one across the high edge
    for sy in (-1, 1): box(g, -hx, hx, sy * hy - 0.2, sy * hy + 0.2, 0.0, 0.4)
    box(g, hx - 0.2, hx + 0.2, -hy, hy, a + rise - 0.4, a + rise)
    prism(c, 0.5, a + rise, a + rise + 22, n=6, r_top=0.15, cx=hx - 2, cy=0)
    return a + rise + 22, (hx - 2, 0)


def brick(c, g, tw, td):
    """Brick: Gothic top with corner pinnacles, a lit band of dormers and a steep copper roof with a lantern."""
    hx, hy = tw / 2, td / 2
    box(c, -hx - 0.4, hx + 0.4, -hy - 0.4, hy + 0.4, 0, 1.0)
    box(g, -hx + 0.6, hx - 0.6, -hy + 0.6, hy - 0.6, 1.0, 3.2)
    fins(c, tw - 1.2, td - 1.2, 1.0, 3.6, pitch=2.4, chevron=0.0)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cx, cy = sx * (hx - 1.0), sy * (hy - 1.0)
            rect_frustum(c, 1.0, 1.0, 1.0, 1.0, 0, 9, cx=cx, cy=cy)
            rect_frustum(c, 1.15, 1.15, 0, 0, 9, 15, cx=cx, cy=cy)
    rh = min(tw, td) * 1.05
    rect_frustum(c, hx - 1.2, hy - 1.2, (hx - 1.2) * 0.3, (hy - 1.2) * 0.3, 3.2, 3.2 + rh * 0.7)
    z = 3.2 + rh * 0.7
    lx, ly = (hx - 1.2) * 0.3, (hy - 1.2) * 0.3
    box(g, -lx + 0.3, lx - 0.3, -ly + 0.3, ly - 0.3, z, z + 3.5)
    for sx in (-1, 1):
        for sy in (-1, 1): box(c, sx * lx - 0.35, sx * lx + 0.35, sy * ly - 0.35, sy * ly + 0.35, z, z + 3.5)
    rect_frustum(c, lx + 0.3, ly + 0.3, 0, 0, z + 3.5, z + 3.5 + rh * 0.35)
    z += 3.5 + rh * 0.35
    prism(c, 0.2, z - 1, z + 6, n=6, r_top=0.05); z += 6
    return z


def dark(c, g, tw, td):
    """Dark glass: a steel lattice lit from inside, so the members show against the light, over a plant box, and a tall antenna."""
    hx, hy, H = tw / 2, td / 2, 18.0
    box(c, -hx + 0.8, hx - 0.8, -hy + 0.8, hy - 0.8, 0, 7.5)              # plant box
    box(g, -hx + 1.2, hx - 1.2, -hy + 1.2, hy - 1.2, 7.5, H - 1.0)        # the lit core
    for sx in (-1, 1):
        for sy in (-1, 1): box(c, sx * hx - 0.4, sx * hx + 0.4, sy * hy - 0.4, sy * hy + 0.4, 0, H)
    for x in np.linspace(-hx, hx, int(tw / 2.4) + 1)[1:-1]:
        for sy in (-1, 1): box(c, x - 0.18, x + 0.18, sy * hy - 0.18, sy * hy + 0.18, 0, H)
    for y in np.linspace(-hy, hy, int(td / 2.4) + 1)[1:-1]:
        for sx in (-1, 1): box(c, sx * hx - 0.18, sx * hx + 0.18, y - 0.18, y + 0.18, 0, H)
    for z in np.arange(3.0, H - 1, 3.0): ring(c, hx, hy, z, t=0.35, h=0.35)
    ring(c, hx, hy, H - 0.7, t=0.7, h=0.7)
    prism(c, 0.7, H, H + 30, n=6, r_top=0.15)
    return H + 30


STYLES = {
    "glass": dict(tiers=[(1.00, 1.00, 4.0, 0.00, 0.55), (0.84, 0.86, 3.0, 0.55, 0.80), (0.70, 0.74, 2.5, 0.80, 1.00)], crown=glass,
                  mat=((0.07, 0.10, 0.15), 0.9, 0.12), glow=(0.55, 0.85, 1.0)),
    "deco": dict(tiers=[(1.00, 1.00, 0.0, 0.00, 0.42), (0.80, 0.78, 0.0, 0.42, 0.64), (0.62, 0.60, 0.0, 0.64, 0.84), (0.46, 0.44, 0.0, 0.84, 1.00)], crown=deco,
                 mat=((0.78, 0.60, 0.33), 0.85, 0.32), glow=(1.0, 0.75, 0.29)),
    "brick": dict(tiers=[(1.00, 1.00, 0.0, 0.00, 0.60), (0.78, 0.80, 0.0, 0.60, 0.85), (0.60, 0.62, 0.0, 0.85, 1.00)], crown=brick,
                  mat=((0.30, 0.52, 0.44), 0.35, 0.55), glow=(1.0, 0.72, 0.35)),
    "dark": dict(tiers=[(1.00, 1.00, 0.0, 0.00, 0.78), (0.86, 0.84, 0.0, 0.78, 1.00)], crown=dark,
                 mat=((0.13, 0.14, 0.16), 0.8, 0.38), glow=(0.57, 0.74, 1.0), strength=1.4),  # dim: the core is a big area, keep it under the bloom threshold
}


def principled(name, color, metal=0.0, rough=0.5, emit=None, strength=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1); b.inputs["Metallic"].default_value = metal; b.inputs["Roughness"].default_value = rough
    if emit: b.inputs["Emission Color"].default_value = (*emit, 1); b.inputs["Emission Strength"].default_value = strength
    return m


def to_object(scene, name, bm, mat):
    me = bpy.data.meshes.new(name); bm.normal_update(); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob); me.materials.append(mat)
    return ob


def build(name, spec):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    for oname, inset in (("Body", 0.0), ("Frame", 0.25)):
        bm = bmesh.new()
        for fx, fy, ch, z0, z1 in spec["tiers"]:
            hx, hy = W * fx / 2 - inset, D * fy / 2 - inset
            tier(bm, hx, hy, max(0.0, ch - inset * 0.4) if ch else 0.0, z0, z1)
        to_object(scene, oname, bm, principled(oname, (0.6, 0.6, 0.6)))
    fx, fy, ch = spec["tiers"][-1][:3]
    c, g = bmesh.new(), bmesh.new()
    res = spec["crown"](c, g, W * fx, D * fy)
    top, mast = (res if isinstance(res, tuple) else (res, (0.0, 0.0)))
    col, metal, rough = spec["mat"]
    mCrown = principled("Crown", col, metal, rough)
    crown = to_object(scene, "Crown", c, mCrown)
    to_object(scene, "Glow", g, principled("Glow", spec["glow"], emit=spec["glow"], strength=spec.get("strength", 4.0)))  # 4 = as bright as the old gold crown
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=0.55)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(mast[0], mast[1], top + 0.3))
    to_object(scene, "Beacon", bm, principled("Beacon", (1.0, 0.1, 0.06), emit=(1.0, 0.1, 0.06), strength=8.0))

    # bake ambient occlusion on the crown (the other parts it touches count as occluders) and fold it into a color texture
    scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = 128
    scene.world = bpy.data.worlds.new("w"); scene.world.color = (1, 1, 1)
    scene.world.light_settings.distance = 6.0
    bpy.context.view_layer.objects.active = crown
    for o in scene.objects: o.select_set(o is crown)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.01)
    bpy.ops.object.mode_set(mode="OBJECT")
    RES = 512
    ao = bpy.data.images.new("ao", RES, RES)
    nt = mCrown.node_tree; tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = ao; nt.nodes.active = tex
    scene.render.bake.margin = 4
    bpy.ops.object.bake(type="AO")
    px = np.array(ao.pixels[:]).reshape(RES, RES, 4)[..., 0]
    print(f"  {name}: AO min {px.min():.2f} mean {px.mean():.2f} max {px.max():.2f}")
    occ = (0.3 + 0.7 * px)[..., None]
    rgb = np.clip(np.array(col) * occ, 0, 1)
    img = bpy.data.images.new("crown_" + name, RES, RES); img.colorspace_settings.name = "sRGB"
    img.pixels[:] = np.concatenate([rgb, np.ones((RES, RES, 1))], axis=2).ravel()
    tex.image = img
    nt.links.new(tex.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])

    out = os.path.join(OUT, f"tower-{name}.glb")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_image_format="WEBP", export_yup=True, export_apply=True)
    print(f"OK {out} {os.path.getsize(out) // 1024}KB crown top {top:.1f} m")


for name, spec in STYLES.items(): build(name, spec)
