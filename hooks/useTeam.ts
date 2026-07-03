'use client'

/**
 * useTeam / useTeamActivity / useFieldActivities / useFieldAssignments —
 * data sources + mutation helpers for the institutional operations backend
 * (migration 013): team members & invites, agronomist field activities, and
 * field assignments. Mirrors the useGrowers pattern: SWR reads, plain async
 * mutations, callers refresh after success.
 */

import useSWR, { mutate as globalMutate } from 'swr'
import { getAuthHeaders } from '@/lib/api-cache'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const MEMBERS_URL = `${API_BASE_URL}/team/members`
const INVITES_URL = `${API_BASE_URL}/team/invites`

// ─── Types (mirror backend schemas) ──────────────────────────────────────────

export type MemberRole =
    | 'owner' | 'admin' | 'manager' | 'agronomist'
    | 'field_officer' | 'analyst' | 'officer' | 'viewer'

export const GRANTABLE_ROLES: MemberRole[] = [
    'admin', 'manager', 'agronomist', 'field_officer', 'analyst', 'viewer',
]

export const ROLE_LABELS: Record<MemberRole, string> = {
    owner: 'Owner', admin: 'Administrator', manager: 'Manager',
    agronomist: 'Agronomist', field_officer: 'Field Officer',
    analyst: 'Analyst', officer: 'Officer', viewer: 'Viewer',
}

export interface TeamMember {
    user_id: string
    member_role: MemberRole
    status: 'active' | 'suspended'
    display_name: string | null
    email: string | null
    full_name: string | null
    joined_at: string | null
    assigned_fields: number
    activities_30d: number
}

export function memberName(m: Pick<TeamMember, 'display_name' | 'full_name' | 'email' | 'user_id'>): string {
    return m.display_name || m.full_name || m.email || `User ${m.user_id.slice(0, 8)}`
}

export interface TeamInvite {
    id: string
    email: string | null
    member_role: string
    code: string
    created_at: string | null
    accepted_at: string | null
    revoked_at: string | null
}

export type ActivityType =
    | 'visit' | 'inspection' | 'recommendation' | 'fertilizer_advice'
    | 'chemical_advice' | 'irrigation_advice' | 'pest_observation'
    | 'disease_observation' | 'consultation' | 'note' | 'other'

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
    visit: 'Field visit', inspection: 'Crop inspection', recommendation: 'Recommendation',
    fertilizer_advice: 'Fertilizer advice', chemical_advice: 'Chemical advice',
    irrigation_advice: 'Irrigation advice', pest_observation: 'Pest observation',
    disease_observation: 'Disease observation', consultation: 'Farmer consultation',
    note: 'Note', other: 'Other',
}

export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
    visit: 'directions_walk', inspection: 'search', recommendation: 'tips_and_updates',
    fertilizer_advice: 'science', chemical_advice: 'sanitizer',
    irrigation_advice: 'water_drop', pest_observation: 'pest_control',
    disease_observation: 'coronavirus', consultation: 'forum',
    note: 'sticky_note_2', other: 'more_horiz',
}

export interface FieldActivity {
    id: string
    field_id: string
    user_id: string
    author_name: string | null
    activity_type: ActivityType
    title: string
    notes: string | null
    recommendation: string | null
    visit_date: string | null
    lat: number | null
    lon: number | null
    photo_url: string | null
    created_at: string | null
    field_name: string | null
}

export interface CreateActivityPayload {
    activity_type: ActivityType
    title: string
    notes?: string
    recommendation?: string
    visit_date?: string
    lat?: number
    lon?: number
}

export interface FieldAssignment {
    id: string
    field_id: string
    assignee_user_id: string
    assignee_name: string | null
    assigned_by_user_id: string | null
    note: string | null
    assigned_at: string | null
    unassigned_at: string | null
}

export interface ActiveAssignment {
    field_id: string
    assignee_user_id: string
    assignee_name: string | null
}

// ─── Shared fetch plumbing ───────────────────────────────────────────────────

async function errorFor(res: Response, fallback: string): Promise<Error> {
    let detail = ''
    try { detail = (await res.json())?.detail || '' } catch { /* ignore */ }
    if (res.status === 403) return new Error(detail || "You don't have permission to do that")
    return new Error(detail || `${fallback} (${res.status})`)
}

async function getJSON<T>(url: string, fallback: string): Promise<T> {
    const headers = await getAuthHeaders()
    const res = await fetch(url, { headers })
    if (!res.ok) throw await errorFor(res, fallback)
    return (await res.json()) as T
}

async function sendJSON<T>(url: string, method: string, body: unknown, fallback: string): Promise<T> {
    const headers = await getAuthHeaders()
    const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
    if (!res.ok) throw await errorFor(res, fallback)
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
}

// ─── Team members ────────────────────────────────────────────────────────────

export function useTeamMembers() {
    const { data, error, isLoading, mutate } = useSWR<TeamMember[]>(
        MEMBERS_URL, (u: string) => getJSON<TeamMember[]>(u, 'Failed to load team'),
        { revalidateOnFocus: true, dedupingInterval: 30_000 },
    )
    return { members: data, isLoading, error: error as Error | undefined, refresh: () => { void mutate() } }
}

