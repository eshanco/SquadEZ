import { useDroppable } from '@dnd-kit/core'
import type { FormationSlot, Player } from '../../types'
import { PlayerChip } from './PlayerChip'

export function PitchSlot({
  slot,
  player,
  dragId,
  onRemove,
  displayName,
}: {
  slot: FormationSlot
  player: Player | null
  dragId: string | null
  onRemove?: () => void
  displayName?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${slot.id}` })

  return (
    <div
      ref={setNodeRef}
      className={`relative flex h-12 min-w-0 max-w-16 flex-1 flex-col items-center justify-center rounded-md border-2 border-dashed p-1 text-center transition-colors ${
        isOver ? 'border-white bg-white/30' : 'border-white/40'
      }`}
    >
      {player && dragId ? (
        <>
          <div className="w-full overflow-hidden">
            <PlayerChip dragId={dragId} player={player} compact displayName={displayName} />
          </div>
          {onRemove && (
            <button
              onClick={onRemove}
              aria-label={`Move ${player.firstName} to bench`}
              title="Move to bench"
              className="absolute -right-1.5 -top-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-slate-500 text-[10px] leading-none text-white hover:bg-red-500"
            >
              ×
            </button>
          )}
        </>
      ) : (
        <span className="text-[10px] font-semibold text-white/90">{slot.label}</span>
      )}
    </div>
  )
}
