// Thin wrapper around the browser Web Speech API (SpeechRecognition).
// Pure-ish: no React. Returns null when unsupported (Safari iOS partial; we
// degrade gracefully to typing). Phrase parsing lives in parse.ts.

'use client'

// Minimal typings — the DOM lib doesn't ship SpeechRecognition types.
interface SpeechRecognitionLike {
    lang: string
    continuous: boolean
    interimResults: boolean
    start(): void
    stop(): void
    abort(): void
    onresult: ((event: SpeechRecognitionEventLike) => void) | null
    onerror: ((event: { error: string }) => void) | null
    onend: (() => void) | null
}
interface SpeechRecognitionEventLike {
    resultIndex: number
    results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getCtor(): SpeechRecognitionCtor | null {
    if (typeof window === 'undefined') return null
    const w = window as unknown as {
        SpeechRecognition?: SpeechRecognitionCtor
        webkitSpeechRecognition?: SpeechRecognitionCtor
    }
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isVoiceSupported(): boolean {
    return getCtor() !== null
}

export interface Recognizer {
    start(): void
    stop(): void
}

export interface RecognizerOptions {
    lang?: string
    /** Fires with cumulative transcript; isFinal=true on a settled phrase. */
    onResult: (transcript: string, isFinal: boolean) => void
    onError?: (error: string) => void
    onEnd?: () => void
}

export function createRecognizer(opts: RecognizerOptions): Recognizer | null {
    const Ctor = getCtor()
    if (!Ctor) return null

    const rec = new Ctor()
    rec.lang = opts.lang ?? 'en-US'
    rec.continuous = false
    rec.interimResults = true

    rec.onresult = (event) => {
        let transcript = ''
        let isFinal = false
        for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript
            if (event.results[i].isFinal) isFinal = true
        }
        opts.onResult(transcript.trim(), isFinal)
    }
    rec.onerror = (e) => opts.onError?.(e.error)
    rec.onend = () => opts.onEnd?.()

    return {
        start: () => rec.start(),
        stop: () => rec.stop(),
    }
}
