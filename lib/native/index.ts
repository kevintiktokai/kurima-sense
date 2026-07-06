'use client'

// Native bridge — the single seam between the web app and Capacitor.
//
// Everything native-conditional lives here so the rest of the codebase stays
// platform-agnostic: components call these helpers, which use Capacitor
// plugins inside the native shell and fall back to standard web APIs in the
// browser/PWA. All plugin imports are dynamic, so none of this weighs on the
// web bundle or breaks SSR.

import { getAuthHeaders } from '@/lib/api-cache'
import { runSync } from '@/lib/offline/outbox'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

export function isNativePlatform(): boolean {
    if (typeof window === 'undefined') return false
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    return Boolean(cap?.isNativePlatform?.())
}

async function currentPlatform(): Promise<'android' | 'ios' | 'web'> {
    const { Capacitor } = await import('@capacitor/core')
    return Capacitor.getPlatform() as 'android' | 'ios' | 'web'
}

// ── push notifications ───────────────────────────────────────────────────────

/** Register this device for push and hand the token to the notification
 *  service. Safe to call on every launch (backend upserts by token). */
export async function registerForPush(): Promise<void> {
    if (!isNativePlatform()) return
    try {
        const { PushNotifications } = await import('@capacitor/push-notifications')

        let permission = await PushNotifications.checkPermissions()
        if (permission.receive === 'prompt') {
            permission = await PushNotifications.requestPermissions()
        }
        if (permission.receive !== 'granted') return

        const platform = await currentPlatform()

        await PushNotifications.addListener('registration', (token) => {
            void (async () => {
                try {
                    const headers = { 'Content-Type': 'application/json', ...(await getAuthHeaders()) }
                    await fetch(`${API_URL}/notifications/devices`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ token: token.value, platform }),
                    })
                } catch (e) {
                    console.warn('[native] push token registration failed:', e)
                }
            })()
        })

        await PushNotifications.addListener('registrationError', (err) => {
            console.warn('[native] push registration error:', err)
        })

        // Tapping a push opens the notification's deep link (action_url is set
        // by the backend channel payload; fall back to the inbox).
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            const target = (action.notification.data as { action_url?: string })?.action_url
            window.location.href = target && target.startsWith('/') ? target : '/dashboard'
        })

        await PushNotifications.register()
    } catch (e) {
        console.warn('[native] push setup failed:', e)
    }
}

// ── location ─────────────────────────────────────────────────────────────────

export interface Position { lat: number; lon: number; accuracy?: number }

/** GPS position via the native plugin (better accuracy + permission UX in the
 *  shell), gracefully falling back to the browser geolocation API. */
export async function getCurrentPosition(): Promise<Position | null> {
    if (isNativePlatform()) {
        try {
            const { Geolocation } = await import('@capacitor/geolocation')
            const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15_000 })
            return { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }
        } catch {
            /* fall through to web API */
        }
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null
    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 15_000 },
        )
    })
}

// ── camera ───────────────────────────────────────────────────────────────────

/** Native camera capture returning a base64 JPEG (no data: prefix), or null
 *  when unavailable — callers keep their existing <input type=file> path as
 *  the web fallback. */
export async function takePhotoBase64(): Promise<string | null> {
    if (!isNativePlatform()) return null
    try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')
        const photo = await Camera.getPhoto({
            resultType: CameraResultType.Base64,
            source: CameraSource.Camera,
            quality: 80,
            correctOrientation: true,
        })
        return photo.base64String ?? null
    } catch {
        return null
    }
}

// ── lifecycle wiring ─────────────────────────────────────────────────────────

let _initialized = false

/** One-time native wiring, called from <NativeBridge/> in the root layout:
 *  status bar, Android back button, reconnect-triggered outbox sync, push. */
export async function initNativeBridge(): Promise<void> {
    if (_initialized || !isNativePlatform()) return
    _initialized = true

    try {
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        const dark = document.documentElement.classList.contains('dark')
        await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light })
    } catch { /* status bar is cosmetic */ }

    try {
        const { App } = await import('@capacitor/app')
        // Android hardware back: navigate the SPA history; exit from the root.
        await App.addListener('backButton', ({ canGoBack }) => {
            if (canGoBack) window.history.back()
            else void App.exitApp()
        })
        // Returning to the foreground: drain any offline captures immediately.
        await App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) void runSync()
        })
    } catch (e) {
        console.warn('[native] app lifecycle wiring failed:', e)
    }

    try {
        const { Network } = await import('@capacitor/network')
        // The native connectivity event is far more reliable than the DOM
        // 'online' event inside WebViews — this is what makes background-ish
        // sync dependable on mobile.
        await Network.addListener('networkStatusChange', ({ connected }) => {
            if (connected) void runSync()
        })
    } catch (e) {
        console.warn('[native] network wiring failed:', e)
    }

    void registerForPush()
}
