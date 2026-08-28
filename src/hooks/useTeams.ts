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
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!uid) {
      setMemberships([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const membershipsQuery = query(collectionGroup(db, 'members'), where('uid', '==', uid))

    const unsubscribe = onSnapshot(
      membershipsQuery,
      { includeMetadataChanges: true },
      async (snapshot) => {
        // Skip snapshots reflecting this client's own not-yet-server-
        // confirmed write (e.g. the member doc just created by
        // TeamsListPage): reading the matching team doc below would race
        // against that write actually committing and get denied by
        // isTeamMember(), even though it succeeds moments later once
        // `includeMetadataChanges` delivers the confirmed snapshot.
        if (snapshot.metadata.hasPendingWrites) return

        // onSnapshot doesn't await this callback, so a rejection here (e.g.
        // from getDoc below) would otherwise become an unhandled promise
        // rejection instead of reaching the caller via the error state.
        try {
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
        } catch (err) {
          setError(err as Error)
          setLoading(false)
        }
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [uid])

  return { memberships, loading, error }
}
