// Sentry server-side init (SSR/route handlers on Vercel). Dormant without a
// DSN. NEXT_PUBLIC_SENTRY_DSN is reused so one env var configures both sides;
// SENTRY_DSN wins if set separately.
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
    Sentry.init({
        dsn,
        tracesSampleRate: 0.1,
    })
}
