-- Push reminders: pg_cron calls the `remind` Edge Function every minute through pg_net.
-- The job reads its target from private.remind_config and does nothing until the owner inserts both rows:
--   insert into private.remind_config (key, value) values
--     ('remind_url',  'https://<project-ref>.supabase.co/functions/v1/remind'),
--     ('cron_secret', '<same value as the CRON_SECRET function secret>');

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.remind_config (
  key text primary key,
  value text not null
);

select cron.unschedule(jobid) from cron.job where jobname = 'dayline-remind';

select cron.schedule(
  'dayline-remind',
  '* * * * *',
  $$
  select net.http_post(
    url := u.value,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', s.value),
    body := '{}'::jsonb,
    timeout_milliseconds := 8000
  )
  from private.remind_config u, private.remind_config s
  where u.key = 'remind_url' and s.key = 'cron_secret'
  $$
);
