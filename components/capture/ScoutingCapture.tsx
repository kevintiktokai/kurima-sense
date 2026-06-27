'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Check, CloudOff, Loader2, MapPin, Stethoscope } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
    diagnosePhoto,
    saveScoutingObservation,
    ScoutingValidationError,
    type ScoutCategory,
    type ScoutSeverity,
} from '@/services/scouting'

interface Props {
    fieldId: string
    fieldLabel: string
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

const CATEGORIES: ScoutCategory[] = ['pest', 'disease', 'weed', 'water', 'nutrient', 'general']
const SEVERITIES: ScoutSeverity[] = ['low', 'medium', 'high', 'critical']
const selectClass = 'h-10 w-full rounded-[16px] bg-[var(--ee-bg)] px-3 text-sm shadow-[var(--shadow-neu-inset)] outline-none'

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
    })
}

export function ScoutingCapture({ fieldId, fieldLabel, cropType }: Props) {
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)

    const [category, setCategory] = useState<ScoutCategory>('general')
    const [severity, setSeverity] = useState<ScoutSeverity>('low')
    const [notes, setNotes] = useState('')
    const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)

    const [preview, setPreview] = useState<string | null>(null)
    const [analyzing, setAnalyzing] = useState(false)
    const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null)
    const [error, setError] = useState<string | null>(null)

    const [saving, setSaving] = useState(false)
    const [outcome, setOutcome] = useState<'submitted' | 'queued' | null>(null)

    async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        setError(null)
        setDiagnosis(null)
        const dataUrl = await fileToDataUrl(file)
        setPreview(dataUrl)

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setError('Photo diagnosis needs an internet connection — you can still save the observation now and add a photo later.')
            return
        }
        setAnalyzing(true)
        try {
            const base64 = dataUrl.replace(/^data:image\/[^;]+;base64,/, '')
            const result = await diagnosePhoto(base64, cropType)
            const dx = result.analysis as Diagnosis
            setDiagnosis(dx)
            // Pre-fill category/severity from the AI's strongest finding.
            if (dx.detected_issues?.length) {
                const top = dx.detected_issues[0]
                if (CATEGORIES.includes(top.type as ScoutCategory)) setCategory(top.type as ScoutCategory)
                if (SEVERITIES.includes(top.severity as ScoutSeverity)) setSeverity(top.severity as ScoutSeverity)
            }
        } catch {
            setError('Could not analyse the photo. You can still save the observation.')
        } finally {
            setAnalyzing(false)
        }
    }

    function tagLocation() {
        if (typeof navigator === 'undefined' || !navigator.geolocation) return
        navigator.geolocation.getCurrentPosition(
            (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => setError('Could not get your location.'),
            { enableHighAccuracy: true, timeout: 8000 },
        )
    }

    async function onSave() {
        setSaving(true)
        setError(null)
        try {
            const res = await saveScoutingObservation(fieldId, fieldLabel, {
                category,
                severity,
                notes: notes.trim() || null,
                lat: coords?.lat ?? null,
                lon: coords?.lon ?? null,
                diagnosis: diagnosis ?? undefined,
                source: diagnosis ? 'ai_diagnosis' : 'grower_logged',
            })
            setOutcome(res.status)
            if (res.status === 'submitted') setTimeout(() => router.back(), 1200)
        } catch (err) {
            setError(err instanceof ScoutingValidationError ? err.message : 'Could not save the observation.')
        } finally {
            setSaving(false)
        }
    }

    if (outcome === 'submitted') {
        return <Banner tone="ok" icon={<Check className="size-5" />}>Scouting report saved for {fieldLabel}.</Banner>
    }
    if (outcome === 'queued') {
        return (
            <Banner tone="warn" icon={<CloudOff className="size-5" />}>
                Saved offline. It will upload automatically when you’re back online.
            </Banner>
        )
    }

    return (
        <div className="space-y-4">
            <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />

            {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Scouting" className="w-full rounded-[20px] object-cover shadow-[var(--shadow-neu)]" style={{ maxHeight: 280 }} />
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-3 rounded-[20px] px-6 py-10 shadow-[var(--shadow-neu)] transition-all active:shadow-[var(--shadow-neu-inset)]"
                    style={{ background: 'var(--ee-bg)', color: 'var(--ee-muted)' }}
                >
                    <Camera className="size-8" style={{ color: 'var(--ee-primary)' }} />
                    <span className="text-sm">Take a photo for AI diagnosis (optional)</span>
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

            {diagnosis && (
                <div className="space-y-2 rounded-[20px] p-4 shadow-[var(--shadow-neu)]" style={{ background: 'var(--ee-bg)' }}>
                    <div className="flex items-center gap-2">
                        <Stethoscope className="size-5" style={{ color: 'var(--ee-primary)' }} />
                        <span className="font-semibold" style={{ color: 'var(--ee-text)' }}>Health score: {diagnosis.overall_health_score}/100</span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--ee-text)' }}>{diagnosis.diagnosis_summary}</p>
                    {diagnosis.treatment_recommendations?.length > 0 && (
                        <ul className="list-disc space-y-1 pl-5 text-sm" style={{ color: 'var(--ee-muted)' }}>
                            {diagnosis.treatment_recommendations.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                    )}
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                    <select className={selectClass} style={{ color: 'var(--ee-text)' }} value={category} onChange={(e) => setCategory(e.target.value as ScoutCategory)}>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </Field>
                <Field label="Severity">
                    <select className={selectClass} style={{ color: 'var(--ee-text)' }} value={severity} onChange={(e) => setSeverity(e.target.value as ScoutSeverity)}>
                        {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                </Field>
            </div>

            <Field label="Notes (optional)">
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-[16px] bg-[var(--ee-bg)] px-4 py-2 text-sm shadow-[var(--shadow-neu-inset)] outline-none"
                    style={{ color: 'var(--ee-text)' }}
                    placeholder="What did you see?"
                />
            </Field>

            <Button variant="outline" size="sm" onClick={tagLocation} className="w-full">
                <MapPin className="size-4" />
                {coords ? `Location tagged (${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)})` : 'Tag my location (optional)'}
            </Button>

            {error && <p className="text-sm" style={{ color: '#c44' }}>{error}</p>}

            <Button size="lg" className="w-full" onClick={onSave} disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving ? 'Saving…' : 'Save observation'}
            </Button>
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-xs font-medium" style={{ color: 'var(--ee-muted)' }}>{label}</span>
            {children}
        </label>
    )
}

function Banner({ tone, icon, children }: { tone: 'ok' | 'warn'; icon: React.ReactNode; children: React.ReactNode }) {
    const color = tone === 'ok' ? 'var(--ee-primary)' : '#b8860b'
    return (
        <div className="flex items-center gap-3 rounded-[16px] px-4 py-4 text-sm shadow-[var(--shadow-neu)]" style={{ color, background: 'var(--ee-bg)' }}>
            {icon}
            <span style={{ color: 'var(--ee-text)' }}>{children}</span>
        </div>
    )
}
