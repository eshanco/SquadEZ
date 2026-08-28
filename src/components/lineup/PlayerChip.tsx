import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Player } from '../../types'

export function PlayerChip({
  dragId,
  player,
  compact,
}: {
  dragId: string
  player: Player
  compact?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: dragId })
  const style = { transform: CSS.Translate.toString(transform) }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`cursor-grab touch-none select-none rounded-md border border-emerald-300 bg-white px-2 py-1 text-xs font-medium text-slate-800 shadow-sm active:cursor-grabbing ${
        isDragging ? 'opacity-40' : ''
      } ${compact ? 'w-full text-center' : ''}`}
    >
      #{player.jerseyNumber} {player.firstName}
    </div>
  )
}
