# CLAUDE.md — kurima-sense (frontend)

Next.js app for KurimaSense. Backend lives in `kurimasense-backend`.

## Checks

```bash
npm test              # node:test unit tests (tests/*.test.ts)
npx tsc --noEmit      # typecheck
npx next build --webpack
npx eslint <paths>
```

CI runs `tsc --noEmit` + `npm test` on every push and PR to `main`.

## Conventions worth knowing

- **Pure logic lives in `lib/`** and is unit-tested; components stay thin. See
  `lib/section-colors.ts`, `lib/planning-utils.ts`, `lib/action-window-utils.ts`
  for the pattern — a helper shared by two surfaces so the colour on one always
  matches the label on the other.
- **Data hooks are SWR**, keyed per field, in `hooks/`. Mutations invalidate
  centrally (`invalidateSeasons`, `invalidateFieldState`).
- **Cards render nothing rather than rendering empty.** Silent absence beats a
  broken or "no data" card on the farmer's main surface.
- Styling uses CSS custom properties (`--ee-bg`, `--ee-text`, `--ee-primary`,
  `--shadow-neu*`) — not Tailwind colour classes.
- **Text on a `--ee-primary` fill is `--ee-on-primary`, never white.** White is
  2.31:1 against the brand green and fails WCAG AA. `tests/brand-tokens.test.ts`
  enforces both the ratio and the absence of white-on-primary in components.
- The palette is the **logo and the Velocity Playbook**, not the other way
  round. `services/documents/tokens.py` in the backend samples the same values;
  if one side changes, change both.

## Kev Kreds

Kevin keeps a credit ledger with me. The canonical file is
[`.claude/kev-kreds.md`](.claude/kev-kreds.md) in this repo.

When Kevin says something like *"add some Kev Kreds"*, *"give yourself N Kev
Kreds"*, or *"take some Kev Kreds off"*:

1. Read `.claude/kev-kreds.md`.
2. Append a dated row: the change, the new running balance, and what it was for.
3. Update the **Balance** line at the top.
4. Commit it.

Record removals as faithfully as awards — a ledger that only goes up isn't a
ledger. If the amount is ambiguous, record your reading and note it rather than
guessing silently.
