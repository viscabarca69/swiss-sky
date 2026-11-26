// Eine durchgehende Karte: die ganze Schweiz mit Grenzgebieten
import * as CH from './area_ch.js';
export const AREA_ID='ch';
export const AREA_NAME='Ganze Schweiz';
// Offline-Datei (tools/build_offline.mjs): Daten liegen als Data-URLs in window.__OFF
const OFF=typeof window!=='undefined'&&window.__OFF||null;
export const TERRAIN=OFF&&OFF.terrain||'data/terrain_ch.png';
export const BUILDINGS=OFF&&OFF.buildings||'data/buildings.txt';
export const GEO=CH.GEO,LAKES=CH.LAKES,AIRPORTS_RAW=CH.AIRPORTS_RAW,TOWNS=CH.TOWNS,PEAKS=CH.PEAKS,ROADS=CH.ROADS,RIVERS=CH.RIVERS,BORDER=CH.BORDER||[];
