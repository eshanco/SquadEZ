import { Link } from 'react-router-dom'
import type { TeamEvent } from '../../types'
import { formatEventDateTime } from '../../utils/dates'

export function EventListItem({ event, teamId }: { event: TeamEvent; teamId: string }) {
  return (
    <Link
      to={`/teams/${teamId}/schedule/${event.id}`}
      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
    >
      <div>
        <p className="font-medium text-slate-900">{event.title}</p>
        <p className="text-sm text-slate-500">{formatEventDateTime(event.startAt)}</p>
        {event.location && <p className="text-sm text-slate-400">{event.location}</p>}
      </div>
      {event.type === 'game' && event.opponent && (
        <span className="text-sm text-slate-400">vs {event.opponent}</span>
      )}
    </Link>
  )
}
