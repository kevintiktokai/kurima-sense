import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * No control is hidden behind hover.
 *
 * The field card carried its edit and delete buttons as:
 *
 *     className="opacity-0 group-hover:opacity-100 transition-opacity …"
 *
 * which is invisible until a pointer hovers the card. A phone has no hover, and
 * a phone at the edge of a field is how this app is actually used — so on the
 * device that matters most those controls were not merely hard to find, they
 * were unreachable. Worse than absent: a farmer tapping where they sit hit the
 * card underneath and got navigated away from what they were doing.
 *
 * Touch browsers do emulate `:hover` on tap for some layouts, which is exactly
 * what makes this hard to catch — it half-works on a phone in a way that looks
 * like the user mis-tapped rather than like a bug.
 *
 * Hover may reveal *decoration*. It may not be the only way to reach an action.
 */

const ROOT = process.cwd()
const SCANNED = ['app', 'components']

/** The pattern: an element that is transparent until the group is hovered. */
const HOVER_ONLY = /opacity-0[^"'`]*group-hover:opacity-100|group-hover:opacity-100[^"'`]*opacity-0/

/** Interactive elements. A hidden `<div>` is decoration; a hidden button is not. */
const INTERACTIVE = /<(button|a|input|select|textarea)\b/

function* sourceFiles(dir: string): Generator<string> {
    for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry.startsWith('.')) continue
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) yield* sourceFiles(full)
        else if (/\.tsx$/.test(entry)) yield full
    }
}

/**
 * Lines where a hover-only class sits on or just above an interactive element.
 *
 * JSX splits an element across lines, so the class and the tag are rarely on
 * the same one. A small window around the match catches the common shapes
 * without reimplementing a parser.
 */
function hoverOnlyControls(): string[] {
    const offenders: string[] = []
    for (const dir of SCANNED) {
        for (const file of sourceFiles(join(ROOT, dir))) {
            const lines = readFileSync(file, 'utf8').split('\n')
            lines.forEach((line, i) => {
                if (!HOVER_ONLY.test(line)) return
                const window = lines.slice(Math.max(0, i - 6), i + 3).join('\n')
                if (INTERACTIVE.test(window)) {
                    offenders.push(`${relative(ROOT, file)}:${i + 1}`)
                }
            })
        }
    }
    return offenders
}

test('no interactive control is reachable only on hover', () => {
    const offenders = hoverOnlyControls()
    assert.deepEqual(
        offenders,
        [],
        'these controls are invisible on any touch device, which is how this app ' +
            `is mostly used:\n  ${offenders.join('\n  ')}`,
    )
})

test('the guard can see the pattern it was written for', () => {
    // The exact class string that shipped on the field card.
    const shipped = 'className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full"'
    assert.match(shipped, HOVER_ONLY)
    // ...and the reversed ordering, which reads identically to a human.
    assert.match('className="group-hover:opacity-100 opacity-0"', HOVER_ONLY)
})

test('hover-revealed decoration is still allowed', () => {
    // The rule is about reaching actions, not about hover effects. A decorative
    // overlay that fades in on hover takes nothing away from a touch user.
    const decoration = '<div className="opacity-0 group-hover:opacity-100 pointer-events-none" />'
    assert.match(decoration, HOVER_ONLY)
    assert.doesNotMatch(decoration, INTERACTIVE)
})
