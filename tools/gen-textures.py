#!/usr/bin/env python3
"""Generate the procedural textures used by the scene (no PIL needed).

  images/board-face.png   512x512 RGBA  frame with 7x6 transparent holes
  images/ui/disc.png      64x64  RGBA  anti-aliased white disc (tinted in UI)
  images/ui/pixel.png     4x4    RGBA  solid white (generic tintable fill)

Run: python3 tools/gen-textures.py
"""
import math, struct, zlib, os

def write_png(path, w, h, rgba_rows):
    raw = b''.join(b'\x00' + bytes(row) for row in rgba_rows)
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw, 9))
    png += chunk(b'IEND', b'')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(png)
    print(f'wrote {path} ({w}x{h})')

def coverage(px, py, cx, cy, r, aspect=1.0):
    """Anti-aliased coverage of pixel (px,py) by an ellipse (rx = r*aspect, ry = r)."""
    rx, ry = r * aspect, r
    dx = (px + 0.5 - cx) / rx
    dy = (py + 0.5 - cy) / ry
    d = math.hypot(dx, dy)  # normalised distance (1.0 == edge)
    # feather over ~1px in the minor axis
    feather = 1.0 / ry
    if d <= 1 - feather: return 1.0
    if d >= 1 + feather: return 0.0
    return (1 + feather - d) / (2 * feather)

# ---------------------------------------------------------------- board face
W = H = 512
COLS, ROWS = 7, 6
# The plane the texture is stretched onto is 1.20 m wide x 1.04 m tall.
# Pre-distort horizontally so holes appear round after stretching.
PLANE_ASPECT = 1.20 / 1.04
frame_rgb = (0x1f, 0x4e, 0x5f)      # deep teal frame
ring_rgb  = (0x17, 0x3b, 0x48)      # darker bevel ring around each hole
pitch_x = W / (COLS + 0.5)          # leave half a cell margin left/right
pitch_y = H / (ROWS + 0.5)
r_hole  = 0.36 * pitch_y            # hole radius in px (y axis)
r_ring  = 0.44 * pitch_y
rows = []
for py in range(H):
    row = bytearray()
    for px in range(W):
        # nearest hole centre
        ci = min(COLS - 1, max(0, int((px - pitch_x * 0.25) / pitch_x)))
        ri = min(ROWS - 1, max(0, int((py - pitch_y * 0.25) / pitch_y)))
        cx = pitch_x * (0.75 + ci)
        cy = pitch_y * (0.75 + ri)
        hole = coverage(px, py, cx, cy, r_hole, 1 / PLANE_ASPECT)
        ring = coverage(px, py, cx, cy, r_ring, 1 / PLANE_ASPECT)
        if hole >= 0.999:
            row += bytes((0, 0, 0, 0))
        else:
            # blend ring colour into frame colour, then punch the hole via alpha
            rgb = tuple(int(frame_rgb[k] * (1 - ring) + ring_rgb[k] * ring) for k in range(3))
            a = int(255 * (1 - hole))
            row += bytes((*rgb, a))
    rows.append(row)
write_png('images/board-face.png', W, H, rows)

# ---------------------------------------------------------------- ui disc
S = 64
rows = []
for py in range(S):
    row = bytearray()
    for px in range(S):
        c = coverage(px, py, S / 2, S / 2, S / 2 - 1.5)
        row += bytes((255, 255, 255, int(255 * c)))
    rows.append(row)
write_png('images/ui/disc.png', S, S, rows)

# ---------------------------------------------------------------- ui pixel
rows = [bytearray(bytes((255, 255, 255, 255)) * 4) for _ in range(4)]
write_png('images/ui/pixel.png', 4, 4, rows)
