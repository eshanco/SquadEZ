import { onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { lineupTemplatesCollection } from '../firebase/firestore'
import type { LineupTemplate } from '../types'

export function useLineupTemplates(teamId: string | undefined) {
  const [templates, setTemplates] = useState<LineupTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!teamId) {
      setTemplates([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const templatesQuery = query(lineupTemplatesCollection(teamId), orderBy('createdAt'))
    const unsubscribe = onSnapshot(
      templatesQuery,
      (snapshot) => {
        setTemplates(
          snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LineupTemplate, 'id'>) })),
        )
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [teamId])

  return { templates, loading, error }
}
