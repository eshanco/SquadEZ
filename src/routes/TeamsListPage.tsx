import { addDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { memberDoc, teamsCollection } from '../firebase/firestore'
import { useTeams } from '../hooks/useTeams'

export function TeamsListPage() {
  const { user } = useAuthContext()
  const { memberships, loading: teamsLoading, error: teamsError } = useTeams(user?.uid)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [ageGroup, setAgeGroup] = useState('')
  const [season, setSeason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!user) return
    setError(null)
    setCreating(true)
    try {
      const teamRef = await addDoc(teamsCollection(), {
        name,
        ageGroup,
        season,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      })
      await setDoc(memberDoc(teamRef.id, user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName ?? user.email,
        role: 'owner',
        addedAt: serverTimestamp(),
        addedBy: user.uid,
      })
      setName('')
      setAgeGroup('')
      setSeason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">My Teams</h1>

      {teamsLoading ? (
        <p className="text-slate-500">Loading teams…</p>
      ) : teamsError ? (
        <p className="mb-6 text-sm text-red-600">
          Couldn't load your teams: {teamsError.message}
        </p>
      ) : memberships.length === 0 ? (
        <p className="mb-6 text-slate-500">
          You're not on any teams yet. Create your first one below.
        </p>
      ) : (
        <ul className="mb-8 space-y-2">
          {memberships.map(({ team, role }) => (
            <li key={team.id}>
              <Link
                to={`/teams/${team.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-emerald-400"
              >
                <div>
                  <p className="font-medium text-slate-900">{team.name}</p>
                  <p className="text-sm text-slate-500">
                    {team.ageGroup} · {team.season}
                  </p>
                </div>
                <span className="text-xs uppercase text-slate-400">{role}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-medium text-slate-900">Create a team</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Team name</label>
            <input
              type="text"
              required
              placeholder="U12 Thunder"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Age group</label>
              <input
                type="text"
                placeholder="U12"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Season</label>
              <input
                type="text"
                placeholder="Fall 2026"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create team'}
          </button>
        </form>
      </div>
    </div>
  )
}
