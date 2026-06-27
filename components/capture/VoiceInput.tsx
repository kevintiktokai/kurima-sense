'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'

import { createRecognizer, isVoiceSupported, type Recognizer } from '@/lib/voice/speech'

interface Props {
    /** Called with the final transcript when the user finishes speaking. */
    onTranscript: (text: string) => void
    /** Optional live interim transcript (for inline feedback). */
    onInterim?: (text: string) => void
    lang?: string
    className?: string
}

/**
 * A mic toggle that transcribes speech via the Web Speech API. Renders nothing
 * when speech recognition is unsupported (the surrounding form stays usable by
 * typing) — so this is purely additive, never a blocker.
 */
export function VoiceInput({ onTranscript, onInterim, lang, className }: Props) {
    const [supported, setSupported] = useState(false)
    const [listening, setListening] = useState(false)
    const recRef = useRef<Recognizer | null>(null)

    useEffect(() => {
        setSupported(isVoiceSupported())
        return () => recRef.current?.stop()
    }, [])

    if (!supported) return null

    function toggle() {
        if (listening) {
            recRef.current?.stop()
            return
        }
        const rec = createRecognizer({
            lang,
            onResult: (text, isFinal) => {
                if (isFinal) onTranscript(text)
                else onInterim?.(text)
            },
            onError: () => setListening(false),
            onEnd: () => setListening(false),
        })
        if (!rec) return
        recRef.current = rec
        rec.start()
        setListening(true)
    }

    return (
        <button
            type="button"
            onClick={toggle}
            aria-pressed={listening}
            aria-label={listening ? 'Stop voice input' : 'Start voice input'}
            className={`inline-flex size-10 items-center justify-center rounded-full shadow-[var(--shadow-neu)] transition-all active:shadow-[var(--shadow-neu-inset)] ${className ?? ''}`}
            style={{
                background: listening ? 'var(--ee-primary)' : 'var(--ee-bg)',
                color: listening ? '#fff' : 'var(--ee-text)',
            }}
        >
            {listening ? <Mic className="size-4 animate-pulse" /> : <MicOff className="size-4" />}
        </button>
    )
}
