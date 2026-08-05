# Farmer Growth-Cycle Research & UX Gap Analysis

**Status:** Research only — no code changes proposed for immediate implementation.
**Date:** August 2026
**Question asked:** What do farmers actually lose yield to across the growth cycle, and
where does KurimaSense's current experience fail to be "an AI agronomist in your pocket"?

---

## 0. A note on sources

The brief asked for Reddit research specifically. **Reddit is not reachable from this
environment** — it is blocked both as a search domain and at the fetch layer (direct,
`old.reddit.com`, `.json` endpoints, and text-proxy mirrors all return 403/blocked). I did
not want to fabricate quotes, so I substituted equivalent sources of authentic farmer voice
and hard agronomic numbers:

- **NewAgTalk** (`talk.newagtalk.com`) — an active working-farmer forum, very close in
  register to r/farming. Threads on replanting and population decisions.
- **University extension agronomy** (Wisconsin, Purdue, Iowa State, Missouri) — the
  quantitative yield-penalty data that farmer forum arguments circle around.
- **Peer-reviewed smallholder / Sub-Saharan Africa literature** — PNAS, PLOS One, Springer,
  and FAO on yield gaps, digital advisory abandonment, and post-harvest loss.
- **Seed Co Zimbabwe grower guides** — the regionally correct population recommendations.

If Reddit access matters for this, the practical routes are a Reddit API key (free tier,
`oauth.reddit.com`), or running the search from a machine with normal browser access.
Flagging it rather than quietly working around it.

---

## 1. What we can do today (capability audit, from the code)

Credit where it's due — the agronomic knowledge base is genuinely deep, and deeper than the
UI currently exposes.

**Strengths, verified in code:**

| Capability | Where | Note |
|---|---|---|
| 40+ Zimbabwe crop profiles | `crop_profiles/*.py` | Per-disease pathogen, identification markers, favourable conditions, economic thresholds, severity scales, chemical control with PHI days |
| Variety-level disease susceptibility | `crop_profiles/maize.py` etc. | e.g. SC 637 flagged susceptible to GLS, SC 403 resistant — real, actionable specificity |
| Growth-stage engine | `proactive_intelligence.py:139` | Crop-specific stage math (maize, tobacco, soybean, vegetable, generic) |
| Disease risk from weather | `proactive_intelligence.py:519` | `assess_disease_risk` — genuinely proactive |
| Canonical field state | `services/field_state/aggregator.py` | Single source of truth so two screens can't contradict each other. This is good architecture. |
| KurimaScore + yield projection | `yield_model.py`, aggregator | With confidence bands |
| Soil intelligence | `services/soil_intelligence/` | SoilGrids + terrain providers |
| Irrigation advisor | `services/irrigation/` | |
| Vision diagnosis | `ai_brain.py:1157` | GPT-4V disease/pest/nutrient diagnosis with severity + urgency |
| Harvest → calibration loop | `outcome_routes.py`, `services/calibration/` | Actual harvest feeds back to model calibration |
| Notification scheduler | `services/notifications/` | Task reminders, overdue, weather, irrigation, weekly/monthly summaries |

**The data model, in full.** These are all the tables:

```
fields, daily_logs, field_inputs, field_activities, field_sections,
field_section_analysis, farm_tasks, crop_varieties, soil_profiles,
chat_logs, chat_sessions, user_events, team_invites, field_assignments
```

And what a `field` actually stores:

```sql
fields(
  id, user_id, name, crop_type, polygon_coordinates, size_hectares,
  health_score, planting_date, variety, fertilizer_history TEXT, created_at
)
```

Hold that thought.

---

## 2. The central finding: we are blind to crop establishment

You raised spacing as "just an example." It is not just an example — **it is the single
largest structural gap in the product**, and the research backs your instinct hard.

### 2.1 What the code says

Grepping the backend for spacing/population concepts:

- **231 matches** for `spacing` across `crop_profiles/` — but every one is *prose advice
  inside a knowledge blob*. For example, `crop_profiles/maize.py:53`:
  `"Optimise plant population (don't overcrowd; improves air circulation)"`,
  and `:366`: `"Check plant population; consider gap-filling if <75% stand"`.
