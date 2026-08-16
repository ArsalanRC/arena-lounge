#!/usr/bin/env python3
"""Generate every procedural texture used by the scene (pure Python, no PIL).

3D:
  images/croc-face.png     256  green croc head for Croc Snap (alpha disc)
  images/backgammon-board.png 512x410 two rows of points + bar (Backgammon)
  images/board-face.png    512  frame face with see-through holes + bevel
  images/wood.png          512  warm plank wood (table, walls)
  images/floor.png         512  dark parquet, tiles seamlessly
  images/rug.png           512  round woven rug with alpha outside the circle
UI (all alpha):
  images/ui/chess-{w,b}{K,Q,R,B,N,P}.png  128  flat chess piece silhouettes
  images/ui/disc-yellow.png / disc-red.png  128  shaded discs
  images/ui/hole.png        128  recessed empty cell
  images/ui/ring.png        128  white ring (win / last-move highlight)
  images/ui/panel.png       256  rounded dark panel
  images/ui/pill.png        512x128 rounded pill (banner)
  images/ui/button.png      256x64 rounded white button with gloss (tinted)
  images/ui/board.png       256  rounded teal board background
  images/ui/disc.png / pixel.png  legacy plain sprites

Run: python3 tools/gen-textures.py
"""
import math, struct, zlib, os, random

random.seed(7)

# ------------------------------------------------------------------ png io
def write_png(path, w, h, px):
    """px: function (x, y) -> (r, g, b, a) floats 0..1"""
    rows = []
    for y in range(h):
        row = bytearray()
        for x in range(w):
            r, g, b, a = px(x, y)
            row += bytes((clamp8(r), clamp8(g), clamp8(b), clamp8(a)))
        rows.append(row)
    raw = b''.join(b'\x00' + bytes(r) for r in rows)
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(png)
    print(f'wrote {path} ({w}x{h})')

def clamp8(v):
    return max(0, min(255, int(round(v * 255))))

def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))

def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(a[i] * (1 - t) + b[i] * t for i in range(3))

def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)

# ------------------------------------------------------------------ noise
_perm = list(range(256)); random.shuffle(_perm); _perm += _perm
def _fade(t): return t * t * t * (t * (t * 6 - 15) + 10)
def _grad(h, x, y):
    h &= 3
    u = x if h < 2 else y
    v = y if h < 2 else x
    return (u if h & 1 == 0 else -u) + (v if h & 2 == 0 else -v)
def perlin(x, y):
    xi, yi = int(math.floor(x)) & 255, int(math.floor(y)) & 255
    xf, yf = x - math.floor(x), y - math.floor(y)
    u, v = _fade(xf), _fade(yf)
    aa = _perm[_perm[xi] + yi]; ab = _perm[_perm[xi] + yi + 1]
    ba = _perm[_perm[xi + 1] + yi]; bb = _perm[_perm[xi + 1] + yi + 1]
    x1 = _grad(aa, xf, yf) + u * (_grad(ba, xf - 1, yf) - _grad(aa, xf, yf))
    x2 = _grad(ab, xf, yf - 1) + u * (_grad(bb, xf - 1, yf - 1) - _grad(ab, xf, yf - 1))
    return (x1 + v * (x2 - x1)) * 0.5 + 0.5  # 0..1

def fbm(x, y, octaves=4):
    v, amp, freq, norm = 0.0, 1.0, 1.0, 0.0
    for _ in range(octaves):
        v += perlin(x * freq, y * freq) * amp
        norm += amp; amp *= 0.5; freq *= 2
    return v / norm

# ------------------------------------------------------------------ shapes
def rounded_rect_cov(x, y, w, h, r, inset=0.0):
    """Anti-aliased coverage of pixel (x,y) inside a rounded rect of size w x h."""
    px, py = x + 0.5, y + 0.5
    cx = min(max(px, r + inset), w - r - inset)
    cy = min(max(py, r + inset), h - r - inset)
    d = math.hypot(px - cx, py - cy) - r
    return 1 - smoothstep(-0.7, 0.7, d)

def circle_cov(x, y, cx, cy, r, aspect=1.0):
    dx = (x + 0.5 - cx) / aspect
    dy = (y + 0.5 - cy)
    d = math.hypot(dx, dy) - r
    return 1 - smoothstep(-0.7, 0.7, d)

