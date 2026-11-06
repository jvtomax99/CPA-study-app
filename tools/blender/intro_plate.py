"""The launch screen's Tap to Start plate, rendered in Blender's Cycles (bpy, the pip package; `pip install bpy`).
Track level in a brick cutting, looking into the LAST STOP portal, with the tax tower behind lit to your mastery.
The app shows the result from art/intro-plate/ (src/intro.js, "the rendered Tap to Start"); tools/intro_plate.py renders
every file it needs with this script and assembles them. Assets it reads, from --assets (not in the repo; see that tool):
  tex/   Poly Haven textures (CC0): red_brick_03, castle_brick_02_white, concrete_wall_006, dark_wooden_planks,
         rusty_metal_02, gravel_floor_02 (2k: Diffuse, nor_gl, Rough, Displacement), and the HDRI modern_buildings_night
  art/   the app's own graffiti and neon letter strokes, exported from src/introart.js (tools/intro_plate.py does it)
  meshy/ tank.glb, signal.glb, lamp.glb, box.glb: props generated in Meshy (prompts in tools/intro_plate.py)
Usage: python3 intro_plate.py --assets DIR --cam phone|desk --out f.png [--mastery 0.4] [--region tower|neon] [--neon 0.01]
"""
import bpy, bmesh, math, json, random, sys, os, argparse
from mathutils import Vector, Matrix

ap = argparse.ArgumentParser()
ap.add_argument("--assets", default="build/intro-plate")
ap.add_argument("--out", default="plate.png")
ap.add_argument("--scale", type=float, default=1.0)
ap.add_argument("--samples", type=int, default=160)
ap.add_argument("--mastery", type=float, default=0.4)
ap.add_argument("--w", type=int, default=0)
ap.add_argument("--h", type=int, default=0)
ap.add_argument("--blend", default="")
ap.add_argument("--border", default="")
ap.add_argument("--neon", type=float, default=1.0)
ap.add_argument("--cam", default="phone")
ap.add_argument("--region", default="")
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
DESK = a.cam == "desk"
if not a.w: a.w, a.h = (1920, 1200) if DESK else (780, 1690)
TEX, ART, MESHY = a.assets + "/tex/", a.assets + "/art/", a.assets + "/meshy/"

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
R = random.Random(7)

def srgb(h, k=1.0):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) * k for x in c]
    return (*lin, 1.0)

def link(nt, a, b): nt.links.new(a, b)

def img(path, non_color=False):
    i = bpy.data.images.load(path, check_existing=True)
    if non_color: i.colorspace_settings.name = "Non-Color"
    return i

def obj(name, me, mat=None, loc=(0, 0, 0)):
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o); o.location = loc
    if mat: o.data.materials.append(mat)
    return o

def box(name, sx, sy, sz, loc, mat=None, bevel=0.0):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz))
    bm.to_mesh(me); bm.free(); o = obj(name, me, mat, loc)
    if bevel:
        m = o.modifiers.new("b", "BEVEL"); m.width = bevel; m.segments = 2; m.limit_method = "ANGLE"
    return o

