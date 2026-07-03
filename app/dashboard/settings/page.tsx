'use client'

import { useState, useEffect } from 'react'
import { useUserProfile } from '@/components/providers/UserProfileProvider'
import { useAuth } from '@/components/providers/AuthProvider'
import { requestInstallPrompt } from '@/components/InstallPrompt'
import { PageContainer } from '@/components/layout/PageContainer'
import { acceptInvite } from '@/hooks/useTeam'

function JoinOrganisationCard() {
    const [code, setCode] = useState('')
    const [pending, setPending] = useState(false)
    const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

    const redeem = async () => {
        if (!code.trim()) return
        setPending(true)
        setResult(null)
        try {
            await acceptInvite(code.trim())
            setResult({ ok: true, text: "You've joined the organisation! Taking you to your team workspace…" })
            // Role changed server-side; a hard navigation refetches /me/role and
            // RoleGuard routes the now-institutional user into the portfolio.
            setTimeout(() => { window.location.href = '/portfolio/today' }, 1200)
        } catch (e) {
            setResult({ ok: false, text: e instanceof Error ? e.message : 'Invalid invite code' })
            setPending(false)
        }
    }

    return (
        <div className="p-4 sm:p-6 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}>
            <p className="font-bold mb-1" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}>
                <span className="material-symbols-outlined text-base mr-2 align-middle" style={{ color: 'var(--ee-primary)' }}>badge</span>
                Join an organisation
            </p>
            <p className="text-sm mb-3" style={{ color: 'var(--ee-muted)' }}>
                Been given a team invite code? Enter it here to join your organisation&apos;s workspace.
            </p>
            <div className="flex gap-2">
                <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 4F7A2C91"
                    maxLength={16}
                    className="flex-1 min-w-0 px-4 py-3 rounded-[14px] text-sm font-bold tracking-widest"
                    style={{
                        background: 'var(--ee-surface)', color: 'var(--ee-text)',
                        fontFamily: 'var(--font-body)', boxShadow: 'var(--shadow-neu-inset)', border: 'none',
                    }}
                />
                <button
                    onClick={redeem}
                    disabled={pending || !code.trim()}
                    className="px-5 py-3 rounded-[14px] font-bold text-sm disabled:opacity-50 flex-shrink-0"
                    style={{ background: 'var(--ee-primary)', color: '#FFFFFF' }}
                >
                    {pending ? 'Joining…' : 'Join'}
                </button>
            </div>
            {result && (
                <p className="text-sm font-bold mt-2" style={{ color: result.ok ? 'var(--ee-primary)' : '#dc2626' }}>
                    {result.text}
                </p>
            )}
        </div>
    )
}

