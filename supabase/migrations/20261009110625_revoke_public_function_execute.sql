-- Applied to the live project on 2026-10-09 after the Supabase security advisor run.
-- Trigger-only function: nobody calls it directly.
revoke execute on function public.queue_sheet_change() from public, anon, authenticated;
-- Role checks are needed by signed-in users' row-level policies only, never by signed-out visitors.
revoke execute on function public.has_role(public.app_role) from public, anon;
revoke execute on function public.is_faculty_for(uuid) from public, anon;
grant execute on function public.has_role(public.app_role) to authenticated, service_role;
grant execute on function public.is_faculty_for(uuid) to authenticated, service_role;