# ---------- materials ----------
def pbr(name, base, scale=1.0, tint=None, rough_k=1.0, bump=1.0, disp=None, metal=0.0, wet=None, proj="BOX"):
    """Poly Haven set, projected in world space (box), so every face gets real-size texture."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N = nt.nodes
    bsdf = N["Principled BSDF"]; tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (1 / scale, 1 / scale, 1 / scale); link(nt, tc.outputs["Object"], mp.inputs["Vector"])
    def tex(suffix, nc):
        t = N.new("ShaderNodeTexImage"); t.image = img(TEX + base + "_" + suffix + ".jpg", nc); t.projection = proj; t.projection_blend = 0.25
        link(nt, mp.outputs["Vector"], t.inputs["Vector"]); return t
    d = tex("Diffuse", False); col = d.outputs["Color"]
    if tint:
        mix = N.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs["Factor"].default_value = 1
        link(nt, col, mix.inputs["A"]); mix.inputs["B"].default_value = tint; col = mix.outputs["Result"]
    r = tex("Rough", True); rm = N.new("ShaderNodeMath"); rm.operation = "MULTIPLY"; rm.inputs[1].default_value = rough_k
    link(nt, r.outputs["Color"], rm.inputs[0]); rough = rm.outputs["Value"]
    n = tex("nor_gl", True); nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = bump
    link(nt, n.outputs["Color"], nm.inputs["Color"]); nrm = nm.outputs["Normal"]
    if wet is not None:
        # puddles: a noise mask; water is dark, glossy and flat
        nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = wet; nz.inputs["Detail"].default_value = 6
        link(nt, tc.outputs["Object"], nz.inputs["Vector"])
        cr = N.new("ShaderNodeMapRange"); cr.inputs["From Min"].default_value = 0.52; cr.inputs["From Max"].default_value = 0.56
        link(nt, nz.outputs["Fac"], cr.inputs["Value"]); k = cr.outputs["Result"]
        mc = N.new("ShaderNodeMix"); mc.data_type = "RGBA"; mc.blend_type = "MULTIPLY"; link(nt, k, mc.inputs["Factor"])
        link(nt, col, mc.inputs["A"]); mc.inputs["B"].default_value = (0.35, 0.35, 0.37, 1); col = mc.outputs["Result"]
        mr = N.new("ShaderNodeMix"); mr.data_type = "FLOAT"; link(nt, k, mr.inputs["Factor"]); link(nt, rough, mr.inputs["A"])
        mr.inputs["B"].default_value = 0.03; rough = mr.outputs["Result"]
        mn = N.new("ShaderNodeMix"); mn.data_type = "VECTOR"; link(nt, k, mn.inputs["Factor"]); link(nt, nrm, mn.inputs["A"])
        gn = N.new("ShaderNodeNewGeometry"); link(nt, gn.outputs["Normal"], mn.inputs["B"]); nrm = mn.outputs["Result"]
    link(nt, col, bsdf.inputs["Base Color"]); link(nt, rough, bsdf.inputs["Roughness"]); link(nt, nrm, bsdf.inputs["Normal"])
    bsdf.inputs["Metallic"].default_value = metal
    m["mapping"] = mp.name
    return m

def flat(name, color, rough=0.5, metal=0.0, emit=None, es=0.0, alpha=1.0, trans=0.0, ior=1.45):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = color; b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    b.inputs["Transmission Weight"].default_value = trans; b.inputs["IOR"].default_value = ior
    if emit: b.inputs["Emission Color"].default_value = emit; b.inputs["Emission Strength"].default_value = es
    return m

def emissive(name, color, strength):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N = nt.nodes
    N.remove(N["Principled BSDF"]); e = N.new("ShaderNodeEmission"); e.inputs["Color"].default_value = color; e.inputs["Strength"].default_value = strength
    link(nt, e.outputs[0], N["Material Output"].inputs["Surface"]); return m

def decal_mat(name, png, brick_scale):
    """spray paint on brick: the piece's own alpha, the brick's normal (paint follows the mortar), mortar shows through a little"""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; b = N["Principled BSDF"]
    t = N.new("ShaderNodeTexImage"); t.image = img(png); t.interpolation = "Cubic"; t.extension = "CLIP"
    tc = N.new("ShaderNodeTexCoord"); link(nt, tc.outputs["UV"], t.inputs["Vector"])
    mp = N.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1 / brick_scale,) * 3; link(nt, tc.outputs["Object"], mp.inputs["Vector"])
    # world-aligned brick maps, same as the wall (object space of the decal ~ world; fine for a mock)
    mp.inputs["Location"].default_value = (0, 0, 0)
    tcw = N.new("ShaderNodeTexCoord"); mw = N.new("ShaderNodeMapping"); mw.inputs["Scale"].default_value = (1 / brick_scale,) * 3
    gp = N.new("ShaderNodeNewGeometry"); link(nt, gp.outputs["Position"], mw.inputs["Vector"])
    n = N.new("ShaderNodeTexImage"); n.image = img(TEX + "red_brick_03_nor_gl.jpg", True); n.projection = "BOX"; n.projection_blend = 0.25
    link(nt, mw.outputs["Vector"], n.inputs["Vector"]); nm = N.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = 1.2
    link(nt, n.outputs["Color"], nm.inputs["Color"]); link(nt, nm.outputs["Normal"], b.inputs["Normal"])
    dsp = N.new("ShaderNodeTexImage"); dsp.image = img(TEX + "red_brick_03_Displacement.jpg", True); dsp.projection = "BOX"; dsp.projection_blend = 0.25
    link(nt, mw.outputs["Vector"], dsp.inputs["Vector"])
    # mortar (low displacement) keeps less paint; overall a bit faded
    mr = N.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.25; mr.inputs["From Max"].default_value = 0.45
    mr.inputs["To Min"].default_value = 0.55; mr.inputs["To Max"].default_value = 0.96; link(nt, dsp.outputs["Color"], mr.inputs["Value"])
    al = N.new("ShaderNodeMath"); al.operation = "MULTIPLY"; link(nt, t.outputs["Alpha"], al.inputs[0]); link(nt, mr.outputs["Result"], al.inputs[1])
    dk = N.new("ShaderNodeMix"); dk.data_type = "RGBA"; dk.blend_type = "MULTIPLY"; dk.inputs["Factor"].default_value = 1
    link(nt, t.outputs["Color"], dk.inputs["A"]); dk.inputs["B"].default_value = (0.78, 0.76, 0.76, 1)
    link(nt, dk.outputs["Result"], b.inputs["Base Color"]); link(nt, al.outputs["Value"], b.inputs["Alpha"])
    b.inputs["Roughness"].default_value = 0.5
    return m

def plane(name, w, h, loc, rot, mat):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    vs = [bm.verts.new((x, 0, z)) for x, z in ((-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2))]
    f = bm.faces.new(vs); uv = bm.loops.layers.uv.new()
    for l, c in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): l[uv].uv = c
    bm.to_mesh(me); bm.free(); o = obj(name, me, mat, loc); o.rotation_euler = rot; return o

BRICK = 1.6   # meters one brick tile covers
brick = pbr("brick", "red_brick_03", BRICK, tint=srgb("#b08a84"), bump=1.4)
brick_bld = pbr("brick_bld", "red_brick_03", BRICK, tint=srgb("#8a6a66"), bump=1.4)
brick_dark = pbr("brick_dark", "red_brick_03", BRICK, tint=srgb("#7a6260"), bump=1.4, rough_k=1.0)
stone = pbr("stone", "castle_brick_02_white", 2.0, tint=srgb("#9c9aa2"), bump=1.0)
conc = pbr("conc", "concrete_wall_006", 3.0, tint=srgb("#7d7a80"), bump=0.8, wet=0.9)
conc_tun = pbr("conc_tun", "concrete_wall_006", 3.0, tint=srgb("#5e5658"), bump=0.9)
wood = pbr("wood", "dark_wooden_planks", 1.2, tint=srgb("#6a5a50"), bump=0.8)
rust = pbr("rust", "rusty_metal_02", 0.8, tint=srgb("#8a7a74"), bump=0.6, metal=0.6)
gravel = pbr("gravel", "gravel_floor_02", 1.5, tint=srgb("#6c6a70"), bump=1.6)

def light(kind, loc, energy, color, size=0.3, aim=None, spot=None):
    ld = bpy.data.lights.new("L", kind); ld.energy = energy; ld.color = srgb(color)[:3]
    if kind in ("POINT", "SPOT"): ld.shadow_soft_size = size
    if kind == "SPOT": ld.spot_size = math.radians(spot or 60); ld.spot_blend = 0.6
    if kind == "AREA": ld.size = size
    o = bpy.data.objects.new("L", ld); sc.collection.objects.link(o); o.location = loc
    if aim: o.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o

# ---------- the cutting ----------
L0, L1 = 0.0, 80.0            # portal face at y=0, cutting runs to y=+70 toward the camera
WALL_X, WALL_TOP = 5.6, 4.8
box("bed", 2 * WALL_X, L1 + 80, 0.4, (0, (L1 - 80) / 2, -0.42), conc)     # concrete track bed, wet (also inside the tunnel)
box("ballast", 3.2, L1 + 80, 0.12, (0, (L1 - 80) / 2, -0.2), gravel)
for sx in (-1, 1):
    box("wall%d" % sx, 1.2, L1, WALL_TOP + 0.6, (sx * (WALL_X + 0.6), L1 / 2, (WALL_TOP - 0.6) / 2), brick)
    box("coping%d" % sx, 1.5, L1, 0.32, (sx * (WALL_X + 0.55), L1 / 2, WALL_TOP + 0.16), stone, bevel=0.03)
    box("bench%d" % sx, 1.3, L1, 0.5, (sx * (WALL_X - 0.65), L1 / 2, -0.05), conc)
    # railing on the street above
    box("rail%d" % sx, 0.06, L1, 0.06, (sx * (WALL_X + 0.4), L1 / 2, WALL_TOP + 1.25), rust)
    for y in range(1, int(L1), 2):
        box("post%d_%d" % (sx, y), 0.05, 0.05, 0.95, (sx * (WALL_X + 0.4), y, WALL_TOP + 0.78), rust)
    # sidewalk and street up top
    box("walk%d" % sx, 6, L1 + 10, 0.3, (sx * (WALL_X + 3.5), L1 / 2, WALL_TOP + 0.1), conc)

# ties and rails
tie = box("tie", 2.6, 0.24, 0.17, (0, -78, -0.08), wood, bevel=0.01)
arr = tie.modifiers.new("a", "ARRAY"); arr.count = int((L1 + 78) / 0.72); arr.relative_offset_displace = (0, 0, 0); arr.use_constant_offset = True; arr.use_relative_offset = False
arr.constant_offset_displace = (0, 0.72, 0)
steel = bpy.data.materials.new("railsteel"); steel.use_nodes = True
nt = steel.node_tree; N = nt.nodes; b = N["Principled BSDF"]; gn = N.new("ShaderNodeNewGeometry"); sp = N.new("ShaderNodeSeparateXYZ")
link(nt, gn.outputs["Normal"], sp.inputs[0]); mr = N.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.7; mr.inputs["From Max"].default_value = 0.95
link(nt, sp.outputs["Z"], mr.inputs["Value"])
mc = N.new("ShaderNodeMix"); mc.data_type = "RGBA"; link(nt, mr.outputs["Result"], mc.inputs["Factor"]); mc.inputs["A"].default_value = srgb("#4a3328"); mc.inputs["B"].default_value = srgb("#d8dade")
link(nt, mc.outputs["Result"], b.inputs["Base Color"])
mro = N.new("ShaderNodeMix"); mro.data_type = "FLOAT"; link(nt, mr.outputs["Result"], mro.inputs["Factor"]); mro.inputs["A"].default_value = 0.75; mro.inputs["B"].default_value = 0.12
link(nt, mro.outputs["Result"], b.inputs["Roughness"]); mme = N.new("ShaderNodeMix"); mme.data_type = "FLOAT"; link(nt, mr.outputs["Result"], mme.inputs["Factor"])
mme.inputs["A"].default_value = 0.3; mme.inputs["B"].default_value = 1.0; link(nt, mme.outputs["Result"], b.inputs["Metallic"])

def rail(x, y0, y1, name):
    prof = [(-0.07, 0), (0.07, 0), (0.07, 0.012), (0.009, 0.03), (0.009, 0.115), (0.034, 0.125), (0.034, 0.165), (-0.034, 0.165), (-0.034, 0.125), (-0.009, 0.115), (-0.009, 0.03), (-0.07, 0.012)]
    me = bpy.data.meshes.new(name); bm = bmesh.new(); A = [bm.verts.new((x + px, y0, pz)) for px, pz in prof]; B = [bm.verts.new((x + px, y1, pz)) for px, pz in prof]
    n = len(prof)
    for i in range(n): bm.faces.new((A[i], A[(i + 1) % n], B[(i + 1) % n], B[i]))
    bm.faces.new(A[::-1]); bm.faces.new(B); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    o = obj(name, me, steel, (0, 0, 0.01)); return o
for x in (-0.7175, 0.7175): rail(x, -78, L1, "rail%.1f" % x)
# third rail with its wooden cover board, on insulators
box("third", 0.08, L1 + 78, 0.12, (1.62, (L1 - 78) / 2, 0.12), rust)
box("cover", 0.42, L1 + 78, 0.04, (1.62, (L1 - 78) / 2, 0.36), wood)
for y in range(-76, int(L1), 3):
    box("ins%d" % y, 0.1, 0.1, 0.12, (1.62, y, 0.02), flat("ins", srgb("#a89a7a"), 0.4))

# ---------- the portal ----------
ARCH_R, ARCH_C = 4.4, 5.6
face = box("face", 74 if DESK else 34, 2.4, 14.5, (0, -1.2, 6.75), brick_dark)
cut = box("cut", 2 * ARCH_R, 6, ARCH_C + 1.5, (0, -1.2, (ARCH_C - 1.5) / 2 - 0.0))
cyl = bpy.data.meshes.new("cyl"); bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=64, radius1=ARCH_R, radius2=ARCH_R, depth=6); bm.to_mesh(cyl); bm.free()
cy = obj("cy", cyl, None, (0, -1.2, ARCH_C)); cy.rotation_euler = (math.pi / 2, 0, 0)
for c in (cut, cy):
    m = face.modifiers.new("bool", "BOOLEAN"); m.operation = "DIFFERENCE"; m.object = c; m.solver = "EXACT"
bpy.context.view_layer.objects.active = face
for m in list(face.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
cut.hide_render = cy.hide_render = True; cut.hide_viewport = cy.hide_viewport = True
# voussoirs: a stone ring of separate blocks with a keystone
for i in range(19):
    t = math.pi * (i + 0.5) / 19; ang = t; w = 0.85 if i != 9 else 1.15
    blk = box("vous%d" % i, 0.78, 0.5, 0.9 * w, (math.cos(ang) * (ARCH_R + 0.45), 0.12, ARCH_C + math.sin(ang) * (ARCH_R + 0.45)), stone, bevel=0.04)
    blk.rotation_euler = (0, -(ang - math.pi / 2), 0); blk.scale = (1.0 if i != 9 else 1.25, 1, 1)
for sx in (-1, 1):
    for k in range(7):
        box("jamb%d_%d" % (sx, k), 0.9, 0.5, 0.78, (sx * (ARCH_R + 0.45), 0.12, -0.2 + k * 0.84), stone, bevel=0.04)
box("string", 74.2 if DESK else 34.2, 0.45, 0.4, (0, 0.1, 13.6), stone, bevel=0.03)
box("pier_l", 1.2, 0.6, 14, (-16.4, 0.1, 6.6), stone, bevel=0.03)
box("pier_r", 1.2, 0.6, 14, (16.4, 0.1, 6.6), stone, bevel=0.03)

# tunnel shell beyond the arch: walls, vault, sodium lamps, the glow at the far end
TUN = 70
me = bpy.data.meshes.new("tunnel"); bm = bmesh.new(); prof = [(ARCH_R, -0.4)] + [(math.cos(math.pi * i / 32) * ARCH_R, ARCH_C + math.sin(math.pi * i / 32) * ARCH_R) for i in range(33)] + [(-ARCH_R, -0.4)]
rows = []
for j in range(29):
    y = -2.3 - j * (TUN / 28); rows.append([bm.verts.new((x, y, z)) for x, z in prof])
for j in range(28):
    for i in range(len(prof) - 1): bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
bm.to_mesh(me); bm.free(); tun = obj("tunnel", me, conc_tun)
sod = emissive("sodium", srgb("#ff9a3a"), 28)
for k in range(14):
    y = -4 - k * 5
    for sx in (-1, 1):
        box("lamp%d%d" % (k, sx), 0.08, 0.5, 0.14, (sx * (ARCH_R - 0.12), y, 3.4), sod)
    box("crown%d" % k, 0.35, 0.12, 0.06, (0, y, ARCH_C + ARCH_R - 0.08), sod)
endglow = bpy.data.materials.new("endglow"); endglow.use_nodes = True; nt = endglow.node_tree; N = nt.nodes; N.remove(N["Principled BSDF"])
e = N.new("ShaderNodeEmission"); gr = N.new("ShaderNodeTexGradient"); gr.gradient_type = "SPHERICAL"; tc = N.new("ShaderNodeTexCoord"); mp = N.new("ShaderNodeMapping")
mp.inputs["Scale"].default_value = (0.13, 0.13, 0.13); mp.inputs["Location"].default_value = (0, 0, -0.55 * 0.13)
link(nt, tc.outputs["Object"], mp.inputs["Vector"]); link(nt, mp.outputs["Vector"], gr.inputs["Vector"])
cr = N.new("ShaderNodeValToRGB"); cr.color_ramp.elements[0].color = srgb("#2a1408", 0.2); cr.color_ramp.elements[1].color = srgb("#ffd9a0", 1.0)
link(nt, gr.outputs["Fac"], cr.inputs["Fac"]); link(nt, cr.outputs["Color"], e.inputs["Color"]); e.inputs["Strength"].default_value = 0.12
link(nt, e.outputs[0], N["Material Output"].inputs["Surface"])
plane("end", 2 * ARCH_R, ARCH_C + ARCH_R + 1, (0, -TUN - 2, (ARCH_C + ARCH_R) / 2 - 0.2), (0, 0, 0), endglow)

# haze: inside the tunnel, thinner in the cutting (gives the neon and sodium their halo)
def haze(name, size, loc, dens, color="#e8dcff"):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; N.remove(N["Principled BSDF"])
    v = N.new("ShaderNodeVolumePrincipled"); v.inputs["Density"].default_value = dens; v.inputs["Color"].default_value = srgb(color); v.inputs["Anisotropy"].default_value = 0.55
    link(nt, v.outputs[0], N["Material Output"].inputs["Volume"]); return box(name, *size, loc, m)
haze("hz_tun", (2 * ARCH_R, TUN, ARCH_C + ARCH_R + 0.4), (0, -TUN / 2 - 2.4, (ARCH_C + ARCH_R) / 2 - 0.2), 0.045, "#ffe2c4")
haze("hz_cut", (2 * WALL_X + 30, L1 + 4, 26), (0, L1 / 2 - 0.5, 12.5), 0.0012, "#b8a8ff")

# ---------- graffiti ----------
dm = {k: decal_mat("dec_" + k, ART + k + ".png", BRICK) for k in ("uptown", "bronx", "queens", "harlem", "bklyn", "tags")}
up = (0, 0, math.pi)
plane("g_uptown", 3.9, 1.14, (6.75, 0.012, 10.2), up, dm["uptown"])
plane("g_bronx", 3.9, 1.14, (-6.75, 0.012, 9.9), up, dm["bronx"])
plane("g_tags_l", 6, 3, (-6.2, 0.015, 12.2), up, dm["tags"])
plane("g_tags_r", 6, 3, (6.6, 0.014, 7.2), up, dm["tags"])
for sx, (w1, w2) in ((-1, ("queens", "harlem")), (1, ("bklyn", "uptown"))):
    rot = (0, 0, -sx * math.pi / 2)
    plane("gw1%d" % sx, 9, 2.64, (sx * (WALL_X - 0.012), 14, 2.75), rot, dm[w1])
    plane("gw2%d" % sx, 9, 2.64, (sx * (WALL_X - 0.012), 32, 2.6), rot, dm[w2])
    plane("gw3%d" % sx, 9, 2.64, (sx * (WALL_X - 0.012), 23, 2.7), rot, dm[w2 if sx > 0 else w1])
    plane("gwt2%d" % sx, 12, 6, (sx * (WALL_X - 0.014), 44, 2.4), rot, dm["tags"])
    plane("gwt%d" % sx, 12, 6, (sx * (WALL_X - 0.014), 22, 2.4), rot, dm["tags"])

# ---------- LAST STOP in glass neon, on raceways ----------
G = json.load(open(ART + "glyphs.json")); GL, WIDE = G["G"], G["WIDE"]
word, Hh = "LAST STOP", 1.05
ws = [Hh * 0.45 if c == " " else (WIDE.get(c, 0.7)) * Hh * 0.75 for c in word]
total = sum(ws) + Hh * 0.22 * (len(word) - 1); x0 = -total / 2; ytop = 12.55
pink_core = bpy.data.materials.new("neon"); pink_core.use_nodes = True; nt = pink_core.node_tree; N = nt.nodes; N.remove(N["Principled BSDF"])
e = N.new("ShaderNodeEmission"); e.inputs["Color"].default_value = srgb("#ff3fa4"); e.inputs["Strength"].default_value = 70 * a.neon
lw = N.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.35
mixc = N.new("ShaderNodeMix"); mixc.data_type = "RGBA"; link(nt, lw.outputs["Facing"], mixc.inputs["Factor"])
mixc.inputs["A"].default_value = srgb("#ffd0ea"); mixc.inputs["B"].default_value = srgb("#ff1e8c"); link(nt, mixc.outputs["Result"], e.inputs["Color"])
link(nt, e.outputs[0], N["Material Output"].inputs["Surface"])
blackout = flat("blackout", srgb("#0c0b10"), 0.4)
cu = bpy.data.curves.new("neon", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.032; cu.bevel_resolution = 3
cx = x0
for i, ch in enumerate(word):
    for st in GL.get(ch, []):
        sp = cu.splines.new("POLY"); sp.points.add(len(st) - 1)
        for k, (px, py) in enumerate(st): sp.points[k].co = (-(cx + px * ws[i]), 0.32, ytop - py * Hh, 1)
    cx += ws[i] + Hh * 0.22
no = obj("neon", cu, pink_core)
board = flat("raceway", srgb("#1b1a24"), 0.35, 0.7)
for zz in (ytop - Hh * 0.25, ytop - Hh * 0.8):
    box("race%.1f" % zz, total + 0.4, 0.12, 0.1, (0, 0.18, zz), board)
box("transformer", 0.5, 0.25, 0.35, (total / 2 + 0.7, 0.14, ytop - Hh * 0.5), board)
for i in range(12):
    box("stand%d" % i, 0.025, 0.2, 0.025, (x0 + i * total / 11, 0.24, ytop - Hh * (0.25 if i % 2 else 0.8)), flat("glass", srgb("#cfd6e0"), 0.1))

# ---------- the street beyond the portal: a coping on the face, then a street wall of walk-ups ----------
BZ1 = 14.0
box("coping_face", 74.4 if DESK else 34.4, 0.7, 0.35, (0, -0.2, 14.15), stone, bevel=0.03)

def M(nt, op, a, b=None, clamp=False):
    n = nt.nodes.new("ShaderNodeMath"); n.operation = op; n.use_clamp = clamp
    for i, v in enumerate((a, b)):
        if v is None: continue
        if isinstance(v, (int, float)): n.inputs[i].default_value = v
        else: nt.links.new(v, n.inputs[i])
    return n.outputs[0]

def win_mat(name, wall, cell=(1.7, 3.2), p=0.35, lit_to=None, gold_line=False, k=2.2, glass="#07080e", warm=("#ffd8a0", "#ffe9c8", "#ffc27a"), cool="#bfe6ff", pierce=0.0, frac=(0.17, 0.83, 0.2, 0.84), brick_tex=False):
    """Facade with windows drawn per pixel: each cell gets its own random (lit or dark, how bright, warm or cool),
    lit rooms brighter at the ceiling, unlit glass dark and glossy so it reflects; optional lit-to height and gold line."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; b = N["Principled BSDF"]
    gp = N.new("ShaderNodeNewGeometry"); sp = N.new("ShaderNodeSeparateXYZ"); link(nt, gp.outputs["Position"], sp.inputs[0])
    oi = N.new("ShaderNodeObjectInfo")
    h = M(nt, "ADD", sp.outputs["X"], sp.outputs["Y"])
    cu = M(nt, "DIVIDE", h, cell[0]); cv = M(nt, "DIVIDE", sp.outputs["Z"], cell[1])
    fu = M(nt, "FRACT", cu); fv = M(nt, "FRACT", cv)
    iu = M(nt, "FLOOR", cu); iv = M(nt, "FLOOR", cv)
    cmb = N.new("ShaderNodeCombineXYZ"); link(nt, iu, cmb.inputs["X"]); link(nt, iv, cmb.inputs["Y"]); link(nt, M(nt, "MULTIPLY", oi.outputs["Random"], 97.0), cmb.inputs["Z"])
    wn = N.new("ShaderNodeTexWhiteNoise"); wn.noise_dimensions = "3D"; link(nt, cmb.outputs[0], wn.inputs["Vector"])
    rc = N.new("ShaderNodeSeparateColor"); link(nt, wn.outputs["Color"], rc.inputs[0])
    r1, r2, r3 = wn.outputs["Value"], rc.outputs[0], rc.outputs[1]
    mu = M(nt, "MULTIPLY", M(nt, "GREATER_THAN", fu, frac[0]), M(nt, "LESS_THAN", fu, frac[1]))
    mv = M(nt, "MULTIPLY", M(nt, "GREATER_THAN", fv, frac[2]), M(nt, "LESS_THAN", fv, frac[3]))
    mask = M(nt, "MULTIPLY", mu, mv)
    lit = M(nt, "LESS_THAN", r1, p)
    if lit_to is not None: lit = M(nt, "MULTIPLY", lit, M(nt, "LESS_THAN", sp.outputs["Z"], lit_to))
    fvw = M(nt, "DIVIDE", M(nt, "SUBTRACT", fv, frac[2]), frac[3] - frac[2])
    grad = M(nt, "ADD", 0.45, M(nt, "MULTIPLY", fvw, 0.9))
    blinds = M(nt, "LESS_THAN", M(nt, "ABSOLUTE", M(nt, "SUBTRACT", r3, 0.5)), 0.08)       # some rooms have the blind half down
    bl = M(nt, "ADD", M(nt, "SUBTRACT", 1.0, blinds), M(nt, "MULTIPLY", blinds, M(nt, "ADD", 0.3, M(nt, "MULTIPLY", M(nt, "LESS_THAN", fvw, 0.55), 0.7))))
    bri = M(nt, "ADD", 0.35, M(nt, "MULTIPLY", r2, 1.3))
    em = M(nt, "MULTIPLY", M(nt, "MULTIPLY", M(nt, "MULTIPLY", mask, lit), M(nt, "MULTIPLY", grad, bri)), M(nt, "MULTIPLY", bl, k))
    c1 = N.new("ShaderNodeMix"); c1.data_type = "RGBA"; link(nt, M(nt, "GREATER_THAN", r3, 0.82), c1.inputs["Factor"])
    c0 = N.new("ShaderNodeMix"); c0.data_type = "RGBA"; link(nt, r2, c0.inputs["Factor"]); c0.inputs["A"].default_value = srgb(warm[0]); c0.inputs["B"].default_value = srgb(warm[2])
    link(nt, c0.outputs["Result"], c1.inputs["A"]); c1.inputs["B"].default_value = srgb(cool)
    ecol = c1.outputs["Result"]
    if gold_line and lit_to is not None:
        ln = M(nt, "MULTIPLY", M(nt, "LESS_THAN", M(nt, "ABSOLUTE", M(nt, "SUBTRACT", sp.outputs["Z"], lit_to)), 0.22), 5.0)
        em = M(nt, "ADD", em, ln)
        cg = N.new("ShaderNodeMix"); cg.data_type = "RGBA"; link(nt, M(nt, "GREATER_THAN", ln, 0.5), cg.inputs["Factor"]); link(nt, ecol, cg.inputs["A"]); cg.inputs["B"].default_value = srgb("#ffd27a"); ecol = cg.outputs["Result"]
    bc = N.new("ShaderNodeMix"); bc.data_type = "RGBA"; link(nt, mask, bc.inputs["Factor"]); bc.inputs["A"].default_value = srgb(wall); bc.inputs["B"].default_value = srgb(glass)
    rg = N.new("ShaderNodeMix"); rg.data_type = "FLOAT"; link(nt, mask, rg.inputs["Factor"]); rg.inputs["A"].default_value = 0.8; rg.inputs["B"].default_value = 0.06
    wallc = bc.outputs["Result"]
    if brick_tex:
        mp_ = N.new("ShaderNodeMapping"); mp_.inputs["Scale"].default_value = (1 / BRICK,) * 3; link(nt, gp.outputs["Position"], mp_.inputs["Vector"])
        t_ = N.new("ShaderNodeTexImage"); t_.image = img(TEX + "red_brick_03_Diffuse.jpg"); t_.projection = "BOX"; t_.projection_blend = 0.25; link(nt, mp_.outputs["Vector"], t_.inputs["Vector"])
        n_ = N.new("ShaderNodeTexImage"); n_.image = img(TEX + "red_brick_03_nor_gl.jpg", True); n_.projection = "BOX"; n_.projection_blend = 0.25; link(nt, mp_.outputs["Vector"], n_.inputs["Vector"])
        nm_ = N.new("ShaderNodeNormalMap"); link(nt, n_.outputs["Color"], nm_.inputs["Color"]); link(nt, nm_.outputs["Normal"], b.inputs["Normal"])
        tm_ = N.new("ShaderNodeMix"); tm_.data_type = "RGBA"; tm_.blend_type = "MULTIPLY"; tm_.inputs["Factor"].default_value = 1; link(nt, t_.outputs["Color"], tm_.inputs["A"]); tm_.inputs["B"].default_value = srgb(wall, 2.2)
        wb = N.new("ShaderNodeMix"); wb.data_type = "RGBA"; link(nt, mask, wb.inputs["Factor"]); link(nt, tm_.outputs["Result"], wb.inputs["A"]); wb.inputs["B"].default_value = srgb(glass); wallc = wb.outputs["Result"]
    link(nt, wallc, b.inputs["Base Color"]); link(nt, rg.outputs["Result"], b.inputs["Roughness"])
    link(nt, ecol, b.inputs["Emission Color"]); link(nt, em, b.inputs["Emission Strength"])
    return m

