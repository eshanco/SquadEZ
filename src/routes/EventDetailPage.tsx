import { addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db } from '../firebase/config'
import { eventDoc, eventsCollection } from '../firebase/firestore'
import { useRsvps } from '../hooks/useRsvps'
import { usePlayers } from '../hooks/usePlayers'
import type { EventType, TeamEvent } from '../types'
import { fromDateTimeLocalInputValue, toDateTimeLocalInputValue } from '../utils/dates'

const emptyForm = {
  type: 'practice' as EventType,
  title: '',
  startAt: toDateTimeLocalInputValue(Date.now()),
  endAt: toDateTimeLocalInputValue(Date.now() + 60 * 60 * 1000),
  location: '',
  opponent: '',
  notes: '',
  repeatWeekly: false,
  repeatUntil: '',
}

const MAX_RECURRING_OCCURRENCES = 104 // 2 years of weekly events, a generous safety cap

function weeklyOccurrenceStarts(firstStartAt: number, repeatUntilDate: string): number[] {
  const untilEndOfDay = new Date(`${repeatUntilDate}T23:59:59`).getTime()
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const occurrences: number[] = []
  for (
    let start = firstStartAt;
    start <= untilEndOfDay && occurrences.length < MAX_RECURRING_OCCURRENCES;
    start += WEEK_MS
  ) {
    occurrences.push(start)
  }
  return occurrences
}

export function EventDetailPage() {
  const { teamId, eventId } = useParams<{ teamId: string; eventId: string }>()
  const navigate = useNavigate()
  const isNew = eventId === 'new'
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  const { players } = usePlayers(teamId)
  const { rsvps } = useRsvps(teamId, isNew ? undefined : eventId)

  useEffect(() => {
    if (isNew || !teamId || !eventId) return
    return onSnapshot(eventDoc(teamId, eventId), (snap) => {
      const data = snap.data() as TeamEvent | undefined
      if (data) {
        setForm({
          type: data.type,
          title: data.title,
          startAt: toDateTimeLocalInputValue(data.startAt),
          endAt: toDateTimeLocalInputValue(data.endAt),
          location: data.location,
          opponent: data.opponent ?? '',
          notes: data.notes,
          repeatWeekly: false,
          repeatUntil: '',
        })
      }
      setLoading(false)
    })
  }, [isNew, teamId, eventId])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!teamId) return
    setSaving(true)
    try {
      const payload = {
        type: form.type,
        title: form.title,
        startAt: fromDateTimeLocalInputValue(form.startAt),
        endAt: fromDateTimeLocalInputValue(form.endAt),
        location: form.location,
        opponent: form.type === 'game' ? form.opponent : null,
        notes: form.notes,
      }
      if (isNew) {
        if (form.type === 'practice' && form.repeatWeekly && form.repeatUntil) {
          const occurrenceStarts = weeklyOccurrenceStarts(payload.startAt, form.repeatUntil)
          const duration = payload.endAt - payload.startAt
          const batch = writeBatch(db)
          for (const startAt of occurrenceStarts) {
            const ref = doc(eventsCollection(teamId))
            batch.set(ref, {
              ...payload,
              startAt,
              endAt: startAt + duration,
              createdAt: serverTimestamp(),
            })
          }
          await batch.commit()
          navigate(`/teams/${teamId}/schedule`)
        } else {
          const ref = await addDoc(eventsCollection(teamId), {
            ...payload,
            createdAt: serverTimestamp(),
          })
          navigate(`/teams/${teamId}/schedule/${ref.id}`)
        }
      } else if (eventId) {
        await updateDoc(eventDoc(teamId, eventId), payload)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!teamId || !eventId || isNew) return
    if (!confirm(`Delete "${form.title}"?`)) return
    await deleteDoc(eventDoc(teamId, eventId))
    navigate(`/teams/${teamId}/schedule`)
  }

  if (loading) return <p className="text-slate-500">Loading event…</p>

  const rsvpCounts = { yes: 0, no: 0, maybe: 0 }
  for (const r of rsvps) {
    if (r.status === 'yes' || r.status === 'no' || r.status === 'maybe') rsvpCounts[r.status]++
  }
  const noResponse = players.length - rsvps.length

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">{isNew ? 'Add event' : form.title}</h1>

      {!isNew && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm text-slate-500">
            {rsvpCounts.yes} yes · {rsvpCounts.no} no · {rsvpCounts.maybe} maybe · {noResponse} no
            response
          </p>
          <div className="flex gap-3">
            <Link
              to={`/teams/${teamId}/schedule/${eventId}/rsvp`}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Track Attendance
            </Link>
            <Link
              to={`/teams/${teamId}/schedule/${eventId}/lineup`}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Build Lineup
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as EventType }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="practice">Practice</option>
              <option value="game">Game</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Start</label>
            <input
              type="datetime-local"
              required
              value={form.startAt}
              onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">End</label>
            <input
              type="datetime-local"
              required
              value={form.endAt}
              onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {isNew && form.type === 'practice' && (
          <div className="rounded-md border border-slate-200 p-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.repeatWeekly}
                onChange={(e) => setForm((f) => ({ ...f, repeatWeekly: e.target.checked }))}
              />
              Repeats weekly (same day/time)
            </label>
            {form.repeatWeekly && (
              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-slate-700">Until</label>
                <input
                  type="date"
                  required
                  value={form.repeatUntil}
                  onChange={(e) => setForm((f) => ({ ...f, repeatUntil: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Creates a separate practice each week up to and including this date — each one
                  can be edited or deleted individually afterward.
                </p>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
          <input
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {form.type === 'game' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Opponent</label>
            <input
              value={form.opponent}
              onChange={(e) => setForm((f) => ({ ...f, opponent: e.target.value }))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save event'}
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-sm text-red-600 hover:underline"
            >
              Delete event
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
