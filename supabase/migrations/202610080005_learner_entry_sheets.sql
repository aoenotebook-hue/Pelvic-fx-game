-- Dedicated self-reported learner identities; verified staff accounts stay separate.
create table public.learner_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 course_id uuid not null references public.courses(id),
 cohort_id uuid not null references public.cohorts(id),
 email text not null, student_id text not null,
 identity_status text not null default 'self_reported' check(identity_status='self_reported'),
 created_at timestamptz not null default now(),
 unique(course_id,email), unique(cohort_id,student_id)
);
alter table public.learner_profiles enable row level security;
create policy learner_profile_self on public.learner_profiles for select to authenticated using(user_id=auth.uid());
alter table public.attempts add column original_attempt_id uuid references public.attempts(id);

create table public.learner_entry_limits (bucket text primary key,window_at timestamptz not null,hits integer not null);
alter table public.learner_entry_limits enable row level security;
create function public.allow_learner_entry(bucket_key text, maximum integer) returns boolean language plpgsql security definer set search_path=public as $$
declare count_hits integer;
begin
 insert into learner_entry_limits(bucket,window_at,hits) values(bucket_key,date_trunc('minute',now()),1)
 on conflict(bucket) do update set hits=case when learner_entry_limits.window_at<date_trunc('minute',now()) then 1 else learner_entry_limits.hits+1 end,window_at=date_trunc('minute',now()) returning hits into count_hits;
 delete from learner_entry_limits where window_at<now()-interval '1 day';
 return count_hits<=maximum;
end $$;
revoke all on function public.allow_learner_entry(text,integer) from public,anon,authenticated;
grant execute on function public.allow_learner_entry(text,integer) to service_role;

create table public.sheets_export_queue (
 course_id uuid primary key references public.courses(id),
 revision bigint not null default 1,delivered_revision bigint not null default 0,
 requested_at timestamptz not null default now(), last_success timestamptz,
 last_error text, failures integer not null default 0, next_try timestamptz not null default now(),
 lease_until timestamptz, lease_token uuid
);
alter table public.sheets_export_queue enable row level security;
create function public.queue_sheet_course(target_course uuid) returns void language sql security definer set search_path=public as $$
 insert into sheets_export_queue(course_id) values(target_course)
 on conflict(course_id) do update set revision=sheets_export_queue.revision+1,requested_at=now(),next_try=now();
$$;
revoke all on function public.queue_sheet_course(uuid) from public,anon,authenticated;
grant execute on function public.queue_sheet_course(uuid) to service_role;
create function public.queue_sheet_change() returns trigger language plpgsql security definer set search_path=public as $$
declare cid uuid;
begin
 if TG_TABLE_NAME in ('learner_profiles','attempts') then cid=new.course_id;
 elsif TG_TABLE_NAME='memberships' then select course_id into cid from cohorts where id=new.cohort_id;
 else select course_id into cid from attempts where id=new.attempt_id;
 end if;
 if cid is not null then perform queue_sheet_course(cid);end if;
 return new;
end $$;
create trigger learner_sheet_change after insert or update on public.learner_profiles for each row execute function public.queue_sheet_change();
create trigger membership_sheet_change after insert or update on public.memberships for each row execute function public.queue_sheet_change();
create trigger attempt_sheet_change after insert on public.attempts for each row execute function public.queue_sheet_change();
create trigger response_sheet_change after insert on public.response_events for each row execute function public.queue_sheet_change();
create trigger summary_sheet_change after insert or update on public.attempt_summaries for each row execute function public.queue_sheet_change();
create trigger review_sheet_change after insert on public.teaching_observations for each row execute function public.queue_sheet_change();
create function public.claim_sheet_jobs() returns setof public.sheets_export_queue language sql security definer set search_path=public as $$
 update sheets_export_queue set lease_until=now()+interval '5 minutes',lease_token=gen_random_uuid()
 where course_id in (select course_id from sheets_export_queue where revision>delivered_revision and next_try<=now() and (lease_until is null or lease_until<now()) order by requested_at for update skip locked limit 1) returning *;
$$;
revoke all on function public.claim_sheet_jobs() from public,anon,authenticated;
grant execute on function public.claim_sheet_jobs() to service_role;
-- Backfill all courses with accepted records; delivery waits for server configuration.
insert into public.sheets_export_queue(course_id) select id from public.courses on conflict do nothing;
