import { slotPositionGroup } from '../../utils/formations'
import type { FormationSlot, Player } from '../../types'
import { JerseySvg } from './JerseySvg'

export function PitchSlot({
  slot,
  player,
  jerseyColor,
  jerseyTrimColor,
  onClick,
  onRemove,
  displayName,
}: {
  slot: FormationSlot
  player: Player | null
  jerseyColor: string
  jerseyTrimColor: string
  onClick?: () => void
  onRemove?: () => void
  displayName?: string
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative flex w-full min-w-0 flex-col items-center gap-1 transition-transform ${
        onClick ? 'cursor-pointer hover:scale-105' : ''
      }`}
    >
      <JerseySvg
        color={jerseyColor}
        trimColor={jerseyTrimColor}
        muted={!player}
        className="h-10 w-10 drop-shadow-sm"
      />

      {player ? (
        <div className="w-full rounded-md bg-white/95 px-1.5 py-1 text-center shadow-sm">
          <p className="w-full truncate text-[11px] font-bold leading-tight text-slate-900">
            {displayName ?? player.firstName}
          </p>
          <p className="text-[9px] font-semibold uppercase leading-tight text-slate-500">
            {slotPositionGroup(slot)}
          </p>
        </div>
      ) : (
        <span className="text-[10px] font-semibold text-white/80">{slot.label}</span>
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
