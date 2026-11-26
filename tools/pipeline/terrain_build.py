"""Neues Höhenmodell ins Spiel übernehmen: data/terrain_ch.png (R,G = (Höhe+100)*10 als 16 Bit, B = Seemaske).
Quelle: <in>/alti_game.f32.gz aus terrain_fetch.py (swissALTIRegio). Wo keine Daten sind (Rand), bleibt das bisherige Gelände,
mit weichem Übergang (~1,5 km). In Seen (B > 0) bleiben die bisherigen Höhen (Seegrund unter der Wasserfläche).
Aufruf: python3 tools/pipeline/terrain_build.py <in> [data/terrain_ch.png]"""
import sys, os, gzip, json
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import N1, AIRPORTS, HALF, CELL, ROOT, _json_after

src = sys.argv[1]
dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'data', 'terrain_ch.png')
old = np.asarray(Image.open(dst).convert('RGB')).astype(np.int32)
H0 = ((old[..., 0] << 8) | old[..., 1]) / 10.0 - 100.0
LK = old[..., 2].astype(np.uint8)
H1 = np.frombuffer(gzip.open(os.path.join(src, 'alti_game.f32.gz')).read(), dtype='<f4').reshape(N1, N1).astype(np.float64)
ok = H1 > -1000

def blur(a, r):
    """Kastenfilter (2r+1)², zweimal – genügt für eine weiche Übergangsmaske"""
    for _ in range(2):
        c = np.cumsum(np.pad(a, ((r + 1, r), (0, 0)), mode='edge'), 0); a = (c[2 * r + 1:] - c[:-2 * r - 1]) / (2 * r + 1)
        c = np.cumsum(np.pad(a, ((0, 0), (r + 1, r)), mode='edge'), 1); a = (c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)
    return a

w = np.clip((blur(ok.astype(np.float64), 6) - 0.5) * 2, 0, 1) * ok
w[LK > 0] = 0
Hn = np.where(ok, H1, H0)
H = H0 + (Hn - H0) * w
# Ufer: im Umkreis von 4 Zellen um jeden See mindestens 0,8 m über dem Seespiegel (kein Flimmern an der Wasserlinie,
# keine trockenen Mulden, wo das Höhenmodell einen tieferen Wasserstand zeigt als die Seemaske)
LAKES = _json_after(open(os.path.join(ROOT, 'js', 'area_ch.js'), encoding='utf-8').read(), 'LAKES')
for k, L in enumerate(LAKES, 1):
    m = LK == k
    if not m.any():
        continue
    jj, ii = np.nonzero(m); j0, j1, i0, i1 = max(0, jj.min() - 6), jj.max() + 7, max(0, ii.min() - 6), ii.max() + 7
    mm = m[j0:j1, i0:i1].copy(); d = mm.copy()
    for _ in range(4):
        e = d.copy(); e[1:] |= d[:-1]; e[:-1] |= d[1:]; e[:, 1:] |= d[:, :-1]; e[:, :-1] |= d[:, 1:]; d = e
    ring = d & (LK[j0:j1, i0:i1] == 0)
    sub = H[j0:j1, i0:i1]
    sub[ring] = np.maximum(sub[ring], L['level'] + 0.8)
d = (H1 - H0)[ok & (LK == 0)]
rep = {'gueltig': float(ok.mean()), 'diff_mittel': float(d.mean()), 'diff_abs_mittel': float(np.abs(d).mean()),
       'diff_p99': float(np.percentile(np.abs(d), 99)), 'max_alt': float(H0.max()), 'max_neu': float(H.max())}
ap = {}
for A in AIRPORTS:
    i = int(round((A['x'] + HALF) / CELL)); j = int(round((A['z'] + HALF) / CELL))
    ap[A['id']] = (A['elev'], round(float(H0[j, i]), 1), round(float(H[j, i]), 1))
rep['flugplaetze_elev_alt_neu'] = ap
v = np.clip(np.round((H + 100) * 10), 0, 65535).astype(np.uint32)
img = np.stack([(v >> 8).astype(np.uint8), (v & 255).astype(np.uint8), LK], -1)
Image.fromarray(img, 'RGB').save(dst, optimize=True)
print(json.dumps(rep, indent=1, ensure_ascii=False))
