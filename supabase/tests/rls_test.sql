-- Access-rule test for a scratch Postgres (NOT production). Run: scripts/test-rls.sh
-- Every line marked "expect" must print the expected count; every ERROR line is a write that must be refused.
\set ON_ERROR_STOP 1
-- Seed (as owner)
insert into auth.users values ('00000000-0000-0000-0000-0000000000a1','learner1@x'),('00000000-0000-0000-0000-0000000000a2','learner2@x'),('00000000-0000-0000-0000-0000000000f1','teacher@x'),('00000000-0000-0000-0000-0000000000b1','otherlearner@x');
insert into public.courses(id,title) values ('10000000-0000-0000-0000-000000000001','Pelvis'),('10000000-0000-0000-0000-000000000002','Other');
insert into public.cohorts(id,course_id,title) values ('20000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000001','A'),('20000000-0000-0000-0000-00000000000b','10000000-0000-0000-0000-000000000001','B'),('20000000-0000-0000-0000-00000000000c','10000000-0000-0000-0000-000000000002','C');
insert into public.memberships(cohort_id,user_id,learner_id) values ('20000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a1','S001'),('20000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a2','S002'),('20000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000b1','S100');
insert into public.role_assignments(user_id,role,cohort_id,assigned_by) values ('00000000-0000-0000-0000-0000000000f1','faculty','20000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000f1');
insert into public.content_versions(id,title,status,bundle) values ('v','v','draft','{}');
insert into public.attempts(id,course_id,cohort_id,user_id,content_version,kind,reporting_status) values
 ('30000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a1','v','initial','reporting'),
 ('30000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a2','v','initial','reporting'),
 ('30000000-0000-0000-0000-0000000000b1','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000b1','v','initial','reporting');
insert into public.response_events(event_id,attempt_id,user_id,content_version,client_sequence,event_type,payload,payload_sha256) values
 (gen_random_uuid(),'30000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','v',1,'core_response','{}','h'),
 (gen_random_uuid(),'30000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-0000000000a2','v',1,'core_response','{}','h'),
 (gen_random_uuid(),'30000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b1','v',1,'core_response','{}','h');
insert into public.learner_profiles(user_id,course_id,cohort_id,student_id,pin_hash) values
 ('00000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-00000000000a','S001','pbkdf2$1$00$00'),
 ('00000000-0000-0000-0000-0000000000a2','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-00000000000a','S002','pbkdf2$1$00$00');
\unset ON_ERROR_STOP

create or replace function pg_temp.as_user(sub text, aal text) returns void language plpgsql as $$
begin perform set_config('request.jwt.claims', json_build_object('sub',sub,'aal',aal,'role','authenticated')::text, false); end $$;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1','aal1');
select 'learner1 sees own events only (expect 1)' as check, count(*) from public.response_events;
select 'learner1 sees memberships (expect 1)' as check, count(*) from public.memberships;
select 'learner1 sees own profile only (expect 1)' as check, count(*) from public.learner_profiles where student_id is not null;
select pin_hash from public.learner_profiles; -- must fail: permission denied for the code hash
update public.learner_profiles set pin_hash = null; -- must fail: learners cannot write profiles
select 'learner1 sees role_assignments (expect 0)' as check, count(*) from public.role_assignments;
insert into public.role_assignments(user_id,role,cohort_id,assigned_by) values ('00000000-0000-0000-0000-0000000000a1','faculty','20000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a1');
insert into public.response_events(event_id,attempt_id,user_id,content_version,client_sequence,event_type,payload,payload_sha256) values (gen_random_uuid(),'30000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','v',2,'core_response','{}','h');
update public.attempt_summaries set core_score=30;
insert into public.teaching_observations(id,attempt_id,cohort_id,content_version,reviewer_id,payload) values (gen_random_uuid(),'30000000-0000-0000-0000-0000000000a1','20000000-0000-0000-0000-00000000000a','v','00000000-0000-0000-0000-0000000000a1','{}');
insert into public.issue_reports(user_id,course_id,message) values ('00000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-000000000002','not my course');
insert into public.issue_reports(user_id,course_id,message,status) values ('00000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-000000000001','set status','resolved');
insert into public.issue_reports(user_id,course_id,content_version,message) values ('00000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-000000000001','v','ok report');
select 'learner1 valid issue report saved (expect 1)' as check, count(*) from public.issue_reports;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1','aal1');
select 'teacher WITHOUT MFA sees learner events (expect 0)' as check, count(*) from public.response_events;
select 'teacher WITHOUT MFA sees memberships (expect 0)' as check, count(*) from public.memberships;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1','aal2');
select 'teacher WITH MFA sees own cohort events (expect 2)' as check, count(*) from public.response_events;
select 'teacher WITH MFA sees own cohort roster (expect 2)' as check, count(*) from public.memberships;
select 'teacher cannot see other cohort learner S100 (expect 0)' as check, count(*) from public.memberships where learner_id='S100';
insert into public.teaching_observations(id,attempt_id,cohort_id,content_version,reviewer_id,payload) values (gen_random_uuid(),'30000000-0000-0000-0000-0000000000a1','20000000-0000-0000-0000-00000000000a','v','00000000-0000-0000-0000-0000000000f1','{}');
reset role;
