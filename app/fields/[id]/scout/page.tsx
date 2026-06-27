'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { api } from '@/services/api'
import { PageContainer } from '@/components/layout/PageContainer'
import { ScoutingCapture } from '@/components/capture/ScoutingCapture'

export default function ScoutPage() {
    const params = useParams()
    const fieldId = String(params.id)
    const [fieldLabel, setFieldLabel] = useState('this field')
    const [cropType, setCropType] = useState<string | undefined>(undefined)

    useEffect(() => {
        let active = true
        api.getFields()
            .then((fields) => {
                if (!active) return
                const f = fields.find((x: { id?: string }) => x.id === fieldId)
                if (f?.name) setFieldLabel(f.name)
                if (f && 'crop_type' in f) setCropType((f as { crop_type?: string }).crop_type)
            })
            .catch(() => {})
        return () => {
            active = false
        }
    }, [fieldId])

    return (
        <PageContainer className="px-4 py-6 space-y-6">
            <Link href={`/fields/${fieldId}`} className="inline-flex items-center gap-2 text-sm" style={{ color: 'var(--ee-muted)' }}>
                <ArrowLeft className="size-4" /> Back to field
            </Link>
            <header className="space-y-1">
                <h1 className="text-2xl font-semibold" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-display)' }}>
                    Scout & diagnose
                </h1>
                <p className="text-sm" style={{ color: 'var(--ee-muted)' }}>
                    {fieldLabel} — photograph an affected plant for an instant AI diagnosis.
                </p>
            </header>
            <ScoutingCapture fieldId={fieldId} fieldLabel={fieldLabel} cropType={cropType} />
        </PageContainer>
    )
}
