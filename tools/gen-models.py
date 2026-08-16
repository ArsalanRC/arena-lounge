#!/usr/bin/env python3
"""Generate the scene's GLB models (pure Python, no Blender):

  models/tower.glb   the twisted tower over the plaza: a diagrid of 12 + 12
                     box-section ribs on opposite helices (a woven, tapering
                     hyperboloid), two annular slabs (game room y=8, rooftop
                     y=16) with an open oculus over the plaza tree, railings
                     with posts, glowing rims and the crown ring at y=24, plus
                     invisible `_collider` meshes for slabs and railings (the
                     DCL client uses those for physics and hides them).
                     Origin = plaza centre at ground level.
  models/canopy.glb  a unit-diameter low-poly icosphere in the plant green,
                     used for every tree crown and planter (the primitive
                     sphere costs ~770 triangles, this one 320).

Run: python3 tools/gen-models.py
"""
import json, math, struct

# ------------------------------------------------------------------ parameters
RIBS = 12           # per direction (12 clockwise + 12 counter-clockwise)
H = 24.0            # tower height
R_BASE = 15.4       # rib radius at the ground (landings just inside the fence)
R_TOP = 10.5        # rib radius at the crown
TWIST = math.radians(110)   # total twist over H (each direction)
SEGS = 24           # rib segments
RIB_W, RIB_D = 0.42, 0.26   # rib cross-section (tangential x radial)
FLOORS = [          # (y, inner radius, outer radius, thickness)
    (8.0, 5.5, 12.4, 0.45),
    (16.0, 3.0, 10.9, 0.45),
]
RAIL_H = 1.1        # railing height above the slab top
CIRC_SEGS = 48

# ------------------------------------------------------------------ mesh builder
class Mesh:
    def __init__(self):
        self.pos, self.nor, self.idx = [], [], []

    def quad(self, a, b, c, d):
        """Flat quad a-b-c-d (counter-clockwise seen from the outside)."""
        n = normal(a, b, c)
        base = len(self.pos)
        for p in (a, b, c, d):
            self.pos.append(p)
            self.nor.append(n)
        self.idx += [base, base + 1, base + 2, base, base + 2, base + 3]

def sub(a, b): return (a[0]-b[0], a[1]-b[1], a[2]-b[2])
def add(a, b): return (a[0]+b[0], a[1]+b[1], a[2]+b[2])
def mul(a, s): return (a[0]*s, a[1]*s, a[2]*s)
def cross(a, b): return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])
def normal(a, b, c):
    n = cross(sub(b, a), sub(c, a))
    l = math.sqrt(sum(x*x for x in n)) or 1.0
    return (n[0]/l, n[1]/l, n[2]/l)

def rib_frame(y, theta0, direction=1):
    """Centre, tangent and radial unit vectors of a rib at height y."""
    t = y / H
    theta = theta0 + direction * TWIST * t
    r = R_BASE + (R_TOP - R_BASE) * t
    c = (r * math.cos(theta), y, r * math.sin(theta))
    tan = (-math.sin(theta), 0.0, math.cos(theta))
    rad = (math.cos(theta), 0.0, math.sin(theta))
    return c, tan, rad

def box_strip(mesh, frames, w, d):
    """Closed box-section strip through a list of (centre, tangent, radial) frames."""
    corners = []
    for c, tan, rad in frames:
        tw, rd = mul(tan, w / 2), mul(rad, d / 2)
        corners.append([
            add(add(c, tw), rd),      # 0 outer-left
            add(sub(c, tw), rd),      # 1 outer-right
            sub(sub(c, tw), rd),      # 2 inner-right
            sub(add(c, tw), rd),      # 3 inner-left
        ])
    for k in range(len(frames) - 1):
        a, b = corners[k], corners[k + 1]
        mesh.quad(a[0], b[0], b[1], a[1])   # outer face
        mesh.quad(a[1], b[1], b[2], a[2])   # right face
        mesh.quad(a[2], b[2], b[3], a[3])   # inner face
        mesh.quad(a[3], b[3], b[0], a[0])   # left face
    # caps
    a, b = corners[0], corners[-1]
    mesh.quad(a[3], a[2], a[1], a[0])
    mesh.quad(b[0], b[1], b[2], b[3])

def ring_frames(y, r):
    out = []
    for i in range(CIRC_SEGS + 1):
        th = 2 * math.pi * i / CIRC_SEGS
        c = (r * math.cos(th), y, r * math.sin(th))
        tan = (-math.sin(th), 0.0, math.cos(th))
        rad = (math.cos(th), 0.0, math.sin(th))
        out.append((c, tan, rad))
    return out

