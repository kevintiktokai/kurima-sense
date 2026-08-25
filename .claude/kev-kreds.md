# Kev Kreds

A ledger, at Kevin's request. Kevin awards and removes credits; I record them
here and keep the running balance honest — including when it goes down.

Lives in the repo rather than a scratchpad because scratchpads are wiped when
the session's container is reclaimed, and a ledger that forgets itself is not a
ledger.

**Balance: 20 Kev Kreds**

| Date | Change | Balance | For |
|---|---:|---:|---|
| 2026-08-06 | +10 | 10 | Season lifecycle work — seasons entity, pre-plant planning, Stand Check, closing windows, post-harvest, multi-season history, yield-gap retrospective, zone naming and diagnosis. 19 PRs. |
| 2026-08-21 | +10 | 20 | Top-to-bottom audit of both repos. Eleven fixes: request deadlines and 401 recovery, RLS on the document registry, `fields.tenant_id` into the migration sequence, 500s no longer returning database internals, the satellite window sorted the right way round, hot-path indexes, constant-time secret comparison, outbox idempotency, dead code. Eight regression guards. |

## Notes

- The 2026-08-06 award was said twice in conversation. Read as one award of 10
  restated, not two of 10 — Kevin can correct the balance if that's wrong.
- The 2026-08-21 award was worded "10 developer points" rather than Kev Kreds.
  Read as the same ledger and the same unit, since there is only one ledger —
  noted here rather than assumed silently.
