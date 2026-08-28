import { Link, useParams } from 'react-router-dom'
import { usePlayers } from '../hooks/usePlayers'

export function SquadPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { players, loading } = usePlayers(teamId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Squad</h1>
        <Link
          to={`/teams/${teamId}/squad/new`}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Add player
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading squad…</p>
      ) : players.length === 0 ? (
        <p className="text-slate-500">No players yet — add your first player.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {players.map((player) => (
            <li key={player.id}>
              <Link
                to={`/teams/${teamId}/squad/${player.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {player.firstName} {player.lastName}
                    {!player.active && (
                      <span className="ml-2 text-xs uppercase text-slate-400">Inactive</span>
                    )}
                  </p>
                  <p className="text-sm text-slate-500">
                    {player.positions.join(', ') || 'No position set'}
                  </p>
                </div>
                <span className="text-lg font-semibold text-slate-400">
                  #{player.jerseyNumber}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