def add_fog(m, k_dist, color="#4a3a86", amt=0.85, es=0.12):
    nt = m.node_tree; N = nt.nodes; out = N["Material Output"]; b = N["Principled BSDF"]
    cd = N.new("ShaderNodeCameraData"); mt = N.new("ShaderNodeMath"); mt.operation = "MULTIPLY"; mt.inputs[1].default_value = -1.0 / k_dist
    link(nt, cd.outputs["View Distance"], mt.inputs[0]); ex = N.new("ShaderNodeMath"); ex.operation = "EXPONENT"; link(nt, mt.outputs[0], ex.inputs[0])
    inv = N.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0; link(nt, ex.outputs[0], inv.inputs[1])
    am = N.new("ShaderNodeMath"); am.operation = "MULTIPLY"; am.inputs[1].default_value = amt; link(nt, inv.outputs[0], am.inputs[0])
    em = N.new("ShaderNodeEmission"); em.inputs["Color"].default_value = srgb(color); em.inputs["Strength"].default_value = es
    ms = N.new("ShaderNodeMixShader"); link(nt, am.outputs[0], ms.inputs["Fac"]); link(nt, b.outputs[0], ms.inputs[1]); link(nt, em.outputs[0], ms.inputs[2])
    link(nt, ms.outputs[0], out.inputs["Surface"])

