import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from '../../firebase/auth'

export function TopBar({ subtitle }: { subtitle?: string }) {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3">
      <div className="flex items-center gap-3">
        <NavLink to="/teams" className="text-lg font-semibold text-emerald-700">
          SquadEZ
        </NavLink>
        {subtitle && <span className="text-sm text-slate-400">{subtitle}</span>}
      </div>
      <button
        onClick={handleSignOut}
        className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
      >
        Sign out
      </button>
    </div>
  )
}
