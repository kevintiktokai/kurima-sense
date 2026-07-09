import type { MetadataRoute } from 'next'

import { blogPosts } from '@/lib/blog-data'
import { SITE_URL } from '@/lib/site'

// The indexable marketing surface. App shells (dashboard/portfolio/fields) are
// deliberately absent — they're auth-gated and disallowed in robots.ts.
const marketingRoutes = [
    '',
    '/for-buyers',
    '/for-lenders',
    '/for-insurers',
    '/blog',
    '/privacy',
    '/terms',
]

export default function sitemap(): MetadataRoute.Sitemap {
    const pages: MetadataRoute.Sitemap = marketingRoutes.map((route) => ({
        url: `${SITE_URL}${route}`,
        changeFrequency: route === '' ? 'weekly' : 'monthly',
        priority: route === '' ? 1 : 0.7,
    }))

    const posts: MetadataRoute.Sitemap = blogPosts.map((post) => ({
        url: `${SITE_URL}/blog/${post.slug}`,
        changeFrequency: 'monthly',
        priority: 0.6,
    }))

    return [...pages, ...posts]
}
