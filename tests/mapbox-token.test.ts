// Mapbox token handling — regression cover for the incident where production
// was built with a SECRET Mapbox token (sk.*). mapbox-gl THROWS from the Map
// constructor on such a token; thrown inside a React effect that reached the
// route error boundary, so /fields/[id] rendered "Something went wrong" and no
// map at all. Run with: npm test (tsx --test).

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { isUsableMapboxToken } from '../lib/mapbox'

// ---------------------------------------------------------------------------
// 1. Token classification
// ---------------------------------------------------------------------------
test('public (pk.*) and temporary (tk.*) tokens are usable', () => {
    assert.equal(isUsableMapboxToken('pk.eyJ1IjoiZGVtbyJ9.abc'), true)
    assert.equal(isUsableMapboxToken('tk.eyJ1IjoiZGVtbyJ9.abc'), true)
    // Deployment UIs love to add whitespace on paste.
    assert.equal(isUsableMapboxToken('  pk.eyJ1IjoiZGVtbyJ9.abc\n'), true)
})

test('REGRESSION: a SECRET token (sk.*) is never treated as usable', () => {
    // This is the exact shape that shipped to production. mapbox-gl rejects it
    // with "Use a public access token (pk.*) ... not a secret access token
    // (sk.*)" — as a THROW, which is why the whole page died rather than just
    // the map. It must never reach mapbox-gl again.
    assert.equal(isUsableMapboxToken('sk.eyJ1IjoiZGVtbyJ9.abc'), false)
})

test('missing / malformed tokens are not usable', () => {
    for (const bad of ['', '   ', 'undefined', 'your-token-here', 'abc123', null, undefined]) {
        assert.equal(isUsableMapboxToken(bad as string | null | undefined), false, `rejects ${JSON.stringify(bad)}`)
    }
})

// ---------------------------------------------------------------------------
// 2. Source invariants — every consumer must go through the validated token
// ---------------------------------------------------------------------------
const MAPBOX_LIB = readFileSync('lib/mapbox.ts', 'utf8')
const FIELD_MAPBOX = readFileSync('components/field/FieldMapbox.tsx', 'utf8')
const FM_MAPBOX = readFileSync('components/dashboard/MapComponentMapbox.tsx', 'utf8')
const ZONE_CARD = readFileSync('components/field/FieldZoneAnalysis.tsx', 'utf8')
const FIELD_MGMT = readFileSync('components/dashboard/FieldManagement.tsx', 'utf8')

test('lib/mapbox is the ONLY place the raw env var is read', () => {
    // A component reading process.env.NEXT_PUBLIC_MAPBOX_TOKEN directly bypasses
    // validation and can hand mapbox-gl a token that makes it throw.
    for (const [name, src] of Object.entries({ FIELD_MAPBOX, FM_MAPBOX, ZONE_CARD, FIELD_MGMT })) {
        assert.ok(
            !/process\.env\.NEXT_PUBLIC_MAPBOX_TOKEN/.test(src),
            `${name} must import from lib/mapbox, not read the env var directly`
        )
    }
    assert.match(MAPBOX_LIB, /process\.env\.NEXT_PUBLIC_MAPBOX_TOKEN/)
})

test('both map implementations import the validated token', () => {
    assert.match(FIELD_MAPBOX, /from '@\/lib\/mapbox'/)
    assert.match(FM_MAPBOX, /from '@\/lib\/mapbox'/)
})

// ---------------------------------------------------------------------------
// 3. A map that cannot start must degrade, not escalate
// ---------------------------------------------------------------------------
test('map construction is wrapped so a throw cannot reach the error boundary', () => {
    for (const [name, src] of Object.entries({ FIELD_MAPBOX, FM_MAPBOX })) {
        // The constructor call must sit inside a try block with a catch that
        // reports upward instead of letting the exception propagate.
        assert.match(src, /try\s*\{[\s\S]{0,600}new mapboxgl\.Map\(/, `${name} guards new mapboxgl.Map`)
        assert.match(src, /catch\s*\(err\)[\s\S]{0,300}onInitErrorRef\.current\?\.\(err\)/, `${name} reports init failure`)
        // An unhandled 'error' event is re-raised by mapbox-gl.
        assert.match(src, /map\.on\('error'/, `${name} handles async map errors`)
    }
})

test('both callers can fall back to the Leaflet map at runtime', () => {
    for (const [name, src] of Object.entries({ ZONE_CARD, FIELD_MGMT })) {
        assert.match(src, /MAPBOX_ENABLED/, `${name} gates on the validated flag`)
        assert.match(src, /onInitError=\{\(\) => set[A-Za-z]*[Ff]ailed\(true\)\}/, `${name} swaps engines on failure`)
    }
})

// ---------------------------------------------------------------------------
// 4. The field page must not crash on a partial field-state payload
// ---------------------------------------------------------------------------
test('field page never dereferences kurima_score unguarded', () => {
    const PAGE = readFileSync('app/fields/[id]/page.tsx', 'utf8')
    // `fs.kurima_score.score` (no optional chaining) threw a TypeError on any
    // payload missing the block, which the route error boundary turned into
    // the same "Something went wrong" screen.
    assert.ok(
        !/fs\.kurima_score\./.test(PAGE),
        'read kurima_score through the null-checked `ks` local, not fs.kurima_score.x'
    )
    assert.match(PAGE, /const ks = fs\.kurima_score \?\? null/)
})
