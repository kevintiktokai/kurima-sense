// The one place a request to the backend is made.
// Pure decisions are unit-tested in tests/http.test.ts.
//
// Written because of a real failure: the app was opened on a different device
// and "didn't connect" — no error, no retry, no recovery. There were 58 raw
// `fetch(` call sites across 19 files and **not one timeout or retry among
// them**. A hung socket on a mobile network never rejects, so the promise never
// settles, so the spinner spins forever and the user is told nothing.
//
// Three things a browser `fetch` does not give you and every one of those call
// sites needed:
//
//   1. **A deadline.** `fetch` has no default timeout. A request to a host that
//      accepts the connection and then goes quiet hangs until the tab is closed.
//   2. **A retry for the cold start.** The backend sleeps on idle hosting. The
//      first request after a quiet period can take longer than any sane
//      deadline, and failing it permanently is wrong when trying again works.
//   3. **An error a human can act on.** "Failed to fetch" is the same string
//      whether the phone is in a tunnel, the token expired, or the server threw.

import { API_BASE_URL } from '@/lib/api-base'

/** What went wrong, in terms a UI can turn into a sentence. */
export type HttpFailure =
    | 'offline'   // the device has no connection
    | 'timeout'   // we gave up waiting
    | 'auth'      // 401/403 — signed out, or not permitted
    | 'notfound'  // 404
    | 'client'    // other 4xx — our request was wrong
    | 'server'    // 5xx — their side
    | 'network'   // DNS, TLS, CORS, connection refused

export class HttpError extends Error {
    readonly kind: HttpFailure
    readonly status: number | null

    constructor(kind: HttpFailure, message: string, status: number | null = null) {
        super(message)
        this.name = 'HttpError'
        this.kind = kind
        this.status = status
    }
}

/**
 * Default deadline.
 *
 * Long enough for a slow 3G round trip to a warm server, short enough that a
 * user watching a spinner learns something before they give up on the app
 * instead. Overridable per call — document generation renders a PDF and
 * legitimately needs longer.
 */
export const DEFAULT_TIMEOUT_MS = 20_000

/** Attempts, including the first. Three is two retries. */
export const MAX_ATTEMPTS = 3

/** Base backoff. Doubles per attempt: 600ms, then 1200ms. */
export const BACKOFF_BASE_MS = 600

/**
 * Whether a failed attempt is worth repeating.
 *
 * **Only idempotent methods.** Retrying a POST is how one tap becomes two
 * documents issued, two harvests logged, or two growers created — and the
 * dangerous case is precisely the one that looks retryable, where the request
 * arrived and the *response* was lost. The server cannot tell those apart, so
 * we do not guess.
 */
export function isRetryableMethod(method: string): boolean {
    return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())
}

/**
 * Whether a failure is transient.
 *
 * 5xx and network faults are worth another go. 4xx is not: the request was
 * wrong and will be wrong again, and retrying a 401 three times just delays the
 * moment the user is told to sign in.
 *
 * 429 is deliberately included — the backend rate-limits, and backing off is
 * the correct response to being asked to.
 */
export function isRetryableFailure(kind: HttpFailure, status: number | null): boolean {
    if (kind === 'offline') return false // nothing to retry against
    if (kind === 'timeout' || kind === 'network' || kind === 'server') return true
    return status === 429
}

/** Backoff for the attempt about to be made (1-indexed). */
export function backoffMs(attempt: number, base = BACKOFF_BASE_MS): number {
    return base * 2 ** (attempt - 1)
}

/** Map an HTTP status onto a failure kind. */
export function failureForStatus(status: number): HttpFailure {
    if (status === 401 || status === 403) return 'auth'
    if (status === 404) return 'notfound'
    if (status >= 500) return 'server'
    return 'client'
}

/**
 * A sentence to show the user.
 *
 * Each says what happened *and* what to do, because "Something went wrong" on a
 * field boundary in Mazowe with one bar of signal is worse than silence — it
 * tells a farmer the app is broken when their connection is the problem.
 */
export function messageFor(kind: HttpFailure, detail?: string): string {
    if (detail) return detail
    switch (kind) {
        case 'offline':
            return "You're offline. This will send when you're back on a connection."
        case 'timeout':
            return 'The server took too long to answer. Check your signal and try again.'
        case 'auth':
            return 'Your session has expired. Sign in again to continue.'
        case 'notfound':
            return "That doesn't exist, or it has been removed."
        case 'server':
            return 'The server had a problem. It was not your device — try again shortly.'
        case 'network':
            return "Couldn't reach the server. Check your connection and try again."
        default:
            return 'That request could not be completed.'
    }
}

