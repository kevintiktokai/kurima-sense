import type { Metadata } from "next";

import Navbar from "@/components/landing/Navbar";
import { WHATSAPP_BRIEFING_URL } from "@/lib/contact";
import Footer from "@/components/landing/Footer";
import InstitutionalHero from "@/components/institutional/InstitutionalHero";
import ProblemStatement from "@/components/institutional/ProblemStatement";
import SectionBlock from "@/components/institutional/SectionBlock";
import PricingTiers from "@/components/institutional/PricingTiers";
import HowItWorksSteps from "@/components/institutional/HowItWorksSteps";
import DeliverablesList from "@/components/institutional/DeliverablesList";
import MethodologyDownload from "@/components/institutional/MethodologyDownload";
import FAQAccordion from "@/components/institutional/FAQAccordion";
import InstitutionalCTA from "@/components/institutional/InstitutionalCTA";

export const metadata: Metadata = {
    title: "Pre-Harvest Yield Intelligence for African Agricultural Buyers | KurimaSense",
    description:
        "District-level yield forecasts 6-8 weeks before harvest, calibrated for tobacco, maize, cotton, and soya across Zimbabwe.",
    openGraph: {
        title: "Pre-Harvest Yield Intelligence for African Agricultural Buyers",
        description:
            "District-level yield forecasts 6-8 weeks before harvest, calibrated for tobacco, maize, cotton, and soya across Zimbabwe.",
        images: ["/og/for-buyers.png"],
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Pre-Harvest Yield Intelligence for African Agricultural Buyers",
        description:
            "District-level yield forecasts 6-8 weeks before harvest, calibrated for tobacco, maize, cotton, and soya across Zimbabwe.",
        images: ["/og/for-buyers.png"],
    },
};

