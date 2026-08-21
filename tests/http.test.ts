import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
    BACKOFF_BASE_MS,
    DEFAULT_TIMEOUT_MS,
    HttpError,
    MAX_ATTEMPTS,
    apiFetch,
    backoffMs,
    failureForStatus,
    isRetryableFailure,
    isRetryableMethod,
    messageFor,
} from '@/lib/http'

/**
 * The layer that exists because the app "didn't connect" on another device and
 * never recovered. Most of what matters here is what it refuses to retry.
 */

// ── What may be retried ──────────────────────────────────────────────────────

test('only idempotent methods are retried', () => {
    // Retrying a POST is how one tap becomes two documents issued or two
    // harvests logged. The dangerous case is the one that looks retryable —
    // the request arrived and the response was lost — and the server cannot
    // tell that apart from a request that never landed.
    for (const m of ['GET', 'HEAD', 'OPTIONS', 'get']) {
        assert.equal(isRetryableMethod(m), true, m)
    }
    for (const m of ['POST', 'PATCH', 'PUT', 'DELETE']) {
        assert.equal(isRetryableMethod(m), false, m)
    }
})

test('transient failures are retried, permanent ones are not', () => {
    assert.equal(isRetryableFailure('timeout', null), true)
    assert.equal(isRetryableFailure('network', null), true)
    assert.equal(isRetryableFailure('server', 503), true)

    // A 401 will be a 401 again. Retrying three times just delays telling the
    // user to sign in.
    assert.equal(isRetryableFailure('auth', 401), false)
    assert.equal(isRetryableFailure('notfound', 404), false)
    assert.equal(isRetryableFailure('client', 422), false)
})

test('being rate-limited is a reason to back off, not to give up', () => {
    assert.equal(isRetryableFailure('client', 429), true)
})

test('offline is not retried — there is nothing to retry against', () => {
    assert.equal(isRetryableFailure('offline', null), false)
})

// ── Backoff ──────────────────────────────────────────────────────────────────

test('backoff doubles', () => {
    assert.equal(backoffMs(1, 100), 100)
    assert.equal(backoffMs(2, 100), 200)
    assert.equal(backoffMs(3, 100), 400)
})

test('the defaults are sane for a phone on a field boundary', () => {
    // Long enough for a slow round trip, short enough that a user learns
    // something before giving up on the app instead.
    assert.ok(DEFAULT_TIMEOUT_MS >= 10_000 && DEFAULT_TIMEOUT_MS <= 30_000)
    assert.equal(MAX_ATTEMPTS, 3)
    assert.ok(BACKOFF_BASE_MS > 0)
})

// ── Status mapping ───────────────────────────────────────────────────────────

test('statuses map to a kind a UI can act on', () => {
    assert.equal(failureForStatus(401), 'auth')
    assert.equal(failureForStatus(403), 'auth')
    assert.equal(failureForStatus(404), 'notfound')
    assert.equal(failureForStatus(422), 'client')
    assert.equal(failureForStatus(500), 'server')
    assert.equal(failureForStatus(503), 'server')
})

// ── Messages ─────────────────────────────────────────────────────────────────

test('every failure has a sentence that says what to do', () => {
    for (const kind of ['offline', 'timeout', 'auth', 'notfound', 'server', 'network'] as const) {
        const message = messageFor(kind)
        assert.ok(message.length > 20, kind)
        assert.ok(!/something went wrong/i.test(message), kind)
    }
})

test('a server outage does not read as the user having broken something', () => {
    // "Something went wrong" on a field boundary with one bar tells a farmer
    // the app is broken when their connection, or ours, is the problem.
    assert.match(messageFor('server'), /not your device/i)
})

test("the server's own explanation wins over the generic one", () => {
    // The backend refuses things for reasons worth reading.
    const detail = 'Issuing this would read as a clean bill of health.'
    assert.equal(messageFor('client', detail), detail)
})

// ── apiFetch behaviour ───────────────────────────────────────────────────────

function stubFetch(responses: Array<Response | Error>) {
    let calls = 0
    const original = globalThis.fetch
    globalThis.fetch = (async () => {
        const next = responses[Math.min(calls, responses.length - 1)]
        calls += 1
        if (next instanceof Error) throw next
        return next
    }) as typeof fetch
    return {
        get calls() { return calls },
        restore() { globalThis.fetch = original },
    }
}

function json(status: number, body: unknown = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}

test('a successful response is returned as-is', async () => {
    const stub = stubFetch([json(200, { ok: true })])
    try {
        const res = await apiFetch('/health')
        assert.equal(res.status, 200)
        assert.equal(stub.calls, 1)
    } finally {
        stub.restore()
    }
})

