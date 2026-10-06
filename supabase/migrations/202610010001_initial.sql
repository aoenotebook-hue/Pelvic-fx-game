begin;

create extension if not exists pgcrypto;

create type public.app_role as enum ('learner', 'faculty', 'editor', 'admin');
create type public.content_status as enum ('draft', 'in_review', 'approved', 'published', 'retired');

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  time_zone text not null default 'Asia/Bangkok',
  preparation_due_at timestamptz,
  class_url text,
  class_location text,
  support_contact text,
  privacy_notice_url text,
  retention_policy text,
  published_content_version text,
  day2_release_at timestamptz,
  day2_url text,
  day7_release_at timestamptz,
  day7_url text,
  created_at timestamptz not null default now()
);

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  learner_id text not null check (char_length(learner_id) between 1 and 120),
  invited_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (cohort_id, user_id),
  unique (cohort_id, learner_id)
);

create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  cohort_id uuid references public.cohorts(id) on delete cascade,
  assigned_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique nulls not distinct (user_id, role, cohort_id),
  check ((role in ('learner', 'admin', 'editor') and cohort_id is null) or role = 'faculty')
);

create table public.content_versions (
  id text primary key,
  title text not null,
  status public.content_status not null default 'draft',
  bundle jsonb not null,
  author_id uuid references auth.users(id),
  reviewer_id uuid references auth.users(id),
  reviewed_at timestamptz,
  supersedes_version text references public.content_versions(id),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  check (status not in ('approved', 'published') or (reviewer_id is not null and reviewed_at is not null))
);

create table public.attempts (
  id uuid primary key,
  course_id uuid not null references public.courses(id) on delete cascade,
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content_version text not null references public.content_versions(id),
  kind text not null check (kind in ('initial', 'practice')),
  reporting_status text not null default 'candidate' check (reporting_status in ('candidate', 'reporting', 'practice', 'conflict')),
  server_accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index one_reporting_attempt_per_version on public.attempts(user_id, course_id, content_version) where reporting_status = 'reporting';
create index attempts_cohort_idx on public.attempts(cohort_id, content_version);

create table public.response_events (
  id bigint generated always as identity primary key,
  event_id uuid not null,
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content_version text not null references public.content_versions(id),
  client_sequence integer not null check (client_sequence > 0),
  event_type text not null,
  payload jsonb not null,
  payload_sha256 text not null,
  client_timestamp timestamptz,
  server_receipt_timestamp timestamptz not null default now(),
  unique (user_id, attempt_id, event_id),
  unique (attempt_id, client_sequence),
  check (octet_length(payload::text) <= 16384)
);

create table public.attempt_summaries (
  attempt_id uuid primary key references public.attempts(id) on delete cascade,
  core_score integer not null default 0 check (core_score between 0 and 30),
  answered_nodes integer not null default 0,
  reviewed_missions integer not null default 0,
  resolved_concepts integer not null default 0,
  first_final_score integer,
  latest_final_score integer,
  reflection_submitted boolean not null default false,
  completed boolean not null default false,
  completion_route text,
  completed_at timestamptz,
  last_event_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.teacher_reviews (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id),
  content_version text not null,
  concept_id text not null check (concept_id in ('S1','S2','S3','S4','S5','S6')),
  outcome_id text not null check (outcome_id in ('O1','O2','O3','O4','O5','O6')),
  result text not null check (result in ('resolved','unresolved')),
  reason text not null check (char_length(reason) between 5 and 2000),
  reviewed_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  action text not null,
  target_type text not null,
  target_id text not null,
  reason text,
  created_at timestamptz not null default now()
);

create table public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  node_id text,
  content_version text not null,
  message text not null check (char_length(message) between 1 and 800),
  status text not null default 'open' check (status in ('open','reviewed','resolved')),
  created_at timestamptz not null default now()
);

create or replace function public.has_role(required_role public.app_role)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.role_assignments r where r.user_id = (select auth.uid()) and r.role = required_role and r.cohort_id is null)
$$;

create or replace function public.is_faculty_for(required_cohort uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role('admin') or exists(select 1 from public.role_assignments r where r.user_id = (select auth.uid()) and r.role = 'faculty' and r.cohort_id = required_cohort)
$$;

revoke all on function public.has_role(public.app_role) from public;
revoke all on function public.is_faculty_for(uuid) from public;
grant execute on function public.has_role(public.app_role), public.is_faculty_for(uuid) to authenticated;

alter table public.courses enable row level security;
alter table public.cohorts enable row level security;
alter table public.memberships enable row level security;
alter table public.role_assignments enable row level security;
alter table public.content_versions enable row level security;
alter table public.attempts enable row level security;
alter table public.response_events enable row level security;
alter table public.attempt_summaries enable row level security;
alter table public.teacher_reviews enable row level security;
alter table public.audit_events enable row level security;
alter table public.issue_reports enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.courses, public.cohorts, public.memberships, public.content_versions, public.attempts, public.response_events, public.attempt_summaries, public.teacher_reviews, public.issue_reports to authenticated;
grant insert on public.issue_reports to authenticated;

create policy courses_member_read on public.courses for select to authenticated using (
  exists(select 1 from public.cohorts c join public.memberships m on m.cohort_id = c.id where c.course_id = courses.id and m.user_id = (select auth.uid()))
  or exists(select 1 from public.cohorts c where c.course_id = courses.id and public.is_faculty_for(c.id)) or public.has_role('admin') or public.has_role('editor')
);
create policy cohorts_scoped_read on public.cohorts for select to authenticated using (
  exists(select 1 from public.memberships m where m.cohort_id = cohorts.id and m.user_id = (select auth.uid())) or public.is_faculty_for(cohorts.id)
);
create policy memberships_self_or_faculty_read on public.memberships for select to authenticated using (user_id = (select auth.uid()) or public.is_faculty_for(cohort_id));
create policy content_published_or_editor_read on public.content_versions for select to authenticated using (status = 'published' or public.has_role('editor') or public.has_role('admin'));
create policy attempts_owner_or_faculty_read on public.attempts for select to authenticated using (user_id = (select auth.uid()) or public.is_faculty_for(cohort_id));
create policy events_owner_or_faculty_read on public.response_events for select to authenticated using (user_id = (select auth.uid()) or exists(select 1 from public.attempts a where a.id = response_events.attempt_id and public.is_faculty_for(a.cohort_id)));
create policy summaries_owner_or_faculty_read on public.attempt_summaries for select to authenticated using (exists(select 1 from public.attempts a where a.id = attempt_summaries.attempt_id and (a.user_id = (select auth.uid()) or public.is_faculty_for(a.cohort_id))));
create policy reviews_owner_or_faculty_read on public.teacher_reviews for select to authenticated using (exists(select 1 from public.attempts a where a.id = teacher_reviews.attempt_id and (a.user_id = (select auth.uid()) or public.is_faculty_for(a.cohort_id))));
create policy issues_owner_or_faculty_read on public.issue_reports for select to authenticated using (user_id = (select auth.uid()) or exists(select 1 from public.cohorts c where c.course_id = issue_reports.course_id and public.is_faculty_for(c.id)));
create policy issues_owner_insert on public.issue_reports for insert to authenticated with check (user_id = (select auth.uid()));

-- Role, membership, content transitions, teacher reviews, events and attempts are changed only through protected server operations.
-- No client policy permits self-assigned roles, cohort joins, content publication or response-event insertion.

commit;
