import type { Player } from '../../types'

export function PlayerChip({
  player,
  compact,
  displayName,
}: {
  player: Player
  compact?: boolean
  displayName?: string
}) {
  return (
    <div
      className={`select-none rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 shadow-sm ${compact ? 'w-full text-center' : ''}`}
    >
      {compact
        ? (displayName ?? player.firstName)
        : `#${player.jerseyNumber} ${player.firstName}`}
    </div>
  )
}