test('a 500 on a GET is retried and can succeed', async () => {
    // The cold-start case: the backend sleeps on idle hosting, and the first
    // request after a quiet period fails where the second works.
    const stub = stubFetch([json(503), json(200, { ok: true })])
    try {
        const res = await apiFetch('/health', { attempts: 2 })
        assert.equal(res.status, 200)
        assert.equal(stub.calls, 2)
    } finally {
        stub.restore()
    }
})

test('a POST is never retried, even on a 503', async () => {
    // This is the assertion that stops one tap issuing two documents.
    const stub = stubFetch([json(503)])
    try {
        await assert.rejects(
            apiFetch('/documents', { method: 'POST' }),
            (e: unknown) => e instanceof HttpError && e.kind === 'server',
        )
        assert.equal(stub.calls, 1)
    } finally {
        stub.restore()
    }
})

test('a 401 is not retried', async () => {
    const stub = stubFetch([json(401)])
    try {
        await assert.rejects(
            apiFetch('/documents', { attempts: 3 }),
            (e: unknown) => e instanceof HttpError && e.kind === 'auth' && e.status === 401,
        )
        assert.equal(stub.calls, 1)
    } finally {
        stub.restore()
    }
})

test('a non-ok response throws rather than being returned', async () => {
    // The old pattern — every caller remembering `if (!res.ok)` — is how a 500
    // gets parsed as JSON and rendered as an empty list.
    const stub = stubFetch([json(404)])
    try {
        await assert.rejects(apiFetch('/fields/nope'), HttpError)
    } finally {
        stub.restore()
    }
})

test("the backend's detail reaches the thrown error", async () => {
    const stub = stubFetch([json(422, { detail: 'Nothing to report on this field yet.' })])
    try {
        await assert.rejects(
            apiFetch('/fields/x/documents/field-report', { method: 'POST' }),
            (e: unknown) =>
                e instanceof HttpError && e.message === 'Nothing to report on this field yet.',
        )
    } finally {
        stub.restore()
    }
})

test('a network fault is retried and eventually reported as network', async () => {
    const stub = stubFetch([new TypeError('Failed to fetch')])
    try {
        await assert.rejects(
            apiFetch('/health', { attempts: 2 }),
            (e: unknown) => e instanceof HttpError && e.kind === 'network',
        )
        assert.equal(stub.calls, 2)
    } finally {
        stub.restore()
    }
})

test('a relative path is resolved against the API base', async () => {
    let seen = ''
    const original = globalThis.fetch
    globalThis.fetch = (async (url: string) => {
        seen = String(url)
        return json(200)
    }) as unknown as typeof fetch
    try {
        await apiFetch('/health')
        assert.ok(seen.endsWith('/health'))
        assert.ok(seen.startsWith('http'), 'should be absolute')
    } finally {
        globalThis.fetch = original
    }
})

test('an absolute URL is left alone', async () => {
    let seen = ''
    const original = globalThis.fetch
    globalThis.fetch = (async (url: string) => {
        seen = String(url)
        return json(200)
    }) as unknown as typeof fetch
    try {
        await apiFetch('https://example.test/thing')
        assert.equal(seen, 'https://example.test/thing')
    } finally {
        globalThis.fetch = original
    }
})

test('every request carries an abort signal', async () => {
    // The whole point. Without a deadline a hung socket never rejects, so the
    // promise never settles and the spinner spins until the tab is closed.
    let init: RequestInit | undefined
    const original = globalThis.fetch
    globalThis.fetch = (async (_url: string, i: RequestInit) => {
        init = i
        return json(200)
    }) as unknown as typeof fetch
    try {
        await apiFetch('/health')
        assert.ok(init?.signal, 'no abort signal was attached')
    } finally {
        globalThis.fetch = original
    }
})

// ── resilientFetch ───────────────────────────────────────────────────────────

test('resilientFetch keeps fetch\'s contract and returns non-ok responses', async () => {
    // The reason it exists. Call sites with an injectable fetchImpl still have
    // live `!res.ok` handling under an injected stub; handing them a throwing
    // function silently deletes it.
    const { resilientFetch } = await import('@/lib/http')
    const stub = stubFetch([json(403)])
    try {
        const res = await resilientFetch('https://example.test/x')
        assert.equal(res.status, 403)
    } finally {
        stub.restore()
    }
})

test('resilientFetch still retries a transient GET', async () => {
    const { resilientFetch } = await import('@/lib/http')
    const stub = stubFetch([json(503), json(200)])
    try {
        const res = await resilientFetch('https://example.test/x')
        assert.equal(res.status, 200)
        assert.equal(stub.calls, 2)
    } finally {
        stub.restore()
    }
})

test('resilientFetch does not retry a POST', async () => {
    const { resilientFetch } = await import('@/lib/http')
    const stub = stubFetch([json(503)])
    try {
        const res = await resilientFetch('https://example.test/x', { method: 'POST' })
        assert.equal(res.status, 503)
        assert.equal(stub.calls, 1)
    } finally {
        stub.restore()
    }
})