def annulus(mesh, y, r_in, r_out, th):
    """Slab between r_in and r_out, top face at y, thickness th downwards."""
    y0, y1 = y - th, y
    for i in range(CIRC_SEGS):
        a0, a1 = 2 * math.pi * i / CIRC_SEGS, 2 * math.pi * (i + 1) / CIRC_SEGS
        ci = [(r_in * math.cos(a0), 0, r_in * math.sin(a0)), (r_in * math.cos(a1), 0, r_in * math.sin(a1))]
        co = [(r_out * math.cos(a0), 0, r_out * math.sin(a0)), (r_out * math.cos(a1), 0, r_out * math.sin(a1))]
        at = lambda p, yy: (p[0], yy, p[2])
        mesh.quad(at(ci[0], y1), at(ci[1], y1), at(co[1], y1), at(co[0], y1))   # top (+y)
        mesh.quad(at(co[0], y0), at(co[1], y0), at(ci[1], y0), at(ci[0], y0))   # bottom (-y)
        mesh.quad(at(co[0], y1), at(co[1], y1), at(co[1], y0), at(co[0], y0))   # outer band
        mesh.quad(at(ci[1], y1), at(ci[0], y1), at(ci[0], y0), at(ci[1], y0))   # inner band

def band(mesh, y0, y1, r):
    """Vertical cylinder wall (railing collider)."""
    for i in range(CIRC_SEGS):
        a0, a1 = 2 * math.pi * i / CIRC_SEGS, 2 * math.pi * (i + 1) / CIRC_SEGS
        p0 = (r * math.cos(a0), 0, r * math.sin(a0)); p1 = (r * math.cos(a1), 0, r * math.sin(a1))
        at = lambda p, yy: (p[0], yy, p[2])
        mesh.quad(at(p0, y1), at(p1, y1), at(p1, y0), at(p0, y0))
        mesh.quad(at(p1, y1), at(p0, y1), at(p0, y0), at(p1, y0))

# ------------------------------------------------------------------ build
ribs = Mesh()
BASE_ROT = math.pi / RIBS / 2   # no landing on the entrance axis: two ribs frame the path instead
for direction in (1, -1):
    for i in range(RIBS):
        theta0 = BASE_ROT + 2 * math.pi * i / RIBS + (0.0 if direction == 1 else math.pi / RIBS)
        frames = [rib_frame(H * k / SEGS, theta0, direction) for k in range(SEGS + 1)]
        box_strip(ribs, frames, RIB_W, RIB_D)

floors = Mesh()
for (y, r_in, r_out, th) in FLOORS:
    annulus(floors, y, r_in, r_out, th)

rings = Mesh()
posts = Mesh()
def railing(y, r, n_posts):
    box_strip(rings, ring_frames(y + RAIL_H, r), 0.12, 0.12)          # top rail
    box_strip(rings, ring_frames(y + RAIL_H * 0.5, r), 0.06, 0.06)    # mid rail
    for i in range(n_posts):
        a = 2 * math.pi * i / n_posts
        c0 = r * math.cos(a), r * math.sin(a)
        frames = [((c0[0], y + k * RAIL_H, c0[1]), (-math.sin(a), 0, math.cos(a)), (math.cos(a), 0, math.sin(a))) for k in (0, 1)]
        box_strip(posts, frames, 0.06, 0.06)
for (y, r_in, r_out, th) in FLOORS:
    railing(y, r_out - 0.15, 24)          # outer edge
    railing(y, r_in + 0.15, 12)           # oculus edge
    box_strip(rings, ring_frames(y - th / 2, r_out + 0.06), 0.16, 0.14)   # glowing rim on the slab edge
# crown ring where the ribs end
box_strip(rings, ring_frames(H, R_TOP), 0.5, 0.5)

coll = Mesh()   # slabs (walkable) + railing walls
for (y, r_in, r_out, th) in FLOORS:
    annulus(coll, y, r_in, r_out, th)
    band(coll, y, y + RAIL_H + 0.4, r_out - 0.1)
    band(coll, y, y + RAIL_H + 0.4, r_in + 0.1)

