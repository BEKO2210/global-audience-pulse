#!/usr/bin/env bash
# Model A/B on the golden set (T-021). Ollama models run case by case, each through the shared GPU lock, so the
# hourly job can slip in between; gemma26b (llama-server, ~/bin/gemma26b) holds the lock for its whole run.
#   scripts/analysis/golden-run.sh <out.jsonl> [models…]
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT=${1:?out.jsonl}
shift || true
MODELS=("${@:-gemma4:12b-it-qat qwen3.5:9b gemma26b}")
read -r -a MODELS <<<"${MODELS[*]}"
BUNDLE=$(mktemp --suffix=.mjs)
npx esbuild scripts/analysis/golden-eval.ts --bundle --platform=node --format=esm --outfile="$BUNDLE" --log-level=warning
LOCK=scripts/dev/gpu-lock.sh
for model in "${MODELS[@]}"; do
  if [ "$model" = gemma26b ]; then
    "$LOCK" -w 1800 -- bash -c '
      "$HOME/bin/gemma26b" >/tmp/gemma26b-golden.log 2>&1 &
      pid=$!
      trap "kill $pid 2>/dev/null; wait $pid 2>/dev/null" EXIT
      for _ in $(seq 120); do curl -sf http://127.0.0.1:8081/health >/dev/null && break; sleep 2; done
      WRITER_URL=http://127.0.0.1:8081 node "$0" gemma26b 0 30 "$1"
    ' "$BUNDLE" "$OUT"
  else
    for i in $(seq 0 29); do
      "$LOCK" -w 1800 -- node "$BUNDLE" "$model" "$i" "$((i + 1))" "$OUT"
    done
  fi
done
rm -f "$BUNDLE"
