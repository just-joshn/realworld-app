# Shared paths for verify-rwa helpers. Sourced, not executed.
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
VERIFY_ROOT="${VERIFY_RWA_ROOT:-/tmp/verify-rwa}"
STATE="$VERIFY_ROOT/state"            # pid, log, DB backup. Removed by cleanup.
EVIDENCE_ROOT="$VERIFY_ROOT/evidence" # proof artifacts. Never removed by cleanup.
TOOLS="${VERIFY_RWA_TOOLS:-$HOME/.cache/verify-rwa}" # playwright. Kept between runs.
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:3001"
SEED_USER="Heath93"
SEED_PASSWORD="s3cret"