- **Zero matches** for spacing or population in `services/`, `yield_model.py`, or
  `agronomic_engine.py`.

That asymmetry is the whole story. **We tell the farmer to check their plant population.
We never ask them what it was. We never score it. We never verify it.** The number never
enters the model.

There is no `row_spacing_cm`, no `in_row_spacing_cm`, no `target_population`, no
`seed_rate_kg_ha`, no `planting_depth_cm`, no `established_stand_count`, no
`emergence_date`, and no `emergence_uniformity` anywhere in the schema. `field_inputs`
stores `(input_type, quantity, unit, input_date)` — fertiliser and chemicals, not
establishment. `field_activities` is free-text `(activity_type, title, notes, photo_url)`.

### 2.2 Why this is the highest-leverage gap

Establishment has four properties that make it uniquely valuable to instrument, and it is
the *only* major yield lever with all four:

1. **It is deterministic and farmer-controlled.** Unlike rainfall, the farmer chooses it.
2. **It is decided in week one and irreversible by roughly week two.** After that the
   season's ceiling is set. Every other lever we currently model (fertiliser timing,
   irrigation, spraying) remains adjustable for months.
3. **It has large, well-quantified yield effects** (numbers below).
4. **It is invisible to satellites.** This is the critical one — see 2.4.

### 2.3 The numbers

From University of Wisconsin corn agronomy (`corn.agronomy.wisc.edu/WCM/W104.aspx`):

- Within-row gaps of 4–6 ft reduce grain yield **up to 5%**.
- **Delayed emergence is worse than uneven spacing.** If half or more plants emerge
  ~1.5 weeks late: **5–8% yield loss**. If delayed 3+ weeks: **20%+ yield loss**.
- Skips hurt more than doubles: *"Skips are much more limiting to yield than doubles"*
  (University of Illinois).

Mechanism: early-emerging plants win the competition for light, water and nutrients and
permanently suppress their late neighbours. A late plant is not a smaller plant — it is
often a barren one.

For Zimbabwe specifically (Seed Co grower guides, `murimi.co.zw`):

- Low-rainfall / dryland: **37,000–44,000 plants/ha**
- High-potential or irrigated: **50,000–60,000 plants/ha**
- Overall recommended range **36,000–60,000** depending on environment and hybrid.

That is a **~65% spread between the bottom and top of the recommended range** — driven
entirely by natural region, rainfall expectation, and hybrid. This is exactly the kind of
site-specific reasoning we already have the inputs for (we know the polygon, hence the
natural region; we know the variety; we have the soil profile and the seasonal rainfall
outlook) and it is exactly the kind of question a farmer currently has to answer alone.

Farmers argue about this constantly, and the arguments show they're working without good
tools. From NewAgTalk on population and replanting:

> *"Planted corn at 33k and have some fields at 20-24k. Sounds like this is the border line
> threshold to replant."*

> *"The condition of the remaining plants is as important as the lost stand."*

> *"Replant anything below 24k? Lol, maybe if they sell seed."* — on distrust of
> seed-company advice

> *"We have had corn planted/replanted up until the middle of June yield 110% of aph, also
> have replanted corn in the first week of June that ran 80% of aph."* — on how
> location-specific this is

Two things jump out. First, **farmers do not trust advice from parties who sell inputs** —
which is a positioning advantage for a neutral tool. Second, the only method they trust for
resolving it is *"test strips and comparing the yield of the replant to the original
planting"* — i.e. their own outcome data, which is precisely what our calibration loop
already collects and could feed back.

### 2.4 The scientific reason this breaks our score

This is the part I'd most want to stress-test with an agronomist, because if it holds it
affects the integrity of the KurimaScore itself.

**NDVI cannot distinguish a thin stand from a stressed stand.** A field at 30,000 plants/ha
that is perfectly healthy and a field at 55,000 plants/ha that is nitrogen-deficient can
return a similar canopy signal. Without a population denominator, the score has no way to
attribute the shortfall — and worse, the recommended action diverges completely:

- Thin, healthy stand → **do not** apply more N; you'd be feeding a canopy that can't use
  it. The ceiling is set; manage for grain fill and don't over-invest.
