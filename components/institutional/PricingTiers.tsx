import { WHATSAPP_BRIEFING_URL } from "@/lib/contact";

interface Tier {
    name: string;
    headline: string;
    description: string;
    features: string[];
    highlighted?: boolean;
}

interface PricingTiersProps {
    tiers: Tier[];
    /** Optional override for the CTA destination (defaults to the WhatsApp briefing). */
    ctaHref?: string;
}

export default function PricingTiers({ tiers, ctaHref = WHATSAPP_BRIEFING_URL }: PricingTiersProps) {
    return (
        <section className="pb-20 md:pb-28" style={{ backgroundColor: "var(--ee-bg)" }}>
            <div className="container mx-auto px-6">
                {/* Intro — explains why there's no public price ladder */}
                <div className="max-w-[640px] mb-10 md:mb-14">
                    <p
                        className="text-xs font-semibold uppercase tracking-[0.22em] mb-3"
                        style={{ color: "var(--ee-primary)", fontFamily: "var(--font-body)" }}
                    >
                        How we work together
                    </p>
                    <p
                        className="text-base md:text-lg leading-relaxed"
                        style={{ color: "var(--ee-muted)", fontFamily: "var(--font-body)" }}
                    >
                        Engagements scale with the depth of modelling you need — from standard
                        reporting through to bespoke prediction models — not by seat count. We scope
                        and price each one on a short briefing call.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    {tiers.map((tier) => (
                        <TierCard key={tier.name} tier={tier} ctaHref={ctaHref} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function TierCard({ tier, ctaHref }: { tier: Tier; ctaHref: string }) {
    const cardStyle: React.CSSProperties = tier.highlighted
        ? {
              backgroundColor: "var(--ee-surface)",
              border: "1px solid var(--ee-primary)",
              boxShadow:
                  "0 0 0 4px rgba(15, 184, 133, 0.06), 0 1px 2px rgba(0,0,0,0.03)",
          }
        : {
              backgroundColor: "var(--ee-surface)",
              border: "1px solid var(--ee-bg-border)",
          };

    const ctaStyle: React.CSSProperties = tier.highlighted
        ? { backgroundColor: "var(--ee-primary)", color: "#06140E" }
        : { backgroundColor: "transparent", color: "var(--ee-text)", border: "1px solid var(--ee-bg-border)" };

    return (
        <div className="relative rounded-lg p-8 md:p-10 flex flex-col" style={cardStyle}>
            {tier.highlighted ? (
                <span
                    className="absolute -top-3 left-8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full"
                    style={{
                        backgroundColor: "var(--ee-primary)",
                        color: "#FFFFFF",
                        fontFamily: "var(--font-body)",
                    }}
                >
                    Most Popular
                </span>
            ) : null}

            <p
                className="text-xs font-semibold uppercase tracking-[0.22em] mb-3"
                style={{ color: "var(--ee-muted)", fontFamily: "var(--font-body)" }}
            >
                {tier.headline}
            </p>
            <h3
                className="text-2xl md:text-3xl mb-3 leading-tight"
                style={{
                    color: "var(--ee-text)",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 500,
                }}
            >
                {tier.name}
            </h3>
            <p
                className="text-sm md:text-base mb-8 leading-relaxed"
                style={{
                    color: "var(--ee-muted)",
                    fontFamily: "var(--font-body)",
                    borderBottom: "1px solid var(--ee-bg-border)",
                    paddingBottom: "2rem",
                }}
            >
                {tier.description}
            </p>

            <ul className="space-y-3 mb-10">
                {tier.features.map((feature) => (
                    <li
                        key={feature}
                        className="flex items-start gap-3 text-sm md:text-base leading-relaxed"
                        style={{ color: "var(--ee-text)", fontFamily: "var(--font-body)" }}
                    >
                        <span
                            aria-hidden
                            className="mt-1 shrink-0"
                            style={{ color: "var(--ee-primary)" }}
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path
                                    d="M3 8 L7 12 L13 4"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </span>
                        <span>{feature}</span>
                    </li>
                ))}
            </ul>

            <a
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex items-center justify-center w-full px-6 py-3.5 rounded-full font-semibold text-sm transition-transform hover:-translate-y-0.5"
                style={{ ...ctaStyle, fontFamily: "var(--font-body)" }}
            >
                Book a briefing
            </a>
        </div>
    );
}
