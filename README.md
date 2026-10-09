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

Motion Studio ist im Dev-Server kostenlos zum Inspizieren und visuellen Editieren eingebunden. Das Zurückschreiben der Änderungen in Code benötigt ein Motion-Studio-Abonnement. Die Produktions-Builds enthalten Motion Studio nicht.

## Deployment

`deploy.yml` aktualisiert den Datensnapshot bei Push auf `main`, täglich um 03:17 UTC oder manuell, baut mit dem GitHub-Pages-Basispfad `/global-audience-pulse/` und veröffentlicht `dist/`. Unter Repository → Settings → Pages muss als Quelle **GitHub Actions** gewählt sein.

Die E2E-Spezifikationen liegen in `e2e/`; sie sind absichtlich nicht Teil der Sandbox-Verifikation, weil dafür ein lokaler Server und Browser nötig sind.

## Lizenz

Global Audience Pulse steht unter der [PolyForm Noncommercial License 1.0.0](LICENSE.md). Die Nutzung ist für nichtkommerzielle Zwecke frei; jede kommerzielle Nutzung erfordert die schriftliche Erlaubnis der Urheberin. Weitere Hinweise und Drittanbieter-Lizenzen stehen in [NOTICE.md](NOTICE.md).
