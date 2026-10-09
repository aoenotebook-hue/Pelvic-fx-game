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

-- 3. Issue reports: a learner may only report for a course they are enrolled in, and cannot set the triage status.
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'issue_reports' and cmd = 'INSERT' loop
    execute format('drop policy %I on public.issue_reports', p.policyname);
  end loop;
end $$;
create policy issues_insert_member_course on public.issue_reports for insert to authenticated with check (
  user_id = (select auth.uid())
  and status = 'open'
  and exists(select 1 from public.cohorts c join public.memberships m on m.cohort_id = c.id
             where c.course_id = issue_reports.course_id and m.user_id = (select auth.uid()))
);

-- 4. Rejected events are stored as tombstones (event_type = 'rejected') so a bad event never blocks later ones.
--    They are visible to the owner and faculty like other rows but never count as evidence.
comment on column public.response_events.event_type is 'Learner event type, or ''rejected'' for a server-side tombstone that keeps the sequence position.';

-- 5. Audit who changes roles (role grants must never be self-service).
create or replace function public.audit_role_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- actor_id is required; changes made directly in the SQL editor (no signed-in user) are recorded by Postgres logs instead.
  if (select auth.uid()) is null then return coalesce(new, old); end if;
  insert into public.audit_events(actor_id, action, target_type, target_id, reason)
  values ((select auth.uid()), tg_op || '_role_assignment', 'role_assignment', coalesce(new.user_id, old.user_id)::text,
          coalesce(new.role::text, old.role::text) || ' / cohort ' || coalesce(new.cohort_id::text, old.cohort_id::text, 'all'));
  return coalesce(new, old);
end $$;
revoke execute on function public.audit_role_change() from public, anon, authenticated;
drop trigger if exists audit_role_assignments on public.role_assignments;
create trigger audit_role_assignments after insert or update or delete on public.role_assignments
  for each row execute function public.audit_role_change();
