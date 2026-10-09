create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
-- Secrets are populated through Vault, never committed here. Without them this job is inert.
select cron.schedule('ptd-google-sheets-every-minute','* * * * *',$job$
 select net.http_post(
  url=(select decrypted_secret from vault.decrypted_secrets where name='ptd_sheets_worker_url')::text,
  headers=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='ptd_sheets_worker_secret')),
  body='{}'::jsonb, timeout_milliseconds:=60000
 ) where exists(select 1 from vault.decrypted_secrets where name='ptd_sheets_worker_url') and exists(select 1 from vault.decrypted_secrets where name='ptd_sheets_worker_secret');
$job$);
