#!/usr/bin/env python3
"""Palace texture set (numpy + PIL; the per-pixel generator in gen-textures.py is
too slow for veined marble at 1024 px). Everything tiles seamlessly because the
noise is built in the frequency domain (periodic by construction).

  models/palace/floor.png    1024  4 m period: 2x2 cream marble tiles, verde inlay border,
                                   brass diamond at the corners, thin grout (ground floor, slabs)
  models/palace/wall.png     1024x512  cream marble panel, gold rails, engraved frieze along the top
  models/palace/column.png   512x1024  white fluted marble shaft with gold capital and base bands
                                   (u wraps around the cylinder, v runs bottom -> top)
  models/palace/marble.png   512   plain white veined marble (table tops, benches, bar tops)
  models/palace/ceiling.png  1024  4 m period: 2x2 coffers, gold ribs, lapis field with a gold rosette
  models/palace/seat.png     1024  2x2 seat pads (red, green, blue, yellow velvet): double gold ring, gold eight-point star

Run: python3 tools/gen-marble.py
"""
import numpy as np
from PIL import Image

rng = np.random.default_rng(11)

def fractal_noise(w, h, beta=2.2, seed=None):
    """Periodic 1/f^beta noise in 0..1 (FFT-filtered white noise)."""
    r = np.random.default_rng(seed) if seed is not None else rng
    white = r.standard_normal((h, w))
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    f = np.sqrt(fx * fx + fy * fy)
    f[0, 0] = 1.0
    spec = np.fft.rfft2(white) / (f ** (beta / 2))
    spec[0, 0] = 0
    n = np.fft.irfft2(spec, s=(h, w))
    n = (n - n.min()) / (n.max() - n.min() + 1e-9)
    return n

def lowpass(a, sigma_px):
    """Periodic gaussian blur through the frequency domain (keeps the tiling)."""
    h, w = a.shape
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    g = np.exp(-2 * (np.pi * sigma_px) ** 2 * (fx * fx + fy * fy))
    return np.fft.irfft2(np.fft.rfft2(a) * g, s=(h, w))

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)

