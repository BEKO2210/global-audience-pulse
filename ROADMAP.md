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

Auftragsdateien: T-001, T-010, T-011, T-012 liegen bereit; für die übrigen legt der übernehmende Agent die Datei nach dem Muster von `docs/tasks/T-001.md` an, bevor er beginnt.

## Phasen

### Phase A – Lagebericht sichtbar machen (jetzt)

| ID    | Aufgabe                                                                                                                    | Agenten                               | Status                                |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------- |
| T-001 | Lagebericht-Visualisierung v2: Farbe↔Land eindeutig, Ranking-Balken statt Liste, besserer Trend, lesbares Live-Signal      | Antigravity → Cursor → Codex → Claude | erledigt (Antigravity, Review Claude) |
| T-002 | Bericht-Gesundheit: Job-Status (letzter Lauf, Dauer, Versuche, Prüfer-Ablehnungen) als `health.json` + Anzeige in Methodik | Codex → Cursor → Claude               | offen                                 |

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

| ID    | Aufgabe                                                                                                                                                          | Agenten         | Status |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------ |
| T-030 | Ollama-Upgrade 0.32.5 → 0.40.x (braucht `sudo`, Belkis) + Job-Smoke-Test danach                                                                                  | Belkis + Claude | offen  |
| T-031 | Ollama nur auf localhost/Tailscale lauschen lassen (Sicherheit)                                                                                                  | Belkis + Claude | offen  |
| T-032 | Projekte von alten Modellen migrieren (Statim, Prompt_Academy, HeimGeist, brain, Die_Firma, OpenShorts) – je Projekt eigene Aufgabe, Reproduzierbarkeit beachten | Claude → Codex  | offen  |
| T-033 | Benachrichtigung bei Job-Ausfall (> 3 h kein Bericht) per ntfy/Telegram an Belkis                                                                                | Codex → Claude  | offen  |

## Regeln, die für alle Aufgaben gelten

- Alles Sichtbare live berechnet, keine fest eingetragenen Zahlen/Zeiten.
- KI-Text immer sichtbar „Automatische AI-Analyse“ + maschinenlesbar markiert; jede Zahl gegen Daten geprüft.
- Mobile first (360–430 px), keine horizontale Überlauf, Touch-Ziele ≥ 44 px, WCAG AA in hell und dunkel.
- Spät geladene Inhalte nie oberhalb sichtbarer Inhalte einfügen (CLS).
- Lizenz PolyForm Noncommercial; neue Abhängigkeiten nur mit kompatibler Lizenz, in NOTICE.md vermerken.
