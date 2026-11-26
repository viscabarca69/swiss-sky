"""Gebäude aus sb3d_fetch.py (npz je Flugplatz) vereinfachen und an data/buildings.txt (Format SSB2) anhängen.
SSB2 (siehe js/realcity.js): 'SSB2', u32 Kopflänge, JSON-Kopf {v,sc,ch,chunks:[{cx,cz,nb,nv,ni,o,l}],cover:[[8 Zahlen]]}, danach je 1-km-Kachel:
  nb × (u16 Ecken, u16 Dreiecke, u8 Farbton, u8 Art) · 6 Byte-Ebenen der Positions-Deltas (lo x,y,z, hi x,y,z; int16, /sc) · Index-Codes (lo, hi;
  0 = nächste neue Ecke, sonst Abstand zur Hochwassermarke). Positionen: x,z relativ zur Kachelmitte, y relativ zum tiefsten Punkt des Gebäudes.
Datei: Base64 einer gzip-Datei (der Artefakt-Server liefert kein .gz aus).
Aufruf: python3 tools/pipeline/sb3d_build.py <in> [--err 1.0] [--rebuild-from <alte buildings.txt>]"""
import sys, os, glob, json, gzip, base64, struct, argparse
import numpy as np
import meshoptimizer as mo
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('--err', type=float, default=1.0); ap.add_argument('--mina', type=float, default=25)
ap.add_argument('--base', default=os.path.join(ROOT, 'data', 'buildings.txt')); ap.add_argument('--out', default=os.path.join(ROOT, 'data', 'buildings.txt'))
ap.add_argument('--only', default='')
a = ap.parse_args()

raw = gzip.decompress(base64.b64decode(open(a.base).read().strip()))
assert raw[:4] == b'SSB2'
hl = struct.unpack('<I', raw[4:8])[0]
H = json.loads(raw[8:8 + hl]); data = bytearray(raw[8 + hl:])
SC = H['sc']; CH = H['ch']
# schon vorhandene Flugplatz-Quadrate (Markierung 'ap') ersetzen, damit ein neuer Lauf nichts doppelt
keep = [c for c in H['chunks'] if not c.get('ap')]
if len(keep) != len(H['chunks']):
    nd = bytearray(); 
    for c in keep:
        o = c['o']; nd += data[o:o + c['l']]; c['o'] = len(nd) - c['l']
    data = nd; H['chunks'] = keep
    H['cover'] = [q for q in H['cover'] if not (len(q) > 8)]
covers = [np.array(q[:8]).reshape(4, 2) for q in H['cover']]

def in_cover(x, z):
    for q in covers:
        if x < q[:, 0].min() or x > q[:, 0].max() or z < q[:, 1].min() or z > q[:, 1].max():
            continue
        s = 0; ok = True
        for i in range(4):
            p, r = q[i], q[(i + 1) & 3]; c = (r[0] - p[0]) * (z - p[1]) - (r[1] - p[1]) * (x - p[0])
            if c == 0: continue
            sg = 1 if c > 0 else -1
            if not s: s = sg
            elif sg != s: ok = False; break
        if ok: return True
    return False

SKIP = {'Unterirdisches Gebaeude', 'Gebaeude unsichtbar', 'Mauer gross', 'Mauer gross gedeckt'}
TY = {'Hochhaus': 1, 'Sakrales Gebaeude': 2, 'Kapelle': 2, 'Sakraler Turm': 2, 'Treibhaus': 4, 'Lagertank': 5, 'Hochkamin': 5, 'Turm': 5,
      'Flugdach': 3, 'Offenes Gebaeude': 3, 'Bruecke gedeckt': 3, 'Verbindungsbruecke': 3, 'Verbindungsbrücke': 3}

def hw_order(tri):
    """Ecken nach erster Verwendung ordnen (für die Hochwasser-Codes)"""
    order, remap = [], {}
    for v in tri.reshape(-1):
        if v not in remap:
            remap[v] = len(order); order.append(v)
    return np.array(order), np.vectorize(remap.get)(tri)

stats = {}
chunks = {}
files = sorted(glob.glob(os.path.join(a.src, 'sb3d_*.npz')))
if a.only:
    files = [f for f in files if os.path.basename(f)[5:-4] in a.only.split(',')]
