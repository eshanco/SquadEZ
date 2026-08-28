import { onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { lineupDoc } from '../firebase/firestore'
import type { Lineup } from '../types'

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

    setLoading(true)
    setError(null)
    const unsubscribe = onSnapshot(
      lineupDoc(teamId, eventId),
      (snap) => {
        setLineup(snap.exists() ? (snap.data() as Lineup) : null)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [teamId, eventId])

  return { lineup, loading, error }
}
