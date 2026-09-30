import { getDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { lineupDoc, rsvpDoc } from '../firebase/firestore'
import { useEvents } from './useEvents'
import type { Lineup, Rsvp, TeamEvent } from '../types'

export interface PlayedGame {
  event: TeamEvent
  minutes: number
}

export interface PlayerStats {
  gamesPlayed: PlayedGame[]
  gamesMissed: TeamEvent[]
  minutesPlayed: number
  totalTrainingSessions: number
  trainingAttended: number
  missedTraining: TeamEvent[]
}

// Single-player counterpart to useAttendanceStats, using the same rules:
// training counts past non-cancelled practices with a 'yes' RSVP, and a game
// counts as played if the player was in the lineup for at least one period.
// Like that hook, it's a one-time snapshot rather than live-synced.
export function usePlayerStats(teamId: string | undefined, playerId: string | undefined) {
  const { events, loading: eventsLoading } = useEvents(teamId)
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!teamId || !playerId || eventsLoading) return

    let cancelled = false
    setLoading(true)
    setError(null)

    async function run() {
      try {
        const now = Date.now()
        const pastEvents = events.filter((e) => e.startAt < now)
        const trainingEvents = pastEvents.filter((e) => e.type === 'practice' && !e.cancelled)
        const matchEvents = pastEvents.filter((e) => e.type === 'game')

        const rsvpSnaps = await Promise.all(
          trainingEvents.map((e) => getDoc(rsvpDoc(teamId as string, e.id, playerId as string))),
        )
        const missedTraining = trainingEvents
          .filter((_, i) => (rsvpSnaps[i].data() as Rsvp | undefined)?.status !== 'yes')
          .sort((a, b) => b.startAt - a.startAt)

        const lineupSnaps = await Promise.all(
          matchEvents.map((e) => getDoc(lineupDoc(teamId as string, e.id))),
        )
        const gamesPlayed: PlayedGame[] = []
        const gamesMissed: TeamEvent[] = []
        matchEvents.forEach((event, i) => {
          const snap = lineupSnaps[i]
          const lineup = snap.exists() ? (snap.data() as Lineup) : null
          let played = false
          let minutes = 0
          for (const period of lineup?.periods ?? []) {
            if (period.assignments.some((a) => a.playerId === playerId)) {
              played = true
              minutes += period.durationMinutes || 0
            }
          }
          if (played) gamesPlayed.push({ event, minutes })
          // A cancelled game wasn't played by anyone, so it isn't "missed".
          else if (!event.cancelled) gamesMissed.push(event)
        })
        gamesPlayed.sort((a, b) => b.event.startAt - a.event.startAt)
        gamesMissed.sort((a, b) => b.startAt - a.startAt)
        const minutesPlayed = gamesPlayed.reduce((sum, g) => sum + g.minutes, 0)

        if (cancelled) return
        setStats({
          gamesPlayed,
          gamesMissed,
          minutesPlayed,
          totalTrainingSessions: trainingEvents.length,
          trainingAttended: trainingEvents.length - missedTraining.length,
          missedTraining,
        })
        setLoading(false)
      } catch (err) {
        if (!cancelled) {
          setError(err as Error)
          setLoading(false)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [teamId, playerId, events, eventsLoading])

  return { stats, loading: loading || eventsLoading, error }
}
