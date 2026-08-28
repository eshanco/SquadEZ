import { DndContext, type DragEndEvent, useDroppable } from '@dnd-kit/core'
import { addDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { type FormEvent, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PitchSlot } from '../components/lineup/PitchSlot'
import { PlayerChip } from '../components/lineup/PlayerChip'
import { useAuthContext } from '../contexts/AuthContext'
import { formationsCollection, lineupDoc } from '../firebase/firestore'
import { useFormations } from '../hooks/useFormations'
import { useLineup } from '../hooks/useLineup'
import { usePlayers } from '../hooks/usePlayers'
import type { LineupPeriod } from '../types'
import { DEFAULT_FORMATIONS, formationRows, parseFormationShape } from '../utils/formations'

function BenchDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'bench' })
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-16 flex-wrap gap-2 rounded-md border-2 border-dashed p-2 ${
        isOver ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'
      }`}
    >
      {children}
    </div>
  )
}

export function LineupPage() {
  const { teamId, eventId } = useParams<{ teamId: string; eventId: string }>()
  const { user } = useAuthContext()
  const { players } = usePlayers(teamId)
  const { lineup, loading } = useLineup(teamId, eventId)
  const { formations } = useFormations(teamId)

  const [formationId, setFormationId] = useState(DEFAULT_FORMATIONS[1].id) // 4-3-3
  const [periods, setPeriods] = useState<LineupPeriod[]>([])
  const [unavailablePlayerIds, setUnavailablePlayerIds] = useState<string[]>([])
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0)
  const [saving, setSaving] = useState(false)

  const [newFormationOpen, setNewFormationOpen] = useState(false)
  const [newFormationName, setNewFormationName] = useState('')
  const [newFormationShape, setNewFormationShape] = useState('')
  const [newFormationError, setNewFormationError] = useState<string | null>(null)

  useEffect(() => {
    if (lineup) {
      setFormationId(lineup.formationId)
      setPeriods(lineup.periods)
      setUnavailablePlayerIds(lineup.unavailablePlayerIds ?? [])
    }
  }, [lineup])

  const activePlayers = players.filter((p) => p.active)
  const playersById = new Map(activePlayers.map((p) => [p.id, p]))
  const availablePlayers = activePlayers.filter((p) => !unavailablePlayerIds.includes(p.id))
  const unavailablePlayers = activePlayers.filter((p) => unavailablePlayerIds.includes(p.id))
  const selectedFormation = formations.find((f) => f.id === formationId) ?? formations[0]
  const selectedPeriod: LineupPeriod | undefined = periods[selectedPeriodIndex]

  const assignedPlayerIds = new Set(selectedPeriod?.assignments.map((a) => a.playerId) ?? [])
  const benchPlayers = availablePlayers.filter((p) => !assignedPlayerIds.has(p.id))

  const markUnavailable = (playerId: string) => {
    setUnavailablePlayerIds((ids) => [...ids, playerId])
    setPeriods((prev) =>
      prev.map((period) => ({
        ...period,
        assignments: period.assignments.filter((a) => a.playerId !== playerId),
      })),
    )
  }

  const markAvailable = (playerId: string) => {
    setUnavailablePlayerIds((ids) => ids.filter((id) => id !== playerId))
  }

  const addPeriod = () => {
    const previous = periods[periods.length - 1]
    const newPeriod: LineupPeriod = {
      id: crypto.randomUUID(),
      label: `Period ${periods.length + 1}`,
      durationMinutes: previous?.durationMinutes ?? 20,
      assignments: previous ? previous.assignments.map((a) => ({ ...a })) : [],
    }
    setPeriods((p) => [...p, newPeriod])
    setSelectedPeriodIndex(periods.length)
  }

  const removePeriod = (index: number) => {
    setPeriods((p) => p.filter((_, i) => i !== index))
    setSelectedPeriodIndex((i) => Math.max(0, i === index ? i - 1 : i > index ? i - 1 : i))
  }

  const updateSelectedPeriod = (patch: Partial<LineupPeriod>) => {
    setPeriods((prev) =>
      prev.map((period, i) => (i === selectedPeriodIndex ? { ...period, ...patch } : period)),
    )
  }

  const copyFromPreviousPeriod = () => {
    const previous = periods[selectedPeriodIndex - 1]
    if (!previous) return
    updateSelectedPeriod({ assignments: previous.assignments.map((a) => ({ ...a })) })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    if (!selectedFormation) return
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    if (!overId) return

    setPeriods((prev) =>
      prev.map((period, idx) => {
        if (idx !== selectedPeriodIndex) return period

        let sourcePlayerId: string
        let sourceSlotId: string | null = null
        if (activeId.startsWith('bench:')) {
          sourcePlayerId = activeId.slice('bench:'.length)
        } else if (activeId.startsWith('slot:')) {
          sourceSlotId = activeId.slice('slot:'.length)
          const found = period.assignments.find((a) => a.slotId === sourceSlotId)
          if (!found) return period
          sourcePlayerId = found.playerId
        } else {
          return period
        }

        if (overId === 'bench') {
          if (!sourceSlotId) return period // already on the bench
          return {
            ...period,
            assignments: period.assignments.filter((a) => a.slotId !== sourceSlotId),
          }
        }

        if (!overId.startsWith('slot:')) return period
        const targetSlotId = overId.slice('slot:'.length)
        if (targetSlotId === sourceSlotId) return period

        const targetSlot = selectedFormation.slots.find((s) => s.id === targetSlotId)
        if (!targetSlot) return period

        const targetOccupant = period.assignments.find((a) => a.slotId === targetSlotId)
        const next = period.assignments.filter(
          (a) => a.slotId !== sourceSlotId && a.slotId !== targetSlotId,
        )
        next.push({ playerId: sourcePlayerId, slotId: targetSlotId, position: targetSlot.label })

        if (targetOccupant && sourceSlotId) {
          const sourceSlot = selectedFormation.slots.find((s) => s.id === sourceSlotId)
          if (sourceSlot) {
            next.push({
              playerId: targetOccupant.playerId,
              slotId: sourceSlotId,
              position: sourceSlot.label,
            })
          }
        }

        return { ...period, assignments: next }
      }),
    )
  }

  const handleCreateFormation = async (event: FormEvent) => {
    event.preventDefault()
    if (!teamId || !user) return
    setNewFormationError(null)
    try {
      const shape = parseFormationShape(newFormationShape)
      const ref = await addDoc(formationsCollection(teamId), {
        name: newFormationName,
        shape,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      })
      setFormationId(ref.id)
      setNewFormationOpen(false)
      setNewFormationName('')
      setNewFormationShape('')
    } catch (err) {
      setNewFormationError(err instanceof Error ? err.message : 'Failed to create formation')
    }
  }

  const handleSave = async () => {
    if (!teamId || !eventId || !user) return
    setSaving(true)
    try {
      await setDoc(lineupDoc(teamId, eventId), {
        formationId,
        periods,
        unavailablePlayerIds,
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-slate-500">Loading lineup…</p>

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Lineup</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Formation</label>
          <select
            value={formationId}
            onChange={(e) => setFormationId(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {formations.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
                {f.isCustom ? ' (custom)' : ''}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setNewFormationOpen((o) => !o)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
        >
          + New formation
        </button>
      </div>

      {newFormationOpen && (
        <form
          onSubmit={handleCreateFormation}
          className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-white p-3"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input
              required
              value={newFormationName}
              onChange={(e) => setNewFormationName(e.target.value)}
              placeholder="Box midfield"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Shape (defense-mid-attack)
            </label>
            <input
              required
              value={newFormationShape}
              onChange={(e) => setNewFormationShape(e.target.value)}
              placeholder="4-4-2"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Create
          </button>
          {newFormationError && <p className="text-sm text-red-600">{newFormationError}</p>}
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {periods.map((period, index) => (
          <span
            key={period.id}
            className={`flex items-center gap-1 rounded-md pl-3 pr-1.5 py-1.5 text-sm font-medium ${
              index === selectedPeriodIndex
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <button onClick={() => setSelectedPeriodIndex(index)}>{period.label}</button>
            <button
              onClick={() => removePeriod(index)}
              aria-label={`Delete ${period.label}`}
              className={`rounded px-1 leading-none ${
                index === selectedPeriodIndex
                  ? 'hover:bg-emerald-700'
                  : 'hover:bg-slate-300'
              }`}
            >
              ×
            </button>
          </span>
        ))}
        <button
          onClick={addPeriod}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
        >
          + Add period
        </button>
      </div>

      {selectedPeriod && selectedFormation && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Period label
              </label>
              <input
                value={selectedPeriod.label}
                onChange={(e) => updateSelectedPeriod({ label: e.target.value })}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Duration (min)
              </label>
              <input
                type="number"
                min={1}
                value={selectedPeriod.durationMinutes}
                onChange={(e) =>
                  updateSelectedPeriod({ durationMinutes: Number(e.target.value) || 0 })
                }
                className="w-24 rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              />
            </div>
            {selectedPeriodIndex > 0 && (
              <button
                onClick={copyFromPreviousPeriod}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Copy from {periods[selectedPeriodIndex - 1].label}
              </button>
            )}
          </div>

          <DndContext onDragEnd={handleDragEnd}>
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex aspect-[3/4] w-full max-w-sm flex-col-reverse justify-between gap-3 overflow-hidden rounded-lg bg-emerald-600 p-3 sm:w-72">
                <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-white/30" />
                <div className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
                {formationRows(selectedFormation).map((row, rowIndex) => (
                  <div key={rowIndex} className="relative z-10 flex items-center justify-center gap-1 px-1">
                    {row.map((slot) => {
                      const assignment = selectedPeriod.assignments.find(
                        (a) => a.slotId === slot.id,
                      )
                      const player = assignment ? (playersById.get(assignment.playerId) ?? null) : null
                      return (
                        <PitchSlot
                          key={slot.id}
                          slot={slot}
                          player={player}
                          dragId={player ? `slot:${slot.id}` : null}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>

              <div className="flex-1">
                <h2 className="mb-2 text-sm font-medium text-slate-700">
                  Squad ({benchPlayers.length})
                </h2>
                <BenchDropZone>
                  {benchPlayers.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Everyone's on the pitch — drag a player here to bench them.
                    </p>
                  ) : (
                    benchPlayers.map((player) => (
                      <div key={player.id} className="relative">
                        <PlayerChip dragId={`bench:${player.id}`} player={player} />
                        <button
                          onClick={() => markUnavailable(player.id)}
                          aria-label={`Remove ${player.firstName} from available squad`}
                          title="Not available for this one"
                          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-400 text-[10px] leading-none text-white hover:bg-red-500"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </BenchDropZone>

                {unavailablePlayers.length > 0 && (
                  <div className="mt-4">
                    <h2 className="mb-2 text-sm font-medium text-slate-700">
                      Unavailable ({unavailablePlayers.length})
                    </h2>
                    <ul className="space-y-1">
                      {unavailablePlayers.map((player) => (
                        <li
                          key={player.id}
                          className="flex items-center justify-between rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500"
                        >
                          <span>
                            {player.firstName} {player.lastName}
                          </span>
                          <button
                            onClick={() => markAvailable(player.id)}
                            className="text-emerald-700 hover:underline"
                          >
                            + Add back
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </DndContext>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save lineup'}
      </button>
    </div>
  )
}
