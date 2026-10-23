# Edge Functions

The background worker of the platform. It runs on the Supabase Edge runtime
(Deno) and uses the **service-role** key — it is trusted server code, and
the key never leaves the server.

## `matching-worker`

Drains `public.matching_queue`. The queue is filled by
`public.request_matching()` when a customer creates a request.

Each invocation:

1. claims the rows that are due (`for update skip locked`);
2. calls `public.match_job()` for the first round, or
   `public.expand_matching()` for the later rounds — the second one
   widens the search radius after the configured timeout;
3. records the outcome.

The rules (who is eligible, how they are scored, when the search widens)
live in the database. This function only decides *when* to run them.

## The push dispatcher is gone

The platform is web only: there is no mobile client to push to, so the
`push-dispatcher` function (which sent the notifications through Expo) was
removed with the mobile app. The in-app notification stays the source of
truth — the web app polls and subscribes to `public.notifications`.

The database still carries `public.device_tokens` and `public.push_outbox`
(the migrations are applied history and are never rewritten). They are
unused; a follow-up migration can drop them.

## Deploying them

```powershell
npx supabase login
npx supabase link --project-ref <project-ref>

npx supabase functions deploy matching-worker
```

The environment variables the runtime provides are used as they are:

| Variable | Provided by Supabase | Used for |
|---|---|---|
| `SUPABASE_URL` | yes | the project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | the privileged client |

## Scheduling them

The function is meant to run every minute. The Supabase cron needs the
`pg_cron` and `pg_net` extensions:

```sql
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'fixlink-matching-worker', '* * * * *',
  $$ select net.http_post(
       url := 'https://<project-ref>.supabase.co/functions/v1/matching-worker',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer <service-role-key>'
       ),
       body := '{}'::jsonb
     ); $$
);
```

> The service-role key in the cron payload is stored in the database.
> That is the usual Supabase pattern, but it is a secret in a database
> row: restrict the access to the `postgres` role, and never run this
> statement on a project that other people can read.

## Why the queue is in the database

A request that nobody answers must not sit in memory: the pilot has to
be able to look at what happened. `public.job_matches` records every
professional who was notified, with their score and their distance, so
the matching can be evaluated after the fact instead of guessed at.
