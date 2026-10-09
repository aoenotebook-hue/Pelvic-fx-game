-- Bound retained writes atomically, including concurrent Edge requests.
create function public.guard_attempt_quota() returns trigger language plpgsql set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text||':'||new.course_id::text,0));
 if (select count(*) from public.attempts where user_id=new.user_id and course_id=new.course_id and content_version=new.content_version)>=20
 or (select count(*) from public.attempts where user_id=new.user_id and course_id=new.course_id and created_at>now()-interval '1 day')>=10 then
  raise exception using errcode='P0001',message='Attempt limit reached. Resume a saved attempt or contact your teacher.';
 end if;
 return new;
end $$;
create trigger attempt_write_quota before insert on public.attempts for each row execute function public.guard_attempt_quota();

create function public.guard_event_quota() returns trigger language plpgsql set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.attempt_id::text,1));
 if new.client_sequence>1000 or (select count(*) from public.response_events where attempt_id=new.attempt_id)>=1000 then
  raise exception using errcode='P0001',message='Attempt evidence limit reached. Accepted work is preserved; contact your teacher.';
 end if;
 return new;
end $$;
create trigger event_write_quota before insert on public.response_events for each row execute function public.guard_event_quota();
revoke all on function public.guard_attempt_quota(),public.guard_event_quota() from public,anon,authenticated;
