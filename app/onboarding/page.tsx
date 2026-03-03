'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/providers/AuthProvider'
import { DisclaimerBanner } from '@/components/legal/DisclaimerBanner'

export default function OnboardingPage() {
    const { user, loading: authLoading } = useAuth()
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        role: '',
    })

    // Redirect to auth if not logged in
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth')
        }
    }, [user, authLoading, router])

    const roles = [
        { id: 'farmer', label: 'Commercial Farmer', icon: '🚜' },
        { id: 'smallholder', label: 'Smallholder Farmer', icon: '👨‍🌾' },
        { id: 'agronomist', label: 'Agronomist', icon: '📋' },
        { id: 'hobbyist', label: 'Home/Hobbyist', icon: '🌱' },
    ]

    const handleNext = async () => {
        if (step < 2) {
            setStep(step + 1)
        } else {
            await saveProfile()
        }
    }

    const saveProfile = async () => {
        setLoading(true)
        try {
            if (!user) throw new Error('No user found')

            // Use upsert to handle both new and existing profiles
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: formData.fullName,
                    phone_number: formData.phoneNumber,
                    role: formData.role,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'id' })

            if (error) throw error

            // Redirect to dashboard
            router.push('/dashboard')
        } catch (error) {
            console.error('Error saving profile:', error)
            alert('Failed to save profile. Please try again.')
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


    return (
        <div className="min-h-screen flex items-center justify-center bg-[#EBEBE3] p-4 font-sans">
            <div className="w-full max-w-lg">
                {/* Progress Bar */}
                <div className="mb-8 flex justify-center gap-2">
                    <div className={`h-2 w-12 rounded-full transition-colors ${step >= 1 ? 'bg-[#2D3A26]' : 'bg-[#2D3A26]/20'}`} />
                    <div className={`h-2 w-12 rounded-full transition-colors ${step >= 2 ? 'bg-[#2D3A26]' : 'bg-[#2D3A26]/20'}`} />
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-[#2D3A26]/10">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h1 className="text-3xl font-bold text-[#2D3A26] mb-2">Welcome! 👋</h1>
                                <p className="text-[#2D3A26]/60 mb-8">Let's get to know you better. What should we call you?</p>

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

                                <button
                                    onClick={handleNext}
                                    disabled={!formData.fullName || !formData.phoneNumber}
                                    className="w-full mt-8 bg-[#2D3A26] text-[#D7F26C] font-bold py-4 rounded-xl hover:bg-[#1a2216] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next Step
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <h1 className="text-3xl font-bold text-[#2D3A26] mb-2">Your Role 🌾</h1>
                                <p className="text-[#2D3A26]/60 mb-8">How do you primarily identify in agriculture?</p>

                                <div className="grid grid-cols-1 gap-3">
                                    {roles.map((role) => (
                                        <button
                                            key={role.id}
                                            onClick={() => setFormData({ ...formData, role: role.id })}
                                            className={`p-4 rounded-xl border-2 text-left flex items-center gap-4 transition-all ${formData.role === role.id
                                                ? 'border-[#2D3A26] bg-[#D7F26C]/20'
                                                : 'border-transparent bg-white hover:bg-[#2D3A26]/5'
                                                }`}
                                        >
                                            <span className="text-2xl">{role.icon}</span>
                                            <span className="font-semibold text-[#2D3A26]">{role.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Advisory Notice before completing */}
                                <div className="mt-6">
                                    <DisclaimerBanner type="general" showDismiss={false} />
                                </div>

                                <button
                                    onClick={handleNext}
                                    disabled={!formData.role || loading}
                                    className="w-full mt-4 bg-[#2D3A26] text-[#D7F26C] font-bold py-4 rounded-xl hover:bg-[#1a2216] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-[#D7F26C] border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        'Complete Setup'
                                    )}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