new_cover = []
for fn in files:
    apid = os.path.basename(fn)[5:-4]
    Z = np.load(fn)
    V, T, bv, bt, art, arten, box = Z['V'].astype(np.float64), Z['T'], Z['bv'], Z['bt'], Z['art'], list(Z['arten']), Z['box']
    nb0 = n_in = tri_in = tri_out = 0
    for i in range(len(art)):
        name = str(arten[art[i]])
        if name in SKIP: continue
        v = V[bv[i]:bv[i + 1]].copy(); t = (T[bt[i]:bt[i + 1]].astype(np.int64) - bv[i])
        cx, cz = v[:, 0].mean(), v[:, 2].mean()
        if in_cover(cx, cz): continue
        y0 = v[:, 1].min(); v[:, 1] -= y0
        x0, x1, z0, z1 = v[:, 0].min(), v[:, 0].max(), v[:, 2].min(), v[:, 2].max()
        if (x1 - x0) * (z1 - z0) < a.mina or v[:, 1].max() < 1.5: continue
        # Boden weg (liegt unter dem Gelände)
        p = v[t]; nrm = np.cross(p[:, 1] - p[:, 0], p[:, 2] - p[:, 0]); ln = np.linalg.norm(nrm, axis=1) + 1e-12
        flo = (np.abs(nrm[:, 1]) / ln > 0.9) & (p[:, :, 1].max(1) < 0.35)
        t = t[~flo & (ln > 1e-6)]
        if len(t) == 0: continue
        n_in += 1; tri_in += len(t)
        idx = t.reshape(-1).astype(np.uint32); pos = v.astype(np.float32)
        dest = np.zeros(len(idx), dtype=np.uint32)
        k = mo.simplify(dest, idx, pos, target_index_count=0, target_error=a.err, options=mo.SIMPLIFY_ERROR_ABSOLUTE)
        if k >= 12: idx = dest[:k]
        tri = idx.reshape(-1, 3)
        order, tl = hw_order(tri)
        vv = pos[order]
        ty = TY.get(name, 0)
        hgt = float(v[:, 1].max()); area = (x1 - x0) * (z1 - z0)
        if ty == 0 and area > 1200 and hgt < 16: ty = 3  # Halle / Gewerbe
        tint = int(abs(hash((round(cx), round(cz)))) % 256)
        kx, kz = int(np.floor(cx / CH)), int(np.floor(cz / CH))
        C = chunks.setdefault((kx, kz, apid), {'b': []})
        C['b'].append((vv, tl, tint, ty))
        tri_out += len(tri); nb0 += 1
    x0, z0, x1, z1 = [float(q) for q in box]
    new_cover.append([x0, z0, x1, z0, x1, z1, x0, z1, 1])  # 9. Wert markiert Flugplatz-Quadrat
    stats[apid] = {'gebaeude': nb0, 'dreiecke_vorher': tri_in, 'dreiecke': tri_out}
    print(apid, stats[apid], flush=True)

for (kx, kz, apid), C in sorted(chunks.items()):
    cxm, czm = kx * CH + CH / 2, kz * CH + CH / 2
    heads, P, I = bytearray(), [], []
    for vv, tl, tint, ty in C['b']:
        q = np.round((vv - np.array([cxm, 0, czm])) * SC).astype(np.int64)
        assert np.abs(q).max() < 32767
        P.append(q); I.append(tl.reshape(-1))
        heads += struct.pack('<HHBB', len(vv), len(tl), tint, ty)
    Q = np.concatenate(P)
    d = np.diff(np.vstack([np.zeros((1, 3), np.int64), Q]), axis=0)
    d = (d & 0xFFFF).astype(np.uint16)  # Zweierkomplement wie im Decoder (<<16>>16)
    planes = b''.join(bytes((d[:, c] & 255).astype(np.uint8)) for c in range(3)) + b''.join(bytes((d[:, c] >> 8).astype(np.uint8)) for c in range(3))
    codes = []
    for tl in I:
        hw = 0
        for l in tl:
            if l == hw: codes.append(0); hw += 1
            else: codes.append(hw - l)
    codes = np.array(codes, dtype=np.int64); assert codes.min() >= 0 and codes.max() < 65536
    cb = bytes((codes & 255).astype(np.uint8)) + bytes((codes >> 8).astype(np.uint8))
    blob = bytes(heads) + planes + cb
    H['chunks'].append({'cx': cxm, 'cz': czm, 'nb': len(C['b']), 'nv': len(Q), 'ni': len(codes), 'o': len(data), 'l': len(blob), 'ap': apid})
    data += blob
H['cover'] += new_cover
hj = json.dumps(H, separators=(',', ':')).encode()
out = b'SSB2' + struct.pack('<I', len(hj)) + hj + bytes(data)
gz = gzip.compress(out, 9)
open(a.out, 'w').write(base64.b64encode(gz).decode())
tot = {k: sum(s[k] for s in stats.values()) for k in ('gebaeude', 'dreiecke_vorher', 'dreiecke')}
print('neu:', tot, 'Datei', len(gz) * 4 // 3, 'Bytes, Kacheln', len(H['chunks']))
