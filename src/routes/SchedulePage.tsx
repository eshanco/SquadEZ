import { Link, useParams } from 'react-router-dom'
import { EventTypeSection } from '../components/schedule/EventTypeSection'
import { useEvents } from '../hooks/useEvents'

export function SchedulePage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { events, loading } = useEvents(teamId)

  const now = Date.now()
  const practices = events.filter((e) => e.type === 'practice')
  const games = events.filter((e) => e.type === 'game')

  return (
    <div className="space-y-6">
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
        <>
          <EventTypeSection title="Practice" events={practices} teamId={teamId as string} now={now} />
          <EventTypeSection title="Matches" events={games} teamId={teamId as string} now={now} />
        </>
      )}
    </div>
  )
}
