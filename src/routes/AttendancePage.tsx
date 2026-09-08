import { updateDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AttendanceMarker } from '../components/attendance/AttendanceMarker'
import { useTeamContext } from '../contexts/TeamContext'
import { eventDoc } from '../firebase/firestore'
import { useAttendanceStats } from '../hooks/useAttendanceStats'
import { useEvents } from '../hooks/useEvents'
import type { TeamEvent } from '../types'
import { formatEventDateTime } from '../utils/dates'
import { canEdit } from '../utils/roles'

function EventRow({
  event,
  teamId,
  selected,
  onSelect,
  onToggleCancelled,
  highlighted,
  editable,
}: {
  event: TeamEvent
  teamId: string
  selected: boolean
  onSelect: () => void
  onToggleCancelled: () => void
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
        <p
          className={`font-medium ${
            event.cancelled ? 'text-slate-400 line-through' : 'text-slate-900'
          }`}
        >
          {event.title}
        </p>
        <p className="text-sm text-slate-500">{formatEventDateTime(event.startAt)}</p>
        {event.cancelled && (
          <p className="text-xs font-medium uppercase text-red-500">Cancelled</p>
        )}
      </button>
      <div className="flex shrink-0 items-center gap-3 pr-4">
        {editable && (
          <>
            <Link
              to={`/teams/${teamId}/events/${event.id}`}
              className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
            >
              Edit
            </Link>
            <button
              onClick={onToggleCancelled}
              className="text-xs text-slate-400 hover:text-red-600 hover:underline"
            >
              {event.cancelled ? 'Reinstate' : 'Cancel'}
            </button>
          </>
        )}
        <span
          className={`text-xs font-medium ${event.cancelled ? 'text-slate-400' : 'text-emerald-700'}`}
        >
          {selected ? 'Hide' : event.cancelled ? 'Details' : editable ? 'Mark attendance' : 'View attendance'}
        </span>
      </div>
    </div>
  )
}

export function AttendancePage() {
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
  const practices = events.filter((e) => e.type === 'practice')
  const past = practices.filter((e) => e.startAt < now).sort((a, b) => b.startAt - a.startAt)
  const upcoming = practices.filter((e) => e.startAt >= now).sort((a, b) => a.startAt - b.startAt)
  const justHappened = past[0]
  const otherEvents = [...past.slice(1), ...upcoming].sort((a, b) => b.startAt - a.startAt)

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
    navigate(
      id === eventId ? `/teams/${teamId}/attendance` : `/teams/${teamId}/attendance/${id}`,
    )
  }

  const toggleCancelled = (event: TeamEvent) => {
    if (!teamId) return
    updateDoc(eventDoc(teamId, event.id), { cancelled: !event.cancelled })
  }

  const playerName = (playerId: string) => {
    const player = players.find((p) => p.id === playerId)
    return player ? `${player.firstName} ${player.lastName}` : 'Unknown player'
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Training</h1>
        {editable && (
          <Link
            to={`/teams/${teamId}/events/new`}
            state={{ initialType: 'practice' }}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Add Session
          </Link>
        )}
      </div>

      {eventsLoading ? (
        <p className="text-slate-500">Loading…</p>
      ) : !justHappened ? (
        <p className="text-slate-500">No training sessions yet.</p>
      ) : (
        <div className="space-y-2">
          <div className="rounded-lg border border-emerald-300 bg-emerald-50">
            <EventRow
              event={justHappened}
              teamId={teamId as string}
              selected={eventId === justHappened.id}
              onSelect={() => selectEvent(justHappened.id)}
              onToggleCancelled={() => toggleCancelled(justHappened)}
              highlighted={justHappened.id === highlightEventId}
              editable={editable}
            />
          </div>
          {eventId === justHappened.id && teamId && (
            <div className="pl-1">
              {justHappened.cancelled ? (
                <p className="px-3 py-1 text-sm text-slate-500">
                  This session was cancelled — no attendance recorded.
                </p>
              ) : (
                <AttendanceMarker teamId={teamId} eventId={eventId} editable={editable} />
              )}
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
                Other sessions ({otherEvents.length})
              </summary>
              <ul className="divide-y divide-slate-200 border-t border-slate-200">
                {otherEvents.map((event) => (
                  <li key={event.id}>
                    <EventRow
                      event={event}
                      teamId={teamId as string}
                      selected={eventId === event.id}
                      onSelect={() => selectEvent(event.id)}
                      onToggleCancelled={() => toggleCancelled(event)}
                      highlighted={event.id === highlightEventId}
                      editable={editable}
                    />
                    {eventId === event.id && teamId && (
                      <div className="px-4 pb-3">
                        {event.cancelled ? (
                          <p className="text-sm text-slate-500">
                            This session was cancelled — no attendance recorded.
                          </p>
                        ) : (
                          <AttendanceMarker teamId={teamId} eventId={eventId} editable={editable} />
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {!statsLoading && stats && (
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="mb-1 text-lg font-medium text-slate-900">Season attendance</h2>
            <p className="mb-3 text-sm text-slate-500">
              {stats.totalTrainingSessions} session{stats.totalTrainingSessions === 1 ? '' : 's'}{' '}
              run
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
        </div>
      )}
    </div>
  )
}
