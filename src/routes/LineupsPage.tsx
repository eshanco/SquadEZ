import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTeamContext } from '../contexts/TeamContext'
import { useAttendanceStats } from '../hooks/useAttendanceStats'
import { useEvents } from '../hooks/useEvents'
import type { TeamEvent } from '../types'
import { formatEventDateTime } from '../utils/dates'
import { canEdit } from '../utils/roles'
import { LineupPage } from './LineupPage'

function EventRow({
  event,
  teamId,
  selected,
  onSelect,
  highlighted,
  editable,
}: {
  event: TeamEvent
  teamId: string
  selected: boolean
  onSelect: () => void
  highlighted: boolean
  editable: boolean
}) {
  return (
    <div
      id={`event-${event.id}`}
      className={`flex items-center justify-between gap-2 ${
        highlighted ? 'ring-2 ring-inset ring-emerald-400' : ''
      } ${selected ? 'bg-emerald-50' : ''}`}
    >
      <button onClick={onSelect} className="flex-1 px-4 py-3 text-left hover:bg-slate-50">
        <p className="font-medium text-slate-900">vs {event.title}</p>
        <p className="text-sm text-slate-500">{formatEventDateTime(event.startAt)}</p>
        {event.competition && (
          <p className="text-xs uppercase text-slate-400">{event.competition}</p>
        )}
      </button>
      <div className="flex shrink-0 items-center gap-3 pr-4">
        {editable && (
          <Link
            to={`/teams/${teamId}/events/${event.id}`}
            className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
          >
            Edit
          </Link>
        )}
        <span className="text-xs font-medium text-emerald-700">
          {selected ? 'Hide' : editable ? 'Build lineup' : 'View lineup'}
        </span>
      </div>
    </div>
  )
}

export function LineupsPage() {
  const { teamId, eventId } = useParams<{ teamId: string; eventId?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const highlightEventId = (location.state as { highlightEventId?: string } | null)
    ?.highlightEventId
  const { events, loading: eventsLoading } = useEvents(teamId)
  const { stats, players, loading: statsLoading } = useAttendanceStats(teamId)
  const { role } = useTeamContext()
  const editable = canEdit(role)

  const now = Date.now()
  const games = events.filter((e) => e.type === 'game')
  const upcoming = games.filter((e) => e.startAt >= now).sort((a, b) => a.startAt - b.startAt)
  const past = games.filter((e) => e.startAt < now).sort((a, b) => b.startAt - a.startAt)
  const nextTwo = upcoming.slice(0, 2)
  const otherEvents = [...upcoming.slice(2), ...past].sort((a, b) => b.startAt - a.startAt)

  const selectedEvent = games.find((e) => e.id === eventId)

  const highlightInOther = otherEvents.some((e) => e.id === highlightEventId)
  const [otherOpen, setOtherOpen] = useState(false)

  useEffect(() => {
    if (highlightInOther) setOtherOpen(true)
  }, [highlightInOther])

  useEffect(() => {
    if (!highlightEventId || eventsLoading) return
    document.getElementById(`event-${highlightEventId}`)?.scrollIntoView({ block: 'center' })
  }, [highlightEventId, eventsLoading])

  const selectEvent = (id: string) => {
    navigate(id === eventId ? `/teams/${teamId}/lineup` : `/teams/${teamId}/lineup/${id}`)
  }

  const playerName = (playerId: string) => {
    const player = players.find((p) => p.id === playerId)
    return player ? `${player.firstName} ${player.lastName}` : 'Unknown player'
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Game Management</h1>
        {editable && (
          <Link
            to={`/teams/${teamId}/events/new`}
            state={{ initialType: 'game' }}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Add Game
          </Link>
        )}
      </div>

      {eventsLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : games.length === 0 ? (
        <p className="text-slate-500">No games scheduled yet.</p>
      ) : (
        <div className="space-y-2">
          {nextTwo.length === 0 ? (
            <p className="text-sm text-slate-400">No upcoming games scheduled.</p>
          ) : (
            <div className="divide-y divide-emerald-200 rounded-lg border border-emerald-300 bg-emerald-50">
              {nextTwo.map((event) => (
                <div key={event.id}>
                  <EventRow
                    event={event}
                    teamId={teamId as string}
                    selected={eventId === event.id}
                    onSelect={() => selectEvent(event.id)}
                    highlighted={event.id === highlightEventId}
                    editable={editable}
                  />
                </div>
              ))}
            </div>
          )}

          {otherEvents.length > 0 && (
            <details
              className="group rounded-lg border border-slate-200 bg-white"
              open={otherOpen}
              onToggle={(e) => setOtherOpen(e.currentTarget.open)}
            >
              <summary className="cursor-pointer list-none px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                <span className="mr-1 inline-block transition-transform group-open:rotate-90">
                  ▸
                </span>
                Other matches ({otherEvents.length})
              </summary>
              <ul className="divide-y divide-slate-200 border-t border-slate-200">
                {otherEvents.map((event) => (
                  <li key={event.id}>
                    <EventRow
                      event={event}
                      teamId={teamId as string}
                      selected={eventId === event.id}
                      onSelect={() => selectEvent(event.id)}
                      highlighted={event.id === highlightEventId}
                      editable={editable}
                    />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {teamId && selectedEvent && (
        <div className="border-t border-slate-200 pt-6">
          <LineupPage key={selectedEvent.id} event={selectedEvent} />
        </div>
      )}

      {!statsLoading && stats && stats.totalMatches > 0 && players.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-1 text-lg font-medium text-slate-900">Season match stats</h2>
          <p className="mb-3 text-sm text-slate-500">
            {stats.totalMatches} match{stats.totalMatches === 1 ? '' : 'es'} played
          </p>
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
        </div>
      )}
    </div>
  )
}
