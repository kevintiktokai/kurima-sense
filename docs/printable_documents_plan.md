# Printable Documents & Playbook Alignment — Implementation Plan

**Status:** Plan for review. No implementation started.
**Inputs:** The Velocity Playbook (internal strategy, 6 August 2026) + a capability
audit of both repos.
**Companion to:** `docs/farmer_growth_cycle_research.md`, `docs/season_lifecycle_implementation_plan.md`

---

## 0. One thing to settle before anything is built

You asked for three printables: **a plan, a field analytics report, and a
portfolio report.** All three are farmer-facing.

The playbook asks for something different, and asks for it in the strongest
language in the document:

> **THE ONE THING TO BUILD BEFORE ANYTHING ELSE.** The Season Evidence Pack is
> the keystone of this entire strategy… If you build one thing in the next six
> weeks, build this.

The Evidence Pack is **institution-facing** — it travels from your client to a
multinational leaf buyer, a lender, or TIMB. It is simultaneously the compliance
product, the artefact that does your distribution, the thing the lender wants,
and the justification for the price. Commitment #2 of six that the founders sign
at the end of the document is to build it within six weeks.

**These are not in conflict; the order matters.** The three farmer-facing
printables and the Evidence Pack share about 70% of their content and 100% of
their design system. Building the shared foundation plus the Evidence Pack first
means the other three become mostly layout work. Building them in the order you
listed means the keystone lands last, inside an 86-day window that closes the
season.

**Recommendation: build the document system + Season Evidence Pack first**, then
the portfolio report, then the field report, then the plan. Reasoning in §4.

One more piece of timing: the playbook is dated **6 August 2026**, which is
today. The 86 days it counts to the 31 October grower-registration deadline start
now, not from whenever this work begins.

---

## 1. How to build them so they're actually well designed

You asked whether this should be a design skill or templates. It should be
**neither of those alone — it should be a document design system in code**, for
one specific reason: the playbook requires these documents to leave your client's
building and be read by BAT, a bank, and TIMB.

> Every artefact that leaves a client's building carries a discreet KurimaSense
> mark and a single line: verified by KurimaSense, with the coverage period and
> hectare count.

A document that gets forwarded to a multinational is a document you cannot
re-render or correct. It has to be right, consistent, and identifiable the first
time, months after it was issued.

### 1.1 Rejected: browser print CSS

The cheap option — `@media print` on existing screens — fails the actual
requirement. It produces something a farmer prints, not something a contractor
**forwards unedited** to BAT. No file to attach, no stable pagination, no
document identity, and the mark can be removed by anyone with dev tools.

### 1.2 Recommended: server-side PDF from a shared template layer

Generate in the **backend**, from HTML templates rendered by a headless renderer
(WeasyPrint is the natural fit for a Python service — no browser dependency, good
CSS Paged Media support for headers, footers and page numbers).

```
services/documents/
  tokens.py            # brand tokens — single source, mirrors the app's CSS vars
  layout/              # cover, section, table, figure, footer primitives
  templates/
    evidence_pack.html
    portfolio_report.html
    field_report.html
    season_plan.html
  render.py            # template + data -> PDF bytes
  registry.py          # issue, number, and track every document produced
```

**Why server-side, specifically:**

- **A real file.** Attachable to the email a contractor sends their leaf buyer.
  That email *is* the distribution channel (Motion 02).
- **The mark survives.** Rendered into the PDF, not a DOM element.
- **Documents get identity.** Issue number, coverage period, hectare count,
  generation timestamp. The playbook makes *"evidence packs issued and
  forwarded"* a tracked metric — that needs a registry, not a print dialogue.
- **One renderer, four documents.** Consistency comes from shared primitives, not
  from discipline.

### 1.3 The design system itself

Brand tokens live in **one** place and are mirrored from the app's existing CSS
custom properties (`--ee-primary`, `--ee-text`, `--ee-muted`, the neu shadows),
so a document and a screen are visibly the same product. Documents need a few
things screens don't:

- **Print-safe palette.** The app's neumorphic shadows do not print. Documents
  need flat rules, hairlines and tints derived from the same hues.
- **A typographic scale that survives A4.** Screen sizes don't translate; the
  document scale is set in points against a baseline grid.
- **Paged furniture.** Running header with client name and coverage period,
  footer with page number, document ID and the verification line.
