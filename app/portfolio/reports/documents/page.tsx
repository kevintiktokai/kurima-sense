'use client'

/**
  * /portfolio/reports/documents — generate a pack or a report, and see what has been
 * issued.
 *
 * The list is the point as much as the buttons. A contractor forwards an
 * evidence pack in March and gets a question about it in September; the only
 * useful answer comes from a row saying what that number covered. So the
 * registry is the page and generation is a control on it, not the other way
 * round.
 */

import { useState } from 'react'
import { PageContainer } from '@/components/layout/PageContainer'
import {
    generateEvidencePack,
    generatePortfolioReport,
    markForwarded,
    useDocuments,
    type GeneratedDocument,
} from '@/hooks/useDocuments'
import {
    carriesVerification,
    coveragePeriod,
    formatDate,
    formatHectares,
    forwardedLabel,
    kindLabel,
    shortDigest,
} from '@/lib/document-utils'

export default function PortfolioDocumentsPage() {
    const { documents, error, isLoading, refresh } = useDocuments()
    const [busy, setBusy] = useState<string | null>(null)
    const [problem, setProblem] = useState<string | null>(null)
    const [anonymise, setAnonymise] = useState(false)

    const run = async (key: string, fn: () => Promise<GeneratedDocument>) => {
        setBusy(key)
        setProblem(null)
        try {
            const doc = await fn()
            // Opened, not downloaded. The caller is usually about to look at it
            // before deciding whether to send it, and a document nobody read is
            // how a wrong figure reaches a buyer.
            window.open(doc.url, '_blank', 'noopener')
            refresh()
        } catch (e) {
            setProblem(e instanceof Error ? e.message : 'Something went wrong')
        } finally {
            setBusy(null)
        }
    }

    const recordSent = async (issueNumber: string) => {
        const note = window.prompt(
            'Who did you send it to? (optional — this is only recorded because you say so)',
        )
        if (note === null) return
        try {
            await markForwarded(issueNumber, note)
            refresh()
        } catch (e) {
            setProblem(e instanceof Error ? e.message : 'Could not record that')
        }
    }

    return (
        <PageContainer variant="reading" className="pb-8">
            <h1
                className="text-2xl lg:text-3xl font-black tracking-tight mb-1"
                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
            >
                Documents
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--ee-muted)' }}>
                Every document is recorded when it is generated, so a number
                quoted back to you later resolves to what it actually covered.
            </p>

            {/* Generators */}
            <div
                className="p-5 rounded-[24px] mb-6"
                style={{ background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}
            >
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => run('pack', () => generateEvidencePack())}
                        disabled={busy !== null}
                        className="px-5 py-3 rounded-full font-black text-sm disabled:opacity-50"
                        style={{
                            background: 'var(--ee-primary)',
                            color: 'var(--ee-on-primary)',
                            fontFamily: 'var(--font-heading)',
                        }}
                    >
                        {busy === 'pack' ? 'Generating…' : 'Season Evidence Pack'}
                    </button>
                    <button
                        onClick={() => run('portfolio', () => generatePortfolioReport(anonymise))}
                        disabled={busy !== null}
                        className="px-5 py-3 rounded-full font-bold text-sm disabled:opacity-50"
                        style={{
                            background: 'var(--ee-surface)',
                            color: 'var(--ee-text)',
                            boxShadow: 'var(--shadow-neu)',
                        }}
                    >
                        {busy === 'portfolio' ? 'Generating…' : 'Portfolio Report'}
                    </button>
                </div>

                {/*
                  * The consent point, said where the decision is made rather
                  * than in a policy nobody opens. Anonymising removes names; it
                  * does not make a client's hectares yours to show.
                  */}
                <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={anonymise}
                        onChange={(e) => setAnonymise(e.target.checked)}
                        className="mt-0.5"
                    />
                    <span className="text-xs" style={{ color: 'var(--ee-muted)' }}>
                        <span className="font-bold" style={{ color: 'var(--ee-text)' }}>
                            Replace names with labels
                        </span>{' '}
                        in the portfolio report. Districts and figures stay — a reader
                        can often work out whose book it is from those alone, so this
                        guards against an accident, it is not permission to share
                        someone&apos;s data.
                    </span>
                </label>
            </div>

            {problem && (
                <div
                    className="p-4 rounded-[16px] mb-5 text-sm font-bold"
                    style={{ background: 'rgba(180,72,60,0.08)', color: '#B4483C' }}
                >
                    {problem}
                </div>
            )}

            {/* The registry */}
            {isLoading ? (
                <div className="space-y-3" aria-busy="true">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="animate-pulse h-24"
                            style={{
                                background: 'var(--ee-surface)',
                                borderRadius: '20px',
                                boxShadow: 'var(--shadow-neu)',
                            }}
                        />
                    ))}
                </div>
            ) : error ? (
                <p className="text-sm" style={{ color: 'var(--ee-muted)' }}>
                    Couldn&apos;t load the document history.
                </p>
            ) : documents.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--ee-muted)' }}>
                    Nothing issued yet. Documents you generate will be listed here
                    with what they covered.
                </p>
            ) : (
                <div className="space-y-3">
                    {documents.map((doc) => (
                        <div
                            key={doc.issue_number}
                            className="p-5 rounded-[20px]"
                            style={{
                                background: 'var(--ee-surface)',
                                boxShadow: 'var(--shadow-neu)',
                            }}
                        >
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="min-w-0">
                                    <p
                                        className="font-black"
                                        style={{
                                            color: 'var(--ee-text)',
                                            fontFamily: 'var(--font-heading)',
                                        }}
                                    >
                                        {kindLabel(doc.kind)} · {doc.subject}
                                    </p>
                                    <p
                                        className="text-xs font-bold tracking-wide mt-0.5"
                                        style={{ color: 'var(--ee-muted)' }}
                                    >
                                        {doc.issue_number}
                                        {doc.issued_at && ` · issued ${formatDate(doc.issued_at)}`}
                                    </p>
                                </div>
                                <button
                                    onClick={() => recordSent(doc.issue_number)}
                                    className="px-4 py-2 rounded-full font-bold text-xs flex-shrink-0"
                                    style={{
                                        background: 'var(--ee-bg-dim)',
                                        color: 'var(--ee-text)',
                                    }}
                                >
                                    {doc.forwarded_at ? 'Update' : 'I sent this'}
                                </button>
                            </div>

                            <div
                                className="mt-3 text-xs grid gap-1"
                                style={{ color: 'var(--ee-muted)' }}
                            >
                                {coveragePeriod(doc) && <span>Covers {coveragePeriod(doc)}</span>}
                                {/*
                                  * Only shown for the documents that assert
                                  * coverage. A "verified hectares" line on a
                                  * season plan would read as certification of a
                                  * forecast.
                                  */}
                                {carriesVerification(doc.kind) && (
                                    <span>Verified over {formatHectares(doc.hectares)}</span>
                                )}
                                <span>{forwardedLabel(doc)}</span>
                                <span title={doc.content_sha256}>
                                    Fingerprint {shortDigest(doc.content_sha256)} — a copy that
                                    matches is the document we issued
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </PageContainer>
    )
}
