/**
 * FixLink Ethiopia — the matching worker.
 *
 * The matching of a request is a **background job**, not something a
 * customer waits for on a screen. When a request is created it goes into
 * `public.matching_queue`, and this function drains that queue:
 *
 *   1. it claims the pending rows with `for update skip locked`, so two
 *      concurrent invocations never work on the same row;
 *   2. it asks the database to notify the next batch of professionals
 *      (`public.match_job`) or to widen the search radius
 *      (`public.expand_matching`);
 *   3. it records the outcome and moves on.
 *
 * The rules (who is eligible, how they are scored, when the search
 * widens) live in the database, not here. This function only decides
 * *when* to run them.
 *
 * Schedule it with the Supabase cron, for example every minute:
 *
 *   select cron.schedule(
 *     'fixlink-matching-worker', '* * * * *',
 *     $$ select net.http_post(
 *          url := 'https://<project-ref>.supabase.co/functions/v1/matching-worker',
 *          headers := jsonb_build_object(
 *            'Content-Type', 'application/json',
 *            'Authorization', 'Bearer <service-role-key>'
 *          ),
 *          body := '{}'::jsonb
 *        ); $$
 *   );
 */

// @ts-ignore — the Deno types are provided by the Supabase runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** The service-role key. It never leaves the server. */
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/** How many queue rows one invocation may claim. */
const BATCH_SIZE = 20;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface QueueRow {
  id: string;
  job_id: string;
  batch_number: number;
  radius_km: number | null;
  attempts: number;
}

/**
 * Claim the rows that are due.
 *
 * `for update skip locked` is what makes two workers safe: the second
 * one simply skips the rows the first one is holding.
 */
async function claim(): Promise<QueueRow[]> {
  const { data, error } = await supabase.rpc("claim_matching_queue", {
    p_limit: BATCH_SIZE,
  });

  if (error) throw new Error(`claim_matching_queue: ${error.message}`);
  return (data ?? []) as QueueRow[];
}

Deno.serve(async (request) => {
  if (SUPABASE_URL === "" || SERVICE_ROLE_KEY === "") {
    return new Response(
      JSON.stringify({ error: "not_configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const rows = await claim();
    const results: Record<string, unknown>[] = [];

    for (const row of rows) {
      try {
        // The first round asks for the first batch of professionals; the
        // later rounds widen the search radius.
        const notified = row.batch_number <= 1
          ? await supabase.rpc("match_job", {
              p_job_id: row.job_id,
              p_batch_number: row.batch_number,
            })
          : await supabase.rpc("expand_matching", { p_job_id: row.job_id });

        const count = notified.error ? 0 : (notified.data ?? 0);

        await supabase.rpc("complete_matching_queue", {
          p_id: row.id,
          p_notified: count,
        });

        results.push({ id: row.id, job: row.job_id, notified: count });
      } catch (error) {
        await supabase.rpc("fail_matching_queue", {
          p_id: row.id,
          p_error: error instanceof Error ? error.message : String(error),
        });
        results.push({
          id: row.id,
          job: row.job_id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return new Response(
      JSON.stringify({ processed: rows.length, results }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
