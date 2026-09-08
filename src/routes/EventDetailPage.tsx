import { addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTeamContext } from '../contexts/TeamContext'
import { db } from '../firebase/config'
import { eventDoc, eventsCollection } from '../firebase/firestore'
import type { CompetitionType, EventType, HomeAway, TeamEvent } from '../types'
import {
  fromDateTimeLocalInputValue,
  roundUpToNextHour,
  toDateTimeLocalInputValue,
} from '../utils/dates'
import { canEdit } from '../utils/roles'

const GAME_DURATION_MINUTES = 90
const DATETIME_STEP_SECONDS = 300 // 5 minute increments

const COMPETITION_TYPES: CompetitionType[] = ['league', 'cup', 'friendly']
const HOME_AWAY_TYPES: HomeAway[] = ['home', 'away']

const emptyFormShape = {
  type: 'practice' as EventType,
  title: '',
  startAt: '',
  endAt: '',
  location: '',
  opponent: '',
  competition: 'league' as CompetitionType,
  homeAway: 'home' as HomeAway,
  htHome: '',
  htAway: '',
  ftHome: '',
  ftAway: '',
  notes: '',
  repeatWeekly: false,
  repeatUntil: '',
}

// Empty string means "not entered yet" - distinct from an actual 0-0 score.
function parseScoreInput(value: string): number | null {
  return value === '' ? null : Number(value)
}

function scoreInputValue(value: number | null | undefined): string {
  return value == null ? '' : String(value)
}

function makeEmptyForm(initialType: EventType): typeof emptyFormShape {
  return {
    ...emptyFormShape,
    type: initialType,
    startAt: toDateTimeLocalInputValue(roundUpToNextHour(Date.now())),
    endAt: toDateTimeLocalInputValue(roundUpToNextHour(Date.now()) + 60 * 60 * 1000),
  }
}

