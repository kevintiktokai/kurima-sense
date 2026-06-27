# Follow-up specs

Two flagged follow-ups, specced for a later slice. Neither is a blocker; both
are reliability/UX improvements surfaced during the Sprint 3 glitch fixes and
the PWA audit.

---

## Spec 1 — Persist dismissal of AI-suggested actions

### Problem
The dashboard "Today's Actions" come from `GET /ai/insights`, which generates
**ephemeral** suggestions with synthetic ids (`weather-spray-{ts}`,
`action-stage-{field_id}-{idx}`, `health-{field_id}`). The glitch fix made
check-off a clean **local** dismissal (no more flicker), but because there is no
record of the dismissal, a dismissed suggestion **reappears** the next time
insights regenerate (relaunch / periodic refresh). Growers will re-see things
they already actioned.

### Goal
A dismissed AI suggestion stays gone across sessions until it is genuinely
re-relevant, without polluting the real `farm_tasks` table.

### Approach (recommended: A)
**A. `action_dismissals` table + stable dedupe key.**
- Synthetic ids embed timestamps, so they are not stable. The backend must emit a
  **stable `dedupe_key`** per action in `/ai/insights` — derived from semantic
  content, not the timestamp, e.g. `f"{type}:{field_id or ''}:{slug(title_template)}"`.
- New table:
  ```sql
  CREATE TABLE IF NOT EXISTS action_dismissals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      dedupe_key TEXT NOT NULL,
      dismissed_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, dedupe_key)
  );
  -- RLS enabled deny-by-default (backend owner bypasses), per migrations 004/005.
  ```
- Endpoint: `POST /ai/dismissals` `{ dedupe_key }` → upsert for the caller.
- `GET /ai/insights` excludes actions whose `dedupe_key` was dismissed within a
  TTL window (suggestion: 3 days — "today's actions" are short-lived; after the
  window a recurring condition can legitimately resurface).

**B. (rejected) Materialize into a completed `farm_task` on dismissal** — heavier,
pollutes the task list/history with non-tasks.

### Frontend
- `services/api.ts`: add `dismissAction(dedupeKey)`.
- `Overview.handleActionComplete`: for synthetic actions (non-UUID id) call
  `dismissAction(action.dedupe_key)` (fire-and-forget, keep optimistic removal);
  real task UUIDs keep using `updateTask` (current behaviour).
- Action items must carry `dedupe_key` (add to the `ActionItem` shape + the
  `/ai/insights` mapping).

### Acceptance
- Dismiss an AI action → it does not reappear on refresh/relaunch within the TTL.
- User-scoped (one grower's dismissals don't affect another).
- Real persisted tasks still complete via `updateTask`.
- Cross-tenant/user isolation test on the dismiss endpoint.

### Effort
Small: 1 migration + 1 endpoint + `dedupe_key`/filter in `/ai/insights`
(backend); ~20 lines (frontend).

---

## Spec 2 — Reliable PWA update delivery

### Problem
`next-pwa` is configured with `skipWaiting: true` + `clientsClaim: true`, so a new
service worker **activates** on next launch/navigation and controls the page —
but an **already-open** installed PWA keeps running the **JS bundle it loaded at
launch** until it reloads. A continuously-open session can therefore miss a
deploy (e.g. these glitch fixes) until the user happens to relaunch.

### Goal
Surface a new version to open PWA sessions promptly — **without** disrupting an
in-progress capture (growers may be mid-form, offline).

### Approach
A small client component (mount in the root layout next to `OutboxSyncProvider`)
that uses the service-worker registration lifecycle:
- On `updatefound` → the installing worker reaching `installed` **while a
  controller already exists** = an update is ready.
- Show a **non-intrusive toast**: "New version available — Refresh", with a
  Refresh button that calls `window.location.reload()`. **Manual, not auto.**
- Do **not** auto-reload on `controllerchange`: a forced reload mid-capture could
  lose unsubmitted form input. (Outbox items in IndexedDB are safe, but an
  un-saved form field is not.) Optionally, only offer/auto-apply when
  `getPendingCount() === 0` and no capture route is active.

### Why not just rely on skipWaiting
It already activates the new SW; this spec only adds the **prompt** so open
sessions know to refresh. Keeps the current safe behaviour, adds visibility.

### Implementation notes
- `components/offline/PwaUpdatePrompt.tsx`: `navigator.serviceWorker.ready` →
  `reg.addEventListener('updatefound', …)`; track `installing.state === 'installed'
  && navigator.serviceWorker.controller`. Reuse the toast styling from
  `OutboxSyncProvider`.
- SW lifecycle is **prod-only** — must be verified manually: open the installed
  PWA, deploy, confirm the toast appears within the SW update-check window
  (~minutes or on navigation), tap Refresh, confirm the new version loads.

### Acceptance
- After a deploy, an open PWA shows an update toast (on the next SW update check
  or navigation); tapping Refresh loads the new build.
- No automatic reload while a capture form is open or the outbox has pending items.

### Effort
Small (~1 component), but **budget real-device prod verification** — SW bugs only
appear in production (see Appendix B in CLAUDE.md).

### Interim (already true)
Current behaviour is acceptable for launch: fixes land on the next relaunch/
navigation because of `skipWaiting`/`clientsClaim`/`cleanupOutdatedCaches`.
Users can also force-update by closing and reopening the installed app.

---

## PWA audit summary (2026-06, during glitch fixes)
Healthy: manifest complete (standalone, scoped `/`, 10 icons incl. maskable, 3
shortcuts); SW has `skipWaiting`/`clientsClaim`/`cleanupOutdatedCaches`; custom
worker with NetworkFirst navigations (3s), images `CacheFirst` **status [200]
only**, map tiles excluded, fonts handled, `/offline` precached.
Fixed: plan-page nested `h-screen overflow-y-auto` scroll freeze (unique
instance). Watch: `AIAgronomistChat` uses `h-[calc(100vh-…)]` which can be
slightly off in iOS standalone — not reported, low priority.