- Full stand, N-deficient → **top-dress immediately**; this is recoverable and urgent.

Today `compute_score` receives no population input, so on a thin stand the engine will tend
to read low vigour and — following the generic logic — nudge toward nutrition. That is
advice that costs the farmer money on input they cannot convert. Capturing establishment
doesn't just add a feature; **it disambiguates the signal we already have.**

This also compounds: NDVI saturates at high biomass, so the confound is worst early in the
season, which is exactly when the intervention window is still open.

### 2.5 What "AI agronomist in your pocket" should mean here

Three moments, none of which exist today:

**(a) Before planting — prescribe.** We know polygon → natural region, variety, soil
profile, and rainfall outlook. We can compute a target population and translate it into the
only units that matter in the field:

> *"For SC 727 on your sandy soil in Natural Region IIb, target 44,000 plants/ha.
> That's 90 cm rows with a plant every 25 cm — about 4 paces of your row should hold
> 16 plants. Plant 2 seeds per station and thin at V3."*

Note the register: not "44,000 plants/ha" alone, which is unactionable holding a hoe, but
**row spacing, in-row spacing, and a countable field check**. This is the difference between
information and advice.

**(b) At emergence — verify.** A stand count is the highest-information, lowest-effort
measurement in the entire season, and farmers already know the method (count plants in a
row length representing 1/1000th of a hectare). This is a 60-second guided task. And the
vision pipeline already exists — `VisionAnalyzer` currently only looks for disease, pest and
nutrient symptoms. **The same photo could return stand count, gap distribution, and spacing
uniformity.** That is a large capability sitting one prompt away.

**(c) Immediately after — decide, while it's still reversible.** Replant / gap-fill /
accept, with the economics attached (seed cost + lost days vs. projected gain), and the
projection revised so the rest of the season is honest about its ceiling.

---

## 3. Other growth-cycle gaps, in season order

### 3.1 Rotation history is captured nowhere — but the knowledge base depends on it

This one is almost free and is currently blocked only by a missing field.

The crop profiles model residue-borne inoculum in detail. `maize.py` on Grey Leaf Spot:
*"Worse under continuous maize or minimum tillage (residue inoculum)"*, with cultural
controls *"Rotate with soybean, groundnut, or sunflower (non-host)"* and *"Bury crop residue
by ploughing (reduces inoculum 60-80%)"*. Diplodia Ear Rot carries the same logic.

We cannot use any of it, because **we never ask what was in the field last season.** A
single `previous_crop` field would let `assess_disease_risk` differentiate a
third-consecutive-maize field (high GLS/Diplodia inoculum, warrants preventive fungicide at
V10–VT and a susceptible-variety warning) from a field following soybean (low risk, skip the
spray). That is a real money decision — a fungicide pass is a meaningful cost — and we
currently have to stay silent on it despite having the agronomy written down.

Same argument for `tillage_practice` (conventional vs minimum till changes residue inoculum
directly) and whether a soil test exists.

### 3.2 Nothing in the UI expresses that a window is closing

This is the deepest *UX* gap, as distinct from a data gap.

Several of the highest-cost mistakes in the season are **time-boxed and irreversible**:

- **Weed competition.** The critical period is roughly **4–6 weeks after emergence**;
  competition in that window causes *irreversible* yield loss. Iowa State quantifies the
  slope: weeds at 4″ → 2% loss; at 6″ → 6%; at 12″ → **22%**. Weeding a week late is not
  "a late task", it is a permanent yield deduction that grows nonlinearly.
- **Nitrogen leaching on Zimbabwe sandy soils.** A Springer study on Zimbabwean sandy loam
  found nitrate concentrations dropping rapidly within three weeks of planting, with
  **29–40 kg N/ha leached from the top 40 cm within two weeks** under heavy rainfall. So
  "top-dress before the rain" and "top-dress after the rain" are completely different
  outcomes, and split application is not a refinement — it is the difference between the
  fertiliser reaching the crop or the water table.
- **Emergence uniformity** (§2.3) — assessed in a ~2 week window or not at all.

