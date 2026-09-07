import { Link, useParams } from 'react-router-dom'
import { useTeamContext } from '../contexts/TeamContext'
import { useAttendanceStats } from '../hooks/useAttendanceStats'
import { useEvents } from '../hooks/useEvents'
import { usePlayers } from '../hooks/usePlayers'
import { formatEventDateTime } from '../utils/dates'

export function TeamDashboardPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { team } = useTeamContext()
  const { events, loading: eventsLoading } = useEvents(teamId)
  const { players, loading: playersLoading } = usePlayers(teamId)
  const { stats, players: statsPlayers, loading: statsLoading } = useAttendanceStats(teamId)

  const now = Date.now()
  const nextGame = events
    .filter((e) => e.type === 'game' && e.startAt >= now)
    .sort((a, b) => a.startAt - b.startAt)[0]
  const lastTraining = events
    .filter((e) => e.type === 'practice' && e.startAt < now)
    .sort((a, b) => b.startAt - a.startAt)[0]

  const playerName = (playerId: string) => {
    const player = statsPlayers.find((p) => p.id === playerId)
    return player ? `${player.firstName} ${player.lastName}` : 'Unknown player'
  }

  const topAttendance = stats
    ? stats.training
        .slice()
        .sort((a, b) => b.percent - a.percent)
        .slice(0, 5)
    : []
  const topMinutes = stats
    ? stats.matches
        .slice()
        .sort((a, b) => b.minutesPlayed - a.minutesPlayed)
        .slice(0, 5)
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{team?.name}</h1>
        <p className="text-sm text-slate-500">
          {playersLoading ? '…' : `${players.length} players on squad`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-medium text-slate-900">Next game</h2>
          {eventsLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : !nextGame ? (
            <p className="text-sm text-slate-500">No upcoming games scheduled.</p>
          ) : (
            <Link
              to={`/teams/${teamId}/lineup/${nextGame.id}`}
              className="-m-1 flex items-center justify-between rounded-md p-1 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-slate-900">vs {nextGame.title}</p>
                <p className="text-sm text-slate-500">{formatEventDateTime(nextGame.startAt)}</p>
                {nextGame.competition && (
                  <p className="text-xs uppercase text-slate-400">{nextGame.competition}</p>
                )}
              </div>
              <span className="text-sm text-emerald-700">Build lineup</span>
            </Link>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-medium text-slate-900">Last training</h2>
          {eventsLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : !lastTraining ? (
            <p className="text-sm text-slate-500">No training sessions yet.</p>
          ) : (
            <Link
              to={`/teams/${teamId}/attendance/${lastTraining.id}`}
              className="-m-1 flex items-center justify-between rounded-md p-1 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-slate-900">{lastTraining.title}</p>
                <p className="text-sm text-slate-500">
                  {formatEventDateTime(lastTraining.startAt)}
                </p>
              </div>
              <span className="text-sm text-emerald-700">Mark attendance</span>
            </Link>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-medium text-slate-900">Most minutes played</h2>
          {statsLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : topMinutes.length === 0 || stats?.totalMatches === 0 ? (
            <p className="text-sm text-slate-500">No completed matches yet.</p>
          ) : (
            <ol className="space-y-1.5">
              {topMinutes.map((row) => (
                <li key={row.playerId} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900">{playerName(row.playerId)}</span>
                  <span className="text-slate-500">{row.minutesPlayed} min</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-medium text-slate-900">Best training attendance</h2>
          {statsLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : topAttendance.length === 0 || stats?.totalTrainingSessions === 0 ? (
            <p className="text-sm text-slate-500">No completed training sessions yet.</p>
          ) : (
            <ol className="space-y-1.5">
              {topAttendance.map((row) => (
                <li key={row.playerId} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900">{playerName(row.playerId)}</span>
                  <span className="text-slate-500">{row.percent}%</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <Link
        to={`/teams/${teamId}/squad`}
        className="block rounded-lg border border-slate-200 bg-white p-4 text-center hover:border-emerald-400"
      >
        Manage squad
      </Link>
    </div>
  )
}
