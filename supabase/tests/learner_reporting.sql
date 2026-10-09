-- Transactional checks: no learner responses, profiles or queue changes persist.
begin;
do $$
declare job public.sheets_export_queue; cid uuid='2d82ff1d-efd9-42f1-9eb9-0c790301514b'; allowed boolean;
begin
 allowed=public.allow_learner_entry('qa-transactional-entry-limit',1);
 if not allowed or public.allow_learner_entry('qa-transactional-entry-limit',1) then raise exception 'Entry rate limit failed'; end if;
 update public.sheets_export_queue set revision=2,delivered_revision=0,next_try=now(),lease_until=null where course_id=cid;
 select * into job from public.claim_sheet_jobs() where course_id=cid;
 if job.lease_token is null or job.revision<>2 then raise exception 'Queue claim failed';end if;
 if exists(select 1 from public.claim_sheet_jobs() where course_id=cid) then raise exception 'Duplicate queue lease';end if;
 perform public.queue_sheet_course(cid);
 update public.sheets_export_queue set delivered_revision=job.revision,lease_until=null,lease_token=null where course_id=cid and lease_token=job.lease_token;
 if not exists(select 1 from public.sheets_export_queue where course_id=cid and revision=3 and delivered_revision=2) then raise exception 'Concurrent revision was lost';end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename in ('sheets_export_queue','learner_entry_limits') and roles::text like '%authenticated%') then raise exception 'Staff-only queue exposed';end if;
end $$;
rollback;
