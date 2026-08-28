import { useDroppable } from '@dnd-kit/core'
import type { FormationSlot, Player } from '../../types'
import { PlayerChip } from './PlayerChip'

export function PitchSlot({
  slot,
  player,
  dragId,
}: {
  slot: FormationSlot
  player: Player | null
  dragId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${slot.id}` })

  return (
    <div
      ref={setNodeRef}
      className={`flex h-12 min-w-0 max-w-16 flex-1 flex-col items-center justify-center overflow-hidden rounded-md border-2 border-dashed p-1 text-center transition-colors ${
        isOver ? 'border-white bg-white/30' : 'border-white/40'
      }`}
    >
      {player && dragId ? (
        <PlayerChip dragId={dragId} player={player} compact />
      ) : (
        <span className="text-[10px] font-semibold text-white/90">{slot.label}</span>
      )}
    </div>
  )
}
