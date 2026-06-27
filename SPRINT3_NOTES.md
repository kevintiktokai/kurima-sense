# Sprint 3 Notes — Grower Capture Surface (frontend)

Backend Sprints 1–2 are done; this is the grower-facing capture valve. First
slice (this PR): **offline-capture foundation + harvest capture**. Remaining
events (field boundary, crop/variety/planting, input log, scouting, tasks) and
photo diagnosis follow.

## Why an app-level outbox (not Workbox BackgroundSync)
The existing service worker (`worker/index.ts`) has a `BackgroundSyncPlugin`, but
it only matches **same-origin `/api/`** requests. Our backend is **cross-origin**
(the Render API, paths like `/fields/{id}/harvest`), so those mutations never hit
that queue. A queued raw request also can't re-mint a Supabase JWT on replay —
tokens expire, so a replayed stale request would 401. So grower capture uses an
explicit **IndexedDB outbox** that the UI can surface and that re-authenticates
each item at send time.

## Architecture (all pure logic is unit-tested; storage + transport injected)
- `lib/offline/types.ts` — `OutboxItem`, `CaptureKind`, `OutboxStore` contract.
- `lib/offline/backoff.ts` — pure exponential backoff (5s→1h), `MAX_ATTEMPTS=8`,
  `isReadyToRetry`.
- `lib/offline/sync.ts` — `syncOutbox(store, send, now)`: drains ready items in
  creation order; success deletes; retriable failure re-arms with backoff;
  non-retriable (4xx validation) or exhausted retries park as `failed`.
- `lib/offline/store.ts` — `createMemoryStore` (tests/SSR) + `createIdbStore`
  (browser, guards SSR).
- `lib/offline/outbox.ts` — browser API: `enqueue`, `getItems`, `runSync`,
  `httpSend` (classifies 4xx=permanent vs network/5xx/408/429=retriable),
  `initOutboxAutoSync` (drains on `online` / tab focus / 60s interval),
  `subscribeOutbox` (pending-count pub/sub for the badge).
- `services/harvest.ts` — `submitHarvest`: online-first; validation errors throw
  (`HarvestValidationError`, surfaced inline, never queued); transient/offline →
  enqueued and replayed automatically. Wraps Sprint 1 `POST /fields/{id}/harvest`.

## UI
- `components/capture/HarvestForm.tsx` — validated form (mirrors backend: positive
  yield/area), online vs "saved offline" outcomes.
- `app/fields/[id]/harvest/page.tsx` — the capture route.
- `components/offline/OutboxSyncProvider.tsx` — mounted in root layout; starts
  auto-sync and shows an unobtrusive "N entries waiting to sync" badge.
- Additive "Record harvest" entry card on the consumer field-detail page
  (additive only — the guarded logic surface is untouched).

## Idempotency note
Each outbox item carries a client UUID and is deleted on a 2xx. The backend
harvest endpoint has no idempotency key, so a lost-2xx could double-insert (rare;
harvest is low-frequency). A server-side idempotency key is a candidate follow-up.

## Tests
`tests/offline-outbox.test.ts` — 10 tests over backoff + sync engine (success,
retriable re-arm, non-retriable park, exhaustion, ordering, gating, throwing
sender). Full suite: 197 pass; `tsc --noEmit` clean.

## Next in Sprint 3
Remaining capture events through the same outbox; scouting photo → existing
`/vision/analyze` diagnosis (per the agreed scope: photo diagnosis only this
sprint, voice/WhatsApp later).
