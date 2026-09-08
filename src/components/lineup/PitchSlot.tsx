import { slotPositionGroup } from '../../utils/formations'
import type { FormationSlot, Player } from '../../types'

// A cap-sleeve jersey silhouette (v-neck, very short sleeves, wide body),
// traced in a 64x80 (4:5) box so it scales cleanly at any slot size without
// distorting - every slot renders at the same width/aspect ratio regardless
// of how many slots share its row, so a crowded DEF/MID row doesn't squash
// its jerseys narrower than a sparser GK/FW row.
const JERSEY_PATH =
  'M26,5 L16,5 L6,12 L16,20 L16,76 L48,76 L48,20 L58,12 L48,5 L38,5 Q32,14 26,5 Z'

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
      className={`relative flex aspect-[4/5] w-full min-w-0 flex-col items-center justify-center text-center transition-transform ${
        onClick ? 'cursor-pointer hover:scale-105' : ''
      }`}
    >
      <svg
        viewBox="0 0 64 80"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <path
          d={JERSEY_PATH}
          fill={player ? 'white' : 'none'}
          stroke="white"
          strokeWidth={player ? 1.5 : 2}
          strokeOpacity={player ? 1 : 0.5}
          strokeDasharray={player ? undefined : '4 3'}
        />
      </svg>

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-2 pt-2">
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
      </div>

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
