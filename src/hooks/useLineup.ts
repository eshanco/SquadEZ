import { getDoc } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { lineupDoc } from '../firebase/firestore'
import type { Lineup } from '../types'

// Loaded once (not a live onSnapshot listener) - a lineup is edited as a
// local draft (periods added, players dragged around) and only persisted on
// an explicit Save. A live listener would re-fire on every server round
// trip of the *initial* load and silently reset any in-progress, unsaved
// edits back to whatever's currently in Firestore.
export function useLineup(teamId: string | undefined, eventId: string | undefined) {
  const [lineup, setLineup] = useState<Lineup | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!teamId || !eventId) {
      setLineup(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getDoc(lineupDoc(teamId, eventId))
      .then((snap) => {
        if (cancelled) return
        setLineup(snap.exists() ? (snap.data() as Lineup) : null)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [teamId, eventId])

  return { lineup, loading, error }
}