Our UI treats all of this as a flat to-do list. `CropPlan` renders `next_actions[]` as
undifferentiated strings with an "Add to Tasks" button; `generate_overdue_alerts` fires a
generic overdue notice. Nothing conveys **"this closes in 5 days and cannot be recovered
after that,"** and nothing conveys the **cost of missing it**.

A farmer with 40 things to do does not need a longer list. They need to know which three
things are irreversible this week. That's the product.

Concretely, plan items want: a **window** (opens/closes), an **irreversibility flag**, and a
**quantified cost of missing** ("~0.4 t/ha"). The agronomy to populate this already exists
in the crop profiles — `GrowthStageRequirements` already has `day_range`, `key_activities`
and `risks` per stage. The data model for a *deadline with consequences* is what's missing.

### 3.3 We ask whether a task was ticked, not whether it was done right

`farm_tasks` records completion. It does not record execution quality. "Top-dressed" covers
both a correct split application of AN banded and incorporated before rain, and a broadcast
onto dry soil at midday that volatilised. Same tick, very different season.

Since we already run a calibration loop against actual harvest, capturing *rate, method,
timing relative to rain, and product* on the few highest-leverage operations would turn our
outcome data from "what happened" into "what worked" — and that is the asset that compounds
across seasons and across the grower base. It is also what makes the eventual advice
defensibly ours rather than generic.

### 3.4 The season ends in the app exactly where a third of the loss begins

`outcome_routes.create_harvest` closes the loop for the *model*. For the *farmer*, harvest
is the start of the risk period, not the end.

- Developing-country storage losses run **20–30%**, mostly to post-harvest pests
  (FAO/PMC literature).
- In Zimbabwe the named threats are **larger grain borer (*Prostephanus truncatus*)** and
  **maize weevil (*Sitophilus zeamais*)**, with LGB explicitly more damaging in
  small-scale/on-farm storage.
- The controlling variable is precise and checkable: **dry to 12.5% moisture** (12–13% for
  fumigants like Phostoxin to work).
- Zimbabwe drying losses on raised platforms alone: **~4.5%**.

A farmer can execute a flawless season and lose a quarter of it in the shed. We have
`post_harvest_notes`, `harvest_moisture` and `storage_conditions` **already sitting in every
`CropProfile` dataclass** — and no surface renders them. Extending the timeline past
harvest into a drying-and-storage phase is mostly a UI exercise over knowledge we've already
written.

There's a commercial angle too: the FAO literature notes smallholders are *forced to sell
immediately after harvest* for lack of storage — into the price trough. Storage guidance is
also market-timing advice, and we already have `market_service.py`.

### 3.5 Persona is captured and then ignored

Onboarding collects a persona (`farmer` / `smallholder` / `agronomist` / `hobbyist`) and
writes it to `profiles.persona`. `RoleGuard` branches on **role** (consumer/institutional/
admin) — but nothing branches on **persona**.

A smallholder with 0.8 ha and a hoe and a commercial farmer with 400 ha and a planter get
an identical experience. They differ on nearly everything that matters: units (a hoe-width
and paces vs. GPS and metres), input access, whether "calibrate your planter" is even a
coherent instruction, literacy and language, data cost sensitivity, and whether advice
should be per-field or per-plot.

We're asking the question and discarding the answer. Either use it or drop it from
onboarding — asking a question you ignore is a small trust cost at the exact moment you're
establishing trust.

### 3.6 Trust and abandonment — what the literature says kills apps like ours

Directly relevant to retention, from the digital-advisory research (Springer, ScienceDirect,
Frontiers, PMC):

- **Generic advice is the top abandonment driver.** Platforms *"lack the capacity to respond
  in conversational, nuanced, and farmer-specific ways, replicating inefficiencies"* rather
  than delivering real extension.
- **Unclear presentation and omitted detail** cause confusion → frustration → abandonment.
- **Fragmentation loses users; integration retains them** — combined-service platforms show
  higher retention.
- **Trust is the foundation of sustained use**, and most models need *human* contact
  alongside the digital to build it.

Read against our product: our specificity is a genuine moat — variety-level susceptibility
and Zimbabwe natural regions are exactly the "farmer-specific" the literature says is
missing elsewhere. **But that specificity is trapped in the backend.** The knowledge depth in
`crop_profiles/` far exceeds what any screen currently shows. The gap isn't knowledge, it's
surfacing.

