#!/usr/bin/env bash
# Idempotent. Installs a yarn shim (the repo's scripts call `yarn` via concurrently)
# and Playwright + Chromium into $TOOLS, outside the repo.
set -euo pipefail
source "$(dirname "$0")/env.sh"
mkdir -p "$TOOLS/bin"
if ! command -v yarn >/dev/null; then
  printf '#!/usr/bin/env bash\nexec corepack yarn "$@"\n' > "$TOOLS/bin/yarn"
  chmod +x "$TOOLS/bin/yarn"
fi
if [ ! -d "$TOOLS/node_modules/playwright" ]; then
  npm install --prefix "$TOOLS" --no-save --silent playwright@1 >/dev/null
fi
"$TOOLS/node_modules/.bin/playwright" install chromium >/dev/null
echo "tools ready: yarn=$(yarn --version) playwright=$("$TOOLS/node_modules/.bin/playwright" --version)"
