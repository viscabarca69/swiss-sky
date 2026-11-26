"""SWISSIMAGE 10 cm (swisstopo) für Flughafen-Gebiete: je 1-km-Kachel (LV95, benannt nach der Südwest-Ecke in km)
  <E>_<N>_h.webp  2048² (0,49 m/Pixel) – scharfe Kachel nahe der Kamera
  <E>_<N>_l.webp   512² (1,95 m/Pixel) – Übersicht, Wald- und Belagserkennung
GDAL liest über HTTP nur die passende Übersichtsstufe des Cloud-optimierten GeoTIFF (~0,4 m bzw. 1,6 m).
Aufruf: python3 tools/pipeline/ortho_fetch.py out [id ...]   (Gebiete: REGIONS unten, gleich wie js/ortho.js)"""
import sys, os, re, json, time, urllib.request, urllib.error, urllib.parse, subprocess, tempfile
from PIL import Image

REGIONS = {'gva': (2495, 2500, 1119, 1124), 'brn': (2603, 2606, 1194, 1198), 'lug': (2712, 2716, 1094, 1098), 'sio': (2589, 2594, 1117, 1120)}
STAC = 'https://data.geo.admin.ch/api/stac/v0.9/collections/ch.swisstopo.swissimage-dop10/items/'
out = os.path.join(sys.argv[1] if len(sys.argv) > 1 else 'out', 'ortho')
ids = sys.argv[2:] or list(REGIONS)
os.makedirs(out, exist_ok=True)
CFG = ['--config', 'GDAL_DISABLE_READDIR_ON_OPEN', 'EMPTY_DIR', '--config', 'GDAL_HTTP_MULTIRANGE', 'YES', '--config', 'GDAL_HTTP_MAX_RETRY', '5', '--config', 'GDAL_HTTP_RETRY_DELAY', '3']

def get_json(url):
    for k in range(5):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            print('  Fehler', e, flush=True); time.sleep(4 * (k + 1))
        except Exception as e:
            print('  Fehler', e, flush=True); time.sleep(4 * (k + 1))
    return None

def search(e, n):
    """neuester Jahrgang der Kachel e-n: Items heissen swissimage-dop10_<Jahr>_<e>-<n>"""
    for y in range(2026, 2016, -1):
        js = get_json(STAC + f'swissimage-dop10_{y}_{e}-{n}')
        if js and 'assets' in js:
            href = next((a['href'] for k, a in js['assets'].items() if k.endswith('_0.1_2056.tif')), None)
            if href:
                return y, href
    return None

done = {}
for rid in ids:
    e0, e1, n0, n1 = REGIONS[rid]
    for e in range(e0, e1):
        for n in range(n0, n1):
            f = search(e, n)
            if not f:
                print(rid, e, n, 'keine Kachel', flush=True); continue
            y, href = f
            for k, size, q in (('h', 2048, 74), ('l', 512, 80)):
                dst = os.path.join(out, f'{e}_{n}_{k}.webp')
                with tempfile.TemporaryDirectory() as td:
                    png = os.path.join(td, 't.png')
                    # Pixelgitter genau auf die km-Kachel legen (-projwin), dann auf size verkleinern
                    subprocess.run(['gdal_translate', '-q'] + CFG + ['-projwin', str(e * 1000), str((n + 1) * 1000), str((e + 1) * 1000), str(n * 1000),
                                    '-outsize', str(size), str(size), '-r', 'average', '-b', '1', '-b', '2', '-b', '3', '-of', 'PNG', '/vsicurl/' + href, png], check=True)
                    Image.open(png).convert('RGB').save(dst, 'WEBP', quality=q, method=6)
            done[f'{e}_{n}'] = y
            print(rid, e, n, y, os.path.getsize(os.path.join(out, f'{e}_{n}_h.webp')) // 1024, 'KB', flush=True)
json.dump(done, open(os.path.join(out, 'ortho.json'), 'w'), indent=1)
