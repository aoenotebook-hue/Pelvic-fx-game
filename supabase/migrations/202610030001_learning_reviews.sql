-- Local migration only. Institutional authorization and content approval remain required.
create table public.teaching_observations (
 id uuid primary key, attempt_id uuid not null references public.attempts(id),
 cohort_id uuid not null references public.cohorts(id), content_version text not null references public.content_versions(id),
 reviewer_id uuid not null references auth.users(id), reviewed_at timestamptz not null default now(), payload jsonb not null
);
alter table public.teaching_observations enable row level security;
grant select on public.teaching_observations to authenticated;
create policy staff_only_observations on public.teaching_observations for select to authenticated using (public.is_faculty_for(cohort_id));
-- No authenticated insert/update/delete grants. Protected endpoint sets reviewer and scope.
create function public.preserve_first_completion() returns trigger language plpgsql set search_path=public as $$
begin
 if old.completed_at is not null then new.completed_at=old.completed_at; end if;
 return new;
end $$;
create trigger stable_completion_receipt before update on public.attempt_summaries for each row execute function public.preserve_first_completion();
