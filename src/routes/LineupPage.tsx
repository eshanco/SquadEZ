import { addDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { type FormEvent, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PitchSlot } from '../components/lineup/PitchSlot'
import { PlayerChip } from '../components/lineup/PlayerChip'
import { PlayerPickerModal } from '../components/lineup/PlayerPickerModal'
import { useAuthContext } from '../contexts/AuthContext'
import { formationsCollection, lineupDoc } from '../firebase/firestore'
import { useFormations } from '../hooks/useFormations'
import { useLineup } from '../hooks/useLineup'
import { usePlayers } from '../hooks/usePlayers'
import type { LineupPeriod, Player, TeamEvent } from '../types'
import { DEFAULT_FORMATIONS, formationRows, parseFormationShape } from '../utils/formations'

// Period labels are derived, not typed in: each period's label is the
// cumulative minute range implied by every period's duration before it, e.g.
// a 20 min period 1 followed by a 25 min period 2 labels them "0-20" and
// "20-45". Recomputed from scratch whenever durations or ordering change.
function withComputedLabels(periods: LineupPeriod[]): LineupPeriod[] {
  let cursor = 0
  return periods.map((period) => {
    const start = cursor
    cursor += period.durationMinutes
    return { ...period, label: `${start}-${cursor}` }
  })
}

// The pitch only has room to show a player's first name - when two players
// on the roster share one, disambiguate both with their last initial (e.g.
// "John S.") so a compact chip never reads as ambiguous.
function buildDisplayNames(players: Player[]): Map<string, string> {
  const firstNameCounts = new Map<string, number>()
  for (const player of players) {
    firstNameCounts.set(player.firstName, (firstNameCounts.get(player.firstName) ?? 0) + 1)
  }
  const displayNames = new Map<string, string>()
  for (const player of players) {
    const isDuplicate = (firstNameCounts.get(player.firstName) ?? 0) > 1
    displayNames.set(
      player.id,
      isDuplicate ? `${player.firstName} ${player.lastName.charAt(0)}.` : player.firstName,
    )
  }
  return displayNames
}

function MinutesSummaryTable({
  periods,
  players,
}: {
  periods: LineupPeriod[]
  players: Player[]
}) {
  if (periods.length === 0 || players.length === 0) return null

  const rows = players
    .map((player) => {
      const perPeriod = periods.map((period) =>
        period.assignments.some((a) => a.playerId === player.id) ? period.durationMinutes : 0,
      )
      const total = perPeriod.reduce((sum, minutes) => sum + minutes, 0)
      return { player, perPeriod, total }
    })
    .sort((a, b) => b.total - a.total)

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-medium text-slate-700">Minutes played</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
            <th className="py-1.5 pr-2 font-medium">Player</th>
            {periods.map((period) => (
              <th key={period.id} className="whitespace-nowrap px-2 py-1.5 text-right font-medium">
                {period.label}
              </th>
            ))}
            <th className="py-1.5 pl-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ player, perPeriod, total }) => (
            <tr key={player.id} className="border-b border-slate-100 last:border-0">
              <td className="py-1.5 pr-2 font-medium text-slate-900">
                {player.firstName} {player.lastName}
              </td>
              {perPeriod.map((minutes, i) => (
                <td key={periods[i].id} className="px-2 py-1.5 text-right text-slate-600">
                  {minutes || '–'}
                </td>
              ))}
              <td className="py-1.5 pl-2 text-right font-semibold text-slate-900">{total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Shows who came on and who went off between the previous period and this
// one, by diffing assignments on playerId. The very first period has no
// prior period to diff against, so callers should skip rendering this then.
function SubstitutionsSummary({
  previousPeriod,
  currentPeriod,
  playersById,
}: {
  previousPeriod: LineupPeriod
  currentPeriod: LineupPeriod
  playersById: Map<string, Player>
}) {
  const previousIds = new Set(previousPeriod.assignments.map((a) => a.playerId))
  const currentIds = new Set(currentPeriod.assignments.map((a) => a.playerId))

  const cameOn = currentPeriod.assignments.filter((a) => !previousIds.has(a.playerId))
  const wentOff = previousPeriod.assignments.filter((a) => !currentIds.has(a.playerId))

  const nameAndPosition = (playerId: string, position: string) => {
    const player = playersById.get(playerId)
    if (!player) return null
    return `${player.firstName} ${player.lastName} (${position})`
  }

  if (cameOn.length === 0 && wentOff.length === 0) {
    return <p className="text-xs text-slate-400">No changes from {previousPeriod.label}.</p>
  }

  return (
    <div className="space-y-1 text-xs">
      {cameOn.length > 0 && (
        <p>
          <span className="font-medium text-emerald-700">On: </span>
          <span className="text-slate-600">
            {cameOn
              .map((a) => nameAndPosition(a.playerId, a.position))
              .filter(Boolean)
              .join(', ')}
          </span>
        </p>
      )}
      {wentOff.length > 0 && (
        <p>
          <span className="font-medium text-red-700">Off: </span>
          <span className="text-slate-600">
            {wentOff
              .map((a) => nameAndPosition(a.playerId, a.position))
              .filter(Boolean)
              .join(', ')}
          </span>
        </p>
      )}
    </div>
  )
}

export function LineupPage({ event }: { event: TeamEvent }) {
  const { teamId, eventId } = useParams<{ teamId: string; eventId: string }>()
  const { user } = useAuthContext()
  const { players } = usePlayers(teamId)
  const { lineup, loading } = useLineup(teamId, eventId)
  const { formations } = useFormations(teamId)

  const isPast = event.endAt < Date.now()
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const editing = !isPast || editingEventId === event.id
  const readOnly = !editing

  const [formationId, setFormationId] = useState(DEFAULT_FORMATIONS[1].id) // 4-3-3
  const [periods, setPeriods] = useState<LineupPeriod[]>([])
  const [unavailablePlayerIds, setUnavailablePlayerIds] = useState<string[]>([])
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [pickerSlotId, setPickerSlotId] = useState<string | null>(null)

  const [newFormationOpen, setNewFormationOpen] = useState(false)
  const [newFormationName, setNewFormationName] = useState('')
  const [newFormationShape, setNewFormationShape] = useState('')
  const [newFormationError, setNewFormationError] = useState<string | null>(null)

  useEffect(() => {
    if (lineup) {
      setFormationId(lineup.formationId)
      setPeriods(withComputedLabels(lineup.periods))
      setUnavailablePlayerIds(lineup.unavailablePlayerIds ?? [])
    }
  }, [lineup])

  // A brand-new lineup (nothing saved yet) starts with zero periods, which
  // hides the pitch entirely - seed one default period once loading settles
  // and confirms there's really nothing saved, so the pitch is visible
  // immediately instead of behind an easy-to-miss "+ Add period" click.
  // Gated on `!lineup` rather than `periods.length === 0`: when a saved
  // lineup exists, this effect and the one above both fire in the same
  // render (setLineup/setLoading are batched), and `periods` here would
  // still read its pre-update value - seeding a blank period on top of one
  // that's about to be populated from `lineup.periods`.
  useEffect(() => {
    if (!loading && !readOnly && !lineup && periods.length === 0) {
      setPeriods(
        withComputedLabels([
          {
            id: crypto.randomUUID(),
            label: '',
            durationMinutes: 20,
            assignments: [],
          },
        ]),
      )
    }
  }, [loading, readOnly, lineup, periods.length])

  const activePlayers = players.filter((p) => p.active)
  const playersById = new Map(activePlayers.map((p) => [p.id, p]))
  const displayNames = buildDisplayNames(activePlayers)
  const availablePlayers = activePlayers.filter((p) => !unavailablePlayerIds.includes(p.id))
  const unavailablePlayers = activePlayers.filter((p) => unavailablePlayerIds.includes(p.id))
  const selectedFormation = formations.find((f) => f.id === formationId) ?? formations[0]
  const selectedPeriod: LineupPeriod | undefined = periods[selectedPeriodIndex]

  const assignedPlayerIds = new Set(selectedPeriod?.assignments.map((a) => a.playerId) ?? [])
  const benchPlayers = availablePlayers.filter((p) => !assignedPlayerIds.has(p.id))
  const assignedSlotLabelByPlayer = new Map(
    (selectedPeriod?.assignments ?? []).map((a) => [a.playerId, a.position]),
  )
  const pickerSlot = selectedFormation?.slots.find((s) => s.id === pickerSlotId) ?? null
  const pickerCurrentOccupantId = pickerSlot
    ? (selectedPeriod?.assignments.find((a) => a.slotId === pickerSlot.id)?.playerId ?? null)
    : null
  const pickerCandidates = availablePlayers.filter((p) => p.id !== pickerCurrentOccupantId)

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

  const removeFromPitch = (slotId: string) => {
    setPeriods((prev) =>
      prev.map((period, i) =>
        i === selectedPeriodIndex
          ? { ...period, assignments: period.assignments.filter((a) => a.slotId !== slotId) }
          : period,
      ),
    )
  }

  const addPeriod = () => {
    const previous = periods[periods.length - 1]
    const newPeriod: LineupPeriod = {
      id: crypto.randomUUID(),
      label: '',
      durationMinutes: previous?.durationMinutes ?? 20,
      assignments: previous ? previous.assignments.map((a) => ({ ...a })) : [],
    }
    setPeriods((p) => withComputedLabels([...p, newPeriod]))
    setSelectedPeriodIndex(periods.length)
  }

  const removePeriod = (index: number) => {
    setPeriods((p) => withComputedLabels(p.filter((_, i) => i !== index)))
    setSelectedPeriodIndex((i) => Math.max(0, i === index ? i - 1 : i > index ? i - 1 : i))
  }

  const updateSelectedPeriod = (patch: Partial<LineupPeriod>) => {
    setPeriods((prev) =>
      withComputedLabels(
        prev.map((period, i) => (i === selectedPeriodIndex ? { ...period, ...patch } : period)),
      ),
    )
  }

  const copyFromPreviousPeriod = () => {
    const previous = periods[selectedPeriodIndex - 1]
    if (!previous) return
    updateSelectedPeriod({ assignments: previous.assignments.map((a) => ({ ...a })) })
  }

  // Assigns playerId to slotId, benching whoever previously held that slot
  // and vacating any other slot the player was already occupying.
  const assignPlayerToSlot = (playerId: string, slotId: string) => {
    const slot = selectedFormation?.slots.find((s) => s.id === slotId)
    if (!slot) return
    setPeriods((prev) =>
      prev.map((period, i) => {
        if (i !== selectedPeriodIndex) return period
        const next = period.assignments.filter(
          (a) => a.slotId !== slotId && a.playerId !== playerId,
        )
        next.push({ playerId, slotId, position: slot.label })
        return { ...period, assignments: next }
      }),
    )
  }

  const handleCreateFormation = async (formEvent: FormEvent) => {
    formEvent.preventDefault()
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
      setEditingEventId(null)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-slate-500">Loading lineup…</p>

  if (readOnly) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Lineup</h1>
          <button
            onClick={() => setEditingEventId(event.id)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            {periods.length === 0 ? 'Add lineup' : 'Edit lineup'}
          </button>
        </div>

        {periods.length === 0 ? (
          <p className="text-slate-500">No lineup was recorded for this game.</p>
        ) : (
          <div className="space-y-4">
            {selectedFormation && (
              <p className="text-sm text-slate-500">Formation: {selectedFormation.name}</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {periods.map((period, index) => (
                <button
                  key={period.id}
                  onClick={() => setSelectedPeriodIndex(index)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    index === selectedPeriodIndex
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>

            {selectedPeriod && selectedFormation && (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">{selectedPeriod.label} min</p>

                <div className="space-y-4">
                  <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-2 overflow-hidden rounded-lg bg-emerald-600 p-4">
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-white/30" />
                    <div className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
                    {formationRows(selectedFormation).map((row, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="relative z-10 flex items-center justify-center gap-3 px-3"
                      >
                        {row.map((slot) => {
                          const assignment = selectedPeriod.assignments.find(
                            (a) => a.slotId === slot.id,
                          )
                          const player = assignment
                            ? (playersById.get(assignment.playerId) ?? null)
                            : null
                          return (
                            <PitchSlot
                              key={slot.id}
                              slot={slot}
                              player={player}
                              displayName={player ? displayNames.get(player.id) : undefined}
                            />
                          )
                        })}
                      </div>
                    ))}
                  </div>

                  <div>
                    <h2 className="mb-2 text-sm font-medium text-slate-700">
                      Bench ({benchPlayers.length})
                    </h2>
                    {benchPlayers.length === 0 ? (
                      <p className="text-xs text-slate-400">No one on the bench.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {benchPlayers.map((player) => (
                          <span
                            key={player.id}
                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-800 shadow-sm"
                          >
                            #{player.jerseyNumber} {player.firstName}
                          </span>
                        ))}
                      </div>
                    )}

                    {selectedPeriodIndex > 0 && (
                      <div className="mt-4">
                        <h2 className="mb-2 text-sm font-medium text-slate-700">Substitutions</h2>
                        <SubstitutionsSummary
                          previousPeriod={periods[selectedPeriodIndex - 1]}
                          currentPeriod={selectedPeriod}
                          playersById={playersById}
                        />
                      </div>
                    )}

                    {unavailablePlayers.length > 0 && (
                      <div className="mt-4">
                        <h2 className="mb-2 text-sm font-medium text-slate-700">
                          Unavailable ({unavailablePlayers.length})
                        </h2>
                        <ul className="space-y-1">
                          {unavailablePlayers.map((player) => (
                            <li
                              key={player.id}
                              className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500"
                            >
                              {player.firstName} {player.lastName}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <MinutesSummaryTable periods={periods} players={availablePlayers} />
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Lineup</h1>
        {isPast && (
          <span className="text-xs uppercase tracking-wide text-amber-600">Editing played game</span>
        )}
      </div>

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
              <p className="mb-1 text-sm font-medium text-slate-700">Period {selectedPeriodIndex + 1}</p>
              <p className="text-sm text-slate-500">{selectedPeriod.label} min</p>
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

          <div className="space-y-4">
            <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-2 overflow-hidden rounded-lg bg-emerald-600 p-4">
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-white/30" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
              {formationRows(selectedFormation).map((row, rowIndex) => (
                <div key={rowIndex} className="relative z-10 flex items-center justify-center gap-3 px-3">
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
                        onClick={() => setPickerSlotId(slot.id)}
                        onRemove={player ? () => removeFromPitch(slot.id) : undefined}
                        displayName={player ? displayNames.get(player.id) : undefined}
                      />
                    )
                  })}
                </div>
              ))}
            </div>

            <div>
              <h2 className="mb-2 text-sm font-medium text-slate-700">
                Bench ({benchPlayers.length})
              </h2>
              <div className="flex min-h-16 flex-wrap gap-2 rounded-md border-2 border-dashed border-slate-200 p-2">
                {benchPlayers.length === 0 ? (
                  <p className="text-xs text-slate-400">Everyone's on the pitch.</p>
                ) : (
                  benchPlayers.map((player) => (
                    <div key={player.id} className="relative">
                      <PlayerChip player={player} />
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
              </div>

              {selectedPeriodIndex > 0 && (
                <div className="mt-4">
                  <h2 className="mb-2 text-sm font-medium text-slate-700">Substitutions</h2>
                  <SubstitutionsSummary
                    previousPeriod={periods[selectedPeriodIndex - 1]}
                    currentPeriod={selectedPeriod}
                    playersById={playersById}
                  />
                </div>
              )}

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

          {pickerSlot && (
            <PlayerPickerModal
              slot={pickerSlot}
              players={pickerCandidates}
              assignedSlotLabelByPlayer={assignedSlotLabelByPlayer}
              onSelect={(playerId) => {
                assignPlayerToSlot(playerId, pickerSlot.id)
                setPickerSlotId(null)
              }}
              onClose={() => setPickerSlotId(null)}
            />
          )}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save lineup'}
      </button>

      <MinutesSummaryTable periods={periods} players={availablePlayers} />
    </div>
  )
}
