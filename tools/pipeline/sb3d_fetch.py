"""swissBUILDINGS3D 3.0 (swisstopo) für ausgewählte Flugplätze holen und in Spielkoordinaten ablegen.
Pro Flugplatz ein achsparalleles Quadrat (Spielkoordinaten) um die Pistenmitte. Kacheln über die STAC-API, je Kachel der neueste Stand.
Ausgabe: <out>/sb3d_<ID>.npz mit
  V   float32 (n,3)  x, y (Meereshöhe LN02), z in Spielkoordinaten
  T   uint32  (m,3)  Dreiecke (Index in V)
  bv  int64   (b+1)  Start der Ecken je Gebäude, bt (b+1) Start der Dreiecke je Gebäude
  art uint8   (b)    Index in arten (OBJEKTART)
  box float64 (4)    x0 z0 x1 z1 des Quadrats
Aufruf: python3 tools/pipeline/sb3d_fetch.py out [ID ...]"""
import sys, os, json, re, zipfile, urllib.request, urllib.parse, time, shutil
import numpy as np
from osgeo import ogr, osr, gdal
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import AIRPORTS, to_latlon, KX, KZ, LAT0, LON0
gdal.UseExceptions()

STAC = 'https://data.geo.admin.ch/api/stac/v0.9/collections/ch.swisstopo.swissbuildings3d_3_0/items'
# Regionalflugplätze ohne echte Gebäude (Halbseite des Quadrats in m)
TARGETS = {'EMM': 2000, 'BUO': 1700, 'ALP': 1700, 'BIR': 1400, 'HAU': 1300, 'BRN': 1800, 'INT': 1500, 'MEI': 1700,
           'REI': 1200, 'RAR': 1300, 'SIO': 2200, 'GRE': 1700, 'ACH': 1700, 'SMV': 1700, 'PAY': 2000}
out = sys.argv[1] if len(sys.argv) > 1 else 'out'
ids = sys.argv[2:] or list(TARGETS)
os.makedirs(out, exist_ok=True)
cache = os.path.join(out, '..', 'sb3d_cache')
os.makedirs(cache, exist_ok=True)

def get(url, path=None, tries=5):
    for k in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=300) as r:
                if path is None:
                    return r.read()
                with open(path + '.part', 'wb') as f:
                    shutil.copyfileobj(r, f, 1 << 20)
                os.replace(path + '.part', path)
                return path
        except Exception as e:
            print('  Fehler', e, 'neuer Versuch', k + 1, flush=True)
            time.sleep(5 * (k + 1))
    raise RuntimeError('Download fehlgeschlagen: ' + url)

def tiles_for(lon0, lat0, lon1, lat1):
    q = urllib.parse.urlencode({'bbox': f'{lon0},{lat0},{lon1},{lat1}', 'limit': 100})
    url, best = STAC + '?' + q, {}
    while url:
        js = json.loads(get(url))
        for ft in js['features']:
            m = re.match(r'swissbuildings3d_3_0_(\d{4})_(\d{4}-\d{2})$', ft['id'])
            if not m:
                continue  # landesweite Gesamtdatei überspringen
            year, tile = int(m.group(1)), m.group(2)
            gdb = [a['href'] for k, a in ft['assets'].items() if k.endswith('.gdb.zip')]
            if gdb and (tile not in best or year > best[tile][0]):
                best[tile] = (year, gdb[0])
        url = next((l['href'] for l in js.get('links', []) if l.get('rel') == 'next'), None)
    return best

wgs = osr.SpatialReference(); wgs.ImportFromEPSG(4326); wgs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
lv95 = osr.SpatialReference(); lv95.ImportFromEPSG(2056); lv95.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
to_wgs = osr.CoordinateTransformation(lv95, wgs)
to_lv = osr.CoordinateTransformation(wgs, lv95)

def rings(g, acc):
    """alle Flächen einer (Multi-)Fläche/TIN/Polyederfläche: äusserer Ring als Punktliste (Löcher kommen bei Gebäudehüllen kaum vor)"""
    t = ogr.GT_Flatten(g.GetGeometryType())
    if t in (ogr.wkbPolygon, ogr.wkbTriangle):
        r = g.GetGeometryRef(0)
        if r is not None and r.GetPointCount() >= 4:
            acc.append(r.GetPoints())
        return
    for i in range(g.GetGeometryCount()):
        rings(g.GetGeometryRef(i), acc)

