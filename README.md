# MOSKO. HTML-Prototyp

Die Startseite liegt in `index.html`, die Webdesign-Leistungsseite in `webdesign/index.html` und die IT-Werkzeugkiste in `it/index.html`. Für die lokale Vorschau den Ordner über `http://127.0.0.1` bereitstellen. Auf GitHub Pages liegen die relativen Seitenpfade unter `/mosko/`.

## Gemeinsame Komponenten

- `styles.css` enthält Design-Tokens, Schriften, Glass-Pill-Header, Atmosphären und Curtain Footer. Header und Footer verwenden auf allen drei statischen Seiten dieselbe Struktur. Bei der WordPress-Integration werden sie zu gemeinsamen Templates und die relativen Links durch die tatsächlichen Seitenziele ersetzt.
- `scenes.js` zeichnet die visuellen Ebenen. `motion.js` steuert die Interaktion und das Scrollverhalten auch auf Seiten ohne Startseiten-Signature. Der Leistungshero verwendet die Chili-Atmosphäre ohne Signet-Canvas. Die Projektanfrage verwendet die helle Atmosphäre.
- `service.css` ergänzt Layoutvarianten für Leistungsseiten. `service.js` liest die Position der fünf Phasen aus dem normalen Dokumentfluss. Die Linie und der Marker folgen der Scrollposition. Bei reduzierter Bewegung bleibt die nummerierte Liste statisch.
- Das Experiment nutzt zwei opake Farbflächen in Erdgrau auf Kontrast und Sandstein. Beide Formen verwenden dieselbe Original-Maske. Die als `details` aufgebaute Auflösung blendet eine gleichfarbige Verbindung ein. Auflösung und FAQ sind auch ohne JavaScript bedienbar.
- DE / EN speichert die Wahl über `language.js`. Der Prototyp enthält die deutsche Seite mit `lang="de-CH"`. Vollständige sprachspezifische URLs, Weiterleitungen und `hreflang` folgen mit WordPress.

## Portfolio und Projektanfrage

Die versetzten Projektansichten sind eigenständige HTML-Artikel. Zum Austausch jeweils Bild, Alternativtext, Beschreibung und Link im Artikel aktualisieren. DiverDesign zeigt Ausschnitte der Live-Startseite. NetJ zeigt die vorhandene Entwurfsansicht. Der Link führt zur aktuellen Unternehmenswebsite. Das Foto Cheyenne-35 ist als optimierte WebP-Kopie eingebunden. Die Browserleiste auf dem Monitor ist in der Kopie weichgezeichnet.

Offen für die nächste Projektphase sind finale NetJ-Ansichten, echte Kundenrezensionen im Slot `google-reviews`, eine allfällige farbliche Anpassung des Shootingfotos, die MWST-Angabe zum Preisrahmen und die englischen Inhalte. Die Projektanfrage führt vorläufig an `info@mosko.ch`. Das Ziel der künftigen Kontaktseite ist als `data-wp-path` hinterlegt.

## IT-Werkzeugkiste

- `it/` nutzt den freigegebenen Chili-Hero mit Power-Schalter und den globalen Curtain Footer. Das Passwort-Special wechselt zwischen einem dunklen Checker, einer hellen Satzkarte und einem dunklen Generator. Die drei skulpturalen Sicherheitsgrundpfeiler übernehmen die architektonische Formensprache des IT-Editorials.
- Die stabilen Sprungziele sind `fernwartung`, `passwortcheck`, `passwortgenerator`, `security`, `backup` und `security-challenge`. Der Desktop-Header führt auf allen drei Seiten zu `it/#fernwartung`.
- Fernwartung verwendet die offiziellen QuickSupport-Quellen für Windows (64 Bit) und macOS. Der früher verlinkte Download von `www.mosggo.ch/Mosggo-QS.exe` war in der Prüfung nicht erreichbar. Die lokale Originaldatei liegt getrennt vom öffentlichen Prototyp. Bei einem Wechsel auf das eigene QuickSupport-Modul zuerst den öffentlichen Link und die Modulkonfiguration prüfen.
- `it.js` erzeugt Passwörter lokal mit `crypto.getRandomValues()`. Die Abtastung verwirft Zufallsbytes ausserhalb eines exakten Vielfachen der Alphabetgrösse und anschliessend vollständige Entwürfe mit fehlenden Kategorien. Kopieren erfolgt bewusst per Clipboard API. Der Generator räumt die Anzeige beim Verlassen der Seite auf.
- Backup-Antworten, Spielstand und Phishing-Fundstellen leben im Arbeitsspeicher der aktuellen Seite. Die Simulation enthält nur anklickbare Texte mit reservierten `.example`-Adressen. Fragen, Hinweise, Ergebnis- und Fehlermeldungen stehen als HTML oder Templates bereit.

