import type { TeamEvent } from '../../types'
import { EventListItem } from './EventListItem'

export function EventTypeSection({
  title,
  events,
  teamId,
  now,
}: {
  title: string
  events: TeamEvent[]
  teamId: string
  now: number
}) {
  const upcoming = events.filter((e) => e.startAt >= now).sort((a, b) => a.startAt - b.startAt)
  const past = events.filter((e) => e.startAt < now).sort((a, b) => b.startAt - a.startAt)
  const [next, ...restUpcoming] = upcoming

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-medium text-slate-900">{title}</h2>

      {next ? (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50">
          <EventListItem event={next} teamId={teamId} />
        </div>
      ) : (
        <p className="text-sm text-slate-400">No upcoming {title.toLowerCase()}.</p>
      )}

      {restUpcoming.length > 0 && (
        <details className="group rounded-lg border border-slate-200 bg-white">
          <summary className="cursor-pointer list-none px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <span className="mr-1 inline-block transition-transform group-open:rotate-90">▸</span>
            Upcoming ({restUpcoming.length})
          </summary>
          <ul className="divide-y divide-slate-200 border-t border-slate-200">
            {restUpcoming.map((event) => (
              <li key={event.id}>
                <EventListItem event={event} teamId={teamId} />
              </li>
            ))}
          </ul>
        </details>
      )}

      {past.length > 0 && (
        <details className="group rounded-lg border border-slate-200 bg-white">
          <summary className="cursor-pointer list-none px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <span className="mr-1 inline-block transition-transform group-open:rotate-90">▸</span>
            Past ({past.length})
          </summary>
          <ul className="divide-y divide-slate-200 border-t border-slate-200">
            {past.map((event) => (
              <li key={event.id}>
                <EventListItem event={event} teamId={teamId} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
