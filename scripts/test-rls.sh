#!/bin/sh
# Applies every migration to a throwaway local Postgres database and checks who can read/write what.
# Usage: PGHOST=... PGPORT=... PGUSER=postgres scripts/test-rls.sh   (never point this at production)
set -e
DB=pelvic_rls_test_$$
createdb "$DB"
trap 'dropdb "$DB"' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/tests/auth_stub.sql
for file in supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$file"; done
psql -d "$DB" -f supabase/tests/rls_test.sql 2>&1 | grep -E "expect|ERROR"
