'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getAuthHeaders } from '@/lib/api-cache'
import { useAuth } from '@/components/providers/AuthProvider'
import { DisclaimerBanner } from '@/components/legal/DisclaimerBanner'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type AccountType = 'consumer' | 'institution'

// Consumer agricultural personas. Stored in profiles.persona (NOT role) — the
// `role` column is the access tier ('consumer' | 'institutional' | 'admin') and
// is CHECK-constrained, so writing a persona there fails every save.
const personas = [
    { id: 'farmer', label: 'Commercial Farmer', icon: '🚜' },
    { id: 'smallholder', label: 'Smallholder Farmer', icon: '👨‍🌾' },
    { id: 'agronomist', label: 'Agronomist', icon: '📋' },
    { id: 'hobbyist', label: 'Home/Hobbyist', icon: '🌱' },
]

// Institutional account types — must match the backend / DB
// profiles_institutional_type_check vocabulary exactly.
const institutionTypes = [
    { id: 'buyer', label: 'Buyer / Off-taker', icon: '🏭' },
    { id: 'lender', label: 'Lender / Finance', icon: '🏦' },
    { id: 'insurer', label: 'Insurer', icon: '🛡️' },
    { id: 'grower', label: 'Grower / Estate', icon: '🌾' },
]

export default function OnboardingPage() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        accountType: '' as AccountType | '',
        persona: '',
        institutionalType: '',
        organizationName: '',
    })

    // Redirect to auth if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth')
        }
    }, [user, authLoading, router])

    const handleNext = async () => {
        setError(null)
        if (step < 3) {
            setStep(step + 1)
        } else if (formData.accountType === 'institution') {
            await saveInstitutionalAccount()
        } else {
            await saveConsumerProfile()
        }
    }

    // Consumer path: write a valid access tier ('consumer') and keep the chosen
    // agricultural identity in the dedicated `persona` column.
    const saveConsumerProfile = async () => {
        setLoading(true)
        setError(null)
        try {
            if (!user) throw new Error('No user found. Please sign in again.')

            const { error: upsertError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: formData.fullName,
                    phone_number: formData.phoneNumber,
                    role: 'consumer',
                    persona: formData.persona,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'id' })

            if (upsertError) throw upsertError

            router.push('/dashboard')
        } catch (err: unknown) {
            setError(toFriendlyError(err))
        } finally {
            setLoading(false)
        }
    }

    // Institution path: persist name/phone via Supabase, then call the backend
    // self-service endpoint which flips role → institutional AND provisions the
    // tenant + owner membership so portfolio access works immediately.
    const saveInstitutionalAccount = async () => {
        setLoading(true)
        setError(null)
        try {
            if (!user) throw new Error('No user found. Please sign in again.')

            // 1. Save the user's name/phone. role is left untouched (defaults to
            //    'consumer' on insert) — the backend promotes it in step 2.
            const { error: upsertError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: formData.fullName,
                    phone_number: formData.phoneNumber,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'id' })

            if (upsertError) throw upsertError

            // 2. Promote to institutional + create the tenant/membership.
            const headers = await getAuthHeaders()
            const res = await fetch(`${API_BASE_URL}/me/institutional`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    institutional_type: formData.institutionalType,
                    organization_name: formData.organizationName.trim(),
                }),
            })

            if (!res.ok) {
                let detail = `Server error (${res.status})`
                try {
                    const body = await res.json()
                    if (body?.detail && typeof body.detail === 'string') detail = body.detail
                } catch { /* non-JSON error body */ }
                throw new Error(detail)
            }

            router.push('/portfolio/today')
        } catch (err: unknown) {
            setError(toFriendlyError(err))
        } finally {
            setLoading(false)
        }
    }

    // Show loading while checking auth
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#EBEBE3]">
                <div className="w-12 h-12 border-4 border-[#2D3A26] border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    if (!user) return null

    // Per-step gating for the primary button.
    const canAdvance = (() => {
        if (step === 1) return !!formData.fullName && !!formData.phoneNumber
        if (step === 2) return !!formData.accountType
        if (step === 3) {
            return formData.accountType === 'institution'
                ? !!formData.institutionalType && !!formData.organizationName.trim()
                : !!formData.persona
        }
        return false
    })()

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#EBEBE3] p-4 font-sans">
            <div className="w-full max-w-lg">
                {/* Progress Bar */}
                <div className="mb-8 flex justify-center gap-2">
                    {[1, 2, 3].map((s) => (
                        <div
                            key={s}
                            className={`h-2 w-12 rounded-full transition-colors ${step >= s ? 'bg-[#2D3A26]' : 'bg-[#2D3A26]/20'}`}
                        />
                    ))}
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-[#2D3A26]/10">
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h1 className="text-3xl font-bold text-[#2D3A26] mb-2">Welcome! 👋</h1>
                                <p className="text-[#2D3A26]/60 mb-8">Let&apos;s get to know you better. What should we call you?</p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[#2D3A26] mb-1">Full Name</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 rounded-xl border border-[#2D3A26]/10 bg-white focus:ring-2 focus:ring-[#D7F26C] focus:border-transparent outline-none transition-all placeholder:text-[#2D3A26]/30 text-[#2D3A26]"
                                            placeholder="e.g. Tenda Mawarire"
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#2D3A26] mb-1">Phone Number</label>
                                        <input
                                            type="tel"
                                            className="w-full px-4 py-3 rounded-xl border border-[#2D3A26]/10 bg-white focus:ring-2 focus:ring-[#D7F26C] focus:border-transparent outline-none transition-all placeholder:text-[#2D3A26]/30 text-[#2D3A26]"
                                            placeholder="+263 7..."
                                            value={formData.phoneNumber}
                                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h1 className="text-3xl font-bold text-[#2D3A26] mb-2">Account Type 🏷️</h1>
                                <p className="text-[#2D3A26]/60 mb-8">Are you signing up as an individual or an institution?</p>

                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        onClick={() => setFormData({ ...formData, accountType: 'consumer' })}
                                        className={`p-5 rounded-xl border-2 text-left flex items-center gap-4 transition-all ${formData.accountType === 'consumer'
                                            ? 'border-[#2D3A26] bg-[#D7F26C]/20'
                                            : 'border-transparent bg-white hover:bg-[#2D3A26]/5'
                                            }`}
                                    >
                                        <span className="text-2xl">🌱</span>
                                        <span>
                                            <span className="block font-semibold text-[#2D3A26]">Individual / Farmer</span>
                                            <span className="block text-sm text-[#2D3A26]/60">Manage your own fields and get agronomic advice</span>
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setFormData({ ...formData, accountType: 'institution' })}
                                        className={`p-5 rounded-xl border-2 text-left flex items-center gap-4 transition-all ${formData.accountType === 'institution'
                                            ? 'border-[#2D3A26] bg-[#D7F26C]/20'
                                            : 'border-transparent bg-white hover:bg-[#2D3A26]/5'
                                            }`}
                                    >
                                        <span className="text-2xl">🏢</span>
                                        <span>
                                            <span className="block font-semibold text-[#2D3A26]">Institution</span>
                                            <span className="block text-sm text-[#2D3A26]/60">Buyer, lender, insurer or estate managing a portfolio</span>
                                        </span>
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && formData.accountType === 'consumer' && (
                            <motion.div
                                key="step3-consumer"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h1 className="text-3xl font-bold text-[#2D3A26] mb-2">Your Role 🌾</h1>
                                <p className="text-[#2D3A26]/60 mb-8">How do you primarily identify in agriculture?</p>

                                <div className="grid grid-cols-1 gap-3">
                                    {personas.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => setFormData({ ...formData, persona: p.id })}
                                            className={`p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-all ${formData.persona === p.id
                                                ? 'border-[#2D3A26] bg-[#D7F26C]/20'
                                                : 'border-transparent bg-white hover:bg-[#2D3A26]/5'
                                                }`}
                                        >
                                            <span className="text-2xl">{p.icon}</span>
                                            <span className="font-semibold text-[#2D3A26]">{p.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-6">
                                    <DisclaimerBanner type="general" showDismiss={false} />
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && formData.accountType === 'institution' && (
                            <motion.div
                                key="step3-institution"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h1 className="text-3xl font-bold text-[#2D3A26] mb-2">Your Institution 🏢</h1>
                                <p className="text-[#2D3A26]/60 mb-8">Tell us about your organization.</p>

                                <div className="mb-5">
                                    <label className="block text-sm font-medium text-[#2D3A26] mb-1">Organization Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 rounded-xl border border-[#2D3A26]/10 bg-white focus:ring-2 focus:ring-[#D7F26C] focus:border-transparent outline-none transition-all placeholder:text-[#2D3A26]/30 text-[#2D3A26]"
                                        placeholder="e.g. Northern Tobacco"
                                        value={formData.organizationName}
                                        onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                                    />
                                </div>

                                <label className="block text-sm font-medium text-[#2D3A26] mb-2">Institution Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {institutionTypes.map((t) => (
                                        <button
                                            key={t.id}
                                            onClick={() => setFormData({ ...formData, institutionalType: t.id })}
                                            className={`p-4 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${formData.institutionalType === t.id
                                                ? 'border-[#2D3A26] bg-[#D7F26C]/20'
                                                : 'border-transparent bg-white hover:bg-[#2D3A26]/5'
                                                }`}
                                        >
                                            <span className="text-xl">{t.icon}</span>
                                            <span className="font-semibold text-sm text-[#2D3A26]">{t.label}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-6">
                                    <DisclaimerBanner type="general" showDismiss={false} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        onClick={handleNext}
                        disabled={!canAdvance || loading}
                        className="w-full mt-8 bg-[#2D3A26] text-[#D7F26C] font-bold py-4 rounded-xl hover:bg-[#1a2216] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-[#D7F26C] border-t-transparent rounded-full animate-spin" />
                        ) : step < 3 ? (
                            'Next Step'
                        ) : (
                            'Complete Setup'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

// Map raw errors (Supabase PostgrestError, fetch Error, etc.) to a message a
// user can act on, while keeping the underlying detail for support.
function toFriendlyError(err: unknown): string {
    const raw =
        (err as { message?: string })?.message ||
        (typeof err === 'string' ? err : '') ||
        'Something went wrong.'
    // Network failures (backend unreachable) surface as a TypeError "Failed to fetch".
    if (/failed to fetch|networkerror|load failed/i.test(raw)) {
        return 'Could not reach the server. Check your connection and try again.'
    }
    return `Failed to save profile: ${raw}. Please try again.`
}
