import Link from "next/link";

interface InstitutionalCTAProps {
    heading: string;
    body: string;
    ctaText: string;
    ctaHref: string;
}

function isExternal(href: string) {
    return /^https?:\/\//i.test(href);
}

export default function InstitutionalCTA({
    heading,
    body,
    ctaText,
    ctaHref,
}: InstitutionalCTAProps) {
    const className =
        "inline-flex items-center justify-center px-8 py-4 rounded-md font-semibold text-base transition-opacity hover:opacity-90";
    const style = {
        backgroundColor: "var(--ee-primary)",
        color: "#FFFFFF",
        fontFamily: "var(--font-body)",
    };
    const button = isExternal(ctaHref) ? (
        <a className={className} style={style} href={ctaHref} target="_blank" rel="noopener noreferrer">
            {ctaText}
        </a>
    ) : (
        <Link className={className} style={style} href={ctaHref}>
            {ctaText}
        </Link>
    );

    return (
        <section
            className="py-20 md:py-32"
            style={{
                backgroundColor: "var(--ee-text)",
                color: "#FFFFFF",
            }}
        >
            <div className="container mx-auto px-6">
                <div className="max-w-[720px]">
                    <h2
                        className="text-3xl md:text-4xl lg:text-5xl leading-tight tracking-tight mb-6"
                        style={{
                            color: "#FFFFFF",
                            fontFamily: "var(--font-heading)",
                            fontWeight: 500,
                        }}
                    >
                        {heading}
                    </h2>
                    <p
                        className="text-lg md:text-xl leading-relaxed mb-10"
                        style={{
                            color: "rgba(255,255,255,0.7)",
                            fontFamily: "var(--font-body)",
                        }}
                    >
                        {body}
                    </p>
                    {button}
                </div>
            </div>
        </section>
    );
}
