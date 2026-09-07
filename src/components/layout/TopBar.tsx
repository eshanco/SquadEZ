import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from '../../firebase/auth'
import type { TeamMembership } from '../../hooks/useTeams'

export function TopBar({
  subtitle,
  teams,
  currentTeamId,
}: {
  subtitle?: string
  teams?: TeamMembership[]
  currentTeamId?: string
}) {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <NavLink to="/teams" className="text-lg font-semibold text-emerald-700">
          EZSquad
        </NavLink>
        {subtitle && <span className="text-sm text-slate-400">{subtitle}</span>}
      </div>
      <div className="flex items-center gap-2">
        {teams && teams.length > 1 && (
          <select
            value={currentTeamId}
            onChange={(e) => navigate(`/teams/${e.target.value}`)}
            aria-label="Switch team"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700"
          >
            {teams.map(({ team }) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={handleSignOut}
          className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
