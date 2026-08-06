'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// Root-layout error boundary — catches errors thrown by the root layout itself,
// where app/error.tsx cannot. Must render its own <html>/<body>.
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        Sentry.captureException(error)
    }, [error])

    return (
        <html>
            <body style={{ margin: 0, background: '#EDF1EC', fontFamily: 'system-ui, sans-serif' }}>
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div style={{ maxWidth: 420, textAlign: 'center' }}>
                        <h2 style={{ color: '#2D3A26', marginBottom: 8 }}>KurimaSense hit a snag</h2>
                        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
                            An unexpected error occurred. Reloading usually fixes it.
                        </p>
                        <button
                            onClick={reset}
                            style={{
                                background: '#6DBE45', color: '#fff', border: 'none', padding: '12px 28px',
                                borderRadius: 14, fontWeight: 700, cursor: 'pointer', fontSize: 15,
                            }}
                        >
                            Reload
                        </button>
                        {error.digest && <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 16 }}>Ref: {error.digest}</p>}
                    </div>
                </div>
            </body>
        </html>
    )
}
