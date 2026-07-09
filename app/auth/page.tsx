'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FullTermsDisclaimer } from '@/components/legal/DisclaimerBanner'
import { PageContainer } from '@/components/layout/PageContainer'
import { isExistingUserSignUp, resolvePostAuthDestination } from '@/lib/auth-routing'

type Mode = 'signin' | 'signup' | 'forgot'

export default function AuthPage() {
    const [mode, setMode] = useState<Mode>('signin')
    const isSignUp = mode === 'signup'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const router = useRouter()
    const isSubmitting = useRef(false)

    // Surface a failure message forwarded by /auth/callback (?error=...).
    useEffect(() => {
        const forwarded = new URLSearchParams(window.location.search).get('error')
        if (forwarded) setError(forwarded)
    }, [])

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault()

        // Prevent double submission
        if (isSubmitting.current || loading) return
        isSubmitting.current = true

        setLoading(true)
        setError(null)
        setSuccessMessage(null)

        try {
            if (mode === 'forgot') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/auth/reset`,
                })
                if (error) throw error
                setSuccessMessage('If that email has an account, a reset link is on its way. Open it in this browser.')
            } else if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        // Land on the callback so the confirmation link gets a real
                        // exchange + error handling instead of a blind /onboarding hop.
                        emailRedirectTo: `${window.location.origin}/auth/callback`
                    }
                })
                if (error) throw error

                if (isExistingUserSignUp(data)) {
                    // Supabase "succeeds" for an existing confirmed email
                    // (anti-enumeration) — telling this user to check their inbox
                    // strands them waiting for an email that never comes.
                    setError('This email is already registered. Try signing in — or use "Forgot password?" below.')
                    setMode('signin')
                } else if (data.user && !data.session) {
                    setSuccessMessage('Check your email for the confirmation link!')
                } else if (data.session) {
                    // Auto-confirmed (confirmations disabled) — straight to onboarding.
                    router.push('/onboarding')
                }
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                })
                if (error) throw error

                // Shared post-auth routing: onboarding until the profile is
                // complete, then the role-appropriate app shell.
                router.push(await resolvePostAuthDestination(data.user.id))
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : ''
            const status = (err as { status?: number } | null)?.status
            // Handle rate limiting error specifically
            if (message.includes('429') || status === 429 || message.toLowerCase().includes('rate limit')) {
                setError('Too many attempts. Please wait a moment before trying again.')
            } else if (message.includes('already registered')) {
                setError('This email is already registered. Try signing in instead.')
            } else {
                setError(message || 'An error occurred. Please try again.')
            }
        } finally {
            setLoading(false)
            // Allow new submission after a small delay
            setTimeout(() => {
                isSubmitting.current = false
            }, 1000)
        }
    }


    const handleGoogleAuth = async () => {
        setLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    // The callback exchanges the code and routes onboarded users to
                    // their app home — previously every returning Google user was
                    // dropped back into /onboarding.
                    redirectTo: `${window.location.origin}/auth/callback`
                }
            })
            if (error) throw error
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Could not start Google sign-in. Please try again.')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#EBEBE3] p-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#D7F26C]/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#2D3A26]/10 rounded-full blur-[100px]" />
            </div>

            <PageContainer variant="reading" className="relative z-10 flex justify-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Glassmorphism Card */}
                <div className="backdrop-blur-xl bg-white/60 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#2D3A26]/10 p-8 sm:p-10">
                    {/* Logo/Header */}
                    <div className="text-center mb-8">
                        <Image
                            src="/logo-200.png"
                            alt="KurimaSense"
                            width={64}
                            height={64}
                            className="mx-auto mb-3 rounded-2xl shadow-lg"
                        />
                        <h1 className="text-4xl font-bold text-[#2D3A26] mb-2 tracking-tight">
                            KurimaSense
                        </h1>
                        <p className="text-[#2D3A26]/70 text-lg">
                            {mode === 'forgot' ? 'Reset your password' : isSignUp ? 'Create your account' : 'Welcome back'}
                        </p>
                    </div>

                    {/* Success Message */}
                    {successMessage && (
                        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-100 text-green-700 text-sm font-medium flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {successMessage}
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {/* Google OAuth Button */}
                    {mode !== 'forgot' && (
                    <button
                        onClick={handleGoogleAuth}
                        disabled={loading}
                        className="w-full mb-6 px-4 py-3.5 rounded-xl bg-white border-2 border-[#2D3A26]/10 hover:border-[#2D3A26] transition-all duration-200 flex items-center justify-center gap-3 font-medium text-[#2D3A26] disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        <span className="group-hover:text-[#2D3A26] transition-colors">Continue with Google</span>
                    </button>
                    )}

                    {/* Divider */}
                    {mode !== 'forgot' && (
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-[#2D3A26]/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white/60 backdrop-blur-xl text-[#2D3A26]/50 uppercase tracking-wider font-medium text-xs">
                                Or continue with email
                            </span>
                        </div>
                    </div>
                    )}

                    {/* Email/Password Form */}
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#2D3A26] mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-3.5 rounded-xl border-2 border-[#2D3A26]/10 bg-white/80 focus:border-[#D7F26C] focus:ring-4 focus:ring-[#D7F26C]/20 focus:outline-none transition-all placeholder-[#2D3A26]/30 text-[#2D3A26]"
                                placeholder="you@example.com"
                            />
                        </div>

                        {mode !== 'forgot' && (
                        <div>
                            <label className="block text-sm font-semibold text-[#2D3A26] mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                className="w-full px-4 py-3.5 rounded-xl border-2 border-[#2D3A26]/10 bg-white/80 focus:border-[#D7F26C] focus:ring-4 focus:ring-[#D7F26C]/20 focus:outline-none transition-all placeholder-[#2D3A26]/30 text-[#2D3A26]"
                                placeholder="••••••••"
                            />
                            {mode === 'signin' && (
                                <div className="text-right mt-2">
                                    <button
                                        type="button"
                                        onClick={() => { setMode('forgot'); setError(null); setSuccessMessage(null) }}
                                        className="text-sm font-medium text-[#2D3A26]/70 hover:text-[#2D3A26] underline underline-offset-4 transition-colors"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                            )}
                        </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-4 py-3.5 rounded-xl bg-[#2D3A26] text-[#D7F26C] font-bold text-lg hover:bg-[#1a2216] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#2D3A26]/20 mt-2"
                        >
                            {loading ? 'Processing...' : mode === 'forgot' ? 'Send reset link' : isSignUp ? 'Create Account' : 'Sign In'}
                        </button>
                    </form>

                    {/* Toggle Sign Up / Sign In / back from Forgot */}
                    <div className="mt-8 text-center bg-[#2D3A26]/5 rounded-xl py-4">
                        <button
                            onClick={() => {
                                setMode(mode === 'signin' ? 'signup' : 'signin')
                                setError(null)
                                setSuccessMessage(null)
                            }}
                            className="text-sm font-medium text-[#2D3A26] hover:text-[#2D3A26]/80 transition-colors"
                        >
                            {mode === 'signup' ? (
                                <span>
                                    Already have an account? <span className="underline decoration-2 decoration-[#D7F26C] underline-offset-4 font-bold">Sign in</span>
                                </span>
                            ) : mode === 'forgot' ? (
                                <span>
                                    Remembered it? <span className="underline decoration-2 decoration-[#D7F26C] underline-offset-4 font-bold">Back to sign in</span>
                                </span>
                            ) : (
                                <span>
                                    Don&apos;t have an account? <span className="underline decoration-2 decoration-[#D7F26C] underline-offset-4 font-bold">Sign up</span>
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Legal Disclaimer */}
                <div className="mt-8">
                    <FullTermsDisclaimer />
                </div>

                {/* Footer */}
                <p className="text-center mt-4 text-sm text-[#2D3A26]/60">
                    By continuing, you agree to our{' '}
                    <a href="/terms" className="underline hover:text-[#2D3A26]">Terms of Service</a>
                    {' '}and{' '}
                    <a href="/privacy" className="underline hover:text-[#2D3A26]">Privacy Policy</a>
                </p>
            </motion.div>
            </PageContainer>
        </div>
    )
}
