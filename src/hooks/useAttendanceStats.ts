import { getDoc, getDocs } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { lineupDoc, rsvpsCollection } from '../firebase/firestore'
import { useEvents } from './useEvents'
import { usePlayers } from './usePlayers'
import type { Lineup, Rsvp } from '../types'

export interface PlayerTrainingStats {
  playerId: string
  attended: number
  missed: number
  percent: number
}

export interface PlayerMatchStats {
  playerId: string
  attended: number
  percent: number
  minutesPlayed: number
}

export interface AttendanceStats {
  totalTrainingSessions: number
  training: PlayerTrainingStats[]
  totalMatches: number
  matches: PlayerMatchStats[]
}

// Stats are computed as a one-time snapshot when this hook (re-)runs, not
// live-synced to RSVP/lineup edits elsewhere — accurate whenever the
// Attendance page is opened/reloaded, which is the pattern that matters for
// a stats summary rather than a moment-to-moment live view.
export function useAttendanceStats(teamId: string | undefined) {
  const { events, loading: eventsLoading } = useEvents(teamId)
  const { players, loading: playersLoading } = usePlayers(teamId)
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!teamId || eventsLoading || playersLoading) return

    let cancelled = false
    setLoading(true)
    setError(null)

    async function run() {
      try {
        const now = Date.now()
        const pastEvents = events.filter((e) => e.startAt < now)
        const trainingEvents = pastEvents.filter((e) => e.type === 'practice')
        const matchEvents = pastEvents.filter((e) => e.type === 'game')
        const activePlayers = players.filter((p) => p.active)

        const trainingAttended = new Map<string, number>()
        for (const event of trainingEvents) {
          const snap = await getDocs(rsvpsCollection(teamId as string, event.id))
          for (const rsvpDocSnap of snap.docs) {
            const data = rsvpDocSnap.data() as Rsvp
            if (data.status === 'yes') {
              trainingAttended.set(data.playerId, (trainingAttended.get(data.playerId) ?? 0) + 1)
            }
          }
        }

        // No RSVPs for matches - "attended" a match means the coach actually
        // placed the player in the lineup for at least one period, not a
        // pre-game RSVP (that's coordinated outside the app, e.g. WhatsApp).
        const matchAttended = new Map<string, number>()
        const matchMinutes = new Map<string, number>()
        for (const event of matchEvents) {
          const lineupSnap = await getDoc(lineupDoc(teamId as string, event.id))
          if (lineupSnap.exists()) {
            const lineup = lineupSnap.data() as Lineup
            const playedInThisMatch = new Set<string>()
            for (const period of lineup.periods) {
              for (const assignment of period.assignments) {
                playedInThisMatch.add(assignment.playerId)
                matchMinutes.set(
                  assignment.playerId,
                  (matchMinutes.get(assignment.playerId) ?? 0) + (period.durationMinutes || 0),
                )
              }
            }
            for (const playerId of playedInThisMatch) {
              matchAttended.set(playerId, (matchAttended.get(playerId) ?? 0) + 1)
            }
          }
        }

        if (cancelled) return

        const training: PlayerTrainingStats[] = activePlayers.map((p) => {
          const attended = trainingAttended.get(p.id) ?? 0
          return {
            playerId: p.id,
            attended,
            missed: trainingEvents.length - attended,
            percent: trainingEvents.length
              ? Math.round((attended / trainingEvents.length) * 100)
              : 0,
          }
        })

        const matches: PlayerMatchStats[] = activePlayers.map((p) => {
          const attended = matchAttended.get(p.id) ?? 0
          return {
            playerId: p.id,
            attended,
            percent: matchEvents.length ? Math.round((attended / matchEvents.length) * 100) : 0,
            minutesPlayed: matchMinutes.get(p.id) ?? 0,
          }
        })

        setStats({
          totalTrainingSessions: trainingEvents.length,
          training,
          totalMatches: matchEvents.length,
          matches,
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
  }, [teamId, events, players, eventsLoading, playersLoading])

  return {
    stats,
    players: players.filter((p) => p.active),
    loading: loading || eventsLoading || playersLoading,
    error,
  }
}
