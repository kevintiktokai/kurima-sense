// Single source of truth for the backend origin. Every hook/service imports
// this instead of re-deriving it (the fallback was previously copy-pasted in
// ~19 files, which is how a missed env var silently sends production traffic
// to localhost).
export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'

// Fail loudly (not silently) if a production build is running without the
// backend URL configured — every API call would otherwise 'fail to fetch'
// against localhost with no clue why.
if (
    process.env.NODE_ENV === 'production' &&
    !process.env.NEXT_PUBLIC_API_URL &&
    typeof window !== 'undefined'
) {
    console.error(
        '[config] NEXT_PUBLIC_API_URL is not set — API calls are targeting ' +
        'localhost. Set it in the deployment environment (see README_DEPLOY.md).'
    )
}
