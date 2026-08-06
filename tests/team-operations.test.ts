/**
 * Team operations (institutional): assignee chips + assignee filtering, and
 * source-invariant wiring checks for the new Team page and field-detail
 * management cards.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
    deriveAssigneeChips, filterByAssignee,
    type PortfolioPriority,
} from '../lib/portfolio-utils'

const p = (id: string): PortfolioPriority => ({
    field_id: id, field_name: `F${id}`, grower_id: null, grower_name: null,
    district: null, natural_region: null, crop_type: 'maize', variety: null,
    size_hectares: 1, kurima_score: 70, kurima_label: 'Good', kurima_color: '#6DBE45',
    primary_concern: '', recommended_action: '', urgency: 'none' as never,
    days_since_observation: 1, planting_date: null, days_since_planting: null,
})

const assignments = [
    { field_id: 'a', assignee_user_id: 'u1', assignee_name: 'Blessing' },
    { field_id: 'b', assignee_user_id: 'u1', assignee_name: 'Blessing' },
    { field_id: 'c', assignee_user_id: 'u2', assignee_name: null },
]

test('deriveAssigneeChips counts fields per assignee and sorts by name', () => {
    const chips = deriveAssigneeChips(assignments, (id) => (id === 'u2' ? 'Anesu' : null))
    assert.deepEqual(chips.map((c) => c.name), ['Anesu', 'Blessing'])
    assert.deepEqual(chips.map((c) => c.count), [1, 2])
})

test('deriveAssigneeChips falls back to a user-id stub when no name resolves', () => {
    const chips = deriveAssigneeChips(
        [{ field_id: 'x', assignee_user_id: 'deadbeef-0000', assignee_name: null }],
        () => null,
    )
    assert.equal(chips[0].name, 'User deadbeef')
})

test('deriveAssigneeChips handles undefined input', () => {
    assert.deepEqual(deriveAssigneeChips(undefined, () => null), [])
})

test('filterByAssignee restricts to actively-assigned fields', () => {
    const rows = [p('a'), p('b'), p('c'), p('d')]
    assert.deepEqual(filterByAssignee(rows, 'u1', assignments).map((r) => r.field_id), ['a', 'b'])
    assert.deepEqual(filterByAssignee(rows, 'u2', assignments).map((r) => r.field_id), ['c'])
})

test('filterByAssignee with empty assignee is a no-op', () => {
    const rows = [p('a'), p('d')]
    assert.equal(filterByAssignee(rows, '', assignments), rows)
})

// ── Source-invariant wiring checks ───────────────────────────────────────────

const teamPageSrc = readFileSync(new URL('../app/portfolio/team/page.tsx', import.meta.url), 'utf8')
const fieldDetailSrc = readFileSync(new URL('../app/portfolio/fields/[id]/page.tsx', import.meta.url), 'utf8')
const manageCardSrc = readFileSync(new URL('../components/portfolio/FieldManageCard.tsx', import.meta.url), 'utf8')

test('team page wires the members hook and invite mutations', () => {
    assert.match(teamPageSrc, /useTeamMembers\(/)
    assert.match(teamPageSrc, /createInvite\(/)
    assert.match(teamPageSrc, /updateMember\(/)
    assert.match(teamPageSrc, /removeMember\(/)
})

test('institutional field detail mounts management, yield, soil and activities', () => {
    assert.match(fieldDetailSrc, /<FieldManageCard/)
    assert.match(fieldDetailSrc, /<YieldProjectionCard/)
    assert.match(fieldDetailSrc, /<SoilProfileCard/)
    assert.match(fieldDetailSrc, /<FieldActivityTimeline/)
})

test('field deletion is name-confirmed (two-step safeguard)', () => {
    assert.match(manageCardSrc, /deleteText\.trim\(\) !== fieldName/)
})

test('field editing reuses the shared consumer crop picker and PATCH API', () => {
    assert.match(manageCardSrc, /CropSearchSelect/)
    assert.match(manageCardSrc, /api\.updateField\(/)
})