# ================================================================== 3D
def gen_board_face():
    W = H = 512
    COLS, ROWS = 7, 6
    ASPECT = 1.20 / 1.04           # plane w/h; pre-squeeze holes horizontally
    base = hex_rgb('#1f5266'); dark = hex_rgb('#143a48'); light = hex_rgb('#2f6f86')
    px_pitch_x = W / (COLS + 0.5); px_pitch_y = H / (ROWS + 0.5)
    r_hole = 0.36 * px_pitch_y; r_bevel = 0.46 * px_pitch_y
    def px(x, y):
        ci = min(COLS - 1, max(0, int((x - px_pitch_x * 0.25) / px_pitch_x)))
        ri = min(ROWS - 1, max(0, int((y - px_pitch_y * 0.25) / px_pitch_y)))
        cx = px_pitch_x * (0.75 + ci); cy = px_pitch_y * (0.75 + ri)
        hole = circle_cov(x, y, cx, cy, r_hole, 1 / ASPECT)
        if hole >= 0.999:
            return (0, 0, 0, 0)
        # body: soft vertical gradient + faint noise
        g = 0.5 + 0.5 * math.cos((y / H) * math.pi)          # lighter at top
        n = fbm(x / 90, y / 90, 3) - 0.5
        body = mix(mix(dark, base, 0.55 + 0.45 * g), light, 0.18 * g + 0.25 * n)
        # bevel ring: darker just around the hole (shadow) and a light rim further out
        d = math.hypot((x + 0.5 - cx) * ASPECT, y + 0.5 - cy)
        shadow = smoothstep(r_bevel + 6, r_hole, d)          # 1 near the hole
        rim = math.exp(-((d - (r_bevel + 2)) ** 2) / 12.0)
        col = mix(body, dark, 0.65 * shadow)
        col = mix(col, light, 0.5 * rim)
        return (*col, 1 - hole)
    write_png('images/board-face.png', W, H, px)

def gen_wood(path='images/wood.png', base_hex='#7a5230', dark_hex='#4a2f1b', light_hex='#a3744a', planks=4, seam=0.02, scale=1.0):
    W = H = 512
    base, dark, light = hex_rgb(base_hex), hex_rgb(dark_hex), hex_rgb(light_hex)
    def px(x, y):
        u, v = x / W, y / H
        row = int(v * planks)
        # plank offset per row for a staggered look
        off = (row * 0.37) % 1.0
        uu = (u + off) % 1.0
        # grain: stretched noise along the plank direction
        g = fbm(uu * 2.0 * scale + row * 3.1, v * 26 * scale, 4)
        rings = 0.5 + 0.5 * math.sin((g * 6.0 + v * 40) * 1.7)
        col = mix(dark, base, 0.55 + 0.45 * rings)
        col = mix(col, light, 0.25 * (fbm(uu * 5 + 10, v * 8 + row, 2) - 0.4))
        # per-plank tint
        tint = ((row * 7919) % 100) / 100 - 0.5
        col = mix(col, light if tint > 0 else dark, abs(tint) * 0.35)
        # seams between planks and plank ends
        vy = (v * planks) % 1.0
        edge = min(vy, 1 - vy)
        end = min(uu, 1 - uu)
        s = smoothstep(seam, 0.0, edge) + smoothstep(seam * 0.6, 0.0, end)
        col = mix(col, dark, min(1.0, s) * 0.85)
        return (*col, 1.0)
    write_png(path, W, H, px)

def gen_floor():
    # dark, slightly desaturated parquet: reuse the wood generator with a darker palette and more planks
    gen_wood('images/floor.png', base_hex='#3d2f28', dark_hex='#221915', light_hex='#5a463a', planks=6, seam=0.03, scale=1.2)