export default function ForBuyersPage() {
    return (
        <main className="min-h-screen" style={{ backgroundColor: "var(--ee-bg)" }}>
            <Navbar variant="solid" />

            <InstitutionalHero
                headline="Know Your Harvest Before It Happens"
                subheadline="Pre-harvest yield intelligence for agricultural buyers, processors, and grain marketers operating across Zimbabwe and Southern Africa."
                primaryCTA={{
                    text: "Schedule a Demo",
                    href: WHATSAPP_BRIEFING_URL,
                }}
                secondaryCTA={{
                    text: "Download Methodology",
                    href: "/methodology/buyers-methodology.pdf",
                }}
                footerNote="Early access — now onboarding agricultural buyers and processors sourcing across Zimbabwe."
            />

            <ProblemStatement
                heading="Forward contracts are priced on guesswork. Logistics plans are built on hope."
                paragraphs={[
                    "Every season, your procurement team makes million-dollar decisions based on imperfect information. How much will arrive at the buying point? What's the quality going to look like? Which regions are underperforming?",
                    "Traditional sources — Agritex circulars, satellite imagery you have to interpret yourself, agronomist field visits — give you fragments. You're left filling in the gaps with experience and instinct.",
                    "A 5% improvement in your pre-harvest forecast translates to millions saved in forward contract pricing, storage allocation, and logistics planning.",
                ]}
            />

            <SectionBlock
                eyebrow="What We Provide"
                heading="District-level yield forecasts, delivered 6 to 8 weeks before harvest."
                body="KurimaSense aggregates field-level satellite data, ground truth from in-app farmer logs, weather, and our proprietary yield models — calibrated for Zimbabwe's five Natural Regions and the specific varieties grown locally — to produce buyer-ready forecasts."
                spacing="tight"
            />

            <PricingTiers
                tiers={[
                    {
                        name: "District Forecast",
                        headline: "Core",
                        description:
                            "Crop-level yield forecasts per district, refreshed weekly through the season. Built for early procurement planning.",
                        features: [
                            "District-level yield forecasts",
                            "Weekly updates during the growing season",
                            "Confidence band on every forecast",
                            "CSV / Excel export",
                            "Email support",
                        ],
                    },
                    {
                        name: "Zone Forecasts + Briefings",
                        headline: "Standard",
                        description:
                            "Forecasts broken down to growing zones within districts, plus monthly written briefings on the key risks and supply signals behind the numbers.",
                        features: [
                            "Everything in Core",
                            "Zone-level forecasts within districts",
                            "Monthly written supply briefings",
                            "API access for system integration",
                            "Anomaly alerts on critical regions",
                            "Priority support",
                        ],
                        highlighted: true,
                    },
                    {
                        name: "Custom Yield Models",
                        headline: "Enterprise",
                        description:
                            "Bespoke calibration and deeper modelling for your specific crops and varieties, backtested against your own records.",
                        features: [
                            "Everything in Standard",
                            "Custom crop & variety calibration",
                            "Custom yield prediction models",
                            "Historical forecast backtesting",
                            "Quarterly strategic reviews",
                            "Dedicated success manager",
                        ],
                    },
                ]}
            />

            <HowItWorksSteps
                heading="How it works"
                steps={[
                    {
                        title: "Coverage definition",
                        description:
                            "We map your sourcing geography — districts, wards, or growing zones — to our satellite-monitored field network. Custom areas of interest are included in the scope.",
                    },
                    {
                        title: "Multi-index satellite analysis",
                        description:
                            "We process Sentinel-2 optical imagery (NDVI, EVI, NDRE, NDMI, SAVI) and Sentinel-1 SAR backscatter (VV, VH) — cloud-resilient through Zimbabwe's rainy season. No single-index black boxes.",
                    },
                    {
                        title: "Ground truth integration",
                        description:
                            "Our farmer app, used by smallholders across your sourcing regions, captures planting dates, variety, fertilizer applications, and final harvest yields. This ground truth continuously calibrates our forecasts to local reality.",
                    },
                    {
                        title: "Yield model with Natural Region weighting",
                        description:
                            "Predictions are computed using crop- and variety-specific yield potentials, weighted by Zimbabwe's Natural Regions (I through V), corrected for water availability, input quality, and observed crop stress.",
                    },
                    {
                        title: "Confidence-scored delivery",
                        description:
                            "Every forecast comes with a confidence band — high, medium, low — so your team knows when to trust the number and when to add buffer.",
                    },
                ]}
            />

            <DeliverablesList
                heading="What you receive"
                items={[
                    "Live dashboard accessible to your procurement and operations teams",
                    "District- and zone-level forecasts with confidence intervals",
                    "Weekly automated updates throughout the growing season",
                    "Monthly written briefings (Standard and above)",
                    "Anomaly alerts when critical regions show stress",
                    "CSV/Excel export for integration with your existing tools",
                    "API access for direct system integration (Standard and above)",
                    "Quarterly strategic reviews with our team (Enterprise)",
                ]}
            />

            <SectionBlock
                heading="Why Zimbabwe-specific matters"
                body={`Global agtech platforms are built on American maize and Brazilian soya datasets. They don't know what Compound D is, can't tell Natural Region II from Natural Region IV, and have effectively zero training data for tobacco — a crop most global yield models ignore entirely.

KurimaSense was built in Harare, calibrated on Zimbabwe ground truth, and tested against actual harvest results from across the country's Natural Regions. Our tobacco-specific model is, to our knowledge, the only one of its kind in commercial deployment.`}
            />

            <MethodologyDownload
                heading="Read our methodology"
                description="We publish how KurimaSense computes yield forecasts, what indices we use, how confidence scoring works, and how we validate against ground truth. A 12-page technical brief, free to download."
                downloadHref="/methodology/buyers-methodology.pdf"
            />

            <FAQAccordion
                heading="Frequently asked"
                items={[
                    {
                        question: "How accurate are the forecasts?",
                        answer:
                            "Accuracy varies by crop, region, and growing stage. Rather than quote a single number, we provide confidence-scored predictions: high-confidence forecasts have tighter intervals; low-confidence forecasts make our uncertainty explicit. We share validation data per crop on request.",
                    },
                    {
                        question: "What if cloud cover blocks the satellites?",
                        answer:
                            "Our system uses Sentinel-1 SAR as a cloud-resilient backup. Even during Zimbabwe's rainy season (November to April), we maintain measurement continuity.",
                    },
                    {
                        question: "Can you cover crops we source from outside Zimbabwe?",
                        answer:
                            "Currently we operate across Zimbabwe with planned expansion to Zambia, Malawi, and Mozambique by 2027. Talk to us about your sourcing footprint.",
                    },
                    {
                        question: "How does this integrate with our existing systems?",
                        answer:
                            "Standard and above includes API access, allowing direct integration with your ERP, procurement, or BI platforms.",
                    },
                    {
                        question: "How are engagements structured and priced?",
                        answer:
                            "Engagements are annual and scoped to your crops, sourcing geography, and the depth of modelling you need. We'll walk through structure and pricing on a short briefing call — book one and we'll tailor it to you.",
                    },
                ]}
            />

            <InstitutionalCTA
                heading="Schedule a 30-minute demo"
                body="We'll show you a live yield forecast for one of your active sourcing districts."
                ctaText="Book a Demo"
                ctaHref={WHATSAPP_BRIEFING_URL}
            />

            <Footer />
        </main>
    );
}
