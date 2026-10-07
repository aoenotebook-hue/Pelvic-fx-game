-- Draft v4 support only. Does not publish content or enroll/invite users.
begin;
alter table public.attempt_summaries drop constraint if exists attempt_summaries_core_score_check;
alter table public.attempt_summaries add constraint attempt_summaries_core_score_check check(core_score >= 0 and (core_score <= 30 or reward_scheme = 'minigames-v4' and core_score <= 88));
alter table public.attempt_summaries drop constraint if exists attempt_summaries_reward_total_check;
alter table public.attempt_summaries drop constraint if exists attempt_summaries_reward_scheme_check;
alter table public.attempt_summaries add constraint attempt_summaries_reward_total_check check(reward_total >= 0 and reward_total <= reward_maximum);
alter table public.attempt_summaries add constraint attempt_summaries_reward_scheme_check check(reward_scheme in ('legacy-150','collections-250','minigames-v4'));
-- Game answers are immutable JSON in response_events; these derived values are server-only writes.
alter table public.attempt_summaries add column objective_evidence jsonb not null default '[]', add column station_mistakes jsonb not null default '{}', add column station_stars jsonb not null default '{}';
commit;
