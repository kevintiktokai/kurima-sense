interface ProblemStatementProps {
    heading: string;
    paragraphs: string[];
}

export default function ProblemStatement({ heading, paragraphs }: ProblemStatementProps) {
    return (
        <section
            className="py-20 md:py-28"
            style={{
                backgroundColor: "#EFEAE0",
                borderTop: "1px solid var(--ee-bg-border)",
                borderBottom: "1px solid var(--ee-bg-border)",
            }}
        >
            <div className="container mx-auto px-6">
                <div className="max-w-[720px]">
                    <h2
                        className="text-3xl md:text-4xl lg:text-5xl leading-tight tracking-tight mb-10"
                        style={{
                            color: "var(--ee-text)",
                            fontFamily: "var(--font-heading)",
                            fontWeight: 500,
                        }}
                    >
                        {heading}
                    </h2>
                    <div className="space-y-6">
                        {paragraphs.map((paragraph, i) => (
                            <p
                                key={i}
                                className="text-base md:text-lg leading-relaxed"
                                style={{ color: "var(--ee-text)", fontFamily: "var(--font-body)" }}
                            >
                                {paragraph}
                            </p>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
