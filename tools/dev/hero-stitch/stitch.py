import json, math
import numpy as np
from PIL import Image
meta = json.load(open('/tmp/arena-dev/tiles/meta.json'))
P = np.array(meta['P']); T = np.array(meta['T']); VFOV = meta['VFOV']; ASPECT = meta['ASPECT']; N = meta['N']; TILE_VFOV = meta['TILE_VFOV']
def norm(v): return v / np.linalg.norm(v)
up = np.array([0.0, 1.0, 0.0])
f = norm(T - P); r = norm(np.cross(up, f)); u = np.cross(f, r)
tanV = math.tan(math.radians(VFOV/2)); tanH = tanV*ASPECT
tanVt = math.tan(math.radians(TILE_VFOV/2)); tanHt = tanVt*ASPECT
tiles = []
for t in meta['tiles']:
    img = np.asarray(Image.open(f"/tmp/arena-dev/tiles/t{t['i']}{t['j']}.png").convert('RGB')).astype(np.float32)
    look = np.array(t['look']); ft = norm(look - P); rt = norm(np.cross(up, ft)); ut = np.cross(ft, rt)
    tiles.append((img, ft, rt, ut))
Ht, Wt = tiles[0][0].shape[:2]
# supersampled output, then downscale
SS = 1.5
W = int(3840*SS); H = int(2400*SS)
out = np.zeros((H, W, 3), dtype=np.float32)
xs = ((np.arange(W) + 0.5) / W * 2 - 1) * tanH
CHUNK = 200
fts = np.stack([t[1] for t in tiles])  # (n,3)
for y0 in range(0, H, CHUNK):
    y1 = min(H, y0 + CHUNK)
    ys = -(((np.arange(y0, y1) + 0.5) / H * 2 - 1) * tanV)
    X, Y = np.meshgrid(xs, ys)  # (h,w)
    D = f[None, None, :] + X[..., None] * r[None, None, :] + Y[..., None] * u[None, None, :]
    Dn = D / np.linalg.norm(D, axis=2, keepdims=True)
    # nearest tile centre
    dots = np.einsum('hwc,nc->hwn', Dn, fts)
    best = np.argmax(dots, axis=2)
    acc = np.zeros((y1 - y0, W, 3), dtype=np.float32)
    for k, (img, ft, rt, ut) in enumerate(tiles):
        m = best == k
        if not m.any(): continue
        Dk = D[m]
        den = Dk @ ft
        xt = (Dk @ rt) / den; yt = (Dk @ ut) / den
        px = (xt / tanHt + 1) / 2 * Wt - 0.5
        py = (1 - yt / tanVt) / 2 * Ht - 0.5
        px = np.clip(px, 0, Wt - 1.001); py = np.clip(py, 0, Ht - 1.001)
        x0 = np.floor(px).astype(int); y0i = np.floor(py).astype(int)
        fx = (px - x0)[:, None]; fy = (py - y0i)[:, None]
        c00 = img[y0i, x0]; c10 = img[y0i, x0 + 1]; c01 = img[y0i + 1, x0]; c11 = img[y0i + 1, x0 + 1]
        val = (c00 * (1 - fx) * (1 - fy) + c10 * fx * (1 - fy) + c01 * (1 - fx) * fy + c11 * fx * fy)
        acc[m] = val
    out[y0:y1] = acc
im = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
im = im.resize((3840, 2400), Image.LANCZOS)
im.save('/tmp/arena-dev/hero-3840.png')
im.save('/tmp/arena-dev/hero-3840.jpg', quality=90, optimize=True, progressive=True)
print('stitched', im.size)
