"""Headless Blender: model the Income tower ("the Bank") for the town.

Writes a GLB with these objects (Blender Z-up; the glTF exporter turns it Y-up):
  Body   setback tiers, axis-aligned boxes so town.js can put its lit-window facade shader on them
  Frame  the same tiers inset 0.25 m, for the bare concrete frame shown above the build cut
  Crown  brass Art Deco crown and spire, AO baked into its color texture
  Glow   warm lamps between the crown fins and in the lantern (emissive)
  Beacon red light on the mast tip

Usage: python bank_tower.py OUT.glb [W D H]
"""
import sys, math
import bpy, bmesh
import numpy as np

out = sys.argv[1]
W, D, H = (float(a) for a in sys.argv[2:5]) if len(sys.argv) >= 5 else (44.0, 31.0, 154.0)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def add_box(bm, x0, x1, y0, y1, z0, z1, bottom=False, top=True):
    v = [bm.verts.new(p) for p in [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
                                     (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]]
    faces = [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    if top: faces.append((4, 5, 6, 7))
    if bottom: faces.append((3, 2, 1, 0))
    for f in faces: bm.faces.new([v[i] for i in f])


def add_prism(bm, r, z0, z1, n=8, r_top=None, top=True):
    """n-sided prism or frustum around the Z axis; r_top=0 makes a cone."""
    r_top = r if r_top is None else r_top
    lo = [bm.verts.new((r * math.cos(2 * math.pi * (i + 0.5) / n), r * math.sin(2 * math.pi * (i + 0.5) / n), z0)) for i in range(n)]
    if r_top <= 1e-6:
        tip = bm.verts.new((0, 0, z1))
        for i in range(n): bm.faces.new([lo[i], lo[(i + 1) % n], tip])
        return
    hi = [bm.verts.new((r_top * math.cos(2 * math.pi * (i + 0.5) / n), r_top * math.sin(2 * math.pi * (i + 0.5) / n), z1)) for i in range(n)]
    for i in range(n): bm.faces.new([lo[i], lo[(i + 1) % n], hi[(i + 1) % n], hi[i]])
    if top: bm.faces.new(hi)


def to_object(name, bm, mat):
    me = bpy.data.meshes.new(name); bm.normal_update(); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    me.materials.append(mat)
    return ob


def principled(name, color, metal=0.0, rough=0.5, emit=None, strength=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Metallic"].default_value = metal
    b.inputs["Roughness"].default_value = rough
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    return m


# ---- body: four setback tiers, the Midtown wedding cake ----
TIERS = [(1.00, 1.00, 0.00, 0.42), (0.80, 0.78, 0.42, 0.64), (0.62, 0.60, 0.64, 0.84), (0.46, 0.44, 0.84, 1.00)]
mBody = principled("Body", (0.75, 0.70, 0.61))
mFrame = principled("Frame", (0.5, 0.5, 0.5))
for name, inset, mat in [("Body", 0.0, mBody), ("Frame", 0.25, mFrame)]:
    bm = bmesh.new()
    for fx, fy, z0, z1 in TIERS:
        hx, hy = W * fx / 2 - inset, D * fy / 2 - inset
        add_box(bm, -hx, hx, -hy, hy, H * z0, H * z1)
    to_object(name, bm, mat)

# ---- crown: stepped brass tiers with vertical fins, a lantern and a mast ----
mBrass = principled("Crown", (0.78, 0.60, 0.33), metal=0.85, rough=0.32)
mGlow = principled("Glow", (1.0, 0.75, 0.29), emit=(1.0, 0.75, 0.29), strength=4.0)
mBeacon = principled("Beacon", (1.0, 0.1, 0.06), emit=(1.0, 0.1, 0.06), strength=8.0)

topW, topD = W * TIERS[-1][0], D * TIERS[-1][1]
brass, glow = bmesh.new(), bmesh.new()
z = H
# a parapet with a deco cornice band where the body meets the crown
add_box(brass, -topW / 2 - 0.4, topW / 2 + 0.4, -topD / 2 - 0.4, topD / 2 + 0.4, z, z + 1.2)
z += 1.2
CROWN = [(0.86, 0.80, 7.5), (0.64, 0.56, 6.5), (0.44, 0.36, 5.5)]
for fx, fy, h in CROWN:
    cw, cd = topW * fx, topD * fy
    # lit core, slightly inset, so the gaps between fins glow
    add_box(glow, -cw / 2 + 0.3, cw / 2 - 0.3, -cd / 2 + 0.3, cd / 2 - 0.3, z, z + h - 0.6)
    # brass cap slab with a small overhang
    add_box(brass, -cw / 2 - 0.25, cw / 2 + 0.25, -cd / 2 - 0.25, cd / 2 + 0.25, z + h - 0.6, z + h)
    # fins on every face, taller at the middle of each face for a chevron profile
    for axis, length, half_other in [(0, cw, cd / 2), (1, cd, cw / 2)]:
        n = max(3, int(length / 1.8))
        for i in range(n + 1):
            t = -length / 2 + length * i / n
            mid = 1 - abs(t) / (length / 2)
            fh = h * (0.55 + 0.45 * mid)
            for s in (-1, 1):
                o = s * half_other
                if axis == 0:
                    add_box(brass, t - 0.25, t + 0.25, o - 0.35 if s < 0 else o - 0.1, o + 0.1 if s < 0 else o + 0.35, z, z + fh)
                else:
                    add_box(brass, o - 0.35 if s < 0 else o - 0.1, o + 0.1 if s < 0 else o + 0.35, t - 0.25, t + 0.25, z, z + fh)
    z += h
# lantern: glowing octagon with brass ribs and a cap
lr = min(topW, topD) * 0.17
add_prism(glow, lr, z, z + 5.0)
for i in range(8):
    a = 2 * math.pi * i / 8
    cx, cy = lr * math.cos(a), lr * math.sin(a)
    add_box(brass, cx - 0.22, cx + 0.22, cy - 0.22, cy + 0.22, z, z + 5.0)
add_prism(brass, lr + 0.4, z + 5.0, z + 6.0)
z += 6.0
# spire: a tapered octagon, then the mast
add_prism(brass, lr * 0.9, z, z + 16.0, r_top=0.35, top=True)
z += 16.0
add_prism(brass, 0.35, z, z + 9.0, n=6, r_top=0.12)
z += 9.0
crown = to_object("Crown", brass, mBrass)
to_object("Glow", glow, mGlow)
bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=6, radius=0.55)
bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, z + 0.3))
to_object("Beacon", bm, mBeacon)

