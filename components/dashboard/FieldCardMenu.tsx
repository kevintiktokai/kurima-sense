'use client'

/**
 * The per-field actions menu on a field card.
 *
 * Replaces two bare icon buttons that were `opacity-0 group-hover:opacity-100`
 * — invisible until hover. A phone has no hover, and a phone at the edge of a
 * field is the primary way this app is used, so on the device that matters most
 * those controls were not merely hard to find: they were unreachable. Tapping
 * roughly where they sit hit the card underneath and navigated away instead.
 *
 * So: one control that is always visible, and destructive actions folded inside
 * it rather than sitting a stray tap away from a field's whole history.
 *
 * Delete stays behind the card's existing confirmation step. Two deliberate
 * acts to destroy a season of observations is the right number.
 */

import { useEffect, useRef, useState } from 'react'

export interface FieldCardMenuProps {
    fieldName: string
    onEdit: () => void
    onDelete: () => void
}

export function FieldCardMenu({ fieldName, onEdit, onDelete }: FieldCardMenuProps) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (!open) return

        function onPointerDown(event: MouseEvent | TouchEvent) {
            if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
        }
        function onKeyDown(event: KeyboardEvent) {
            if (event.key !== 'Escape') return
            setOpen(false)
            // Return focus to the trigger, or the keyboard user is stranded at
            // the top of the document with no idea where they were.
            triggerRef.current?.focus()
        }

        document.addEventListener('mousedown', onPointerDown)
        document.addEventListener('touchstart', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('mousedown', onPointerDown)
            document.removeEventListener('touchstart', onPointerDown)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [open])

    // Every handler stops propagation: the whole card is a click target that
    // navigates to the field, so without this, opening the menu opens the field.
    const swallow = (event: React.MouseEvent) => event.stopPropagation()

    return (
        <div ref={containerRef} className="relative flex-shrink-0" onClick={swallow}>
            <button
                ref={triggerRef}
                type="button"
                onClick={(e) => { swallow(e); setOpen((v) => !v) }}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={`Options for ${fieldName}`}
                // 36px: comfortably above the 24px minimum touch target, on a
                // card a farmer taps with gloves on.
                className="flex items-center justify-center rounded-lg transition-colors"
                style={{
                    width: 36,
                    height: 36,
                    background: open ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.75)',
                }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    more_vert
                </span>
            </button>

            {open && (
                <div
                    role="menu"
                    aria-label={`Options for ${fieldName}`}
                    className="absolute right-0 mt-1 rounded-xl overflow-hidden z-20"
                    style={{
                        minWidth: 168,
                        background: '#25301F',
                        border: '1px solid rgba(255,255,255,0.12)',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
                    }}
                >
                    <button
                        type="button"
                        role="menuitem"
                        onClick={(e) => { swallow(e); setOpen(false); onEdit() }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-bold transition-colors"
                        style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-body)' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                        Edit field
                    </button>

                    <button
                        type="button"
                        role="menuitem"
                        onClick={(e) => { swallow(e); setOpen(false); onDelete() }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-bold transition-colors"
                        style={{
                            color: '#F08A8A',
                            fontFamily: 'var(--font-body)',
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                        Delete field
                    </button>
                </div>
            )}
        </div>
    )
}

export default FieldCardMenu
