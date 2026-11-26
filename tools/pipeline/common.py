"""Gemeinsame Hilfen der Daten-Pipeline: Spielkoordinaten und Flugplätze aus js/area_ch.js lesen."""
import json, re, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def _json_after(src, name):
    i = src.index(name + '=') + len(name) + 1
    dec = json.JSONDecoder()
    return dec.raw_decode(src[i:])[0]

def load_area():
    src = open(os.path.join(ROOT, 'js', 'area_ch.js'), encoding='utf-8').read()
    return _json_after(src, 'GEO'), _json_after(src, 'AIRPORTS_RAW')

GEO, AIRPORTS = load_area()
LAT0, LON0, KX, KZ = GEO['lat0'], GEO['lon0'], GEO['kx'], GEO['kz']
HALF, G = GEO['half'], GEO['g']
N1, CELL = G + 1, 2 * HALF / G

def to_xz(lat, lon):
    return (lon - LON0) * KX, -(lat - LAT0) * KZ

def to_latlon(x, z):
    return LAT0 - z / KZ, LON0 + x / KX
