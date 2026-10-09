-- Approved fictional QA only; all test writes and export triggers roll back.
begin;
do $$
declare uid uuid; cid uuid; cohort uuid; ver text='ptd-minigame-focused-2026-10-08'; aid uuid=gen_random_uuid(); existing integer; blocked boolean=false;
begin
 select user_id,course_id,cohort_id into uid,cid,cohort from public.learner_profiles where student_id='QA-ENTRY-1008';
 if uid is null then raise exception 'QA fixture missing';end if;
 begin
 select count(*) into existing from public.attempts where user_id=uid and course_id=cid and created_at>now()-interval '24 hours';
 for i in existing+1..10 loop
  insert into public.attempts(id,user_id,course_id,cohort_id,content_version,kind,reporting_status) values(gen_random_uuid(),uid,cid,cohort,ver,'practice','practice');
 end loop;
 begin
  insert into public.attempts(id,user_id,course_id,cohort_id,content_version,kind,reporting_status) values(gen_random_uuid(),uid,cid,cohort,ver,'practice','practice');
 exception when sqlstate 'P0001' then blocked=true;end;
 if not blocked then raise exception 'Daily attempt quota not enforced';end if;
 raise exception using errcode='PT001',message='Roll back daily fixture before cumulative test';
 exception when sqlstate 'PT001' then null;end;
 blocked=false;
 select count(*) into existing from public.attempts where user_id=uid and course_id=cid and content_version=ver;
 for i in existing+1..20 loop
  insert into public.attempts(id,user_id,course_id,cohort_id,content_version,kind,reporting_status,created_at) values(gen_random_uuid(),uid,cid,cohort,ver,'practice','practice',now()-interval '2 days');
 end loop;
 begin
  insert into public.attempts(id,user_id,course_id,cohort_id,content_version,kind,reporting_status,created_at) values(gen_random_uuid(),uid,cid,cohort,ver,'practice','practice',now()-interval '2 days');
 exception when sqlstate 'P0001' then blocked=true;end;
 if not blocked then raise exception 'Attempt quota not enforced';end if;
 select id into aid from public.attempts where user_id=uid and kind='practice' and content_version=ver order by created_at limit 1;
 insert into public.response_events(event_id,attempt_id,user_id,content_version,client_sequence,event_type,payload,payload_sha256) values(gen_random_uuid(),aid,uid,ver,1000,'resource_viewed','{}','fixture');
 blocked=false;
 begin
  insert into public.response_events(event_id,attempt_id,user_id,content_version,client_sequence,event_type,payload,payload_sha256) values(gen_random_uuid(),aid,uid,ver,1001,'resource_viewed','{}','fixture');
 exception when sqlstate 'P0001' then blocked=true;end;
 if not blocked then raise exception 'Evidence quota not enforced';end if;
 if has_function_privilege('authenticated','public.allow_learner_entry(text,integer)','EXECUTE') or has_function_privilege('authenticated','public.queue_sheet_course(uuid)','EXECUTE') then raise exception 'Privileged RPC exposed';end if;
 if has_table_privilege('authenticated','public.response_events','INSERT') or has_table_privilege('authenticated','public.role_assignments','UPDATE') then raise exception 'Protected mutation exposed';end if;
end $$;
rollback;
