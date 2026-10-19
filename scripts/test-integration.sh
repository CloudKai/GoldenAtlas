#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

source "$ROOT_DIR/scripts/ensure-node-22.sh"

export HOME="${SUPABASE_CLI_HOME:-${TMPDIR:-/tmp}/golden-atlas-supabase-home}"
mkdir -p "$HOME"

SUPABASE="$ROOT_DIR/node_modules/.bin/supabase"
STATUS_JSON="$("$SUPABASE" status --output json)"
export SUPABASE_URL="$(node -e 'const s=JSON.parse(process.argv[1]); process.stdout.write(s.API_URL)' "$STATUS_JSON")"
export SUPABASE_ANON_KEY="$(node -e 'const s=JSON.parse(process.argv[1]); process.stdout.write(s.ANON_KEY)' "$STATUS_JSON")"
export SUPABASE_SERVICE_ROLE_KEY="$(node -e 'const s=JSON.parse(process.argv[1]); process.stdout.write(s.SERVICE_ROLE_KEY)' "$STATUS_JSON")"
export SUPABASE_SECRET_KEY="$(node -e 'const s=JSON.parse(process.argv[1]); process.stdout.write(s.SECRET_KEY)' "$STATUS_JSON")"

node --test supabase/tests/integration/*.test.mjs
