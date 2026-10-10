# Projektanweisungen – Reisegruppe Ushaq al-Hussein Deutschland

## 1. Projektziel

Entwicklung und schrittweise Verbesserung einer mobilen Web-App (PWA) für die Kampagne „حملة عشاق الحسين (ع) - ألمانيا“ / „Reisegruppe Ushaq al-Hussein – Deutschland“.

Die App informiert Besucher über Reisen, Pilgerfahrten, Veranstaltungen, Besuchsorte, wichtige Hinweise und Kontaktmöglichkeiten.

Grundsätze:
- Die App soll möglichst kostenlos und öffentlich zugänglich sein.
- Besucher benötigen kein Benutzerkonto und keinen Login.
- Die App soll über einen Link und einen QR-Code erreichbar sein.
- Die Benutzeroberfläche unterstützt ausschließlich Arabisch und Deutsch. Keine englischen UI-Texte hinzufügen.
- Bestehende Funktionen und Inhalte müssen bei Änderungen erhalten bleiben.

## 2. Technologie und Laufzeitumgebung

Verwendeter Technologie-Stack:
- React 19
- TypeScript im Strict Mode
- TanStack Start v1
- Tailwind CSS v4
- Cloudflare Edge / Workers
- GitHub als Repository und Lovable als Entwicklungsumgebung

Wichtige Einschränkungen:
- Keine inkompatiblen Node.js-abhängigen Serverbibliotheken verwenden, insbesondere fs, crypto, stream oder util.
- Keine Bildverarbeitungs- oder Exportbibliotheken einsetzen, die in der Cloudflare-Edge-Umgebung nicht funktionieren.
- Browser-only-Bibliotheken ausschließlich dynamisch im Browser laden, beispielsweise innerhalb von useEffect oder einer reinen Browserfunktion.
- Vor der Installation neuer Abhängigkeiten prüfen, ob sie mit dem vorhandenen Stack kompatibel sind.
- Bestehende Projektkonfigurationen und Abhängigkeiten nicht ohne zwingenden Grund ändern.

## 3. Design und visuelle Identität

Die visuelle Gestaltung orientiert sich an der bestehenden Identität der Kampagne.

