-- Student entry by student ID + a self-chosen 4-digit code (no e-mail).
-- The code is stored only as a salted PBKDF2 hash, written by the learner-entry Edge Function (service role).
alter table public.learner_profiles alter column email drop not null;
alter table public.learner_profiles add column pin_hash text;
alter table public.learner_profiles add column pin_failures integer not null default 0 check (pin_failures >= 0);
alter table public.learner_profiles add column pin_locked_until timestamptz;
alter table public.learner_profiles add column pin_set_at timestamptz;
create unique index learner_profiles_course_student on public.learner_profiles(course_id, student_id);

-- Learners may read their own profile row, but never the code hash or lock state.
revoke all on public.learner_profiles from authenticated, anon;
grant select (user_id, course_id, cohort_id, email, student_id, identity_status, created_at) on public.learner_profiles to authenticated;
