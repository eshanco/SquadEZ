import { useEffect } from 'react'
import type { FormationSlot, Player, PositionGroup } from '../../types'
import { positionPickOrder, slotPositionGroup } from '../../utils/formations'

const GROUP_LABELS: Record<PositionGroup, string> = {
  GK: 'Keepers',
  DEF: 'Defenders',
  MID: 'Midfielders',
  FW: 'Forwards',
}

function sortByJersey(players: Player[]): Player[] {
  return [...players].sort(
    (a, b) => Number(a.jerseyNumber) - Number(b.jerseyNumber) || a.lastName.localeCompare(b.lastName),
  )
}

export function PlayerPickerModal({
  slot,
  players,
  onSelect,
  onClose,
}: {
  slot: FormationSlot
  players: Player[]
  onSelect: (playerId: string) => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Group candidates by their best-matching position, ordered starting from
  // the clicked slot's own category (e.g. a DEF slot lists DEF, MID, FW, GK).
  // A player counts under the first category in that order they're eligible
  // for, so someone listed as both DEF and MID appears once, in the earlier
  // section for this particular slot.
  const order = positionPickOrder(slotPositionGroup(slot))
  const buckets = new Map<PositionGroup, Player[]>(order.map((g) => [g, []]))
  const other: Player[] = []
  for (const player of players) {
    const match = order.find((g) => player.positions.includes(g))
    if (match) buckets.get(match)!.push(player)
    else other.push(player)
  }

  const sections = [
    ...order.map((g) => ({ label: GROUP_LABELS[g], players: sortByJersey(buckets.get(g) ?? []) })),
    ...(other.length ? [{ label: 'Other', players: sortByJersey(other) }] : []),
  ].filter((s) => s.players.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-lg bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">{slot.label}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ×
          </button>
        </div>

        {sections.length === 0 ? (
          <p className="text-sm text-slate-400">No available players.</p>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.label}>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {section.label}
                </h3>
                <ul className="space-y-1">
                  {section.players.map((player) => (
                    <li key={player.id}>
                      <button
                        onClick={() => onSelect(player.id)}
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-emerald-50"
                      >
                        <span className="font-medium text-slate-800">
                          #{player.jerseyNumber} {player.firstName} {player.lastName}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