Grundregeln:
- Mobile-first-Design.
- Maximale Inhaltsbreite: 420 px.
- Optimierte Darstellung auf Smartphones; Desktop-Darstellung ebenfalls berücksichtigen.
- Übersichtliches, elegantes und ruhiges Design.
- Bevorzugte Farbidentität: Dunkelblau/Indigo (#1a2a5e), Gold (#C8A84B) und helle Creme- bzw. Off-White-Hintergründe.
- Bestehende Komponenten, Abstände, Formen und Designkonventionen möglichst beibehalten.

Farben:
- Keine unnötig hartcodierten Farben wie text-white, bg-black oder beliebige Hex-Farbklassen verwenden.
- Vorhandene semantische Design-Tokens bevorzugen, zum Beispiel:
  - bg-background
  - text-foreground
  - bg-card
  - text-primary
  - text-secondary
  - bg-accent
  - border-border
  - border-secondary
- Die tatsächlich vorhandenen Design-Tokens und Theme-Definitionen vor Änderungen prüfen.
- Keine neuen Farben oder Designsysteme einführen, ohne dass dies erforderlich ist.

## 4. Zweisprachigkeit und Darstellung

Die App ist ausschließlich arabisch-deutsch.

Verbindliche Regeln:
- Arabischer Text steht immer direkt über dem entsprechenden deutschen Text.
- Arabisch und Deutsch nicht nebeneinander darstellen, wenn dadurch die bestehende vertikale Anordnung verletzt wird.
- Vorhandene zweisprachige Komponenten und Datenstrukturen verwenden.
- Für zweisprachige Texte nach Möglichkeit die vorhandene Komponente LangText mit ar/de-Props oder die im Projekt etablierte Struktur mit { ar, de } verwenden.
- Keine unnötigen englischen Beschriftungen, Schaltflächen oder Hinweise hinzufügen.
- Bestehende Übersetzungen nicht eigenmächtig verändern.
- Arabische Texte sorgfältig auf korrekte Schreibweise und RTL-Darstellung prüfen.
- Die Lesbarkeit beider Sprachen auf kleinen Displays sicherstellen.

## 5. Navigation und Benutzeroberfläche

Die Navigation soll einfach und für Pilger und Besucher leicht verständlich sein.

Grundsätze:
- Informationen übersichtlich gruppieren.
- Lange Inhalte bei Bedarf einklappbar darstellen.
- Für aufklappbare Bereiche vorhandene Accordion- oder vergleichbare Komponenten bevorzugen.
- Zustände wie geöffnet, geschlossen, verborgen und bearbeitbar klar darstellen.
- Bedienelemente dürfen auf kleinen Bildschirmen nicht abgeschnitten werden.
- Schaltflächen und Menüs müssen auch auf Smartphones gut erreichbar sein.
- Bestehende Navigation und Interaktionen nicht unnötig verändern.

Bei Positionsänderungen von Symbolen oder Schaltflächen:
- Die bestehende Funktionalität beibehalten.
- Mobile Layouts besonders berücksichtigen.
- Nur die erforderlichen CSS-Klassen ändern.

## 6. Content-Management und Berechtigungen

Die bestehende Content-Management-Struktur muss erhalten bleiben.

Verbindliche Regeln:
- Veränderbare Inhalte werden zentral in SiteContent verwaltet.
- Änderungen an Inhalten werden über den vorhandenen Hook useSaveContent() gespeichert.
- Die bestehende Rollenverwaltung erfolgt über useAdminSession().
- Die Rollen admin und haj müssen entsprechend der vorhandenen Implementierung behandelt werden.
- Der Hook useShowHidden() steuert den Umgang mit ausgeblendeten Inhalten.
- Vorhandene Berechtigungen müssen erhalten bleiben.

Bei Änderungen am Content-Management:
- Keine parallele, unabhängige Datenstruktur für bereits vorhandene Inhalte erstellen.
- Keine bestehende Speicherlogik umgehen.
- Funktionen zum Hinzufügen, Bearbeiten, Löschen und Ausblenden erhalten.
- Keine Berechtigungen erweitern oder entfernen, ohne ausdrücklichen Auftrag.
- Bestehende Daten und gespeicherte Inhalte nicht unbeabsichtigt überschreiben.
- Vor Änderungen die tatsächlichen Typen, Hooks und Datenstrukturen im aktuellen Code prüfen.

## 7. TypeScript und Codequalität

TypeScript Strict Mode ist verbindlich.

Besonders beachten:
- noUncheckedIndexedAccess ist aktiviert.
- Bei Array-Zugriffen berücksichtigen, dass ein Element undefined sein kann.
- Mögliche undefined- und null-Werte korrekt prüfen.
- Vorhandene Typen und Interfaces wiederverwenden.
- Keine unnötigen any-Typen einführen.
- Keine nicht vorhandenen Bibliotheken, Komponenten, Hooks oder Typen voraussetzen.
- Keine doppelten Funktions-, Variablen- oder Komponentendefinitionen erzeugen.
- Imports nach Änderungen überprüfen.
- Bestehende Komponenten und Funktionen nicht unnötig neu schreiben.
- Auf korrekte JSX-Struktur und gültige TypeScript-Syntax achten.

## 8. Regeln für Änderungen am Code

Diese Regeln gelten für jede Codeänderung.

Vor der Änderung:
1. Die aktuelle Version der betroffenen Datei prüfen.
2. Bestehende Komponenten, Imports, Typen und abhängige Funktionen untersuchen.
3. Den genauen Änderungsbedarf feststellen.
4. Prüfen, ob bereits eine geeignete Komponente oder Funktion vorhanden ist.

Während der Änderung:
1. Nur die kleinstmögliche notwendige Änderung durchführen.
2. Ausschließlich die betroffenen Bereiche verändern.
3. Unabhängige Dateien nicht unnötig bearbeiten.
4. Bestehende Funktionen, Berechtigungen, Inhalte und Layouts erhalten.
5. Keine vollständigen Dateien ersetzen, wenn eine gezielte Änderung ausreicht.
6. Keine nicht angeforderten Designänderungen durchführen.

Nach der Änderung:
1. Die Änderung auf Syntax- und Typfehler prüfen.
2. Mögliche Auswirkungen auf benachbarte Komponenten berücksichtigen.
3. Wenn möglich, geeignete Tests oder einen Build ausführen.
4. Genau angeben, welche Datei und welcher Bereich geändert wurden.
5. Die Änderung und ihre Auswirkungen verständlich erklären.
6. Offen angeben, wenn Tests oder Build nicht ausgeführt wurden.

Niemals behaupten, dass ein Build, Test oder eine Bereitstellung erfolgreich war, wenn dies nicht tatsächlich überprüft wurde.

## 9. GitHub, Lovable und Synchronisierung

GitHub und Lovable werden gemeinsam für die Entwicklung verwendet.

Regeln:
- Vor direkten Änderungen über GitHub immer die aktuelle Dateiversion prüfen.
- Bestehende Änderungen und mögliche Konflikte berücksichtigen.
- Keine veralteten Codeversionen zurückschreiben.
- Bei Konflikten zuerst den aktuellen Projektstand untersuchen.
- Nach Änderungen erklären, ob ein Commit erstellt wurde und welche Synchronisierung gegebenenfalls erforderlich ist.
- Nicht behaupten, dass eine Änderung in Lovable, der Live-App oder auf Cloudflare angekommen ist, wenn dies nicht überprüft wurde.
- Bestehende GitHub-Struktur und Projektkonfiguration respektieren.

## 10. Cloudflare und Bereitstellung

Die Anwendung muss mit der bestehenden Cloudflare-Edge-/Workers-Umgebung kompatibel bleiben.

Daher:
- Keine Node.js-spezifischen Serverlösungen voraussetzen.
- Browser- und Servercode sauber voneinander trennen.
- Keine inkompatiblen Laufzeit-APIs verwenden.
- Vor Änderungen an Routing, Rendering oder serverseitiger Logik die bestehende TanStack-Start-Implementierung prüfen.
- Deployment-Konfigurationen nicht ohne zwingenden Grund verändern.
- Zwischen einer Codeänderung, einem erfolgreichen Build und einer tatsächlich aktualisierten Live-App unterscheiden.

## 11. Sicherheit und Datenschutz

- Öffentliche Besucher benötigen keinen Login, sofern die bestehende Architektur dies vorsieht.
- Verwaltungsfunktionen müssen weiterhin durch die vorhandene Berechtigungslogik geschützt sein.
- Keine geheimen Schlüssel, Tokens oder Zugangsdaten in öffentlichen Dateien oder im Client-Code hinterlegen.
- Keine persönlichen oder vertraulichen Daten unbeabsichtigt veröffentlichen.
- Bestehende Sicherheitsmechanismen nicht umgehen.

## 12. Kommunikation und Arbeitsweise

Bei der Unterstützung für dieses Projekt:
- Schrittweise und verständlich vorgehen.
- Technische Erklärungen möglichst klar und praktisch formulieren.
- Bei Änderungen den Dateipfad und den betroffenen Codebereich nennen.
- Bei Unsicherheit zuerst den aktuellen Code untersuchen, statt Annahmen zu treffen.
- Vor größeren oder riskanten Änderungen Rücksprache halten.
- Kleine, überprüfbare Änderungen gegenüber umfassenden Umbauten bevorzugen.
- Bereits funktionierende Bereiche nicht ohne Grund verändern.

## 13. Übergeordnetes Ziel

Die Kampagnen-App soll zuverlässig, benutzerfreundlich, zweisprachig und mobiloptimiert bleiben.

Jede Weiterentwicklung muss die bestehende technische Architektur, die visuelle Identität, die Content-Management-Struktur und die vorhandenen Funktionen respektieren.

**Priorität: Bestehende Funktionen erhalten, Änderungen sorgfältig prüfen und nur das Notwendige verändern.**