export default function SettingsPage() {
    const { profile, loading, updateProfile } = useUserProfile()
    const { user, signOut } = useAuth()

    const [formData, setFormData] = useState({
        full_name: '',
        phone_number: '',
        preferred_language: 'English',
        whatsapp_notifications: true
    })
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Populate form when profile loads
    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || '',
                phone_number: profile.phone_number || '',
                preferred_language: profile.preferred_language || 'English',
                whatsapp_notifications: profile.whatsapp_notifications ?? true
            })
        }
    }, [profile])

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)

        try {
            const success = await updateProfile({
                full_name: formData.full_name,
                phone_number: formData.phone_number,
                preferred_language: formData.preferred_language,
                whatsapp_notifications: formData.whatsapp_notifications
            })

            if (success) {
                setMessage({ type: 'success', text: 'Settings saved successfully!' })
            } else {
                setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An error occurred. Please try again.' })
        }

        setSaving(false)
        setTimeout(() => setMessage(null), 3000)
    }

    const handleLogout = async () => {
        await signOut()
    }

    // Format member since date
    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Unknown'

    if (loading) {
        return (
            <div
                className="neu-surface p-10 lg:p-14 max-w-2xl mx-auto animate-pulse"
                style={{ background: 'var(--ee-surface)', borderRadius: '24px' }}
            >
                <div className="h-8 rounded w-1/3 mb-8" style={{ background: 'var(--ee-bg)' }}></div>
                <div className="space-y-6">
                    <div className="h-24 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}></div>
                    <div className="h-16 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}></div>
                    <div className="h-16 rounded-[16px]" style={{ background: 'var(--ee-bg)' }}></div>
                </div>
            </div>
        )
    }

    return (
        <PageContainer variant="reading">
        <div
            id="settings-container"
            className="neu-surface p-5 sm:p-8 lg:p-14 max-w-2xl mx-auto animate-in fade-in zoom-in duration-500"
            style={{ background: 'var(--ee-surface)', borderRadius: '24px' }}
        >
            <h3
                className="text-2xl font-black mb-8"
                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
            >
                Profile & Preferences
            </h3>

            {/* Success/Error Message */}
            {message && (
                <div
                    className="mb-6 p-4 rounded-[16px]"
                    style={{
                        background: message.type === 'success' ? 'rgba(15, 184, 133, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                        color: message.type === 'success' ? 'var(--ee-primary)' : '#dc2626'
                    }}
                >
                    <span className="material-symbols-outlined text-sm mr-2 align-middle">
                        {message.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    {message.text}
                </div>
            )}

            <div className="space-y-8">
                {/* Profile Header */}
                <div
                    id="profile-header"
                    className="flex items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-[16px]"
                    style={{ background: 'var(--ee-bg)' }}
                >
                    <div
                        className="w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold flex-shrink-0"
                        style={{
                            background: 'var(--ee-primary)',
                            color: 'var(--ee-surface)',
                            boxShadow: 'var(--shadow-ambient)',
                            fontFamily: 'var(--font-heading)'
                        }}
                    >
                        {profile?.full_name?.charAt(0)?.toUpperCase() || (
                            <span className="material-symbols-outlined text-3xl">person</span>
                        )}
                    </div>
                    <div>
                        <p
                            className="text-xl font-bold"
                            style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
                        >
                            {profile?.full_name || 'No name set'}
                        </p>
                        <p className="text-sm mt-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                            Member since {memberSince}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                            {user?.email}
                        </p>
                    </div>
                </div>

                {/* Editable Fields */}
                <div className="grid grid-cols-1 gap-6">
                    {/* Full Name */}
                    <div>
                        <label
                            className="text-[10px] font-bold uppercase mb-2 block ml-2"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.08em' }}
                        >
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                            placeholder="Enter your full name"
                            className="w-full p-5 rounded-[16px] outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--ee-primary)]"
                            style={{
                                background: 'var(--ee-bg)',
                                color: 'var(--ee-text)',
                                fontFamily: 'var(--font-body)',
                                border: 'none'
                            }}
                        />
                    </div>

                    {/* Phone / WhatsApp */}
                    <div>
                        <label
                            className="text-[10px] font-bold uppercase mb-2 block ml-2"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.08em' }}
                        >
                            WhatsApp Contact
                        </label>
                        <input
                            type="tel"
                            value={formData.phone_number}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                            placeholder="+263 7..."
                            className="w-full p-5 rounded-[16px] outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--ee-primary)]"
                            style={{
                                background: 'var(--ee-bg)',
                                color: 'var(--ee-text)',
                                fontFamily: 'var(--font-body)',
                                border: 'none'
                            }}
                        />
                    </div>

                    {/* Language */}
                    <div>
                        <label
                            className="text-[10px] font-bold uppercase mb-2 block ml-2"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.08em' }}
                        >
                            Preferred Language
                        </label>
                        <select
                            value={formData.preferred_language}
                            onChange={(e) => setFormData(prev => ({ ...prev, preferred_language: e.target.value }))}
                            className="w-full p-5 rounded-[16px] outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--ee-primary)]"
                            style={{
                                background: 'var(--ee-bg)',
                                color: 'var(--ee-text)',
                                fontFamily: 'var(--font-body)',
                                border: 'none'
                            }}
                        >
                            <optgroup label="Global">
                                <option value="English">English</option>
                                <option value="French">French (Fran&#231;ais)</option>
                                <option value="Portuguese">Portuguese (Portugu&#234;s)</option>
                                <option value="Arabic">Arabic (العربية)</option>
                            </optgroup>
                            <optgroup label="Southern Africa">
                                <option value="Shona">Shona</option>
                                <option value="Ndebele">Ndebele</option>
                                <option value="Zulu">Zulu (isiZulu)</option>
                                <option value="Xhosa">Xhosa (isiXhosa)</option>
                                <option value="Sotho">Sotho (Sesotho)</option>
                                <option value="Tswana">Tswana (Setswana)</option>
                                <option value="Afrikaans">Afrikaans</option>
                                <option value="Chichewa">Chichewa (Malawi)</option>
                            </optgroup>
                            <optgroup label="East Africa">
                                <option value="Swahili">Swahili (Kiswahili)</option>
                                <option value="Amharic">Amharic (አማርኛ)</option>
                                <option value="Oromo">Oromo</option>
                                <option value="Somali">Somali</option>
                                <option value="Tigrinya">Tigrinya</option>
                                <option value="Luganda">Luganda (Uganda)</option>
                                <option value="Kinyarwanda">Kinyarwanda (Rwanda)</option>
                                <option value="Kirundi">Kirundi (Burundi)</option>
                            </optgroup>
                            <optgroup label="West Africa">
                                <option value="Hausa">Hausa</option>
                                <option value="Yoruba">Yoruba</option>
                                <option value="Igbo">Igbo</option>
                                <option value="Akan">Akan/Twi (Ghana)</option>
                                <option value="Wolof">Wolof (Senegal)</option>
                                <option value="Fulani">Fulani/Fula</option>
                            </optgroup>
                            <optgroup label="Central Africa">
                                <option value="Lingala">Lingala (Congo)</option>
                                <option value="Kikongo">Kikongo</option>
                            </optgroup>
                        </select>
                    </div>

                    {/* Role Display */}
                    <div>
                        <label
                            className="text-[10px] font-bold uppercase mb-2 block ml-2"
                            style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)', letterSpacing: '0.08em' }}
                        >
                            Role
                        </label>
                        <div
                            className="w-full p-5 rounded-[16px] capitalize font-medium"
                            style={{
                                background: 'var(--ee-bg)',
                                color: 'var(--ee-muted)',
                                fontFamily: 'var(--font-body)'
                            }}
                        >
                            {profile?.role === 'institutional'
                                ? 'Institution'
                                : profile?.persona || 'Standard User'}
                        </div>
                    </div>

                    {/* WhatsApp Notifications Toggle */}
                    <div
                        id="notifications-toggle"
                        className="pt-4 flex justify-between items-center"
                        style={{ borderTop: '2px solid var(--ee-bg)' }}
                    >
                        <div>
                            <p className="font-bold" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-body)' }}>
                                <span className="material-symbols-outlined text-base mr-1 align-middle" style={{ color: 'var(--ee-primary)' }}>
                                    chat
                                </span>
                                WhatsApp Advisory
                            </p>
                            <p className="text-xs" style={{ color: 'var(--ee-muted)', fontFamily: 'var(--font-body)' }}>
                                Receive weekly field summaries via WhatsApp
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, whatsapp_notifications: !prev.whatsapp_notifications }))}
                            className="w-14 h-7 rounded-full p-1 cursor-pointer flex items-center transition-colors"
                            style={{
                                background: formData.whatsapp_notifications ? 'var(--ee-primary)' : 'var(--ee-bg)',
                                boxShadow: formData.whatsapp_notifications ? 'none' : 'var(--shadow-neu-inset)'
                            }}
                        >
                            <div
                                className={`w-5 h-5 rounded-full transition-transform ${formData.whatsapp_notifications ? 'translate-x-7' : 'translate-x-0'}`}
                                style={{
                                    background: 'var(--ee-surface)',
                                    boxShadow: 'var(--shadow-ambient)'
                                }}
                            ></div>
                        </button>
                    </div>
                </div>

                {/* Join an organisation — redeem a team invite code. On success
                    the backend upgrades the account to institutional and the
                    next role fetch routes the user into /portfolio. */}
                <JoinOrganisationCard />

                {/* Action Buttons */}
                <div className="space-y-4 pt-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-5 rounded-[16px] font-bold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            background: 'var(--ee-primary)',
                            color: 'var(--ee-surface)',
                            boxShadow: 'var(--shadow-neu)',
                            fontFamily: 'var(--font-body)'
                        }}
                    >
                        <span className="material-symbols-outlined text-base mr-2 align-middle">save</span>
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>

                    <button
                        onClick={requestInstallPrompt}
                        className="w-full py-4 rounded-[16px] font-bold transition-all hover:opacity-80"
                        style={{
                            background: 'var(--ee-bg-dim)',
                            color: 'var(--ee-text)',
                            boxShadow: 'var(--shadow-neu)',
                            fontFamily: 'var(--font-body)'
                        }}
                    >
                        <span className="material-symbols-outlined text-base mr-2 align-middle">install_mobile</span>
                        Install App
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full py-4 rounded-[16px] font-bold transition-all hover:opacity-80"
                        style={{
                            background: 'rgba(220, 38, 38, 0.06)',
                            color: '#dc2626',
                            fontFamily: 'var(--font-body)'
                        }}
                    >
                        <span className="material-symbols-outlined text-base mr-2 align-middle">logout</span>
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
        </PageContainer>
    )
}
