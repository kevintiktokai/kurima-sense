# Signup Path — Configuration Checklist & Flow Reference

*Companion to the July 2026 signup-path hardening. The code now handles every
redirect-based flow through `/auth/callback`; this file lists the **Supabase
dashboard settings the code cannot set for you** and documents how each flow
works so regressions are easy to spot.*

---

## 1. Supabase dashboard settings (required — do these before launch)

### Authentication → URL Configuration
- **Site URL**: `https://kurima-sense.vercel.app` (change when the custom domain lands).
- **Redirect URLs** (allowlist) must contain:
  - `https://kurima-sense.vercel.app/auth/callback`
  - `https://kurima-sense.vercel.app/auth/reset`
  - `https://*.vercel.app/auth/callback` and `https://*.vercel.app/auth/reset`
    (preview deploys; remove if you don't test auth on previews)
  - `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/reset` (dev)

  A missing entry here is the #1 cause of "Google login redirects me to the
  landing page / localhost": Supabase silently falls back to the Site URL when
  the requested redirect is not allowlisted.

### Authentication → Providers → Google
- Enable the provider and paste the **Client ID + Client Secret** from a Google
  Cloud OAuth 2.0 Web client.
- In the Google Cloud console, the OAuth client's **Authorized redirect URI**
  must be exactly the Supabase callback:
  `https://<project-ref>.supabase.co/auth/v1/callback`
- Configure the OAuth consent screen (app name, logo, support email) and
  **publish** it — in "Testing" mode only allowlisted Google accounts can sign in,
  which looks like "Google login is broken" to everyone else.

### Authentication → Emails
- **Custom SMTP** (Resend/Postmark/SES): the default Supabase sender is heavily
  rate-limited (~2/hour) and often lands in spam — every confirmation or reset
  email that doesn't arrive is a lost signup.
- Keep the confirmation + recovery templates' links pointing at
  `{{ .ConfirmationURL }}` (the code exchange on `/auth/callback` / `/auth/reset`
  handles these).

### Authentication → Passwords/Policies
- Enable **leaked-password protection** (HaveIBeenPwned) — one toggle.

## 2. How the flows work now (code reference)

All post-auth routing goes through one function:
`resolvePostAuthDestination()` in `lib/auth-routing.ts` — profile incomplete →
`/onboarding`; else institutional → `/portfolio/today`; else `/dashboard`.

| Flow | Path |
|---|---|
| Email+password signup | `signUp` (emailRedirectTo=`/auth/callback`) → confirmation email → `/auth/callback` exchanges code → route |
| Already-registered email signs up again | detected via empty-`identities` fake success → "already registered, try signing in / forgot password" (previously: told to wait for an email that never comes) |
| Email+password sign-in | `signInWithPassword` → route |
| Google OAuth (new or returning) | `signInWithOAuth` (redirectTo=`/auth/callback`) → exchange → route. Returning users skip onboarding (previously they were always dumped back into it) |
| Forgot password | `/auth` → "Forgot password?" → `resetPasswordForEmail` (redirectTo=`/auth/reset`) → email → `/auth/reset` sets the new password (previously: no recovery path existed at all) |
| Failed/expired/cross-browser link | `/auth/callback` shows a human-readable error with a path back to sign-in (previously: silent bounce to `/auth`) |
| Onboarding | skips already-onboarded users; pre-fills the Google display name |

## 3. Known limitation — Google OAuth inside the Capacitor Android app

`signInWithOAuth` performs a full-page redirect, which inside the native
WebView hits Google's **`disallowed_useragent`** policy (Google blocks OAuth in
embedded webviews). Email+password works natively today. Before pushing the
Play Store build, OAuth needs the native pattern: `skipBrowserRedirect` +
`@capacitor/browser` (Custom Tab) + a deep-link redirect back into the app +
`exchangeCodeForSession` on `appUrlOpen`. Tracked as P1 in
`PRODUCTION_READINESS.md` — not a web launch blocker.

## 4. Manual smoke test before launch (10 minutes)

1. Signup with a fresh email → confirmation email arrives → link lands on
   "Signing you in…" → onboarding → dashboard.
2. Sign out → sign in → straight to dashboard (no onboarding).
3. Signup again with the same email → "already registered" message (no fake
   "check your email").
4. "Continue with Google" with a new Google account → onboarding (name
   pre-filled) → dashboard.
5. "Continue with Google" again → straight to dashboard (no onboarding).
6. "Forgot password?" → email arrives → set new password → lands in app →
   sign out → sign in with the new password.
7. Open a confirmation link twice → second open shows the friendly error, not
   a blank bounce.
