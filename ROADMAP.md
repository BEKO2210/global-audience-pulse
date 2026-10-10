# Roadmap – Global Audience Pulse

Ziel: eine wirklich intelligente Creator-Plattform, deren Intelligenz von **lokalen Modellen auf pop-os**
kommt (RTX 3070, Ollama), ohne Cloud-Kosten, transparent gekennzeichnet (EU AI Act Art. 50).

## So funktioniert diese Liste (ausfallsicher)

- Jede Aufgabe hat eine **eigene Auftragsdatei** in `docs/tasks/T-xxx.md`: Ziel, Kontext, erlaubte Dateien,
  Abnahmekriterien, Prüfbefehle. Sie ist für **jeden** Agenten gleich ausführbar.
- **Agenten-Reihenfolge** pro Aufgabe (Spalte „Agenten“): der erste übernimmt; fällt er aus (Kontingent leer,
  Absturz, schlechtes Ergebnis), nimmt der nächste **dieselbe Datei**. Befehle: [`docs/AGENTS.md`](docs/AGENTS.md).
- **Status** wird nur hier gepflegt: `offen` → `in Arbeit (Agent, Datum)` → `Review` → `erledigt (Commit)`.
  Wer eine Aufgabe abbricht, setzt sie zurück auf `offen` und notiert den Grund in der Auftragsdatei unter „Verlauf“.
