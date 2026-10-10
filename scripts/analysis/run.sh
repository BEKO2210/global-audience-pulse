#!/usr/bin/env bash
# Hourly Lagebericht on pop-os (systemd user timer gap-analysis.timer):
# update a dedicated clone, compute + write the report with the local LLM, publish analysis.json
# as the single commit of the `live-analysis` branch (the page reads it from raw.githubusercontent).
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"

BASE="$HOME/.local/share/gap-live"
REPO="$BASE/repo"
OUT="$BASE/out"
BRANCH_DIR="$BASE/branch"
mkdir -p "$OUT"

cd "$REPO"
git fetch -q origin main
before=$(git rev-parse HEAD:package-lock.json 2>/dev/null || echo none)
git reset -q --hard origin/main
after=$(git rev-parse HEAD:package-lock.json)
if [ ! -d node_modules ] || [ "$before" != "$after" ]; then
  npm ci --ignore-scripts --no-audit --no-fund --loglevel=error
fi

run_started=$(date -u +%FT%TZ)
npx esbuild scripts/analysis/health.ts --bundle --platform=node --format=esm --target=node22 \
  --outfile="$OUT/health.mjs" --log-level=warning

set +e
npx esbuild scripts/analysis/hourly.ts --bundle --platform=node --format=esm --target=node22 \
  --outfile="$OUT/hourly.mjs" --log-level=warning
code=$?
if [ "$code" -eq 0 ]; then
  node "$OUT/hourly.mjs" "$OUT/analysis.json" "$OUT/history.jsonl"
  code=$?
fi
set -e
run_ended=$(date -u +%FT%TZ)
if [ "$code" -eq 0 ]; then
  outcome=published
  analysis_arg="$OUT/analysis.json"
elif [ "$code" -eq 3 ]; then
  outcome=skipped-gpu
  analysis_arg=-
else
  outcome=failed
  analysis_arg=-
fi

if [ ! -d "$BRANCH_DIR/.git" ] && [ ! -f "$BRANCH_DIR/.git" ]; then
  git worktree prune
  if git ls-remote --exit-code --heads origin live-analysis >/dev/null; then
    git fetch -q origin live-analysis
    git worktree add -f "$BRANCH_DIR" -B live-analysis origin/live-analysis
  else
    git worktree add -f --detach "$BRANCH_DIR"
    (cd "$BRANCH_DIR" && git checkout -q --orphan live-analysis && git rm -rqf --cached . && git clean -fdxq)
  fi
fi

node "$OUT/health.mjs" "$BRANCH_DIR/health.json" "$OUT/health.json" "$outcome" \
  "$analysis_arg" "$run_started" "$run_ended"

cd "$BRANCH_DIR"
if [ "$outcome" = published ]; then
  cp "$OUT/analysis.json" analysis.json
  [ -f "$OUT/history.jsonl" ] && cp "$OUT/history.jsonl" history.jsonl
fi
cp "$OUT/health.json" health.json
cat > README.md <<'EOF'
Automatisch erzeugter Lagebericht für Global Audience Pulse (stündlich von einem lokalen Modell
auf dem Rechner des Betreibers, nur solange dieser läuft). Wird bei jedem Lauf überschrieben.
EOF
git add health.json README.md
if [ "$outcome" = published ]; then
  git add analysis.json
  [ -f history.jsonl ] && git add history.jsonl
fi
# One commit only: amend and force-push so the data branch never grows.
if git rev-parse -q --verify HEAD >/dev/null; then
  git -c user.name="Global Audience Pulse Bot" -c user.email="nullmesh@protonmail.com" \
    commit -q --amend -m "Lagebericht $(date -u +%FT%TZ)"
else
  git -c user.name="Global Audience Pulse Bot" -c user.email="nullmesh@protonmail.com" \
    commit -q -m "Lagebericht $(date -u +%FT%TZ)"
fi
git push -q -f origin live-analysis
echo "$outcome: $(date +%T)"
if [ "$code" -eq 3 ]; then exit 0; fi
if [ "$code" -ne 0 ]; then exit "$code"; fi
