import { onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { rsvpsCollection } from '../firebase/firestore'
import type { Rsvp } from '../types'

export function useRsvps(teamId: string | undefined, eventId: string | undefined) {
  const [rsvps, setRsvps] = useState<Rsvp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teamId || !eventId) {
      setRsvps([])
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = onSnapshot(rsvpsCollection(teamId, eventId), (snapshot) => {
      setRsvps(snapshot.docs.map((d) => d.data() as Rsvp))
      setLoading(false)
    })

    return unsubscribe
  }, [teamId, eventId])

  return { rsvps, loading }
}
