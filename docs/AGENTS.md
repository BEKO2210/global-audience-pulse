# Agenten-Runbook (pop-os)

Jede Aufgabe `docs/tasks/T-xxx.md` läuft mit jedem dieser Agenten gleich. Immer in einem eigenen Worktree:

```bash
cd ~/Schreibtisch/"My WorkSpace"/global-audience-pulse
git worktree add -b task/T-xxx ../gap-T-xxx main
ln -s "$PWD/node_modules" ../gap-T-xxx/node_modules
cd ../gap-T-xxx
```

Allen Agenten wird derselbe Zaun mitgegeben (steht oben in jeder Auftragsdatei): nur die genannten Dateien
ändern, keine Git-Zustandsänderungen, Bericht in `REPORT-T-xxx.md`.

| Agent                                      | Befehl (aus dem Worktree)                                                                                                                                                                               | Hinweise                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Antigravity (Gemini 3.8 Flash High)        | `agy -p "$(cat docs/tasks/T-xxx.md)" --model gemini-3.8-flash-high --dangerously-skip-permissions --output-format text > ../agy-T-xxx.log 2>&1`                                                         | gut für Visuelles; kein Subagent-Spawn                                   |
| Cursor (composer-2.5, im Pro-Plan)         | `P="$(cat docs/tasks/T-xxx.md)"; cursor-agent -p --trust -f --model composer-2.5 --output-format text "$P" > ../cursor-T-xxx.log 2>&1`                                                                  | nie `--model auto` oder fremde Modelle (Kosten)                          |
| Codex (gpt-5.6-sol, medium)                | `codex exec -C . -s workspace-write -c sandbox_workspace_write.network_access=true -m gpt-5.6-sol -c model_reasoning_effort=medium -o CODEX-T-xxx.md - < docs/tasks/T-xxx.md > ../codex-T-xxx.log 2>&1` | kein localhost/Browser in der Sandbox; Kontingent-Resets nie verbrauchen |
| Grok 4.7                                   | `grok --prompt-file docs/tasks/T-xxx.md -m grok-4.7 --permission-mode bypassPermissions --deny 'Bash(rm *)' --deny 'Bash(git commit*)' --max-turns 300 --output-format plain > ../grok-T-xxx.log 2>&1`  | Wochenkontingent beachten; „do not use spawn_subagent“                   |
| OpenCode lokal (`ornith:9b-agent32k`, GPU) | `OPENCODE_CONFIG=docs/opencode-agent.json opencode run --auto -m ollama/ornith:9b-agent32k "$(cat docs/tasks/T-xxx.md)" > ../opencode-T-xxx.log 2>&1`                                                   | kostenlos, nur kleine mechanische Aufgaben; siehe „Lokaler Agent“ unten  |
| Claude (Sonnet-Subagent oder Hauptsession) | Aufgabe direkt bearbeiten                                                                                                                                                                               | macht immer die Abnahme                                                  |

## Lokaler Agent (T-050)

OpenCode mit `ornith:9b-agent32k` auf der RTX 3070, ohne Kosten. `docs/opencode-agent.json` verbietet zusätzlich zu
`~/.config/opencode/opencode.json` Git-Zustandsänderungen, `npm install` und `npx`; `--auto` genehmigt den Rest.

- **Geeignet:** Code verschieben/umbenennen, Texte, CSS-Feinschliff, Muster nachbauen.
- **Nicht geeignet:** Tests mit erwarteten Werten, Logik, alles ohne Vorbild im Repo.
- **Vorlage:** Zaun mit exakten Dateinamen (inkl. Endung `.test.ts`), konkrete Eingaben → erwartete Ausgaben
  vorgeben statt „aus dem Code ableiten“, Abschluss-Befehl nennen.
- **Abnahme:** Erfolgsmeldungen des Modells nie übernehmen. Claude prüft `git status`, liest jede Datei und führt
  die Checks selbst aus. Probeaufgabe T-050a: Verschiebung korrekt, aber Testdatei `ago_test.ts` (lief nie),
  falsche Erwartung (`2880 Min` = „1 Tagen“) und „alle Tests grün“ erfunden.

## Ausfall-Regel

1. Agent liefert nichts / Fehler / Kontingent leer → Eintrag unter „Verlauf“ in der Auftragsdatei
   (`2026-10-10 Antigravity: abgebrochen, Grund …`), Worktree zurücksetzen (`git checkout -- . && git clean -fd`
   im Worktree), nächster Agent laut ROADMAP-Spalte.
2. Teilergebnis brauchbar → committen im Task-Branch, nächster Agent setzt mit „Verlauf: was fehlt“ fort.
3. Nach zwei gescheiterten Agenten übernimmt Claude selbst.

## Abnahme (Claude)

```bash
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
npx vite preview --port 4317 --strictPort &   # danach:
npx playwright test --project=chromium-desktop --project=chromium-mobile   # 2× hintereinander
# WebKit: docker run --rm --user $(id -u):$(id -g) -e HOME=/tmp --network host --ipc=host -v "$PWD":/work -w /work \
#   -e E2E_WEBKIT=1 -e E2E_BASE_URL=http://localhost:4317/global-audience-pulse/ mcr.microsoft.com/playwright:v1.64.0-noble \
#   npx playwright test --project=webkit-mobile --output=/tmp/pw
# Lighthouse: node scripts/prepare-lhci.mjs && CHROME_PATH=… npx @lhci/cli autorun
```

Danach Screenshots 360/390/1440 px hell+dunkel ansehen, Merge auf `main`, Push, CI + Deploy + Live-Smoke prüfen,
Status in ROADMAP.md auf `erledigt (Commit)`.