# ---- bake ambient occlusion into the brass so the fins read at a distance ----
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 96
scene.world = bpy.data.worlds.new("w"); scene.world.color = (1, 1, 1)
bpy.context.view_layer.objects.active = crown
for o in scene.objects: o.select_set(o is crown)
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.01)
bpy.ops.object.mode_set(mode="OBJECT")
RES = 512
ao = bpy.data.images.new("crown_ao", RES, RES)
nt = mBrass.node_tree
tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = ao
nt.nodes.active = tex
scene.render.bake.margin = 4
bpy.ops.object.bake(type="AO")
# fold the AO into a color texture: brass * AO, lifted a little so crevices stay brass, not black
px = np.array(ao.pixels[:]).reshape(RES, RES, 4)
occ = 0.35 + 0.65 * px[..., :1]
base = np.array([0.78, 0.60, 0.33])
col = np.concatenate([np.clip(base * occ, 0, 1), np.ones((RES, RES, 1))], axis=2)
img = bpy.data.images.new("crown_color", RES, RES)
img.pixels[:] = col.ravel()
img.colorspace_settings.name = "sRGB"
tex.image = img
nt.links.new(tex.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"])

bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_image_format="WEBP",
                          export_yup=True, export_apply=True, export_materials="EXPORT", use_selection=False)
tris = sum(len(o.data.polygons) for o in scene.objects)
print(f"OK {out} faces={tris} top={z:.1f}m")
