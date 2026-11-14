#!/usr/bin/env bash
# Starts frontend (vite :3000) + API (express :3001) from a freshly seeded DB.
# Exits 0 once a seeded user can log in through the API. Refuses if the ports are taken.
set -euo pipefail
source "$(dirname "$0")/env.sh"
cd "$REPO"

if [ -f "$STATE/app.pid" ] && kill -0 "$(cat "$STATE/app.pid")" 2>/dev/null; then
  echo "already running (pid $(cat "$STATE/app.pid")); run doctor.sh or cleanup.sh" >&2; exit 1
fi
for p in 3000 3001; do
  if lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then
    echo "port $p is in use by a process this run did not start:" >&2
    lsof -nP -iTCP:$p -sTCP:LISTEN >&2; exit 1
  fi
done
command -v yarn >/dev/null || { echo "yarn missing: run setup-tools.sh" >&2; exit 1; }
[ -d node_modules ] || yarn install --frozen-lockfile

mkdir -p "$STATE"
# `yarn start` overwrites data/database.json (tracked) with the seed. Back up the user's copy.
cp data/database.json "$STATE/database.json.before"
git rev-parse HEAD > "$STATE/git-head"

set -m  # background job gets its own process group, so cleanup can kill the whole tree
nohup yarn start > "$STATE/app.log" 2>&1 &
echo $! > "$STATE/app.pid"
set +m

for i in $(seq 1 90); do
  if curl -fsS "$FRONTEND_URL/signin" >/dev/null 2>&1 \
     && curl -fsS -o /dev/null -X POST -H 'Content-Type: application/json' \
          -d "{\"username\":\"$SEED_USER\",\"password\":\"$SEED_PASSWORD\"}" "$BACKEND_URL/login" 2>/dev/null; then
    echo "ready: $FRONTEND_URL (api $BACKEND_URL) pid $(cat "$STATE/app.pid") after ${i}s"; exit 0
  fi
  kill -0 "$(cat "$STATE/app.pid")" 2>/dev/null || { echo "app exited; tail of $STATE/app.log:" >&2; tail -30 "$STATE/app.log" >&2; exit 1; }
  sleep 1
done
echo "not ready after 90s; see $STATE/app.log" >&2; exit 1
