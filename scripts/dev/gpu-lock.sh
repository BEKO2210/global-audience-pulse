#!/usr/bin/env bash
# Run a command under the shared GPU lock on pop-os (T-034). Same lock the reel tools use
# (motion-studio/radar-shorts: `flock ~/reel/gpu.lock …`), so a render, Whisper and an LLM never load at once.
#
#   scripts/dev/gpu-lock.sh [-w seconds] -- command args…
# Waits up to -w seconds (default 600) for the lock; exits 75 if it stays busy.
set -euo pipefail
WAIT=600
if [ "${1:-}" = "-w" ]; then
  WAIT="$2"
  shift 2
fi
[ "${1:-}" = "--" ] && shift
LOCK="${GPU_LOCK:-$HOME/reel/gpu.lock}"
mkdir -p "$(dirname "$LOCK")"
exec flock -w "$WAIT" -E 75 "$LOCK" "$@"
