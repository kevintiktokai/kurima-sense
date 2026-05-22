interface DeliverablesListProps {
    heading: string;
    items: string[];
}

export default function DeliverablesList({ heading, items }: DeliverablesListProps) {
    return (
        <section
            className="py-20 md:py-28"
            style={{
                backgroundColor: "var(--ee-bg)",
                borderTop: "1px solid var(--ee-bg-border)",
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
                    <ul className="space-y-4">
                        {items.map((item) => (
                            <li
                                key={item}
                                className="flex items-start gap-4 py-3 text-base md:text-lg leading-relaxed"
                                style={{
                                    color: "var(--ee-text)",
                                    fontFamily: "var(--font-body)",
                                    borderBottom: "1px solid var(--ee-bg-border)",
                                }}
                            >
                                <span
                                    aria-hidden
                                    className="mt-1 shrink-0"
                                    style={{ color: "var(--ee-primary)" }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                        <path
                                            d="M3 9 L7.5 13.5 L15 5"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    );
}
