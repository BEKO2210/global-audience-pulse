# Global Audience Pulse

Eine mobile-first Weltuhr für Creator: Sie zeigt live, welche regionalen Zielgruppen wach und aufnahmefähig sind, berechnet kommende Posting-Fenster und macht die zugrunde liegenden Daten transparent.

## Daten

- **Weltbank:** `SP.POP.TOTL` und `IT.NET.USER.ZS` ergeben die geschätzte Zahl der Internetnutzer je Region und damit die Gewichte.
- **Wikimedia:** stündliche Pageviews der letzten 28 Tage bilden DST-korrekte Werktag-/Wochenendprofile. Im Browser werden zusätzlich die letzten rund 48 Stunden für die Live-Abweichung geladen.
- **Modell:** Regionen ohne geeigneten Wikipedia-Proxy nutzen eine kontinuierliche Aufmerksamkeitskurve. Englischsprachige Wikipedia wird für USA/UK nicht verwendet, weil sie Zeitzonen vermischt.

Bei einem Fetch-Fehler bleibt der eingecheckte Snapshot erhalten. Browser-Storage ist optional und vollständig mit Fehlerbehandlung umschlossen.

## Lokal starten

```bash
npm install
npm run fetch-data
npm run dev
```

Qualitätschecks:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Tests

Die Unit-Tests prüfen Modell, Zeitzonen, Solarberechnung und Snapshot-Parsing. Die browserbasierte Suite baut auf [Playwright](https://github.com/microsoft/playwright), [Axe](https://github.com/dequelabs/axe-core-npm) und [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) auf.

```bash
# lokaler Produktions-Build + Chromium-Suite
npm run build
npm run e2e

# optional zusätzlich WebKit (benötigt lokal passende Systembibliotheken)
E2E_WEBKIT=1 npm run e2e

# gegen die veröffentlichte Seite, ohne lokalen Preview-Server
E2E_BASE_URL=https://beko2210.github.io/global-audience-pulse/ npm run e2e

# mobile Lighthouse-Budgets gegen dist/
npm run build
npm run lighthouse
```

Die fokussierten Specs decken Start/Metadaten und Assets (`smoke`), responsive Geometrie (`layout`), Uhrzeit, Scrubbing und DST (`live`), Snapshot-/API-Ausfälle (`data`), persistente Bedienfunktionen und Exporte (`features`), Axe und Tastaturführung (`a11y`) sowie artefaktbasierte Screenshots ohne Pixel-Gate (`visual`) ab. `e2e-live.yml` führt die Live-Smoke-Suite alle sechs Stunden aus.

Motion Studio ist im Dev-Server kostenlos zum Inspizieren und visuellen Editieren eingebunden. Das Zurückschreiben der Änderungen in Code benötigt ein Motion-Studio-Abonnement. Die Produktions-Builds enthalten Motion Studio nicht.

## Deployment

`deploy.yml` aktualisiert den Datensnapshot bei Push auf `main`, täglich um 03:17 UTC oder manuell, baut mit dem GitHub-Pages-Basispfad `/global-audience-pulse/` und veröffentlicht `dist/`. Unter Repository → Settings → Pages muss als Quelle **GitHub Actions** gewählt sein.

Die E2E-Spezifikationen liegen in `e2e/`. CI lädt die HTML-, Trace- und visuellen Berichte als Artefakte hoch; nach einem Pages-Deployment muss die Live-Smoke-Suite erfolgreich sein.

## Drittanbieter

- `flag-icons` 7.5 (MIT) für die regionalen SVG-Flaggen.
- `@phosphor-icons/react` (MIT) für konsistente UI- und Phasen-Symbole.
- `sharp` erzeugt die PNG-App- und Social-Media-Assets aus den eingecheckten SVG-Quellen (`npm run icons`).
- `@axe-core/playwright` 4.13 (MPL-2.0) prüft die Browseransichten auf schwerwiegende Barrieren.
- `@lhci/cli` 0.15 (Apache-2.0) kontrolliert Performance-, Accessibility-, Best-Practice-, SEO- und JavaScript-Budgets.

## Lizenz

Global Audience Pulse steht unter der [PolyForm Noncommercial License 1.0.0](LICENSE.md). Die Nutzung ist für nichtkommerzielle Zwecke frei; jede kommerzielle Nutzung erfordert die schriftliche Erlaubnis der Urheberin. Weitere Hinweise und Drittanbieter-Lizenzen stehen in [NOTICE.md](NOTICE.md).
