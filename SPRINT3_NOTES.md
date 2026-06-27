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

## Added since the first slice
- **Shared submit path** (`lib/offline/submit.ts`): `submitCapture({kind,endpoint,label,body})`
  — online-first, validation errors thrown (`CaptureValidationError`), transient/
  offline queued. Harvest + input-log both use it.
- **Input logging** (`services/inputLog.ts`, `components/capture/InputLogForm.tsx`,
  `app/fields/[id]/input/page.tsx`) — wraps `POST /inputs`, offline-capable.
- **Voice capture** (`lib/voice/parse.ts` pure+tested, `lib/voice/speech.ts` Web
  Speech wrapper, `components/capture/VoiceInput.tsx`): speak e.g. "applied 50 kg
  of Compound D" → fills quantity/unit/input-type. Degrades silently to typing
  when unsupported (iOS Safari).
- **Scouting + photo diagnosis** (`services/`… via `api.analyzeImage`,
  `components/capture/ScoutingCapture.tsx`, `app/fields/[id]/scout/page.tsx`):
  photo → `POST /vision/analyze` → issues / health score / treatment. Online-only
  (diagnosis needs the model); says so plainly when offline.
- Field-detail page now shows a 3-action capture group (harvest / input / scout),
  additive only.

Tests: `tests/voice-parse.test.ts` (7) + `tests/offline-outbox.test.ts` (10).
Full suite 204 pass; `tsc --noEmit` clean.

## Task capture (added)
- `services/taskCapture.ts` + `components/capture/TaskForm.tsx` +
  `app/fields/[id]/task/page.tsx` — wraps `POST /ai/tasks` (title / activity_type
  / priority + optional field/date) via the offline submit path, voice on the
  title. Field-detail capture group is now 4 actions (harvest / input / scout /
  task).

## Six-event status
- harvest ✓ · input log ✓ · scouting (photo→diagnosis) ✓ · tasks ✓
- field boundary + crop/variety/planting — already exist in the consumer field
  creation flow (leaflet-draw); not re-solved. Adding *offline* support to that
  flow is a separate slice.

## Offline field creation + captures management (added)
- **Offline field creation** (`services/fieldCapture.ts`): `FieldManagement.saveField`
  now falls back to the outbox when offline or on a connectivity failure mid-save
  (queues the same `POST /fields` body — name, crop, coordinates, planting date,
  variety, etc., so field boundary + crop/variety/planting are all captured
  offline together). Online path is unchanged (still `api.saveField` with its
  cache invalidation).
- **Pending-uploads view** (`app/dashboard/captures/page.tsx`): lists queued vs
  failed captures with per-item Retry / Discard and a "Sync now" action; the
  floating sync badge now links here.

## Six-event status — all captured
harvest ✓ · input log ✓ (voice) · scouting photo→diagnosis ✓ · tasks ✓ (voice) ·
field boundary ✓ (offline) · crop/variety/planting ✓ (part of field creation).

## Still open in Sprint 3 (future slices)
- Persist scouting **observations** server-side (today they're localStorage pins;
  there is no scouting persist endpoint — needs a small backend addition) and
  queue photos for deferred diagnosis when offline.
- WhatsApp intake — **out of scope for now** (per product decision). When taken
  up: inbound webhook on the backend via the official WhatsApp Business Cloud API
  (BSP such as Twilio sandbox → 360dialog/WABA); unofficial web-automation
  libraries are ToS-violating and excluded. Reuses the capture events.
- Server-side idempotency key so a lost-2xx can't double-insert.
