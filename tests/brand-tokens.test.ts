import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Brand token guards.
 *
 * These are lint-shaped rather than unit-shaped, which is unusual for this
 * directory — but the two things below are exactly the kind that get undone by
 * someone reaching for a familiar hex, and neither shows up as a broken test
 * anywhere else. They show up as an inaccessible button in production.
 */

const CSS = readFileSync(join(process.cwd(), 'app/globals.css'), 'utf8')

// ── Relative luminance / contrast, per WCAG 2.1 ──────────────────────────────

function luminance(hex: string): number {
    const h = hex.replace('#', '')
    const channels = [0, 2, 4].map((i) => {
        const c = parseInt(h.slice(i, i + 2), 16) / 255
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
}

function token(name: string): string {
    const match = CSS.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))
    assert.ok(match, `--${name} not found in globals.css`)
    return match![1]
}

test('the primary is the logo green, not the old teal', () => {
    // The teal shared nothing with the mark or with the Velocity Playbook — the
    // two KurimaSense artefacts a client has actually seen.
    assert.equal(token('ee-primary').toLowerCase(), '#6dbe45')
})

test('text on a primary fill meets WCAG AA', () => {
    // The reason --ee-on-primary exists. White on this green is 2.31:1 and
    // fails; it also failed on the old teal at 2.56:1, so the colour change
    // surfaced a pre-existing bug rather than causing one.
    const ratio = contrast(token('ee-primary'), token('ee-on-primary'))
    assert.ok(ratio >= 4.5, `contrast is ${ratio.toFixed(2)}:1, needs 4.5:1`)
})

test('white on a primary fill would not meet WCAG AA', () => {
    // Guards the reasoning, not just the value. If someone lightens the primary
    // far enough that white passes, this test fails and they should reconsider
    // --ee-on-primary deliberately rather than discover it in production.
    const ratio = contrast(token('ee-primary'), '#FFFFFF')
    assert.ok(ratio < 4.5, `white now passes at ${ratio.toFixed(2)}:1 — revisit --ee-on-primary`)
})

// ── No white text on a primary background ────────────────────────────────────

function* tsxFiles(dir: string): Generator<string> {
    for (const entry of readdirSync(dir)) {
        const path = join(dir, entry)
        if (statSync(path).isDirectory()) {
            if (entry === 'node_modules' || entry === '.next') continue
            yield* tsxFiles(path)
        } else if (entry.endsWith('.tsx')) {
            yield path
        }
    }
}

test('no component sets white text on a primary background', () => {
    const offenders: string[] = []
    for (const file of [...tsxFiles('app'), ...tsxFiles('components')]) {
        const lines = readFileSync(file, 'utf8').split('\n')
        lines.forEach((line, index) => {
            const nearby = lines.slice(index, index + 3).join(' ')
            if (
                /background:\s*'var\(--ee-primary\)'/.test(line) &&
                /color:\s*'(#FFFFFF|#ffffff|#fff|white)'/.test(nearby)
            ) {
                offenders.push(`${file}:${index + 1}`)
            }
        })
    }
    assert.deepEqual(offenders, [], `use var(--ee-on-primary): ${offenders.join(', ')}`)
})