# ------------------------------------------------------------------ canopy (icosphere)
def icosphere(mesh, subdiv=2, radius=0.5):
    t = (1 + 5 ** 0.5) / 2
    verts = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t), (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
    faces = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11), (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
             (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9), (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    def norm(v):
        l = math.sqrt(sum(c * c for c in v)); return (v[0] / l, v[1] / l, v[2] / l)
    verts = [norm(v) for v in verts]
    for _ in range(subdiv):
        cache, out = {}, []
        def mid(a, b):
            k = (min(a, b), max(a, b))
            if k not in cache:
                cache[k] = len(verts); verts.append(norm(tuple((verts[a][i] + verts[b][i]) / 2 for i in range(3))))
            return cache[k]
        for a, b, c in faces:
            ab, bc, ca = mid(a, b), mid(b, c), mid(c, a)
            out += [(a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)]
        faces = out
    for a, b, c in faces:   # flat shaded, unit diameter
        pa, pb, pc = (mul(verts[a], radius), mul(verts[b], radius), mul(verts[c], radius))
        n = normal(pa, pb, pc)
        base = len(mesh.pos)
        for p in (pa, pb, pc):
            mesh.pos.append(p); mesh.nor.append(n)
        mesh.idx += [base, base + 1, base + 2]

canopy = Mesh()
icosphere(canopy, 2, 0.5)

# ------------------------------------------------------------------ glTF
def pack(mesh):
    p = struct.pack('<%df' % (3 * len(mesh.pos)), *[c for v in mesh.pos for c in v])
    n = struct.pack('<%df' % (3 * len(mesh.nor)), *[c for v in mesh.nor for c in v])
    small = len(mesh.pos) < 65535
    i = struct.pack('<%d%s' % (len(mesh.idx), 'H' if small else 'I'), *mesh.idx)
    mn = [min(v[k] for v in mesh.pos) for k in range(3)]
    mx = [max(v[k] for v in mesh.pos) for k in range(3)]
    return p, n, i, mn, mx, (5123 if small else 5125)

def write_glb(out, parts, materials):
    """parts: list of (node name, Mesh, material index). Names ending in _collider are DCL colliders."""
    bin_data = bytearray()
    bufferViews, accessors, meshes, nodes = [], [], [], []
    tris = coll_tris = 0
    for name, mesh, mat in parts:
        p, n, i, mn, mx, itype = pack(mesh)
        views = []
        for blob, target in ((p, 34962), (n, 34962), (i, 34963)):
            while len(bin_data) % 4: bin_data += b'\0'
            views.append(len(bufferViews))
            bufferViews.append({"buffer": 0, "byteOffset": len(bin_data), "byteLength": len(blob), "target": target})
            bin_data += blob
        ap = len(accessors); accessors.append({"bufferView": views[0], "componentType": 5126, "count": len(mesh.pos), "type": "VEC3", "min": mn, "max": mx})
        an = len(accessors); accessors.append({"bufferView": views[1], "componentType": 5126, "count": len(mesh.nor), "type": "VEC3"})
        ai = len(accessors); accessors.append({"bufferView": views[2], "componentType": itype, "count": len(mesh.idx), "type": "SCALAR"})
        meshes.append({"name": name, "primitives": [{"attributes": {"POSITION": ap, "NORMAL": an}, "indices": ai, "material": mat, "mode": 4}]})
        nodes.append({"name": name, "mesh": len(meshes) - 1})
        if name.endswith("_collider"): coll_tris += len(mesh.idx) // 3
        else: tris += len(mesh.idx) // 3
    while len(bin_data) % 4: bin_data += b'\0'
    gltf = {
        "asset": {"version": "2.0", "generator": "arena-lounge tools/gen-models.py"},
        "scene": 0,
        "scenes": [{"nodes": list(range(len(nodes)))}],
        "nodes": nodes,
        "meshes": meshes,
        "materials": materials,
        "accessors": accessors,
        "bufferViews": bufferViews,
        "buffers": [{"byteLength": len(bin_data)}],
    }
    js = json.dumps(gltf, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_data))
    glb += struct.pack('<II', len(js), 0x4E4F534A) + js
    glb += struct.pack('<II', len(bin_data), 0x004E4942) + bytes(bin_data)
    open(out, 'wb').write(glb)
    print(f"wrote {out}: {len(glb)/1024:.0f} KB, {tris} rendered triangles, {coll_tris} collider triangles")

TOWER_MATERIALS = [
    {"name": "copper", "pbrMetallicRoughness": {"baseColorFactor": [0.80, 0.44, 0.20, 1], "metallicFactor": 0.7, "roughnessFactor": 0.35}},
    {"name": "slab", "pbrMetallicRoughness": {"baseColorFactor": [0.33, 0.24, 0.17, 1], "metallicFactor": 0.0, "roughnessFactor": 0.9}},
    {"name": "glow", "pbrMetallicRoughness": {"baseColorFactor": [0.98, 0.9, 0.7, 1], "metallicFactor": 0.1, "roughnessFactor": 0.35}, "emissiveFactor": [1.0, 0.85, 0.55]},
    {"name": "post", "pbrMetallicRoughness": {"baseColorFactor": [0.22, 0.16, 0.12, 1], "metallicFactor": 0.2, "roughnessFactor": 0.6}},
    {"name": "collider", "pbrMetallicRoughness": {"baseColorFactor": [1, 0, 1, 1]}},
]
write_glb('models/tower.glb', [("ribs", ribs, 0), ("floors", floors, 1), ("rings", rings, 2), ("posts", posts, 3), ("tower_collider", coll, 4)], TOWER_MATERIALS)
write_glb('models/canopy.glb', [("canopy", canopy, 0)], [
    {"name": "plant", "pbrMetallicRoughness": {"baseColorFactor": [0.25, 0.49, 0.31, 1], "metallicFactor": 0.0, "roughnessFactor": 1.0}},
])
