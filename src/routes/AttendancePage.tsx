import { useParams } from 'react-router-dom'
import { useAttendanceStats } from '../hooks/useAttendanceStats'

export function AttendancePage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { stats, players, loading, error } = useAttendanceStats(teamId)

  if (loading) return <p className="text-slate-500">Loading attendance…</p>
  if (error) return <p className="text-sm text-red-600">Couldn't load attendance: {error.message}</p>
  if (!stats) return null

  const playerName = (playerId: string) => {
    const player = players.find((p) => p.id === playerId)
    return player ? `${player.firstName} ${player.lastName}` : 'Unknown player'
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold text-slate-900">Attendance</h1>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-lg font-medium text-slate-900">Training</h2>
        <p className="mb-3 text-sm text-slate-500">
          {stats.totalTrainingSessions} session{stats.totalTrainingSessions === 1 ? '' : 's'} run
        </p>
        {stats.totalTrainingSessions === 0 || players.length === 0 ? (
          <p className="text-sm text-slate-400">No completed training sessions yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="py-1.5 pr-2 font-medium">Player</th>
                <th className="py-1.5 pr-2 font-medium">Attended</th>
                <th className="py-1.5 pr-2 font-medium">Missed</th>
                <th className="py-1.5 font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {stats.training
                .slice()
                .sort((a, b) => b.percent - a.percent)
                .map((row) => (
                  <tr key={row.playerId} className="border-b border-slate-100 last:border-0">
                    <td className="py-1.5 pr-2 font-medium text-slate-900">
                      {playerName(row.playerId)}
                    </td>
                    <td className="py-1.5 pr-2 text-slate-600">{row.attended}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{row.missed}</td>
                    <td className="py-1.5 text-slate-600">{row.percent}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-1 text-lg font-medium text-slate-900">Matches</h2>
        <p className="mb-3 text-sm text-slate-500">
          {stats.totalMatches} match{stats.totalMatches === 1 ? '' : 'es'} played
        </p>
        {stats.totalMatches === 0 || players.length === 0 ? (
          <p className="text-sm text-slate-400">No completed matches yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="py-1.5 pr-2 font-medium">Player</th>
                <th className="py-1.5 pr-2 font-medium">Attended</th>
                <th className="py-1.5 pr-2 font-medium">%</th>
                <th className="py-1.5 font-medium">Minutes played</th>
              </tr>
            </thead>
            <tbody>
              {stats.matches
                .slice()
                .sort((a, b) => b.minutesPlayed - a.minutesPlayed)
                .map((row) => (
                  <tr key={row.playerId} className="border-b border-slate-100 last:border-0">
                    <td className="py-1.5 pr-2 font-medium text-slate-900">
                      {playerName(row.playerId)}
                    </td>
                    <td className="py-1.5 pr-2 text-slate-600">{row.attended}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{row.percent}%</td>
                    <td className="py-1.5 text-slate-600">{row.minutesPlayed}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
