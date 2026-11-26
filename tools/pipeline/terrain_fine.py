"""Feines Höhenmodell (Version 13): swissALTIRegio im Raster CELL/4 (~30 m) als Abweichung zum 120-m-Grundraster.
Das Spiel rechnet: Höhe = Grundraster (Dreiecke wie heightAt, mit Flugplatz-Ebenen) + Abweichung (bilinear, ausserhalb
von Flugplatz-Ebenen). Seen: keine Abweichung in Zellen mit Seemaske; Ufer bleibt >= Seespiegel + 0,8 m.
Speicher: Kacheln 256x256 Knoten, nur Kacheln mit Daten. Wert c (int8) = Vorzeichen * sqrt(|d|) * K, d = c^2 / K^2.
Kacheln werden mit Gradienten-Vorhersage (c - links - oben + linksoben, mod 256) als ein gzip-Strom gespeichert.
Datei: 'SSFT' | u16 Version | u16 TS | u16 NT | u16 Anzahl | f32 K | Anzahl * (u16 ti, u16 tj) | gzip(Kacheln)
Aufruf (GitHub Actions):  python3 tools/pipeline/terrain_fine.py out   -> out/terrain_fine.bin, out/terrain_fine.json"""
import sys, os, gzip, json, struct, subprocess
import numpy as np
from osgeo import gdal
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import LAT0, LON0, KX, KZ, HALF, CELL, N1, G, ROOT, _json_after

F = 4                      # Feinknoten je Grundzelle
NF = G * F + 1             # Feinknoten je Seite
CF = CELL / F
TS = 256                   # Kachelgrösse in Knoten
NT = (NF + TS - 1) // TS
RMAX = 260.0               # grösste darstellbare Abweichung (m)
K = 127 / np.sqrt(RMAX)
URL = 'https://data.geo.admin.ch/ch.swisstopo.swissaltiregio/swissaltiregio/swissaltiregio_2056_5728.tif'
out = sys.argv[1] if len(sys.argv) > 1 else 'out'
os.makedirs(out, exist_ok=True)

# 1) swissALTIRegio auf das Feinraster (Pixelmitten = Feinknoten)
E = HALF + CF / 2
te = [LON0 - E / KX, LAT0 - E / KZ, LON0 + E / KX, LAT0 + E / KZ]
tif = os.path.join(out, 'alti_fine.tif')
cfg = ['--config', 'GDAL_DISABLE_READDIR_ON_OPEN', 'EMPTY_DIR', '--config', 'GDAL_HTTP_MULTIRANGE', 'YES',
       '--config', 'GDAL_HTTP_MAX_RETRY', '8', '--config', 'GDAL_HTTP_RETRY_DELAY', '3', '--config', 'VSI_CACHE', 'TRUE',
       '--config', 'GDAL_CACHEMAX', '2048']
if not os.path.exists(tif):
    cmd = ['gdalwarp', '-overwrite'] + cfg + ['-s_srs', 'EPSG:2056', '-t_srs', 'EPSG:4326', '-te'] + [repr(v) for v in te] + \
          ['-ts', str(NF), str(NF), '-r', 'average', '-ot', 'Float32', '-dstnodata', '-9999', '-multi', '-wo', 'NUM_THREADS=ALL_CPUS',
           '-wm', '2048', '-co', 'COMPRESS=DEFLATE', '-co', 'PREDICTOR=3', '-co', 'TILED=YES', '-co', 'BIGTIFF=YES', '/vsicurl/' + URL, tif]
    print(' '.join(cmd), flush=True)
    subprocess.run(cmd, check=True)
ds = gdal.Open(tif)  # Referenz behalten (sonst gibt GDAL den Datensatz frei)
Hf = ds.GetRasterBand(1).ReadAsArray().astype(np.float32)
ds = None
assert Hf.shape == (NF, NF), Hf.shape
ok = Hf > -1000
print('gueltig', float(ok.mean()), flush=True)

# 2) Grundraster (wie im Spiel, vor den Flugplatz-Ebenen)
old = np.asarray(Image.open(os.path.join(ROOT, 'data', 'terrain_ch.png')).convert('RGB')).astype(np.int32)
H0 = (((old[..., 0] << 8) | old[..., 1]) / 10.0 - 100.0).astype(np.float32)
LK = old[..., 2].astype(np.uint8)
LAKES = _json_after(open(os.path.join(ROOT, 'js', 'area_ch.js'), encoding='utf-8').read(), 'LAKES')
lvl = np.full(256, -1e9, np.float32)
for k, L in enumerate(LAKES, 1):
    lvl[k] = L['level']

def base_rows(j0, j1):
    """Grundraster an den Feinknoten der Zeilen j0..j1-1 (Dreiecke mit Diagonale (i+1,j)-(i,j+1), wie heightAt)"""
    fj = np.arange(j0, j1)[:, None] / F; fi = np.arange(NF)[None, :] / F
    gj = np.minimum(np.floor(fj).astype(np.int64), G - 1); gi = np.minimum(np.floor(fi).astype(np.int64), G - 1)
    fz = fj - gj; fx = fi - gi
    gj = np.broadcast_to(gj, (j1 - j0, NF)); gi = np.broadcast_to(gi, (j1 - j0, NF))
    fz = np.broadcast_to(fz, (j1 - j0, NF)); fx = np.broadcast_to(fx, (j1 - j0, NF))
    a = H0[gj, gi]; b = H0[gj + 1, gi]; c = H0[gj + 1, gi + 1]; d = H0[gj, gi + 1]
    t1 = a + (d - a) * fx + (b - a) * fz
    t2 = c + (b - c) * (1 - fx) + (d - c) * (1 - fz)
    lake = (LK[gj, gi] > 0) | (LK[gj + 1, gi] > 0) | (LK[gj, gi + 1] > 0) | (LK[gj + 1, gi + 1] > 0)
    return np.where(fx + fz <= 1, t1, t2).astype(np.float32), lake

