interface Tier {
    name: string;
    headline: string;
    description: string;
    priceFrom: string;
    features: string[];
    highlighted?: boolean;
}

interface PricingTiersProps {
    tiers: Tier[];
}

export default function PricingTiers({ tiers }: PricingTiersProps) {
    return (
        <section className="pb-20 md:pb-28" style={{ backgroundColor: "var(--ee-bg)" }}>
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                    {tiers.map((tier) => (
                        <TierCard key={tier.name} tier={tier} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function TierCard({ tier }: { tier: Tier }) {
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
                style={{ color: "var(--ee-muted)", fontFamily: "var(--font-body)" }}
            >
                {tier.description}
            </p>

            <div
                className="pb-8 mb-8"
                style={{ borderBottom: "1px solid var(--ee-bg-border)" }}
            >
                <p
                    className="text-base md:text-lg font-semibold leading-snug"
                    style={{ color: "var(--ee-text)", fontFamily: "var(--font-body)" }}
                >
                    {tier.priceFrom}
                </p>
            </div>

            <ul className="space-y-3">
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
        </div>
    );
}
