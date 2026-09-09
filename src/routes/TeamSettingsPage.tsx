import {
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { type FormEvent, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { JerseySvg } from '../components/lineup/JerseySvg'
import { useAuthContext } from '../contexts/AuthContext'
import { useTeamContext } from '../contexts/TeamContext'
import {
  inviteDoc,
  invitesCollection,
  memberDoc,
  membersCollection,
  teamDoc,
  usersCollection,
} from '../firebase/firestore'
import type { InviteRole, TeamInvite, TeamMember } from '../types'
import { DEFAULT_JERSEY_COLOR, DEFAULT_JERSEY_TRIM_COLOR, teamJerseyColors } from '../utils/jersey'

const INVITE_ROLES: InviteRole[] = ['coach', 'viewer']

function toggleClass(active: boolean) {
  return `flex-1 rounded-md px-3 py-2 text-center text-sm font-medium ${
    active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`
}

export function TeamSettingsPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { user } = useAuthContext()
  const { team, role } = useTeamContext()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<(TeamInvite & { id: string })[]>([])
  const [name, setName] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [season, setSeason] = useState('')
  const [jerseyColor, setJerseyColor] = useState(DEFAULT_JERSEY_COLOR)
  const [jerseyTrimColor, setJerseyTrimColor] = useState(DEFAULT_JERSEY_TRIM_COLOR)
  const [savingTeam, setSavingTeam] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<InviteRole>('coach')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)

  const isOwner = role === 'owner'

  useEffect(() => {
    if (team) {
      setName(team.name)
      setAgeGroup(team.ageGroup)
      setSeason(team.season)
      const { color, trimColor } = teamJerseyColors(team)
      setJerseyColor(color)
      setJerseyTrimColor(trimColor)
    }
  }, [team])

  useEffect(() => {
    if (!teamId) return
    return onSnapshot(
      membersCollection(teamId),
      (snapshot) => {
        setMembers(snapshot.docs.map((d) => d.data() as TeamMember))
      },
      (err) => console.error('Failed to load team members:', err),
    )
  }, [teamId])

  useEffect(() => {
    if (!teamId || !isOwner) return
    return onSnapshot(
      invitesCollection(teamId),
      (snapshot) => {
        setInvites(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as TeamInvite) })))
      },
      (err) => console.error('Failed to load pending invites:', err),
    )
  }, [teamId, isOwner])

  const handleSaveTeam = async (event: FormEvent) => {
    event.preventDefault()
    if (!teamId) return
    setSavingTeam(true)
    try {
      await updateDoc(teamDoc(teamId), { name, ageGroup, season, jerseyColor, jerseyTrimColor })
    } finally {
      setSavingTeam(false)
    }
  }

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault()
    if (!teamId || !user) return
    setInviteError(null)
    setInviteSent(null)
    setInviting(true)
    try {
      const trimmedEmail = inviteEmail.trim()
      const usersQuery = query(usersCollection(), where('email', '==', trimmedEmail))
      const snapshot = await getDocs(usersQuery)
      if (!snapshot.empty) {
        const userDocSnap = snapshot.docs[0]
        await setDoc(memberDoc(teamId, userDocSnap.id), {
          uid: userDocSnap.id,
          email: userDocSnap.data().email,
          displayName: userDocSnap.data().displayName,
          role: inviteRole,
          addedAt: serverTimestamp(),
          addedBy: user.uid,
        })
        setInviteSent(`${trimmedEmail} added as ${inviteRole}.`)
      } else {
        await setDoc(inviteDoc(teamId, trimmedEmail), {
          email: trimmedEmail.trim().toLowerCase(),
          role: inviteRole,
          invitedBy: user.uid,
          invitedAt: serverTimestamp(),
        })
        setInviteSent(`Invited ${trimmedEmail} — they'll be added as ${inviteRole} once they sign up.`)
      }
      setInviteEmail('')
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  const handleCancelInvite = async (id: string) => {
    if (!teamId) return
    await deleteDoc(inviteDoc(teamId, id))
  }

  const handleChangeRole = async (uid: string, newRole: InviteRole) => {
    if (!teamId) return
    await updateDoc(memberDoc(teamId, uid), { role: newRole })
  }

  const handleRemoveMember = async (uid: string) => {
    if (!teamId) return
    await deleteDoc(memberDoc(teamId, uid))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Team settings</h1>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-medium text-slate-900">Team info</h2>
        <form onSubmit={handleSaveTeam} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Team name</label>
            <input
              type="text"
              disabled={!isOwner}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Age group</label>
              <input
                type="text"
                disabled={!isOwner}
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Season</label>
              <input
                type="text"
                disabled={!isOwner}
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Kit colours</label>
            <p className="mb-2 text-xs text-slate-500">
              Every player's jersey on the pitch uses these colours.
            </p>
            <div className="flex items-center gap-4">
              <JerseySvg color={jerseyColor} trimColor={jerseyTrimColor} className="h-14 w-14" />
              <div className="flex gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Jersey</label>
                  <input
                    type="color"
                    disabled={!isOwner}
                    value={jerseyColor}
                    onChange={(e) => setJerseyColor(e.target.value)}
                    className="h-9 w-14 rounded-md border border-slate-300 disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Trim</label>
                  <input
                    type="color"
                    disabled={!isOwner}
                    value={jerseyTrimColor}
                    onChange={(e) => setJerseyTrimColor(e.target.value)}
                    className="h-9 w-14 rounded-md border border-slate-300 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>

          {isOwner && (
            <button
              type="submit"
              disabled={savingTeam}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {savingTeam ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </form>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-medium text-slate-900">Coaches</h2>
        <ul className="mb-4 space-y-2">
          {members.map((member) => (
            <li
              key={member.uid}
              className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-slate-900">{member.displayName}</p>
                <p className="text-sm text-slate-500">{member.email}</p>
              </div>
              <div className="flex items-center gap-3">
                {isOwner && member.role !== 'owner' ? (
                  <div className="flex gap-1">
                    {INVITE_ROLES.map((r) => (
                      <button
                        key={r}
                        onClick={() => handleChangeRole(member.uid, r)}
                        className={`rounded-md px-2 py-1 text-xs font-medium uppercase ${
                          member.role === r
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs uppercase text-slate-400">{member.role}</span>
                )}
                {isOwner && member.role !== 'owner' && (
                  <button
                    onClick={() => handleRemoveMember(member.uid)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {isOwner && invites.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-sm font-medium text-slate-700">Pending invites</h3>
            <ul className="space-y-1">
              {invites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex items-center justify-between rounded-md bg-slate-100 px-2 py-1.5 text-sm text-slate-600"
                >
                  <span>
                    {invite.email} <span className="text-xs uppercase text-slate-400">({invite.role})</span>
                  </span>
                  <button
                    onClick={() => handleCancelInvite(invite.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isOwner && (
          <form onSubmit={handleInvite} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="email"
                required
                placeholder="coach@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={inviting}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {inviting ? 'Inviting…' : 'Invite'}
              </button>
            </div>
            <div className="flex gap-2">
              {INVITE_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setInviteRole(r)}
                  className={toggleClass(inviteRole === r)}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                  {r === 'coach' ? ' (can edit)' : ' (view only)'}
                </button>
              ))}
            </div>
          </form>
        )}
        {inviteError && <p className="mt-2 text-sm text-red-600">{inviteError}</p>}
        {inviteSent && <p className="mt-2 text-sm text-emerald-700">{inviteSent}</p>}
      </div>
    </div>
  )
}
