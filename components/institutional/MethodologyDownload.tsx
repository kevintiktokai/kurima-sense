interface MethodologyDownloadProps {
    heading: string;
    description: string;
    downloadHref: string;
    fileSize?: string;
}

export default function MethodologyDownload({
    heading,
    description,
    downloadHref,
    fileSize,
}: MethodologyDownloadProps) {
    return (
        <section
            className="py-20 md:py-28"
            style={{
                backgroundColor: "var(--ee-bg)",
                borderTop: "1px solid var(--ee-bg-border)",
            }}
        >
            <div className="container mx-auto px-6">
                <div
                    className="max-w-[720px] rounded-lg p-8 md:p-12"
                    style={{
                        backgroundColor: "var(--ee-surface)",
                        border: "1px solid var(--ee-bg-border)",
                    }}
                >
                    <h2
                        className="text-2xl md:text-3xl lg:text-4xl leading-tight tracking-tight mb-4"
                        style={{
                            color: "var(--ee-text)",
                            fontFamily: "var(--font-heading)",
                            fontWeight: 500,
                        }}
                    >
                        {heading}
                    </h2>
                    <p
                        className="text-base md:text-lg leading-relaxed mb-8"
                        style={{ color: "var(--ee-muted)", fontFamily: "var(--font-body)" }}
                    >
                        {description}
                    </p>
                    <a
                        href={downloadHref}
                        download
                        className="inline-flex items-center gap-3 px-6 py-3 rounded-md font-semibold text-base transition-opacity hover:opacity-90"
                        style={{
                            backgroundColor: "var(--ee-text)",
                            color: "#FFFFFF",
                            fontFamily: "var(--font-body)",
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                            <path
                                d="M9 2 V12 M4 8 L9 13 L14 8 M3 16 H15"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        Download PDF
                        {fileSize ? (
                            <span
                                className="text-xs font-normal opacity-60"
                                style={{ marginLeft: "0.25rem" }}
                            >
                                ({fileSize})
                            </span>
                        ) : null}
                    </a>
                </div>
            </div>
        </section>
    );
}
