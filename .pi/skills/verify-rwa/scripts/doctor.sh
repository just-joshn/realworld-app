#!/usr/bin/env bash
# Read-only. Answers: is the instance on :3000/:3001 ours, current, and usable?
source "$(dirname "$0")/env.sh"
cd "$REPO"
ok=1
fail() { echo "FAIL $*"; ok=0; }
pass() { echo "ok   $*"; }

if [ -f "$STATE/app.pid" ] && kill -0 "$(cat "$STATE/app.pid")" 2>/dev/null; then
  pgid=$(cat "$STATE/app.pid"); pass "launched process group $pgid alive"
  for p in 3000 3001; do
    lpid=$(lsof -tnP -iTCP:$p -sTCP:LISTEN 2>/dev/null | head -1)
    if [ -n "$lpid" ] && [ "$(ps -o pgid= -p "$lpid" | tr -d ' ')" = "$pgid" ]; then pass "port $p owned by our group (pid $lpid)"
    else fail "port $p listener ${lpid:-none} is not ours"; fi
  done
else
  fail "no live instance launched by launch.sh (state: $STATE)"
fi
[ "$(cat "$STATE/git-head" 2>/dev/null)" = "$(git rev-parse HEAD)" ] && pass "running HEAD $(git rev-parse --short HEAD)" \
  || fail "HEAD changed since launch; relaunch to test current code"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$FRONTEND_URL/signin")" = 200 ] && pass "frontend serves /signin" || fail "frontend not serving"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$BACKEND_URL/checkAuth")" = 401 ] && pass "api /checkAuth 401 when anonymous" || fail "api not answering /checkAuth"
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
  -d "{\"username\":\"$SEED_USER\",\"password\":\"$SEED_PASSWORD\"}" "$BACKEND_URL/login")
[ "$code" = 200 ] && pass "seed user $SEED_USER can log in" || fail "seed login returned $code (DB not seeded?)"
[ $ok = 1 ] && echo "HEALTHY" || { echo "UNHEALTHY"; exit 1; }