walls = ["#3a2622", "#4a2e28", "#2e2a30", "#4a3a34", "#30242a", "#3e3236"]
street = [win_mat("sw%d" % i, walls[i], cell=(R.uniform(1.6, 2.1), R.uniform(3.0, 3.4)), p=R.uniform(0.3, 0.5), k=1.6) for i in range(len(walls))]
for m_ in street: add_fog(m_, 380, amt=0.4)
roofs = []
SW = 95 if DESK else 46
x = -SW
while x < SW:   # the street wall across the far side: walk-ups with cornices and tanks
    w = R.uniform(7, 12); h = R.uniform(15, 27); y0 = -24 - R.uniform(0, 4)
    box("sw%d" % int(x), w - 0.15, 16, h - 11, (x + w / 2, y0 - 8, 11 + (h - 11) / 2), R.choice(street))
    box("swc%d" % int(x), w + 0.2, 0.8, 0.45, (x + w / 2, y0 + 0.2, h + 0.1), stone, bevel=0.04)
    box("swp%d" % int(x), w, 0.35, 0.9, (x + w / 2, y0 - 0.1, h + 0.7), R.choice(street))
    roofs.append((x + w / 2, y0 - 8, h + 1.1, w))
    x += w

# ---------- the tax tower, lit from the ground up to your mastery ----------
TY = -150
tow_h = [(0, 104, 30), (104, 128, 25), (128, 144, 20), (144, 156, 15), (156, 164, 10)]
TOWER_TOP = 164
CAM = (0.6, 34.0, 1.8) if a.cam == "phone" else (0.6, 40.0, 2.0)
VIS0 = CAM[2] + (CAM[1] - TY) * (27 + 1.5 - CAM[2]) / (CAM[1] + 24)   # below this the street wall hides it
lit_to = VIS0 + max(0.06, a.mastery) * (TOWER_TOP - VIS0)
print("tower visible from", round(VIS0, 1), "lit to", round(lit_to, 1))
tm = win_mat("tower", "#3c3a4c", cell=(1.5, 2.6), p=0.62, lit_to=lit_to, gold_line=True, k=2.0, glass="#0a0c16", warm=("#ffd27a", "#ffe6b0", "#ffc670"), cool="#cfe8ff")
add_fog(tm, 520, amt=0.3)
lime = pbr("lime", "castle_brick_02_white", 3.0, tint=srgb("#b8b0a8"), bump=0.6)
for z0, z1, w in tow_h:
    # chamfered setbacks: the body plus four corner blocks pulled in
    box("tw%d" % z0, w, w - 3, z1 - z0, (0, TY, (z0 + z1) / 2), tm)
    box("tw%db" % z0, w - 3, w, z1 - z0, (0, TY, (z0 + z1) / 2), tm)
    box("tc%d" % z0, w + 0.4, w + 0.4, 0.9, (0, TY, z1 + 0.45), lime, bevel=0.1)    # limestone band at each setback
    n = int(w / 2.5)
    for i in range(n + 1):    # vertical piers
        u = -(w - 3) / 2 + i * (w - 3) / n
        for (dx, dy, sx_, sy_) in ((u, w / 2 + 0.2, 0.45, 0.45), (u, -w / 2 - 0.2, 0.45, 0.45), (w / 2 + 0.2, u, 0.45, 0.45), (-w / 2 - 0.2, u, 0.45, 0.45)):
            box("pier", sx_, sy_, z1 - z0 - 0.6, (dx, TY + dy, (z0 + z1) / 2), lime)
    for sx in (-1, 1):    # floodlights on each setback roof, washing the tier above in gold
        for sy in (-1, 1):
            light("SPOT", (sx * (w / 2 - 0.5), TY + sy * (w / 2 - 0.5), z1 + 1.2), 3500, "#ffcf80", 0.3, aim=(sx * (w / 2 - 6), TY + sy * (w / 2 - 6), z1 + 14), spot=70)