The forum voice reinforces the trust point from the other side: *"maybe if they sell seed."*
Farmers discount advice from anyone with a stake in the recommendation. Being visibly
neutral — and showing our reasoning and confidence rather than asserting — is worth real
retention.

One more, on the "show your working" point: we already compute confidence bands and
`data_completeness`. Surfacing *"I'm 60% confident because I have no soil test and no stand
count — add those and I can tighten this"* does two jobs at once. It builds the trust the
literature says is decisive, and it makes the farmer *want* to give us the data we need for
everything in §2. Honest uncertainty is a data-collection strategy.

---

## 4. Recommendations, ranked by (yield impact × feasibility)

### Tier 1 — do these first

**1. Establishment capture + the Stand Check.**
Add establishment fields to the schema (row spacing, in-row spacing, target population,
seed rate, planting depth, emergence date). Prescribe target population pre-plant from
region + variety + soil + rainfall outlook, expressed in paces and plant counts, not just
plants/ha. Then a guided **Stand Check** task at 10–14 days after emergence: count a
measured row length, get actual vs. target, and a replant/gap-fill/accept decision with
economics. Feed population into `compute_score` so the thin-stand vs. stressed-stand
ambiguity (§2.4) resolves. *This is the flagship.*

**2. `previous_crop` + `tillage_practice` on the field.**
Two columns and a form field. Unlocks residue-inoculum disease risk that the crop profiles
already encode in full detail (§3.1). Highest ratio of value to effort in this document.

**3. Windows, not to-dos.**
Give plan items `window_opens`, `window_closes`, `irreversible`, and `cost_of_missing`.
Render the closing ones distinctly and rank the whole plan by irreversible-cost-per-day
rather than by date. Populate from the `GrowthStageRequirements` data we already have.

### Tier 2 — high value, moderate effort

**4. Extend `VisionAnalyzer` to establishment.** Stand count, gap distribution and spacing
uniformity from a photo, reusing the existing pipeline. Would need field validation against
manual counts before we trust it in the score — start it as an assist to the manual count,
not a replacement.

**5. Post-harvest phase.** Drying-to-12.5% guidance, LGB/weevil storage protection, and
sell-vs-store framing against `market_service`. Renders `harvest_moisture`,
`storage_conditions` and `post_harvest_notes` already present in every crop profile.

**6. Execution quality on the top ~5 operations.** Rate, method, product, and timing
relative to rain — not just a completion tick. Feeds the calibration loop (§3.3).

**7. Surface confidence and data gaps as a farmer-facing invitation** (§3.6 close).

### Tier 3 — strategic

**8. Make persona actually branch the experience** (§3.5), starting with units and
instruction register for smallholder vs. commercial.

**9. Season retrospective with yield-gap attribution.** *"You harvested 4.2 t/ha against a
6.1 t/ha potential. Thin stand at establishment: −0.9. Top-dress 12 days late into a dry
spell: −0.6. GLS reaching the ear leaf: −0.4."* This is the artefact that makes a farmer
renew, and it is only possible if Tier 1 lands — you cannot attribute to establishment if
you never measured it.

---

## 5. The through-line

The pattern across almost every gap above is the same, and it's a good problem to have:

**The agronomic knowledge is already in the repository. The data capture and the interface
haven't caught up with it.** We know that continuous maize raises GLS risk but don't ask
what grew there last year. We tell farmers to check plant population but never record it.
We store `harvest_moisture` on every crop profile and never show it. We compute confidence
and don't explain it.

The highest-value work is not more agronomy. It is **capturing the handful of farmer-known
facts that unlock the agronomy we already have**, and **reshaping the plan UI from a list of
tasks into a sequence of closing windows with consequences attached.**

And of those facts, establishment is first — because it is decided in week one, it is
invisible to our satellites, it is unrecoverable by week three, and it silently corrupts the
score for the rest of the season if we don't know it.

---

## Sources

