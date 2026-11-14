#!/usr/bin/env bash
# Idempotent. Installs Playwright + Chromium into $TOOLS, outside the repo.
set -euo pipefail
source "$(dirname "$0")/env.sh"
mkdir -p "$TOOLS"
if [ ! -d "$TOOLS/node_modules/playwright" ]; then
  npm install --prefix "$TOOLS" --no-save --silent playwright@1 >/dev/null
fi
"$TOOLS/node_modules/.bin/playwright" install chromium >/dev/null
echo "tools ready: bun=$(bun --version) playwright=$("$TOOLS/node_modules/.bin/playwright" --version)"
