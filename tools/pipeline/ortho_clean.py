"""Flugzeuge (und ihre Schatten) aus den Flughafen-Luftbildern entfernen – nur auf befestigten Flächen aus OpenStreetMap
(Vorfelder, Rollwege, Pisten), damit Gebäude, Autos und Felder unberührt bleiben.
Erkennung: Abweichung vom örtlichen Belag (Median ~30 m), dünne Linien (Markierungen) per Öffnung weg, nur Flecken ab ~15 m².
Füllung: Belagfarbe aus einer Inpainting-Rechnung in 1/4 Auflösung + feines Rauschen, weicher Rand.
Aufruf: python3 tools/pipeline/ortho_clean.py <quelle mit *_h.webp> <ziel data/ortho> [--osm osm_buildings.json] [gebiet ...]"""
import sys, os, math, json
import numpy as np, cv2
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT, AIRPORTS, to_latlon, _json_after, LAT0, LON0, KX, KZ
from ortho_fetch import REGIONS
ICAO = {'gva': 'LSGG', 'brn': 'LSZB', 'lug': 'LSZA', 'sio': 'LSGS'}
args = sys.argv[1:]
OSMB = {}
if '--osm' in args:
    i = args.index('--osm'); OSMB = json.load(open(args[i + 1])); del args[i:i + 2]
src, dst = args[0], args[1]
ids = args[2:] or list(ICAO)
TW = _json_after(open(os.path.join(ROOT, 'js', 'taxiways.js'), encoding='utf-8').read(), 'TAXIWAYS')

def wgs2lv(lat, lon):
    phi = (lat * 3600 - 169028.66) / 10000; lam = (lon * 3600 - 26782.5) / 10000
    E = 2600072.37 + 211455.93 * lam - 10938.51 * lam * phi - 0.36 * lam * phi * phi - 44.54 * lam ** 3
    N = 1200147.07 + 308807.95 * phi + 3745.25 * lam * lam + 76.63 * phi * phi - 194.56 * lam * lam * phi + 119.79 * phi ** 3
    return E, N
lv = lambda x, z: wgs2lv(*to_latlon(x, z))

