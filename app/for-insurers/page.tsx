import type { Metadata } from "next";

import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import InstitutionalHero from "@/components/institutional/InstitutionalHero";
import ProblemStatement from "@/components/institutional/ProblemStatement";
import SectionBlock from "@/components/institutional/SectionBlock";
import PricingTiers from "@/components/institutional/PricingTiers";
import HowItWorksSteps from "@/components/institutional/HowItWorksSteps";
import DeliverablesList from "@/components/institutional/DeliverablesList";
import MethodologyDownload from "@/components/institutional/MethodologyDownload";
import InstitutionalCTA from "@/components/institutional/InstitutionalCTA";

export const metadata: Metadata = {
    title: "Satellite-Backed Parametric Crop Insurance | KurimaSense",
    description:
        "Index-based crop insurance verification, automated claims triggers, and fraud reduction for African agricultural insurers.",
    openGraph: {
        title: "Satellite-Backed Parametric Crop Insurance",
        description:
            "Index-based crop insurance verification, automated claims triggers, and fraud reduction for African agricultural insurers.",
        images: ["/og/for-insurers.png"],
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Satellite-Backed Parametric Crop Insurance",
        description:
            "Index-based crop insurance verification, automated claims triggers, and fraud reduction for African agricultural insurers.",
        images: ["/og/for-insurers.png"],
    },
};

export default function ForInsurersPage() {
    return (
        <main className="min-h-screen" style={{ backgroundColor: "var(--ee-bg)" }}>
            <Navbar />

            <InstitutionalHero
                headline="Insurance That Pays Out Before the Farmer Asks"
                subheadline="Satellite-backed parametric crop insurance infrastructure for insurers, reinsurers, and donor-funded index insurance programs."
                primaryCTA={{
                    text: "Schedule Demo",
                    href: "https://calendly.com/kurimasense/demo",
                }}
                secondaryCTA={{
                    text: "Download Methodology",
                    href: "/methodology/insurers-methodology.pdf",
                }}
            />

            <ProblemStatement
                heading="Traditional crop insurance is broken for smallholders."
                paragraphs={[
                    "Claims adjustment is too expensive to underwrite. Adverse selection collapses risk pools. Moral hazard turns insurance into income transfer. Premiums become unaffordable. Farmers stop buying. Insurers exit the market.",
                    "Parametric insurance — where payouts trigger automatically based on measurable indices — solves these problems in principle. In practice, the indices have historically been too crude (rainfall stations are too sparse, regional triggers don't reflect field-level reality), the data infrastructure too fragmented, and the validation too contentious.",
                ]}
            />

            <SectionBlock
                eyebrow="What We Provide"
                heading="Production-grade index data and trigger infrastructure"
                body="KurimaSense supplies the satellite-derived indices, ground-truth validation, and trigger logic that make parametric crop insurance economically viable at smallholder scale."
                spacing="tight"
            />

            <PricingTiers
                tiers={[
                    {
                        name: "Index Data Service",
                        headline: "Core",
                        description:
                            "NDVI, NDMI, SAR backscatter, and custom composite indices delivered as time series per insured area or per field.",
                        priceFrom: "From $30,000 per year per product line",
                        features: [
                            "Daily indices during growing season",
                            "Per-area or per-field granularity",
                            "Historical baselines included",
                            "API access",
                            "Standard reporting",
                        ],
                    },
                    {
                        name: "Trigger Verification",
                        headline: "Standard",
                        description:
                            "Automated trigger verification with documented thresholds, audit trails, and dispute resolution data.",
                        priceFrom: "Add-on to Index Data Service",
                        features: [
                            "Everything in Core",
                            "Automated trigger verification",
                            "Full audit trail",
                            "Dispute resolution documentation",
                            "Reinsurance-grade reporting",
                        ],
                        highlighted: true,
                    },
                    {
                        name: "Custom Index Design",
                        headline: "Enterprise",
                        description:
                            "Engagement to design crop-specific or region-specific composite indices tailored to your products.",
                        priceFrom: "Project-based, pricing on conversation",
                        features: [
                            "Bespoke index design",
                            "Crop and region-specific calibration",
                            "Validation against historical loss data",
                            "Actuarial collaboration",
                            "Ongoing index maintenance",
                        ],
                    },
                ]}
            />

            <HowItWorksSteps
                heading="How it works"
                steps={[
                    {
                        title: "Define the insured product",
                        description:
                            "Together we specify what's insured — crop, region, growing window, peril (drought, flood, biomass loss). We translate that into measurable indices.",
                    },
                    {
                        title: "Establish baselines",
                        description:
                            "Historical satellite data establishes long-term baselines per crop per Natural Region — what does a normal season look like? What does a 1-in-10-year drought look like in measurable index terms?",
                    },
                    {
                        title: "Set triggers",
                        description:
                            "Triggers are set as deviations from baseline (e.g., NDMI below 20th percentile of historical record for the same period and location for 4 consecutive weeks). Triggers are transparent, mathematical, and auditable.",
                    },
                    {
                        title: "Live monitoring",
                        description:
                            "During the season, indices are tracked in real time. Insured parties and the insurer both have visibility.",
                    },
                    {
                        title: "Automated trigger and payout",
                        description:
                            "When triggers fire, payouts execute automatically per your terms. No claims process. No adjustment. No dispute about whether the loss occurred.",
                    },
                ]}
            />

            <DeliverablesList
                heading="What you receive"
                items={[
                    "Production index data feed (daily during growing season)",
                    "Trigger verification reports with full audit trail",
                    "Historical baselines per crop per region",
                    "Visualization layer for policyholders and your underwriting team",
                    "Reinsurance-grade documentation for risk transfer",
                    "Quarterly index performance reviews",
                ]}
            />

            <SectionBlock
                heading="Who uses this"
                body="Parametric crop insurance is one of the fastest-growing categories in African agricultural finance, driven by: African Risk Capacity (ARC) sovereign-level parametric programs; World Bank-supported smallholder index insurance pilots; donor-funded climate resilience programs requiring measurable trigger infrastructure; commercial insurers seeking scalable smallholder products; reinsurers requiring independent index verification."
            />

            <SectionBlock
                heading="Why composite indices reduce basis risk"
                body="Single-index parametric products (rainfall-only, or NDVI-only) suffer from basis risk — the gap between what the index measures and what the farmer actually experiences. KurimaSense's composite index approach, combining optical and SAR signals with ground-truth calibration, reduces basis risk substantially compared to traditional single-source approaches."
            />

            <MethodologyDownload
                heading="Read our methodology"
                description="Technical documentation covering basis risk, trigger design, historical baseline construction, and reinsurance-grade documentation."
                downloadHref="/methodology/insurers-methodology.pdf"
            />

            <InstitutionalCTA
                heading="Schedule a conversation"
                body="Bring your actuarial and product leads — we'll show you index performance for a region of your choosing."
                ctaText="Book a Conversation"
                ctaHref="https://calendly.com/kurimasense/demo"
            />

            <Footer />
        </main>
    );
}
