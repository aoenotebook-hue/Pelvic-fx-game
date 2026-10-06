-- Local migration only. Apply in a reviewed staging environment, not production by default.
alter table public.attempt_summaries
  add column reward_total integer not null default 0 check (reward_total between 0 and 250),
  add column reward_maximum integer not null default 150,
  add column reward_scheme text not null default 'legacy-150' check (reward_scheme in ('legacy-150','collections-250')),
  add column first_correct integer not null default 0,
  add column corrected_nodes integer not null default 0,
  add column clothing_level integer not null default 1 check (clothing_level between 1 and 5),
  add column case_stamps jsonb not null default '[]',
  add column safety_badges jsonb not null default '[]',
  add column reward_achievements jsonb not null default '[]';
-- Preserve the original scheme. Re-sync legacy events to populate detailed achievement summaries.
update public.attempt_summaries set reward_total=core_score*5,
  clothing_level=least(5,1+(core_score*5)/30);
-- Existing RLS and SELECT-only authenticated grants remain unchanged.
-- Content v2 remains a draft; this migration does not publish it or enroll learners.
