"""Wald (Version 13): Waldmischungsgrad LFI (BAFU, 10 m, Nadelholzanteil in %) auf das Feinraster CELL/4 (~30 m).
Klassen je Knoten: 0 kein Wald, 1 Laubwald (< 30 % Nadelholz), 2 Mischwald, 3 Nadelwald (> 70 %).
Speicher wie terrain_fine.py (Kacheln 256x256, nur Kacheln mit Wald), aber 4 Knoten je Byte (2 Bit), ohne Vorhersage.
Datei: 'SSFW' | u16 Version | u16 TS | u16 NT | u16 Anzahl | f32 0 | Anzahl * (u16 ti, u16 tj) | gzip(Kacheln)
Aufruf (GitHub Actions):  python3 tools/pipeline/forest_fine.py out  -> out/forest_fine.bin, out/forest_fine.json"""
import sys, os, gzip, json, struct, subprocess, urllib.request
import numpy as np
from osgeo import gdal
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import LAT0, LON0, KX, KZ, HALF, CELL, G, to_xz

F = 4; NF = G * F + 1; CF = CELL / F; TS = 256; NT = (NF + TS - 1) // TS
out = sys.argv[1] if len(sys.argv) > 1 else 'out'
os.makedirs(out, exist_ok=True)
COL = 'ch.bafu.landesforstinventar-waldmischungsgrad'
items = json.load(urllib.request.urlopen(f'https://data.geo.admin.ch/api/stac/v0.9/collections/{COL}/items'))
hrefs = [a['href'] for it in items['features'] for a in it['assets'].values() if a['href'].endswith('.tif')]
print('Assets', hrefs, flush=True)
href = sorted(hrefs, key=lambda h: ('2056' not in h, len(h)))[0]
cfg = ['--config', 'GDAL_DISABLE_READDIR_ON_OPEN', 'EMPTY_DIR', '--config', 'GDAL_HTTP_MAX_RETRY', '8', '--config', 'GDAL_HTTP_RETRY_DELAY', '3']
subprocess.run(['gdalinfo'] + cfg + ['/vsicurl/' + href], check=False)
E = HALF + CF / 2
te = [LON0 - E / KX, LAT0 - E / KZ, LON0 + E / KX, LAT0 + E / KZ]
tif = os.path.join(out, 'wald_fine.tif')
# nächstes Quellpixel (10 m) je 30-m-Knoten (unverzerrter Waldanteil); ausserhalb des Waldes NoData
cmd = ['gdalwarp', '-overwrite'] + cfg + ['-t_srs', 'EPSG:4326', '-te'] + [repr(v) for v in te] + \
      ['-ts', str(NF), str(NF), '-r', 'near', '-ot', 'Int16', '-dstnodata', '-1', '-multi', '-wo', 'NUM_THREADS=ALL_CPUS', '-wm', '2048',
       '-co', 'COMPRESS=DEFLATE', '-co', 'TILED=YES', '-co', 'BIGTIFF=YES', '/vsicurl/' + href, tif]
print(' '.join(cmd), flush=True)
subprocess.run(cmd, check=True)
V = gdal.Open(tif).GetRasterBand(1).ReadAsArray().astype(np.int16)
fo = (V >= 0) & (V <= 100)
cls = np.zeros(V.shape, np.uint8)
cls[fo & (V < 30)] = 1; cls[fo & (V >= 30) & (V <= 70)] = 2; cls[fo & (V > 70)] = 3
rep = {'href': href, 'werte_min': int(V[fo].min()) if fo.any() else None, 'werte_max': int(V[fo].max()) if fo.any() else None,
       'waldanteil_raster': float(fo.mean()), 'klassen': [int((cls == k).sum()) for k in range(4)]}
# Kontrolle Laub/Nadel: Mittelwert in Gebieten mit bekanntem Charakter
def mean_at(lat, lon, r=3000):
    x, z = to_xz(lat, lon); i = int((x + HALF) / CF); j = int((z + HALF) / CF); k = int(r / CF)
    a = V[max(0, j - k):j + k, max(0, i - k):i + k]; m = (a >= 0) & (a <= 100)
    return float(a[m].mean()) if m.any() else None
rep['kontrolle'] = {'Engadin_Lärche/Arve': mean_at(46.55, 9.88), 'Jura_Buche': mean_at(47.35, 7.3), 'Basel_Hardwald': mean_at(47.55, 7.65),
                    'Emmental': mean_at(46.95, 7.75), 'Tessin_Kastanie': mean_at(46.17, 8.85)}
print(json.dumps(rep), flush=True)
idx, blobs = [], []
for tj in range(NT):
    for ti in range(NT):
        t = np.zeros((TS, TS), np.uint8)
        a = cls[tj * TS:(tj + 1) * TS, ti * TS:(ti + 1) * TS]; t[:a.shape[0], :a.shape[1]] = a
        if not t.any():
            continue
        q = t.reshape(TS, TS // 4, 4)
        packed = (q[..., 0] | (q[..., 1] << 2) | (q[..., 2] << 4) | (q[..., 3] << 6)).astype(np.uint8)
        idx.append((ti, tj)); blobs.append(packed.tobytes())
raw = b''.join(blobs); gz = gzip.compress(raw, 9)
hdr = b'SSFW' + struct.pack('<HHHHf', 1, TS, NT, len(idx), 0.0) + b''.join(struct.pack('<HH', a, b) for a, b in idx)
open(os.path.join(out, 'forest_fine.bin'), 'wb').write(hdr + gz)
rep.update({'kacheln': len(idx), 'roh_mb': len(raw) / 1e6, 'gzip_mb': len(gz) / 1e6})
pal = np.array([[235, 230, 215], [120, 190, 80], [70, 140, 70], [20, 80, 40]], np.uint8)
Image.fromarray(pal[cls[::8, ::8]], 'RGB').save(os.path.join(out, 'forest_fine_preview.png'))
json.dump(rep, open(os.path.join(out, 'forest_fine.json'), 'w'), indent=1)
os.remove(tif)
print(json.dumps(rep, indent=1))
