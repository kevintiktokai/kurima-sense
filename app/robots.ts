import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/site'

// Crawl policy: index the marketing surface (landing, segment pages, blog,
// legal); keep the authenticated app shells out of search results.
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/dashboard',
                    '/portfolio',
                    '/fields',
                    '/onboarding',
                    '/pwa-status',
                    '/offline',
                ],
            },
        ],
        sitemap: `${SITE_URL}/sitemap.xml`,
    }
}
