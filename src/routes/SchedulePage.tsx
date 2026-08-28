import { Link, useParams } from 'react-router-dom'
import { useEvents } from '../hooks/useEvents'
import { formatEventDateTime } from '../utils/dates'

export function SchedulePage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { events, loading } = useEvents(teamId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Schedule</h1>
        <Link
          to={`/teams/${teamId}/schedule/new`}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Add event
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading schedule…</p>
      ) : events.length === 0 ? (
        <p className="text-slate-500">No practices or games scheduled yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                to={`/teams/${teamId}/schedule/${event.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">{event.title}</p>
                  <p className="text-sm text-slate-500">{formatEventDateTime(event.startAt)}</p>
                  {event.location && <p className="text-sm text-slate-400">{event.location}</p>}
                </div>
                <span className="text-xs uppercase text-slate-400">{event.type}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
