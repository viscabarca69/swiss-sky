# Alpenflug – Nachtlauf (autonom, Luis ist offline)

Luis (20.11.2026, nachts): "kannst du alle Schritte selbst planen, sodass am Morgen alles erledigt ist?"
DEADLINE: spätestens 08:50 Schweizer Zeit (07:50 UTC) alles fertig. Ab 07:35 UTC nichts Neues mehr anfangen: letzten stabilen Stand veröffentlichen + Zusammenfassung senden.
Weckrufe (send_later) um 02:33Z, 05:03Z, 07:33Z.
→ Etappen 2–7 nacheinander umsetzen, jede testen + veröffentlichen (alle Dateien, publish_files mit base_version),
  kurz per SendUserMessage berichten. Am Morgen Gesamtzusammenfassung per SendUserMessage.

Artifact slug e3615a1f-7860-4277-b4c4-84ea1ba2abea · letzte veröffentlichte Version: 1795130839-f871 (Etappe 1)
Backup Etappe 1: /tmp/af_e1 (kann nach Neustart weg sein)
Testen: /tmp/run.sh test/<x>.py (Playwright, SwiftShader) · node test/jobs.mjs (Routen) · node test/mis.mjs

## Erledigt
- L-3xx-Nasen neu (NOSE-Tabellen mit Breite, monotone Interpolation, neue Cockpitscheiben, A350-Maske, Radom-Naht)
- Lackier-System: paint(), Vorlagen klassisch/retro/bauch/voll/swoosh/schweiz, finMats(style), LIV_* Exporte
- career.js: Preise, Aufträge (Talwegpunkt-Routing wayPath), Tagesaufgabe, Abzeichen, Teilen-Code
- main.js: Karriere-Untertabs, Hangar + Ausstellungsplatz, Rekorde, Geist, Abzeichen-Popup, finish() mit Lohn

## Veröffentlicht: Etappe 2+3 als Version 1795134067-6652 (00:21 UTC)
## (alt) Offen Etappe 2
- Bot-Test test/bot.py (G wird null am Ende? untersuchen) → Aufträge in der Sim fliegen
- Regression test/reg2.py, Menü-Screenshots, veröffentlichen

## Etappe 3 FERTIG: m15–m21 (Motorausfall, Triebwerk aus, Fahrwerk klemmt, Waldbrand, Wasserlandung, Ziellandung, Thermik), Flugzeuge feuer + segler, 4 neue Abzeichen
## (Plan) Etappe 3: Notfälle, Löschflugzeug, Wasserflugzeug, Landewettbewerb, Segelflieger
## Etappe 4: Winter, Gewitter, Züge/Autos, Gate + Pushback, Callouts/Kabinenansagen, Fotomodus, echtes Wetter falls möglich
## Etappe 5: Touch-Steuerung, Tastenbelegung, Vibrationsstärke
## Etappe 6: Rega-Helikopter
## Etappe 7: Berner Oberland als ganzes Gebiet (Gebietsauswahl)

## Veröffentlicht: Etappe 4+5 (Version 1795135207-f03b), downloads-Capability deklariert, Foto-Speichern Version 1795135295-95ee
- Etappe 4 FERTIG: Winter (uWin), Schnee/Gewitter+Blitze, Live-Wetter Open-Meteo, Callouts+Kabinenansagen, Fotomodus (K), Züge+Autos (ground.js), Gate+Pushback (J) + m22–m24
- Etappe 5 FERTIG: Tastenbelegung (REMAP), Vibration, Touch-Overlay
- NÄCHSTES: Etappe 6 Rega-Heli (heli.js), dann Etappe 7 Berner Oberland (prep_data in /home/claude/prep_data, prep.py als Vorlage)

## Zusatzwünsche Luis (00:45 UTC)
1. Interaktive Karte: auf grosser Karte (M) eigenes Ziel per Klick/Controller setzen; Minikarte + Karte zeigen Routenlinie durch Ringe bis Ziel; HUD-Hinweis zum eigenen Ziel
2. Flugzeugbild (gerenderte Vorschau) in Flugzeugauswahl (Freier Flug) + Hangar
3. Am Schluss: selbst alles prüfen, Grafik + Bedienung auf «S+» polieren
Reihenfolge: Etappe 6 (Rega) → 7 (Berner Oberland) → Wünsche 1+2 → Schlusspolitur → Zusammenfassung bis 07:35 UTC

