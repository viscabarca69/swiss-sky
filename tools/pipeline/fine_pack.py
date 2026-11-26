"""Feines Höhenmodell verpacken (Format 2): nur Schweiz + 3 km Puffer (weich auslaufend), 1-m-Stufen, WebP-Atlanten.
Code c (int, -127..127) als Grauwert c+128:  |c| <= LIM -> d = c*STEP;  sonst d = sign(c)*(LIM*STEP + (|c|-LIM)*STEP2).
Datei: 'SSFT' | u16 2 | u16 TS | u16 NT | u16 n | f32 STEP | u16 LIM | f32 STEP2 | u16 Atlanten | u16 Spalten (Kacheln je Atlaszeile)
       | n*(u16 ti,u16 tj) | Atlanten*(u32 Länge) | WebP-Daten (verlustfrei, Kachel k in Atlas k // Spalten², Reihenfolge zeilenweise)
Aufruf lokal:  python3 tools/pipeline/fine_pack.py <R.npy> <idx.npy> data/terrain_fine.txt   (R: n x 256 x 256 Abweichungen in m)
Wird auch von terrain_fine.py benutzt (pack())."""
import sys, os, io, struct, base64
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import HALF, CELL, G, ROOT, _json_after

STEP, LIM, STEP2, COLS = 1.0, 60, 5.0, 16

def ch_weight():
    """Gewicht je Grundknoten: 1 in der Schweiz und bis 1,5 km ausserhalb, dann bis 3 km auf 0"""
    B = _json_after(open(os.path.join(ROOT, 'js', 'area_ch.js'), encoding='utf-8').read(), 'BORDER')
    N = G + 1; im = Image.new('L', (N, N), 0); d = ImageDraw.Draw(im)
    for r in B:
        d.polygon([((r[i] + HALF) / CELL, (r[i + 1] + HALF) / CELL) for i in range(0, len(r), 2)], fill=255)
    m = im.filter(ImageFilter.MaxFilter(25))                      # 12 Zellen ≈ 1,5 km
    w = m.filter(ImageFilter.BoxBlur(12)).filter(ImageFilter.BoxBlur(6))
    return np.clip(np.asarray(w).astype(np.float32) / 255 * 1.6, 0, 1)

def quant(r):
    a = np.abs(r); c = np.where(a <= LIM * STEP, np.round(a / STEP), LIM + np.round((a - LIM * STEP) / STEP2))
    return (np.minimum(c, 127) * np.sign(r)).astype(np.int16)

def pack(R, idx, TS, NT, dst):
    W = ch_weight(); tiles, keep = [], []
    for k, (ti, tj) in enumerate(idx):
        fj = np.minimum(np.arange(tj * TS, tj * TS + TS) // 4, G); fi = np.minimum(np.arange(ti * TS, ti * TS + TS) // 4, G)
        w = W[fj][:, fi]
        if w.max() <= 0:
            continue
        c = quant(R[k] * w)
        if not c.any():
            continue
        tiles.append(c); keep.append((int(ti), int(tj)))
    per = COLS * COLS; atl = []
    for a in range(0, len(tiles), per):
        part = tiles[a:a + per]; rows = (len(part) + COLS - 1) // COLS
        A = np.full((rows * TS, COLS * TS), 128, np.uint8)
        for k, t in enumerate(part):
            A[(k // COLS) * TS:(k // COLS + 1) * TS, (k % COLS) * TS:(k % COLS + 1) * TS] = (t + 128).astype(np.uint8)
        b = io.BytesIO(); Image.fromarray(A, 'L').convert('RGB').save(b, 'WEBP', lossless=True, quality=100, method=5); atl.append(b.getvalue())
    hdr = b'SSFT' + struct.pack('<HHHHfHfHH', 2, TS, NT, len(keep), STEP, LIM, STEP2, len(atl), COLS)
    hdr += b''.join(struct.pack('<HH', a, b) for a, b in keep) + b''.join(struct.pack('<I', len(x)) for x in atl)
    data = hdr + b''.join(atl)
    b64 = base64.b64encode(data).decode()
    # Artifact-Server: höchstens 20 MB je Datei -> Teile name.txt, name_2.txt, …
    PART = 18_000_000; parts = [b64[i:i + PART] for i in range(0, len(b64), PART)]
    for k, ptxt in enumerate(parts):
        open(dst if k == 0 else dst.replace('.txt', f'_{k + 1}.txt'), 'w').write(ptxt)
    return {'kacheln': len(keep), 'atlanten': len(atl), 'mb': len(data) / 1e6}

if __name__ == '__main__':
    R = np.load(sys.argv[1], mmap_mode='r'); idx = np.load(sys.argv[2])
    print(pack(R, idx, 256, 49, sys.argv[3]))