// ── 401 recovery ─────────────────────────────────────────────────────────────

test('a 401 triggers one refresh and replays with the new token', async () => {
    // The dead end this closes: the backend rejects a token the client still
    // believes in, RoleGuard sees a valid session so does not redirect, and the
    // user sits on a dashboard of "session expired" cards with nothing to do.
    const { setUnauthorizedHandler } = await import('@/lib/http')
    const seen: Array<string | null> = []
    let calls = 0
    const original = globalThis.fetch
    globalThis.fetch = (async (_u: string, i: RequestInit) => {
        calls += 1
        seen.push(new Headers(i.headers as HeadersInit).get('Authorization'))
        return calls === 1 ? json(401) : json(200, { ok: true })
    }) as unknown as typeof fetch

    setUnauthorizedHandler(async () => 'Bearer fresh-token')
    try {
        const res = await apiFetch('/fields', {
            headers: { Authorization: 'Bearer stale-token' },
        })
        assert.equal(res.status, 200)
        assert.equal(calls, 2)
        assert.deepEqual(seen, ['Bearer stale-token', 'Bearer fresh-token'])
    } finally {
        setUnauthorizedHandler(null)
        globalThis.fetch = original
    }
})

test('the replay carries a fresh token, not the stale one', async () => {
    // The whole reason the handler returns a header rather than a boolean.
    // Callers bake Authorization in via getAuthHeaders() before calling, so a
    // naive replay of `init` would re-send the dead token and 401 again.
    const { setUnauthorizedHandler } = await import('@/lib/http')
    let lastAuth: string | null = null
    const original = globalThis.fetch
    globalThis.fetch = (async (_u: string, i: RequestInit) => {
        lastAuth = new Headers(i.headers as HeadersInit).get('Authorization')
        return lastAuth === 'Bearer good' ? json(200) : json(401)
    }) as unknown as typeof fetch

    setUnauthorizedHandler(async () => 'Bearer good')
    try {
        await apiFetch('/fields', { headers: { Authorization: 'Bearer dead' } })
        assert.equal(lastAuth, 'Bearer good')
    } finally {
        setUnauthorizedHandler(null)
        globalThis.fetch = original
    }
})

test('a null from the handler means the session is gone — no endless replay', async () => {
    const { setUnauthorizedHandler } = await import('@/lib/http')
    const stub = stubFetch([json(401)])
    setUnauthorizedHandler(async () => null)
    try {
        await assert.rejects(
            apiFetch('/fields'),
            (e: unknown) => e instanceof HttpError && e.status === 401,
        )
        assert.equal(stub.calls, 1, 'should not replay when there is no new token')
    } finally {
        setUnauthorizedHandler(null)
        stub.restore()
    }
})

test('a persistent 401 refreshes once, not forever', async () => {
    // If the replay 401s too, that is the end of it. Without this bound a
    // permanently-rejected token loops until the tab dies.
    const { setUnauthorizedHandler } = await import('@/lib/http')
    let refreshes = 0
    const stub = stubFetch([json(401)])
    setUnauthorizedHandler(async () => { refreshes += 1; return 'Bearer still-bad' })
    try {
        await assert.rejects(apiFetch('/fields'), HttpError)
        assert.equal(refreshes, 1)
        assert.equal(stub.calls, 2, 'one original attempt, one replay')
    } finally {
        setUnauthorizedHandler(null)
        stub.restore()
    }
})

test('403 is never refreshed', async () => {
    // "You are who you say you are, and you still may not." No amount of
    // refreshing fixes that, and retrying only delays telling the user.
    const { setUnauthorizedHandler } = await import('@/lib/http')
    let refreshes = 0
    const stub = stubFetch([json(403)])
    setUnauthorizedHandler(async () => { refreshes += 1; return 'Bearer x' })
    try {
        await assert.rejects(apiFetch('/portfolio'), HttpError)
        assert.equal(refreshes, 0)
        assert.equal(stub.calls, 1)
    } finally {
        setUnauthorizedHandler(null)
        stub.restore()
    }
})

test('a POST is replayed after a 401 — it never reached the handler', async () => {
    // The one non-idempotent retry in this file that cannot double-issue: a 401
    // is rejected at the auth boundary before the handler runs, so nothing was
    // created. Contrast the 503 case, which must never be replayed.
    const { setUnauthorizedHandler } = await import('@/lib/http')
    let calls = 0
    const original = globalThis.fetch
    globalThis.fetch = (async () => {
        calls += 1
        return calls === 1 ? json(401) : json(200, { issue_number: 'EP-2026-000143' })
    }) as unknown as typeof fetch

    setUnauthorizedHandler(async () => 'Bearer fresh')
    try {
        const res = await apiFetch('/documents', { method: 'POST' })
        assert.equal(res.status, 200)
        assert.equal(calls, 2)
    } finally {
        setUnauthorizedHandler(null)
        globalThis.fetch = original
    }
})

