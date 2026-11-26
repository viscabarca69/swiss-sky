"""swissALTIRegio (swisstopo) auf das Spielgitter rechnen: 3073 x 3073 Knoten, 120 m, Zeile 0 = Norden.
Das Spielgitter ist linear in Breite/Länge (x = (lon-lon0)*kx, z = -(lat-lat0)*kz), darum genügt ein Warp nach EPSG:4326
mit Pixelmitten auf den Gitterknoten. GDAL liest über HTTP nur die passende Übersichtsstufe des Cloud-optimierten GeoTIFF.
Ausgabe: <out>/alti_game.f32.gz (Float32 little endian, N1*N1, -9999 = keine Daten) und alti_game.json (Kennzahlen).
Aufruf (GitHub Actions, GDAL >= 3.6):  python3 tools/pipeline/terrain_fetch.py out"""
import sys, os, gzip, json, subprocess
import numpy as np
from osgeo import gdal
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import LAT0, LON0, KX, KZ, HALF, CELL, N1

URL = 'https://data.geo.admin.ch/ch.swisstopo.swissaltiregio/swissaltiregio/swissaltiregio_2056_5728.tif'
out = sys.argv[1] if len(sys.argv) > 1 else 'out'
os.makedirs(out, exist_ok=True)
E = HALF + CELL / 2
te = [LON0 - E / KX, LAT0 - E / KZ, LON0 + E / KX, LAT0 + E / KZ]
tif = os.path.join(out, 'alti_game.tif')
cfg = ['--config', 'GDAL_DISABLE_READDIR_ON_OPEN', 'EMPTY_DIR', '--config', 'GDAL_HTTP_MULTIRANGE', 'YES',
       '--config', 'GDAL_HTTP_MAX_RETRY', '5', '--config', 'GDAL_HTTP_RETRY_DELAY', '3', '--config', 'VSI_CACHE', 'TRUE']
subprocess.run(['gdalinfo'] + cfg + ['/vsicurl/' + URL], check=True)
cmd = ['gdalwarp', '-overwrite'] + cfg + ['-s_srs', 'EPSG:2056', '-t_srs', 'EPSG:4326', '-te'] + [repr(v) for v in te] + \
      ['-ts', str(N1), str(N1), '-r', 'average', '-ot', 'Float32', '-dstnodata', '-9999', '-multi', '-wo', 'NUM_THREADS=ALL_CPUS',
       '-co', 'COMPRESS=DEFLATE', '-co', 'PREDICTOR=3', '/vsicurl/' + URL, tif]
print(' '.join(cmd), flush=True)
subprocess.run(cmd, check=True)
ds = gdal.Open(tif)
H = ds.GetRasterBand(1).ReadAsArray().astype('<f4')
assert H.shape == (N1, N1), H.shape
ok = H > -1000
with gzip.open(os.path.join(out, 'alti_game.f32.gz'), 'wb', compresslevel=9) as f:
    f.write(H.tobytes())
info = {'source': URL, 'n1': N1, 'cell': CELL, 'te': te, 'valid': float(ok.mean()),
        'min': float(H[ok].min()), 'max': float(H[ok].max()), 'geotransform': ds.GetGeoTransform()}
json.dump(info, open(os.path.join(out, 'alti_game.json'), 'w'), indent=1)
os.remove(tif)
print(json.dumps(info))
