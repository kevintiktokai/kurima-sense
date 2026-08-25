---
name: trim
description: Find code that should not exist and remove it — dead code, hand-rolled reimplementations of the standard library or platform, duplicated helpers, and abstractions with one caller. Use when asked to shorten, trim, simplify, reduce, or clean up code that is already written, or when a review turns up a file that feels longer than the job it does.
---

# Trimming code that already exists

The best code is the code nobody wrote. This skill is for the second-best case:
code that was written, works, and should now go.

Applying a minimalism ladder *before* writing is easy — you have no sunk cost
and no callers. Applying it *after* is a different job: the code exists, it may
be depended on, and deleting it can break things silently. So the ladder here is
paired with an evidence requirement. **Every removal must be justified by
something you looked up, not something you assumed.**

## The ladder

Work down. Stop at the first rung that holds.

| | Ask | If yes |
|---|---|---|
| 1 | Is this reachable at all? | Delete it |
| 2 | Is its result used? | Delete it |
| 3 | Does something in this repo already do it? | Call that instead |
| 4 | Does the standard library do it? | Use it |
| 5 | Does the platform do it? | Use it |
| 6 | Does an installed dependency already do it? | Use it |
| 7 | Does the abstraction have one caller? | Inline it |
| 8 | Can it be one line? | Make it one line |

Nothing survives a rung by being "probably fine". Rung 1 needs a grep for the
symbol. Rung 3 needs the name of the thing that already does it. Rung 6 needs
the dependency in `package.json` or `requirements.txt`, not a guess about what
is installed.

## What is never on the block

Shorter and worse is not a win. These are out of scope for trimming, always:

- **Security.** Input validation, auth checks, tenant scoping, constant-time
  comparison. A shorter insecure version is strictly worse than a longer safe
  one.
- **Error handling that covers data loss.** A failed capture, a lost write, a
  network call whose response went missing. Cutting a branch because it rarely
  runs is how a farmer's harvest disappears.
- **Accessibility.** ARIA labels, keyboard paths, focus states, contrast.
- **Regression guards.** A lint-shaped test looks like dead weight precisely
  because it never fires. That is the job.
- **Comments explaining why.** Delete a comment that restates the code. Keep the
  one that records why an obvious-looking alternative was rejected — that one is
  load-bearing, and re-deriving it costs more than it saves.

## What this repo pays for twice

Real patterns worth grepping for here, in rough order of how much they cost:

- **A second implementation of something in `lib/`.** Pure logic lives in `lib/`
  (frontend) and in pure modules (backend) precisely so two surfaces share it.
  A component computing a colour or a label inline is a divergence waiting to
  happen — the whole point of `lib/section-colors.ts` is that the colour on one
  surface matches the label on the other.
- **A second `getAuthHeaders`.** This existed three times. Two implementations
  of "am I signed in" is how one surface starts sending an expired token while
  the other doesn't.
- **A raw `fetch`.** `lib/http.ts` is the only place that calls the platform
  `fetch`. A call site that reimplements retry or timeout is both longer and
  wrong.
- **A `useMemo` whose value is never rendered.** Grep the identifier. If it
  appears once — at its own declaration — the whole block goes.
- **A hand-rolled version of something Postgres does.** Filtering or sorting in
  Python that a `WHERE` or `ORDER BY` would do, especially inside a loop.
- **A wrapper whose only job is to call one function.** Inline it.

## Procedure

1. **Read the file and trace the real flow first.** Lazy about the solution,
   never lazy about understanding. A removal made without reading the callers is
   a guess.
2. **Grep before deleting.** Every symbol you remove: search both repos for it.
   The frontend and backend are separate repositories and a name can cross the
   wire as a string.
3. **Make one kind of change per commit.** Dead code removal and a rewrite in
   the same diff means neither can be reviewed.
4. **Run the checks.** `npm test && npx tsc --noEmit` or `pytest -q`. A trim
   that turns a suite red is not a trim.
5. **Report what you did NOT cut and why.** The judgement is the deliverable as
   much as the diff. If something looks redundant and isn't, say so — the next
   person will wonder about it too.

## The trap

The dangerous removals are the ones that look obviously safe:

- A branch that "can't happen" — until an injected stub makes it happen. Deleting
  `if (!res.ok)` from a hook that takes an injectable `fetchImpl` deletes live
  error handling, because the stub does not throw even though the real client
  does.
- A parameter that is unused *in this implementation* but part of a callback
  contract.
- A test that passes trivially. Check that it can still fail before deciding it
  is redundant. A guard asserting nothing is worse than no guard, but the fix is
  to make it bite, not to delete it.
- An unbounded query that looks like a missing `LIMIT` and is actually correct.
  The input verification queries read the whole NDVI series on purpose: each
  input event is matched against the imagery around *that event's date*, so a
  cap would silently stop verifying older inputs.

When a removal is not obviously safe, leave it and say why. An honest "this
looks redundant but here is what it protects" is worth more than a diff that
saves twenty lines and costs a week.
