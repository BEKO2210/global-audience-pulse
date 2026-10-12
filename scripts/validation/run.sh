#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
REPO_DIR=$(cd -- "$SCRIPT_DIR/../.." && pwd)
BUILD_DIR=$(mktemp -d /tmp/gap-validation.XXXXXX)
trap 'rm -rf -- "$BUILD_DIR"' EXIT

cd "$REPO_DIR"
npx esbuild scripts/validation/run.ts --bundle --platform=node --format=esm --target=node22 \
  --outfile="$BUILD_DIR/run.mjs" --log-level=warning
node "$BUILD_DIR/run.mjs" "$@"
