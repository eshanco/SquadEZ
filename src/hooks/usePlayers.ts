import { onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { playersCollection } from '../firebase/firestore'
import type { Player } from '../types'

export function usePlayers(teamId: string | undefined) {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!teamId) {
      setPlayers([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const playersQuery = query(playersCollection(teamId), orderBy('lastName'))
    const unsubscribe = onSnapshot(
      playersQuery,
      (snapshot) => {
        setPlayers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Player))
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [teamId])

  return { players, loading, error }
}