Farmer forum voice:
- [NewAgTalk — Corn population and replanting](https://talk.newagtalk.com/forums/thread-view.asp?tid=635205&DisplayType=flat&setCookie=1)
- [NewAgTalk — Soybean replant decision: what stand count justifies it?](https://talk.newagtalk.com/forums/thread-view.asp?tid=479496&DisplayType=flat&setCookie=1)

Establishment & stand agronomy:
- [University of Wisconsin — Uneven Corn Stands](https://corn.agronomy.wisc.edu/WCM/W104.aspx)
- [Purdue — Don't Let The Planter Hold Back Your Corn Yields](https://www.agry.purdue.edu/ext/corn/news/articles.95/p&c9501.htm)
- [University of Missouri Extension G4091 — replanting decisions](https://extension.missouri.edu/g4091)
- [Cornell CCA — Considerations in Replanting Decisions](https://courses2.cit.cornell.edu/cca/crop/CA6)
- [Plant Population and Row Spacing Affects Growth and Yield of Rainfed Maize in Semi-arid Environments](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9214209/)

Zimbabwe / regional agronomy:
- [Seed Co — 11 Keys to Achieve 11 Tonnes/Ha Maize](https://seedcogroup.com/insights/11-keys-to-achieve-11-ton-ha-maize/)
- [Seed Co Maize Growers Guide (PDF)](https://seedcogroup.com/zm/fieldcrops/wp-content/uploads/2021/09/Maize-Growers-Guide_Seed-Co-Zambia-with-logo.pdf)
- [murimi.co.zw — Maize Production](https://murimi.co.zw/maize/)
- [FAO — Fertilizer use by crop in Zimbabwe](https://www.fao.org/4/a0395e/a0395e0a.htm)
- [Mineral N dynamics, leaching and nitrous oxide losses under maize on a sandy loam soil in Zimbabwe](https://link.springer.com/article/10.1023/B:PLSO.0000020977.28048.fd)

Weed competition:
- [Iowa State — Critical periods of competition in corn](https://crops.extension.iastate.edu/encyclopedia/critical-periods-competition-corn)
- [Iowa State — Early-season weed competition](https://crops.extension.iastate.edu/encyclopedia/early-season-weed-competition)

Yield gaps & smallholder systems:
- [PNAS — Crop yields fail to rise in smallholder farming systems in sub-Saharan Africa](https://www.pnas.org/doi/10.1073/pnas.2312519121)
- [PLOS One — Narrowing yield gaps does not guarantee a living income](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0283499)
- [Closing system-wide yield gaps among mixed crop–livestock smallholders in Sub-Saharan Africa](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4767044/)

Digital advisory adoption & abandonment:
- [Springer — Digital agro-advisory tools in the global south: a behavioural analysis](https://link.springer.com/article/10.1007/s44279-025-00190-y)
- [ScienceDirect — Not-so-digital platforms? Non-use and offline dimensions of digital agricultural services](https://www.sciencedirect.com/science/article/pii/S0743016726002123)
- [PMC — How have smallholder farmers used digital extension tools?](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8907870/)
- [Frontiers — Challenges and opportunities in smallholder agriculture digitization](https://www.frontiersin.org/journals/sustainable-food-systems/articles/10.3389/fsufs.2025.1583224/full)
- [Gatsby Africa — A landscape study of digital advisory models for smallholders (PDF)](https://www.gatsbyafrica.org.uk/app/uploads/2023/01/gatsbyafrica-digitally-enabled-agriculture-april-2022-003.pdf)

Post-harvest:
- [PMC — Reducing Postharvest Losses during Storage of Grain Crops](https://pmc.ncbi.nlm.nih.gov/articles/PMC5296677/)
- [The Standard (Zimbabwe) — Minimising post-harvest losses in stored grain](https://www.thestandard.co.zw/2017/07/30/minimising-post-harvest-losses-stored-grain/)
- [Springer — Determinants of postharvest losses along smallholder maize and sweetpotato value chains](https://link.springer.com/article/10.1007/s12571-019-00949-4)
- [FAO/IITA — On-Farm Comparison of Different Maize Postharvest Storage (PDF)](https://www.fao.org/fileadmin/user_upload/food-loss-reduction/Helvetas_material/GPLP-IITA_Report_On-Farm_Trial_-_final_version.pdf)
