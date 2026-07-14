'use client'

/**
 * /auth/reset — where the password-recovery email lands. The recovery link
 * signs the user in with a short-lived session (the SDK exchanges the code on
 * load, same as /auth/callback); this page then lets them set a new password
 * via updateUser. Until this page existed there was NO way to recover a
 * forgotten password — locked-out users were dead ends.
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { resolvePostAuthDestination } from '@/lib/auth-routing'

const SESSION_WAIT_MS = 8000
const POLL_INTERVAL_MS = 250
const MIN_PASSWORD_LENGTH = 6 // matches the signup form

type Phase = 'checking' | 'ready' | 'saving' | 'done' | 'invalid'

export default function ResetPasswordPage() {
    const router = useRouter()
    const [phase, setPhase] = useState<Phase>('checking')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState<string | null>(null)
    const ran = useRef(false)

    // The recovery link must have produced a session before the form is usable.
    useEffect(() => {
        if (ran.current) return
        ran.current = true
        let cancelled = false

        async function waitForRecoverySession() {
            // The recovery redirect may carry ?code= (PKCE). Exchange it if the
            // SDK hasn't already; tolerate a lost race exactly like /auth/callback.
            const code = new URLSearchParams(window.location.search).get('code')
            if (code) {
                try { await supabase.auth.exchangeCodeForSession(code) } catch { /* SDK may have won */ }
            }
            const deadline = Date.now() + SESSION_WAIT_MS
            while (Date.now() < deadline && !cancelled) {
                const { data: { session } } = await supabase.auth.getSession()
                if (session?.user) {
                    if (!cancelled) setPhase('ready')
                    return
                }
                await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
            }
            if (!cancelled) setPhase('invalid')
        }

        waitForRecoverySession()
        return () => { cancelled = true }
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
            return
        }
        if (password !== confirm) {
            setError('Passwords do not match.')
            return
        }
        setPhase('saving')
        try {
            const { data, error } = await supabase.auth.updateUser({ password })
            if (error) throw error
            setPhase('done')
            const userId = data.user?.id
            const dest = userId ? await resolvePostAuthDestination(userId) : '/dashboard'
            // Give the success state a beat to render before moving on.
            setTimeout(() => router.replace(dest), 1200)
        } catch (err) {
            setPhase('ready')
            setError(err instanceof Error ? err.message : 'Could not update password. Please try again.')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#EBEBE3] p-4">
            <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-[#2D3A26]/10">
                <h1 className="text-2xl font-bold text-[#2D3A26] mb-2 text-center">Set a new password</h1>

                {phase === 'checking' && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <div className="w-10 h-10 border-4 border-[#2D3A26] border-t-transparent rounded-full animate-spin" />
                        <p className="text-[#2D3A26]/70">Verifying your reset link…</p>
                    </div>
                )}

                {phase === 'invalid' && (
                    <div className="text-center py-4">
                        <p className="text-[#2D3A26]/70 mb-6">
                            This reset link is invalid or has expired. Request a new one from the
                            sign-in page — and open it in this same browser.
                        </p>
                        <a
                            href="/auth"
                            className="inline-block px-6 py-3 rounded-xl bg-[#2D3A26] text-[#D7F26C] font-bold hover:bg-[#1a2216] transition-colors"
                        >
                            Back to sign in
                        </a>
                    </div>
                )}

                {phase === 'done' && (
                    <div className="text-center py-8">
                        <p className="text-green-700 font-medium">Password updated — taking you to the app…</p>
                    </div>
                )}

                {(phase === 'ready' || phase === 'saving') && (
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                                {error}
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-semibold text-[#2D3A26] mb-2">New password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={MIN_PASSWORD_LENGTH}
                                autoComplete="new-password"
                                className="w-full px-4 py-3.5 rounded-xl border-2 border-[#2D3A26]/10 bg-white/80 focus:border-[#D7F26C] focus:ring-4 focus:ring-[#D7F26C]/20 focus:outline-none transition-all text-[#2D3A26]"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#2D3A26] mb-2">Confirm new password</label>
                            <input
                                type="password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                                minLength={MIN_PASSWORD_LENGTH}
                                autoComplete="new-password"
                                className="w-full px-4 py-3.5 rounded-xl border-2 border-[#2D3A26]/10 bg-white/80 focus:border-[#D7F26C] focus:ring-4 focus:ring-[#D7F26C]/20 focus:outline-none transition-all text-[#2D3A26]"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={phase === 'saving'}
                            className="w-full px-4 py-3.5 rounded-xl bg-[#2D3A26] text-[#D7F26C] font-bold text-lg hover:bg-[#1a2216] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {phase === 'saving' ? 'Saving…' : 'Update password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
