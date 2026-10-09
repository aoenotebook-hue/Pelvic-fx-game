#!/bin/sh
# Deploys the server part of this release to the live Supabase project, in the safe order.
# Run from the project folder on the computer where the Supabase CLI is already logged in
# (the one used for the 8 Oct release). Then tell Claude "Supabase done" so the website goes live next.
#
#   git fetch origin && git checkout claude/fix-ui-objectives-security && git pull
#   sh scripts/deploy-supabase.sh
set -e
PROJECT=wdedeqaqjyyudhjivnva

echo "1/3 Linking to project $PROJECT (asks for nothing if already linked)…"
supabase link --project-ref "$PROJECT"

echo "2/3 Database: only the new-edition record is still pending (security and code-columns migrations are already applied)."
supabase migration list
supabase db push

echo "3/3 Server functions (verify_jwt and import map come from supabase/config.toml)…"
supabase functions deploy --project-ref "$PROJECT"

echo "Done. Server functions now live:"
supabase functions list --project-ref "$PROJECT"
