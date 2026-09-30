import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTeamContext } from '../contexts/TeamContext'
import { useAttendanceStats } from '../hooks/useAttendanceStats'
import { useEvents } from '../hooks/useEvents'
import { usePlayers } from '../hooks/usePlayers'
import type { Player, PositionGroup } from '../types'
import { exportSquadStats } from '../utils/exportSquadStats'
import { canEdit } from '../utils/roles'

const POSITION_ORDER: PositionGroup[] = ['GK', 'DEF', 'MID', 'FW']

function primaryPosition(player: Player): PositionGroup | null {
  return POSITION_ORDER.find((pos) => player.positions.includes(pos)) ?? null
}

export function SquadPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { players, loading } = usePlayers(teamId)
  const { stats } = useAttendanceStats(teamId)
  const { events, loading: eventsLoading } = useEvents(teamId)
  const { team, role } = useTeamContext()
  const editable = canEdit(role)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (!teamId) return
    setExporting(true)
    try {
      await exportSquadStats(teamId, team?.name ?? 'squad', players, events)
    } catch {
      alert("Couldn't export squad stats. Please try again.")
    } finally {
      setExporting(false)
    }
  }

  // Stats only cover active players, so inactive rows just show name/number.
  const statsLine = (playerId: string) => {
    if (!stats) return null
    const games = stats.matches.find((m) => m.playerId === playerId)
    const training = stats.training.find((t) => t.playerId === playerId)
    if (!games || !training) return null
    const trainingText = stats.totalTrainingSessions ? `${training.percent}%` : '–'
    return `${games.attended} game${games.attended === 1 ? '' : 's'} · ${trainingText} training`
  }

  const activePlayers = players.filter((p) => p.active)
  const inactivePlayers = players.filter((p) => !p.active)

  const groups = [
    ...POSITION_ORDER.map((pos) => ({
      label: pos,
      players: activePlayers.filter((p) => primaryPosition(p) === pos),
    })),
    {
      label: 'No position set',
      players: activePlayers.filter((p) => primaryPosition(p) === null),
    },
    { label: 'Inactive', players: inactivePlayers },
  ].filter((group) => group.players.length > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Squad</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting || loading || eventsLoading || players.length === 0}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {exporting ? 'Exporting…' : 'Export to Excel'}
          </button>
          {editable && (
            <Link
              to={`/teams/${teamId}/squad/new`}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Add player
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading squad…</p>
      ) : players.length === 0 ? (
        <p className="text-slate-500">No players yet — add your first player.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label} className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {group.label} ({group.players.length})
              </h2>
              <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                {group.players.map((player) => (
                  <li key={player.id}>
                    <Link
                      to={`/teams/${teamId}/squad/${player.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                    >
                      <div>
                        <p className="font-medium text-slate-900">
                          {player.firstName} {player.lastName}
                        </p>
                        <p className="text-sm text-slate-500">
                          {player.positions.join(', ') || 'No position set'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        {statsLine(player.id) && (
                          <span className="text-right text-sm text-slate-500">
                            {statsLine(player.id)}
                          </span>
                        )}
                        <span className="text-lg font-semibold text-slate-400">
                          #{player.jerseyNumber}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
