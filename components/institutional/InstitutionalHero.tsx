import Link from "next/link";
import type { ReactNode } from "react";

interface CTAProps {
    text: string;
    href: string;
}

interface InstitutionalHeroProps {
    eyebrow?: string;
    headline: string;
    subheadline: string;
    primaryCTA: CTAProps;
    secondaryCTA?: CTAProps;
    footerNote?: ReactNode;
}

function isExternal(href: string) {
    return /^https?:\/\//i.test(href);
}

export default function InstitutionalHero({
    eyebrow,
    headline,
    subheadline,
    primaryCTA,
    secondaryCTA,
    footerNote,
}: InstitutionalHeroProps) {
    return (
        <section
            className="pt-32 pb-20 md:pt-44 md:pb-32"
            style={{ backgroundColor: "var(--ee-bg)" }}
        >
            <div className="container mx-auto px-6">
                <div className="max-w-[920px]">
                    {eyebrow ? (
                        <p
                            className="text-xs md:text-sm font-semibold uppercase tracking-[0.22em] mb-8"
                            style={{ color: "var(--ee-muted)", fontFamily: "var(--font-body)" }}
                        >
                            {eyebrow}
                        </p>
                    ) : null}
                    <h1
                        className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight mb-8"
                        style={{
                            color: "var(--ee-text)",
                            fontFamily: "var(--font-heading)",
                            fontWeight: 500,
                        }}
                    >
                        {headline}
                    </h1>
                    <p
                        className="text-lg md:text-xl leading-relaxed max-w-[720px]"
                        style={{ color: "var(--ee-muted)", fontFamily: "var(--font-body)" }}
                    >
                        {subheadline}
                    </p>

                    <div className="mt-12 flex flex-col sm:flex-row gap-4 sm:gap-6 sm:items-center">
                        <PrimaryButton {...primaryCTA} />
                        {secondaryCTA ? <SecondaryLink {...secondaryCTA} /> : null}
                    </div>

                    {footerNote ? (
                        <p
                            className="mt-8 text-sm max-w-[560px]"
                            style={{ color: "var(--ee-muted)", fontFamily: "var(--font-body)" }}
                        >
                            {footerNote}
                        </p>
                    ) : null}
                </div>
            </div>
        </section>
    );
}

function PrimaryButton({ text, href }: CTAProps) {
    const className =
        "inline-flex items-center justify-center px-8 py-4 rounded-md font-semibold text-base transition-opacity hover:opacity-90";
    const style = {
        backgroundColor: "var(--ee-primary)",
        color: "#FFFFFF",
        fontFamily: "var(--font-body)",
    };
    if (isExternal(href)) {
        return (
            <a className={className} style={style} href={href} target="_blank" rel="noopener noreferrer">
                {text}
            </a>
        );
    }
    return (
        <Link className={className} style={style} href={href}>
            {text}
        </Link>
    );
}

function SecondaryLink({ text, href }: CTAProps) {
    const className =
        "inline-flex items-center gap-2 font-semibold text-base hover:opacity-70 transition-opacity";
    const style = {
        color: "var(--ee-text)",
        fontFamily: "var(--font-body)",
        textDecoration: "underline",
        textUnderlineOffset: "6px",
        textDecorationThickness: "1px",
    } as const;
    if (isExternal(href)) {
        return (
            <a className={className} style={style} href={href} target="_blank" rel="noopener noreferrer">
                {text}
            </a>
        );
    }
    return (
        <Link className={className} style={style} href={href}>
            {text}
        </Link>
    );
}
