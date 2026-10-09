-- Repair named arguments in the existing schedule; credentials remain in Vault.
-- cron.schedule with the same name updates the job instead of creating a duplicate.
select cron.schedule('ptd-google-sheets-every-minute','* * * * *',$job$
 select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name='ptd_sheets_worker_url')::text,
  headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='ptd_sheets_worker_secret')),
  body := '{}'::jsonb, timeout_milliseconds := 60000
 ) where exists(select 1 from vault.decrypted_secrets where name='ptd_sheets_worker_url') and exists(select 1 from vault.decrypted_secrets where name='ptd_sheets_worker_secret');
$job$);
