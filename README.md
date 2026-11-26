# MOSKO. HTML-Prototyp

Die Startseite liegt in `index.html`. Die Webdesign-Leistungsseite V1 liegt in `webdesign/index.html`. Für die lokale Vorschau den Ordner über HTTP bereitstellen. Auf GitHub Pages führt die Navigation relativ von `/mosko/` nach `/mosko/webdesign/`.

## Gemeinsame Komponenten

- `styles.css` enthält Design-Tokens, Schriften, Glass-Pill-Header, Atmosphären und Curtain Footer. Header und Footer verwenden auf beiden statischen Seiten dieselbe Struktur. Bei der WordPress-Integration werden sie zu gemeinsamen Templates und die relativen Links durch die tatsächlichen Seitenziele ersetzt.
- `scenes.js` zeichnet die visuellen Ebenen. `motion.js` steuert die Interaktion und das Scrollverhalten auch auf Seiten ohne Startseiten-Signature. Der Leistungshero verwendet die Chili-Atmosphäre ohne Signet-Canvas. Die Projektanfrage verwendet die helle Atmosphäre.
- `service.css` ergänzt Layoutvarianten für Leistungsseiten. `service.js` liest die Position der fünf Phasen aus dem normalen Dokumentfluss. Die Linie und der Marker folgen der Scrollposition. Bei reduzierter Bewegung bleibt die nummerierte Liste statisch.
- Das Experiment nutzt zwei opake Farbflächen in Erdgrau auf Kontrast und Sandstein. Beide Formen verwenden dieselbe Original-Maske. Die als `details` aufgebaute Auflösung blendet eine gleichfarbige Verbindung ein. Auflösung und FAQ sind auch ohne JavaScript bedienbar.
- DE / EN speichert die Wahl über `language.js`. Der Prototyp enthält die deutsche Seite mit `lang="de-CH"`. Vollständige sprachspezifische URLs, Weiterleitungen und `hreflang` folgen mit WordPress.

## Portfolio und Projektanfrage

Die versetzten Projektansichten sind eigenständige HTML-Artikel. Zum Austausch jeweils Bild, Alternativtext, Beschreibung und Link im Artikel aktualisieren. DiverDesign zeigt Ausschnitte der Live-Startseite. NetJ zeigt die vorhandene Entwurfsansicht. Der Link führt zur aktuellen Unternehmenswebsite. Das Foto Cheyenne-35 ist als optimierte WebP-Kopie eingebunden. Die Browserleiste auf dem Monitor ist in der Kopie weichgezeichnet.

Offen für die nächste Projektphase sind finale NetJ-Ansichten, echte Kundenrezensionen im Slot `google-reviews`, eine allfällige farbliche Anpassung des Shootingfotos, die MWST-Angabe zum Preisrahmen und die englischen Inhalte. Die Projektanfrage führt vorläufig an `info@mosko.ch`. Das Ziel der künftigen Kontaktseite ist als `data-wp-path` hinterlegt.

Der öffentliche Pages-Prototyp enthält das lokal genutzte Fernwartungsmodul derzeit nicht. Beim Publizieren nur die Webdateien und die freigegebenen, optimierten Bildkopien übernehmen.
