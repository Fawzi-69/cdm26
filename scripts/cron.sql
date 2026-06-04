-- Automatisation des mises à jour (scores + cotes) via pg_cron + pg_net.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 12 h : rafraîchit toutes les cotes + scores depuis The Odds API
select cron.schedule(
  'cdm26-sync-12h',
  '0 */12 * * *',
  $$ select net.http_post(url := 'https://opilqjghbbmcdubgdwjs.functions.supabase.co/sync-matches') $$
);

-- 5 min : cron "intelligent" (0 requête API), déclenche sync quand un match se termine
select cron.schedule(
  'cdm26-trigger-5m',
  '*/5 * * * *',
  $$ select net.http_post(url := 'https://opilqjghbbmcdubgdwjs.functions.supabase.co/trigger-match-sync') $$
);

select jobname, schedule, active from cron.job where jobname like 'cdm26-%' order by jobname;
