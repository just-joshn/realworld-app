#!/usr/bin/env bash
# Kills only the process group launch.sh started, restores data/database.json, removes $STATE.
# Never touches $EVIDENCE_ROOT.
source "$(dirname "$0")/env.sh"
cd "$REPO"
if [ -f "$STATE/app.pid" ]; then
  pgid=$(cat "$STATE/app.pid")
  kill -TERM -- "-$pgid" 2>/dev/null
  for i in 1 2 3 4 5 6 7 8 9 10; do kill -0 -- "-$pgid" 2>/dev/null || break; sleep 0.5; done
  kill -KILL -- "-$pgid" 2>/dev/null
  echo "stopped process group $pgid"
fi
if [ -f "$STATE/database.json.before" ]; then
  if [ "$(git rev-parse HEAD)" = "$(cat "$STATE/git-head" 2>/dev/null)" ]; then
    cp "$STATE/database.json.before" data/database.json && echo "restored data/database.json"
  else
    # Someone else switched branches during the run; their tests may own the current DB file.
    cp "$STATE/database.json.before" "$EVIDENCE_ROOT/database.json.before-$(date +%s)"
    echo "HEAD moved during the run: NOT restoring data/database.json; pre-launch copy saved under $EVIDENCE_ROOT" >&2
  fi
fi
rm -rf "$STATE"
echo "evidence kept in $EVIDENCE_ROOT"
