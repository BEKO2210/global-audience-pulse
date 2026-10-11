#!/usr/bin/env bash
# AI-eyes bench against a llama-server model: start its launcher, wait for /health, run the bench, stop it.
#   cage-ai/bench-llama.sh ~/bin/qwen27 8082 qwen3.8-27b-hauhau [--grep pattern]
set -u
cd "$(dirname "$0")/.."
launcher=$1 port=$2 name=$3; shift 3
"$launcher" > "cage-ai/results/server-$name.log" 2>&1 &
pid=$!
for _ in $(seq 1 300); do
  curl -s -m 2 "http://127.0.0.1:$port/health" | grep -q '"ok"' && break
  kill -0 "$pid" 2>/dev/null || { echo "server died"; exit 1; }
  sleep 2
done
E2E_TELEMETRY_DISABLED=1 E2E_MODEL="$name" E2E_LLM_URL="http://127.0.0.1:$port/v1" \
  npx e2e run cage-ai/look.e2e.ts "$@" > "cage-ai/results/run-$name.log" 2>&1
kill "$pid"; wait "$pid" 2>/dev/null