- **Abnahme macht immer Claude** (oder Belkis): Agenten ohne Browser können Laufzeitfehler nicht sehen.
  Pflicht vor jedem Merge: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build`,
  E2E Chromium mobil+desktop (2×), Lighthouse-Budget, Screenshots 360/390/1440 px hell+dunkel.
- Eine Aufgabe nach der anderen auf `main`; parallele Arbeit nur in getrennten `git worktree`s mit getrennten Dateien.

Auftragsdateien: T-001, T-002, T-003, T-010, T-011, T-012 liegen bereit; für die übrigen legt der übernehmende Agent die Datei nach dem Muster von `docs/tasks/T-001.md` an, bevor er beginnt.

## Phasen

### Phase A – Lagebericht sichtbar machen (jetzt)

| ID    | Aufgabe                                                                                                                           | Agenten                               | Status                                |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------- |
| T-001 | Lagebericht-Visualisierung v2: Farbe↔Land eindeutig, Ranking-Balken statt Liste, besserer Trend, lesbares Live-Signal             | Antigravity → Cursor → Codex → Claude | erledigt (Antigravity, Review Claude) |
| T-002 | Bericht-Gesundheit: Job-Status (letzter Lauf, Dauer, Versuche, Prüfer-Ablehnungen) als `health.json` + Anzeige in Methodik        | Codex → Cursor → Claude               | offen                                 |
| T-003 | Zeit-Markierung in der Aktivitätsmatrix deutlich sichtbar (Cursor mit Etikett, „jetzt“ getrennt, Städtenamen nicht abgeschnitten) | Cursor → Antigravity → Claude         | erledigt (Cursor, Review/Fix Claude)  |

### Phase B – Lokale Intelligenz vertiefen (Job auf pop-os, `scripts/analysis/`)

| ID    | Aufgabe                                                                                                                                                                                                                         | Agenten                 | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------ |
| T-010 | **Warum ist eine Region gerade auffällig?** Bei Live-Abweichung > 15 %: Wikimedia-Top-Artikel des Vortags der Sprache holen, lokales Modell fasst die Themen in einem Satz zusammen („Brasilien aktiver – Top-Themen: Politik“) | Claude → Codex          | offen  |
| T-011 | **Feiertage & Wochenenden**: Nager.Date (serverseitig, kein CORS im Browser) für alle Länder der Regionen; Modell berücksichtigt sie in Empfehlungen; Anzeige „Feiertag in DE“                                                  | Codex → Cursor → Claude | offen  |
| T-012 | **Lernende Prognose**: Historie (`history.jsonl`) + Wikimedia-Ist-Werte → Abweichung Modell vs. Realität je Region und Stunde; gleitende Korrektur (statistisch, transparent), Modell erklärt die Korrektur                     | Claude → Codex          | offen  |
| T-013 | **Themen-Ideen für Creator**: aus Top-Artikeln je Region per Embeddings (`qwen3-embedding:4b`) sprachübergreifende Themencluster bilden; lokales Modell schlägt 3 Content-Winkel vor (sachlich, keine Personen-Spekulation)     | Claude → Cursor         | offen  |
| T-014 | **Wochenrückblick** (sonntags): beste Zeiten der Woche, Trends, Auffälligkeiten; eigene Kachel + Archiv im Daten-Branch                                                                                                         | Codex → Cursor          | offen  |
| T-015 | **Englische Fassung** des Berichts (gleiche Fakten, gleiche Prüfung) + Sprachumschalter                                                                                                                                         | Codex → Antigravity     | offen  |
| T-016 | **„Frag den Pulse“** (statisch, ohne Server): stündlich vorberechnete Antworten auf häufige Fragen je Zielgruppe („Wann poste ich für DACH?“), geprüft wie der Bericht                                                          | Claude → Codex          | offen  |

### Phase C – Qualität der KI messbar machen

| ID    | Aufgabe                                                                                                                                        | Agenten        | Status |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------ |
| T-020 | **Golden-Set**: 30 eingefrorene Fakten-Snapshots + erwartete Kernaussagen; Skript bewertet Schreiber/Prüfer (Zahlentreue, Widersprüche, Länge) | Claude → Codex | offen  |
| T-021 | **Modell-A/B**: gemma4:12b vs qwen3.5:9b vs Gemma-4-26B-A4B (`gemma26b`) auf dem Golden-Set; Gewinner wird Default                             | Claude         | offen  |
| T-022 | Prüfer-Kalibrierung: falsch-positive Ablehnungen zählen, Prompt/Modell anpassen                                                                | Claude         | offen  |

### Phase D – Plattform & Betrieb

| ID    | Aufgabe                                                                                                                                                                                                                                      | Agenten         | Status |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------ |
| T-030 | Ollama-Upgrade 0.32.5 → 0.40.x (braucht `sudo`, Belkis) + Job-Smoke-Test danach                                                                                                                                                              | Belkis + Claude | offen  |
| T-031 | Ollama nur auf localhost/Tailscale lauschen lassen (Sicherheit)                                                                                                                                                                              | Belkis + Claude | offen  |
| T-032 | Projekte von alten Modellen migrieren (Statim, Prompt_Academy, HeimGeist, brain, Die_Firma, OpenShorts) – je Projekt eigene Aufgabe, Reproduzierbarkeit beachten                                                                             | Claude → Codex  | offen  |
| T-033 | Benachrichtigung bei Job-Ausfall (> 3 h kein Bericht) per ntfy/Telegram an Belkis                                                                                                                                                            | Codex → Claude  | offen  |
| T-034 | **GPU-Koordination**: alle GPU-Jobs (Lagebericht, `review:local`, Reel-Render) nutzen dieselbe Sperre (`flock`, wie der Reel-Render mit `~/reel/gpu.lock`) und warten statt sich zu verdrängen; Befehl `gpu-status` zeigt, wer die Karte hat | Claude          | offen  |

### Phase E – Messen, was Nutzer tun (Plausible, selbst gehostet, rechtssicher maximal)

Rechtlicher Rahmen (Stand 2026-10, Quellen: Plausible-Datenrichtlinie, TDDDG § 25, DSGVO Art. 6/7): Plausible
arbeitet **ohne Cookies/localStorage** und speichert keine IPs (Tages-Hash mit täglich gelöschtem Salt) → **keine
Einwilligung nötig**, Rechtsgrundlage berechtigtes Interesse, Pflicht: Hinweis in der Datenschutzerklärung.
Alles, was **auf dem Gerät speichert oder wiedererkennt** (Cookies, Besucher-IDs über Tage, Session-Replay,
Marketing-Pixel), braucht eine **echte Opt-in-Einwilligung** (gleichwertiger „Ablehnen“-Knopf, jederzeit widerrufbar,
vorher nichts laden).

| ID    | Aufgabe                                                                                                                                                                                                                                                                                                                                                                                                                  | Agenten                      | Status                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- | ------------------------------- |
| T-040 | Plausible (selbst gehostet) cookielos einbinden: Seitenaufrufe + **benannte Ereignisse** für jede Funktion (Zeitregler genutzt, 24 h/7 T, Gewichtung, Zielgruppe an/aus, Planer-Tab, .ics-Download, Plan kopieren, Teilen, Bericht aufgeklappt, Theme, Rechtsseiten, ausgehende Links, 404) mit Properties (Region, Horizont, Gerätegröße) + **Web Vitals** (LCP/CLS/INP als Ereignis-Properties); Datenschutz-Abschnitt | Codex → Cursor → Claude      | erledigt (Codex, Review Claude) |
| T-041 | Einwilligungs-Banner (eigener, schlanker, kein Fremdanbieter) nur für **optionale** Messung: wiederkehrende Besucher & Bindung über Tage (Plausible-Custom-Property mit zufälliger ID in localStorage **nur nach Opt-in**), Widerruf im Footer, Einwilligung versioniert; ohne Opt-in bleibt alles cookielos                                                                                                             | Codex → Antigravity → Claude | offen                           |
| T-042 | Plausible-Ziele & Trichter: „Erstbesuch → Zeitregler → Planer → .ics“; Dashboard-Links für Belkis                                                                                                                                                                                                                                                                                                                        | Claude                       | offen                           |
| T-043 | **Lokales LLM liest die Statistik** (Plausible Stats API, nur auf pop-os): wöchentlicher Bericht „Was Nutzer tun, was hakt, was wir verbessern sollten“ → schreibt Vorschläge als neue Aufgaben in diese Roadmap (Status `vorgeschlagen`)                                                                                                                                                                                | Claude → Codex               | offen                           |

### Phase F – Lokale LLMs im Entwickler-Team (kostenlos, unbegrenzt)

| ID    | Aufgabe                                                                                                                                                                                                                           | Agenten        | Status                       |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------- |
| T-050 | **Lokaler Coding-Agent** ins Runbook: OpenCode mit `ornith:9b-agent32k` (Tool-Calling, 60 t/s) für kleine, klar umrissene Aufgaben (Texte, CSS-Feinschliff, Tests ergänzen); feste Prompt-Vorlage, Abnahme wie immer durch Claude | Claude         | erledigt (OpenCode + Claude) |
| T-051 | **Lokaler Review-Bot**: Skript `scripts/dev/local-review.mjs` – `git diff main...` → `qwen3.5:9b` (zweite Meinung: Bugs, A11y, harte Zahlen) → `REVIEW-LOCAL.md`; läuft vor jedem Merge zusätzlich zu Copilot                     | Claude → Codex | erledigt (Claude)            |
| T-052 | **Lokaler Test-Schreiber**: für geänderte Module Vitest-Fälle vorschlagen (ornith), Claude übernimmt nur, was echte Fehler fangen würde                                                                                           | Claude         | offen                        |
| T-053 | **Übersetzungen & Texte** durch lokale Modelle (EN-Fassung der UI, Alt-Texte, Meta-Beschreibungen), Prüfung durch zweites Modell                                                                                                  | Codex → Claude | offen                        |

### Phase G – Noch mehr automatische Intelligenz auf der Seite

| ID    | Aufgabe                                                                                                                                                | Agenten             | Status |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ------ |
| T-017 | **Kurz-Erklärung unter jeder Grafik** (stündlich vom lokalen Modell, geprüft): Karte, Prognose, Heatmap, Rad – je ein Satz „was man hier gerade sieht“ | Claude → Codex      | offen  |
| T-018 | **Empfehlung je Zielgruppe & Region** vorab berechnet (alle Presets + jede Einzelregion), Seite zeigt passend zur Auswahl                              | Claude → Codex      | offen  |
| T-019 | **Auffälligkeits-Hinweis** oben (nur bei echter Anomalie, z. B. Live-Signal > 25 % oder Feiertag): ein Satz + Link zum Bericht                         | Codex → Antigravity | offen  |

### Phase H – UI/UX-Feinschliff auf allen Geräten

| ID    | Aufgabe                                                                                                                                                                                                                                                                                                                                                                                                                      | Agent (Reihenfolge)  | Status |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------ |
| T-060 | **Alles in seinem Feld mittig**: Index-Zahl im Hero (`60/100`), Score + Status in der Zeitleiste unten, Status-Badges, Kennzahlen in Kacheln und Karten – horizontal und vertikal zentriert in ihrem Feld, auf 360/390/430/768/1024/1440 px, hoch und quer. Keine Leerfläche über der Hero-Überschrift (Screenshot Belkis 2026-10-10, Tablet/Querformat). E2E: Mittelpunkt der Zahl = Mittelpunkt des Felds ± 2 px je Breite | Antigravity → Cursor | offen  |
| T-061 | **Gleiche Schriftgröße in allen Diagrammen**: SVG-Text wächst/schrumpft mit der Breite (Prognose-Achsen auf Tablet ≈ 5 px, Trend-Beschriftung riesig). Diagramm-Text in festen px (11–14 px) über ResizeObserver bzw. HTML-Beschriftung; Karte: Städtenamen lesbar oder nur bei Fokus                                                                                                                                        | Antigravity → Cursor | offen  |
| T-062 | **Tablet/Querformat-Raster** (768–1024 px): Hero zweispaltig ohne Lücke, Karte und Prognose gleich hoch, Lagebericht nutzt die Breite (zwei Spalten), Zeitleiste unten nicht gestaucht                                                                                                                                                                                                                                       | Cursor → Antigravity | offen  |
| T-063 | **Neue Version sofort sichtbar**: nach Deploy sehen offene Tabs/PWA noch den alten Stand (Screenshot zeigte altes Trend-Diagramm). Dezenter Hinweis „Neue Version – neu laden“ oder automatischer Reload, wenn nichts gezogen wird                                                                                                                                                                                           | Codex → Claude       | offen  |
| T-064 | **Logo animiert, auf hohem Niveau**: Signet als SVG; einmalige Einblend-Choreografie (≤ 1,2 s) und danach ein ruhiger Puls im Takt des Scores. Keine Endlos-Effekte, `prefers-reduced-motion` = statisch, kein Einfluss auf LCP/CLS                                                                                                                                                                                          | Antigravity → Cursor | offen  |

### Phase I – Das beste Instrument für Creator

Recherchiertes Wissen, fest eingebaut und mit Quellen belegt – keine Live-Trends.

| ID    | Aufgabe                                                                                                                                                                                                                                                                                                 | Agent (Reihenfolge)     | Status                                            |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------- |
| T-070 | **Plattform-Playbooks**: je Plattform (X, LinkedIn, YouTube, TikTok, Instagram, Threads, Reddit, Substack, GitHub, Hacker News) belegte Algorithmus-Signale, beste Zeiten, Formate, Frequenz – jede Aussage mit Quelle und Datum, sichtbarer Stand; recherchiert per Haiku-Workflow, geprüft von Claude | Claude (Haiku-Workflow) | in Arbeit                                         |
| T-071 | Live-Recherche aus Nachrichten-/Trend-Feeds                                                                                                                                                                                                                                                             | –                       | verworfen 2026-10-10 (Quellen nicht sauber genug) |
| T-072 | **„Was & wann posten“**: Playbooks + aktuelles Zeitfenster (Score) + Zielgruppe → konkrete Empfehlung je Plattform                                                                                                                                                                                      | Claude → Codex          | offen                                             |
| T-073 | **Meine Plattformen** auf der Seite: Auswahl lokal im Browser gespeichert, kein Login; Empfehlungen filtern danach                                                                                                                                                                                      | Antigravity → Cursor    | offen                                             |
| T-077 | **Visuelle KI-Auswertungen**: zu jeder Grafik eine kurze, geprüfte Deutung (T-017)                                                                                                                                                                                                                      | Antigravity → Codex     | offen                                             |

## Regeln, die für alle Aufgaben gelten

- Alles Sichtbare live berechnet, keine fest eingetragenen Zahlen/Zeiten.
- KI-Text immer sichtbar „Automatische AI-Analyse“ + maschinenlesbar markiert; jede Zahl gegen Daten geprüft.
- Mobile first (360–430 px), keine horizontale Überlauf, Touch-Ziele ≥ 44 px, WCAG AA in hell und dunkel.
- Spät geladene Inhalte nie oberhalb sichtbarer Inhalte einfügen (CLS).
- Lizenz PolyForm Noncommercial; neue Abhängigkeiten nur mit kompatibler Lizenz, in NOTICE.md vermerken.
