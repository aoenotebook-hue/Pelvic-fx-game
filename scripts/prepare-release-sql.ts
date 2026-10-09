// Generates an educator-requested release artifact; does NOT contact a service.
// Run with Deno and the function import map. Execute resulting SQL separately
// against the explicitly authorised project only after educator release approval.
import { contentVersions, latestContent } from '../src/content/registry.ts';

const [courseId, reviewerId, outputPath] = Deno.args;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!uuid.test(courseId ?? '') || !uuid.test(reviewerId ?? '') || !outputPath) {
  throw new Error('Supply course UUID, confirmed educator Auth UUID and output SQL path.');
}
const literal = (value: string) => "'" + value.replaceAll("'", "''") + "'";
const queries = [...contentVersions.values()].map(content => {
  const id = literal(content.id), bundle = literal(JSON.stringify(content));
  const published = content.id === latestContent.id;
  return `do $$ begin
  if exists(select 1 from public.content_versions where id=${id} and bundle <> ${bundle}::jsonb) then
    raise exception 'Existing immutable content differs: %', ${id};
  end if;
end $$;
insert into public.content_versions(id,title,status,bundle,reviewer_id,reviewed_at,published_at)
values(${id},${literal(content.title)},${published ? "'published'" : "'draft'"},${bundle}::jsonb,${published ? `'${reviewerId}'::uuid` : 'null'},${published ? 'now()' : 'null'},${published ? 'now()' : 'null'})
on conflict(id) do nothing;`;
});
const sql = `begin;
do $$ begin
  if not exists(select 1 from auth.users where id='${reviewerId}'::uuid and email_confirmed_at is not null) then
    raise exception 'Confirmed educator account required';
  end if;
  if not exists(select 1 from public.role_assignments r join public.cohorts c on c.id=r.cohort_id where r.user_id='${reviewerId}'::uuid and r.role='faculty' and c.course_id='${courseId}'::uuid) then
    raise exception 'Assigned educator required';
  end if;
end $$;
${queries.join('\n')}
update public.courses set published_content_version=${literal(latestContent.id)} where id='${courseId}'::uuid;
insert into public.audit_events(actor_id,action,target_type,target_id,reason)
values('${reviewerId}'::uuid,'educator_approved_edition_published','course','${courseId}','Sorawut Thamyongkit explicitly approved the revised 15-decision edition, English/Thai content and supplied images for student use and publication on 2026-10-08. Approval is educator-reported, not independently validated by the agent.');
commit;
select id,status from public.content_versions order by id;
`;
await Deno.writeTextFile(outputPath, sql);
console.log(`Prepared ${contentVersions.size} immutable bundles; only ${latestContent.id} selected for new attempts.`);