## Veröffentlicht: Etappe 6 (Rega) als Version 1795136039-4657
## Etappe 7 (Berner Oberland) gebaut: area_zs.js/area_bo.js/terrain_bo.png, b1–b7 validiert, Gebietswahl fArea → noch veröffentlichen
## Veröffentlicht: Etappe 7 als Version 1795137117-cfaf (01:12 UTC). ZS-Regression m1–m27 ok.
## NÄCHSTES: Wunsch 1 (interaktive Karte + Routenlinie), Wunsch 2 (Flugzeugbilder), Schlusspolitur
## Veröffentlicht 01:29 UTC: Wunsch 1+2 als Version 1795138136-329d
- Karte (M): Klick = Ziel (rastet auf Flughafen/Gipfel/Ort/See ein), Rechtsklick/Entf = löschen, Mausrad/+− Zoom, Ziehen, ⌖ Flugzeug; Controller: Stick Cursor, ✕ setzen, □ löschen, R1/L1 Zoom, △ zentrieren
- Routenlinie gelb (Ringe) + türkis (eigenes Ziel) auf Mini- und Grosskarte, Randpfeile, 3D-Pin, Kursmarke im PFD, Autopilot fliegt zum Ziel (sichere Höhe)
- Flugzeugbilder: Studio-Renderings (thumbTick) in Freier Flug + Hangar
## NÄCHSTES: Schlusspolitur «S+» (Menüs, HUD, Grafik in beiden Gebieten), danach Zusammenfassung
## Veröffentlicht 02:11 UTC: Politur 1 (Version 1795140654-3c37)
- Kino-Menü: Kamerafahrten (ZS: Flughafen, See→Pilatus, Urnersee, Zürich; BO: Eiger, Thunersee, Lauterbrunnen, Brienzersee) mit Überblendung (#mfade)
- Briefing mit Routenkarte (briefMap), Pause-Panel neu (Status, Karte, Flughilfe, Lautstärke, Steuerungsübersicht)
- Bahnlinien über Seen ans Ufer verschoben (shoreFix)
## NÄCHSTES (Politur 2): Ergebnis mit Flugspur-Karte? Ladebildschirm, HUD-Feinschliff, Cockpit, schmale Bildschirme prüfen
## Veröffentlicht 02:20 UTC: Politur 2 (Version 1795141202-f369): Cumulus-Wolken, HUD skaliert (--pfdw), Funk-Box responsiv, Flugspur-Karte im Ergebnis, Info-Fenster aktualisiert
## Veröffentlicht 02:34 UTC: Politur 3 (Version 1795142046-bca7): Wasser-Normalmap ohne Kachelmuster, Abendwolken-Farben, Minikarte klickbar, Brief-Zielbeschriftung
## Veröffentlicht 02:44 UTC: Politur 4 (Version 1795142662-0162): Abflug-Leiste klebt unten (Freier Flug), Fotomodus-Start synchronisiert, Positionslichter tagsüber dezenter
## Veröffentlicht 02:58 UTC: Politur 5 (Version 1795143457-059d): Ringe gestreift + Leuchtsaum (blau für Endanflug), Auftragsrouten mit Kurvenradius-Prüfung (turnOK), Anflug-Eintritt mit Platz (roomy), Emmen/Buochs beide Startrichtungen; L-320 nicht mehr ab/nach Buochs (Bot-Crash am Rigi behoben)
## Veröffentlicht 03:08 UTC: Politur 6 (Version 1795144068-77d4): b1 mit Wende über dem Aletschgletscher + sanftere Abstiege, m3/m10/m23 unmögliche Steigungen entschärft; test/turns.mjs prüft Kurven + Steigungen
## Veröffentlicht 03:28 UTC: Politur 7 (Version 1795145297-cf99): Relief-Schattierung nach Sonnenrichtung (uSun), mehr Fels in steilen Schneehängen
## Bot-Test für Missionen ist zu grob (crasht auch bei fliegbaren Routen) – nicht als Massstab nehmen
## Veröffentlicht 03:36 UTC: Politur 8 (Version 1795145750-4a20): Flugzeugbild im Briefing + in Auftragsliste, Esc schliesst Briefing/Ergebnis, Enter startet Briefing
## Veröffentlicht 03:43 UTC: Politur 9 (Version 1795146189-94f7): Reliefschattierung auf Karte/Minikarte (soft-light Hillshade)
## Veröffentlicht 04:04 UTC: BO-Aufträge (Version 1795147421-c5ea): APT_BO (Bern, Interlaken, Meiringen, Reichenbach, Raron), SIGHTS_BO, Gitter in XZ für BO, getrennte Auftragslisten (C.jobs / C.jobsBO, career.jobs()), Tagesaufgabe pro Gebiet, keine Segler/Rega-Tagesaufgaben mehr; Kehrtkurven beidseitig geprüft, Startrichtung Richtung Ziel bevorzugt; test/jobs2.mjs (AREA=bo)
## Veröffentlicht 04:11 UTC (Version 1795147874-942a): Karte öffnet beim ersten Mal mit passendem Ausschnitt (mapFit), Zwei-Finger-Zoom auf Touch
## Veröffentlicht 04:19 UTC (Version 1795148339-8867): Wiederholungs-Bodenkamera prüft Sichtlinie (Gelände + Häuser, rpClear)
## Veröffentlicht 04:26 UTC (Version 1795148745-e8fd): Touch-Kartenhinweis, Tastenzeile auf Touch aus, Vorbeiflug-Kamera mit Sichtprüfung, Neuigkeiten-Liste aktualisiert
## Veröffentlicht 04:32 UTC (Version 1795149099-910e): Kartenbedienung im Steuerung-Reiter, Bild im Lektions-Briefing
## Veröffentlicht 04:39 UTC (Version 1795149519-9d7b): Leucht-Impuls beim Ringdurchflug (ringPop/ringFx), HUD nachts leicht gedimmt

## ABSCHLUSS 04:50 UTC
Alles veröffentlicht (letzte Version 1795149519-9d7b, Dateien = lokal geprüft). QA in beiden Gebieten ohne Konsolenfehler, Regression m1–m27/l7/l8 + b1–b7 ok.
Morgen-Zusammenfassung an Luis gesendet. Offene Grenzen: Flugschule nur ZS; L-320 nicht ab/nach Buochs; Cockpit-Instrumente bleiben Overlay; echtes Wetter braucht Netz.
## Veröffentlicht 07:05 UTC (Version 1795158274-2777): Flugschule auch im Berner Oberland (Lektionen in Bern-Belp, Texte angepasst). Luis hat um 05:03 UTC «arbeite weiter» geschrieben.
## Veröffentlicht 07:18 UTC (Version 1795159099-4166): Desktop im Windows-11-Stil (Luis' Wunsch): Symbole oben links (Doppelklick), zentrierte Taskleiste mit Start/Suche/App, Uhr+Datum, Startmenü, Fluent-Fenster (— ▢ ✕), eigenes Hintergrundbild (gläserne Bergketten). Kein Windows-Logo/-Hintergrund kopiert. Mac-Version gesichert in /tmp/*_mac.*

## 2026-11-20 08:45 UTC – Titlis neu + Zurück zum Desktop (Version 1795164346-b4a3)
- Titlis T-12 (PC-12-artig) neu modelliert: neues Rumpfprofil (schlanke Motorhaube, ansteigende Front, rundes Heck ohne Knick), Cockpitscheibe mit Mittelpfosten + seitlichem Fenster (windshield() kann jetzt o.fn(z,y,s,pd)), 6 kleinere runde Kabinenfenster (cabinGlass row.dph), Titel «LUIS AIRLINES» über den Fenstern statt darüber gemalt, Auspuffstutzen statt schwarzer Scheiben, Motorhaube im Cockpit (verdeckt den Spinner).
- Desktop-Rückkehr: Knopf «Desktop» im Hauptmenü, «Zum Desktop» im Pausenmenü; Taskleiste «Alpenflug» setzt fort (Pause bleibt).
- Regression reg2 ok.

## 2026-11-20 10:28 UTC – Grosse Karte (Version 1795170503-0cdb)
- Eine Karte statt zwei: area_ch.js + data/terrain_ch.png (2049², 82 m Zellen, Mitte 46.88/8.19, ±84 km). Prep: /home/claude/prep/prep_ch_terrain.py + prep_ch_data.py (liest alte area_zs/bo.js, rechnet über Breite/Länge um).
- Neue Flughäfen SIO (Sion, LSGS) und GRE (Grenchen, LSZG); 16 Seen; Orte/Strassen/Flüsse/Bahn im Mittelland ergänzt; Strassen per Catmull-Rom geglättet, Bahn per Spline+Entspannen.
- world3d: Gelände in 16×16 Kacheln mit LOD (1/2/4/8, Schürzen), Häuser in Zellen (Ausblenden >30 km), Flugplatz-Gebäude je Platz ausgeblendet >24 km, Attraktionen >32 km. Dreiecke ~2.5 Mio (alt 4.7 Mio), Draw Calls gleich.
- Himmel/Nebeldecke folgen der Kamera (sonst schwarzer Himmel am Kartenrand).
- Karriere: APT = alle Plätze; Wegpunktgitter regelmässig (2.7 km) mit Heap-Dijkstra; Ecken mit vollem Radius werden zu Bögen (Jets nur beim Eindrehen in den Endanflug); Langstrecken (L-320 nur LSZH/LSZB/LSGS), Lohnfaktor bis 5; alte Aufträge werden einmalig verworfen (C.jobsW='ch1'); Geister-Key alpenflug-ghost2.
- Missionen: alle (m* und b*) sichtbar; roundRings() rundet Ecken nur, wenn der Bogen wirklich weiter wird; m6, m11, m20 entschärft.
- Edelweiss: 48 (Speicher bleibt in save.edelweiss / edelweissBO, BO-IDs +24).
- Testbot: Titlis Grenchen→Interlaken und Föhn Bern→Sion fliegen durch; Bot-Fahrwerk-Toggle ist ein Bot-Fehler.

## 2026-11-20 10:48 UTC – Anflugplaner (Version 1795171681-d7ad)
- js/approach.js: runwayAt, approachOptions (sichere Richtungen aus career APT), planApproach (FMS-artige Bahnsimulation: Radius aus Tempo/25° Querlage, Vorhalt, Einflugpunkt J bei Anflug von vorne, wayPath durch Täler, Höhenprofil 3° mit Geländereserve, TOD/IF/FAF), approachGuide (Hinweise: Sinkflug, Kurven, Gleitpfad, Fahrwerk/Klappen).
- main.js: Karte → Piste anklicken → Menü (#mapPop); Gamepad X wählt automatisch; violettes 3D-Band (nahe Kamera ausgeblendet, gestrichelt); Autopilot (U) folgt der Bahn bis ~110 m über Grund; Neuberechnung bei >1.8 km Abweichung; career.wayPath exportiert.

## 2026-11-20 11:06 UTC – Modelle nach Fotos (Version 1795172784-7f7b)
- Rega neu als «Rega Da Vinci» (AW109-Bauart): spitze Nase, Frontscheibe + Türfenster (windshield fn), 2 Kabinenfenster, eigene rote Textur (LV.c1/LV.base) mit weissem Feld, Kreuz, «rega», «Rega 1414», HB-ZRR; Sponsons, Triebwerkshaube, hohes Leitwerk mit Kreuz, Heckrotor links (parts.fans), Räder mit Schneekufen.
- Airliner: ovale, kleinere Kabinenfenster (cabinGlass pw/fr), L-320 grössere Neo-Triebwerke, L-380 stumpfere Nase (NOSE.a380), Titel auf Oberdeckhöhe mit ausgesparten Fenstern.

## 2026-11-20 12:01 UTC – Funk & Tempowarnungen (Version 1795176098-485a)
- ATC: T nach dem Start = «in der Luft»-Meldung bzw. Abflugkontrolle rufen (depCall), keine Landefreigabe für den Startplatz, bis man >16 km weg ist oder 4 min vergangen sind; Funkzeilen merken sich den Sendernamen.
- Nahbereich kontrollierter Plätze (10 km, <1000 m über Grund, ab 2 min nach dem Start): erst Warnung mit Erklärung (Toast + Funk), Regelverstoss erst nach 20 s über 460 km/h; PFD zeigt «LIMIT 460» in Orange.
- Tempo rot: neue Grenzen VMO je Flugzeug (knapp über Höchsttempo im Geradeausflug) und Klappen-Grenzen (Vref·(1.75−0.45·k/(n−1))); beim ersten Überschreiten Erklärung als Toast, Beschriftung unter dem Tempo-Kasten.

## 2026-11-20 13:40 UTC – Swiss Sky Stufe 1 (Version 1795178832-a2ae)
- Umbenannt in «Swiss Sky» (Titel, Desktop, Taskleiste, Logo, Ladebild, Wasserzeichen); neue Info «Version 8» mit Karten, Steuerung, «Neu in Version 8».
- Strengelbach (47.2786/7.9286) in TOWNS.
- Pisten der Regionalplätze verlängert (EXT8 in worldgen, alongV8 für Missionsringe); wasSmall/lenOld; REGF-Flachzonen.
- Regionalplätze detaillierter (airports3d regApron, Terminal, Turm, Radar, Hangars, Tanks, Feuerwehr, Parkplatz, Fahrzeuge, Anflugbefeuerung).

## 2026-11-20 13:30 UTC – Swiss Sky Stufe 2: Grafik (Version 1795181393-6ed6)
- aircraft.js: paintMat (Klarlack), wingMat (Blechfelder/Nasenkante, loft hat jetzt UVs), surfMat für Ruder/Pylone; Rumpf: Längsstösse, Wartungsklappen, Türfenster, Frachttüren (cfg.cargo), Schmutzverlauf; Triebwerke mit Einlauf (M.inlet), Spirale (M.spin), nacMat, Düse/Kern/Kegel (M.hot), schlanke Pylone; Fahrwerksklappen, Bugfahrwerk-Scheinwerfer, wicks(); Propeller bladeGeo (verwunden, gelbe Spitze); Rega: Profilblätter, Rotorkopf/Grips/Steuerstangen, Taumelscheibe, Winde mit Haken, Suchscheinwerfer, Antennen, Pitot, Trittstufen.
- bakeModel(): abgestellte Flugzeuge je Material zusammengefasst (addParked).
- env.js: Wolken als EIN instanziertes Billboard-Mesh (Atlas 3×2, Sortierung hinten→vorne bei >250 m Kamerabewegung). ZRH am Boden: 1855 → 935 Draw Calls.
- world3d: Feldspuren (Mähstreifen/Saatreihen/Furchen), Feldwege, Siedlungsboden neu (gedrehtes Strassennetz, Gärten, Plätze; Dichte aus TW im Blaukanal), Felsbänderung/Klüfte, Geröllhalden, Gletscher, Gratrelief (Normalen), Seefarbe nach Tiefe (aD) mit weichem Ufer; Kirchen (Turm + Spitzhelm) je Ort, Chalets über 820 m; Obstgärten, Einzelbäume, Gartenbäume; erzwungenes updateTrees bricht laufende Generierung ab.
- bake.js: bakeStatic() fasst auch die Flugplatzgruppen zusammen (Windsäcke, Radarschirme, abgestellte Flugzeuge ausgenommen). ZRH am Boden jetzt 865 Draw Calls. Regression reg3: alle Missionen ok, l7/l8 ok.

## 2026-11-20 14:35 UTC – Version 8.1 (Artefakt 1795185264-9656, GitHub viscabarca69/swiss-sky d8c2b75)
- missions.js objPath(): Dubins-Bahn (Kurve–Gerade–Kurve) zwischen Ringen, Radius turnRadius(P) (Props 1.45·Vref/38°, Jets 1.5·Vref/28°), Richtung an Ringen = Winkelhalbierende (Haarnadel: quer), Endanflug fix; o.pi/o.hd; Läufe brechen an Nicht-Ring-Zielen (brk).
- main.js: buildPathRibbon (orange, Endanflug blau, Pfeile alle 90 m, durchflogene Abschnitte via uOi), Ringe zur Bahn ausgerichtet; hud.route zeichnet Bahn (Minikarte, Karte, Briefing).
- m6 neu: Abflug 28, Gegenanflug 6.4 km SW parallel zur 14, Halbkreis R 3.2 km, Endanflug ab 10 km; Ring 1 nur 330 m über Platz.
- Landehilfe: #gnd (Bodenbalken 0–30/50 m, Trend 3 s, «Boden in x s», Farben nach Sinkrate), #flare «ABFANGEN», Kontaktschatten (Silhouette per Ortho-Render in RT, Mipmap-Unschärfe nach Höhe), Höhenansagen dt. für Kleinflugzeuge (30/20/10/5 m).
- Gewisses Etwas: #tdb Aufsetz-Bewertung (Butterweich … Sehr hart, Note), Reifenqualm (Sprites an Hauptfahrwerk), Kamerastoss + Rollruckeln (applyShake), Kondensfahnen (Lastvielfaches aus Beschleunigung, feucht ab 1.25 g), Sonnen-Lensflare.
- GitHub Pages: https://viscabarca69.github.io/swiss-sky/ (Repo-Klon /home/claude/swiss-sky, Push über Claude-GitHub-App).
- Offline-Datei: /home/claude/buildtools/build_offline.mjs (esbuild, three.js gebündelt, terrain als Data-URL, Inter eingebettet) → /home/claude/out/Swiss Sky.html (9.2 MB), läuft per Doppelklick (file://).

## 2026-11-23 – Version 9: ganze Schweiz
- Karte: Zentrum unverändert (46.88/8.19), HALF 185 km, G 3072 (120 m Zellen). /home/claude/prep/prep_all_terrain.py (DEM-Kacheln z7 66–67/44–45, Glättung an 120 m angepasst, Seen: 22 aus swiss-maps + Grenzseen Como/Annecy/Bourget/Iseo/Garda aus Natural Earth) → data/terrain_ch.png (12.9 MB), /tmp/H_all_raw.f32, /tmp/LK_all.u8, /tmp/lakes_all.json.
- /home/claude/prep/prep_all_data.py: TOWNS (~300, NEWT2), PEAKS (73), Strassen/Flüsse/Bahn ausserhalb des alten 168-km-Quadrats aus Natural Earth (ne_ch.json, ins Tal gezogen per snap()), BORDER (swiss-maps country.shp, DP 90 m), Flughäfen GVA(04/22) BSL LUG ACH SMV PAY → js/area_ch.js, js/rails_ext.js.
- Engine: Wolkenfeld 150-km-Kachel, im Shader um die Kamera gewickelt (uCam/uP); mapCanvas 4096; Grenze + Ausland abgedunkelt im mapCanvas; EXT8 LUG/ACH; TWR-Namen; airports3d big-Liste; career APT + SIGHTS; Missionen c1–c7; attractions buildCH (Jet d'Eau, Chillon, Landwasserviadukt, Basler Münster, Castelgrande, Rheinfall) + EDELWEISS_CH (Ids ab 48, save.edelweissCH).
- Speicher: JS-Heap ~500 MB (5 Float32-Gitter à 38 MB + Canvas). Ladezeit SwiftShader ~12 s.

### Veröffentlichung Version 9 (23.11.2026)
- Artifact-Version 1795435739-6b13 (Label "Swiss Sky 9: ganze Schweiz")
- GitHub swiss-sky: Commit 8d27d91 (Pages baut automatisch)
- Desktop-Datei "Swiss Sky.html" 19.1 MB, offline getestet (file://, Laden ~14 s, Mission c1 startet ohne Fehler)

## 2026-11-23 – Version 10: echte Gebäude + Flotte
- swissBUILDINGS3D 3.0 (swisstopo, OGD, Quelle angeben): 22 Kacheln (GDB) für Zürich(+Flughafen), Genf(+Flughafen), Basel, Bern, Lugano(+Agno), St. Gallen, Zofingen/Strengelbach.
  Rohdaten bei Luis unter Downloads\SwissSky-Daten (~760 MB). Pipeline: prep/sb3d_extract.py (python3.12 + GDAL, Building_solid TIN → npz in Spielkoordinaten),
  prep/sb3d_build.py (ERR=2.0 DIV=32 MINA=25 SC=4 FMT=delta): Böden weg, meshopt-Vereinfachung pro Gebäude, Flughafenzonen ZRH/GVA/Agno ausgespart, 1-km-Kacheln,
  Positions-Deltas als Byte-Ebenen + Index-Codes (High-Water-Mark), gzip → data/buildings.txt (Base64 der gzip-Datei, 11.2 MB; Artifact-Server liefert kein .gz; 8.4 MB gzip, 103k Gebäude, 2.25 M Dreiecke). Kein WASM nötig (DecompressionStream).
- js/realcity.js: laden (fetch oder Data-URL), Gebäude pro Kachel auf Spielgelände (Minimum unter Grundriss −0.4 m), Shader: Wand/Flachdach/Ziegeldach nach Flächennormale,
  Fenster + Nachtlicht, Abdeckungs-Vierecke → keine generierten Häuser/Kirchtürme/Wahrzeichen-Duplikate, Strassenraster im Gelände dort aus (cls.a).
- Flugzeuge: Rumpf-Profil mit syT/sxT (obere Hälfte) → L-747-Buckel; Fensterreihen mit konstanter Höhe (row.y); keelBulge statt Kugel-Bauchverkleidung;
  Klappen: Fowler (Verschiebung 0.32·Sehne) + Kanus hängen an den Klappen; L-350 Nase 'a350' + Maske; L-380 Nase/Cockpit tief; L-320 klassisch (Fence, kleine Triebwerke); L-320neo neu.
- Veröffentlicht: Artifact 1795440612-dfe6, GitHub fd0f797, Desktop-Datei 30.3 MB (offline + Sandbox getestet, 103k Gebäude geladen)
- Offen: Flughäfen im MSFS-Stil (Terminals, Fluggastbrücken, Vorfeld) – noch nicht umgesetzt

## 2026-11-23 – Version 10.3: Autopilot, Reiseflughöhe, Klappen
- Autopilot neu (main.js `apStep`): folgt G.appr (Anflugplan), G.path (Ringbahn aus objPath) oder G.wp. Querführung: Bahnkurs + Krümmungs-Vorsteuerung (3 s voraus) + Ablage-Korrektur; Höhe = Bahnhöhe + Neigung; Tempo-Planung über 40 km (Kurvenradius bei 24° Querlage, Endanflug 1.4·Vref, Nahbereich 0.93·128 m/s, Verzögerung 0.32 m/s²); PI-Schubregler, Luftbremse >250 m über Grund; Klappen/Fahrwerk automatisch; Abschalten bei 90 m über Grund; Geländeschutz (17–32 s voraus, steigt und weicht zur tiefsten Seite aus); verpasster Ring wird übersprungen.
- flight.js: Kurvenkoordination mit Flughilfe (Gier-Sollrate g·sin(φ)/V) – vorher nur ~66 % der idealen Drehrate.
- career.js `cruiseRoute`: Linienflüge (Jets, Föhn, Titlis) direkt oder durch die Täler, aber mit Profil steigen (6.5 % / 5 %) – Reiseflughöhe (Jet 1800+0.026·L, begrenzt) – 3° sinken; Ringe alle 10 km im Steig-/Sinkflug, max. 25 km im Reiseflug. Doppelter Eintrittsring entfernt (missions.js filtert Ring-Duplikate).
- aircraft.js: Klappen mit tiefer Abdeckung (ov 0.12), Fowler-Weg nur bis unter die Abdeckungskante; Lücken zwischen Rudern mit fester Hinterkante gefüllt; Jets mit Innen-/Aussenklappe (parts.flaps).
- atc.js: Bussen erst nach 2 Warnungen (~50 s), 7 % Toleranz; Komfort mit geglätteter Vertikalbeschleunigung, lockerere Grenzen, langsame Erholung.
- Strengelbach in TOWNS (area_ch.js).
- Tests: /tmp/ap_test.py (PID, JN, SEED, DUR, STEP) – ganze Auftragsflüge mit AP; /tmp/appr_ap.py, /tmp/hdg.py.
