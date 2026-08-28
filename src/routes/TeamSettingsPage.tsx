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
import { useAuthContext } from '../contexts/AuthContext'
import { useTeamContext } from '../contexts/TeamContext'
import { memberDoc, membersCollection, teamDoc, usersCollection } from '../firebase/firestore'
import type { TeamMember } from '../types'

export function TeamSettingsPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { user } = useAuthContext()
  const { team, role } = useTeamContext()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [name, setName] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [season, setSeason] = useState('')
  const [savingTeam, setSavingTeam] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const isOwner = role === 'owner'

  useEffect(() => {
    if (team) {
      setName(team.name)
      setAgeGroup(team.ageGroup)
      setSeason(team.season)
    }
  }, [team])

  useEffect(() => {
    if (!teamId) return
    return onSnapshot(membersCollection(teamId), (snapshot) => {
      setMembers(snapshot.docs.map((d) => d.data() as TeamMember))
    })
  }, [teamId])

  const handleSaveTeam = async (event: FormEvent) => {
    event.preventDefault()
    if (!teamId) return
    setSavingTeam(true)
    try {
      await updateDoc(teamDoc(teamId), { name, ageGroup, season })
    } finally {
      setSavingTeam(false)
    }
  }

  const handleAddCoach = async (event: FormEvent) => {
    event.preventDefault()
    if (!teamId || !user) return
    setAddError(null)
    setAdding(true)
    try {
      const usersQuery = query(usersCollection(), where('email', '==', addEmail.trim()))
      const snapshot = await getDocs(usersQuery)
      if (snapshot.empty) {
        setAddError(
          "This person hasn't created an account yet. Ask them to sign up, then add them again.",
        )
        return
      }
      const userDocSnap = snapshot.docs[0]
      await setDoc(memberDoc(teamId, userDocSnap.id), {
        uid: userDocSnap.id,
        email: userDocSnap.data().email,
        displayName: userDocSnap.data().displayName,
        role: 'coach',
        addedAt: serverTimestamp(),
        addedBy: user.uid,
      })
      setAddEmail('')
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add coach')
    } finally {
      setAdding(false)
    }
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
                <span className="text-xs uppercase text-slate-400">{member.role}</span>
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

        {isOwner && (
          <form onSubmit={handleAddCoach} className="flex gap-2">
            <input
              type="email"
              required
              placeholder="coach@example.com"
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={adding}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {adding ? 'Adding…' : 'Add coach'}
            </button>
          </form>
        )}
        {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
      </div>
    </div>
  )
}
