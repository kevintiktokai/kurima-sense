'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthProvider'

export interface UserProfile {
    id: string
    full_name: string | null
    phone_number: string | null
    role: string | null
    preferred_language: string | null
    whatsapp_notifications: boolean
    has_seen_tutorial: boolean
    tutorial_progress: Record<string, boolean>
    created_at: string | null
    updated_at: string | null
}

interface UserProfileContextType {
    profile: UserProfile | null
    loading: boolean
    error: string | null
    refreshProfile: () => Promise<void>
    updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>
}

const UserProfileContext = createContext<UserProfileContextType>({
    profile: null,
    loading: true,
    error: null,
    refreshProfile: async () => { },
    updateProfile: async () => false
})

export const useUserProfile = () => {
    const context = useContext(UserProfileContext)
    if (!context) {
        throw new Error('useUserProfile must be used within UserProfileProvider')
    }
    return context
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
    const { user, loading: authLoading } = useAuth()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Track which user ID we last fetched for
    const lastFetchedUserId = useRef<string | null>(null)

    const fetchProfile = async () => {
        console.log('[UserProfileProvider] fetchProfile called, user:', user?.id)
        if (!user) {
            console.log('[UserProfileProvider] No user, setting profile to null')
            setProfile(null)
            lastFetchedUserId.current = null
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setError(null)

            console.log('[UserProfileProvider] Fetching profile for user:', user.id)
            const { data, error: fetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            console.log('[UserProfileProvider] Supabase response:', { data, error: fetchError })

            // Mark that we've fetched for this user
            lastFetchedUserId.current = user.id

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError
            }

            if (data) {
                setProfile({
                    id: data.id,
                    full_name: data.full_name,
                    phone_number: data.phone_number,
                    role: data.role,
                    preferred_language: data.preferred_language || 'English',
                    whatsapp_notifications: data.whatsapp_notifications ?? true,
                    has_seen_tutorial: data.has_seen_tutorial ?? false,
                    tutorial_progress: data.tutorial_progress || {},
                    created_at: data.created_at || user.created_at,
                    updated_at: data.updated_at
                })
            } else {
                // No profile yet
                setProfile(null)
            }
        } catch (err: any) {
            console.error('Error fetching profile:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
        if (!user) return false

        try {
            // Only include fields that exist in the profiles table
            // Filtering out undefined values and fields that might not exist
            const safeUpdates: Record<string, any> = {
                id: user.id,
                updated_at: new Date().toISOString()
            }

            // Only add fields if they have values
            if (updates.full_name !== undefined) safeUpdates.full_name = updates.full_name
            if (updates.phone_number !== undefined) safeUpdates.phone_number = updates.phone_number
            if (updates.role !== undefined) safeUpdates.role = updates.role
            if (updates.preferred_language !== undefined) safeUpdates.preferred_language = updates.preferred_language
            if (updates.whatsapp_notifications !== undefined) safeUpdates.whatsapp_notifications = updates.whatsapp_notifications
            if (updates.has_seen_tutorial !== undefined) safeUpdates.has_seen_tutorial = updates.has_seen_tutorial
            if (updates.tutorial_progress !== undefined) safeUpdates.tutorial_progress = updates.tutorial_progress

            console.log('Updating profile with:', safeUpdates)

            const { data, error: updateError } = await supabase
                .from('profiles')
                .upsert(safeUpdates, { onConflict: 'id' })
                .select()

            if (updateError) {
                console.error('Supabase update error:', updateError.message, updateError.code, updateError.details)
                throw updateError
            }

            console.log('Profile updated successfully:', data)

            // Refresh the profile after update
            await fetchProfile()
            return true
        } catch (err: any) {
            console.error('Error updating profile:', err?.message || err)
            setError(err?.message || 'Failed to update profile')
            return false
        }
    }

    useEffect(() => {
        fetchProfile()
    }, [user])

    // Compute effective loading state:
    // We're loading if auth is loading, OR if we have a user but haven't fetched their profile yet
    const isEffectivelyLoading = Boolean(authLoading || loading || (user && lastFetchedUserId.current !== user.id))

    console.log('[UserProfileProvider] Effective state:', {
        authLoading,
        loading,
        userId: user?.id,
        lastFetchedUserId: lastFetchedUserId.current,
        isEffectivelyLoading,
        hasProfile: !!profile
    })

    return (
        <UserProfileContext.Provider value={{
            profile,
            loading: isEffectivelyLoading,
            error,
            refreshProfile: fetchProfile,
            updateProfile
        }}>
            {children}
        </UserProfileContext.Provider>
    )
}