/**
 * What to do when the backend says 401 but the client thinks it is signed in.
 *
 * The two can disagree. `AuthProvider` refreshes on tab focus and on bfcache
 * restore, so a client session usually looks healthy — but the *backend* can
 * still reject the token: clock skew, a rotated JWT secret, a revoked tenant
 * membership. When that happens `RoleGuard` sees a valid session and does not
 * redirect, so the user sits on a dashboard where every card reads "your
 * session has expired" and nothing offers a way out. That is the same dead end
 * as the spinner that never resolves.
 *
 * The handler is registered by the auth layer rather than imported here, so
 * this module stays dependency-light and unit-testable without a browser or a
 * Supabase client.
 *
 * It returns the **new `Authorization` header value**, not just a success flag.
 * That matters: callers build their headers with `getAuthHeaders()` before they
 * call in here, so by the time we see the 401 the stale token is already baked
 * into `init`. Replaying the request unchanged would send the same dead token
 * and 401 again. Returning null means the session is genuinely gone and the
 * auth layer has taken over.
 */
export type UnauthorizedHandler = () => Promise<string | null>

let unauthorizedHandler: UnauthorizedHandler | null = null
/** In-flight refresh, so ten concurrent 401s cause one refresh and not ten. */
let refreshInFlight: Promise<string | null> | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
    unauthorizedHandler = handler
    refreshInFlight = null
}

/**
 * Refresh once, at most once concurrently.
 *
 * Single-flighted because a dashboard fires a dozen requests at mount. Without
 * this, one expired token produces a dozen simultaneous refreshes that race —
 * and a rotating refresh token turns the losers into hard sign-outs.
 */
async function tryRefreshSession(): Promise<string | null> {
    if (!unauthorizedHandler) return null
    if (!refreshInFlight) {
        refreshInFlight = unauthorizedHandler().finally(() => {
            refreshInFlight = null
        })
    }
    return refreshInFlight
}

/** `init` with the Authorization header swapped for a freshly-minted one. */
function withAuthorization(init: RequestInit, header: string): RequestInit {
    const headers = new Headers(init.headers as HeadersInit | undefined)
    headers.set('Authorization', header)
    return { ...init, headers }
}

/** `navigator.onLine` is only trustworthy when it says *false*. */
function isOffline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine === false
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface ApiFetchOptions extends RequestInit {
    /** Overrides DEFAULT_TIMEOUT_MS. */
    timeoutMs?: number
    /** Overrides MAX_ATTEMPTS. Ignored for non-idempotent methods. */
    attempts?: number
}

/**
 * Fetch against the backend with a deadline, bounded retries and typed errors.
 *
 * `path` may be an absolute URL or a path, which is prefixed with the API base
 * so no caller re-derives the origin.
 *
 * Throws {@link HttpError} on failure rather than returning a non-ok Response.
 * The old pattern — every caller remembering `if (!res.ok)` — is how a 500 ends
 * up parsed as JSON and rendered as an empty list.
 */
