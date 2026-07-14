'use client'

import { useEffect, useRef } from 'react'
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { META_PIXEL_ID, trackEvent } from '@/lib/analytics'

/**
 * Meta Pixel loader + SPA page-view tracking. Renders nothing (and loads no
 * third-party script) unless NEXT_PUBLIC_META_PIXEL_ID is configured. The base
 * snippet fires the initial PageView; client-side route changes are tracked
 * via the pathname effect below (skipping the first render to avoid a double
 * count on landing).
 */
export default function MetaPixel() {
    const pathname = usePathname()
    const isFirstRender = useRef(true)

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        trackEvent('PageView')
    }, [pathname])

    if (!META_PIXEL_ID) return null

    return (
        <Script id="meta-pixel" strategy="afterInteractive">
            {`
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');
            `}
        </Script>
    )
}
