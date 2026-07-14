// Canonical public origin of the marketing site + app. Used by robots.txt,
// sitemap.xml and Open Graph metadata. Override with NEXT_PUBLIC_SITE_URL when
// the app moves to a custom domain — nothing else needs to change.
export const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://kurima-sense.vercel.app'