crown = bpy.data.meshes.new("crown"); bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=5.2, radius2=0.08, depth=22); bm.to_mesh(crown); bm.free()
co_ = obj("crown", crown, flat("crownm", srgb("#c9b48a"), 0.25, 0.9), (0, TY, TOWER_TOP + 11)); co_.rotation_euler = (0, 0, math.pi / 8)
for i in range(8):
    a_ = i * math.pi / 4
    light("SPOT", (math.cos(a_) * 7, TY + math.sin(a_) * 7, TOWER_TOP + 0.8), 6000, "#ffd27a", 0.2, aim=(0, TY, TOWER_TOP + 16), spot=40)
box("beacon", 0.6, 0.6, 0.6, (0, TY, TOWER_TOP + 22.5), emissive("red", srgb("#ff3b3b"), 40))

# ---------- the city around and behind, fading into the violet fog ----------
far = [win_mat("far%d" % i, R.choice(walls + ["#2a2c3a", "#262838"]), cell=(R.uniform(1.6, 2.4), R.uniform(3.0, 3.6)), p=R.uniform(0.18, 0.4), k=1.2) for i in range(6)]
for m_ in far: add_fog(m_, 300, amt=0.75, es=0.1)
for i in range(60):
    x = R.uniform(-200, 200); y = R.uniform(-420, -70); h = R.uniform(30, 120) * (1.3 if abs(x) < 80 else 1)
    if abs(x) < 26 and abs(y - TY) < 30: continue
    if abs(x) < 24 and y > -100: continue
    w, d = R.uniform(18, 34), R.uniform(18, 34)
    box("f%d" % i, w, d, h, (x, y, h / 2), R.choice(far))
    if R.random() < 0.5: box("fs%d" % i, w * 0.6, d * 0.6, h * 0.2, (x, y, h + h * 0.1), R.choice(far))    # a setback
    if R.random() < 0.35: roofs.append((x + R.uniform(-4, 4), y, h, w))
