import { slotPositionGroup } from '../../utils/formations'
import type { FormationSlot, Player } from '../../types'

export function PitchSlot({
  slot,
  player,
  onClick,
  onRemove,
  displayName,
}: {
  slot: FormationSlot
  player: Player | null
  onClick?: () => void
  onRemove?: () => void
  displayName?: string
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative flex aspect-[4/3] w-full min-w-0 flex-col items-center justify-center rounded-xl px-2 text-center transition-transform ${
        player ? 'bg-white' : 'border-2 border-dashed border-white/50'
      } ${onClick ? 'cursor-pointer hover:scale-105' : ''}`}
    >
      {player ? (
        <>
          <span className="w-full truncate text-sm font-bold leading-tight text-emerald-800">
            {displayName ?? player.firstName}
          </span>
          <span className="text-[10px] font-semibold uppercase leading-tight text-emerald-700/70">
            {slotPositionGroup(slot)}
          </span>
        </>
      ) : (
        <span className="text-xs font-semibold text-white/90">{slot.label}</span>
      )}

      {player && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          aria-label={`Move ${player.firstName} to bench`}
          title="Move to bench"
          className="absolute -right-1.5 -top-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-slate-500 text-sm leading-none text-white hover:bg-red-500"
        >
          ×
        </button>
      )}
    </div>
  )
}
