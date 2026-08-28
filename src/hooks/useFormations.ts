import { onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { formationsCollection } from '../firebase/firestore'
import type { CustomFormationDoc, Formation } from '../types'
import { customFormationToFormation, DEFAULT_FORMATIONS } from '../utils/formations'

export function useFormations(teamId: string | undefined) {
  const [customFormations, setCustomFormations] = useState<Formation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!teamId) {
      setCustomFormations([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const formationsQuery = query(formationsCollection(teamId), orderBy('createdAt'))
    const unsubscribe = onSnapshot(
      formationsQuery,
      (snapshot) => {
        setCustomFormations(
          snapshot.docs.map((d) =>
            customFormationToFormation(d.id, d.data() as CustomFormationDoc),
          ),
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

  return { formations: [...DEFAULT_FORMATIONS, ...customFormations], loading, error }
}
