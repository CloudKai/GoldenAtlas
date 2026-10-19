#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

source "$ROOT_DIR/scripts/ensure-node-22.sh"

export HOME="${SUPABASE_CLI_HOME:-${TMPDIR:-/tmp}/golden-atlas-supabase-home}"
mkdir -p "$HOME"

SUPABASE="$ROOT_DIR/node_modules/.bin/supabase"

"$SUPABASE" start --yes >/dev/null
"$SUPABASE" db reset --local --yes
"$SUPABASE" db reset --local --yes
"$SUPABASE" test db --local supabase/tests/database

"$ROOT_DIR/scripts/test-integration.sh"

TYPE_TS_TMP="$(mktemp)"
TYPE_SWIFT_TMP="$(mktemp)"
trap 'rm -f "$TYPE_TS_TMP" "$TYPE_SWIFT_TMP"' EXIT
"$SUPABASE" gen types --lang typescript --local --schema public > "$TYPE_TS_TMP"
cmp "$TYPE_TS_TMP" src/types/database.generated.ts
"$SUPABASE" gen types --lang swift --local --schema public --swift-access-control public > "$TYPE_SWIFT_TMP"
cmp "$TYPE_SWIFT_TMP" ios/GoldenAtlas/GoldenAtlas/Generated/Database.generated.swift
node scripts/generate-ios-atlas.mjs --check

"$SUPABASE" db advisors --local --type all --level warn --fail-on error
"$ROOT_DIR/node_modules/.bin/vite" build
