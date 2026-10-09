-- Security hardening (2026-10-09). Apply after the earlier migrations, in a reviewed staging project first.

-- 1. Teacher/admin data access requires a two-step-verified (MFA, aal2) session, also for direct REST reads.
--    Learners are unaffected: their own-row policies do not call these functions.
create or replace function public.has_role(required_role public.app_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    and exists(select 1 from public.role_assignments r where r.user_id = (select auth.uid()) and r.role = required_role and r.cohort_id is null)
$$;

create or replace function public.is_faculty_for(required_cohort uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2'
    and (public.has_role('admin') or exists(select 1 from public.role_assignments r where r.user_id = (select auth.uid()) and r.role = 'faculty' and r.cohort_id = required_cohort))
$$;

-- 2. Tables created after the initial "revoke all" received Supabase's default grants. Remove write access explicitly;
--    teaching observations are written only by the protected faculty-workspace function (service role).
revoke insert, update, delete, truncate on public.teaching_observations from anon, authenticated;
revoke all on public.teaching_observations from anon;
revoke execute on function public.preserve_first_completion() from public, anon, authenticated;

-- 4. Rejected events are stored as tombstones (event_type = 'rejected') so a bad event never blocks later ones.
--    They are visible to the owner and faculty like other rows but never count as evidence.
comment on column public.response_events.event_type is 'Learner event type, or ''rejected'' for a server-side tombstone that keeps the sequence position.';
