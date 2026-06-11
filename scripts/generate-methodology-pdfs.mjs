/**
 * Generates the KurimaSense methodology briefs as print-quality, brand-matched
 * PDFs into /public/methodology.
 *
 * Why a script: the briefs are content + brand assets, not app code. We render
 * branded HTML to PDF with headless Chromium (Playwright), embedding the real
 * brand fonts (Fraunces + Hanken Grotesk) so the output matches the site
 * exactly and needs no network at view time.
 *
 * Run:  node scripts/generate-methodology-pdfs.mjs
 * (requires `playwright` + its Chromium; install with
 *  `npm i -D playwright && npx playwright install chromium`)
 *
 * Honesty note: KurimaSense is early-stage. These briefs deliberately avoid
 * invented metrics, named clients, or scale claims. Keep it that way.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'methodology');

// Brand fonts — latin subsets fetched by next/font (mapped from built CSS).
const FRAUNCES = join(ROOT, '.next/static/media/af4bf8399d1aacdf-s.p.woff2');
const HANKEN = join(ROOT, '.next/static/media/313510e2713fb214-s.p.woff2');

function b64(path) {
    if (!existsSync(path)) {
        console.warn(`! font missing, falling back to system fonts: ${path}`);
        return null;
    }
    return readFileSync(path).toString('base64');
}

const frauncesB64 = b64(FRAUNCES);
const hankenB64 = b64(HANKEN);

const fontFaces = `
${frauncesB64 ? `@font-face{font-family:'Fraunces';src:url(data:font/woff2;base64,${frauncesB64}) format('woff2');font-weight:100 900;font-style:normal;font-display:block;}` : ''}
${hankenB64 ? `@font-face{font-family:'Hanken Grotesk';src:url(data:font/woff2;base64,${hankenB64}) format('woff2');font-weight:100 900;font-style:normal;font-display:block;}` : ''}
`;

const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";
const SANS = "'Hanken Grotesk', system-ui, -apple-system, Arial, sans-serif";

// ── Brand palette ───────────────────────────────────────────────────────────
const C = {
    loam: '#0E1A14',
    loamSoft: '#16271E',
    line: 'rgba(255,255,255,0.12)',
    oat: '#F4F1ED',
    oatDim: '#ECE7DE',
    text: '#2D3A30',
    muted: '#6B7A6E',
    green: '#0FB885',
    greenBright: '#2DD4A7',
    clay: '#C8A98A',
    border: '#E0DDD8',
};

const CONTOUR = `<svg xmlns='http://www.w3.org/2000/svg' width='900' height='900' viewBox='0 0 900 900' fill='none'><g stroke='%23ffffff' stroke-width='1' fill='none'><path d='M-50 220 C 120 120, 300 300, 470 200 S 760 60, 980 180'/><path d='M-50 300 C 130 210, 310 380, 480 290 S 770 160, 980 270'/><path d='M-50 390 C 140 310, 320 470, 500 390 S 780 270, 980 370'/><path d='M-50 490 C 150 420, 330 570, 520 500 S 800 390, 980 480'/><path d='M-50 600 C 160 540, 350 680, 540 620 S 820 520, 980 600'/><path d='M-50 720 C 170 670, 360 800, 560 750 S 840 660, 980 730'/></g></svg>`;
const contourBg = `url("data:image/svg+xml,${CONTOUR}")`;

// ── Reusable content blocks ──────────────────────────────────────────────────
const principles = [
    ['Explainability over prediction', 'Every output traces back to the inputs that produced it. We would rather show our work than ask for blind trust.'],
    ['Determinism over hand-waving', 'Where a number is uncertain, we say so — and quantify it — rather than presenting a single confident figure.'],
    ['Trust over novelty', 'We do not ship claims we cannot defend. Confidence and humility read as more credible than bravado.'],
    ['Calm over urgency', 'Decisions about harvests, credit, and cover are made over seasons, not seconds. The product is built to match.'],
];

const dataSources = [
    ['Satellite — optical', 'Open Sentinel-2 and Landsat surface reflectance for NDVI and related vegetation indices, at field resolution.'],
    ['Satellite — radar', 'Sentinel-1 C-band radar for cloud-resilient observation and soil-moisture proxies during the rainy season.'],
    ['Weather', 'Reanalysis and forecast data for rainfall, temperature, and evapotranspiration, compared against multi-year normals.'],
    ['Ground truth', 'Field boundaries, planting dates, crop, and variety logged by farmers and agronomists on the KurimaSense platform.'],
    ['Agronomic priors', 'Local crop calendars, Natural Region characteristics, and prior-season outcomes used to anchor the models.'],
];

const confidenceSteps = [
    ['Ingest', 'Per-field and per-zone signals are assembled from satellite, weather, and ground-truth sources.'],
    ['Calibrate', 'Signals are tuned to the specific Natural Region, crop, and variety — not a generic global baseline.'],
    ['Score', 'Each output is paired with a confidence band derived from how strongly the inputs agree and how complete the data coverage is. Thin or conflicting data widens the band — visibly.'],
];

// Audience-specific deliverable section.
const deliverables = {
    general: {
        title: 'Methodology Brief',
        audience: 'Platform overview',
        intro:
            'KurimaSense turns satellite and ground-truth data into agricultural intelligence calibrated for Zimbabwe — delivered with an explicit confidence score on every number. This brief explains where the data comes from, how it is calibrated, and how to read what we produce.',
        deliverableTitle: 'What we produce',
        deliverable: [
            ['Pre-harvest yield forecasts', 'Growing-zone yield estimates with confidence bands, for buyers, processors, and grain marketers.'],
            ['Field-level risk scoring', 'Default-probability signals for smallholder agricultural lending, explainable down to the input.'],
            ['Parametric insurance triggers', 'Index-based triggers and independent verification for automated payouts and reduced basis risk.'],
            ['The farmer data layer', 'Field monitoring and an AI agronomist for farmers — the validated ground truth the platform is built on.'],
        ],
    },
    buyers: {
        title: 'Yield Forecasting',
        audience: 'For agricultural buyers',
        intro:
            'Pre-harvest yield intelligence for buyers, processors, and grain marketers sourcing across Zimbabwe and Southern Africa. This brief explains how our forecasts are produced and how to read their confidence.',
        deliverableTitle: 'The deliverable',
        deliverable: [
            ['Growing-zone yield forecasts', 'Yield estimates broken down to growing zones within districts, updated through the season.'],
            ['Confidence bands', 'Every forecast carries an explicit range, so you can price contracts and plan procurement against a defensible number.'],
            ['Seasonal briefings', 'Written commentary on the key risks and supply signals behind the numbers.'],
            ['Integration', 'Higher tiers include API access for direct integration with procurement, ERP, or BI systems.'],
        ],
    },
    lenders: {
        title: 'Risk Scoring',
        audience: 'For lenders',
        intro:
            'Field-level risk intelligence for institutions lending to smallholder agriculture. This brief explains how risk signals are produced, calibrated, and made explainable for credit decisions.',
        deliverableTitle: 'The deliverable',
        deliverable: [
            ['Field-level risk scores', 'Default-probability signals grounded in satellite history and ground truth, at the level of the financed field.'],
            ['Explainable drivers', 'Each score is decomposed into its contributing factors — vegetation trend, rainfall deficit, growth stage — not a black box.'],
            ['Portfolio view', 'Scores roll up to portfolio-level exposure across regions and crops.'],
            ['Confidence bands', 'Where data is thin, the score says so, so it can be weighted accordingly in underwriting.'],
        ],
    },
    insurers: {
        title: 'Parametric Insurance',
        audience: 'For insurers',
        intro:
            'Index-based crop insurance intelligence for insurers and reinsurers. This brief explains how triggers are constructed, verified, and calibrated to reduce basis risk.',
        deliverableTitle: 'The deliverable',
        deliverable: [
            ['Index triggers', 'Vegetation- and weather-based indices designed to track on-the-ground loss for the insured crop and region.'],
            ['Independent verification', 'Satellite-based verification of trigger events for automated, disputable-free payouts.'],
            ['Basis-risk attention', 'Calibration against local ground truth aimed at keeping the index aligned with actual outcomes.'],
            ['Production data feed', 'A production index data feed during the growing season for monitoring and settlement.'],
        ],
    },
};

function block(title, rows) {
    return `
    <section class="block">
      <h2>${title}</h2>
      <div class="rows">
        ${rows
            .map(
                ([h, b]) => `<div class="row"><div class="row-h">${h}</div><div class="row-b">${b}</div></div>`,
            )
            .join('')}
      </div>
    </section>`;
}

function buildHtml(key) {
    const d = deliverables[key];
    const today = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
    return `<!doctype html><html><head><meta charset="utf-8"><style>
    ${fontFaces}
    *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    @page{size:A4;margin:0;}
    html,body{font-family:${SANS};color:${C.text};}
    .sheet{width:210mm;min-height:297mm;position:relative;overflow:hidden;break-after:page;}
    .sheet:last-child{break-after:auto;}

    /* Cover */
    .cover{background:${C.loam};color:${C.oat};padding:26mm 22mm;display:flex;flex-direction:column;height:297mm;}
    .cover-bg{position:absolute;inset:0;background-image:${contourBg};background-size:200mm auto;background-repeat:no-repeat;background-position:right -30mm top 40mm;opacity:0.10;}
    .cover-glow{position:absolute;top:-60mm;right:-50mm;width:180mm;height:180mm;border-radius:50%;background:radial-gradient(closest-side, rgba(45,212,167,0.16), transparent);}
    .brand{position:relative;display:flex;align-items:center;gap:9px;font-family:${SERIF};font-weight:700;font-size:19pt;letter-spacing:-0.01em;}
    .brand .dot{width:13px;height:13px;border-radius:4px;background:${C.green};display:inline-block;}
    .cover-mid{position:relative;margin-top:auto;}
    .eyebrow{font-size:9.5pt;font-weight:700;letter-spacing:0.26em;text-transform:uppercase;color:${C.greenBright};margin-bottom:10mm;}
    .cover h1{font-family:${SERIF};font-weight:500;font-size:46pt;line-height:1.03;letter-spacing:-0.015em;color:#F8F6F1;margin-bottom:7mm;}
    .cover h1 em{font-style:italic;color:${C.greenBright};}
    .cover .sub{font-size:12.5pt;line-height:1.55;color:rgba(244,241,237,0.66);max-width:140mm;}
    .cover-foot{position:relative;margin-top:14mm;padding-top:6mm;border-top:1px solid ${C.line};display:flex;justify-content:space-between;font-size:8.5pt;letter-spacing:0.04em;color:rgba(244,241,237,0.5);text-transform:uppercase;}

    /* Content */
    .content{background:${C.oat};padding:20mm 22mm 24mm;}
    .runhead{display:flex;justify-content:space-between;align-items:center;padding-bottom:5mm;margin-bottom:12mm;border-bottom:1px solid ${C.border};font-size:8.5pt;letter-spacing:0.14em;text-transform:uppercase;color:${C.muted};font-weight:600;}
    .runhead .rh-brand{font-family:${SERIF};font-weight:700;letter-spacing:0;text-transform:none;font-size:11pt;color:${C.text};}
    .lede{font-size:13pt;line-height:1.6;color:${C.text};max-width:150mm;margin-bottom:13mm;}
    .lede b{color:${C.green};font-weight:600;}
    .block{margin-bottom:12mm;break-inside:avoid;}
    .block h2{font-family:${SERIF};font-weight:600;font-size:17pt;letter-spacing:-0.01em;color:${C.text};margin-bottom:6mm;padding-left:5mm;border-left:3px solid ${C.green};}
    .rows{display:flex;flex-direction:column;gap:0;}
    .row{display:grid;grid-template-columns:54mm 1fr;gap:8mm;padding:4.5mm 0;border-top:1px solid ${C.border};break-inside:avoid;}
    .row:first-child{border-top:none;}
    .row-h{font-weight:700;font-size:10.5pt;color:${C.text};}
    .row-b{font-size:10.5pt;line-height:1.55;color:${C.muted};}

    .principles{display:grid;grid-template-columns:1fr 1fr;gap:6mm;}
    .principle{background:#fff;border:1px solid ${C.border};border-radius:5mm;padding:7mm;break-inside:avoid;}
    .principle h3{font-family:${SERIF};font-weight:600;font-size:12.5pt;color:${C.text};margin-bottom:3mm;}
    .principle p{font-size:10pt;line-height:1.55;color:${C.muted};}

    .steps{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5mm;}
    .step{background:${C.loam};color:${C.oat};border-radius:5mm;padding:7mm;break-inside:avoid;}
    .step .n{font-family:${SERIF};font-size:11pt;color:${C.greenBright};font-weight:700;margin-bottom:4mm;}
    .step h3{font-family:${SERIF};font-weight:600;font-size:13pt;color:#F8F6F1;margin-bottom:3mm;}
    .step p{font-size:9.5pt;line-height:1.5;color:rgba(244,241,237,0.62);}

    .callout{background:${C.loamSoft};color:${C.oat};border-radius:6mm;padding:9mm;margin-bottom:12mm;break-inside:avoid;}
    .callout h2{color:#F8F6F1;border-left-color:${C.greenBright};}
    .callout .row{border-top-color:${C.line};}
    .callout .row-h{color:#F8F6F1;}
    .callout .row-b{color:rgba(244,241,237,0.66);}

    .limits{background:#fff;border:1px solid ${C.border};border-radius:5mm;padding:8mm;}
    .limits li{list-style:none;font-size:10pt;line-height:1.6;color:${C.muted};padding-left:7mm;position:relative;margin-bottom:2mm;}
    .limits li:before{content:'';position:absolute;left:0;top:3mm;width:3mm;height:3mm;border-radius:50%;background:${C.clay};}

    .contact{background:${C.loam};color:${C.oat};border-radius:6mm;padding:10mm;display:flex;justify-content:space-between;align-items:center;gap:8mm;}
    .contact h2{font-family:${SERIF};font-weight:500;font-size:18pt;color:#F8F6F1;border:none;padding:0;margin-bottom:3mm;}
    .contact p{font-size:10.5pt;color:rgba(244,241,237,0.66);line-height:1.5;}
    .contact .cta{background:${C.green};color:#06140E;font-weight:700;font-size:11pt;padding:5mm 8mm;border-radius:99px;white-space:nowrap;}
    .footnote{margin-top:10mm;font-size:8.5pt;color:${C.muted};line-height:1.5;}
  </style></head><body>

  <div class="sheet cover">
    <div class="cover-bg"></div><div class="cover-glow"></div>
    <div class="brand"><span class="dot"></span>KurimaSense</div>
    <div class="cover-mid">
      <div class="eyebrow">Methodology Brief · ${d.audience}</div>
      <h1>${d.title}<br>you can <em>explain</em>.</h1>
      <p class="sub">${d.intro}</p>
    </div>
    <div class="cover-foot"><span>Agricultural intelligence · Zimbabwe</span><span>${today}</span></div>
  </div>

  <div class="sheet content">
    <div class="runhead"><span class="rh-brand">KurimaSense</span><span>${d.audience} · Methodology</span></div>

    <p class="lede">We would rather show our work than ask for your trust. This brief sets out the <b>data, calibration, and confidence scoring</b> behind every number we produce — at a credible level of detail, without disclosing proprietary specifics.</p>

    <section class="block">
      <h2>Principles</h2>
      <div class="principles">
        ${principles.map(([h, b]) => `<div class="principle"><h3>${h}</h3><p>${b}</p></div>`).join('')}
      </div>
    </section>

    ${block('Data sources & provenance', dataSources)}
  </div>

  <div class="sheet content">
    <div class="runhead"><span class="rh-brand">KurimaSense</span><span>${d.audience} · Methodology</span></div>

    <section class="block">
      <h2>How confidence scores are earned</h2>
      <div class="steps">
        ${confidenceSteps.map(([h, b], i) => `<div class="step"><div class="n">0${i + 1}</div><h3>${h}</h3><p>${b}</p></div>`).join('')}
      </div>
    </section>

    <section class="block">
      <h2>Calibrated for Zimbabwe</h2>
      <p class="lede" style="margin-bottom:0">Global agtech platforms are built on American maize and Brazilian soya datasets. They do not know what Compound D is, cannot tell Natural Region II from Natural Region IV, and have effectively no training data for tobacco. KurimaSense is calibrated to the Natural Regions and to local crops — tobacco, maize, cotton, soya — using local agronomic priors and prior-season outcomes.</p>
    </section>

    <div class="callout">
      ${block(d.deliverableTitle, d.deliverable).replace('<section class="block">', '').replace('</section>', '')}
    </div>

    <section class="block">
      <h2>Limitations &amp; maturity</h2>
      <ul class="limits">
        <li>Outputs are labelled estimates with confidence bands — not guarantees. Results vary with weather, pests, and management.</li>
        <li>KurimaSense is early-stage. Where ground-truth coverage is thin, the confidence score reflects it rather than hiding it.</li>
        <li>Forecasts are versioned: any number can be traced back to the inputs and model version that produced it.</li>
        <li>Field and account data is access-controlled and is not sold to third parties.</li>
      </ul>
    </section>

    <div class="contact">
      <div>
        <h2>Book a briefing</h2>
        <p>Message us on WhatsApp at +263 78 377 1054 and we will walk you through the methodology and your use case directly.</p>
      </div>
      <div class="cta">WhatsApp · +263 78 377 1054</div>
    </div>
    <p class="footnote">© ${new Date().getFullYear()} KurimaSense. This brief is for evaluation purposes and describes methodology at a non-proprietary level. Figures shown anywhere in product demonstrations are illustrative sample data, not client results.</p>
  </div>

  </body></html>`;
}

export { buildHtml };

const TARGETS = [
    ['general', 'methodology-brief.pdf'],
    ['buyers', 'buyers-methodology.pdf'],
    ['lenders', 'lenders-methodology.pdf'],
    ['insurers', 'insurers-methodology.pdf'],
];

// ── Render (only when run directly, not when imported for verification) ───────
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    for (const [key, file] of TARGETS) {
        await page.setContent(buildHtml(key), { waitUntil: 'networkidle' });
        await page.emulateMedia({ media: 'print' });
        const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
        writeFileSync(join(OUT, file), pdf);
        console.log(`✓ ${file} (${(pdf.length / 1024).toFixed(0)} KB)`);
    }
    await browser.close();
    console.log('Done.');
}
