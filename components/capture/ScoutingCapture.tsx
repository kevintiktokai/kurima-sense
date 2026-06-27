'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2, Stethoscope } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { api } from '@/services/api'

interface Props {
    fieldId: string
    cropType?: string
}

interface Diagnosis {
    detected_issues: Array<{ name: string; type: string; confidence: number; severity: string }>
    overall_health_score: number
    diagnosis_summary: string
    treatment_recommendations: string[]
    urgency: string
    should_seek_expert: boolean
}

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
    })
}

/**
 * Scouting: capture a leaf/plant photo and get an AI diagnosis. Diagnosis needs
 * the model, so this is online-only — when offline we say so plainly rather than
 * queueing a photo that can't be analysed.
 */
export function ScoutingCapture({ fieldId, cropType }: Props) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [analyzing, setAnalyzing] = useState(false)
    const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setError(null)
        setDiagnosis(null)

        const dataUrl = await fileToDataUrl(file)
        setPreview(dataUrl)

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setError('Photo diagnosis needs an internet connection. Try again when you’re back online.')
            return
        }

        setAnalyzing(true)
        try {
            // Strip the data-URL prefix → raw base64 for the vision endpoint.
            const base64 = dataUrl.replace(/^data:image\/[^;]+;base64,/, '')
            const result = await api.analyzeImage(base64, {
                cropType,
                additionalContext: `Field scouting photo for field ${fieldId}`,
            })
            setDiagnosis(result.analysis as Diagnosis)
        } catch {
            setError('Could not analyse the photo. Please try again.')
        } finally {
            setAnalyzing(false)
        }
    }

    return (
        <div className="space-y-4">
            <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />

            {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Scouting" className="w-full rounded-[20px] object-cover shadow-[var(--shadow-neu)]" style={{ maxHeight: 320 }} />
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-3 rounded-[20px] px-6 py-12 shadow-[var(--shadow-neu)] transition-all active:shadow-[var(--shadow-neu-inset)]"
                    style={{ background: 'var(--ee-bg)', color: 'var(--ee-muted)' }}
                >
                    <Camera className="size-8" style={{ color: 'var(--ee-primary)' }} />
                    <span className="text-sm">Take or choose a photo of the affected plant</span>
                </button>
            )}

            {preview && (
                <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} className="w-full">
                    Choose a different photo
                </Button>
            )}

            {analyzing && (
                <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--ee-muted)' }}>
                    <Loader2 className="size-4 animate-spin" /> Analysing photo…
                </div>
            )}

            {error && <p className="text-sm" style={{ color: '#c44' }}>{error}</p>}

            {diagnosis && (
                <div className="space-y-3 rounded-[20px] p-5 shadow-[var(--shadow-neu)]" style={{ background: 'var(--ee-bg)' }}>
                    <div className="flex items-center gap-2">
                        <Stethoscope className="size-5" style={{ color: 'var(--ee-primary)' }} />
                        <span className="font-semibold" style={{ color: 'var(--ee-text)' }}>
                            Health score: {diagnosis.overall_health_score}/100
                        </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--ee-text)' }}>{diagnosis.diagnosis_summary}</p>

                    {diagnosis.detected_issues?.length > 0 && (
                        <ul className="space-y-1 text-sm" style={{ color: 'var(--ee-text)' }}>
                            {diagnosis.detected_issues.map((it, i) => (
                                <li key={i}>
                                    <span className="font-medium">{it.name}</span>{' '}
                                    <span style={{ color: 'var(--ee-muted)' }}>
                                        ({it.severity}, {Math.round((it.confidence ?? 0) * 100)}% conf.)
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}

                    {diagnosis.treatment_recommendations?.length > 0 && (
                        <div className="text-sm" style={{ color: 'var(--ee-text)' }}>
                            <div className="mb-1 font-medium">Recommended actions</div>
                            <ul className="list-disc space-y-1 pl-5" style={{ color: 'var(--ee-muted)' }}>
                                {diagnosis.treatment_recommendations.map((r, i) => (
                                    <li key={i}>{r}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {diagnosis.should_seek_expert && (
                        <p className="text-sm font-medium" style={{ color: '#b8860b' }}>
                            Consider consulting an extension officer for confirmation.
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
