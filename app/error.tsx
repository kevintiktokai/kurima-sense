'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// Route-segment error boundary. Without this, any render error in a page
// white-screens the whole app; with it, the user gets a styled recovery UI.
export default function Error({
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
        <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--ee-bg)' }}>
            <div className="neu-surface max-w-md w-full p-8 rounded-[24px] text-center">
                <span className="material-symbols-outlined mb-4" style={{ fontSize: '48px', color: 'var(--ee-sun)' }}>
                    error_outline
                </span>
                <h2 className="text-xl font-black mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--ee-text)' }}>
                    Something went wrong
                </h2>
                <p className="text-sm mb-6" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                    An unexpected error occurred. Your data is safe — try again, or head back to the dashboard.
                </p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="px-6 py-3 rounded-[16px] font-bold text-white"
                        style={{ background: 'var(--ee-primary)', fontFamily: 'var(--font-heading)' }}
                    >
                        Try again
                    </button>
                    <a
                        href="/dashboard"
                        className="px-6 py-3 rounded-[16px] font-bold"
                        style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)', backgroundColor: 'var(--ee-bg)' }}
                    >
                        Dashboard
                    </a>
                </div>
                {error.digest && (
                    <p className="text-[10px] mt-4" style={{ color: 'var(--ee-muted)' }}>Ref: {error.digest}</p>
                )}
            </div>
        </div>
    )
}
