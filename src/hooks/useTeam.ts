import { onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { memberDoc, teamDoc } from '../firebase/firestore'
import type { MemberRole, Team } from '../types'

export function useTeam(teamId: string | undefined, uid: string | undefined) {
  const [team, setTeam] = useState<Team | null>(null)
  const [role, setRole] = useState<MemberRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teamId) {
      setTeam(null)
      setRole(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubTeam = onSnapshot(teamDoc(teamId), (snap) => {
      setTeam(snap.exists() ? ({ id: snap.id, ...snap.data() } as Team) : null)
      setLoading(false)
    })

    let unsubMember = () => {}
    if (uid) {
      unsubMember = onSnapshot(memberDoc(teamId, uid), (snap) => {
        setRole(snap.exists() ? (snap.data().role as MemberRole) : null)
      })
    }

    return () => {
      unsubTeam()
      unsubMember()
    }
  }, [teamId, uid])

  return { team, role, loading }
}
