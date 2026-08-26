// Keyed single-flight: concurrent callers asking for the same thing share one
// request instead of each making their own.
//
// Deliberately the same shape and the same name as the backend's
// `services/singleflight.py` — `coalesce(key, inflight, producer)` — so the two
// halves of the system read alike when someone is following a request across
// them.
//
// Why the frontend needs its own
// ------------------------------
// `services/climate.ts` already had a TTL cache, and it was not enough. A cache
// answers "have we fetched this?"; it cannot answer "are we fetching this right
// now?". On a cold cache — a fresh page load, which is exactly when the app is
// judged — four components mounted together, all four missed, and all four
// fired the same request:
//
//     "path": "/climate/historical", "duration_ms": 4572.42
//     "path": "/climate/historical", "duration_ms": 4572.61
//     "path": "/climate/historical", "duration_ms": 4572.61
//     "path": "/climate/historical", "duration_ms": 4572.62
//
// Four requests for one answer, finishing within a fifth of a millisecond of
// each other. The backend's own coalescing is why they all returned at the same
// instant off one upstream call — but four HTTP requests were still made, and
// each one occupied a slot on a server Render runs with a single worker. The
// cache was never going to catch this: every one of those four checked it
// before any of them had anything to write.

/**
 * Run `producer` for `key`, or join the call already running for it.
 *
 * The entry is removed as soon as the promise settles, so this coalesces
 * concurrent callers and nothing more — it is not a cache and holds no result.
 * Pair it with one. A rejection is shared by everyone waiting, which is correct:
 * they asked the same question and there is one answer, including when the
 * answer is a failure.
 */
export function coalesce<T>(
    key: string,
    inflight: Map<string, Promise<T>>,
    producer: () => Promise<T>,
): Promise<T> {
    const existing = inflight.get(key)
    if (existing) return existing

    // `producer()` is called before the map is written, so a producer that
    // throws synchronously never leaves a dangling entry behind.
    const promise = (async () => producer())().finally(() => {
        // Only clear our own entry. Without this check a slow flight settling
        // after a newer one started would delete the newer entry and let the
        // next caller start a third.
        if (inflight.get(key) === promise) inflight.delete(key)
    })

    inflight.set(key, promise)
    return promise
}

/** A fresh in-flight map. Named for symmetry with the backend's helper. */
export function newInflightMap<T>(): Map<string, Promise<T>> {
    return new Map<string, Promise<T>>()
}