def gen_rug():
    W = H = 512
    # neutral: zones tint this via albedoColor, so keep it light and low-contrast
    c1, c2, c3 = hex_rgb('#cfc4b4'), hex_rgb('#e6dccb'), hex_rgb('#a89c8a')
    def px(x, y):
        dx, dy = x + 0.5 - W / 2, y + 0.5 - H / 2
        d = math.hypot(dx, dy) / (W / 2)     # 0 centre .. 1 edge
        cov = 1 - smoothstep(0.985, 1.0, d)
        if cov <= 0:
            return (0, 0, 0, 0)
        ang = math.atan2(dy, dx)
        rings = 0.5 + 0.5 * math.sin(d * 18)
        spokes = 0.5 + 0.5 * math.sin(ang * 16 + d * 4)
        weave = fbm(x / 9, y / 9, 2)
        col = mix(c1, c2, 0.18 * rings + 0.10 * spokes)
        col = mix(col, c3, 0.5 * smoothstep(0.86, 0.98, d))   # dark border
        col = mix(col, c2, 0.35 * smoothstep(0.93, 0.955, d) * (1 - smoothstep(0.955, 0.975, d)))  # light band
        col = mix(col, c3, 0.25 * (weave - 0.5))
        return (*col, cov)
    write_png('images/rug.png', W, H, px)

# ================================================================== UI
def gen_ui_disc(path, base_hex, dark_hex, light_hex):
    S = 128
    base, dark, light = hex_rgb(base_hex), hex_rgb(dark_hex), hex_rgb(light_hex)
    R = S / 2 - 3
    def px(x, y):
        cov = circle_cov(x, y, S / 2, S / 2, R)
        if cov <= 0:
            return (0, 0, 0, 0)
        dx, dy = (x + 0.5 - S / 2) / R, (y + 0.5 - S / 2) / R
        d = math.hypot(dx, dy)
        # rim darkening + inner plateau ring like a real plastic disc
        col = mix(base, dark, smoothstep(0.72, 1.0, d) * 0.7)
        col = mix(col, dark, 0.35 * math.exp(-((d - 0.62) ** 2) / 0.004))
        col = mix(col, light, 0.22 * (1 - smoothstep(0.0, 0.6, d)))
        # specular highlight top-left
        hx, hy = dx + 0.42, dy + 0.42
        spec = math.exp(-(hx * hx + hy * hy) / 0.10)
        col = mix(col, (1, 1, 1), 0.55 * spec)
        return (*col, cov)
    write_png(path, S, S, px)

def gen_reversi_board():
    W = H = 512
    N = 8
    felt, line, edge = hex_rgb('#2f6b46'), hex_rgb('#1d452c'), hex_rgb('#163521')
    cell = W / N
    def px(x, y):
        # felt with subtle noise
        n = fbm(x / 40, y / 40, 3) - 0.5
        col = mix(felt, line, 0.35 + 0.5 * n)
        # grid lines every cell (2px) and a thicker border
        gx = min(x % cell, cell - x % cell); gy = min(y % cell, cell - y % cell)
        if gx < 1.2 or gy < 1.2:
            col = line
        if x < 3 or y < 3 or x >= W - 3 or y >= H - 3:
            col = edge
        # the four traditional star points
        for sx in (2, 6):
            for sy in (2, 6):
                if math.hypot(x - sx * cell, y - sy * cell) < 4:
                    col = edge
        return (*col, 1.0)
    write_png('images/reversi-board.png', W, H, px)

