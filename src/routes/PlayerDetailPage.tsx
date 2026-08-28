import { addDoc, deleteDoc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { playerDoc, playersCollection } from '../firebase/firestore'
import type { Player } from '../types'

const emptyForm = {
  firstName: '',
  lastName: '',
  jerseyNumber: '',
  positions: '',
  parentName: '',
  parentPhone: '',
  parentEmail: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  medicalNotes: '',
  active: true,
}

export function PlayerDetailPage() {
  const { teamId, playerId } = useParams<{ teamId: string; playerId: string }>()
  const navigate = useNavigate()
  const isNew = playerId === 'new'
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isNew || !teamId || !playerId) return
    return onSnapshot(playerDoc(teamId, playerId), (snap) => {
      const data = snap.data() as Player | undefined
      if (data) {
        setForm({
          firstName: data.firstName,
          lastName: data.lastName,
          jerseyNumber: data.jerseyNumber,
          positions: data.positions.join(', '),
          parentName: data.parentName,
          parentPhone: data.parentPhone,
          parentEmail: data.parentEmail,
          emergencyContactName: data.emergencyContactName,
          emergencyContactPhone: data.emergencyContactPhone,
          medicalNotes: data.medicalNotes,
          active: data.active,
        })
      }
      setLoading(false)
    })
  }, [isNew, teamId, playerId])

  const field = (key: keyof typeof form) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!teamId) return
    setSaving(true)
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        jerseyNumber: form.jerseyNumber,
        positions: form.positions
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean),
        parentName: form.parentName,
        parentPhone: form.parentPhone,
        parentEmail: form.parentEmail,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        medicalNotes: form.medicalNotes,
        active: form.active,
      }
      if (isNew) {
        await addDoc(playersCollection(teamId), { ...payload, createdAt: serverTimestamp() })
      } else if (playerId) {
        await updateDoc(playerDoc(teamId, playerId), payload)
      }
      navigate(`/teams/${teamId}/roster`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!teamId || !playerId || isNew) return
    if (!confirm(`Remove ${form.firstName} ${form.lastName} from the roster?`)) return
    await deleteDoc(playerDoc(teamId, playerId))
    navigate(`/teams/${teamId}/roster`)
  }

  if (loading) return <p className="text-slate-500">Loading player…</p>

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">
        {isNew ? 'Add player' : 'Edit player'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">First name</label>
            <input required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" {...field('firstName')} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Last name</label>
            <input required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" {...field('lastName')} />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-sm font-medium text-slate-700">Jersey #</label>
            <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" {...field('jerseyNumber')} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Positions (comma-separated)
          </label>
          <input
            placeholder="Forward, Midfielder"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...field('positions')}
          />
        </div>

        <fieldset className="space-y-3 rounded-md border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium text-slate-700">Parent contact</legend>
          <input placeholder="Parent name" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" {...field('parentName')} />
          <div className="flex gap-3">
            <input placeholder="Phone" className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" {...field('parentPhone')} />
            <input placeholder="Email" className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" {...field('parentEmail')} />
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-md border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium text-slate-700">Emergency contact</legend>
          <input placeholder="Name" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" {...field('emergencyContactName')} />
          <input placeholder="Phone" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" {...field('emergencyContactPhone')} />
        </fieldset>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Medical notes</label>
          <textarea
            rows={3}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...field('medicalNotes')}
          />
        </div>

        {!isNew && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            Active on roster
          </label>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save player'}
          </button>
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-sm text-red-600 hover:underline"
            >
              Remove from roster
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
