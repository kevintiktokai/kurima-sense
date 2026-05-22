interface Step {
    title: string;
    description: string;
}

interface HowItWorksStepsProps {
    heading: string;
    steps: Step[];
}

export default function HowItWorksSteps({ heading, steps }: HowItWorksStepsProps) {
    return (
        <section className="py-20 md:py-28" style={{ backgroundColor: "var(--ee-bg)" }}>
            <div className="container mx-auto px-6">
                <div className="max-w-[720px]">
                    <h2
                        className="text-3xl md:text-4xl lg:text-5xl leading-tight tracking-tight mb-12"
                        style={{
                            color: "var(--ee-text)",
                            fontFamily: "var(--font-heading)",
                            fontWeight: 500,
                        }}
                    >
                        {heading}
                    </h2>

                    <ol className="space-y-12 md:space-y-16">
                        {steps.map((step, i) => (
                            <li
                                key={step.title}
                                className="grid grid-cols-[auto_1fr] gap-6 md:gap-10 items-start"
                            >
                                <span
                                    aria-hidden
                                    className="text-4xl md:text-5xl leading-none tabular-nums"
                                    style={{
                                        color: "var(--ee-muted)",
                                        fontFamily: "var(--font-heading)",
                                        fontWeight: 300,
                                    }}
                                >
                                    {String(i + 1).padStart(2, "0")}
                                </span>
                                <div>
                                    <h3
                                        className="text-xl md:text-2xl leading-snug mb-3"
                                        style={{
                                            color: "var(--ee-text)",
                                            fontFamily: "var(--font-heading)",
                                            fontWeight: 500,
                                        }}
                                    >
                                        {step.title}
                                    </h3>
                                    <p
                                        className="text-base md:text-lg leading-relaxed"
                                        style={{
                                            color: "var(--ee-muted)",
                                            fontFamily: "var(--font-body)",
                                        }}
                                    >
                                        {step.description}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </section>
    );
}