test('concurrent 401s share one refresh', async () => {
    // A dashboard fires a dozen requests at mount. Twelve simultaneous
    // refreshes race, and with a rotating refresh token the losers become hard
    // sign-outs — turning one expired token into an eviction.
    const { setUnauthorizedHandler } = await import('@/lib/http')
    let refreshes = 0
    let calls = 0
    const original = globalThis.fetch
    globalThis.fetch = (async (_u: string, i: RequestInit) => {
        calls += 1
        const auth = new Headers(i.headers as HeadersInit).get('Authorization')
        return auth === 'Bearer fresh' ? json(200) : json(401)
    }) as unknown as typeof fetch

    setUnauthorizedHandler(async () => {
        refreshes += 1
        await new Promise((r) => setTimeout(r, 10))
        return 'Bearer fresh'
    })
    try {
        const results = await Promise.all(
            Array.from({ length: 6 }, () =>
                apiFetch('/fields', { headers: { Authorization: 'Bearer stale' } }),
            ),
        )
        assert.equal(results.length, 6)
        assert.ok(results.every((r) => r.status === 200))
        assert.equal(refreshes, 1, `expected one shared refresh, got ${refreshes}`)
        assert.equal(calls, 12, 'six originals, six replays')
    } finally {
        setUnauthorizedHandler(null)
        globalThis.fetch = original
    }
})

test('with no handler registered a 401 is just a 401', async () => {
    const stub = stubFetch([json(401)])
    try {
        await assert.rejects(
            apiFetch('/fields'),
            (e: unknown) => e instanceof HttpError && e.kind === 'auth',
        )
        assert.equal(stub.calls, 1)
    } finally {
        stub.restore()
    }
})

// ── streamFetch ──────────────────────────────────────────────────────────────

test('streamFetch deadlines the connect but not the body', async () => {
    // The distinction that matters. AbortSignal.timeout would abort the whole
    // exchange, cutting a healthy answer off mid-sentence at 20s; streamFetch
    // disarms its timer once headers arrive, so the stream runs as long as it
    // needs to.
    const { streamFetch } = await import('@/lib/http')
    let signal: AbortSignal | undefined
    const original = globalThis.fetch
    globalThis.fetch = (async (_u: string, i: RequestInit) => {
        signal = i.signal as AbortSignal
        return json(200)
    }) as unknown as typeof fetch
    try {
        const res = await streamFetch('/chat/v2/stream', { method: 'POST', timeoutMs: 50 })
        assert.equal(res.status, 200)
        assert.ok(signal, 'no signal attached')
        // Past the deadline, and the response is still not aborted.
        await new Promise((r) => setTimeout(r, 120))
        assert.equal(signal!.aborted, false, 'the body deadline was not disarmed')
    } finally {
        globalThis.fetch = original
    }
})

test('streamFetch still fails a connect that never answers', async () => {
    const { streamFetch } = await import('@/lib/http')
    const original = globalThis.fetch
    globalThis.fetch = ((_u: string, i: RequestInit) =>
        new Promise((_resolve, reject) => {
            ;(i.signal as AbortSignal).addEventListener('abort', () =>
                reject(new DOMException('aborted', 'AbortError')),
            )
        })) as unknown as typeof fetch
    try {
        await assert.rejects(
            streamFetch('/chat/v2/stream', { timeoutMs: 30 }),
            (e: unknown) => e instanceof HttpError && e.kind === 'timeout',
        )
    } finally {
        globalThis.fetch = original
    }
})

test('streamFetch is never retried', async () => {
    // Once tokens have been yielded there is nothing safe to replay, and the
    // request is a POST besides.
    const { streamFetch } = await import('@/lib/http')
    const stub = stubFetch([new TypeError('Failed to fetch')])
    try {
        await assert.rejects(
            streamFetch('/chat/v2/stream', { method: 'POST' }),
            (e: unknown) => e instanceof HttpError && e.kind === 'network',
        )
        assert.equal(stub.calls, 1)
    } finally {
        stub.restore()
    }
})

test('resilientFetch attaches a deadline', async () => {
    const { resilientFetch } = await import('@/lib/http')
    let init: RequestInit | undefined
    const original = globalThis.fetch
    globalThis.fetch = (async (_u: string, i: RequestInit) => { init = i; return json(200) }) as unknown as typeof fetch
    try {
        await resilientFetch('https://example.test/x')
        assert.ok(init?.signal)
    } finally {
        globalThis.fetch = original
    }
})