### Passwortchecker und WordPress

- `it/passwortcheck/index.html` ist ein eigenständiges Dokument mit einem einzigen CSP-gehashten Inline-Script. Die IT-Seite bettet es ohne `allow-same-origin` und mit `sandbox="allow-scripts"` ein. Das isoliert das Eingabefeld vom DOM der Hauptseite. Die einzige Nachricht an das Elternfenster enthält seine Layout-Höhe. Das Elternfenster prüft Quelle, opaque Origin und Wertebereich.
- Ein bewusster Klick oder eine Tastaturaktivierung leert das Feld, setzt die Maskierung zurück und berechnet den Fingerabdruck lokal mit Web Crypto. SHA-1 ist hier das HIBP-Abfrageformat. Die einzige Abfrage geht als HTTPS-GET mit fünf Hex-Zeichen an `https://api.pwnedpasswords.com/range/` und verwendet `Add-Padding: true`, `credentials: "omit"`, `referrerPolicy: "no-referrer"`, `cache: "no-store"` und `redirect: "error"`. Ein CORS-Preflight ist möglich. Technische Metadaten wie IP-Adresse und Browserkennung fallen bei der Verbindung an.
- Die Hash-Endung und der Treffervergleich bleiben im Frame. Nullzählungen gelten als Padding. Fehler und Zeitüberschreitung haben eigene Zustände. Neue Abfragen brechen vorherige ab, und nur die aktuelle Antwort darf die Oberfläche verändern. Das Tool führt keine Browser-Speicherung und kein Logging durch. Browser-Autofill-Hinweise mindern unbeabsichtigtes Speichern. Die tatsächliche Behandlung kann bei Erweiterungen und Passwortmanagern variieren.
- Die CSP im Frame beginnt mit `default-src 'none'`. Sie erlaubt die gehashte Script-Version, lokale Inline-Stile und nur die HIBP-Range-Verbindung. Sie sperrt Formularübermittlung und Base-URL-Änderungen. Nach Änderungen am Script den SHA-256-Hash der exakten, mit LF normalisierten Zeichen zwischen `<script>` und `</script>` erneuern. HTML-Prozessoren müssen diesen Block bytegetreu ausliefern.
- Für WordPress das Werkzeug als separat ausgeliefertes, schlankes Dokument erhalten, idealerweise auf einem dedizierten Origin mit eigener CSP als HTTP-Header und einer passenden `frame-ancestors`-Freigabe. Das Sandbox-Attribut im Elternfenster beibehalten. Analytics, Werbe-Scripts, Session Recordings und Plugins mit Formular- oder DOM-Zugriff aus dem Checker und seinem Einbettungsbereich heraushalten. Ein ungeprüftes Script im Elternfenster könnte trotz Sandbox die Oberfläche überlagern oder ersetzen. Nach jeder Integrationsänderung DOM-Isolation, CSP, Browser-Speicherung und Requests erneut prüfen.
- Vor dem WordPress-Launch die Datenschutzerklärung um den Zweck, den externen Dienst, das Hash-Präfix und die beim HTTPS-Aufruf entstehenden technischen Metadaten ergänzen. Der direkt am Werkzeug platzierte Hinweis verweist auf Have I Been Pwned.
