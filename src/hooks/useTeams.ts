import { collectionGroup, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '../firebase/config'
import { teamDoc } from '../firebase/firestore'
import type { MemberRole, Team } from '../types'

export interface TeamMembership {
  team: Team
  role: MemberRole
}

export function useTeams(uid: string | undefined) {
  const [memberships, setMemberships] = useState<TeamMembership[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setMemberships([])
      setLoading(false)
      return
    }

    setLoading(true)
    const membershipsQuery = query(collectionGroup(db, 'members'), where('uid', '==', uid))

    const unsubscribe = onSnapshot(membershipsQuery, async (snapshot) => {
      const results = await Promise.all(
        snapshot.docs.map(async (memberSnap) => {
          const teamId = memberSnap.ref.parent.parent?.id
          if (!teamId) return null
          const teamSnap = await getDoc(teamDoc(teamId))
          if (!teamSnap.exists()) return null
          return {
            team: { id: teamSnap.id, ...teamSnap.data() } as Team,
            role: memberSnap.data().role as MemberRole,
          }
        }),
      )
      setMemberships(results.filter((m): m is TeamMembership => m !== null))
      setLoading(false)
    })

    return unsubscribe
  }, [uid])

  return { memberships, loading }
}
