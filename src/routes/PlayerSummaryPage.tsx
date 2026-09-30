import { onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTeamContext } from '../contexts/TeamContext'
import { playerDoc } from '../firebase/firestore'
import { usePlayerStats } from '../hooks/usePlayerStats'
import type { Player, TeamEvent } from '../types'
import { formatEventDateTime } from '../utils/dates'
import { canEdit } from '../utils/roles'

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {detail && <p className="text-sm text-slate-500">{detail}</p>}
    </div>
  )
}

function ExpandableEventList({
  label,
  items,
}: {
  label: string
  items: { event: TeamEvent; to: string; detail?: string }[]
}) {
  if (items.length === 0) return null
  return (
    <details className="group border-t border-slate-200">
      <summary className="cursor-pointer list-none px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
        <span className="mr-1 inline-block transition-transform group-open:rotate-90">▸</span>
        {label} ({items.length})
      </summary>
      <ul className="divide-y divide-slate-200 border-t border-slate-200">
        {items.map(({ event, to, detail }) => (
          <li key={event.id}>
            <Link to={to} className="flex items-center justify-between px-4 py-2 hover:bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-900">{event.title}</p>
                <p className="text-xs text-slate-500">{formatEventDateTime(event.startAt)}</p>
              </div>
              {detail && <span className="text-sm text-slate-500">{detail}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  )
}

export function PlayerSummaryPage() {
  const { teamId, playerId } = useParams<{ teamId: string; playerId: string }>()
  const { role } = useTeamContext()
  const editable = canEdit(role)
  const [player, setPlayer] = useState<Player | null>(null)
  const [playerLoading, setPlayerLoading] = useState(true)
  const { stats, loading: statsLoading, error } = usePlayerStats(teamId, playerId)

  useEffect(() => {
    if (!teamId || !playerId) return
    return onSnapshot(playerDoc(teamId, playerId), (snap) => {
      setPlayer(snap.exists() ? ({ id: snap.id, ...snap.data() } as Player) : null)
      setPlayerLoading(false)
    })
  }, [teamId, playerId])

  if (playerLoading) return <p className="text-slate-500">Loading player…</p>
  if (!player) return <p className="text-slate-500">Player not found.</p>

  const trainingPercent =
    stats && stats.totalTrainingSessions
      ? Math.round((stats.trainingAttended / stats.totalTrainingSessions) * 100)
      : 0

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to={`/teams/${teamId}/squad`} className="text-sm text-slate-500 hover:underline">
            ← Squad
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">
            {player.firstName} {player.lastName}
            {player.jerseyNumber && (
              <span className="ml-2 text-slate-400">#{player.jerseyNumber}</span>
            )}
          </h1>
          <p className="text-sm text-slate-500">
            {player.positions.join(', ') || 'No position set'}
            {!player.active && ' · Inactive'}
          </p>
        </div>
        {editable && (
          <Link
            to={`/teams/${teamId}/squad/${playerId}/edit`}
            className="shrink-0 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Edit
          </Link>
        )}
      </div>

      {statsLoading ? (
        <p className="text-slate-500">Loading stats…</p>
      ) : error || !stats ? (
        <p className="text-sm text-red-600">Couldn't load stats for this player.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Games played" value={String(stats.gamesPlayed.length)} />
            <StatTile label="Minutes played" value={String(stats.minutesPlayed)} />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="p-4">
              <h2 className="text-lg font-medium text-slate-900">Games</h2>
              {stats.gamesPlayed.length + stats.gamesMissed.length === 0 ? (
                <p className="text-sm text-slate-400">No completed games yet.</p>
              ) : (
                <p className="text-sm text-slate-500">
                  Played {stats.gamesPlayed.length} of{' '}
                  {stats.gamesPlayed.length + stats.gamesMissed.length} games
                </p>
              )}
            </div>
            <ExpandableEventList
              label="Games played"
              items={stats.gamesPlayed.map(({ event, minutes }) => ({
                event,
                to: `/teams/${teamId}/lineup/${event.id}`,
                detail: `${minutes} min`,
              }))}
            />
            <ExpandableEventList
              label="Games missed"
              items={stats.gamesMissed.map((event) => ({
                event,
                to: `/teams/${teamId}/lineup/${event.id}`,
              }))}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="p-4">
              <h2 className="text-lg font-medium text-slate-900">Training record</h2>
              {stats.totalTrainingSessions === 0 ? (
                <p className="text-sm text-slate-400">No completed training sessions yet.</p>
              ) : (
                <p className="text-sm text-slate-500">
                  Attended {stats.trainingAttended} of {stats.totalTrainingSessions} sessions (
                  {trainingPercent}%)
                </p>
              )}
            </div>
            <ExpandableEventList
              label="Missed sessions"
              items={stats.missedTraining.map((event) => ({
                event,
                to: `/teams/${teamId}/attendance/${event.id}`,
              }))}
            />
          </div>
        </>
      )}
    </div>
  )
}
