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
    title: "Smallholder Credit Risk Scoring for African Agricultural Lenders | KurimaSense",
    description:
        "Field-level risk scoring backed by satellite history, weather, soil, and ground-truth yield data. Reduce default rates in smallholder agricultural lending.",
    openGraph: {
        title: "Smallholder Credit Risk Scoring for African Agricultural Lenders",
        description:
            "Field-level risk scoring backed by satellite history, weather, soil, and ground-truth yield data. Reduce default rates in smallholder agricultural lending.",
        images: ["/og/for-lenders.png"],
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "Smallholder Credit Risk Scoring for African Agricultural Lenders",
        description:
            "Field-level risk scoring backed by satellite history, weather, soil, and ground-truth yield data. Reduce default rates in smallholder agricultural lending.",
        images: ["/og/for-lenders.png"],
    },
};

export default function ForLendersPage() {
    return (
        <main className="min-h-screen" style={{ backgroundColor: "var(--ee-bg)" }}>
            <Navbar variant="solid" />

            <InstitutionalHero
                headline="Unlock Smallholder Lending Without the Default Risk"
                subheadline="Field-level credit risk scoring for banks, microfinance institutions, and agricultural finance providers serving Zimbabwe and Southern Africa."
                primaryCTA={{
                    text: "Schedule Technical Demo",
                    href: WHATSAPP_BRIEFING_URL,
                }}
                secondaryCTA={{
                    text: "Download Methodology",
                    href: "/methodology/lenders-methodology.pdf",
                }}
            />

            <ProblemStatement
                heading="You're mandated to lend to smallholders, but you can't price the risk."
                paragraphs={[
                    "Agricultural lending to smallholder farmers in Zimbabwe has historically operated with 30-50% default rates — economically unviable for any institution operating at scale. The result: a billion-dollar lending gap, regulatory pressure on banks to address it, and no credible way to underwrite individual borrowers.",
                    "Traditional risk scoring fails because it depends on credit history that smallholders don't have, formal income documentation that doesn't exist, and collateral structures that don't apply to land tenure realities in Zimbabwe.",
                    "The information that does predict smallholder repayment — what they grow, how their fields perform, their yield history, their resilience to weather shocks — has historically been impossible to gather at scale.",
                ]}
            />

            <SectionBlock
                eyebrow="What We Provide"
                heading="A field-level credit risk score, integrated into your loan origination workflow"
                body="KurimaSense's risk scoring layer transforms agricultural lending from instinct-driven to data-driven, while remaining transparent and explainable — critical for credit committee approval and regulatory compliance."
                spacing="tight"
            />

            <PricingTiers
                tiers={[
                    {
                        name: "Risk Scoring API",
                        headline: "Core",
                        description:
                            "On-demand field-level risk scoring via API, with primary risk factors and confidence indicators.",
                        features: [
                            "REST API for loan origination integration",
                            "Default probability per field",
                            "Top 3 contributing risk factors",
                            "Confidence indicator per score",
                            "Audit trail for compliance",
                        ],
                    },
                    {
                        name: "White-Label Dashboard",
                        headline: "Standard",
                        description:
                            "A branded interface for your loan officers with field-level drill-down and portfolio analytics, on top of the Risk Scoring API.",
                        features: [
                            "Everything in Core",
                            "Branded dashboard with your visual identity",
                            "Loan officer field-level drill-down",
                            "Portfolio risk distribution & concentration analysis",
                            "Borrower risk reports (PDF)",
                        ],
                        highlighted: true,
                    },
                    {
                        name: "Custom Risk Models",
                        headline: "Enterprise",
                        description:
                            "Default-prediction models tuned to your specific loan products, repayment terms, and regional concentration.",
                        features: [
                            "Everything in Standard",
                            "Custom default-prediction model tuning",
                            "Calibration to your loan products & terms",
                            "Historical portfolio backtesting",
                            "Quarterly model performance reviews",
                            "Dedicated solution architect",
                        ],
                    },
                ]}
            />

            <HowItWorksSteps
                heading="How it works"
                steps={[
                    {
                        title: "Borrower data ingestion",
                        description:
                            "Your loan applicants provide their field location (lat/lng or a polygon drawn on a map) and crop type. That's the input. Everything else is derived.",
                    },
                    {
                        title: "Multi-year satellite history",
                        description:
                            "We pull 5+ years of satellite indices for each field — NDVI, EVI, NDRE, NDMI from Sentinel-2 optical; VV/VH backscatter from Sentinel-1 SAR. This is the field's credit history in agricultural terms.",
                    },
                    {
                        title: "Ground truth comparison",
                        description:
                            "We compare field performance against benchmarks for the same crop in the same Natural Region. A field consistently underperforming its peers carries higher risk.",
                    },
                    {
                        title: "Weather and climate context",
                        description:
                            "Drought frequency, rainfall reliability, and seasonal anomalies in the borrower's geography are factored in.",
                    },
                    {
                        title: "Default probability output",
                        description:
                            "A 0–1 score representing default probability under standard agricultural loan terms, alongside the top three contributing risk factors.",
                    },
                ]}
            />

            <DeliverablesList
                heading="What you receive"
                items={[
                    "Risk scoring API integrated with your loan origination system",
                    "White-label dashboard for loan officers and underwriters",
                    "Portfolio-level risk distribution and concentration analysis",
                    "Per-borrower risk report (PDF) with explainable factors",
                    "Anomaly alerts on existing portfolio",
                    "Compliance documentation supporting credit committee approval",
                    "Quarterly model performance reports",
                ]}
            />

            <SectionBlock
                heading="We don't ship black-box models"
                body={`Bank credit decisions require explainability. Every risk score KurimaSense produces is decomposable into its contributing factors. Our underlying model is logistic regression at the production layer — calibrated, interpretable, defensible in credit committee, and compliant with regulatory expectations for transparent decision-making.

We do not use neural networks or other opaque models in the production risk scoring pipeline. We can, and do, use more sophisticated models in research — but only their outputs as features, never as the deciding layer.`}
            />

            <SectionBlock
                heading="Why this works where others haven't"
                body={`Generic credit scoring systems fail in African agriculture because they're calibrated on developed-market borrower data. African mobile money lending models (the M-Shwari approach) work for short-term consumer credit but don't address agricultural cycle risk.

KurimaSense's risk model is purpose-built for the specific reality of smallholder agriculture in Southern Africa: seasonal cash flows, weather-dependent income, no formal credit history, but a wealth of measurable agricultural signal in satellite data that nobody has previously aggregated and modeled at this resolution.`}
            />

            <MethodologyDownload
                heading="Read our methodology"
                description="An 18-page technical document covering the data sources, modeling approach, validation methodology, and compliance considerations."
                downloadHref="/methodology/lenders-methodology.pdf"
            />

            <FAQAccordion
                heading="Frequently asked"
                items={[
                    {
                        question: "What's the expected default rate reduction?",
                        answer:
                            "We project reductions from current industry baselines of 30-50% to 10-15% with proper underwriting integration. Actual results depend on lending product, geography, and integration depth. We share pilot validation data on request.",
                    },
                    {
                        question: "How does this integrate with our core banking system?",
                        answer:
                            "Via REST API. Our team works with your IT to integrate into your existing loan origination workflow. Average integration timeline: 6–10 weeks.",
                    },
                    {
                        question: "Do you handle PII and data protection?",
                        answer:
                            "Yes. All borrower data is stored in compliance with applicable data protection requirements. We can sign DPAs and provide compliance documentation as part of vendor onboarding.",
                    },
                    {
                        question: "What if the borrower doesn't have a smartphone or our app?",
                        answer:
                            "Field polygons can be drawn by your loan officer during the application interview. The borrower doesn't need to use anything themselves.",
                    },
                    {
                        question: "Can we pilot before committing?",
                        answer:
                            "Yes. We offer 90-day paid pilots on a subset of your borrower base, with clear success criteria agreed upfront.",
                    },
                ]}
            />

            <InstitutionalCTA
                heading="Schedule a technical demo"
                body="For your agribusiness head and risk officers. We'll walk through real field-level risk scoring on borrowers from your geography."
                ctaText="Book a Demo"
                ctaHref={WHATSAPP_BRIEFING_URL}
            />

            <Footer />
        </main>
    );
}
