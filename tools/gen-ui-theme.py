#!/usr/bin/env python3
"""Royal UI chrome (numpy + PIL): parchment panels with an ornate gold border, matching pill and
button sprites. Written straight to images/ui/ as single files (deliberately outside the sprite
atlas: the panel, the pill and the button are the structure of every popup, so they stay the
plainest possible textures).

  images/ui/panel-royal.png   512x512  aged parchment, double gold border, corner rosettes, r 28
  images/ui/pill-royal.png    512x128  same language, fully rounded ends (hint / toast)
  images/ui/button-royal.png  256x64   white fill to tint at runtime, gold border, soft gloss

Run: python3 tools/gen-ui-theme.py
"""
import numpy as np
from PIL import Image

rng = np.random.default_rng(5)

def fractal_noise(w, h, beta=2.2, seed=None):
    r = np.random.default_rng(seed) if seed is not None else rng
    white = r.standard_normal((h, w))
    fy = np.fft.fftfreq(h)[:, None]; fx = np.fft.rfftfreq(w)[None, :]
    f = np.sqrt(fx * fx + fy * fy); f[0, 0] = 1.0
    spec = np.fft.rfft2(white) / (f ** (beta / 2)); spec[0, 0] = 0
    n = np.fft.irfft2(spec, s=(h, w))
    return (n - n.min()) / (n.max() - n.min() + 1e-9)

def rounded_rect_sdf(w, h, r, inset=0.0):
    """Signed distance (px) to a rounded rectangle inset from the image edge; negative inside."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64) + 0.5
    hw, hh = w / 2 - inset, h / 2 - inset
    px = np.abs(xx - w / 2) - (hw - r); pz = np.abs(yy - h / 2) - (hh - r)
    outside = np.hypot(np.maximum(px, 0), np.maximum(pz, 0))
    inside = np.minimum(np.maximum(px, pz), 0)
    return outside + inside - r

def coverage(sdf):
    return np.clip(0.5 - sdf, 0, 1)

PARCH = np.array([0.91, 0.85, 0.70]); PARCH_DARK = np.array([0.80, 0.71, 0.53]); FIBRE = np.array([0.62, 0.52, 0.36])
GOLD = np.array([0.82, 0.64, 0.27]); GOLD_DARK = np.array([0.55, 0.40, 0.14]); GOLD_LIGHT = np.array([0.98, 0.88, 0.55])

def parchment(w, h, seed):
    mottle = fractal_noise(w, h, 2.8, seed)
    fibres = fractal_noise(w, h, 1.6, seed + 1)
    col = PARCH[None, None, :] * (1 - 0.35 * mottle[..., None]) + PARCH_DARK[None, None, :] * 0.35 * mottle[..., None]
    f = np.clip((fibres - 0.72) / 0.28, 0, 1)[..., None]
    col = col * (1 - 0.25 * f) + FIBRE[None, None, :] * 0.25 * f
    return col

def gold_line(img, sdf, at, width, shade_seed=None):
    """Paint a gold band where |sdf - at| < width / 2, with a rounded highlight."""
    d = np.abs(sdf - at)
    a = np.clip(width / 2 + 0.5 - d, 0, 1)
    t = np.clip(d / (width / 2), 0, 1)
    shade = GOLD_LIGHT[None, None, :] * (1 - t[..., None]) ** 2 * 0.6 + GOLD[None, None, :] * (1 - 0.4 * t[..., None]) + GOLD_DARK[None, None, :] * 0.4 * t[..., None]
    shade = np.clip(shade, 0, 1)
    img[:] = img * (1 - a[..., None]) + shade * a[..., None]

def rosette(img, cx, cy, r):
    yy, xx = np.mgrid[0:img.shape[0], 0:img.shape[1]].astype(np.float64) + 0.5
    d = np.hypot(xx - cx, yy - cy); ang = np.arctan2(yy - cy, xx - cx)
    petals = r * (0.62 + 0.38 * np.abs(np.cos(4 * ang)))
    a = np.clip(petals + 0.5 - d, 0, 1)
    core = np.clip(r * 0.28 + 0.5 - d, 0, 1)
    img[:] = img * (1 - a[..., None]) + GOLD[None, None, :] * a[..., None]
    img[:] = img * (1 - core[..., None]) + GOLD_DARK[None, None, :] * core[..., None]

def save(path, rgb, alpha):
    im = np.dstack([np.clip(rgb, 0, 1), np.clip(alpha, 0, 1)])
    Image.fromarray((im * 255 + 0.5).astype(np.uint8), 'RGBA').save(path, optimize=True)
    print('wrote', path)

def gen_panel(path='images/ui/panel-royal.png', w=512, h=512, r=28, rosettes=True):
    sdf = rounded_rect_sdf(w, h, r)
    img = parchment(w, h, 11)
    # darker vignette towards the edge (aged paper)
    edge = np.clip((-sdf) / 40.0, 0, 1)
    img = img * (0.86 + 0.14 * edge[..., None])
    gold_line(img, sdf, -5.0, 6.0)      # outer gold band
    gold_line(img, sdf, -14.0, 2.0)     # thin inner line
    if rosettes:
        for cx, cy in ((22, 22), (w - 22, 22), (22, h - 22), (w - 22, h - 22)):
            rosette(img, cx, cy, 11)
    alpha = coverage(sdf) * 0.96
    save(path, img, alpha)

def gen_pill(path='images/ui/pill-royal.png', w=512, h=128):
    sdf = rounded_rect_sdf(w, h, h / 2 - 1)
    img = parchment(w, h, 13)
    edge = np.clip((-sdf) / 24.0, 0, 1)
    img = img * (0.88 + 0.12 * edge[..., None])
    gold_line(img, sdf, -4.0, 5.0)
    gold_line(img, sdf, -11.0, 1.6)
    save(path, img, coverage(sdf) * 0.96)

def gen_button(path='images/ui/button-royal.png', w=256, h=64, r=14):
    sdf = rounded_rect_sdf(w, h, r)
    yy = np.mgrid[0:h, 0:w][0].astype(np.float64) / h
    # white fill with a soft top gloss (tinted at runtime), gold border with a darker inner shadow line
    img = np.ones((h, w, 3)) * (0.90 + 0.10 * (1 - yy))[..., None]
    inner = np.clip(-(sdf + 5.5) / 2.0, 0, 1)
    img = img * (0.92 + 0.08 * inner[..., None])
    gold_line(img, sdf, -3.0, 4.0)
    save(path, img, coverage(sdf))

if __name__ == '__main__':
    gen_panel()
    gen_pill()
    gen_button()