// The page each event type "belongs" to, used to send the user back
// somewhere useful after creating, editing, or deleting an event.
function homePathFor(teamId: string, type: EventType) {
  return type === 'game' ? `/teams/${teamId}/lineup` : `/teams/${teamId}/attendance`
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

function toggleClass(active: boolean) {
  return `flex-1 rounded-md px-3 py-2 text-center text-sm font-medium ${
    active ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  }`
}

export function EventDetailPage() {
  const { teamId, eventId } = useParams<{ teamId: string; eventId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { role } = useTeamContext()
  const editable = canEdit(role)
  const isNew = eventId === 'new'
  const initialType =
    (location.state as { initialType?: EventType } | null)?.initialType ?? 'practice'
  const [form, setForm] = useState(() => makeEmptyForm(initialType))
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

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
          competition: data.competition ?? 'league',
          homeAway: data.homeAway ?? 'home',
          htHome: scoreInputValue(data.score?.halftimeHome),
          htAway: scoreInputValue(data.score?.halftimeAway),
          ftHome: scoreInputValue(data.score?.fulltimeHome),
          ftAway: scoreInputValue(data.score?.fulltimeAway),
          notes: data.notes,
          repeatWeekly: false,
          repeatUntil: '',
        })
      }
      setLoading(false)
    })
  }, [isNew, teamId, eventId])

  const isGame = form.type === 'game'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!teamId) return
    setSaving(true)
    try {
      const startAt = fromDateTimeLocalInputValue(form.startAt)
      const payload = {
        type: form.type,
        title: isGame ? form.opponent.trim() : form.title,
        startAt,
        endAt: isGame
          ? startAt + GAME_DURATION_MINUTES * 60 * 1000
          : fromDateTimeLocalInputValue(form.endAt),
        location: form.location,
        opponent: isGame ? form.opponent.trim() : null,
        competition: isGame ? form.competition : null,
        homeAway: isGame ? form.homeAway : null,
        score: isGame
          ? {
              halftimeHome: parseScoreInput(form.htHome),
              halftimeAway: parseScoreInput(form.htAway),
              fulltimeHome: parseScoreInput(form.ftHome),
              fulltimeAway: parseScoreInput(form.ftAway),
            }
          : null,
        notes: form.notes,
      }
      if (isNew) {
        if (form.type === 'practice' && form.repeatWeekly && form.repeatUntil) {
          const occurrenceStarts = weeklyOccurrenceStarts(payload.startAt, form.repeatUntil)
          const duration = payload.endAt - payload.startAt
          const batch = writeBatch(db)
          let firstRefId: string | undefined
          for (const occurrenceStart of occurrenceStarts) {
            const ref = doc(eventsCollection(teamId))
            firstRefId ??= ref.id
            batch.set(ref, {
              ...payload,
              startAt: occurrenceStart,
              endAt: occurrenceStart + duration,
              cancelled: false,
              createdAt: serverTimestamp(),
            })
          }
          await batch.commit()
          navigate(homePathFor(teamId, form.type), { state: { highlightEventId: firstRefId } })
        } else {
          const ref = await addDoc(eventsCollection(teamId), {
            ...payload,
            cancelled: false,
            createdAt: serverTimestamp(),
          })
          navigate(homePathFor(teamId, form.type), { state: { highlightEventId: ref.id } })
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
    navigate(homePathFor(teamId, form.type))
  }

  if (loading) return <p className="text-slate-500">Loading event…</p>

  const heading = isNew ? (isGame ? 'Add Game' : 'Add Session') : isGame ? `vs ${form.title}` : form.title

  return (
    <div className="max-w-lg space-y-6">
      {teamId && (
        <Link
          to={homePathFor(teamId, form.type)}
          className="text-sm text-emerald-700 hover:underline"
        >
          ← Back to {isGame ? 'Game Management' : 'Training'}
        </Link>
      )}

      <h1 className="text-2xl font-semibold text-slate-900">{heading}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset disabled={!editable} className="m-0 min-w-0 space-y-4 border-0 p-0">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, type: 'game' }))}
            className={toggleClass(isGame)}
          >
            Matches
          </button>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, type: 'practice' }))}
            className={toggleClass(!isGame)}
          >
            Training
          </button>
        </div>

        {isGame ? (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Opponent</label>
              <input
                required
                value={form.opponent}
                onChange={(e) => setForm((f) => ({ ...f, opponent: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Competition</label>
              <div className="flex gap-2">
                {COMPETITION_TYPES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, competition: c }))}
                    className={toggleClass(form.competition === c)}
                  >
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Venue</label>
              <div className="flex gap-2">
                {HOME_AWAY_TYPES.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, homeAway: h }))}
                    className={toggleClass(form.homeAway === h)}
                  >
                    {h.charAt(0).toUpperCase() + h.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Score</label>
              <div className="flex flex-wrap gap-3">
                <div>
                  <p className="mb-1 text-xs text-slate-500">Half-time (H–A)</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      value={form.htHome}
                      onChange={(e) => setForm((f) => ({ ...f, htHome: e.target.value }))}
                      className="w-14 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                    <span className="text-slate-400">–</span>
                    <input
                      type="number"
                      min={0}
                      value={form.htAway}
                      onChange={(e) => setForm((f) => ({ ...f, htAway: e.target.value }))}
                      className="w-14 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-xs text-slate-500">Full-time (H–A)</p>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      value={form.ftHome}
                      onChange={(e) => setForm((f) => ({ ...f, ftHome: e.target.value }))}
                      className="w-14 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                    <span className="text-slate-400">–</span>
                    <input
                      type="number"
                      min={0}
                      value={form.ftAway}
                      onChange={(e) => setForm((f) => ({ ...f, ftAway: e.target.value }))}
                      className="w-14 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Start</label>
              <input
                type="datetime-local"
                step={DATETIME_STEP_SECONDS}
                required
                value={form.startAt}
                onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-700">Start</label>
                <input
                  type="datetime-local"
                  step={DATETIME_STEP_SECONDS}
                  required
                  value={form.startAt}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startAt: e.target.value, endAt: e.target.value }))
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-slate-700">End</label>
                <input
                  type="datetime-local"
                  step={DATETIME_STEP_SECONDS}
                  required
                  value={form.endAt}
                  onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {isNew && (
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
                      Creates a separate practice each week up to and including this date — each
                      one can be edited or deleted individually afterward.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
          <input
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        </fieldset>

        {editable && (
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
        )}
      </form>
    </div>
  )
}
