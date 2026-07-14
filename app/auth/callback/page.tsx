'use client'

/**
 * /auth/callback — the landing point for every redirect-based auth flow:
 * Google OAuth, email-confirmation links, and magic links. Previously these
 * redirected straight to /onboarding and *hoped* the client library exchanged
 * the ?code before the page's auth guard ran; any failure (expired link, link
 * opened in a different browser, user cancelled the Google consent screen)
 * silently bounced the user to /auth with no explanation.
 *
 * Flow: exchange the code if the SDK hasn't already → wait briefly for the
 * session → route via resolvePostAuthDestination (onboarding vs role home).
 * On failure, land on /auth with a human-readable ?error= message.
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { friendlyCallbackError, resolvePostAuthDestination } from '@/lib/auth-routing'

// How long to wait for the SDK's own detectSessionInUrl exchange before we
// declare the link dead. Generous because slow rural connections are the norm
// for this user base.
const SESSION_WAIT_MS = 8000
const POLL_INTERVAL_MS = 250

export default function AuthCallbackPage() {
    const router = useRouter()
    const [status, setStatus] = useState<'working' | 'failed'>('working')
    const [message, setMessage] = useState<string>('')
    const ran = useRef(false)

    useEffect(() => {
        // React 18 strict-mode double-invoke guard: the code exchange is
        // single-use, so the effect must only run once.
        if (ran.current) return
        ran.current = true

        let cancelled = false

        async function run() {
            const params = new URLSearchParams(window.location.search)
            const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
            const errorCode = params.get('error') ?? hashParams.get('error')
            const errorDescription =
                params.get('error_description') ?? hashParams.get('error_description')
            const code = params.get('code')

            const finishWith = async (userId: string) => {
                const dest = await resolvePostAuthDestination(userId)
                if (!cancelled) router.replace(dest)
            }

            // 1. The SDK may have already exchanged the code during client init
            //    (detectSessionInUrl) — or the user may simply already be signed in.
            const { data: { session: existing } } = await supabase.auth.getSession()
            if (existing?.user) {
                await finishWith(existing.user.id)
                return
            }

            // 2. Provider sent an explicit error (e.g. consent cancelled).
            if (errorCode || errorDescription) {
                fail(friendlyCallbackError(errorCode, errorDescription))
                return
            }

            // 3. Exchange the code ourselves. If the SDK's automatic exchange is
            //    racing us this can throw ("flow state not found") even though a
            //    session lands a moment later — so on error we fall through to
            //    the polling wait rather than failing immediately.
            if (code) {
                try {
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
                    if (!error && data.session?.user) {
                        await finishWith(data.session.user.id)
                        return
                    }
                } catch { /* fall through to the polling wait */ }
            }

            // 4. Wait for a session to appear (covers the SDK winning the race
            //    above, and hash-fragment implicit-flow tokens).
            const deadline = Date.now() + SESSION_WAIT_MS
            while (Date.now() < deadline && !cancelled) {
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user) {
                    await finishWith(session.user.id)
                    return
                }
                await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
            }

            if (!cancelled) {
                fail(friendlyCallbackError(null, null))
            }
        }

        function fail(msg: string) {
            setMessage(msg)
            setStatus('failed')
        }

        run()
        return () => { cancelled = true }
    }, [router])

    if (status === 'failed') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#EBEBE3] p-4">
                <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-[#2D3A26]/10 text-center">
                    <h1 className="text-2xl font-bold text-[#2D3A26] mb-3">Sign-in didn&apos;t complete</h1>
                    <p className="text-[#2D3A26]/70 mb-6">{message}</p>
                    <a
                        href="/auth"
                        className="inline-block px-6 py-3 rounded-xl bg-[#2D3A26] text-[#D7F26C] font-bold hover:bg-[#1a2216] transition-colors"
                    >
                        Go to sign in
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#EBEBE3] gap-4">
            <div className="w-12 h-12 border-4 border-[#2D3A26] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#2D3A26]/70 font-medium">Signing you in…</p>
        </div>
    )
}