export const refreshTeam = () => { void globalMutate(MEMBERS_URL); void globalMutate(INVITES_URL) }

export const addMember = (payload: { user_id: string; member_role: MemberRole; display_name?: string; email?: string }) =>
    sendJSON<TeamMember>(MEMBERS_URL, 'POST', payload, 'Failed to add member')

export const updateMember = (userId: string, payload: { member_role?: MemberRole; status?: 'active' | 'suspended'; display_name?: string }) =>
    sendJSON<TeamMember>(`${MEMBERS_URL}/${userId}`, 'PATCH', payload, 'Failed to update member')

export const removeMember = (userId: string) =>
    sendJSON<void>(`${MEMBERS_URL}/${userId}`, 'DELETE', undefined, 'Failed to remove member')

// ─── Invites ─────────────────────────────────────────────────────────────────

export function useTeamInvites(enabled: boolean) {
    const { data, error, isLoading, mutate } = useSWR<TeamInvite[]>(
        enabled ? INVITES_URL : null, (u: string) => getJSON<TeamInvite[]>(u, 'Failed to load invites'),
        { revalidateOnFocus: false, dedupingInterval: 30_000 },
    )
    return { invites: data, isLoading, error: error as Error | undefined, refresh: () => { void mutate() } }
}

export const createInvite = (payload: { email?: string; member_role: MemberRole }) =>
    sendJSON<TeamInvite>(INVITES_URL, 'POST', payload, 'Failed to create invite')

export const revokeInvite = (inviteId: string) =>
    sendJSON<void>(`${INVITES_URL}/${inviteId}`, 'DELETE', undefined, 'Failed to revoke invite')

export const acceptInvite = (code: string) =>
    sendJSON<{ status: string }>(`${INVITES_URL}/accept`, 'POST', { code }, 'Failed to accept invite')

// ─── Field activities ────────────────────────────────────────────────────────

const activitiesUrl = (fieldId: string) => `${API_BASE_URL}/fields/${fieldId}/activities`

export function useFieldActivities(fieldId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<FieldActivity[]>(
        fieldId ? activitiesUrl(fieldId) : null,
        (u: string) => getJSON<FieldActivity[]>(u, 'Failed to load activities'),
        { revalidateOnFocus: false, dedupingInterval: 15_000 },
    )
    return { activities: data, isLoading, error: error as Error | undefined, refresh: () => { void mutate() } }
}

export const createActivity = (fieldId: string, payload: CreateActivityPayload) =>
    sendJSON<FieldActivity>(activitiesUrl(fieldId), 'POST', payload, 'Failed to log activity')

export const deleteActivity = (activityId: string) =>
    sendJSON<void>(`${API_BASE_URL}/activities/${activityId}`, 'DELETE', undefined, 'Failed to delete activity')

export const refreshFieldActivities = (fieldId: string) => { void globalMutate(activitiesUrl(fieldId)) }

export function useTeamActivity() {
    const { data, error, isLoading, mutate } = useSWR<FieldActivity[]>(
        `${API_BASE_URL}/team/activity`,
        (u: string) => getJSON<FieldActivity[]>(u, 'Failed to load team activity'),
        { revalidateOnFocus: true, dedupingInterval: 30_000 },
    )
    return { activity: data, isLoading, error: error as Error | undefined, refresh: () => { void mutate() } }
}

// ─── Assignments ─────────────────────────────────────────────────────────────

const assignmentsUrl = (fieldId: string) => `${API_BASE_URL}/fields/${fieldId}/assignments`
const ALL_ASSIGNMENTS_URL = `${API_BASE_URL}/team/assignments`

export function useFieldAssignments(fieldId: string | null) {
    const { data, error, isLoading, mutate } = useSWR<FieldAssignment[]>(
        fieldId ? assignmentsUrl(fieldId) : null,
        (u: string) => getJSON<FieldAssignment[]>(u, 'Failed to load assignments'),
        { revalidateOnFocus: false, dedupingInterval: 15_000 },
    )
    const active = (data ?? []).find((a) => !a.unassigned_at) ?? null
    return { assignments: data, active, isLoading, error: error as Error | undefined, refresh: () => { void mutate() } }
}

export function useActiveAssignments() {
    const { data, error, isLoading, mutate } = useSWR<{ assignments: ActiveAssignment[] }>(
        ALL_ASSIGNMENTS_URL,
        (u: string) => getJSON<{ assignments: ActiveAssignment[] }>(u, 'Failed to load assignments'),
        { revalidateOnFocus: false, dedupingInterval: 30_000 },
    )
    return { assignments: data?.assignments, isLoading, error: error as Error | undefined, refresh: () => { void mutate() } }
}

export const assignField = (fieldId: string, assigneeUserId: string | null, note?: string) =>
    sendJSON<FieldAssignment | null>(
        `${API_BASE_URL}/fields/${fieldId}/assign`, 'POST',
        { assignee_user_id: assigneeUserId, note }, 'Failed to assign field',
    )

export const refreshAssignments = (fieldId?: string) => {
    void globalMutate(ALL_ASSIGNMENTS_URL)
    void globalMutate(MEMBERS_URL) // workload counts changed
    if (fieldId) void globalMutate(assignmentsUrl(fieldId))
}