def paved_shapes(ic):
    T = TW[ic]; n = T['n']; X = [n[2 * i] / 10 for i in range(len(n) // 2)]; Z = [n[2 * i + 1] / 10 for i in range(len(n) // 2)]
    polys = [[lv(p[i] / 10, p[i + 1] / 10) for i in range(0, len(p), 2)] for p in T['a']]
    # Pisten bleiben unberührt (Gummiabrieb und Markierungen würden sonst «repariert»): Rollweg-Kanten auf einer Piste weglassen
    RW = [A for A in AIRPORTS if A['icao'] == ic]
    def on_rwy(x, z):
        for A in RW:
            dx, dz = x - A['x'], z - A['z']; al = dx * math.sin(A['a']) - dz * math.cos(A['a']); ac = dx * math.cos(A['a']) + dz * math.sin(A['a'])
            if abs(ac) < A['w'] / 2 + 3 and abs(al) < A['len'] / 2 + 30: return True
        return False
    lines = []
    e = T['e']
    for i in range(0, len(e), 5):
        a, b, w = e[i], e[i + 1], e[i + 3]
        if on_rwy((X[a] + X[b]) / 2, (Z[a] + Z[b]) / 2): continue
        lines.append((lv(X[a], Z[a]), lv(X[b], Z[b]), (w or 18) + 4))
    # Standplätze: Kreis 40 m (dort stehen die meisten Flugzeuge, auch wo das OSM-Vorfeld fehlt)
    circles = [(lv(st[0], st[1]), 40) for st in T['s']]
    rws = []
    for A in RW:
        sn, cs = math.sin(A['a']), math.cos(A['a']); L, W = A['len'] / 2 + 30, A['w'] / 2 + 3
        rws.append([lv(A['x'] + sn * u + cs * v, A['z'] - cs * u + sn * v) for u, v in ((-L, -W), (L, -W), (L, W), (-L, W))])
    return polys, lines, circles, rws

def tile_mask(polys, lines, circles, rws, e, n, S):
    im = Image.new('L', (S, S), 0); d = ImageDraw.Draw(im); k = S / 1000
    P = lambda E, N: ((E - e * 1000) * k, ((n + 1) * 1000 - N) * k)
    for pl in polys:
        if len(pl) >= 3: d.polygon([P(*p) for p in pl], fill=255)
    for a, b, w in lines:
        d.line([P(*a), P(*b)], fill=255, width=max(1, int(w * k)))
    for c, r in circles:
        x, y = P(*c); d.ellipse([x - r * k, y - r * k, x + r * k, y + r * k], fill=255)
    for pl in rws:
        d.polygon([P(*p) for p in pl], fill=0)
    return np.asarray(im) > 0

def building_tris(x0, z0, x1, z1):
    """Dreiecke (Grundriss-Projektion) aller Gebäude aus data/buildings.txt im Rechteck (Spielkoordinaten)"""
    import base64, gzip, struct
    raw = gzip.decompress(base64.b64decode(open(os.path.join(ROOT, 'data', 'buildings.txt')).read().strip()))
    hl = struct.unpack('<I', raw[4:8])[0]; H = json.loads(raw[8:8 + hl]); u8 = np.frombuffer(raw, np.uint8); base = 8 + hl; out = []
    for c in H['chunks']:
        if not (x0 - 700 < c['cx'] < x1 + 700 and z0 - 700 < c['cz'] < z1 + 700): continue
        o = base + c['o']; NB, NV, NI = c['nb'], c['nv'], c['ni']
        hd = np.frombuffer(raw[o:o + NB * 6], dtype=np.dtype([('nv', '<u2'), ('nt', '<u2'), ('t', 'u1'), ('y', 'u1')])); o += NB * 6
        pl = [u8[o + k * NV:o + (k + 1) * NV].astype(np.int64) for k in range(6)]; o += 6 * NV
        P = np.stack([(pl[i] | (pl[3 + i] << 8)) for i in range(3)], 1); P = np.where(P >= 32768, P - 65536, P)
        A = ((np.cumsum(P, 0) + 32768) % 65536) - 32768
        X = A[:, 0] / H['sc'] + c['cx']; Z = A[:, 2] / H['sc'] + c['cz']
        code = u8[o:o + NI].astype(np.int64) | (u8[o + NI:o + 2 * NI].astype(np.int64) << 8)
        v0 = ii = 0
        for nv, nt in zip(hd['nv'], hd['nt']):
            hw = 0; idx = np.empty(nt * 3, np.int64)
            for j in range(nt * 3):
                cd = code[ii]; ii += 1
                if cd == 0: idx[j] = v0 + hw; hw += 1
                else: idx[j] = v0 + hw - cd
            out.append(np.stack([X[idx], Z[idx]], 1).reshape(-1, 3, 2)); v0 += nv
    return np.concatenate(out) if out else np.zeros((0, 3, 2))

def lv_np(x, z):
    lat = LAT0 - z / KZ; lon = LON0 + x / KX
    phi = (lat * 3600 - 169028.66) / 10000; lam = (lon * 3600 - 26782.5) / 10000
    E = 2600072.37 + 211455.93 * lam - 10938.51 * lam * phi - 0.36 * lam * phi * phi - 44.54 * lam ** 3
    N = 1200147.07 + 308807.95 * phi + 3745.25 * lam * lam + 76.63 * phi * phi - 194.56 * lam * lam * phi + 119.79 * phi ** 3
    return E, N

def nbg(img, w, sig):
    """gewichteter Gauss-Mittelwert (nur Pixel mit Gewicht w)"""
    k = (0, 0); ws = cv2.GaussianBlur(w, k, sig) + 1e-6
    return np.stack([cv2.GaussianBlur(img[..., c] * w, k, sig) / ws for c in range(img.shape[2])], -1)

stats = {}
for rid in ids:
    polys, lines, circles, rws = paved_shapes(ICAO[rid])
    e0, e1, n0, n1 = REGIONS[rid]
    A0 = next(a for a in AIRPORTS if a['icao'] == ICAO[rid])
    BT = building_tris(A0['x'] - 4000, A0['z'] - 4000, A0['x'] + 4000, A0['z'] + 4000)
    BE, BN = lv_np(BT[..., 0], BT[..., 1])
    OB = [[wgs2lv(la, lo) for la, lo in pl] for pl in OSMB.get(rid, [])]
    print(rid, 'Gebäude-Dreiecke', len(BT), 'OSM-Grundrisse', len(OB), flush=True)
    for e in range(e0, e1):
        for n in range(n0, n1):
            fh = os.path.join(src, f'{e}_{n}_h.webp')
            if not os.path.exists(fh): continue
            img = np.asarray(Image.open(fh).convert('RGB')).copy(); S = img.shape[0]
            paved = tile_mask(polys, lines, circles, rws, e, n, S)
            # Gebäude (swisstopo) ausnehmen: Terminals, Satelliten, Hallen bleiben im Bild
            k = S / 1000; sel = (BE.max(1) > e * 1000 - 50) & (BE.min(1) < (e + 1) * 1000 + 50) & (BN.max(1) > n * 1000 - 50) & (BN.min(1) < (n + 1) * 1000 + 50)
            bm = np.zeros((S, S), np.uint8)
            if sel.any():
                pts = np.stack([(BE[sel] - e * 1000) * k, ((n + 1) * 1000 - BN[sel]) * k], -1).round().astype(np.int32)
                cv2.fillPoly(bm, list(pts), 1)
            for pl in OB:
                pp = np.array([((E - e * 1000) * k, ((n + 1) * 1000 - N) * k) for E, N in pl])
                if pp[:, 0].max() < -50 or pp[:, 0].min() > S + 50 or pp[:, 1].max() < -50 or pp[:, 1].min() > S + 50: continue
                cv2.fillPoly(bm, [pp.round().astype(np.int32)], 1)
            bm = cv2.dilate(bm, np.ones((5, 5), np.uint8))
            paved &= bm == 0
            removed = 0
            if paved.sum() > 2000:
                lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB).astype(np.float32)
                # Belagfarbe nur aus hellem, grauem Beton/Asphalt (keine Schatten, kein Gras)
                Lc, ac, bc = lab[..., 0], lab[..., 1] - 128, lab[..., 2] - 128
                w = (paved & (Lc > 120) & (Lc < 238) & (np.abs(ac) < 9) & (np.abs(bc) < 20)).astype(np.float32); sig = 24
                if w.sum() < 2000: w = paved.astype(np.float32)
                bg = nbg(lab, w, sig)
                for _ in range(2):  # Ausreisser (Flugzeuge) aus dem Belag-Mittel nehmen
                    d = np.abs(lab[..., 0] - bg[..., 0]) + np.hypot(lab[..., 1] - bg[..., 1], lab[..., 2] - bg[..., 2])
                    bg = nbg(lab, w * (d < 22), sig)
                dL = lab[..., 0] - bg[..., 0]; dC = np.hypot(lab[..., 1] - bg[..., 1], lab[..., 2] - bg[..., 2])
                green = (lab[..., 1] < 128 - 7) & (lab[..., 0] < 165)  # Gras/Bäume nicht anfassen (grünlich und eher dunkel)
                # hell oder farbig = Flugzeug; dunkel (Schatten) nur in bis 15 m Abstand zu etwas Hellem
                bright = cv2.morphologyEx((((dL > 26) | (dC > 16)) & paved & ~green).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
                dark = (dL < -28) & paved & ~green & (cv2.dilate(bright, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (61, 61))) > 0)
                cand = (bright > 0) | dark
                m = cv2.morphologyEx(cand.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
                m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
                nl, L, st, _ = cv2.connectedComponentsWithStats(m, 8)
                keep = np.zeros(nl, bool)
                for i in range(1, nl):
                    a, ww, hh = st[i, cv2.CC_STAT_AREA], st[i, cv2.CC_STAT_WIDTH], st[i, cv2.CC_STAT_HEIGHT]
                    if a < 60 or min(ww, hh) < 8 or a > 30000: continue
                    ys, xs = np.nonzero(L[st[i, 1]:st[i, 1] + hh, st[i, 0]:st[i, 0] + ww] == i)
                    (_, _), (rw, rh), _ = cv2.minAreaRect(np.stack([xs, ys], 1).astype(np.float32))
                    asp = max(rw, rh) / max(1.0, min(rw, rh)); fillr = a / max(1.0, rw * rh)
                    keep[i] = asp <= 4.5 and 0.12 <= fillr <= 0.78  # Flugzeug: kompakt, aber kein volles Rechteck (Dächer, Hallen); Randstreifen/Linien: lang und dünn
                m = keep[L].astype(np.uint8)
                m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))) & (paved | (m > 0)).astype(np.uint8)
                removed = int(m.sum())
                if removed:
                    fill = cv2.cvtColor(np.clip(bg, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB).astype(np.float32)
                    rng = np.random.default_rng(e * 7919 + n)
                    fill += cv2.GaussianBlur(rng.normal(0, 3.0, (S, S)).astype(np.float32), (0, 0), 0.8)[..., None]
                    a = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.6)[..., None]
                    img = np.clip(img * (1 - a) + fill * a, 0, 255).astype(np.uint8)
                    if os.environ.get('DBG'):
                        Image.fromarray((np.stack([paved * 120, m * 255, bm * 120], -1)).astype(np.uint8)).resize((900, 900)).save(f'/tmp/mask_{e}_{n}.png')
            Image.fromarray(img).save(os.path.join(dst, f'{e}_{n}_h.webp'), 'WEBP', quality=74, method=6)
            lo = cv2.resize(img, (512, 512), interpolation=cv2.INTER_AREA)
            Image.fromarray(lo).save(os.path.join(dst, f'{e}_{n}_l.webp'), 'WEBP', quality=80, method=6)
            stats[f'{e}_{n}'] = round(removed * (1000 / S) ** 2)
            print(rid, e, n, 'entfernt m²', stats[f'{e}_{n}'], flush=True)
json.dump(stats, open(os.path.join(dst, 'ortho_clean.json'), 'w'), indent=1)
