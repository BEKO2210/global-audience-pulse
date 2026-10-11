# Roadmap Optik – Global Audience Pulse

Ab 2026-10-11 geht es nur noch um das Aussehen: jede Fläche auf dem Niveau eines Premium-Produkts (Apple/Samsung-
Präzision), symmetrisch, im diagram-design-System. Funktionen bleiben, wie sie sind; Inhalt und Zahlen ändern sich
nicht. Die Funktions-Roadmap ist abgeschlossen (`ROADMAP.md`, nur T-085 wartet auf Daten).

## Team und Ablauf

| Wer                                       | Rolle                                                                                                                             |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Claude**                                | Plant, schreibt die Aufträge, macht Screenshots/Messungen (360/768/1440 px, hell/dunkel), prüft axe, Lighthouse, Tastatur, merged |
| **Codex** (`gpt-5.6-sol`, medium)         | Design-System und Code mit vielen Dateien (Tokens, Typo-Skala, Button-System)                                                     |
| **Antigravity** (`gemini-3.8-flash-high`) | Sicht-Kritik anhand der Screenshots, Diagramm-Feinschliff, Dunkelmodus                                                            |
| **Cursor** (`composer-2.5`)               | Einzelne Komponenten mit klarer Dateigrenze                                                                                       |

Jeder Helfer arbeitet in einem eigenen `git worktree` mit fester Dateigrenze; nichts geht ohne Claudes
Laufzeitprüfung (Screenshots vorher/nachher, e2e, axe, Lighthouse) nach `main`. Immer eine Aufgabe nach der
anderen fertig, höchstens zwei Helfer parallel mit getrennten Dateien.

## Regeln für jede Änderung

- diagram-design: eine Tintenrampe, Akzent nur für das Wichtigste, Haarlinien, 4-px-Raster.
- Bewegung: ein Reveal je Bereich, ≤ 8 px, 0,48 s, Kurve `[0.2,0.8,0.2,1]`, keine Federn, `prefers-reduced-motion`.
- 360 px ohne horizontalen Überlauf, Touch-Ziele ≥ 24 px (Buttons 36–44 px), WCAG 2.2 AA hell und dunkel.
- Kein Layout-Sprung (CLS), Lighthouse mobil ≥ 0,85 (CI) – lokal Ziel ≥ 0,95.
- Beide Sprachen prüfen: Englisch ist oft länger.

## Messung 2026-10-11 (O-001, berechnete Styles aller sichtbaren Elemente)

Geprüft gegen die installierten Skills `vectorlab-ux-skills` (typography, spacing, colour-palette, anti-slop),
`consistent-ui`, `frontend-design`, `ui-ux-pro-max`.

| Regel                 | Ziel                         | Seite (mobil / Desktop)                                                  |
| --------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| Schriftgrößen         | ~8 Stufen einer Skala        | 24 / 26 verschiedene                                                     |
| Text unter 12 px      | 0                            | 294 / 340 Elemente (8–11 px: Eyebrows, Status, Achsen, Badges, Legenden) |
| Schriftstärken        | 3 (400/500/600)              | 5 (400, 500, 600, 650, 700)                                              |
| Abstände              | 4/8-px-Raster                | 6 px ×300, 14, 10, 5, 3, 7, 18, 22 px                                    |
| Zeilenlänge Fließtext | ≤ 70ch                       | Methodik 108ch, Grenzen 140ch, Bericht-Hinweis 224ch                     |
| Zeilenhöhe            | Text 1,5–1,6, Titel 1,1–1,25 | 25 Abweichungen (Kleintext mit 1,0–1,2)                                  |

**Vorgabe (Claude) für O-002:** Größen 12 · 14 · 16 · 20 · 24 · 32 · 40 · 56 px (+ Anzeige-Zahlen); 12 px nur für
Meta (Eyebrow, Achsen, Legenden, Zeitstempel); Stärken 400 · 500 · 600; Zeilenhöhe Titel 1,15, Text 1,55, Meta 1,4;
Abstände 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64; Fließtext `max-width: 68ch`.

## Aufgaben

| ID    | Aufgabe                                                                                                                                                           | Wer                  | Status    |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------- |
| O-001 | **Sicht-Audit**: Screenshots aller Bereiche (360/768/1440, hell/dunkel, DE/EN) → Antigravity bewertet gegen die Regeln → priorisierte Befundliste in dieser Datei | Claude → Antigravity | in Arbeit |
| O-002 | **Typografie und Rhythmus**: eine Typo-Skala (Eyebrow, H2, Fließtext, Mono-Zahlen) und vertikale Abstände auf dem 4-px-Raster für alle Abschnitte                 | Codex                | offen     |
| O-003 | **Ein Button- und Chip-System**: Kalender, Erinnern, Ansehen, Plattform-Chips, Fragen, Sprach-/Theme-Schalter aus denselben Tokens (Höhe, Rand, aktiv, Fokus)     | Codex                | offen     |
| O-004 | **Hero auf Premium-Niveau**: Score, Status, Fenster-Karte, Aktionen – Symmetrie, Gewichtung, Abstände, mobil und Desktop                                          | Cursor               | offen     |
| O-005 | **Header mobil**: Wortmarke, Live-Punkt, DE/EN, Theme als eine ruhige Steuergruppe                                                                                | Cursor               | offen     |
| O-006 | **Diagramme aus einem Guss**: Achsen, Beschriftungen, Legenden, Linienstärken in Prognose, Heatmap, Rad, Trend, Wochenbalken, Pipeline                            | Antigravity          | offen     |
| O-007 | **Dunkelmodus-Feinschliff**: Flächen, Haarlinien, Akzent-Kontrast, Diagramm-Rampen                                                                                | Antigravity          | offen     |
| O-008 | **Bewegungskonzept**: ein orchestrierter Auftritt je Bereich, verstreute Effekte entfernen, einheitliche Dauer                                                    | Codex                | offen     |
| O-009 | **Lade- und Leerzustände**: ruhige Platzhalter in Endgröße (kein Springen), klare Leertexte                                                                       | Codex                | offen     |
| O-010 | **Englisches Vorschaubild** und og:image je Sprache (aus T-082)                                                                                                   | Cursor               | offen     |
| O-011 | **Planer-Einstieg** sichtbar aus Hero und „Frag den Pulse“ (aus T-083)                                                                                            | Cursor               | offen     |
| O-012 | **Abnahme-Runde** nach jedem Merge und am Ende: 360 px, dunkel, axe, Lighthouse, Tastatur, beide Sprachen (aus T-084)                                             | Claude               | laufend   |
