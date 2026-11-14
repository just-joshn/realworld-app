#!/usr/bin/env bash
# Usage: drive.sh <journey> [--headed]   (journeys listed when run without args)
# Set RUN_ID to group several journeys under one evidence folder.
# Exit 0 pass, 1 check failed, 2 usage, 3 INVALID (code under the running app changed mid-run).
source "$(dirname "$0")/env.sh"
export EVIDENCE_ROOT RUN_ID="${RUN_ID:-$(date +%Y%m%dT%H%M%S)}"
head_now() { git -C "$REPO" rev-parse HEAD; }
if [ -f "$STATE/git-head" ] && [ "$(head_now)" != "$(cat "$STATE/git-head")" ]; then
  echo "INVALID: HEAD moved since launch ($(cat "$STATE/git-head" | cut -c1-7) -> $(head_now | cut -c1-7)). cleanup.sh, then launch.sh." >&2; exit 3
fi
before=$(head_now)
NODE_PATH="$TOOLS/node_modules" node "$(dirname "$0")/drive.cjs" "$@"; rc=$?
if [ "$(head_now)" != "$before" ]; then
  echo "INVALID: HEAD changed during the journey (another actor switched branches); vite hot-reloaded mid-run. Discard this result." >&2; exit 3
fi
exit $rc
