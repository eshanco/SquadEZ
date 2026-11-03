import { addDoc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PitchMarkings } from '../components/lineup/PitchMarkings'
import { PitchSlot } from '../components/lineup/PitchSlot'
import { PlayerPickerModal } from '../components/lineup/PlayerPickerModal'
import { useAuthContext } from '../contexts/AuthContext'
import { useTeamContext } from '../contexts/TeamContext'
import { lineupTemplateDoc, lineupTemplatesCollection } from '../firebase/firestore'
import { useFormations } from '../hooks/useFormations'
import { useLineupTemplates } from '../hooks/useLineupTemplates'
import { usePlayers } from '../hooks/usePlayers'
import type { LineupAssignment, LineupTemplate } from '../types'
import { DEFAULT_FORMATIONS, formationRows } from '../utils/formations'
import { teamJerseyColors } from '../utils/jersey'
import { canEdit } from '../utils/roles'

const PITCH_BACKGROUND = {
  backgroundColor: '#059669',
  backgroundImage:
    'repeating-linear-gradient(to bottom, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 10%, rgba(0,0,0,0.04) 10%, rgba(0,0,0,0.04) 20%)',
}

// Durations are edited as raw strings so a field can be cleared mid-edit
// without snapping back to a number - they're only parsed on save.
interface DraftPeriod {
  key: string
  duration: string
  formationId: string
}

function newDraftPeriod(formationId: string, duration = '20'): DraftPeriod {
  return { key: crypto.randomUUID(), duration, formationId }
}

