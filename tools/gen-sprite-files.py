#!/usr/bin/env python3
"""Split images/ui/atlas.png back into one PNG per sprite (images/ui/sprites/<name>.png).

The mobile client ignores custom uvs on UiBackground (docs: build-for-mobile missing
features; seen live 21 Aug 2026: every atlas sprite invisible on the phone), so phones
read these individual files while desktop keeps the one-texture atlas. The original
per-sprite sources were trimmed after packing; the atlas + atlas.gen.ts rects are the
source of truth now. Atomic writes, same convention as the other generators.
"""
import os, re, tempfile
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ATLAS = os.path.join(ROOT, 'images/ui/atlas.png')
GEN = os.path.join(ROOT, 'src/lounge/atlas.gen.ts')
OUT = os.path.join(ROOT, 'images/ui/sprites')

os.makedirs(OUT, exist_ok=True)
img = Image.open(ATLAS).convert('RGBA')
rects = re.findall(r"'([\w-]+)': \[(\d+), (\d+), (\d+), (\d+)\]", open(GEN).read())
assert rects, 'no sprite rects found in atlas.gen.ts'
for name, x, y, w, h in rects:
    x, y, w, h = int(x), int(y), int(w), int(h)
    crop = img.crop((x, y, x + w, y + h))
    fd, tmp = tempfile.mkstemp(dir=OUT, suffix='.png')
    os.close(fd)
    crop.save(tmp, 'PNG')
    os.replace(tmp, os.path.join(OUT, f'{name}.png'))
print(f'wrote {len(rects)} sprites to images/ui/sprites/')
