import json, math, subprocess, base64, sys, io
P = (24.0, 1.7, -1.0); T = (24.0, 7.0, 12.0); VFOV = 55.0; ASPECT = 1.6
N = 4; TILE_VFOV = 18.0
def norm(v):
    l = math.sqrt(sum(x*x for x in v)); return tuple(x/l for x in v)
def cross(a, b): return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])
f = norm(tuple(T[i]-P[i] for i in range(3)))
r = norm(cross((0,1,0), f)); u = cross(f, r)
tanV = math.tan(math.radians(VFOV/2)); tanH = tanV*ASPECT
def call(args):
    out = subprocess.run(['tools/dev/mcp.sh', 'tools/call', json.dumps(args)], capture_output=True, text=True).stdout
    return json.loads(out)
meta = {'P': P, 'T': T, 'VFOV': VFOV, 'ASPECT': ASPECT, 'N': N, 'TILE_VFOV': TILE_VFOV, 'tiles': []}
for i in range(N):
    for j in range(N):
        X = (-1 + (2*j+1)/N) * tanH
        Y = (1 - (2*i+1)/N) * tanV
        d = norm(tuple(f[k] + X*r[k] + Y*u[k] for k in range(3)))
        look = tuple(P[k] + d[k]*10 for k in range(3))
        call({'name': 'set_camera_pose', 'arguments': {'x': P[0], 'y': P[1], 'z': P[2], 'lookAtX': look[0], 'lookAtY': look[1], 'lookAtZ': look[2], 'fov': TILE_VFOV}})
        import time; time.sleep(1.6)
        res = call({'name': 'screenshot', 'arguments': {'maxWidth': 4000, 'quality': 'png', 'worldOnly': True}})
        for c in res['result']['content']:
            if c.get('type') == 'image':
                open(f'/tmp/arena-dev/tiles/t{i}{j}.png', 'wb').write(base64.b64decode(c['data']))
        meta['tiles'].append({'i': i, 'j': j, 'look': look})
        print('tile', i, j, 'ok', flush=True)
json.dump(meta, open('/tmp/arena-dev/tiles/meta.json', 'w'))
# restore the wide view
call({'name': 'set_camera_pose', 'arguments': {'x': P[0], 'y': P[1], 'z': P[2], 'lookAtX': T[0], 'lookAtY': T[1], 'lookAtZ': T[2], 'fov': VFOV}})
print('done')