walkm = [win_mat("wk%d" % i, walls[i], cell=(1.9, 3.2), p=0.42, k=0.9, frac=(0.3, 0.7, 0.28, 0.8), brick_tex=True) for i in range(4)]
for m_ in walkm: add_fog(m_, 380, amt=0.3)
for sx in (-1, 1):   # walk-ups along the cutting, at street level
    y = -6
    while y < L1 + 10:
        w = R.uniform(6, 9); h = R.uniform(12, 22)
        box("wu%d_%d" % (sx, int(y)), 9, w, h, (sx * (WALL_X + 10.5), y + w / 2, WALL_TOP + h / 2), walkm[int(y) % 4] if DESK else R.choice(street))
        box("wuc%d_%d" % (sx, int(y)), 9.6, w + 0.2, 0.4, (sx * (WALL_X + 10.5) - sx * 0.3, y + w / 2, WALL_TOP + h + 0.2), stone)
        y += w + 0.15

# ---------- Meshy props ----------
_glb_cache = {}
def glb(path, loc, height, rot_z=0.0, name="prop"):
    if not os.path.exists(path): print("missing", path); return None
    if path in _glb_cache:
        src, k, zmin = _glb_cache[path]; root = bpy.data.objects.new(name, None); sc.collection.objects.link(root)
        for o in src:
            d = o.copy(); sc.collection.objects.link(d); d.parent = root
        root.scale = (height / k,) * 3; root.location = (loc[0], loc[1], loc[2] - zmin * height / k); root.rotation_euler = (0, 0, rot_z); return root
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=path); new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    if not meshes: return None
    root = bpy.data.objects.new(name, None); sc.collection.objects.link(root)
    for o in new:
        if o.parent is None: o.parent = root
    bpy.context.view_layer.update()
    zs = [ (o.matrix_world @ Vector(c)).z for o in meshes for c in o.bound_box ]
    k = height / max(1e-6, max(zs) - min(zs)); root.scale = (k, k, k); bpy.context.view_layer.update()
    zs = [ (o.matrix_world @ Vector(c)).z for o in meshes for c in o.bound_box ]
    root.location = (loc[0], loc[1], loc[2] - min(zs)); root.rotation_euler = (0, 0, rot_z)
    _glb_cache[path] = ([o for o in new if o.parent == root], height / k, (min(zs) - 0) / k if False else min(zs) / k)
    return root