function parseDuration(value: string): number | null {
  const parsed = Number(value)
  return value.trim() !== '' && Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function TemplateEditor({ template }: { template: LineupTemplate | null }) {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { team } = useTeamContext()
  const { players } = usePlayers(teamId)
  const { formations } = useFormations(teamId)

  const [name, setName] = useState(template?.name ?? '')
  const [periods, setPeriods] = useState<DraftPeriod[]>(() =>
    template
      ? template.periods.map((p) => newDraftPeriod(p.formationId, String(p.durationMinutes)))
      : [newDraftPeriod(DEFAULT_FORMATIONS[1].id)],
  )
  const [startingAssignments, setStartingAssignments] = useState<LineupAssignment[]>(
    template?.startingAssignments ?? [],
  )
  const [pickerSlotId, setPickerSlotId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activePlayers = players.filter((p) => p.active)
  const playersById = new Map(activePlayers.map((p) => [p.id, p]))
  const { color: jerseyColor, trimColor: jerseyTrimColor } = teamJerseyColors(team)

  const firstFormation = formations.find((f) => f.id === periods[0]?.formationId) ?? formations[0]
  const pitchRows = firstFormation ? formationRows(firstFormation) : []
  const pitchColumns = Math.max(1, ...pitchRows.map((row) => row.length))
  const pitchGridUnits = pitchColumns * 2
  const pickerSlot = firstFormation?.slots.find((s) => s.id === pickerSlotId) ?? null
  const assignedIds = new Set(startingAssignments.map((a) => a.playerId))
  const unassignedPlayers = activePlayers.filter((p) => !assignedIds.has(p.id))

  const updatePeriod = (index: number, patch: Partial<DraftPeriod>) => {
    // Slot ids are formation-relative, so the starting team can't survive a
    // change to period 1's formation.
    if (index === 0 && patch.formationId && patch.formationId !== periods[0].formationId) {
      setStartingAssignments([])
    }
    setPeriods((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  const addPeriod = () => {
    const last = periods[periods.length - 1]
    setPeriods((prev) => [
      ...prev,
      newDraftPeriod(last?.formationId ?? DEFAULT_FORMATIONS[1].id, last?.duration ?? '20'),
    ])
  }

  const removePeriod = (index: number) => {
    if (index === 0) setStartingAssignments([])
    setPeriods((prev) => prev.filter((_, i) => i !== index))
  }

  const assignPlayerToSlot = (playerId: string, slotId: string) => {
    const slot = firstFormation?.slots.find((s) => s.id === slotId)
    if (!slot) return
    setStartingAssignments((prev) => [
      ...prev.filter((a) => a.slotId !== slotId && a.playerId !== playerId),
      { playerId, slotId, position: slot.label },
    ])
  }

  const handleSave = async (formEvent: FormEvent) => {
    formEvent.preventDefault()
    if (!teamId || !user) return
    setError(null)
    const parsedPeriods = periods.map((p) => ({
      durationMinutes: parseDuration(p.duration),
      formationId: p.formationId,
    }))
    if (parsedPeriods.length === 0) {
      setError('Add at least one period.')
      return
    }
    if (parsedPeriods.some((p) => p.durationMinutes === null)) {
      setError('Every period needs a duration greater than 0.')
      return
    }
    const data = {
      name: name.trim(),
      periods: parsedPeriods,
      startingAssignments,
    }
    setSaving(true)
    try {
      if (template) {
        await setDoc(lineupTemplateDoc(teamId, template.id), data, { merge: true })
      } else {
        await addDoc(lineupTemplatesCollection(teamId), {
          ...data,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        })
      }
      navigate(`/teams/${teamId}/lineup`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!teamId || !template) return
    if (!window.confirm(`Delete the "${template.name}" template?`)) return
    try {
      await deleteDoc(lineupTemplateDoc(teamId, template.id))
      navigate(`/teams/${teamId}/lineup`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Template name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="League 4x15"
          className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-700">Periods</h2>
        <div className="space-y-2">
          {periods.map((period, index) => (
            <div
              key={period.key}
              className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-white p-3"
            >
              <p className="w-20 pb-2 text-sm font-medium text-slate-700">Period {index + 1}</p>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Duration (min)</label>
                <input
                  type="number"
                  min={1}
                  value={period.duration}
                  onChange={(e) => updatePeriod(index, { duration: e.target.value })}
                  className="w-24 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Formation</label>
                <select
                  value={period.formationId}
                  onChange={(e) => updatePeriod(index, { formationId: e.target.value })}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                >
                  {formations.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                      {f.isCustom ? ' (custom)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {periods.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePeriod(index)}
                  aria-label={`Remove period ${index + 1}`}
                  className="ml-auto rounded-md px-2 py-1.5 text-sm text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addPeriod}
          className="mt-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          + Add period
        </button>
      </div>

      {firstFormation && (
        <div>
          <h2 className="mb-1 text-sm font-medium text-slate-700">Starting team (period 1)</h2>
          <p className="mb-3 text-xs text-slate-500">
            Optional. Click a position to pick a player. Players who are unavailable for a game are
            left out when the template is loaded.
          </p>
          <div
            className="relative mx-auto grid w-full max-w-2xl gap-x-2 gap-y-3 overflow-hidden rounded-lg px-4 pt-4 pb-8"
            style={{ ...PITCH_BACKGROUND, gridTemplateColumns: `repeat(${pitchGridUnits}, minmax(0, 1fr))` }}
          >
            <PitchMarkings />
            {pitchRows.map((row, rowIndex) => {
              const startUnit = pitchColumns - row.length + 1
              return row.map((slot, colIndex) => {
                const assignment = startingAssignments.find((a) => a.slotId === slot.id)
                const player = assignment ? (playersById.get(assignment.playerId) ?? null) : null
                return (
                  <div
                    key={slot.id}
                    className="relative z-10"
                    style={{
                      gridColumn: `${startUnit + colIndex * 2} / span 2`,
                      gridRow: rowIndex + 1,
                    }}
                  >
                    <PitchSlot
                      slot={slot}
                      player={player}
                      jerseyColor={jerseyColor}
                      jerseyTrimColor={jerseyTrimColor}
                      onClick={() => setPickerSlotId(slot.id)}
                      onRemove={
                        player
                          ? () =>
                              setStartingAssignments((prev) =>
                                prev.filter((a) => a.slotId !== slot.id),
                              )
                          : undefined
                      }
                      displayName={player?.firstName}
                    />
                  </div>
                )
              })
            })}
          </div>
        </div>
      )}

      {pickerSlot && (
        <PlayerPickerModal
          slot={pickerSlot}
          players={unassignedPlayers}
          onSelect={(playerId) => {
            assignPlayerToSlot(playerId, pickerSlot.id)
            setPickerSlotId(null)
          }}
          onClose={() => setPickerSlotId(null)}
        />
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : template ? 'Save template' : 'Create template'}
        </button>
        <Link
          to={`/teams/${teamId}/lineup`}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          Cancel
        </Link>
        {template && (
          <button
            type="button"
            onClick={handleDelete}
            className="ml-auto rounded-md border border-slate-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Delete template
          </button>
        )}
      </div>
    </form>
  )
}

export function GameTemplatePage() {
  const { teamId, templateId } = useParams<{ teamId: string; templateId?: string }>()
  const { role } = useTeamContext()
  const { templates, loading } = useLineupTemplates(teamId)

  const template = templateId ? (templates.find((t) => t.id === templateId) ?? null) : null
  const otherTemplates = templates.filter((t) => t.id !== templateId)

  if (!canEdit(role)) {
    return <p className="text-slate-500">Only coaches can manage game templates.</p>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link to={`/teams/${teamId}/lineup`} className="text-sm text-slate-500 hover:underline">
          ← Game Management
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          {templateId ? 'Edit game template' : 'New game template'}
        </h1>
        <p className="text-sm text-slate-500">
          Set the periods, formations and starting team, then load it from any game's lineup.
        </p>
      </div>

      {otherTemplates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Saved templates:</span>
          {otherTemplates.map((t) => (
            <Link
              key={t.id}
              to={`/teams/${teamId}/templates/${t.id}`}
              className="rounded-md bg-slate-100 px-2.5 py-1 text-slate-700 hover:bg-slate-200"
            >
              {t.name}
            </Link>
          ))}
          {templateId && (
            <Link
              to={`/teams/${teamId}/templates/new`}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-slate-700 hover:bg-slate-50"
            >
              + New
            </Link>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : templateId && !template ? (
        <p className="text-slate-500">Template not found.</p>
      ) : (
        <TemplateEditor key={templateId ?? 'new'} template={template} />
      )}
    </div>
  )
}
