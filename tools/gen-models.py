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
  models/canopy.glb  a unit-diameter low-poly icosphere in the plant green
                     (the primitive sphere costs ~770 triangles, this one 320).
  props              tree, plazatree, planter, lamp, bench, table (with the
                     seat pads + their pointer collider), robot (with pointer
                     collider), kiosk, gateway, shaft (elevator): one GLB per
                     prop type, placed as GltfContainer instances so the client
                     shares meshes + materials across instances (mobile counts
                     every primitive's material; this is the diet).

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
    (8.0, 5.5, 12.4, 0.45),     # game room
    (16.0, 3.0, 10.9, 0.45),    # sky room
    (24.0, 3.0, 10.1, 0.45),    # rooftop terrace, inside the crown ring
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

# ------------------------------------------------------------------ props (instanced furniture)
# Every prop below used to be several primitives, each with its own material
# instance; as one GLB per prop type the client shares the mesh + materials
# across instances, which is what keeps the mobile material count in budget.

def box_mesh(mesh, c, size):
    """Axis-aligned box centred at c with full size (sx, sy, sz)."""
    hx, hy, hz = size[0] / 2, size[1] / 2, size[2] / 2
    x0, x1 = c[0] - hx, c[0] + hx
    y0, y1 = c[1] - hy, c[1] + hy
    z0, z1 = c[2] - hz, c[2] + hz
    mesh.quad((x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1))   # top
    mesh.quad((x0, y0, z1), (x1, y0, z1), (x1, y0, z0), (x0, y0, z0))   # bottom
    mesh.quad((x0, y0, z1), (x0, y1, z1), (x1, y1, z1), (x1, y0, z1))   # +z
    mesh.quad((x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z0))   # -z
    mesh.quad((x1, y0, z1), (x1, y1, z1), (x1, y1, z0), (x1, y0, z0))   # +x
    mesh.quad((x0, y0, z0), (x0, y1, z0), (x0, y1, z1), (x0, y0, z1))   # -x

def prism(mesh, cx, cz, r, y0, y1, n=12, r_top=None):
    """Vertical n-gon prism (cylinder stand-in), optional taper to r_top."""
    rt = r if r_top is None else r_top
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        b0 = (cx + r * math.cos(a0), y0, cz + r * math.sin(a0)); b1 = (cx + r * math.cos(a1), y0, cz + r * math.sin(a1))
        t0 = (cx + rt * math.cos(a0), y1, cz + rt * math.sin(a0)); t1 = (cx + rt * math.cos(a1), y1, cz + rt * math.sin(a1))
        mesh.quad(b0, t0, t1, b1)
        # caps as fans (quad with a repeated vertex is fine for flat shading)
        mesh.quad((cx, y1, cz), t0, t1, (cx, y1, cz))
        mesh.quad((cx, y0, cz), b1, b0, (cx, y0, cz))

def sphere_at(mesh, c, radius, subdiv=1):
    tmp = Mesh()
    icosphere(tmp, subdiv, radius)
    base = len(mesh.pos)
    mesh.pos += [add(p, c) for p in tmp.pos]
    mesh.nor += tmp.nor
    mesh.idx += [i + base for i in tmp.idx]

WOOD = {"name": "wood", "pbrMetallicRoughness": {"baseColorFactor": [0.36, 0.25, 0.17, 1], "metallicFactor": 0.0, "roughnessFactor": 0.85}}
WOOD_DARK = {"name": "woodDark", "pbrMetallicRoughness": {"baseColorFactor": [0.23, 0.16, 0.12, 1], "metallicFactor": 0.0, "roughnessFactor": 0.9}}
PLANT = {"name": "plant", "pbrMetallicRoughness": {"baseColorFactor": [0.25, 0.49, 0.31, 1], "metallicFactor": 0.0, "roughnessFactor": 1.0}}
POT = {"name": "pot", "pbrMetallicRoughness": {"baseColorFactor": [0.55, 0.35, 0.24, 1], "metallicFactor": 0.0, "roughnessFactor": 0.9}}
LAMP = {"name": "lamp", "pbrMetallicRoughness": {"baseColorFactor": [1.0, 0.85, 0.63, 1], "metallicFactor": 0.0, "roughnessFactor": 0.3}, "emissiveFactor": [1.0, 0.78, 0.45]}
PAD = {"name": "pad", "pbrMetallicRoughness": {"baseColorFactor": [0.72, 0.60, 0.44, 1], "metallicFactor": 0.0, "roughnessFactor": 0.9}}
FRAME = {"name": "frame", "pbrMetallicRoughness": {"baseColorFactor": [0.12, 0.31, 0.37, 1], "metallicFactor": 0.5, "roughnessFactor": 0.4}}
FRAME_DARK = {"name": "frameDark", "pbrMetallicRoughness": {"baseColorFactor": [0.09, 0.23, 0.28, 1], "metallicFactor": 0.5, "roughnessFactor": 0.4}}
EYE = {"name": "eye", "pbrMetallicRoughness": {"baseColorFactor": [0.62, 0.94, 1.0, 1], "metallicFactor": 0.0, "roughnessFactor": 0.2}, "emissiveFactor": [0.5, 0.9, 1.0]}
TIP = {"name": "tip", "pbrMetallicRoughness": {"baseColorFactor": [0.89, 0.27, 0.24, 1], "metallicFactor": 0.0, "roughnessFactor": 0.3}, "emissiveFactor": [1.0, 0.42, 0.37]}
GLASS = {"name": "glass", "pbrMetallicRoughness": {"baseColorFactor": [0.7, 0.9, 1.0, 0.22], "metallicFactor": 0.2, "roughnessFactor": 0.1}, "alphaMode": "BLEND", "doubleSided": True}
COLUMN = {"name": "column", "pbrMetallicRoughness": {"baseColorFactor": [0.42, 0.29, 0.20, 1], "metallicFactor": 0.0, "roughnessFactor": 0.9}}
GLOW_CYAN = {"name": "glowCyan", "pbrMetallicRoughness": {"baseColorFactor": [0.5, 0.82, 0.88, 1], "metallicFactor": 0.1, "roughnessFactor": 0.4}, "emissiveFactor": [0.25, 0.76, 0.85]}
COLLIDER = {"name": "collider", "pbrMetallicRoughness": {"baseColorFactor": [1, 0, 1, 1]}}

# tree: trunk + two leaf balls (size 1 = the garden tree; scale the entity)
tree_trunk, tree_leaves = Mesh(), Mesh()
prism(tree_trunk, 0, 0, 0.18, 0, 3.2, 8)
sphere_at(tree_leaves, (0, 3.6, 0), 1.3, 2)
sphere_at(tree_leaves, (0.6, 4.4, -0.4), 0.85, 2)
write_glb('models/tree.glb', [("trunk", tree_trunk, 0), ("leaves", tree_leaves, 1)], [WOOD_DARK, PLANT])

# plaza tree: pot + trunk + four leaf balls
pt_pot, pt_trunk, pt_leaves = Mesh(), Mesh(), Mesh()
prism(pt_pot, 0, 0, 0.8, 0, 0.7, 16)
prism(pt_trunk, 0, 0, 0.16, 0.7, 3.4, 8)
for (dx, dy, dz, r) in [(0, 3.9, 0, 1.5), (-1.1, 3.3, 0.6, 1.0), (1.0, 3.5, -0.7, 1.05), (0.4, 4.6, 0.9, 0.85)]:
    sphere_at(pt_leaves, (dx, dy, dz), r, 2)
write_glb('models/plazatree.glb', [("pot", pt_pot, 0), ("trunk", pt_trunk, 1), ("leaves", pt_leaves, 2)], [POT, WOOD_DARK, PLANT])

# planter: pot + leaf ball
pl_pot, pl_leaves = Mesh(), Mesh()
prism(pl_pot, 0, 0, 0.45, 0, 0.6, 12)
sphere_at(pl_leaves, (0, 1.05, 0), 0.6, 2)
write_glb('models/planter.glb', [("pot", pl_pot, 0), ("leaves", pl_leaves, 1)], [POT, PLANT])

# lamp: post + glowing lantern cube (rotated 45 deg)
lp_post, lp_light = Mesh(), Mesh()
prism(lp_post, 0, 0, 0.06, 0, 2.8, 8)
box_mesh(lp_light, (0, 2.95, 0), (0.4, 0.4, 0.4))
write_glb('models/lamp.glb', [("post", lp_post, 0), ("light", lp_light, 1)], [WOOD_DARK, LAMP])

# bench: seat plank + two legs, facing -z
bn_seat, bn_legs = Mesh(), Mesh()
box_mesh(bn_seat, (0, 0.42, 0), (1.8, 0.08, 0.5))
box_mesh(bn_legs, (-0.7, 0.2, 0), (0.12, 0.4, 0.44))
box_mesh(bn_legs, (0.7, 0.2, 0), (0.12, 0.4, 0.44))
write_glb('models/bench.glb', [("seat", bn_seat, 0), ("legs", bn_legs, 1)], [WOOD, WOOD_DARK])

# table: top + apron + four legs + two seat pads (their pointer collider is a separate mesh)
TABLE_TOP = 1.02
tb_top, tb_dark, tb_pads, tb_coll = Mesh(), Mesh(), Mesh(), Mesh()
box_mesh(tb_top, (0, TABLE_TOP - 0.03, 0), (1.8, 0.06, 0.9))
box_mesh(tb_dark, (0, TABLE_TOP - 0.1, 0), (1.6, 0.08, 0.7))
for (x, z) in [(-0.78, -0.33), (0.78, -0.33), (-0.78, 0.33), (0.78, 0.33)]:
    box_mesh(tb_dark, (x, (TABLE_TOP - 0.06) / 2, z), (0.09, TABLE_TOP - 0.06, 0.09))
for z in (-1.8, 1.8):
    prism(tb_pads, 0, z, 0.5, 0, 0.03, 16)
    prism(tb_coll, 0, z, 0.5, 0, 0.03, 12)
write_glb('models/table.glb', [("top", tb_top, 0), ("frame", tb_dark, 1), ("pads", tb_pads, 2), ("pads_collider", tb_coll, 3)], [WOOD, WOOD_DARK, PAD, COLLIDER])

# robot token: body + head + eyes + antenna + tip; pointer collider around it
rb_dark, rb_eyes, rb_tip, rb_coll = Mesh(), Mesh(), Mesh(), Mesh()
box_mesh(rb_dark, (0, 0.11, 0), (0.16, 0.2, 0.12))                       # body
box_mesh(rb_dark, (0, 0.11 + 0.156, 0), (0.136, 0.11, 0.108))            # head (same material: one body fewer per table)
for x in (-0.034, 0.034):
    box_mesh(rb_eyes, (x, 0.11 + 0.156 + 0.006, -0.06), (0.03, 0.031, 0.015))
prism(rb_dark, 0, 0, 0.005, 0.11 + 0.156 + 0.055, 0.11 + 0.156 + 0.11, 6)
box_mesh(rb_tip, (0, 0.11 + 0.156 + 0.115, 0), (0.033, 0.039, 0.026))
box_mesh(rb_coll, (0, 0.2, 0), (0.28, 0.4, 0.28))
write_glb('models/robot.glb', [("dark", rb_dark, 0), ("eyes", rb_eyes, 1), ("tip", rb_tip, 2), ("robot_collider", rb_coll, 3)], [FRAME, EYE, TIP, COLLIDER])

# kiosk: post + glowing cube; pointer collider on the cube
ks_post, ks_cube, ks_coll = Mesh(), Mesh(), Mesh()
prism(ks_post, 0, 0, 0.07, 0, 1.2, 8)
box_mesh(ks_cube, (0, 1.45, 0), (0.42, 0.42, 0.42))
box_mesh(ks_coll, (0, 1.45, 0), (0.5, 0.5, 0.5))
write_glb('models/kiosk.glb', [("post", ks_post, 0), ("cube", ks_cube, 1), ("kiosk_collider", ks_coll, 2)], [WOOD_DARK, GLOW_CYAN, COLLIDER])

# gateway: two posts + beam + two lanterns (spans x -3.2..3.2 at z 0)
gw_wood, gw_light = Mesh(), Mesh()
for x in (-3.2, 3.2):
    prism(gw_wood, x, 0, 0.11, 0, 3.4, 10)
    box_mesh(gw_light, (x, 3.75, 0), (0.34, 0.34, 0.34))
box_mesh(gw_wood, (0, 3.5, 0), (6.9, 0.22, 0.3))
write_glb('models/gateway.glb', [("wood", gw_wood, 0), ("lights", gw_light, 1)], [WOOD_DARK, LAMP])

# elevator shaft: posts, glass on three sides (open towards -z), roof, pads + light rings on every floor
SHAFT_TOP = 24 + 4.2
sh_posts, sh_glass, sh_pads, sh_rings, sh_coll = Mesh(), Mesh(), Mesh(), Mesh(), Mesh()
half = 1.25
for (x, z) in [(-half, -half), (half, -half), (-half, half), (half, half)]:
    box_mesh(sh_posts, (x, SHAFT_TOP / 2, z), (0.14, SHAFT_TOP, 0.14))
box_mesh(sh_posts, (0, SHAFT_TOP + 0.1, 0), (half * 2 + 0.3, 0.2, half * 2 + 0.3))
for (c, size) in [((0, SHAFT_TOP / 2, half), (half * 2, SHAFT_TOP, 0.04)), ((-half, SHAFT_TOP / 2, 0), (0.04, SHAFT_TOP, half * 2)), ((half, SHAFT_TOP / 2, 0), (0.04, SHAFT_TOP, half * 2))]:
    box_mesh(sh_glass, c, size)
    box_mesh(sh_coll, c, size)
for y in (0, 8, 16, 24):
    prism(sh_pads, 0, 0, 1.1, y + 0.005, y + 0.04, 24)
    box_mesh(sh_rings, (0, y + 2.6, -half), (half * 2 + 0.2, 0.08, 0.08))
write_glb('models/shaft.glb', [("posts", sh_posts, 0), ("glass", sh_glass, 1), ("pads", sh_pads, 2), ("rings", sh_rings, 3), ("shaft_collider", sh_coll, 4)], [COLUMN, GLASS, GLOW_CYAN, GLOW_CYAN, COLLIDER])

# ------------------------------------------------------------------ decor (static, one entity at the plaza)
# Glass facade around the ground floor (conical band just inside the ribs) with
# the entrance gap, the entrance portal (pylons + arched canopy + glow strip),
# string lights between the plaza columns, and the directory board. Baked at
# world positions relative to the plaza centre; the scene places one entity.
def rib_radius(y):
    return R_BASE + (R_TOP - R_BASE) * (y / H)

# The scene's south (towards the spawn) is glTF -z; the client keeps the sign of z
# for imported models, so a gap centred on angle -90 deg (0, y, -r) faces the entrance.
ENTRANCE_ANGLE = -math.pi / 2
GAP_HALF = math.radians(13)

facade, facade_coll = Mesh(), Mesh()
Y0, Y1 = 1.0, 7.55
LEVELS = 4
for k in range(LEVELS):
    ya = Y0 + (Y1 - Y0) * k / LEVELS
    yb = Y0 + (Y1 - Y0) * (k + 1) / LEVELS
    ra, rb = rib_radius(ya) - 0.35, rib_radius(yb) - 0.35
    for i in range(CIRC_SEGS):
        a0, a1 = 2 * math.pi * i / CIRC_SEGS, 2 * math.pi * (i + 1) / CIRC_SEGS
        mid = (a0 + a1) / 2
        d = math.atan2(math.sin(mid - ENTRANCE_ANGLE), math.cos(mid - ENTRANCE_ANGLE))
        if abs(d) < GAP_HALF:
            continue
        p00 = (ra * math.cos(a0), ya, ra * math.sin(a0)); p01 = (ra * math.cos(a1), ya, ra * math.sin(a1))
        p10 = (rb * math.cos(a0), yb, rb * math.sin(a0)); p11 = (rb * math.cos(a1), yb, rb * math.sin(a1))
        facade.quad(p00, p10, p11, p01)
        facade_coll.quad(p00, p10, p11, p01)
        facade_coll.quad(p01, p11, p10, p00)
# top and bottom rails of the facade (copper), and a glowing strip along the top edge
facade_rail, facade_glow = Mesh(), Mesh()
def partial_ring(mesh, y, r, w, h, skip_gap):
    frames = []
    for i in range(CIRC_SEGS + 1):
        th = 2 * math.pi * i / CIRC_SEGS
        c = (r * math.cos(th), y, r * math.sin(th)); tan = (-math.sin(th), 0.0, math.cos(th)); rad = (math.cos(th), 0.0, math.sin(th))
        frames.append((c, tan, rad))
    # split into runs that avoid the gap
    run = []
    for f in frames:
        th = math.atan2(f[0][2], f[0][0])
        d = math.atan2(math.sin(th - ENTRANCE_ANGLE), math.cos(th - ENTRANCE_ANGLE))
        if skip_gap and abs(d) < GAP_HALF + 0.02:
            if len(run) > 1: box_strip(mesh, run, w, h)
            run = []
        else:
            run.append(f)
    if len(run) > 1: box_strip(mesh, run, w, h)
partial_ring(facade_rail, Y0, rib_radius(Y0) - 0.35, 0.16, 0.16, True)
partial_ring(facade_rail, Y1, rib_radius(Y1) - 0.35, 0.16, 0.16, True)
partial_ring(facade_glow, Y1 + 0.14, rib_radius(Y1) - 0.35, 0.10, 0.10, True)

# entrance portal at the gap: two pylons, an arched canopy, glow strip under the canopy
portal, portal_glow = Mesh(), Mesh()
r_gap = rib_radius(0) - 0.35
gx = r_gap * math.sin(GAP_HALF) + 0.9   # half distance between pylons
gz = -r_gap                              # portal line (south)
for x in (-gx, gx):
    box_mesh(portal, (x, 2.75, gz), (0.9, 5.5, 0.9))
    box_mesh(portal, (x, 5.6, gz), (1.2, 0.2, 1.2))
# arch: box strip along a half ellipse from pylon to pylon
arch = []
for i in range(25):
    t = i / 24
    a = math.pi * (1 - t)
    x = gx * math.cos(a)
    y = 5.6 + 2.2 * math.sin(a)
    c = (x, y, gz); tan = (math.sin(a), -math.cos(a) * 2.2 / gx, 0.0)
    L = math.hypot(tan[0], tan[1]) or 1
    tan = (tan[0] / L, tan[1] / L, 0.0)
    arch.append((c, tan, (0.0, 0.0, 1.0)))
box_strip(portal, arch, 0.5, 0.9)
box_strip(portal_glow, [((c[0], c[1] - 0.32, c[2]), tan, rad) for (c, tan, rad) in arch], 0.12, 0.12)
# marquee: a curved dark plate above the arch (same plan curvature as the tower base), a thin
# teal neon frame and the words ARENA LOUNGE as thick warm neon tubes, all baked geometry.
# s = arc length along the sign (positive towards the viewer's right when standing on the path).
R_SIGN = r_gap                # plate centre line sits on the portal radius, over the arch
SIGN_HALF, SIGN_Y0, SIGN_Y1 = 4.1, 7.95, 9.95
def sign_pt(sd, y, dr):
    """World point at arc length sd, height y, dr metres outward from the plate centre line."""
    ph = ENTRANCE_ANGLE - sd / R_SIGN     # minus: the client mirrors x, this keeps the words readable
    r = R_SIGN + dr
    return (r * math.cos(ph), y, r * math.sin(ph))
def sign_out(sd):
    ph = ENTRANCE_ANGLE - sd / R_SIGN
    return (math.cos(ph), 0.0, math.sin(ph))
def box8(mesh, c):
    """Closed box from 8 corners: c[0..3] = one end quad (ccw seen from outside), c[4..7] = far end."""
    mesh.quad(c[0], c[1], c[2], c[3]); mesh.quad(c[7], c[6], c[5], c[4])
    mesh.quad(c[0], c[4], c[5], c[1]); mesh.quad(c[1], c[5], c[6], c[2])
    mesh.quad(c[2], c[6], c[7], c[3]); mesh.quad(c[3], c[7], c[4], c[0])
def tube(mesh, a, b, out, w, d, ext):
    """Straight box tube from a to b: w across (in the sign plane), d deep (along out), ends extended by ext."""
    dirv = sub(b, a); L = math.sqrt(sum(x * x for x in dirv)) or 1.0
    dirv = mul(dirv, 1.0 / L)
    n = cross(out, dirv); nl = math.sqrt(sum(x * x for x in n)) or 1.0; n = mul(n, 1.0 / nl)
    a2, b2 = sub(a, mul(dirv, ext)), add(b, mul(dirv, ext))
    nw, od = mul(n, w / 2), mul(out, d / 2)
    end = lambda p: [add(sub(p, nw), od), add(add(p, nw), od), sub(add(p, nw), od), sub(sub(p, nw), od)]
    ca, cb = end(a2), end(b2)
    box8(mesh, [ca[0], ca[1], ca[2], ca[3], cb[0], cb[1], cb[2], cb[3]])
def curved_tube(mesh, s0, s1, y0, y1, dr, w, d, segs=20):
    for i in range(segs):
        ta, tb = i / segs, (i + 1) / segs
        a = sign_pt(s0 + (s1 - s0) * ta, y0 + (y1 - y0) * ta, dr)
        b = sign_pt(s0 + (s1 - s0) * tb, y0 + (y1 - y0) * tb, dr)
        tube(mesh, a, b, sign_out((s0 + s1) / 2 + (s1 - s0) * (ta + tb - 1) / 2), w, d, 0.004)
def curved_slab(mesh, s0, s1, y0, y1, r0, r1, segs=24):
    for i in range(segs):
        sa, sb = s0 + (s1 - s0) * i / segs, s0 + (s1 - s0) * (i + 1) / segs
        mesh.quad(sign_pt(sa, y0, r1), sign_pt(sb, y0, r1), sign_pt(sb, y1, r1), sign_pt(sa, y1, r1))   # front (outward)
        mesh.quad(sign_pt(sb, y0, r0), sign_pt(sa, y0, r0), sign_pt(sa, y1, r0), sign_pt(sb, y1, r0))   # back
        mesh.quad(sign_pt(sa, y1, r1), sign_pt(sb, y1, r1), sign_pt(sb, y1, r0), sign_pt(sa, y1, r0))   # top
        mesh.quad(sign_pt(sb, y0, r1), sign_pt(sa, y0, r1), sign_pt(sa, y0, r0), sign_pt(sb, y0, r0))   # bottom
    for (sd, flip) in ((s0, False), (s1, True)):
        q = [sign_pt(sd, y0, r1), sign_pt(sd, y1, r1), sign_pt(sd, y1, r0), sign_pt(sd, y0, r0)]
        if flip: q = q[::-1]
        mesh.quad(*q)
marquee, marquee_frame, neon = Mesh(), Mesh(), Mesh()
curved_slab(marquee, -SIGN_HALF, SIGN_HALF, SIGN_Y0, SIGN_Y1, -0.13, 0.13)
# teal neon frame just in front of the plate face
for y in (SIGN_Y0 + 0.06, SIGN_Y1 - 0.06):
    curved_tube(marquee_frame, -SIGN_HALF - 0.05, SIGN_HALF + 0.05, y, y, 0.20, 0.09, 0.09, 28)
for sd in (-SIGN_HALF - 0.05, SIGN_HALF + 0.05):
    curved_tube(marquee_frame, sd, sd, SIGN_Y0 + 0.06, SIGN_Y1 - 0.06, 0.20, 0.09, 0.09, 1)
# posts from the pylon collars up to the plate ends
for x in (-3.9, 3.9):
    sd = x
    for k in range(6):
        ya, yb = 5.7 + (SIGN_Y0 + 0.2 - 5.7) * k / 6, 5.7 + (SIGN_Y0 + 0.2 - 5.7) * (k + 1) / 6
        tube(portal, sign_pt(sd, ya, -0.05), sign_pt(sd, yb, -0.05), sign_out(sd), 0.18, 0.4, 0.0)
# stroke glyphs on a unit cell (x right, y up), tubes of thickness TUBE_W in the sign plane
def ell(th, cx=0.5, cy=0.5, rx=0.5, ry=0.5):
    return (cx + rx * math.cos(math.radians(th)), cy + ry * math.sin(math.radians(th)))
GLYPHS = {
    'A': [[(0, 0), (0.5, 1), (1, 0)], [(0.22, 0.4), (0.78, 0.4)]],
    'R': [[(0, 0), (0, 1)], [(0, 1), (0.66, 1), (0.88, 0.93), (1, 0.8), (1, 0.66), (0.88, 0.55), (0.66, 0.5), (0, 0.5)], [(0.55, 0.5), (1, 0)]],
    'E': [[(0, 0), (0, 1)], [(0, 1), (0.95, 1)], [(0, 0.5), (0.8, 0.5)], [(0, 0), (0.95, 0)]],
    'N': [[(0, 0), (0, 1), (1, 0), (1, 1)]],
    'L': [[(0, 1), (0, 0), (0.95, 0)]],
    'O': [[ell(90 + 360 * i / 20) for i in range(21)]],
    'U': [[(0, 1), (0, 0.3), (0.05, 0.16), (0.15, 0.06), (0.3, 0.005), (0.5, 0), (0.7, 0.005), (0.85, 0.06), (0.95, 0.16), (1, 0.3), (1, 1)]],
    'G': [[ell(40 + 245 * i / 14) for i in range(15)] + [(0.9, 0.06), (0.98, 0.18), (0.98, 0.45), (0.55, 0.45)]],
}
LETTER_W, LETTER_H, ADVANCE, SPACE_W, TUBE_W, TUBE_D = 0.5, 0.95, 0.63, 0.36, 0.14, 0.15
def neon_text(mesh, text, y_base, dr):
    total = sum(SPACE_W if ch == ' ' else ADVANCE for ch in text) - (ADVANCE - LETTER_W)
    sd = -total / 2
    for ch in text:
        if ch == ' ':
            sd += SPACE_W; continue
        for stroke in GLYPHS[ch]:
            for (u0, v0), (u1, v1) in zip(stroke, stroke[1:]):
                a = sign_pt(sd + u0 * LETTER_W, y_base + v0 * LETTER_H, dr)
                b = sign_pt(sd + u1 * LETTER_W, y_base + v1 * LETTER_H, dr)
                tube(mesh, a, b, sign_out(sd + (u0 + u1) / 2 * LETTER_W), TUBE_W, TUBE_D, TUBE_W / 2)
        sd += ADVANCE
neon_text(neon, 'ARENA LOUNGE', (SIGN_Y0 + SIGN_Y1) / 2 - LETTER_H / 2, 0.13 + TUBE_D / 2 + 0.02)

# string lights: catenaries between the seven ground columns around the plaza (r 11.4)
lights = Mesh()
col_angles = [160, 200, 259, 304, 0, 56, 101]
def col_pos(deg):
    t = math.radians(deg)
    # scene: x = sin, z = cos (config.ts ring()); glTF keeps x and z
    return (11.4 * math.sin(t), 11.4 * math.cos(t))
pairs = [(200, 259), (259, 304), (304, 0), (0, 56), (56, 101), (101, 160)]
for (a, b) in pairs:
    (x0, z0), (x1, z1) = col_pos(a), col_pos(b)
    for i in range(1, 12):
        t = i / 12
        sag = 0.9 * math.sin(math.pi * t)
        box_mesh(lights, (x0 + (x1 - x0) * t, 7.0 - sag, z0 + (z1 - z0) * t), (0.12, 0.12, 0.12))
# a second string ring lower around the plaza tree at r 5.4
for i in range(24):
    a = 2 * math.pi * i / 24
    box_mesh(lights, (5.4 * math.cos(a), 3.6 + 0.25 * math.sin(a * 6), 5.4 * math.sin(a)), (0.11, 0.11, 0.11))

# night lighting fixtures, all in the one warm-emissive "lights" mesh:
#  - beacons where the two rib families cross (a lattice of light points on the tower) and on the crown
#  - uplight collars around the ground and game-room columns (angles mirror lounge3d.ts)
#  - string lights in the game room (between its columns) and a ring over the rooftop
def rib_angle(theta0, direction, y):
    return theta0 + direction * TWIST * (y / H)
crossings = []
for i in range(RIBS):
    for j in range(RIBS):
        a0 = BASE_ROT + 2 * math.pi * i / RIBS
        b0 = BASE_ROT + 2 * math.pi * j / RIBS + math.pi / RIBS
        # a0 + T t = b0 - T t + 2 pi k  ->  t = (b0 - a0 + 2 pi k) / (2 T)
        for k in (-1, 0, 1):
            t = (b0 - a0 + 2 * math.pi * k) / (2 * TWIST)
            if 0.03 < t < 0.985:
                y = H * t
                th = rib_angle(a0, 1, y)
                r = rib_radius(y) + 0.22
                crossings.append((r * math.cos(th), y, r * math.sin(th)))
for (x, y, z) in crossings:
    box_mesh(lights, (x, y, z), (0.16, 0.16, 0.16))
for i in range(24):
    a = 2 * math.pi * i / 24
    box_mesh(lights, (R_TOP * math.cos(a), H + 0.42, R_TOP * math.sin(a)), (0.2, 0.2, 0.2))
def collar(deg, r, y):
    t = math.radians(deg)
    cx, cz = r * math.sin(t), r * math.cos(t)     # scene ring(): x = sin, z = cos
    box_strip(lights, [((cx + 0.42 * math.cos(a), y, cz + 0.42 * math.sin(a)), (-math.sin(a), 0, math.cos(a)), (math.cos(a), 0, math.sin(a))) for a in [2 * math.pi * k / 16 for k in range(17)]], 0.07, 0.07)
for deg in [160, 200, 259, 304, 0, 56, 101]:
    collar(deg, 11.4, 0.55)
    collar(deg, 11.4, 7.3)
for deg in [112, 158, 202, 338]:
    collar(deg, 9.9, 8.55)
    collar(deg, 9.9, 15.3)
def string(p0, p1, y, n=10, sag=0.7):
    for i in range(1, n):
        t = i / n
        box_mesh(lights, (p0[0] + (p1[0] - p0[0]) * t, y - sag * math.sin(math.pi * t), p0[1] + (p1[1] - p0[1]) * t), (0.12, 0.12, 0.12))
gr = [(9.9 * math.sin(math.radians(d)), 9.9 * math.cos(math.radians(d))) for d in [112, 158, 202, 338]]
string(gr[0], gr[1], 14.6); string(gr[1], gr[2], 14.6); string(gr[3], gr[0], 14.6, 14, 1.0); string(gr[2], gr[3], 14.6, 14, 1.0)
for i in range(32):
    a = 2 * math.pi * i / 32
    box_mesh(lights, (8.6 * math.cos(a), 19.2 + 0.25 * math.sin(a * 8), 8.6 * math.sin(a)), (0.12, 0.12, 0.12))
for deg in [45, 120, 225]:
    collar(deg, 9.5, 16.55)
    collar(deg, 9.5, 23.3)
# rooftop terrace: light posts around the crown edge (short glowing rods)
for i in range(16):
    a = 2 * math.pi * i / 16
    box_mesh(lights, (9.7 * math.cos(a), 25.6, 9.7 * math.sin(a)), (0.1, 0.9, 0.1))

# directory board near the gateway (text is a TextShape in the scene): dark plate + copper frame
board, board_frame = Mesh(), Mesh()
box_mesh(board, (0, 0, 0), (2.6, 1.9, 0.08))
box_mesh(board_frame, (0, 0.98, 0), (2.8, 0.1, 0.16))
box_mesh(board_frame, (0, -0.98, 0), (2.8, 0.1, 0.16))
box_mesh(board_frame, (-1.35, 0, 0), (0.1, 2.0, 0.16))
box_mesh(board_frame, (1.35, 0, 0), (0.1, 2.0, 0.16))
prism(board_frame, 0, 0, 0.06, -2.2, -1.0, 8)

DECOR_MATERIALS = [
    {"name": "copper", "pbrMetallicRoughness": {"baseColorFactor": [0.80, 0.44, 0.20, 1], "metallicFactor": 0.7, "roughnessFactor": 0.35}},
    GLASS,
    {"name": "glowTeal", "pbrMetallicRoughness": {"baseColorFactor": [0.55, 0.9, 0.95, 1], "metallicFactor": 0.1, "roughnessFactor": 0.4}, "emissiveFactor": [0.3, 0.85, 0.95]},
    {"name": "warmLights", "pbrMetallicRoughness": {"baseColorFactor": [1.0, 0.9, 0.7, 1], "metallicFactor": 0.0, "roughnessFactor": 0.4}, "emissiveFactor": [1.0, 0.8, 0.5]},
    {"name": "boardDark", "pbrMetallicRoughness": {"baseColorFactor": [0.09, 0.08, 0.08, 1], "metallicFactor": 0.1, "roughnessFactor": 0.8}},
    COLLIDER,
    {"name": "neonWarm", "pbrMetallicRoughness": {"baseColorFactor": [1.0, 0.95, 0.85, 1], "metallicFactor": 0.0, "roughnessFactor": 0.3}, "emissiveFactor": [0.9, 0.78, 0.55]},
]
write_glb('models/decor.glb', [
    ("facade", facade, 1), ("facade_rail", facade_rail, 0), ("facade_glow", facade_glow, 2),
    ("portal", portal, 0), ("portal_glow", portal_glow, 2), ("lights", lights, 3), ("marquee", marquee, 4), ("marquee_frame", marquee_frame, 2), ("neon", neon, 6),
    ("facade_collider", facade_coll, 5),
], DECOR_MATERIALS)
write_glb('models/board.glb', [("plate", board, 0), ("frame", board_frame, 1)], [DECOR_MATERIALS[4], DECOR_MATERIALS[0]])

# lounge furniture props: sofa (2 meshes) and bar counter with stools (2 meshes)
sofa_base, sofa_cushion = Mesh(), Mesh()
box_mesh(sofa_base, (0, 0.22, 0), (2.0, 0.44, 0.9))
box_mesh(sofa_base, (0, 0.55, 0.36), (2.0, 0.7, 0.2))
box_mesh(sofa_base, (-0.92, 0.42, 0), (0.16, 0.5, 0.9))
box_mesh(sofa_base, (0.92, 0.42, 0), (0.16, 0.5, 0.9))
box_mesh(sofa_cushion, (-0.46, 0.5, -0.05), (0.86, 0.14, 0.7))
box_mesh(sofa_cushion, (0.46, 0.5, -0.05), (0.86, 0.14, 0.7))
write_glb('models/sofa.glb', [("base", sofa_base, 0), ("cushions", sofa_cushion, 1)], [
    {"name": "sofaBase", "pbrMetallicRoughness": {"baseColorFactor": [0.16, 0.36, 0.42, 1], "metallicFactor": 0.0, "roughnessFactor": 0.9}},
    {"name": "cushion", "pbrMetallicRoughness": {"baseColorFactor": [0.93, 0.68, 0.45, 1], "metallicFactor": 0.0, "roughnessFactor": 0.95}},
])
bar_wood, bar_top, bar_glow = Mesh(), Mesh(), Mesh()
box_mesh(bar_wood, (0, 0.55, 0), (3.6, 1.1, 0.6))
box_mesh(bar_top, (0, 1.13, 0), (3.8, 0.06, 0.8))
box_mesh(bar_glow, (0, 1.08, -0.36), (3.7, 0.04, 0.05))     # under-counter light strip on the guest side
box_mesh(bar_glow, (0, 0.06, -0.31), (3.6, 0.04, 0.03))     # kick strip
for x in (-1.2, 0, 1.2):
    prism(bar_wood, x, -1.0, 0.05, 0, 0.7, 8)
    prism(bar_top, x, -1.0, 0.24, 0.7, 0.78, 12)
write_glb('models/bar.glb', [("wood", bar_wood, 0), ("top", bar_top, 1), ("glow", bar_glow, 2)], [WOOD_DARK, {"name": "barTop", "pbrMetallicRoughness": {"baseColorFactor": [0.80, 0.44, 0.20, 1], "metallicFactor": 0.6, "roughnessFactor": 0.35}}, LAMP])
