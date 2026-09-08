import type { FormationSlot, Player } from '../../types'

// A short-sleeve jersey silhouette (v-neck, two sleeves), traced in a 64x64
// box so it scales cleanly at any slot size.
const JERSEY_PATH =
  'M26,4 L16,4 L2,14 L10,26 L18,22 L18,60 L46,60 L46,22 L54,26 L62,14 L48,4 L38,4 Q32,12 26,4 Z'

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
      className={`relative flex h-[6rem] min-w-0 max-w-[9rem] flex-1 flex-col items-center justify-center text-center transition-transform ${
        onClick ? 'cursor-pointer hover:scale-105' : ''
      }`}
    >
      <svg
        viewBox="0 0 64 64"
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
          <span className="w-full truncate text-sm font-bold leading-tight text-emerald-800">
            {displayName ?? player.firstName}
          </span>
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
