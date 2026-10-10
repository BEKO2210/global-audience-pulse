#!/usr/bin/env bash
# Who has the GPU right now? Shared lock holder, VRAM use and loaded Ollama models (T-034).
LOCK="${GPU_LOCK:-$HOME/reel/gpu.lock}"
echo "GPU-Sperre: $LOCK"
holders=$(fuser "$LOCK" 2>/dev/null | tr -s ' ' '\n' | grep -E '^[0-9]+$' || true)
if [ -z "$holders" ]; then
  echo "  frei"
else
  for pid in $holders; do
    ps -o pid=,etime=,args= -p "$pid" 2>/dev/null | sed 's/^/  belegt: /' | cut -c1-160
  done
fi
echo
if command -v nvidia-smi >/dev/null; then
  nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu --format=csv,noheader |
    awk -F', ' '{printf "GPU: %s · %s von %s · Auslastung %s\n", $1, $2, $3, $4}'
  nvidia-smi --query-compute-apps=pid,used_memory,process_name --format=csv,noheader 2>/dev/null |
    awk -F', ' '$2+0 > 100 {printf "  %s MiB  PID %s  %s\n", $2+0, $1, $3}' | cut -c1-120
fi
if command -v ollama >/dev/null; then
  echo
  echo "Ollama geladen:"
  ollama ps 2>/dev/null | tail -n +2 | sed 's/^/  /' | grep . || echo "  nichts"
fi