def ear_clip(P):
    """Dreiecke eines ebenen Rings (Ecken als 3D-Punkte, ohne Schlusspunkt): Ohrenschneiden in der Projektionsebene"""
    n = len(P)
    if n == 3:
        return [(0, 1, 2)]
    nrm = np.zeros(3)
    for i in range(n):
        a, b = P[i], P[(i + 1) % n]
        nrm += ((a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1]))
    ax = int(np.argmax(np.abs(nrm)))
    u, v = [(1, 2), (2, 0), (0, 1)][ax]
    Q = [(p[u], p[v]) for p in P]
    if nrm[ax] < 0:
        order = list(range(n))[::-1]
    else:
        order = list(range(n))
    cross = lambda o, a, b: (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    out, guard = [], 0
    while len(order) > 3 and guard < 4 * n:
        guard += 1
        m = len(order)
        for k in range(m):
            i0, i1, i2 = order[k - 1], order[k], order[(k + 1) % m]
            a, b, c = Q[i0], Q[i1], Q[i2]
            if cross(a, b, c) <= 1e-9:
                continue
            if any(j not in (i0, i1, i2) and cross(a, b, Q[j]) >= 0 and cross(b, c, Q[j]) >= 0 and cross(c, a, Q[j]) >= 0 for j in order):
                continue
            out.append((i0, i1, i2)); order.pop(k); break
        else:
            break
    if len(order) >= 3:
        out += [(order[0], order[k], order[k + 1]) for k in range(1, len(order) - 1)]
    return out

summary = {}
for ap in ids:
    A = next(a for a in AIRPORTS if a['id'] == ap)
    R = TARGETS.get(ap, 1500)
    box = (A['x'] - R, A['z'] - R, A['x'] + R, A['z'] + R)
    la0, lo0 = to_latlon(box[0], box[3]); la1, lo1 = to_latlon(box[2], box[1])
    tiles = tiles_for(lo0, la0, lo1, la1)
    print(ap, A['name'], 'Kacheln', sorted(tiles.items()), flush=True)
    # Suchrechteck in LV95
    pts = [to_lv.TransformPoint(lo, la) for lo, la in ((lo0, la0), (lo1, la0), (lo0, la1), (lo1, la1))]
    ex = (min(p[0] for p in pts) - 50, min(p[1] for p in pts) - 50, max(p[0] for p in pts) + 50, max(p[1] for p in pts) + 50)
    V, T, bv, bt, art, arten, seen = [], [], [0], [0], [], [], set()
    nv = nt = 0
    for tile, (year, href) in sorted(tiles.items()):
        zp = os.path.join(cache, os.path.basename(href))
        if not os.path.exists(zp):
            print('  lade', href, flush=True); get(href, zp)
        dd = zp[:-4]
        if not os.path.isdir(dd):
            with zipfile.ZipFile(zp) as z:
                z.extractall(dd)
        gdbp = next(os.path.join(r, d) for r, ds, fs in os.walk(dd) for d in ds if d.endswith('.gdb'))
        ds = ogr.Open(gdbp)
        names = [ds.GetLayer(i).GetName() for i in range(ds.GetLayerCount())]
        lname = next((n for n in names if n.lower() == 'building_solid'), None)
        if lname is None:
            print('  Ebenen:', names); continue
        L = ds.GetLayer(lname)
        L.SetSpatialFilterRect(*ex)
        defn = L.GetLayerDefn(); fields = [defn.GetFieldDefn(i).GetName() for i in range(defn.GetFieldCount())]
        if not summary.get('_fields'):
            summary['_fields'] = fields; print('  Felder:', fields, flush=True)
        for f in L:
            uid = f.GetField('UUID') if 'UUID' in fields else None
            if uid and uid in seen:
                continue
            g = f.GetGeometryRef()
            if g is None:
                continue
            acc = []
            rings(g, acc)
            if not acc:
                continue
            P = np.array([p for r in acc for p in r], dtype=np.float64)
            if P.shape[1] < 3:
                continue
            ll = np.array(to_wgs.TransformPoints(P[:, :2].tolist()))
            x = (ll[:, 0] - LON0) * KX; z = -(ll[:, 1] - LAT0) * KZ
            cx, cz = x.mean(), z.mean()
            if not (box[0] <= cx <= box[2] and box[1] <= cz <= box[3]):
                continue
            if uid:
                seen.add(uid)
            Q = np.stack([x, P[:, 2], z], 1)
            key = np.round(Q * 50).astype(np.int64)
            uniq, inv = np.unique(key, axis=0, return_inverse=True)
            inv = inv.reshape(-1)
            verts = np.zeros((len(uniq), 3)); np.add.at(verts, inv, Q); verts /= np.bincount(inv)[:, None]
            tris, o = [], 0
            for r in acc:
                n = len(r) - 1  # geschlossener Ring
                idx = inv[o:o + n]; Pr = Q[o:o + n]; o += len(r)
                for i0, i1, i2 in (ear_clip(Pr) if n > 3 else [(0, 1, 2)]):
                    a, b, c = idx[i0], idx[i1], idx[i2]
                    if a != b and b != c and a != c:
                        tris.append((a, b, c))
            if not tris:
                continue
            V.append(verts.astype(np.float32)); T.append(np.array(tris, dtype=np.uint32) + nv)
            nv += len(verts); nt += len(tris); bv.append(nv); bt.append(nt)
            oa = f.GetField('OBJEKTART') if 'OBJEKTART' in fields else ''
            oa = str(oa)
            if oa not in arten:
                arten.append(oa)
            art.append(arten.index(oa))
        ds = None
    if not V:
        print('  keine Gebäude'); continue
    np.savez_compressed(os.path.join(out, f'sb3d_{ap}.npz'), V=np.concatenate(V), T=np.concatenate(T), bv=np.array(bv),
                        bt=np.array(bt), art=np.array(art, dtype=np.uint8), box=np.array(box), arten=np.array(arten))
    summary[ap] = {'name': A['name'], 'gebaeude': len(art), 'ecken': nv, 'dreiecke': nt, 'kacheln': {k: v[0] for k, v in tiles.items()}, 'arten': arten}
    print(' ', ap, summary[ap], flush=True)
json.dump(summary, open(os.path.join(out, 'sb3d.json'), 'w'), indent=1, ensure_ascii=False)
