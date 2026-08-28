import { serverTimestamp, setDoc } from 'firebase/firestore'
import { useParams } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { rsvpDoc } from '../firebase/firestore'
import { usePlayers } from '../hooks/usePlayers'
import { useRsvps } from '../hooks/useRsvps'
import type { RsvpStatus } from '../types'

export function TrackAttendancePage() {
  const { teamId, eventId } = useParams<{ teamId: string; eventId: string }>()
  const { user } = useAuthContext()
  const { players, loading: playersLoading } = usePlayers(teamId)
  const { rsvps, loading: rsvpsLoading } = useRsvps(teamId, eventId)

  const attendanceByPlayer = new Map(rsvps.map((r) => [r.playerId, r]))

  const handleSetAttended = async (playerId: string, attended: boolean) => {
    if (!teamId || !eventId || !user) return
    const status: RsvpStatus = attended ? 'yes' : 'no'
    await setDoc(
      rsvpDoc(teamId, eventId, playerId),
      {
        playerId,
        status,
        note: attendanceByPlayer.get(playerId)?.note ?? '',
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  }

  if (playersLoading || rsvpsLoading) return <p className="text-slate-500">Loading…</p>

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Attendance</h1>
      {players.filter((p) => p.active).length === 0 ? (
        <p className="text-slate-500">No active players on the squad yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {players
            .filter((p) => p.active)
            .map((player) => {
              const current = attendanceByPlayer.get(player.id)?.status
              return (
                <li key={player.id} className="flex items-center justify-between px-4 py-3">
                  <span className="font-medium text-slate-900">
                    {player.firstName} {player.lastName}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleSetAttended(player.id, true)}
                      className={`rounded-md px-3 py-1 text-sm ${
                        current === 'yes'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Attended
                    </button>
                    <button
                      onClick={() => handleSetAttended(player.id, false)}
                      className={`rounded-md px-3 py-1 text-sm ${
                        current === 'no'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Absent
                    </button>
                  </div>
                </li>
              )
            })}
        </ul>
      )}
    </div>
  )
}
