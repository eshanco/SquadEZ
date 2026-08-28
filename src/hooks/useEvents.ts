import { onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { eventsCollection } from '../firebase/firestore'
import type { TeamEvent } from '../types'

export function useEvents(teamId: string | undefined) {
  const [events, setEvents] = useState<TeamEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teamId) {
      setEvents([])
      setLoading(false)
      return
    }

    setLoading(true)
    const eventsQuery = query(eventsCollection(teamId), orderBy('startAt'))
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      setEvents(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as TeamEvent))
      setLoading(false)
    })

    return unsubscribe
  }, [teamId])

  return { events, loading }
}
