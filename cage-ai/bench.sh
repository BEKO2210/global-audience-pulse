#!/usr/bin/env bash
# Run the AI-eyes bench for every model given (default: the local vision+tools candidates) and print the table.
# Uses the GPU lock (scripts/dev/gpu-lock.sh); needs a fresh `npm run build`.
set -u
cd "$(dirname "$0")/.."
MODELS=("$@")
[ ${#MODELS[@]} -eq 0 ] && MODELS=(qwen3.5:9b-agent32k qwen3.5:4b gemma4:e4b-it-qat gemma4:12b-it-qat)
for m in "${MODELS[@]}"; do
  echo "== $m"
  E2E_TELEMETRY_DISABLED=1 E2E_MODEL="$m" scripts/dev/gpu-lock.sh -w 1800 -- npx e2e run cage-ai/look.e2e.ts >"cage-ai/results/run-${m//[:\/]/_}.log" 2>&1
  ollama stop "$m" >/dev/null 2>&1 || true
done
node cage-ai/summary.mjs
