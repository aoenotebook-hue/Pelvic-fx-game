-- Security hardening (2026-10-09), part 2: issue-report insert rule and role-change audit.

-- 3. Issue reports: a learner may only report for a course they are enrolled in, and cannot set the triage status.
alter policy issues_owner_insert on public.issue_reports with check (
  user_id = (select auth.uid())
  and status = 'open'
  and exists(select 1 from public.cohorts c join public.memberships m on m.cohort_id = c.id
             where c.course_id = issue_reports.course_id and m.user_id = (select auth.uid()))
);

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
create or replace trigger audit_role_assignments after insert or update or delete on public.role_assignments
  for each row execute function public.audit_role_change();
