import { NavLink, Outlet, useParams } from 'react-router-dom'
import { useTeamContext } from '../../contexts/TeamContext'
import { TopBar } from './TopBar'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`

export function AppShell() {
  const { teamId } = useParams<{ teamId: string }>()
  const { team, loading } = useTeamContext()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <TopBar subtitle={loading ? 'Loading team…' : (team?.name ?? 'Unknown team')} />
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
          <NavLink to={`/teams/${teamId}/attendance`} className={navLinkClass}>
            Attendance
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
