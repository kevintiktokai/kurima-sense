// Next.js instrumentation hook: initializes Sentry for the server runtime and
// forwards request errors (server components / route handlers). All of it is
// inert until a Sentry DSN is configured.
import * as Sentry from '@sentry/nextjs'

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('./sentry.server.config')
    }
}

export const onRequestError = Sentry.captureRequestError
