import type { TeamEvent } from '../types'

export type ResultCode = 'W' | 'D' | 'L'

// Goals are stored as home/away, independent of which side this team played
// on - resolve that against homeAway to work out W/D/L from our perspective.
// Returns null for games with no full-time score entered yet.
export function resultFor(event: TeamEvent): { code: ResultCode; ourGoals: number; theirGoals: number } | null {
  const { fulltimeHome, fulltimeAway } = event.score ?? {}
  if (!event.homeAway || fulltimeHome == null || fulltimeAway == null) return null
  const ourGoals = event.homeAway === 'home' ? fulltimeHome : fulltimeAway
  const theirGoals = event.homeAway === 'home' ? fulltimeAway : fulltimeHome
  const code = ourGoals > theirGoals ? 'W' : ourGoals < theirGoals ? 'L' : 'D'
  return { code, ourGoals, theirGoals }
}

export const RESULT_BADGE_CLASS: Record<ResultCode, string> = {
  W: 'bg-emerald-100 text-emerald-700',
  D: 'bg-slate-200 text-slate-600',
  L: 'bg-red-100 text-red-700',
}
