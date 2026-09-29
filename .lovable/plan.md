# Welcome Screen und zentrales Admin-Control-Panel

## Umsetzung
- Einen bildfüllenden Welcome Screen im ausgewählten Stil „Celestial Night Elegance“ vor die bestehende App setzen: religiöses Reisemotiv, Navy-Overlay, goldene Rahmung, flexibler Logo-Container, korrektes Branding, Zitat und beide Slogans.
- Drei Sprachoptionen (Arabisch, Deutsch, Englisch) anbieten, die Auswahl lokal speichern und beim Start mit einer sanften Animation in das bestehende Dashboard wechseln.
- Das zuletzt hochgeladene transparente Kampagnenlogo für den Welcome Screen verwenden; bestehende App- und PWA-Icons unverändert lassen.
- Kontakt-Sichtbarkeit im verwalteten Inhalt ergänzen: gesamter Kontaktbereich sowie jeder einzelne Kontakt können separat ein- oder ausgeblendet werden. Verborgene Kontakte erscheinen weder in „Kontakt“ noch bei Notfallnummern.
- Die Verwaltungsseite als übersichtliches Control-Panel mit Navigation zu allen vorhandenen Inhaltsbereichen strukturieren: Eilmeldung, Reisen, Tagesprogramm, Kontakte, Hotels/Orte, Programm/Visum, Zahlung, Nachrichten, Ziyarat/Duas und Passwort.
- Bestehende Bearbeitungs-, Offline- und Push-Funktionen erhalten; neue Sichtbarkeitswerte bleiben mit älteren gespeicherten Daten kompatibel.

## Technische Details
- Welcome-Zustand und Sprache werden nur auf dem Gerät gespeichert; es sind keine Nutzerkonten nötig.
- Neue Kontaktfelder werden im zentralen `site_content`-Datensatz validiert und gespeichert.
- Abschlussprüfung auf Telefon- und Desktopgröße, einschließlich Welcome-Übergang, Sprachwahl, ausgeblendeter Kontakte und Admin-Navigation.
