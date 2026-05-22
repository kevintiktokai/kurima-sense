import type { ReactNode } from "react";

interface SectionBlockProps {
    eyebrow?: string;
    heading: string;
    body?: ReactNode;
    children?: ReactNode;
    /** Set to "tight" when used as the lead-in to another component
     *  (e.g. PricingTiers) so the spacing doesn't double up. */
    spacing?: "default" | "tight";
}

export default function SectionBlock({
    eyebrow,
    heading,
    body,
    children,
    spacing = "default",
}: SectionBlockProps) {
    const py = spacing === "tight" ? "pt-20 pb-10 md:pt-28 md:pb-12" : "py-20 md:py-28";
    return (
        <section className={py} style={{ backgroundColor: "var(--ee-bg)" }}>
            <div className="container mx-auto px-6">
                <div className="max-w-[720px]">
                    {eyebrow ? (
                        <p
                            className="text-xs md:text-sm font-semibold uppercase tracking-[0.22em] mb-6"
                            style={{ color: "var(--ee-muted)", fontFamily: "var(--font-body)" }}
                        >
                            {eyebrow}
                        </p>
                    ) : null}
                    <h2
                        className="text-3xl md:text-4xl lg:text-5xl leading-tight tracking-tight mb-6"
                        style={{
                            color: "var(--ee-text)",
                            fontFamily: "var(--font-heading)",
                            fontWeight: 500,
                        }}
                    >
                        {heading}
                    </h2>
                    {body ? (
                        <div
                            className="text-base md:text-lg leading-relaxed space-y-5"
                            style={{ color: "var(--ee-text)", fontFamily: "var(--font-body)" }}
                        >
                            {typeof body === "string"
                                ? body.split(/\n{2,}/).map((p, i) => <p key={i}>{p.trim()}</p>)
                                : body}
                        </div>
                    ) : null}
                    {children}
                </div>
            </div>
        </section>
    );
}
