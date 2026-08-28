import { Link, useParams } from 'react-router-dom'
import { useTeamContext } from '../contexts/TeamContext'
import { useEvents } from '../hooks/useEvents'
import { usePlayers } from '../hooks/usePlayers'
import { formatEventDateTime } from '../utils/dates'

export function TeamDashboardPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { team } = useTeamContext()
  const { events, loading: eventsLoading } = useEvents(teamId)
  const { players, loading: playersLoading } = usePlayers(teamId)

  const now = Date.now()
  const upcoming = events.filter((e) => e.startAt >= now).slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{team?.name}</h1>
        <p className="text-sm text-slate-500">
          {playersLoading ? '…' : `${players.length} players on squad`}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-900">Upcoming</h2>
          <Link to={`/teams/${teamId}/schedule`} className="text-sm text-emerald-700 hover:underline">
            View schedule
          </Link>
        </div>
        {eventsLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-slate-500">No upcoming practices or games scheduled.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((event) => (
              <li key={event.id}>
                <Link
                  to={`/teams/${teamId}/schedule/${event.id}`}
                  className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">{event.title}</p>
                    <p className="text-sm text-slate-500">{formatEventDateTime(event.startAt)}</p>
                  </div>
                  <span className="text-xs uppercase text-slate-400">{event.type}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-3">
        <Link
          to={`/teams/${teamId}/squad`}
          className="flex-1 rounded-lg border border-slate-200 bg-white p-4 text-center hover:border-emerald-400"
        >
          Manage squad
        </Link>
        <Link
          to={`/teams/${teamId}/schedule`}
          className="flex-1 rounded-lg border border-slate-200 bg-white p-4 text-center hover:border-emerald-400"
        >
          Manage schedule
        </Link>
      </div>
    </div>
  )
}