- **Table primitives.** Most of these documents are tables. Getting one table
  component right is most of the design work.

### 1.4 On a Claude skill

A skill in `.claude/skills/` is worth adding, but for a different job than you
might expect: **it makes *me* (or any future session) generate documents that
match**, by loading the tokens, the layout rules and the tone conventions before
writing a template. It is a consistency aid for authoring, not a runtime
mechanism. The runtime consistency has to come from shared code, or it will drift
the first time someone is in a hurry.

Worth doing — after the template layer exists, so the skill documents something
real rather than an intention.

---

## 2. What the app already has (the good news)

Most of the Evidence Pack's *content* exists. The gap is the document layer, not
the agronomy. Mapping the STP themes the playbook names against what's built:

| STP theme the pack must cover | What already produces it |
|---|---|
| **Soil** | `services/soil_intelligence/` — texture, pH, drainage, erosion risk, per field |
| **Crop protection agent usage** | `field_inputs`, now with product, method, rate and timing (migration 020) |
| **Good agricultural practice** | Execution quality (#50), Stand Check, action windows, season retrospective |
| **Land use & deforestation** | ⚠️ **Partial** — see §3.2 |
| **Grower-level traceability** | ⚠️ **Gap** — see §3.1 |

And beyond STP, for the other two budgets:

| Budget | What already produces it |
|---|---|
| **Contractor's recovery loss** (budget one) | `services/reconciliation/` — contracted vs. satellite-implied vs. delivered, with side-marketing flags. Plus `grower_contracts`, `input_disbursements`, `deliveries`. |
| **Lender's collateral file** (budget three) | Verified hectares, establishment (Stand Check), in-season progress, delivery reconciliation — all present, none of it packaged |

**The honest summary: you have the evidence and no way to hand it over.** That is
a document problem, which is a much better problem than a data problem.

---

## 3. App changes the strategy actually requires

Four gaps, in priority order. The first two are the difference between an
Evidence Pack that is credible to a multinational and one that isn't.

### 3.1 TIMB grower numbers — traceability keying

The playbook is specific: *"grower-level traceability keyed to TIMB grower
numbers."* The `growers` table holds name, phone, email, coordinates and notes.
**There is no TIMB grower number.**

Without it, an evidence pack cannot be reconciled against TIMB's own register by
a buyer who wants to check it — which is exactly what makes it evidence rather
than a report. TIMB has rolled out biometric grower registration covering 147,000+
growers; the number is the join key to the sector's system of record.

**Change:** `timb_grower_number` on `growers`, surfaced in grower CRUD and the
portfolio import, and printed on every grower row in the pack.

*Small change, large consequence. I would do this first.*

### 3.2 Land use and deforestation — the theme we can't yet evidence

An STP theme we currently have nothing for. But we are closer than it looks:
**the multi-year CDSE backfill (backend #42) is exactly the input.** Sentinel-2
history to 2015 over a field boundary is what land-conversion detection is built
from.

**Change:** a `services/compliance/land_use.py` that, per field, reports whether
the boundary shows conversion from woodland within the observed record —
baseline NDVI/EVI in the years before first cropping versus after. Reported with
explicit confidence, and **silent where the archive is too sparse to say**, in
the same posture as the rest of the agronomy: a false deforestation flag against
a grower is far worse than no flag.

This is the highest-effort item in the plan and the one I would most want to
scope carefully before committing. It is also the one that makes the pack
genuinely STP-shaped rather than STP-flavoured.

### 3.3 Document registry and marking

The playbook makes *"evidence packs issued and forwarded"* a tracked metric and
the mark a distribution mechanism.

**Change:** a `documents` table — id, tenant, client, type, coverage period,
hectares covered, issued_at, issued_by, and a `forwarded_at` the client can set
when they send it on. Every document carries a visible ID and the line *"verified
by KurimaSense · [coverage period] · [n] hectares"*.

**And a hard constraint, taken directly from the playbook's own caveat:**

> Marking a document your client chose to send is not sharing client data. Never
> publish grower-level or portfolio data, in any form, without written client
> consent.

The mark identifies the *producer*. It must never phone home, embed a public
link, or make any client data reachable by anyone holding the file. Given the
playbook rates a data incident as **existential** — *"one data controversy does
not build a moat here, it ends the company"* — the registry should be
write-only-by-tenant with no cross-tenant read path, and that should be tested
like the RLS policies already are.

### 3.4 Recovery baseline capture

> Baseline the Servemox recovery figure this month… If you do not baseline in
> August you cannot claim anything in July.

This is a **dated** requirement, not a feature. The reconciliation engine
computes recovery *now*; nothing records what recovery looked like **before**
KurimaSense, which is the number every subsequent sale rests on.

**Change:** a per-client `baseline` record — prior-season recovery rate, hectares,
delivered volume, and the date and source it was agreed. Small, and it stops
being possible to capture the moment the season runs.

---

## 4. The four documents

Priority follows the playbook, not the order in the request. Each builds on the
one before, so this order is also the least total work.

### 4.1 Season Evidence Pack — **build first**

**Audience:** the contractor's leaf buyer, lender, and TIMB. Forwardable unedited.

Structured to the STP themes, in the playbook's own order: land use and
deforestation, soil, crop protection agent usage, good agricultural practice,
plus grower-level traceability keyed to TIMB numbers. Plus a delivery and
recovery section from the reconciliation engine.

Two design rules specific to this document:

- **It must survive being read by a sceptic.** Every figure states its source
  and its date. Anything unmeasured says so rather than being omitted — an
  auditor who finds one unsupported claim discounts the whole file, which is the
  same reasoning behind the retrospective's unexplained remainder.
- **It must be forwardable without editing.** No internal notes, no
  KurimaSense sales language, nothing the contractor would have to remove before
  sending. The mark is the only thing of ours on it.

### 4.2 Portfolio report — **second**

**Audience:** the contractor's operations and finance director. Also the
**fighting demo** from Mechanic 03: *"open by showing them something about their
own portfolio they did not know."*

Grower-level performance across the book, worst first, with the reconciliation
flags. Shares ~80% of its data layer with the Evidence Pack, which is why it
comes second — it is mostly a different cut of the same query.

### 4.3 Field analytics report — **third**

**Audience:** the field officer and the individual grower.

Per-field season summary: KurimaScore trend, zone diagnosis, stand check, action
windows, inputs with execution quality, season history. Nearly all of it is
already computed and on screen; this is genuinely a layout exercise once the
template layer exists.

### 4.4 Season plan — **fourth**

**Audience:** the farmer, in the field, on paper, offline.

The pre-plant brief as a printable: target population and spacing, the dated
fertiliser programme, the action-window calendar. This is the one that most
benefits from **persona branching** (#44) — a smallholder's printed plan should
carry paces and a string line, a commercial one should carry rates and planter
calibration.

Lowest institutional leverage, highest daily usefulness. It matters, and it is
not what the next 86 days are for.

---

## 5. Instrumentation the playbook asks for

Section 15 names six metrics. Three are already derivable, three are not:

| Metric | Status |
|---|---|
| Contracted hectares under management | Derivable from `fields` + tenant; **needs a surface** — it's the "true north" and revenue is metered on it |
| Evidence packs issued **and forwarded** | Needs the registry (§3.3) |
| Findings acted on | ⚠️ **Gap.** The app surfaces findings (windows, zone diagnosis, stand check) but never records whether one changed a decision. This is the proof engine for next season's sales conversation. |
| Recovery delta at client | Needs the baseline (§3.4) |
| Gross revenue retention, named-list coverage | Commercial, not app |

**"Findings acted on"** is worth calling out. It is a small change — a
"did this change what you did?" acknowledgement on a window or a zone diagnosis —
and it converts the product's own output into the evidence that sells the next
account.

---

## 6. Sequencing against the 86-day window

The playbook is explicit that this window governs everything, and that a data
incident is the one unrecoverable failure. Both shape the order below.

**Weeks 1–2 — Foundation**
Document design system, tokens, layout primitives, renderer, registry table with
its tenant-isolation tests. TIMB grower number (§3.1). Recovery baseline (§3.4) —
this one is date-critical regardless of everything else.

**Weeks 3–6 — The keystone**
Season Evidence Pack, against real Servemox data. Land-use/deforestation scoped
and built, or explicitly deferred with the theme marked "not yet evidenced"
rather than quietly omitted. Ships inside the playbook's six-week commitment.

**Weeks 7–9 — Leverage**
Portfolio report, doubling as the fighting demo for the top-ten meetings. Hectares-
under-management surface. Findings-acted-on capture.

**Weeks 10–13 — Depth**
Field analytics report. Season plan, persona-aware. These serve delivery in
phase two rather than the selling window.

---

## 7. Risks specific to this work

**The Evidence Pack makes claims to institutions.** Everything printed in it is
subject to the agronomist sign-off already outstanding on seven sets of
constants — but the stakes change. A wrong number on a farmer's screen costs one
farmer a season; the same number in a file forwarded to BAT is a claim your client
made to their buyer on your evidence. **I would not ship the pack to a real buyer
before that review.**

**Land-use detection is the one place we could do real harm.** A false
deforestation flag against a grower, in a file that reaches a multinational,
could cost that grower their contract. It needs a higher evidence bar than
anything else in the product, and should be silent rather than uncertain.

**Marking must not become tracking.** A discreet producer mark is what the
playbook asks for. Anything that lets us observe where a client's file travelled
is exactly the data controversy rated existential.

**Scope pressure on the window.** The temptation will be to build all four
documents at once because they look similar. They are similar — after the
template layer exists. Building them in parallel before it does produces four
inconsistent documents and no keystone.

---

## 8. Decisions taken

Answered 6 August 2026.

1. **Priority: Evidence Pack first.** The playbook's order, not the original
   one. Portfolio report, field report and season plan follow.
2. **Brand assets: a kit exists** and is to be supplied. Until it arrives the
   documents use the app's CSS tokens with the wordmark set in Fraunces. Only
   the mark is affected — swapping it is a one-file change to `base.html` and
   the cover band, so nothing else waits on it.
3. **No real STP submission format available.** The pack is built around the
   four themes the playbook names, structured so the same data layer can be
   re-laid-out to a real template later without touching the assembly.
4. **Servemox data access** — still outstanding. The pack currently renders
   against fixtures. See §9.

## 9. What was built

All four documents ship, each reachable over HTTP and each recorded when issued.

| Document | Route | Verification line |
|---|---|---|
| Season Evidence Pack | `POST /portfolio/documents/evidence-pack` | yes — observed hectares |
| Portfolio report | `POST /portfolio/documents/portfolio-report` | yes — observed hectares |
| Field report | `POST /fields/{id}/documents/field-report` | no, by design |
| Season plan | `POST /fields/{id}/documents/season-plan` | no, by design |

The two without a line are not missing one. A field report explains hectares
rather than verifying coverage across them, and a plan describes what has not
happened yet — verifying a forecast is a category error. Both are still
identifiable by issue number, which is the registry's job rather than the mark's.

**The registry** (`document_issues`, migration 022) records what each document
claimed at issue time and a SHA-256 of the exact bytes. It records **issuance,
not delivery**: no open tracking, no callback, no per-recipient token, and
`forwarded_at` is set only when a client says they sent it. A test asserts no
public name in the module contains `track`, `pixel`, `beacon`, `callback`,
`webhook` or `open_rate`.

**Surfaces.** `/portfolio/reports/documents` generates the two portfolio-level
documents and lists what has been issued; the field page carries a card for the
season plan and field report.

## 10. Still outstanding

- **Land use and deforestation is unevidenced.** Nothing in the database
  sources it — it needs multi-year imagery compared against the boundary, which
  the CDSE backfill can reach but nothing wires up. Until then no field carries
  the theme and the pack prints "No evidence recorded", so a reader can tell we
  did not check rather than that we checked and found nothing. **This is the
  largest remaining gap in the Evidence Pack**, and it is the theme a leaf buyer
  opens the pack for.
- **Agronomist sign-off** on ten constants, three added by this work:
  `THEME_ADEQUATE_SHARE` (what the pack calls adequate STP coverage),
  `ATTENTION_URGENCIES` and `STALE_AFTER_DAYS` (which fields a lender is told to
  look at, and when an observation stops counting).
- **Real client data.** Growers with no fields, fields with no observations in a
  window, duplicate TIMB numbers — the assembly handles all three deliberately,
  but "handles" is a claim with only fixtures behind it. It is also the only way
  to learn whether the pack's shape survives a contractor with 400 growers.
- **A staging run** of migrations 019–022 and the CDSE backfill, neither
  exercised against a real database.
- **Recovery baseline capture** (§3.4) — still the date-critical one, and still
  the only item where waiting costs something that cannot be recovered later.
