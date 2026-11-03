"""Times Square from OpenStreetMap: writes src/tsq-map.json, the real square that src/town.js builds.

Run from the repo root: python3 tools/tsq_map.py            (downloads the area from the OpenStreetMap API)
                    or: python3 tools/tsq_map.py area.osm   (uses a saved download)

What it keeps, in town meters (x east along the streets, z south along the avenues, 7th Avenue at x = 0,
45th Street at z = 0, one street every 80 m, so 42nd is z = 240 and 47th is z = -160):
  b: buildings between 8th and 6th Avenues, 40th to 50th Street, as [height, base height, x, z, x, z, ...].
     A building drawn in parts (building:part, the way OSM models setbacks) is kept as its parts.
  bw: Broadway's center line, south to north, as [x, z] points every 10 m.
  pz: the pedestrian plazas (Times Square, Duffy Square, car-free Broadway) as [x, z, ...] rings.
  st: the red steps (TKTS) as one ring.
Map data © OpenStreetMap contributors, under the Open Database License (openstreetmap.org/copyright).
"""
import json, math, os, sys, urllib.request
import xml.etree.ElementTree as ET

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAT0, LON0 = 40.7580, -73.9855
BBOX = (-73.9935, 40.7525, -73.9800, 40.7625)   # covers 8th to 6th Avenue, 39th to 51st Street
STREETS = {40: "West 40th Street", 41: "West 41st Street", 42: "West 42nd Street", 43: "West 43rd Street", 44: "West 44th Street",
           45: "West 45th Street", 46: "West 46th Street", 47: "West 47th Street", 48: "West 48th Street", 49: "West 49th Street", 50: "West 50th Street"}

if len(sys.argv) > 1: data = open(sys.argv[1], "rb").read()
else:
    url = "https://api.openstreetmap.org/api/0.6/map?bbox=%f,%f,%f,%f" % BBOX
    data = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "ea-ledger-drill-tsq-map/1.0"}), timeout=120).read()
osm = ET.fromstring(data)
N = {n.get("id"): (float(n.get("lat")), float(n.get("lon"))) for n in osm.iter("node")}
def meters(ll): return ((ll[1] - LON0) * 111320 * math.cos(math.radians(LAT0)), (ll[0] - LAT0) * 110540)
ways = []
for w in osm.iter("way"):
    tags = {t.get("k"): t.get("v") for t in w.iter("tag")}
    pts = [meters(N[r.get("ref")]) for r in w.iter("nd") if r.get("ref") in N]
    if len(pts) > 1: ways.append((tags, pts))

# the street grid: 7th Avenue's bearing sets the rotation, its center line is x = 0
P = [p for t, ps in ways if t.get("name") == "7th Avenue" and t.get("highway") for p in ps]
mx, my = sum(p[0] for p in P) / len(P), sum(p[1] for p in P) / len(P)
sxx = sum((p[0] - mx) ** 2 for p in P); syy = sum((p[1] - my) ** 2 for p in P); sxy = sum((p[0] - mx) * (p[1] - my) for p in P)
ang = 0.5 * math.atan2(2 * sxy, sxx - syy); th = math.pi / 2 - ang
def grid(p):
    x, y = p[0] - mx, p[1] - my
    return (x * math.cos(th) - y * math.sin(th), x * math.sin(th) + y * math.cos(th))
ways = [(t, [grid(p) for p in ps]) for t, ps in ways]
# each measured street lands exactly on the town's street line; between streets, straight interpolation
sv = []
for n, name in STREETS.items():
    vs = [p[1] for t, ps in ways if t.get("name") == name and t.get("highway") for p in ps if abs(p[0]) < 300]
    if vs: sv.append((sum(vs) / len(vs), (45 - n) * 80.0))
sv.sort()
def town_z(v):
    for (v0, z0), (v1, z1) in zip(sv, sv[1:]):
        if v <= v1 or (v1, z1) == sv[-1]: break
    if v < sv[0][0]: (v0, z0), (v1, z1) = sv[0], sv[1]
    return z0 + (v - v0) * (z1 - z0) / (v1 - v0)