def marble(w, h, base, vein, vein2, seed, vein_scale=1.0, strength=1.0):
    """Veined marble: a strongly warped wave gives branching main veins (thin, sparse, with a
    soft grey halo), a second warped wave gives warm hairlines; the field is a faint mottle.
    Returns float RGB (h, w, 3)."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    warp = fractal_noise(w, h, 3.4, seed) * 2 - 1        # smooth, large-scale warps: veins wander, no dust
    warp2 = fractal_noise(w, h, 3.0, seed + 1) * 2 - 1
    phase = (xx / w * 2.0 + yy / h * 3.0) * 2 * np.pi * vein_scale + warp * 4.5 + warp2 * 1.5
    v1 = np.clip(1 - np.abs(np.sin(phase)) / 0.09, 0, 1) ** 1.3
    v1 *= smoothstep(0.28, 0.58, fractal_noise(w, h, 3.4, seed + 3))          # sparse: not every vein shows
    halo = lowpass(v1, w * 0.012)
    halo = halo / (halo.max() + 1e-9)
    phase2 = (xx / w * -5.0 + yy / h * 7.0) * 2 * np.pi * vein_scale + warp2 * 5.0 + warp * 2.0
    v2 = np.clip(1 - np.abs(np.sin(phase2)) / 0.05, 0, 1) * 0.55
    v2 *= smoothstep(0.38, 0.68, fractal_noise(w, h, 3.4, seed + 4))
    mottle = fractal_noise(w, h, 3.6, seed + 2)
    col = np.array(base)[None, None, :] * (0.965 + 0.05 * mottle[..., None])
    a1 = np.clip((v1 + 0.35 * halo) * strength, 0, 1)[..., None]
    col = col * (1 - a1) + np.array(vein)[None, None, :] * a1
    a2 = np.clip(v2 * strength, 0, 1)[..., None]
    col = col * (1 - a2) + np.array(vein2)[None, None, :] * a2
    return np.clip(col, 0, 1)

def save(path, rgb, alpha=None):
    a = np.ones(rgb.shape[:2]) if alpha is None else alpha
    img = np.dstack([np.clip(rgb, 0, 1), np.clip(a, 0, 1)])
    import os
    Image.fromarray((img * 255 + 0.5).astype(np.uint8), 'RGBA').save(path + '.tmp.png', optimize=True)
    os.replace(path + '.tmp.png', path)   # atomic for the preview server
    print('wrote', path, rgb.shape[1], 'x', rgb.shape[0])

CREAM = (0.94, 0.92, 0.87)
CREAM_VEIN = (0.52, 0.48, 0.44)
CREAM_VEIN2 = (0.74, 0.65, 0.50)     # warm gold-brown hairlines
WHITE = (0.96, 0.955, 0.94)
WHITE_VEIN = (0.58, 0.59, 0.61)
WHITE_VEIN2 = (0.80, 0.79, 0.77)
VERDE = (0.13, 0.30, 0.22)
VERDE_VEIN = (0.60, 0.72, 0.62)
BRASS = (0.85, 0.66, 0.30)
BRASS_DARK = (0.55, 0.40, 0.16)
GROUT = (0.42, 0.40, 0.37)

def gen_floor(path='models/palace/floor.png', size=1024):
    """2x2 tiles per texture (a 4 m period at 2 m tiles): cream field, verde inlay border, brass corner diamonds."""
    s = size
    field = marble(s, s, CREAM, CREAM_VEIN, CREAM_VEIN2, seed=3, vein_scale=1.0, strength=0.9)
    verde = marble(s, s, VERDE, VERDE_VEIN, VERDE_VEIN, seed=9, vein_scale=1.6, strength=0.7)
    yy, xx = np.mgrid[0:s, 0:s]
    half = s // 2
    # coordinates inside each tile (0..half)
    tx = xx % half; ty = yy % half
    d = np.minimum(np.minimum(tx, half - 1 - tx), np.minimum(ty, half - 1 - ty)).astype(np.float64)
    grout_w = s * 0.004          # ~4 mm at 1 m/256 px
    band_in, band_out = s * 0.030, s * 0.048   # verde inlay strip: 12..19 cm from the tile edge (in 4 m units)
    img = field.copy()
    inlay = ((d >= band_in) & (d <= band_out))
    img[inlay] = verde[inlay]
    # thin brass line on both sides of the inlay
    for edge in (band_in, band_out):
        line = np.abs(d - edge) < s * 0.0025
        img[line] = np.array(BRASS)
    # brass diamond at each tile corner (centred on the tile corner, tip 8 cm)
    cx = (xx + half // 2) % half - half // 2   # distance to nearest tile corner along x
    cy = (yy + half // 2) % half - half // 2
    diamond = (np.abs(cx) + np.abs(cy)) < s * 0.035
    diamond_in = (np.abs(cx) + np.abs(cy)) < s * 0.024
    img[diamond] = np.array(BRASS_DARK)
    img[diamond_in] = np.array(BRASS)
    # grout lines on the tile edges
    grout = d < grout_w
    img[grout] = np.array(GROUT)
    # soft polish highlight variation
    sheen = fractal_noise(s, s, 3.5, 21)
    img = img * (0.97 + 0.06 * sheen[..., None])
    save(path, img)

def gen_wall(path='models/palace/wall.png', w=1024, h=512):
    """One panel per texture: cream marble with gold rails top and bottom, an engraved greek-key frieze under the top rail."""
    img = marble(w, h, CREAM, CREAM_VEIN, CREAM_VEIN2, seed=5, vein_scale=0.8, strength=0.85)
    yy, xx = np.mgrid[0:h, 0:w]
    # panel bevel: darker outer 1.5 %, light line inside
    edge = np.minimum(np.minimum(xx, w - 1 - xx) / w, np.minimum(yy, h - 1 - yy) / h)
    img[edge < 0.012] *= 0.80
    img[(edge >= 0.012) & (edge < 0.017)] = np.minimum(img[(edge >= 0.012) & (edge < 0.017)] * 1.15, 1)
    # gold rails
    for y0, y1 in ((0.035, 0.065), (0.925, 0.955)):
        band = (yy >= h * y0) & (yy < h * y1)
        shade = 0.85 + 0.3 * np.cos((yy - h * y0) / (h * (y1 - y0)) * np.pi)  # rounded rail shading
        img[band] = (np.array(BRASS)[None, :] * shade[band][:, None]).clip(0, 1)
    # engraved greek-key frieze between y 0.075..0.16 (repeats 16 times across the panel)
    fy0, fy1 = 0.075, 0.160
    band = (yy >= h * fy0) & (yy < h * fy1)
    u = (xx / w * 16.0) % 1.0
    v = ((yy - h * fy0) / (h * (fy1 - fy0)))
    v = np.clip(v, 0, 1)
    # meander path as a set of rectangles in (u, v) unit cell, thickness t
    t = 0.14
    def seg(u0, u1, v0, v1):
        return (u >= u0) & (u < u1) & (v >= v0) & (v < v1)
    key = seg(0.0, 1.0, 0.0, t) | seg(0.0, t, 0.0, 0.72) | seg(0.0, 0.72, 0.72 - t, 0.72) | seg(0.72 - t, 0.72, 0.28, 0.72) | seg(0.28, 0.72, 0.28, 0.28 + t) | seg(0.28, 0.28 + t, 0.28, 0.5)
    key = key & band
    # engraving: groove darker, with a light catch on the lower edge
    img[key] *= 0.62
    below = np.roll(key, 2, axis=0) & ~key
    img[below] = np.minimum(img[below] * 1.12, 1)
    save(path, img)

def gen_column(path='models/palace/column.png', w=512, h=1024):
    """Shaft texture: fluted white marble; gold capital (top 7 %) and base (bottom 5 %). v runs bottom -> top."""
    img = marble(w, h, WHITE, WHITE_VEIN, WHITE_VEIN2, seed=13, vein_scale=0.9, strength=0.6)
    yy, xx = np.mgrid[0:h, 0:w]
    vv = 1 - yy / h            # 1 at the top of the image = top of the shaft (v=1)
    # 20 flutes around: concave shading = brighter in the middle, dark rims
    fl = np.cos(xx / w * 20 * 2 * np.pi)
    shade = 0.90 + 0.10 * np.clip(fl, -1, 1)
    rim = np.abs(((xx / w * 20) % 1.0) - 0.5) > 0.47
    shade[rim] *= 0.80
    shaft = (vv > 0.06) & (vv < 0.92)
    img[shaft] *= shade[shaft][:, None]
    # gold capital + base with a couple of grooves
    for y0, y1 in ((0.92, 1.0), (0.0, 0.06)):
        band = (vv >= y0) & (vv < y1)
        g = 0.9 + 0.2 * np.cos((vv - y0) / (y1 - y0) * 3 * np.pi)
        img[band] = (np.array(BRASS)[None, :] * g[band][:, None]).clip(0, 1)
    # thin dark groove where the shaft meets the bands
    for yb in (0.06, 0.92):
        groove = np.abs(vv - yb) < 0.004
        img[groove] *= 0.5
    save(path, img)

def gen_marble_plain(path='models/palace/marble.png', size=512):
    img = marble(size, size, WHITE, WHITE_VEIN, WHITE_VEIN2, seed=17, vein_scale=1.1, strength=0.7)
    save(path, img)

LAPIS = (0.10, 0.16, 0.42)
LAPIS_LIGHT = (0.20, 0.30, 0.62)

def gen_ceiling(path='models/palace/ceiling.png', size=1024):
    """Coffered ceiling, 2x2 coffers per texture (2 m coffers at a 4 m repeat): gold ribs with a
    boss at every crossing, stepped cream moulding, deep lapis field with a gold eight-point rosette."""
    s = size
    half = s // 2
    yy, xx = np.mgrid[0:s, 0:s]
    tx = xx % half; ty = yy % half
    d = np.minimum(np.minimum(tx, half - 1 - tx), np.minimum(ty, half - 1 - ty)).astype(np.float64) / half  # 0 at coffer edge .. 0.5 centre
    img = np.zeros((s, s, 3))
    # lapis field with a soft cloudy variation
    cloud = fractal_noise(s, s, 3.2, 31)
    field = np.array(LAPIS)[None, None, :] * (0.85 + 0.3 * cloud[..., None]) + np.array(LAPIS_LIGHT)[None, None, :] * 0.15 * cloud[..., None]
    img[:] = field
    # gold rib along the coffer edges (0..0.05), then a cream step (0.05..0.075), a thin gold line (0.075..0.085), then the field
    rib = d < 0.05
    step = (d >= 0.05) & (d < 0.075)
    line = (d >= 0.075) & (d < 0.085)
    ribshade = 0.85 + 0.35 * np.cos(d / 0.05 * np.pi)          # rounded rib
    img[rib] = (np.array(BRASS)[None, :] * ribshade[rib][:, None]).clip(0, 1)
    img[step] = np.array(CREAM) * 0.92
    img[line] = np.array(BRASS) * 0.9
    # boss at every rib crossing
    cx = (xx + half // 2) % half - half // 2
    cy = (yy + half // 2) % half - half // 2
    r = np.hypot(cx, cy) / half
    boss = r < 0.06
    img[boss] = (np.array(BRASS)[None, :] * (1.15 - 4.0 * r[boss][:, None])).clip(0, 1)
    # eight-point rosette in the coffer centre
    ccx = (tx - half / 2) / half; ccy = (ty - half / 2) / half
    rr = np.hypot(ccx, ccy); ang = np.arctan2(ccy, ccx)
    star = rr < 0.10 * (0.55 + 0.45 * np.abs(np.cos(4 * ang)) ** 0.5)
    ring = (rr > 0.115) & (rr < 0.128)
    petals = (rr > 0.135) & (rr < 0.20) & (np.abs(np.sin(8 * ang)) < 0.35)
    for m in (star, ring, petals):
        img[m] = (np.array(BRASS)[None, :] * (0.95 + 0.25 * cloud[m][:, None])).clip(0, 1)
    save(path, img)

VELVETS = {   # (field, light) per seat colour
    'red': ((0.46, 0.07, 0.11), (0.62, 0.12, 0.16)),
    'green': ((0.08, 0.32, 0.16), (0.14, 0.44, 0.22)),
    'blue': ((0.09, 0.16, 0.42), (0.14, 0.24, 0.56)),
    'yellow': ((0.62, 0.46, 0.08), (0.78, 0.60, 0.14)),
}

def seat_disc(size, colour, seed):
    """One seat pad disc: velvet field with a soft sheen, gold rim + inner ring, gold eight-point star;
    transparent outside the circle. Returns (rgb, alpha)."""
    s = size
    yy, xx = np.mgrid[0:s, 0:s].astype(np.float64) + 0.5
    cx = cy = s / 2
    r = np.hypot(xx - cx, yy - cy) / (s / 2)          # 0 centre .. 1 rim
    field, light = VELVETS[colour]
    sheen = fractal_noise(s, s, 3.0, seed)
    img = np.array(field)[None, None, :] * (0.85 + 0.3 * sheen[..., None]) + np.array(light)[None, None, :] * 0.2 * (1 - r[..., None])
    # gold rim (0.90..1.0), inner ring (0.74..0.78)
    rim = (r > 0.90)
    ring = (r > 0.74) & (r < 0.78)
    shade_rim = 0.85 + 0.3 * np.cos((r - 0.95) / 0.05 * np.pi)
    img[rim] = (np.array(BRASS)[None, :] * shade_rim[rim][:, None]).clip(0, 1)
    img[ring] = np.array(BRASS) * 0.95
    # eight-point star: two squares rotated 45 deg
    def square(a, half):
        x = (xx - cx) / (s / 2); y = (yy - cy) / (s / 2)
        xr = x * np.cos(a) - y * np.sin(a); yr = x * np.sin(a) + y * np.cos(a)
        return (np.abs(xr) < half) & (np.abs(yr) < half)
    star = square(0, 0.16) | square(np.pi / 4, 0.16)
    img[star] = np.array(BRASS) * (0.9 + 0.2 * sheen[star][:, None]).clip(0, 1)
    core = r < 0.06
    img[core] = np.array(BRASS_DARK)
    alpha = np.clip((1.0 - r) * (s / 2) + 0.5, 0, 1)    # 1 px anti-aliased edge, transparent corners
    return img, alpha

def gen_seat(path='models/palace/seat.png', size=512):
    """2x2 sheet of seat pads: red (top-left), green (top-right), blue (bottom-left), yellow (bottom-right);
    gen-models maps each pad onto one quadrant (two-seat tables red + green, Ludo all four)."""
    sheet = np.zeros((size * 2, size * 2, 3)); alpha = np.zeros((size * 2, size * 2))
    for k, colour in enumerate(['red', 'green', 'blue', 'yellow']):
        rgb, a = seat_disc(size, colour, 41 + k)
        r0, c0 = (k // 2) * size, (k % 2) * size
        sheet[r0:r0 + size, c0:c0 + size] = rgb; alpha[r0:r0 + size, c0:c0 + size] = a
    save(path, sheet, alpha)

if __name__ == '__main__':
    gen_floor()
    gen_wall()
    gen_column()
    gen_marble_plain()
    gen_ceiling()
    gen_seat()
