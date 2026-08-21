'use client'

/**
 * useDocuments — the registry list, plus generators for each document kind.
 *
 * Generation returns a PDF rather than JSON, so these are plain async functions
 * that hand back a blob URL and the issue number the backend allocated. The
 * caller opens it; nothing here downloads on the user's behalf.
 *
 * **Every generator refreshes the registry list.** A document that exists but
 * is not in the list the user is looking at is the one they generate twice, and
 * two issue numbers for the same content is exactly what the registry exists to
 * prevent people needing to reason about.
 */

import useSWR, { mutate as globalMutate } from 'swr'
import { getAuthHeaders } from '@/lib/api-cache'
import { API_BASE_URL } from '@/lib/api-base'
import { apiFetch } from '@/lib/http'
import type { IssuedDocument } from '@/lib/document-utils'
import { sortByIssued } from '@/lib/document-utils'

const DOCUMENTS_URL = `${API_BASE_URL}/documents`

export interface GeneratedDocument {
    /** Object URL for the PDF. The caller owns it and should revoke it. */
    url: string
    issueNumber: string
    blob: Blob
}

// No local error mapping: apiFetch surfaces the backend's own `detail`, and
// those are more specific than anything this file said. "Cannot generate
// another tenant's document" and "Could not allocate a document number just
// now" beat "You don't have permission" and "(503)".
async function fetchDocuments(url: string): Promise<IssuedDocument[]> {
    const headers = await getAuthHeaders()
    const res = await apiFetch(url, { headers })
    const body = await res.json()
    return sortByIssued((body?.documents ?? []) as IssuedDocument[])
}

export function useDocuments(kind?: string) {
    const url = kind ? `${DOCUMENTS_URL}?kind=${encodeURIComponent(kind)}` : DOCUMENTS_URL
    const { data, error, isLoading, mutate } = useSWR(url, fetchDocuments, {
        revalidateOnFocus: false,
    })
    return { documents: data ?? [], error, isLoading, refresh: mutate }
}

/** Invalidate every documents view — kind-filtered lists included. */
export function invalidateDocuments() {
    return globalMutate(
        (key) => typeof key === 'string' && key.startsWith(DOCUMENTS_URL),
        undefined,
        { revalidate: true },
    )
}

async function generate(path: string): Promise<GeneratedDocument> {
    const headers = await getAuthHeaders()
    // Longer deadline: this renders a PDF server-side. Not retried — it is a
    // POST, and a retry would issue a second numbered document.
    const res = await apiFetch(path, {
        method: 'POST',
        headers,
        timeoutMs: 60_000,
    })

    const blob = await res.blob()
    // The backend puts the allocated number in a header so the caller can show
    // it without parsing the PDF. Falling back to empty rather than inventing
    // one: a wrong issue number is worse than none, since it is what someone
    // quotes back later.
    const issueNumber = res.headers.get('X-Document-Issue-Number') ?? ''
    await invalidateDocuments()
    return { url: URL.createObjectURL(blob), issueNumber, blob }
}

export function generateSeasonPlan(fieldId: string, persona?: string) {
    const query = persona ? `?persona=${encodeURIComponent(persona)}` : ''
    return generate(`/fields/${fieldId}/documents/season-plan${query}`)
}

export function generateFieldReport(fieldId: string, seasonId?: string) {
    const query = seasonId ? `?season_id=${encodeURIComponent(seasonId)}` : ''
    return generate(`/fields/${fieldId}/documents/field-report${query}`)
}

export function generatePortfolioReport(anonymise = false) {
    return generate(`/portfolio/documents/portfolio-report?anonymise=${anonymise}`)
}

export function generateEvidencePack(coverageStart?: string, coverageEnd?: string) {
    const params = new URLSearchParams()
    if (coverageStart) params.set('coverage_start', coverageStart)
    if (coverageEnd) params.set('coverage_end', coverageEnd)
    const query = params.toString() ? `?${params}` : ''
    return generate(`/portfolio/documents/evidence-pack${query}`)
}

/**
 * Record that the client sent a document on.
 *
 * Self-reported, always. Nothing observes where a file went, and this is the
 * only way a document is ever marked as forwarded.
 */
export async function markForwarded(issueNumber: string, note?: string) {
    const headers = await getAuthHeaders()
    const res = await apiFetch(
        `/documents/${encodeURIComponent(issueNumber)}/forwarded`,
        {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ note: note || null }),
        },
    )
    await invalidateDocuments()
    return (await res.json()) as IssuedDocument
}
