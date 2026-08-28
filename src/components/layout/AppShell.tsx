import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { signOut } from '../../firebase/auth'
import { useTeamContext } from '../../contexts/TeamContext'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`

export function AppShell() {
  const { teamId } = useParams<{ teamId: string }>()
  const { team, loading } = useTeamContext()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <NavLink to="/teams" className="text-lg font-semibold text-emerald-700">
              SquadEZ
            </NavLink>
            <span className="text-sm text-slate-400">
              {loading ? 'Loading team…' : (team?.name ?? 'Unknown team')}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 pb-2">
          <NavLink to={`/teams/${teamId}`} end className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to={`/teams/${teamId}/squad`} className={navLinkClass}>
            Squad
          </NavLink>
          <NavLink to={`/teams/${teamId}/schedule`} className={navLinkClass}>
            Schedule
          </NavLink>
          <NavLink to={`/teams/${teamId}/settings`} className={navLinkClass}>
            Settings
          </NavLink>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