for i_, (rx, ry, rz, rw) in enumerate(roofs):    # rooftop water tanks: the city's silhouette
    if R.random() < 0.55: glb(MESHY + "tank.glb", (rx + R.uniform(-rw / 4, rw / 4), ry + R.uniform(-3, 3), rz), R.uniform(6.5, 9), R.uniform(0, 6.28), "tank%d" % i_)
glb(MESHY + "box.glb", (-4.7, 21.5, 0.2), 1.5, math.pi / 2 + 0.25, "cabinet")
for k_ in range(4):     # a stack of spare ties on the near bench
    box("spare%d" % k_, 2.6, 0.24, 0.17, (4.6, 20.5 + (k_ % 2) * 0.06, 0.28 + k_ * 0.18), wood, bevel=0.01).rotation_euler = (0, 0, math.pi / 2 + R.uniform(-0.05, 0.05))
sig = glb(MESHY + "signal.glb", (3.55, 3.0, 0.2), 2.3, math.pi, "signal")
box("siglens", 0.2, 0.05, 0.2, (3.55, 2.72, 1.6), emissive("green", srgb("#3cff8a"), 30))
for sx in (-1, 1):
    for y in (8, 24, 40, 56, 72):
        glb(MESHY + "lamp.glb", (sx * (WALL_X - 0.05), y, 3.1), 0.7, (math.pi / 2) * sx, "wl")
        box("wlg%d%d" % (sx, y), 0.18, 0.18, 0.18, (sx * (WALL_X - 0.25), y, 3.35), emissive("wl", srgb("#ffb46a"), 30))

for sx in (-1, 1):
    light("SPOT", (sx * 7.5, 14, WALL_TOP + 5.5), 9000, "#ffb877", 0.25, aim=(sx * 6, 0, 6), spot=55)   # sodium floods on poles
    box("pole%d" % sx, 0.14, 0.14, 6.0, (sx * 7.6, 14.3, WALL_TOP + 3.0), rust)
    box("head%d" % sx, 0.6, 0.35, 0.25, (sx * 7.5, 14, WALL_TOP + 5.6), board)
    for y in (8, 24, 40, 56, 72): light("POINT", (sx * (WALL_X - 0.4), y, 3.3), 60, "#ffb46a", 0.1)
light("POINT", (0, 1.2, 11.8), 400 * a.neon, "#ff3fa4", 1.5)   # the neon's spill
light("AREA", (0, -6, 9.5), 700, "#ffb070", 6)
light("AREA", (0, -66, 4.5), 2600, "#ffd59a", 7, aim=(0, 40, 4.5))
light("POINT", (0, -40, 7.5), 800, "#ffc07a", 1.0)   # tunnel mouth glow onto the arch reveal