def town(p): return (round(p[0], 1), round(town_z(p[1]), 1))
ways = [(t, [town(p) for p in ps]) for t, ps in ways]

def num(s):
    try: return float(str(s).split()[0].replace("m", ""))
    except (ValueError, IndexError): return None
def height(t):
    h = num(t.get("height"))
    if h is None and num(t.get("building:levels")) is not None: h = num(t.get("building:levels")) * 3.6
    return h
def centroid(ps): return (sum(p[0] for p in ps) / len(ps), sum(p[1] for p in ps) / len(ps))
def inside(pt, ring):
    x, z = pt; c = False
    for (x0, z0), (x1, z1) in zip(ring, ring[1:] + ring[:1]):
        if (z0 > z) != (z1 > z) and x < x0 + (z - z0) * (x1 - x0) / (z1 - z0): c = not c
    return c
ZONE = lambda p: -258 < p[0] < 258 and -400 < p[1] < 400   # between the 8th and 6th Avenue building lines, 40th to 50th Street

def ring(ps): return ps[:-1] if ps[0] == ps[-1] else ps
outlines = [(t, ring(ps)) for t, ps in ways if "building" in t and t.get("building") != "construction" and ps[0] == ps[-1] and len(ps) > 3]
parts = [(t, ring(ps)) for t, ps in ways if "building:part" in t and t.get("building:part") != "no" and ps[0] == ps[-1] and len(ps) > 3]
b = []
for t, ps in parts:
    c = centroid(ps)
    if not ZONE(c): continue
    h = height(t)
    if not h: continue
    b.append([round(h, 1), round(num(t.get("min_height")) or 0, 1)] + [v for p in ps for v in p])
for t, ps in outlines:
    c = centroid(ps)
    if not ZONE(c): continue
    if any(inside(centroid(q), ps) for _, q in parts): continue   # drawn by its parts
    h = height(t) or 16.0
    b.append([round(h, 1), round(num(t.get("min_height")) or 0, 1)] + [v for p in ps for v in p])

# Broadway's center line: every Broadway way, sampled every 10 m of z, averaged
bp = [p for t, ps in ways if t.get("name") == "Broadway" and t.get("highway") for p0, p1 in zip(ps, ps[1:])
      for k in range(int(math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 2) + 1)
      for p in [(p0[0] + (p1[0] - p0[0]) * k / max(1, int(math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 2)), p0[1] + (p1[1] - p0[1]) * k / max(1, int(math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 2)))]]
bw = []
for z in range(420, -421, -10):
    xs = [p[0] for p in bp if abs(p[1] - z) < 8]
    if xs: bw.append([round(sum(xs) / len(xs), 1), float(z)])
# smooth out the jog where the pedestrian and road center lines meet
sm = [bw[0]] + [[round((bw[i - 1][0] + 2 * bw[i][0] + bw[i + 1][0]) / 4, 1), bw[i][1]] for i in range(1, len(bw) - 1)] + [bw[-1]]

pz = []
for t, ps in ways:
    if ps[0] != ps[-1]: continue
    if (t.get("highway") == "pedestrian" and t.get("area") == "yes") or t.get("place") == "square" or t.get("name") in ("Duffy Square", "Times Square"):
        xs = [p[0] for p in ps]
        if ZONE(centroid(ps)) and abs(centroid(ps)[0]) < 120 and max(xs) - min(xs) < 150: pz.append([v for p in ring(ps) for v in p])   # not the big neighborhood outline
st = [[v for p in ring(ps) for v in p] for t, ps in ways if t.get("area:highway") == "steps" or (t.get("name") == "Times Square Red Steps" and ps[0] == ps[-1])]

out = {"src": "Map data © OpenStreetMap contributors, ODbL", "b": b, "bw": sm, "pz": pz, "st": st}
open(os.path.join(root, "src", "tsq-map.json"), "w").write(json.dumps(out, separators=(",", ":")))
print(f"src/tsq-map.json: {len(b)} buildings and parts, {len(pz)} plazas, Broadway {len(sm)} points, grid turned {90 - math.degrees(ang):.2f} degrees")