# Ufer-Ring: Grundzellen bis 4 Zellen um jeden See (wie terrain_build) -> dort Höhe >= Seespiegel + 0,8
ring_lvl = np.full((N1, N1), -1e9, np.float32)
for k, L in enumerate(LAKES, 1):
    m = LK == k
    if not m.any():
        continue
    d = m.copy()
    for _ in range(5):
        e = d.copy(); e[1:] |= d[:-1]; e[:-1] |= d[1:]; e[:, 1:] |= d[:, :-1]; e[:, :-1] |= d[:, 1:]; d = e
    ring_lvl[d & (LK == 0)] = np.maximum(ring_lvl[d & (LK == 0)], L['level'] + 0.8)

# 3) Abweichung, weicher Rand zu fehlenden Daten (~1 km)
def blur_rows(a, r):
    c = np.cumsum(np.pad(a, ((0, 0), (r + 1, r)), mode='edge'), 1, dtype=np.float64)
    return ((c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)).astype(np.float32)
def blur(a, r):
    for _ in range(2):
        a = blur_rows(a, r); a = blur_rows(a.T.copy(), r).T.copy()
    return a
w = np.clip((blur(ok.astype(np.float32), 16) - 0.5) * 2, 0, 1) * ok
D = np.zeros((NF, NF), np.float32)
STEP = 512
for j0 in range(0, NF, STEP):
    j1 = min(NF, j0 + STEP)
    B, lake = base_rows(j0, j1)
    d = np.where(ok[j0:j1], Hf[j0:j1] - B, 0) * w[j0:j1]
    d[lake] = 0
    # Ufer: nächster Grundknoten im Ring -> Mindesthöhe
    gj = np.clip(np.round(np.arange(j0, j1) / F).astype(np.int64), 0, G)[:, None]; gi = np.clip(np.round(np.arange(NF) / F).astype(np.int64), 0, G)[None, :]
    rl = ring_lvl[gj, gi]
    d = np.where(rl > -1e8, np.maximum(d, rl - B), d)
    D[j0:j1] = d
del Hf, w
ad = np.abs(D[D != 0])
rep = {'nf': NF, 'cf': CF, 'ts': TS, 'K': float(K), 'rmax': RMAX,
       'abw_p50': float(np.percentile(ad, 50)), 'abw_p90': float(np.percentile(ad, 90)), 'abw_p99': float(np.percentile(ad, 99)),
       'abw_p9999': float(np.percentile(ad, 99.99)), 'abw_max': float(ad.max()), 'anteil_geclippt': float((ad > RMAX).mean())}
print(json.dumps(rep), flush=True)

# 4) Kodieren + Kacheln
C = np.clip(np.round(np.sign(D) * np.sqrt(np.abs(D)) * K), -127, 127).astype(np.int16)
del D
idx, blobs = [], []
for tj in range(NT):
    for ti in range(NT):
        t = np.zeros((TS, TS), np.int16)
        a = C[tj * TS:(tj + 1) * TS, ti * TS:(ti + 1) * TS]; t[:a.shape[0], :a.shape[1]] = a
        if not t.any():
            continue
        u = (t & 255).astype(np.int32)
        p = np.zeros_like(u); p[1:, 1:] = u[1:, :-1] + u[:-1, 1:] - u[:-1, :-1]; p[0, 1:] = u[0, :-1]; p[1:, 0] = u[:-1, 0]
        idx.append((ti, tj)); blobs.append(((u - p) & 255).astype(np.uint8).tobytes())
raw = b''.join(blobs)
gz = gzip.compress(raw, 9)
hdr = b'SSFT' + struct.pack('<HHHHf', 1, TS, NT, len(idx), float(K)) + b''.join(struct.pack('<HH', a, b) for a, b in idx)
open(os.path.join(out, 'terrain_fine.bin'), 'wb').write(hdr + gz)
rep.update({'kacheln': len(idx), 'roh_mb': len(raw) / 1e6, 'gzip_mb': len(gz) / 1e6})
# Vergleich: Kontrolle der Dekodierung an einer Kachel
t0 = np.frombuffer(blobs[len(blobs) // 2], np.uint8).reshape(TS, TS).astype(np.int32)
u = np.zeros_like(t0)
for j in range(TS):
    for i in range(TS):
        pr = (u[j, i - 1] if i else 0) + (u[j - 1, i] if j else 0) - (u[j - 1, i - 1] if i and j else 0)
        u[j, i] = (t0[j, i] + pr) & 255
ti, tj = idx[len(blobs) // 2]
ref = C[tj * TS:(tj + 1) * TS, ti * TS:(ti + 1) * TS] & 255
rep['kontrolle_ok'] = bool((u[:ref.shape[0], :ref.shape[1]] == ref).all())
# Vorschau (Schattierung der Abweichung) für die Sichtprüfung
pv = C[::8, ::8].astype(np.float32)
Image.fromarray(np.clip(128 + pv, 0, 255).astype(np.uint8), 'L').save(os.path.join(out, 'terrain_fine_preview.png'))
json.dump(rep, open(os.path.join(out, 'terrain_fine.json'), 'w'), indent=1)
os.remove(tif)
print(json.dumps(rep, indent=1))
