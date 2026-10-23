# Background jobs, scheduler and notifications

## What exists in the repository

| Piece | Path | State |
|---|---|---|
| Matching worker | `supabase/functions/matching-worker/index.ts` | Code complete; **not deployed** to the project |
| Queue operations | `public.claim_matching_queue`, `complete_matching_queue`, `fail_matching_queue` | Applied in the database |
| Push dispatcher | — | **Removed by design**: the product is web-only |
| In-app notifications | `public.notifications` + dashboard screens | Working, no worker needed |

The live project currently has **no deployed Edge Functions** and **no
`pg_cron` / `pg_net` extensions**, so nothing drains `matching_queue`
automatically. Requests will sit in the queue until the worker is deployed and
scheduled. This is the largest functional gap for staging.

## Matching worker — local implementation

```powershell
# from the repository root, once the Supabase CLI is linked
npx supabase functions serve matching-worker --env-file .env
```

The local runtime reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from
the environment file. Both are server-side values; the service-role key must
never be exposed to the browser.

Invoke it by hand to process the current queue:

```powershell
curl -X POST http://127.0.0.1:54321/functions/v1/matching-worker
```

Expected response: `{ "processed": n, "results": [...] }`. A `503
not_configured` means the two environment variables are missing.

## Matching worker — live deployment

```powershell
npx supabase login
npx supabase link --project-ref zdgoomjevvvggsufanpi
npx supabase functions deploy matching-worker
```

Then install the scheduler. `pg_cron` and `pg_net` are **not** installed in
the project today; this step changes the database and is not performed as part
of this release preparation.

```sql
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'fixlink-matching-worker', '* * * * *',
  $$ select net.http_post(
       url := 'https://zdgoomjevvvggsufanpi.supabase.co/functions/v1/matching-worker',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer <service-role-key>'
       ),
       body := '{}'::jsonb
     ); $$
);
```

Security notes:

- The service-role key is stored in a `cron.job` row. Restrict `cron` schema
  access to `postgres`, or use a dedicated queue-drain token instead.
- The function is idempotent per queue row (`for update skip locked`), so a
  double invocation is safe.
- Verify after scheduling:

```sql
select jobid, schedule, jobname, active from cron.job;
select status, count(*) from public.matching_queue group by status;
```

## Push notifications — deliberately absent

The earlier mobile dispatcher was removed. The current product is web only:

- In-app notifications are rows in `public.notifications`, read by the
  dashboards and realtime subscription.
- `public.device_tokens` and `public.push_outbox` still exist because the
  migrations are applied history; nothing writes or drains them.
- There is no scheduled push job, no Expo/FCM/APNs credential and nothing to
  deploy.

If push is reintroduced, it needs: a dispatcher function, a scheduler, the
platform credentials, and a privacy review of the payloads. Until then, the
correct statement is "in-app notifications only".

## Monitoring the jobs

- `select * from public.matching_queue where status = 'failed' order by created_at desc;`
- `select * from public.matching_queue where attempts > 0;`
- Supabase Dashboard → Edge Functions → `matching-worker` logs.
- The worker returns `processed`; a sustained `processed: 0` with a non-empty
  queue means the claim function is failing.
