This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Role-based routing

Users are routed by their backend role (`GET /me/role`):

- **consumer / admin** → the existing `/dashboard/*` experience (unchanged).
- **institutional** → the `/portfolio/*` shell (Today / Fields / Growers / Alerts / Reports).

The single source of truth is the `useUserRole()` hook (`hooks/useUserRole.ts`,
SWR-cached per session). `RoleGuard` (`components/auth/RoleGuard.tsx`) wraps each
layout and redirects out-of-role users with `router.replace`, defaulting to the
consumer view if the role lookup fails. The pure decision lives in
`components/auth/roleAccess.ts` (`decideAccess`) and is unit-tested in
`tests/role-routing.test.ts`. See `docs/role_routing_audit.md` for the design.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
