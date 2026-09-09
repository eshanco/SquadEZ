import type { Player } from '../../types'
import { JerseySvg } from './JerseySvg'

export function PlayerChip({
  player,
  jerseyColor,
  jerseyTrimColor,
  displayName,
}: {
  player: Player
  jerseyColor: string
  jerseyTrimColor: string
  displayName?: string
}) {
  return (
    <div className="flex w-16 select-none flex-col items-center gap-1">
      <JerseySvg color={jerseyColor} trimColor={jerseyTrimColor} className="h-8 w-8 drop-shadow-sm" />
      <div className="w-full rounded-md border border-emerald-200 bg-white px-1 py-0.5 text-center shadow-sm">
        <p className="truncate text-[10px] font-bold leading-tight text-slate-900">
          {displayName ?? player.firstName}
        </p>
        <p className="truncate text-[9px] leading-tight text-slate-500">#{player.jerseyNumber}</p>
      </div>
    </div>
  )
}
