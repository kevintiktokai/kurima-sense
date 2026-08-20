'use client'

/**
 * FieldDocumentsCard — take this field's plan or report away as a PDF.
 *
 * Deliberately not another tile in the actions grid above it: those are links,
 * these are generations. A control that issues a numbered document and one that
 * navigates to a form should not look identical.
 *
 * The season plan is listed first and described as the one to carry, because it
 * is the only document of the four meant to be in a pocket in a field.
 */

import { useState } from 'react'
import {
    generateFieldReport,
    generateSeasonPlan,
    type GeneratedDocument,
} from '@/hooks/useDocuments'

export interface FieldDocumentsCardProps {
    fieldId: string
}

export function FieldDocumentsCard({ fieldId }: FieldDocumentsCardProps) {
    const [busy, setBusy] = useState<string | null>(null)
    const [problem, setProblem] = useState<string | null>(null)

    const run = async (key: string, fn: () => Promise<GeneratedDocument>) => {
        setBusy(key)
        setProblem(null)
        try {
            const doc = await fn()
            window.open(doc.url, '_blank', 'noopener')
        } catch (e) {
            setProblem(e instanceof Error ? e.message : 'Something went wrong')
        } finally {
            setBusy(null)
        }
    }

    return (
        <div
            className="lg:col-span-12 p-6 lg:p-7"
            style={{
                background: 'var(--ee-surface)',
                borderRadius: '24px',
                boxShadow: 'var(--shadow-neu)',
            }}
        >
            <div
                className="font-black text-lg"
                style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}
            >
                Take it with you
            </div>
            <p className="text-sm mt-1 mb-4" style={{ color: 'var(--ee-muted)' }}>
                A PDF you can print or send on. Each one is numbered, so it can be
                looked up later.
            </p>

            <div className="flex flex-wrap gap-3">
                <button
                    onClick={() => run('plan', () => generateSeasonPlan(fieldId))}
                    disabled={busy !== null}
                    className="px-5 py-3 rounded-full font-black text-sm disabled:opacity-50"
                    style={{
                        background: 'var(--ee-primary)',
                        color: 'var(--ee-on-primary)',
                        fontFamily: 'var(--font-heading)',
                    }}
                >
                    {busy === 'plan' ? 'Preparing…' : 'Season plan'}
                </button>
                <button
                    onClick={() => run('report', () => generateFieldReport(fieldId))}
                    disabled={busy !== null}
                    className="px-5 py-3 rounded-full font-bold text-sm disabled:opacity-50"
                    style={{
                        background: 'var(--ee-bg-dim)',
                        color: 'var(--ee-text)',
                    }}
                >
                    {busy === 'report' ? 'Preparing…' : 'Field report'}
                </button>
            </div>

            {/*
              * A field report with nothing in it is refused by the backend with
              * a 422 explaining why — that message is more useful than anything
              * this component could say, so it is shown as written rather than
              * replaced with "Something went wrong".
              */}
            {problem && (
                <p className="text-sm mt-4" style={{ color: '#B4483C' }}>
                    {problem}
                </p>
            )}
        </div>
    )
}

export default FieldDocumentsCard
