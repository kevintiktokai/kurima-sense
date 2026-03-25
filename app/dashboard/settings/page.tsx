'use client'

import { useState, useEffect } from 'react'
import { useUserProfile } from '@/components/providers/UserProfileProvider'
import { useAuth } from '@/components/providers/AuthProvider'

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
            <div className="bg-white rounded-[3.5rem] p-10 lg:p-14 max-w-2xl mx-auto shadow-2xl animate-pulse">
                <div className="h-8 bg-slate-200 rounded w-1/3 mb-8"></div>
                <div className="space-y-6">
                    <div className="h-24 bg-slate-100 rounded-[2rem]"></div>
                    <div className="h-16 bg-slate-100 rounded-2xl"></div>
                    <div className="h-16 bg-slate-100 rounded-2xl"></div>
                </div>
            </div>
        )
    }

    return (
        <div id="settings-container" className="bg-white rounded-[3.5rem] p-10 lg:p-14 max-w-2xl mx-auto shadow-2xl animate-in fade-in zoom-in duration-500">
            <h3 className="text-2xl font-black mb-8 text-brand-dark">Profile & Preferences</h3>

            {/* Success/Error Message */}
            {message && (
                <div className={`mb-6 p-4 rounded-2xl ${message.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.text}
                </div>
            )}

            <div className="space-y-8">
                {/* Profile Header */}
                <div id="profile-header" className="flex items-center gap-6 p-6 bg-brand-surface rounded-[2rem]">
                    <div className="w-20 h-20 rounded-full bg-slate-300 border-4 border-white shadow-md flex items-center justify-center text-3xl">
                        {profile?.full_name?.charAt(0)?.toUpperCase() || '👨‍🌾'}
                    </div>
                    <div>
                        <p className="text-xl font-bold text-brand-dark">
                            {profile?.full_name || 'No name set'}
                        </p>
                        <p className="text-sm text-slate-500">Member since {memberSince}</p>
                        <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
                    </div>
                </div>

                {/* Editable Fields */}
                <div className="grid grid-cols-1 gap-6">
                    {/* Full Name */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-2">
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                            placeholder="Enter your full name"
                            className="w-full p-5 rounded-2xl bg-brand-surface border-none focus:ring-2 focus:ring-brand-lime text-brand-dark"
                        />
                    </div>

                    {/* Phone / WhatsApp */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-2">
                            WhatsApp Contact
                        </label>
                        <input
                            type="tel"
                            value={formData.phone_number}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                            placeholder="+263 7..."
                            className="w-full p-5 rounded-2xl bg-brand-surface border-none focus:ring-2 focus:ring-brand-lime text-brand-dark"
                        />
                    </div>

                    {/* Language */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-2">
                            Preferred Language
                        </label>
                        <select
                            value={formData.preferred_language}
                            onChange={(e) => setFormData(prev => ({ ...prev, preferred_language: e.target.value }))}
                            className="w-full p-5 rounded-2xl bg-brand-surface border-none focus:ring-2 focus:ring-brand-lime text-brand-dark"
                        >
                            <optgroup label="Global">
                                <option value="English">English</option>
                                <option value="French">French (Français)</option>
                                <option value="Portuguese">Portuguese (Português)</option>
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
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-2">
                            Role
                        </label>
                        <div className="w-full p-5 rounded-2xl bg-slate-100 text-slate-600 capitalize font-medium">
                            {profile?.role || 'Standard User'}
                        </div>
                    </div>

                    {/* WhatsApp Notifications Toggle */}
                    <div id="notifications-toggle" className="pt-4 border-t border-slate-100 flex justify-between items-center">
                        <div>
                            <p className="font-bold text-brand-dark">WhatsApp Advisory</p>
                            <p className="text-xs text-slate-500">Receive weekly field summaries via WhatsApp</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, whatsapp_notifications: !prev.whatsapp_notifications }))}
                            className={`w-14 h-7 rounded-full p-1 cursor-pointer flex items-center transition-colors ${formData.whatsapp_notifications ? 'bg-brand-lime' : 'bg-slate-300'
                                }`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${formData.whatsapp_notifications ? 'translate-x-7' : 'translate-x-0'
                                }`}></div>
                        </button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-4 pt-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-brand-dark text-white py-5 rounded-2xl font-bold shadow-xl hover:bg-[#3d4d35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-bold hover:bg-red-100 transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    )
}
