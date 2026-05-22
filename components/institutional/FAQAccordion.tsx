"use client";

import { useState } from "react";

interface FAQItem {
    question: string;
    answer: string;
}

interface FAQAccordionProps {
    heading: string;
    items: FAQItem[];
}

export default function FAQAccordion({ heading, items }: FAQAccordionProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

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

                    <ul style={{ borderTop: "1px solid var(--ee-bg-border)" }}>
                        {items.map((item, i) => {
                            const isOpen = openIndex === i;
                            const buttonId = `faq-button-${i}`;
                            const panelId = `faq-panel-${i}`;
                            return (
                                <li
                                    key={item.question}
                                    style={{ borderBottom: "1px solid var(--ee-bg-border)" }}
                                >
                                    <button
                                        type="button"
                                        id={buttonId}
                                        aria-expanded={isOpen}
                                        aria-controls={panelId}
                                        onClick={() => setOpenIndex(isOpen ? null : i)}
                                        className="w-full flex items-start justify-between gap-6 py-6 text-left transition-opacity hover:opacity-80"
                                    >
                                        <span
                                            className="text-base md:text-lg font-semibold leading-snug"
                                            style={{
                                                color: "var(--ee-text)",
                                                fontFamily: "var(--font-body)",
                                            }}
                                        >
                                            {item.question}
                                        </span>
                                        <span
                                            aria-hidden
                                            className="shrink-0 mt-1 transition-transform"
                                            style={{
                                                color: "var(--ee-muted)",
                                                transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                                            }}
                                        >
                                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                <path
                                                    d="M10 4 V16 M4 10 H16"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                        </span>
                                    </button>
                                    {isOpen ? (
                                        <div
                                            id={panelId}
                                            role="region"
                                            aria-labelledby={buttonId}
                                            className="pb-6 pr-8 text-base md:text-lg leading-relaxed"
                                            style={{
                                                color: "var(--ee-muted)",
                                                fontFamily: "var(--font-body)",
                                            }}
                                        >
                                            {item.answer}
                                        </div>
                                    ) : null}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </section>
    );
}