export async function apiFetch(
    path: string,
    options: ApiFetchOptions = {},
): Promise<Response> {
    const { timeoutMs = DEFAULT_TIMEOUT_MS, attempts, ...init } = options
    const method = (init.method || 'GET').toUpperCase()
    const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`

    const maxAttempts = isRetryableMethod(method) ? (attempts ?? MAX_ATTEMPTS) : 1

    try {
        return await attemptRequest(url, init, timeoutMs, maxAttempts)
    } catch (error) {
        // A 401 — and only a 401 — is worth one refresh and one replay.
        //
        // 403 is deliberately excluded: that is "you are who you say you are
        // and you still may not", which no amount of refreshing fixes, and
        // retrying it would just delay telling the user.
        //
        // Replaying is safe even for a POST. A 401 is rejected at the auth
        // boundary before the handler runs, so nothing was created — this is
        // the one non-idempotent retry in this file that cannot double-issue.
        if (error instanceof HttpError && error.status === 401) {
            const header = await tryRefreshSession()
            if (header) {
                return attemptRequest(
                    url, withAuthorization(init, header), timeoutMs, maxAttempts,
                )
            }
        }
        throw error
    }
}

/** One full attempt budget: the deadline, the retries, the typed errors. */
async function attemptRequest(
    url: string,
    init: RequestInit,
    timeoutMs: number,
    maxAttempts: number,
): Promise<Response> {
    let last: HttpError = new HttpError('network', messageFor('network'))

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        if (isOffline()) {
            throw new HttpError('offline', messageFor('offline'))
        }

        try {
            const response = await fetch(url, {
                ...init,
                signal: AbortSignal.timeout(timeoutMs),
            })

            if (response.ok) return response

            const kind = failureForStatus(response.status)
            last = new HttpError(
                kind,
                messageFor(kind, await detailFrom(response)),
                response.status,
            )
            if (!isRetryableFailure(kind, response.status)) throw last
        } catch (error) {
            if (error instanceof HttpError) {
                if (!isRetryableFailure(error.kind, error.status)) throw error
                last = error
            } else {
                // AbortSignal.timeout rejects with a TimeoutError; everything
                // else here is a genuine network fault.
                const timedOut =
                    error instanceof DOMException && error.name === 'TimeoutError'
                const kind: HttpFailure = timedOut ? 'timeout' : 'network'
                last = new HttpError(kind, messageFor(kind))
            }
        }

        if (attempt < maxAttempts) await sleep(backoffMs(attempt))
    }

    throw last
}

/**
 * The server's own explanation, if it gave one.
 *
 * Preferred over our generic sentence: the backend refuses things for reasons
 * worth reading — "issuing this would read as a clean bill of health for a
 * field nobody looked at" is more useful than "That request could not be
 * completed."
 */
async function detailFrom(response: Response): Promise<string | undefined> {
    try {
        const body = await response.clone().json()
        const detail = body?.detail
        return typeof detail === 'string' && detail ? detail : undefined
    } catch {
        return undefined
    }
}

/**
 * A deadline on *connecting*, with no deadline on the body.
 *
 * For SSE and other streamed responses. `AbortSignal.timeout` aborts the whole
 * exchange including the body, so using it on a stream kills a healthy stream
 * mid-sentence at the 20s mark. But a stream still needs a connect deadline —
 * a chat that hangs before the first token is the same forever-spinner as any
 * other request.
 *
 * So: arm a timer, and disarm it the moment response headers arrive. After
 * that the stream may take as long as it takes.
 *
 * Not retried. The response is a body being consumed by a generator; there is
 * nothing safe to replay once tokens have been yielded.
 */
export async function streamFetch(
    path: string,
    options: ApiFetchOptions = {},
): Promise<Response> {
    // `attempts` is accepted for signature parity with apiFetch and ignored:
    // see the note above about replaying a stream.
    const { timeoutMs = DEFAULT_TIMEOUT_MS, attempts, ...init } = options
    void attempts
    const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        return await fetch(url, { ...init, signal: controller.signal })
    } catch (error) {
        const aborted = error instanceof DOMException && error.name === 'AbortError'
        const kind: HttpFailure = aborted ? 'timeout' : 'network'
        throw new HttpError(kind, messageFor(kind))
    } finally {
        clearTimeout(timer)
    }
}

/** `apiFetch` plus JSON parsing, which is what almost every caller wanted. */
export async function apiJson<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    const response = await apiFetch(path, options)
    return (await response.json()) as T
}

/**
 * A drop-in replacement for `fetch` that adds the deadline and the retry.
 *
 * Unlike {@link apiFetch} this keeps `fetch`'s contract exactly: it takes a full
 * URL and **returns non-ok responses rather than throwing**. That matters for
 * the call sites that accept an injectable `fetchImpl` so tests can hand them a
 * stub — swapping those to a throwing function silently deletes their `!res.ok`
 * handling, which is a live branch under an injected stub even though it is
 * unreachable under a throwing one.
 *
 * Use this as the default for an injectable seam. Use `apiFetch` everywhere
 * else, where throwing is what you want.
 */
export const resilientFetch: typeof fetch = async (input, init) => {
    const method = (init?.method || 'GET').toUpperCase()
    const maxAttempts = isRetryableMethod(method) ? MAX_ATTEMPTS : 1

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const response = await fetch(input, {
                ...init,
                signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
            })
            const retryable = isRetryableFailure(
                failureForStatus(response.status),
                response.status,
            )
            if (response.ok || !retryable || attempt === maxAttempts) return response
        } catch (error) {
            // Last attempt: let the caller see the real failure rather than a
            // response we invented.
            if (attempt === maxAttempts) throw error
        }
        await sleep(backoffMs(attempt))
    }

    // Unreachable: the loop either returns or throws on its final attempt.
    throw new HttpError('network', messageFor('network'))
}
