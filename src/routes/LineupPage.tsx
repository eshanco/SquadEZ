import { serverTimestamp, setDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { lineupDoc } from '../firebase/firestore'
import { useLineup } from '../hooks/useLineup'
import { usePlayers } from '../hooks/usePlayers'
import type { LineupPeriod } from '../types'

export function LineupPage() {
  const { teamId, eventId } = useParams<{ teamId: string; eventId: string }>()
  const { user } = useAuthContext()
  const { players } = usePlayers(teamId)
  const { lineup, loading } = useLineup(teamId, eventId)

  const [formation, setFormation] = useState('')
  const [periods, setPeriods] = useState<LineupPeriod[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (lineup) {
      setFormation(lineup.formation)
      setPeriods(lineup.periods)
    }
  }, [lineup])

  const activePlayers = players.filter((p) => p.active)

  const addPeriod = () => {
    setPeriods((p) => [...p, { label: `Period ${p.length + 1}`, assignments: [] }])
  }

  const removePeriod = (index: number) => {
    setPeriods((p) => p.filter((_, i) => i !== index))
  }

  const updatePeriodLabel = (index: number, label: string) => {
    setPeriods((p) => p.map((period, i) => (i === index ? { ...period, label } : period)))
  }

  const addAssignment = (periodIndex: number) => {
    setPeriods((p) =>
      p.map((period, i) =>
        i === periodIndex
          ? { ...period, assignments: [...period.assignments, { playerId: '', position: '' }] }
          : period,
      ),
    )
  }

  const updateAssignment = (
    periodIndex: number,
    assignmentIndex: number,
    field: 'playerId' | 'position',
    value: string,
  ) => {
    setPeriods((p) =>
      p.map((period, i) =>
        i === periodIndex
          ? {
              ...period,
              assignments: period.assignments.map((a, j) =>
                j === assignmentIndex ? { ...a, [field]: value } : a,
              ),
            }
          : period,
      ),
    )
  }

  const removeAssignment = (periodIndex: number, assignmentIndex: number) => {
    setPeriods((p) =>
      p.map((period, i) =>
        i === periodIndex
          ? { ...period, assignments: period.assignments.filter((_, j) => j !== assignmentIndex) }
          : period,
      ),
    )
  }

  const handleSave = async () => {
    if (!teamId || !eventId || !user) return
    setSaving(true)
    try {
      await setDoc(lineupDoc(teamId, eventId), {
        formation,
        periods,
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-slate-500">Loading lineup…</p>

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Lineup</h1>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Formation</label>
        <input
          placeholder="4-3-3"
          value={formation}
          onChange={(e) => setFormation(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-4">
        {periods.map((period, periodIndex) => (
          <div key={periodIndex} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <input
                value={period.label}
                onChange={(e) => updatePeriodLabel(periodIndex, e.target.value)}
                className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium"
              />
              <button
                onClick={() => removePeriod(periodIndex)}
                className="text-sm text-red-600 hover:underline"
              >
                Remove period
              </button>
            </div>

            <div className="space-y-2">
              {period.assignments.map((assignment, assignmentIndex) => (
                <div key={assignmentIndex} className="flex items-center gap-2">
                  <select
                    value={assignment.playerId}
                    onChange={(e) =>
                      updateAssignment(periodIndex, assignmentIndex, 'playerId', e.target.value)
                    }
                    className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    <option value="">Select player…</option>
                    {activePlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} (#{p.jerseyNumber})
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Position"
                    value={assignment.position}
                    onChange={(e) =>
                      updateAssignment(periodIndex, assignmentIndex, 'position', e.target.value)
                    }
                    className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <button
                    onClick={() => removeAssignment(periodIndex, assignmentIndex)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => addAssignment(periodIndex)}
              className="mt-3 text-sm text-emerald-700 hover:underline"
            >
              + Add player to this period
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={addPeriod}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
        >
          + Add period
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save lineup'}
        </button>
      </div>
    </div>
  )
}
