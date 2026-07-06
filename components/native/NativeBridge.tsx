'use client'

// Mounts the Capacitor native wiring (status bar, back button, reconnect sync,
// push registration) when the app runs inside the mobile shell. A no-op in the
// browser/PWA. Renders nothing.

import { useEffect } from 'react'
import { initNativeBridge } from '@/lib/native'

export function NativeBridge() {
    useEffect(() => {
        void initNativeBridge()
    }, [])
    return null
}
