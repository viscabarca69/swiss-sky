# Tests für Swiss Sky

Einmalig einrichten (im Repo-Ordner):

    npm install --no-save three@0.160.0
    pip install playwright && playwright install chromium

Ohne Browser (Node, im Ordner `test`):

- `node fsim.mjs l320,l350` – Flugphysik: Kurven, Seitenruder, Schiebewinkel
- `node ld.mjs l320` – Landung mit Abfangen, Sinkrate beim Aufsetzen
- `node hsim.mjs` – Rega: Höchstgeschwindigkeit und Tempo halten

Mit Browser (Python + Playwright, lädt das ganze Spiel, im Ordner `test`):

- `python3 missions.py` – startet jede Mission, meldet Fehler, Abstürze und Sofort-Abbrüche
- `python3 traffic.py` – KI-Verkehr an mehreren Flughäfen, prüft den Abstand zum Gelände

Vor jeder Veröffentlichung sollten `missions.py` und `traffic.py` ohne «PRÜFEN» durchlaufen.
