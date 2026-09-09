import type { Team } from '../types'

export const DEFAULT_JERSEY_COLOR = '#059669'
export const DEFAULT_JERSEY_TRIM_COLOR = '#ffffff'

export function teamJerseyColors(team: Team | null) {
  return {
    color: team?.jerseyColor ?? DEFAULT_JERSEY_COLOR,
    trimColor: team?.jerseyTrimColor ?? DEFAULT_JERSEY_TRIM_COLOR,
  }
}
