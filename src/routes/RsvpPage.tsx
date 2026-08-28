import { serverTimestamp, setDoc } from 'firebase/firestore'
import { useParams } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { rsvpDoc } from '../firebase/firestore'
import { usePlayers } from '../hooks/usePlayers'
import { useRsvps } from '../hooks/useRsvps'
import type { RsvpStatus } from '../types'

const statusOptions: { value: RsvpStatus; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'maybe', label: 'Maybe' },
]

export function RsvpPage() {
  const { teamId, eventId } = useParams<{ teamId: string; eventId: string }>()
  const { user } = useAuthContext()
  const { players, loading: playersLoading } = usePlayers(teamId)
  const { rsvps, loading: rsvpsLoading } = useRsvps(teamId, eventId)

  const rsvpByPlayer = new Map(rsvps.map((r) => [r.playerId, r]))

  const handleSetStatus = async (playerId: string, status: RsvpStatus) => {
    if (!teamId || !eventId || !user) return
    await setDoc(
      rsvpDoc(teamId, eventId, playerId),
      {
        playerId,
        status,
        note: rsvpByPlayer.get(playerId)?.note ?? '',
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  }

  if (playersLoading || rsvpsLoading) return <p className="text-slate-500">Loading…</p>

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">RSVPs</h1>
      {players.filter((p) => p.active).length === 0 ? (
        <p className="text-slate-500">No active players on the roster yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {players
            .filter((p) => p.active)
            .map((player) => {
              const current = rsvpByPlayer.get(player.id)?.status ?? 'no-response'
              return (
                <li key={player.id} className="flex items-center justify-between px-4 py-3">
                  <span className="font-medium text-slate-900">
                    {player.firstName} {player.lastName}
                  </span>
                  <div className="flex gap-1">
                    {statusOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleSetStatus(player.id, opt.value)}
                        className={`rounded-md px-3 py-1 text-sm ${
                          current === opt.value
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </li>
              )
            })}
        </ul>
      )}
    </div>
  )
}
