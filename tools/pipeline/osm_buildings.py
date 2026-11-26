"""Gebäude-Grundrisse aus OpenStreetMap (Overpass) für die Luftbild-Gebiete – schützt beim Entfernen der Flugzeuge
auch Bauten, die in swissBUILDINGS3D noch fehlen (z. B. Genf «Aile Est», eröffnet 2021).
Ausgabe: <out>/osm_buildings.json  {gebiet: [[[lat, lon], ...], ...]}   Daten © OpenStreetMap-Mitwirkende (ODbL)
Aufruf: python3 tools/pipeline/osm_buildings.py out"""
import sys, os, json, time, urllib.request, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ortho_fetch import REGIONS

def lv2wgs(E, N):
    y = (E - 2600000) / 1e6; x = (N - 1200000) / 1e6
    lam = (2.6779094 + 4.728982 * y + 0.791484 * y * x + 0.1306 * y * x * x - 0.0436 * y ** 3) * 100 / 36
    phi = (16.9023892 + 3.238272 * x - 0.270978 * y * y - 0.002528 * x * x - 0.0447 * y * y * x - 0.0140 * x ** 3) * 100 / 36
    return phi, lam

out = sys.argv[1] if len(sys.argv) > 1 else 'out'
os.makedirs(out, exist_ok=True)
res = {}
for rid, (e0, e1, n0, n1) in REGIONS.items():
    s, w = lv2wgs(e0 * 1000 - 200, n0 * 1000 - 200); n_, e_ = lv2wgs(e1 * 1000 + 200, n1 * 1000 + 200)
    q = f'[out:json][timeout:180];(way["building"]({s},{w},{n_},{e_});way["aeroway"~"terminal|hangar|jet_bridge"]({s},{w},{n_},{e_});' \
        f'way["man_made"="bridge"]({s},{w},{n_},{e_}););out geom;'
    for k in range(4):
        try:
            req = urllib.request.Request('https://overpass-api.de/api/interpreter', data=urllib.parse.urlencode({'data': q}).encode(),
                                         headers={'User-Agent': 'swiss-sky-pipeline (github.com/viscabarca69/swiss-sky)'})
            with urllib.request.urlopen(req, timeout=240) as r:
                js = json.loads(r.read()); break
        except Exception as ex:
            print(rid, 'Fehler', ex, flush=True); time.sleep(20 * (k + 1)); js = None
    if not js: continue
    polys = []
    for el in js.get('elements', []):
        g = el.get('geometry')
        if g and len(g) >= 3:
            polys.append([[round(p['lat'], 7), round(p['lon'], 7)] for p in g])
    res[rid] = polys
    print(rid, 'Gebäude', len(polys), flush=True)
    time.sleep(5)
json.dump(res, open(os.path.join(out, 'osm_buildings.json'), 'w'))