# ---------- sky (camera sees the dusk gradient and stars; everything else lit by a real night HDRI) ----------
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True; nt = w.node_tree; N = nt.nodes; bg = N["Background"]
tc = N.new("ShaderNodeTexCoord"); sp = N.new("ShaderNodeSeparateXYZ"); link(nt, tc.outputs["Generated"], sp.inputs[0])
ramp = N.new("ShaderNodeValToRGB"); el = ramp.color_ramp.elements
el[0].position = 0.0; el[0].color = srgb("#8a5fb8", 1.1); el[1].position = 0.42; el[1].color = srgb("#3a2c66", 0.6)
e2 = el.new(0.7); e2.color = srgb("#1a1840", 0.42); e3 = el.new(0.8); e3.color = srgb("#0b0a24", 0.25)
link(nt, sp.outputs["Z"], ramp.inputs["Fac"])
vor = N.new("ShaderNodeTexVoronoi"); vor.inputs["Scale"].default_value = 300; link(nt, tc.outputs["Generated"], vor.inputs["Vector"])
st = N.new("ShaderNodeMapRange"); st.inputs["From Min"].default_value = 0.05; st.inputs["From Max"].default_value = 0.0; st.inputs["To Max"].default_value = 4.0
link(nt, vor.outputs["Distance"], st.inputs["Value"])
vc = N.new("ShaderNodeSeparateColor"); link(nt, vor.outputs["Color"], vc.inputs[0]); keep = N.new("ShaderNodeMath"); keep.operation = "GREATER_THAN"; keep.inputs[1].default_value = 0.8
link(nt, vc.outputs[0], keep.inputs[0]); up_ = N.new("ShaderNodeMath"); up_.operation = "GREATER_THAN"; up_.inputs[1].default_value = 0.3; link(nt, sp.outputs["Z"], up_.inputs[0])
k1 = N.new("ShaderNodeMath"); k1.operation = "MULTIPLY"; link(nt, keep.outputs[0], k1.inputs[0]); link(nt, up_.outputs[0], k1.inputs[1])
k2 = N.new("ShaderNodeMath"); k2.operation = "MULTIPLY"; link(nt, k1.outputs[0], k2.inputs[0])
stars = N.new("ShaderNodeMix"); stars.data_type = "RGBA"; stars.blend_type = "ADD"; link(nt, st.outputs["Result"], k2.inputs[1]); link(nt, k2.outputs[0], stars.inputs["Factor"])
link(nt, ramp.outputs["Color"], stars.inputs["A"]); stars.inputs["B"].default_value = (0.8, 0.85, 1, 1)
env = N.new("ShaderNodeTexEnvironment"); env.image = img(TEX + "night.hdr")
bg2 = N.new("ShaderNodeBackground"); bg2.inputs["Strength"].default_value = 0.22; link(nt, env.outputs["Color"], bg2.inputs["Color"])
bg.inputs["Strength"].default_value = 1.0; link(nt, stars.outputs["Result"], bg.inputs["Color"])
lp = N.new("ShaderNodeLightPath"); ms = N.new("ShaderNodeMixShader")
link(nt, lp.outputs["Is Camera Ray"], ms.inputs["Fac"]); link(nt, bg2.outputs[0], ms.inputs[1]); link(nt, bg.outputs[0], ms.inputs[2])
link(nt, ms.outputs[0], N["World Output"].inputs["Surface"])
moon = bpy.data.meshes.new("moon"); bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=9); bm.to_mesh(moon); bm.free()
obj("moon", moon, emissive("moon", srgb("#fff1d6"), 2.2), (-120, -520, 330)); bpy.data.objects["moon"].scale = (0.45, 0.45, 0.45)

# ---------- camera ----------
cam = bpy.data.cameras.new("cam"); cam.lens = 22.5 if a.cam == "phone" else 25.7; cam.sensor_fit = "VERTICAL"; cam.sensor_height = 24
cam.dof.use_dof = True; cam.dof.focus_distance = 34; cam.dof.aperture_fstop = 2.8
co = obj("cam", cam, None, CAM); sc.camera = co
tgt = Vector((0, 0, CAM[2] + CAM[1] * math.tan(math.radians(17.5 if a.cam == "phone" else 19.0)))); d = tgt - co.location; co.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()

# ---------- render ----------
sc.render.engine = "CYCLES"; cy_ = sc.cycles; cy_.device = "CPU"; cy_.samples = a.samples; cy_.use_adaptive_sampling = True; cy_.adaptive_threshold = 0.02
cy_.use_denoising = True; cy_.denoiser = "OPENIMAGEDENOISE"; cy_.max_bounces = 6; cy_.volume_bounces = 1; cy_.transparent_max_bounces = 8
cy_.volume_step_rate = 4.0; cy_.use_light_tree = True; cy_.sample_clamp_indirect = 8
sc.render.resolution_x = a.w; sc.render.resolution_y = a.h; sc.render.resolution_percentage = int(a.scale * 100)
sc.view_settings.view_transform = "AgX"
for lk in ("AgX - Medium High Contrast", "Medium High Contrast"):
    try: sc.view_settings.look = lk; break
    except Exception: pass
sc.view_settings.exposure = 0.6
sc.render.image_settings.file_format = "PNG"; sc.render.filepath = a.out
REG = {"tower": [(sx_ * 21, TY + sy_ * 21, z_) for sx_ in (-1, 1) for sy_ in (-1, 1) for z_ in (VIS0 - 6, TOWER_TOP + 30)],
       "neon": [(sx_ * 9.5, 1.5, z_) for sx_ in (-1, 1) for z_ in (6.5, 15.5)]}
if a.region:
    from bpy_extras.object_utils import world_to_camera_view
    bpy.context.view_layer.update()
    pts = [world_to_camera_view(sc, co, Vector(p_)) for p_ in REG[a.region]]
    x0, x1 = max(0, min(p_.x for p_ in pts)), min(1, max(p_.x for p_ in pts)); y0, y1 = max(0, min(p_.y for p_ in pts)), min(1, max(p_.y for p_ in pts))
    W_, H_ = a.w, a.h; px = [int(x0 * W_), H_ - int(y1 * H_), int(x1 * W_) - int(x0 * W_), int(y1 * H_) - int(y0 * H_)]   # as Blender crops the border
    print("region", px)   # the render stays full size, transparent outside: tools/intro_plate.py cuts it out
    a.border = "%f,%f,%f,%f" % (int(x0 * W_) / W_, int(x1 * W_) / W_, int(y0 * H_) / H_, int(y1 * H_) / H_)
if a.border:
    x0, x1, y0, y1 = map(float, a.border.split(",")); r_ = sc.render; r_.use_border = True; r_.use_crop_to_border = False
    r_.border_min_x, r_.border_max_x, r_.border_min_y, r_.border_max_y = x0, x1, y0, y1
if a.blend: bpy.ops.wm.save_as_mainfile(filepath=a.blend)
bpy.ops.render.render(write_still=True)
print("wrote", a.out)
