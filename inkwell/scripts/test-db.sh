#!/usr/bin/env bash
# Applies every migration to a throw-away PostgreSQL database and runs the RLS/function tests.
# Needs a reachable PostgreSQL server and the standard PG* env vars (PGHOST, PGPORT, PGUSER, PGPASSWORD).
#   PGHOST=localhost PGUSER=postgres ./scripts/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB="inkwell_test_$$"
PSQL="psql -v ON_ERROR_STOP=1 -q"
$PSQL -d postgres -c "create database $DB" >/dev/null
trap '$PSQL -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
$PSQL -d "$DB" -f supabase/tests/supabase_stub.sql
for f in supabase/migrations/*.sql; do echo "• applying $f"; $PSQL -d "$DB" -f "$f"; done
echo "• running tests"; $PSQL -d "$DB" -f supabase/tests/rls_test.sql | grep -E "PASSED" 
