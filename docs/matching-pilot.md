# Matching configuration — Dire Dawa pilot

The matching parameters live in `public.matching_config` (single row, `id = 1`)
and are edited at `/admin/matching-config`. The table's CHECK constraints are
mirrored by `apps/web/src/features/admin/matching-schema.ts`, so an invalid
value is rejected before it reaches Postgres.

## Values in the live project (2026-10-23)

| Parameter | Live value | Database range |
|---|---:|---|
| `batch_size` | 5 | 1–50 |
| `timeout_minutes` | 30 | 1–1440 |
| `radius_expansion_km` | 5 | > 0 |
| `max_search_radius_km` | 25 | > 0 |
| `max_expansion_rounds` | 3 | 0–10 |
| `expiration_hours` | 72 | 1–720 |
| `max_concurrent_jobs` | 5 | 1–100 |

These are the migration defaults. They have **not** been changed as part of
release preparation.

## Provisional pilot values

A small Dire Dawa pilot has nine urban kebeles and a handful of verified
professionals. Notifying five professionals at once can exhaust the available
supply for one request, and a 25 km radius reaches well beyond the urban
kebeles into the rural woredas.

Recommended starting point, to be applied only with the pilot owner's
approval:

| Parameter | Provisional | Why |
|---|---:|---|
| `batch_size` | 3 | Leaves supply for concurrent requests while still reaching every verified professional early. |
| `timeout_minutes` | 15 | A customer in a pilot hour should not wait 30 minutes for the next round. |
| `radius_expansion_km` | 5 | One expansion step still stays inside the urban area. |
| `max_search_radius_km` | 15 | Covers the nine urban kebeles; excludes most of the rural woredas. |
| `max_expansion_rounds` | 2 | Two widenings (5 km → 15 km) are enough for the city. |
| `expiration_hours` | 48 | Short enough to recycle demand, long enough for a weekend. |
| `max_concurrent_jobs` | 3 | Keeps a new professional from being overwhelmed during the pilot. |

These are provisional, not measured. Change them when the pilot data in
`job_matches` says otherwise.

## Validation performed

- `matchingConfigSchema` rejects out-of-range values, fractional integers and
  an expansion radius larger than the maximum radius
  (`src/tests/matching-config.test.ts`, 10 assertions).
- The live row was read and is inside every database constraint.
- The admin form now loads and saves the row (the previous page used hooks in
  a server component and could not build).

## Measurement requirements

The pilot must produce enough data to justify the values above. The platform
already records the dataset; nothing new needs to be built.

**Sources**

- `job_matches` — every professional notified, with `score`,
  `score_components`, `distance_km`, `batch_number`, `notified_at`,
  `response_status`.
- `job_requests` — creation time, status, `sub_city_code`.
- `quotations` — time from request to first quotation, status.
- `bookings` — accepted quotations and completed jobs.
- `matching_queue` — claimed, failed and retried rows
  (`attempts`, `last_error`).

**Metrics and minimum targets for a go/no-go**

| Metric | Definition | Target |
|---|---|---|
| Fill rate | Requests with at least one quotation within 48 h | ≥ 70 % |
| Time to first quotation | p50 / p95 from `job_requests.created_at` to first `quotations.created_at` | p50 ≤ 2 h, p95 ≤ 24 h |
| Match response rate | `job_matches.response_status <> 'pending'` at expiry | ≥ 40 % |
| Round efficiency | Share of matched requests filled in round 1 | ≥ 60 % |
| Unmatched rate | Requests ending with zero matches after all rounds | ≤ 10 % |
| Queue health | `matching_queue` rows failed / claimed | ≤ 2 % |
| Supply coverage | Verified, available professionals per urban kebele | ≥ 1 in ≥ 6 of 9 kebeles |

**Sample size.** At least 50 requests and four weeks of data before changing
the values. Below that, a single busy day moves every percentage point.

**Review cadence.** Weekly during the pilot; recompute the table from
`job_matches` and `quotations`, not from memory. Record the date, the values
and the reason for every change in the audit trail (the admin screen does not
write an audit row today; add the change to the pilot log).

## How to change

1. `/admin/matching-config` (administrator only), or
2. SQL with the service role:

```sql
update public.matching_config
   set batch_size = 3,
       timeout_minutes = 15,
       radius_expansion_km = 5,
       max_search_radius_km = 15,
       max_expansion_rounds = 2,
       expiration_hours = 48,
       max_concurrent_jobs = 3,
       updated_at = now()
 where id = 1;
```

Changing the row only affects the **next** matching round; matches already in
`job_matches` keep their batch and score.
