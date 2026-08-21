import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * Lint-shaped, like the backend's secret-comparison guard, and for the same
 * reason: a raw `fetch` does not fail anything. It just has no deadline, so on
 * a mobile network a hung socket never rejects, the promise never settles, and
 * the user watches a spinner until they close the app.
 *
 * That is not hypothetical here — it is the bug that started this work. There
 * were 58 raw call sites across 19 files and not one timeout among them.
 *
 * `lib/http.ts` is the one place allowed to call the platform `fetch`.
 */

// `npm test` runs from the repo root. import.meta.dirname is not available
// under tsx's CJS transpile.
const ROOT = process.cwd()

/** Directories that ship to the browser. */
const SCANNED = ['app', 'components', 'hooks', 'lib', 'services']

/**
 * `lib/http.ts` *is* the wrapper. Service workers get their own fetch
 * (`self.addEventListener('fetch')`) and are not part of this.
 */
const ALLOWED = new Set(['lib/http.ts'])

function* sourceFiles(dir: string): Generator<string> {
    for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules' || entry.startsWith('.')) continue
        const full = join(dir, entry)
        if (statSync(full).isDirectory()) {
            yield* sourceFiles(full)
        } else if (/\.tsx?$/.test(entry)) {
            yield full
        }
    }
}

/**
 * The global `fetch` referenced as a value — called *or* passed.
 *
 * Both matter, and the second is the easier one to miss. An injectable seam
 * declared `fetchImpl: typeof fetch = fetch` reads as harmless and is not: the
 * default is the undeadlined global, so every production call through that
 * seam is exactly the request that hangs. Tests inject a stub and never see it.
 *
 * Excluded: a preceding `.` or identifier character (`globalThis.fetch`,
 * `resilientFetch`), and `typeof fetch`, which is a type reference and carries
 * no runtime behaviour.
 */
const RAW_FETCH = new RegExp(
    [
        // Called: `await fetch(url)`. The lookbehind excludes `apiFetch(`,
        // `resilientFetch(`, `fetchImpl(` and `globalThis.fetch(`.
        String.raw`(?<![.\w$])fetch\s*\(`,
        // Passed: `fetchImpl: typeof fetch = fetch,`. Only the value after the
        // `=` is flagged — `typeof fetch` on the left is a type.
        String.raw`=\s*fetch\s*[,)]`,
    ].join('|'),
)

/**
 * Remove comments and quoted strings before matching.
 *
 * This codebase says "fetch" in prose constantly — `Failed to fetch user`,
 * `/failed to fetch|networkerror/`, `{/* self-contained fetch *\/}`. Matching
 * those would produce 20 false positives against 5 real ones, and a guard with
 * that ratio gets suppressed rather than obeyed.
 */
export function stripComments(line: string): string {
    const trimmed = line.trimStart()
    if (trimmed.startsWith('*') || trimmed.startsWith('/*') || trimmed.startsWith('{/*')) return ''
    return line
        .replace(/\/\/.*$/, '')
        .replace(/\/\*.*?\*\//g, '')
        .replace(/'(?:[^'\\]|\\.)*'/g, "''")
        .replace(/"(?:[^"\\]|\\.)*"/g, '""')
        // A regex literal, which is where the network-error sniffing lives.
        .replace(/\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, '//')
}

function rawFetchCallSites(): string[] {
    const offenders: string[] = []
    for (const dir of SCANNED) {
        for (const file of sourceFiles(join(ROOT, dir))) {
            const rel = relative(ROOT, file)
            if (ALLOWED.has(rel)) continue
            const source = readFileSync(file, 'utf8')
            source.split('\n').forEach((line, i) => {
                if (RAW_FETCH.test(stripComments(line))) offenders.push(`${rel}:${i + 1}`)
            })
        }
    }
    return offenders
}

test('nothing outside lib/http.ts calls the platform fetch directly', () => {
    const offenders = rawFetchCallSites()
    assert.deepEqual(
        offenders,
        [],
        'these requests have no deadline and no retry — route them through ' +
            `lib/http.ts (apiFetch, resilientFetch or streamFetch):\n  ${offenders.join('\n  ')}`,
    )
})

test('the guard can actually see a violation', () => {
    // A test that passes because it matches nothing is worse than no test.
    // Both of these were live in this repo when the guard was written.
    for (const violation of [
        '    const r = await fetch(url)',
        '    fetchImpl: typeof fetch = fetch,',
        '    return fetch(`${API_BASE_URL}${path}`, init)',
    ]) {
        assert.match(stripComments(violation), RAW_FETCH, violation)
    }
})

test('the guard does not fire on the wrappers or on type positions', () => {
    // A guard that cries wolf gets deleted, and then the real one comes back.
    for (const fine of [
        '  await apiFetch(url)',
        '  await resilientFetch(url)',
        '  await streamFetch(url)',
        '  await fetchImpl(url, init)',
        '  fetchImpl: typeof fetch = resilientFetch,',
        '  globalThis.fetch = stub',
        '  // Data fetch (auth + fetch injected so this stays testable)',
        '   * A drop-in replacement for `fetch` that adds the deadline.',
        // Prose. This repo says "fetch" constantly and none of it is a call.
        `  if (!res.ok) throw new Error('Failed to fetch user')`,
        `  if (/failed to fetch|networkerror/i.test(raw)) {`,
        '  {/* Soil Intelligence (additive; self-contained fetch, silent) */}',
        `  console.error('[DashboardData] fetch error:', e)`,
    ]) {
        assert.doesNotMatch(stripComments(fine), RAW_FETCH, fine)
    }
})
