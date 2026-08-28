import { createContext, useContext, type ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { useAuthContext } from './AuthContext'
import { useTeam } from '../hooks/useTeam'
import type { MemberRole, Team } from '../types'

interface TeamContextValue {
  team: Team | null
  role: MemberRole | null
  loading: boolean
}

const TeamContext = createContext<TeamContextValue | undefined>(undefined)

export function TeamProvider({ children }: { children: ReactNode }) {
  const { teamId } = useParams<{ teamId: string }>()
  const { user } = useAuthContext()
  const { team, role, loading } = useTeam(teamId, user?.uid)

  return <TeamContext.Provider value={{ team, role, loading }}>{children}</TeamContext.Provider>
}

export function useTeamContext() {
  const context = useContext(TeamContext)
  if (!context) {
    throw new Error('useTeamContext must be used within a TeamProvider')
  }
  return context
}