def gen_checkers_board():
    W = H = 512
    N = 8
    light, dark, edge = hex_rgb('#e8d9bd'), hex_rgb('#6b4a35'), hex_rgb('#3a2a1e')
    cell = W / N
    def px(x, y):
        cx, cy = int(x // cell), int(y // cell)
        # rank 0 (white's back rank) is drawn at the BOTTOM: flip cy
        rank = N - 1 - cy
        col = dark if (cx + rank) % 2 == 1 else light
        n = fbm(x / 60, y / 60, 2) - 0.5
        col = mix(col, edge if col is dark else light, 0.15 * n)
        if x < 3 or y < 3 or x >= W - 3 or y >= H - 3:
            col = edge
        return (*col, 1.0)
    write_png('images/checkers-board.png', W, H, px)

def gen_king_disc(path, base, dark, light, crown):
    """Shaded disc with a small crown ring drawn on top."""
    S = 128
    b, d, l, c = hex_rgb(base), hex_rgb(dark), hex_rgb(light), hex_rgb(crown)
    R = S / 2 - 3
    def px(x, y):
        cov = circle_cov(x, y, S / 2, S / 2, R)
        if cov <= 0:
            return (0, 0, 0, 0)
        dx, dy = (x + .5 - S / 2) / R, (y + .5 - S / 2) / R
        dd = math.hypot(dx, dy)
        col = mix(b, d, smoothstep(0.72, 1.0, dd) * 0.7)
        col = mix(col, l, 0.22 * (1 - smoothstep(0.0, 0.6, dd)))
        spec = math.exp(-((dx + .42) ** 2 + (dy + .42) ** 2) / 0.10)
        col = mix(col, (1, 1, 1), 0.55 * spec)
        # crown: a ring plus three bumps
        ring = math.exp(-((dd - 0.42) ** 2) / 0.006)
        bumps = 0
        for ang in (-90, 30, 150):
            a = math.radians(ang)
            bx, by = 0.42 * math.cos(a), 0.42 * math.sin(a)
            bumps = max(bumps, math.exp(-((dx - bx) ** 2 + (dy - by) ** 2) / 0.012))
        col = mix(col, c, min(1.0, ring + bumps))
        return (*col, cov)
    write_png(path, S, S, px)

def gen_mark_x(path='images/ui/mark-x.png', rgb=(1, 1, 1)):
    S = 128
    def px(x, y):
        # two diagonal bars, anti-aliased, with rounded ends via distance-to-segment
        def seg(ax, ay, bx, by, w):
            vx, vy = bx - ax, by - ay
            t = max(0, min(1, ((x + .5 - ax) * vx + (y + .5 - ay) * vy) / (vx * vx + vy * vy)))
            d = math.hypot(x + .5 - (ax + vx * t), y + .5 - (ay + vy * t))
            return 1 - smoothstep(w - .8, w + .8, d)
        a = max(seg(28, 28, 100, 100, 11), seg(100, 28, 28, 100, 11))
        return (*rgb, a)
    write_png(path, S, S, px)

def gen_mark_o(path='images/ui/mark-o.png', rgb=(1, 1, 1)):
    S = 128
    def px(x, y):
        d = math.hypot(x + .5 - S / 2, y + .5 - S / 2)
        outer = 1 - smoothstep(48 - .8, 48 + .8, d)
        inner = smoothstep(30 - .8, 30 + .8, d)
        return (*rgb, outer * inner)
    write_png(path, S, S, px)

def gen_ui_hole():
    S = 128
    base, dark = hex_rgb('#123240'), hex_rgb('#071a22')
    R = S / 2 - 3
    def px(x, y):
        cov = circle_cov(x, y, S / 2, S / 2, R)
        if cov <= 0:
            return (0, 0, 0, 0)
        dx, dy = (x + 0.5 - S / 2) / R, (y + 0.5 - S / 2) / R
        d = math.hypot(dx, dy)
        # recessed: darker top-left inner shadow, slightly lighter bottom-right
        shade = (dx + dy) * 0.5
        col = mix(base, dark, 0.55 - 0.45 * shade)
        col = mix(col, dark, 0.6 * smoothstep(0.75, 1.0, d))
        return (*col, cov)
    write_png('images/ui/hole.png', S, S, px)

def gen_ui_ring():
    S = 128
    R = S / 2 - 3
    def px(x, y):
        dx, dy = x + 0.5 - S / 2, y + 0.5 - S / 2
        d = math.hypot(dx, dy)
        outer = 1 - smoothstep(R - 0.7, R + 0.7, d)
        inner = smoothstep(R - 12, R - 10.6, d)
        return (1, 1, 1, outer * inner)
    write_png('images/ui/ring.png', S, S, px)

def gen_ui_panel(path, w, h, radius, fill_hex, alpha, border_hex, border_alpha=0.9, gloss=0.0):
    fill, border = hex_rgb(fill_hex), hex_rgb(border_hex)
    def px(x, y):
        cov = rounded_rect_cov(x, y, w, h, radius)
        if cov <= 0:
            return (0, 0, 0, 0)
        inner = rounded_rect_cov(x, y, w, h, max(1, radius - 2), inset=2)
        col = fill
        if gloss > 0:
            t = 1 - y / h
            col = mix(fill, (1, 1, 1), gloss * (0.35 + 0.65 * t))
        a = alpha
        # border ring
        ring = cov - inner
        col = mix(col, border, ring)
        a = a * (1 - ring) + border_alpha * ring
        return (*col, a * cov)
    write_png(path, w, h, px)

def gen_ui_button():
    W, H = 256, 64
    def px(x, y):
        cov = rounded_rect_cov(x, y, W, H, 18)
        if cov <= 0:
            return (0, 0, 0, 0)
        t = 1 - y / H
        v = 0.78 + 0.22 * t                       # vertical gloss, tint-friendly white base
        inner = rounded_rect_cov(x, y, W, H, 16, inset=2)
        v = v * (0.72 + 0.28 * inner)             # slightly darker 2px edge
        return (v, v, v, cov)
    write_png('images/ui/button.png', W, H, px)

def gen_ui_plain():
    S = 64
    def disc(x, y):
        return (1, 1, 1, circle_cov(x, y, S / 2, S / 2, S / 2 - 1.5))
    write_png('images/ui/disc.png', S, S, disc)

# ------------------------------------------------------------------ backgammon board
def gen_backgammon_board(path='images/backgammon-board.png'):
    """Two rows of twelve triangular points with a bar in the middle, on a
    felt-brown field; drawn from white's perspective (point 12..23 across the
    top, 11..0 across the bottom). The plane is 1.0 x 0.8 m in the scene."""
    W, H = 512, 410
    felt, edge = hex_rgb('#5a3e2b'), hex_rgb('#3a2a1e')
    light, dark, barc = hex_rgb('#e8d9bd'), hex_rgb('#8f2f2a'), hex_rgb('#2b1e14')
    bar_w = 0.08 * W
    pt_w = (W - bar_w) / 12
    pt_h = 0.44 * H
    def px(x, y):
        u = x + 0.5; v = y + 0.5
        col = felt
        n = fbm(x / 40, y / 40, 2) - 0.5
        col = mix(col, edge, 0.12 * n)
        # bar
        if abs(u - W / 2) < bar_w / 2:
            col = barc
        else:
            xx = u if u < W / 2 else u - bar_w
            i = int(xx // pt_w)          # 0..11 column index
            cx = (i + 0.5) * pt_w + (0 if u < W / 2 else bar_w)
            top = v < H / 2
            tip = pt_h if top else H - pt_h
            base = 0 if top else H
            # triangle: width shrinks linearly from base to tip
            f = (v - base) / (tip - base) if tip != base else 1
            if 0 <= f <= 1:
                halfw = (1 - f) * pt_w * 0.47
                d = abs(u - cx) - halfw
                cov = 1 - smoothstep(-0.8, 0.8, d)
                # alternate colours; the top row starts with the opposite colour
                colour = light if (i % 2 == 0) != top else dark
                col = mix(col, colour, cov)
        if u < 4 or v < 4 or u > W - 4 or v > H - 4:
            col = edge
        return (*col, 1.0)
    write_png(path, W, H, px)

# ------------------------------------------------------------------ croc face
def gen_croc_face(path='images/croc-face.png'):
    """Round green croc head seen from the front (Croc Snap): eyes, nostrils, a
    darker rim where the teeth sit; alpha outside the disc."""
    S = 256
    green, dark, light = hex_rgb('#3f8f4a'), hex_rgb('#245c2e'), hex_rgb('#7cc07f')
    def px(x, y):
        cov = circle_cov(x, y, S / 2, S / 2, S / 2 - 2)
        if cov <= 0:
            return (0, 0, 0, 0)
        u, v = (x + 0.5) / S, (y + 0.5) / S
        d = math.hypot(u - 0.5, v - 0.5) * 2   # 0 centre .. 1 rim
        col = mix(green, dark, smoothstep(0.78, 1.0, d) * 0.8)
        col = mix(col, light, 0.18 * (1 - smoothstep(0.0, 0.7, math.hypot(u - 0.42, v - 0.36) * 2)))
        n = fbm(x / 22, y / 22, 3) - 0.5
        col = mix(col, dark, 0.18 * max(0.0, n))   # scales
        # eyes
        for ex in (0.36, 0.64):
            eye = circle_cov(x, y, ex * S, 0.36 * S, 0.11 * S)
            col = mix(col, (0.97, 0.96, 0.9), eye)
            pupil = circle_cov(x, y, ex * S, 0.37 * S, 0.05 * S)
            col = mix(col, (0.08, 0.06, 0.05), pupil)
            glint = circle_cov(x, y, (ex - 0.02) * S, 0.34 * S, 0.018 * S)
            col = mix(col, (1, 1, 1), glint)
        # nostrils
        for nx in (0.44, 0.56):
            col = mix(col, dark, circle_cov(x, y, nx * S, 0.62 * S, 0.028 * S))
        # grin: a dark arc between the nostrils and the rim
        ang = math.atan2(v - 0.5, u - 0.5)
        grin = math.exp(-((d - 0.62) ** 2) / 0.002) * (1 if 0.35 < ang < 2.8 else 0)
        col = mix(col, dark, 0.7 * grin)
        return (*col, cov)
    write_png(path, S, S, px)

# ------------------------------------------------------------------ chess pieces
def _sd_circle(px, py, cx, cy, r):
    return math.hypot(px - cx, py - cy) - r

def _sd_ellipse(px, py, cx, cy, rx, ry):
    # scaled circle: good enough for a few px of anti-aliasing
    k = math.hypot((px - cx) / rx, (py - cy) / ry)
    return (k - 1) * min(rx, ry)

def _sd_box(px, py, cx, cy, hw, hh):
    dx, dy = abs(px - cx) - hw, abs(py - cy) - hh
    return math.hypot(max(dx, 0), max(dy, 0)) + min(max(dx, dy), 0)

def _sd_poly(px, py, pts):
    """Signed distance to a convex polygon (either winding)."""
    area = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
    if area < 0: pts = pts[::-1]   # normalise winding so "outside" is positive below
    d = -1e9
    n = len(pts)
    inside = True
    best = 1e9
    for i in range(n):
        ax, ay = pts[i]; bx, by = pts[(i + 1) % n]
        ex, ey = bx - ax, by - ay
        L = math.hypot(ex, ey) or 1e-9
        # signed distance to the edge line (positive = outside for CCW polygons)
        sd = ((px - ax) * ey - (py - ay) * ex) / L
        d = max(d, sd)
        # distance to the segment (for the outside)
        t = max(0.0, min(1.0, ((px - ax) * ex + (py - ay) * ey) / (L * L)))
        best = min(best, math.hypot(px - (ax + t * ex), py - (ay + t * ey)))
        if sd > 0: inside = False
    return d if inside else best

# Each piece: list of (shape, params) unioned, then 'cut' shapes subtracted.
# Coordinates in a 1x1 box, y down, base at the bottom.
BASE = [('box', (0.5, 0.86, 0.19, 0.045)), ('box', (0.5, 0.79, 0.14, 0.035))]
PIECES = {
    'P': BASE + [('poly', [(0.40, 0.76), (0.60, 0.76), (0.56, 0.52), (0.44, 0.52)]),
                 ('circle', (0.5, 0.42, 0.115))],
    'R': BASE + [('poly', [(0.36, 0.76), (0.64, 0.76), (0.62, 0.40), (0.38, 0.40)]),
                 ('box', (0.5, 0.36, 0.17, 0.035)),
                 ('box', (0.36, 0.28, 0.045, 0.06)), ('box', (0.5, 0.28, 0.045, 0.06)), ('box', (0.64, 0.28, 0.045, 0.06))],
    'N': BASE + [('poly', [(0.36, 0.76), (0.62, 0.76), (0.60, 0.50), (0.50, 0.36), (0.36, 0.52)]),
                 ('circle', (0.53, 0.37, 0.14)),
                 ('poly', [(0.58, 0.31), (0.78, 0.40), (0.76, 0.50), (0.60, 0.48)]),
                 ('poly', [(0.46, 0.27), (0.51, 0.12), (0.58, 0.28)])],
    'B': BASE + [('poly', [(0.40, 0.76), (0.60, 0.76), (0.56, 0.62), (0.44, 0.62)]),
                 ('ellipse', (0.5, 0.45, 0.145, 0.20)),
                 ('circle', (0.5, 0.22, 0.045))],
    'Q': BASE + [('poly', [(0.36, 0.76), (0.64, 0.76), (0.60, 0.44), (0.40, 0.44)]),
                 ('poly', [(0.31, 0.44), (0.69, 0.44), (0.66, 0.30), (0.34, 0.30)]),
                 ('circle', (0.32, 0.26, 0.04)), ('circle', (0.41, 0.22, 0.04)), ('circle', (0.5, 0.20, 0.04)),
                 ('circle', (0.59, 0.22, 0.04)), ('circle', (0.68, 0.26, 0.04))],
    'K': BASE + [('poly', [(0.36, 0.76), (0.64, 0.76), (0.60, 0.44), (0.40, 0.44)]),
                 ('poly', [(0.33, 0.44), (0.67, 0.44), (0.62, 0.32), (0.38, 0.32)]),
                 ('box', (0.5, 0.20, 0.035, 0.11)), ('box', (0.5, 0.20, 0.10, 0.035))],
}
CUTS = {
    'N': [('circle', (0.56, 0.36, 0.028))],
    'B': [('poly', [(0.44, 0.34), (0.60, 0.44), (0.62, 0.40), (0.47, 0.30)])],
}

def _sd_shape(px, py, shape):
    kind, prm = shape
    if kind == 'circle': return _sd_circle(px, py, *prm)
    if kind == 'ellipse': return _sd_ellipse(px, py, *prm)
    if kind == 'box': return _sd_box(px, py, *prm)
    return _sd_poly(px, py, prm)

def gen_chess_piece(path, kind, fill, edge):
    """Flat piece silhouette with a 2.5 px outline, alpha outside."""
    S = 128
    f, e = hex_rgb(fill), hex_rgb(edge)
    def px(x, y):
        u, v = (x + 0.5) / S, (y + 0.5) / S
        d = min(_sd_shape(u, v, sh) for sh in PIECES[kind]) * S
        for c in CUTS.get(kind, []):
            d = max(d, -_sd_shape(u, v, c) * S)
        cov = 1 - smoothstep(-0.7, 0.7, d)
        if cov <= 0:
            return (0, 0, 0, 0)
        # outline band on the inside of the edge, plus a soft top-left light
        outline = smoothstep(-3.2, -2.0, d)
        col = mix(f, e, outline)
        light = 0.10 * (1 - smoothstep(0.0, 0.5, math.hypot(u - 0.42, v - 0.36)))
        col = mix(col, (1, 1, 1), light * (1 - outline))
        return (*col, cov)
    write_png(path, S, S, px)

def gen_chess_pieces():
    for k in 'KQRBNP':
        gen_chess_piece(f'images/ui/chess-w{k}.png', k, '#f4ecd8', '#2b2320')
        gen_chess_piece(f'images/ui/chess-b{k}.png', k, '#2b2320', '#d8ccb4')

if __name__ == '__main__':
    gen_board_face()
    gen_wood()
    gen_floor()
    gen_rug()
    gen_ui_disc('images/ui/disc-yellow.png', '#f5c518', '#b8890a', '#ffe680')
    gen_ui_disc('images/ui/disc-red.png', '#e2453d', '#961f1a', '#ff8a7a')
    gen_ui_disc('images/ui/disc-dark.png', '#2a2422', '#0d0b0a', '#6a5f5a')
    gen_ui_disc('images/ui/disc-light.png', '#f2e8d5', '#b9ab92', '#ffffff')
    gen_reversi_board()
    gen_mark_x()
    gen_mark_o()
    gen_mark_x('images/ui/mark-x-yellow.png', hex_rgb('#f5c518'))
    gen_checkers_board()
    gen_king_disc('images/ui/disc-light-king.png', '#f2e8d5', '#b9ab92', '#ffffff', '#c9931a')
    gen_king_disc('images/ui/disc-dark-king.png', '#2a2422', '#0d0b0a', '#6a5f5a', '#f0c040')
    gen_mark_o('images/ui/mark-o-red.png', hex_rgb('#e2453d'))
    gen_ui_hole()
    gen_ui_ring()
    gen_ui_panel('images/ui/panel.png', 256, 256, 26, '#17130f', 0.88, '#5a4a3c', 0.9)
    gen_ui_panel('images/ui/pill.png', 512, 128, 60, '#17130f', 0.86, '#5a4a3c', 0.9)
    gen_ui_button()
    gen_ui_plain()
    gen_chess_pieces()
    gen_croc_face()
    gen_backgammon_board()
