'use client'

/**
 * /portfolio/team — organisational user & team management.
 *
 * Roster of tenant members with role, status, and workload (assigned fields,
 * 30-day activity). Owners/admins can invite teammates (code-based invites —
 * share the code via WhatsApp/SMS; the teammate signs up and redeems it),
 * change roles, suspend/reactivate, and remove members. Safeguards (no
 * self-demotion, last-admin protection) are enforced by the backend and
 * surfaced here as friendly errors.
 */

import { useMemo, useState } from 'react'
import {
    useTeamMembers, useTeamInvites, refreshTeam,
    updateMember, removeMember, createInvite, revokeInvite,
    memberName, GRANTABLE_ROLES, ROLE_LABELS,
    type TeamMember, type MemberRole,
} from '@/hooks/useTeam'
import { useUserRole } from '@/hooks/useUserRole'
import { PageContainer } from '@/components/layout/PageContainer'
import { PortfolioPageHeader } from '@/components/portfolio/PortfolioPageHeader'

// ─── Small bits ───────────────────────────────────────────────────────────────

function RoleChip({ role }: { role: MemberRole }) {
    const managerial = role === 'owner' || role === 'admin'
    return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
            style={managerial
                ? { background: 'var(--ee-primary)', color: 'var(--ee-on-primary)' }
                : { background: 'var(--ee-bg)', color: 'var(--ee-muted)' }}>
            {ROLE_LABELS[role] ?? role}
        </span>
    )
}

function StatusChip({ status }: { status: 'active' | 'suspended' }) {
    if (status === 'active') return null
    return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
            style={{ background: 'rgba(220,38,38,0.10)', color: '#dc2626' }}>
            Suspended
        </span>
    )
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
    return (
        <div className="flex items-center justify-between gap-3 p-4 rounded-[16px] mb-4"
            style={{ background: 'rgba(220,38,38,0.08)' }} role="alert">
            <p className="text-sm font-bold" style={{ color: '#dc2626' }}>{message}</p>
            <button onClick={onDismiss} aria-label="Dismiss">
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#dc2626' }}>close</span>
            </button>
        </div>
    )
}

// ─── Invite creation modal ───────────────────────────────────────────────────

function InviteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
    const [email, setEmail] = useState('')
    const [role, setRole] = useState<MemberRole>('field_officer')
    const [pending, setPending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [createdCode, setCreatedCode] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const submit = async () => {
        setPending(true); setError(null)
        try {
            const invite = await createInvite({ email: email.trim() || undefined, member_role: role })
            setCreatedCode(invite.code)
            onCreated()
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create invite')
        } finally {
            setPending(false)
        }
    }

    const copy = async () => {
        if (!createdCode) return
        try { await navigator.clipboard.writeText(createdCode); setCopied(true) } catch { /* ignore */ }
    }

    const inputStyle = {
        background: 'var(--ee-bg)', color: 'var(--ee-text)',
        fontFamily: 'var(--font-body)', boxShadow: 'var(--shadow-neu-inset)', border: 'none',
    } as const

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
            style={{ background: 'rgba(45,58,48,0.4)', backdropFilter: 'blur(8px)' }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className="w-full max-w-md p-7 rounded-[24px]" style={{ background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}>
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-xl font-black" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                        Invite a teammate
                    </h3>
                    <button onClick={onClose} className="p-1" aria-label="Close">
                        <span className="material-symbols-outlined" style={{ color: 'var(--ee-muted)' }}>close</span>
                    </button>
                </div>

                {createdCode ? (
                    <div className="text-center py-2">
                        <p className="text-sm mb-4" style={{ color: 'var(--ee-muted)' }}>
                            Share this code with your teammate. They sign up to KurimaSense, then enter it
                            under <span className="font-bold">Settings → Join an organisation</span>.
                        </p>
                        <div className="flex items-center justify-center gap-2 mb-5">
                            <span className="px-5 py-3 rounded-[16px] text-2xl font-black tracking-[0.2em]"
                                style={{ background: 'var(--ee-bg)', color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                {createdCode}
                            </span>
                            <button onClick={copy} className="p-3 rounded-full" aria-label="Copy code"
                                style={{ background: 'var(--ee-bg)' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 20, color: copied ? 'var(--ee-primary)' : 'var(--ee-muted)' }}>
                                    {copied ? 'check' : 'content_copy'}
                                </span>
                            </button>
                        </div>
                        <button onClick={onClose}
                            className="px-6 py-3 rounded-full font-bold text-sm"
                            style={{ background: 'var(--ee-primary)', color: 'var(--ee-on-primary)' }}>
                            Done
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--ee-muted)' }}>
                                Email (optional — for your records)
                            </label>
                            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
                                placeholder="teammate@example.com"
                                className="w-full px-4 py-3 rounded-[14px] text-sm" style={inputStyle} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--ee-muted)' }}>
                                Role
                            </label>
                            <select value={role} onChange={(e) => setRole(e.target.value as MemberRole)}
                                className="w-full px-4 py-3 rounded-[14px] text-sm" style={inputStyle}>
                                {GRANTABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </select>
                        </div>
                        {error && <p className="text-sm font-bold" style={{ color: '#dc2626' }}>{error}</p>}
                        <button onClick={submit} disabled={pending}
                            className="w-full py-3.5 rounded-full font-black text-sm disabled:opacity-50"
                            style={{ background: 'var(--ee-primary)', color: 'var(--ee-on-primary)', fontFamily: 'var(--font-heading)' }}>
                            {pending ? 'Creating…' : 'Create invite code'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({ member, canManage, isSelf, onError }: {
    member: TeamMember; canManage: boolean; isSelf: boolean; onError: (m: string) => void
}) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [confirmRemove, setConfirmRemove] = useState(false)
    const [pending, setPending] = useState(false)

    const act = async (fn: () => Promise<unknown>) => {
        setPending(true)
        try { await fn(); refreshTeam() } catch (e) { onError(e instanceof Error ? e.message : 'Action failed') }
        finally { setPending(false); setMenuOpen(false); setConfirmRemove(false) }
    }

    return (
        <div className="flex items-center gap-4 p-5"
            style={{ background: 'var(--ee-surface)', borderRadius: '20px', boxShadow: 'var(--shadow-neu)', opacity: member.status === 'suspended' ? 0.65 : 1 }}>
            {/* Avatar */}
            <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm"
                style={{ background: 'var(--ee-primary)', color: 'var(--ee-on-primary)', fontFamily: 'var(--font-heading)' }}>
                {memberName(member).slice(0, 2).toUpperCase()}
            </div>

            {/* Identity + workload */}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black truncate" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                        {memberName(member)}{isSelf && <span className="font-bold text-xs" style={{ color: 'var(--ee-muted)' }}> (you)</span>}
                    </p>
                    <RoleChip role={member.member_role} />
                    <StatusChip status={member.status} />
                </div>
                <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--ee-muted)' }}>
                    {member.assigned_fields} field{member.assigned_fields === 1 ? '' : 's'} assigned
                    {' · '}{member.activities_30d} activit{member.activities_30d === 1 ? 'y' : 'ies'} in 30 days
                    {member.email ? ` · ${member.email}` : ''}
                </p>
            </div>

            {/* Actions */}
            {canManage && !isSelf && (
                <div className="relative flex-shrink-0">
                    <button onClick={() => setMenuOpen((v) => !v)} disabled={pending}
                        className="p-2 rounded-full disabled:opacity-50" aria-label="Member actions"
                        style={{ background: 'var(--ee-bg)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--ee-muted)' }}>more_vert</span>
                    </button>
                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-[100]" onClick={() => { setMenuOpen(false); setConfirmRemove(false) }} />
                            <div className="absolute right-0 top-full mt-2 z-[101] rounded-[16px] overflow-hidden min-w-[220px] py-1"
                                style={{ background: 'var(--ee-surface)', boxShadow: 'var(--shadow-neu)' }}>
                                <p className="px-4 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--ee-muted)' }}>
                                    Change role
                                </p>
                                {GRANTABLE_ROLES.filter((r) => r !== member.member_role).map((r) => (
                                    <button key={r}
                                        onClick={() => act(() => updateMember(member.user_id, { member_role: r }))}
                                        className="w-full text-left px-4 py-2 text-sm font-bold hover:opacity-70"
                                        style={{ color: 'var(--ee-text)' }}>
                                        {ROLE_LABELS[r]}
                                    </button>
                                ))}
                                <div className="my-1 mx-3 h-px" style={{ background: 'var(--ee-bg)' }} />
                                <button
                                    onClick={() => act(() => updateMember(member.user_id, {
                                        status: member.status === 'active' ? 'suspended' : 'active',
                                    }))}
                                    className="w-full text-left px-4 py-2 text-sm font-bold hover:opacity-70"
                                    style={{ color: 'var(--ee-text)' }}>
                                    {member.status === 'active' ? 'Suspend access' : 'Reactivate'}
                                </button>
                                {confirmRemove ? (
                                    <button onClick={() => act(() => removeMember(member.user_id))}
                                        className="w-full text-left px-4 py-2 text-sm font-black hover:opacity-70"
                                        style={{ color: '#dc2626' }}>
                                        Confirm remove — this keeps their logged activities
                                    </button>
                                ) : (
                                    <button onClick={() => setConfirmRemove(true)}
                                        className="w-full text-left px-4 py-2 text-sm font-bold hover:opacity-70"
                                        style={{ color: '#dc2626' }}>
                                        Remove from team…
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
    const { members, isLoading, error, refresh } = useTeamMembers()
    const { user } = useUserRole()
    const [banner, setBanner] = useState<string | null>(null)
    const [showInvite, setShowInvite] = useState(false)

    // Manage rights mirror the backend tier (owner/admin). Everyone else gets a
    // read-only roster; the backend enforces regardless.
    const me = useMemo(
        () => (members ?? []).find((m) => m.user_id === user?.user_id),
        [members, user],
    )
    const canManage = me?.member_role === 'owner' || me?.member_role === 'admin'

    const { invites, refresh: refreshInvites } = useTeamInvites(!!canManage)
    const openInvites = (invites ?? []).filter((i) => !i.accepted_at && !i.revoked_at)

    return (
        <PageContainer variant="reading">
            <div className="flex items-start justify-between gap-3 mb-6">
                <PortfolioPageHeader title="Team" subtitle="Manage your organisation's users, roles and workload" />
                {canManage && (
                    <button onClick={() => setShowInvite(true)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-black hover:scale-105 transition-transform"
                        style={{ background: 'var(--ee-primary)', color: 'var(--ee-on-primary)', fontFamily: 'var(--font-heading)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
                        Invite
                    </button>
                )}
            </div>

            {banner && <ErrorBanner message={banner} onDismiss={() => setBanner(null)} />}

            {isLoading && !members && (
                <div className="space-y-3" aria-busy="true" aria-label="Loading team">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="animate-pulse h-20"
                            style={{ background: 'var(--ee-surface)', borderRadius: '20px', boxShadow: 'var(--shadow-neu)' }} />
                    ))}
                </div>
            )}

            {error && !members && (
                <div className="p-8 text-center" style={{ background: 'var(--ee-surface)', borderRadius: '24px', boxShadow: 'var(--shadow-neu)' }}>
                    <span className="material-symbols-outlined mb-2" style={{ fontSize: 32, color: 'var(--ee-muted)' }}>cloud_off</span>
                    <p className="font-black text-lg" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                        Couldn&apos;t load your team
                    </p>
                    <p className="text-sm mt-1 mb-5" style={{ color: 'var(--ee-muted)' }}>{error.message}</p>
                    <button onClick={refresh}
                        className="px-6 py-3 rounded-full font-bold text-sm hover:scale-105 transition-transform"
                        style={{ background: 'var(--ee-primary)', color: 'var(--ee-on-primary)' }}>
                        Retry
                    </button>
                </div>
            )}

            {members && (
                <div className="space-y-3">
                    {members.map((m) => (
                        <MemberRow key={m.user_id} member={m} canManage={!!canManage}
                            isSelf={m.user_id === user?.user_id} onError={setBanner} />
                    ))}
                </div>
            )}

            {/* Open invites */}
            {canManage && openInvites.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-lg font-black mb-3" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                        Open invites
                    </h2>
                    <div className="space-y-2">
                        {openInvites.map((inv) => (
                            <div key={inv.id} className="flex items-center justify-between gap-3 p-4"
                                style={{ background: 'var(--ee-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-neu)' }}>
                                <div className="min-w-0">
                                    <p className="font-black text-sm tracking-[0.15em]" style={{ color: 'var(--ee-text)', fontFamily: 'var(--font-heading)' }}>
                                        {inv.code}
                                    </p>
                                    <p className="text-xs font-medium" style={{ color: 'var(--ee-muted)' }}>
                                        {ROLE_LABELS[inv.member_role as MemberRole] ?? inv.member_role}
                                        {inv.email ? ` · ${inv.email}` : ''}
                                    </p>
                                </div>
                                <button
                                    onClick={async () => {
                                        try { await revokeInvite(inv.id); refreshInvites() }
                                        catch (e) { setBanner(e instanceof Error ? e.message : 'Failed to revoke') }
                                    }}
                                    className="text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0"
                                    style={{ background: 'var(--ee-bg)', color: '#dc2626' }}>
                                    Revoke
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showInvite && <InviteModal onClose={() => setShowInvite(false)} onCreated={refreshInvites} />}
        </PageContainer>
    )
}
