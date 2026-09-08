import { slotPositionGroup } from '../../utils/formations'
import type { FormationSlot, Player } from '../../types'

// A cropped cap-sleeve jersey silhouette (v-neck, very short sleeves, wide
// body, short hem just below the chest) - traced in a 64x48 (4:3) box so it
// scales cleanly at any slot size without distorting. Every slot renders at
// the same width/aspect ratio regardless of how many slots share its row,
// so a crowded DEF/MID row doesn't squash its jerseys narrower than a
// sparser GK/FW row.
const JERSEY_PATH =
  'M26,4 L16,4 L6,10 L16,18 L16,44 L48,44 L48,18 L58,10 L48,4 L38,4 Q32,12 26,4 Z'

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
      className={`relative flex aspect-[4/3] w-full min-w-0 flex-col items-center justify-center text-center transition-transform ${
        onClick ? 'cursor-pointer hover:scale-105' : ''
      }`}
    >
      <svg
        viewBox="0 0 64 48"
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
