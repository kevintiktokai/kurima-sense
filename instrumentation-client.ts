// Sentry browser-side init (Next.js loads this file automatically on the
// client). Dormant unless NEXT_PUBLIC_SENTRY_DSN is set — no SDK activity,
// no network calls — so dev/preview/CI are unaffected until the DSN lands.
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
    Sentry.init({
        dsn,
        // Keep performance sampling light — error visibility is the goal here;
        // raise if/when tracing becomes useful.
        tracesSampleRate: 0.1,
        // Replay is heavyweight (bundle + privacy review); enable deliberately.
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
    })
}

// Instruments client-side navigations when the SDK is active (no-op otherwise).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
