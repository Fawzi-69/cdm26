import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGroup } from '../context/GroupContext'

const links = [
  { to: '/dashboard', label: 'Matchs', icon: '⚽' },
  { to: '/leaderboard', label: 'Classement', icon: '🏆' },
  { to: '/my-bets', label: 'Mes pronos', icon: '🎯' },
]

export default function Navbar() {
  const { user, signOut } = useAuth()
  const { group, membership } = useGroup()
  const navigate = useNavigate()

  if (!user) return null

  const linkClass = ({ isActive }) =>
    `flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium sm:flex-row sm:gap-1.5 sm:text-sm ${
      isActive ? 'text-brand' : 'text-slate-500 hover:text-brand'
    }`

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-brand text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚽</span>
            <div className="leading-tight">
              <p className="font-extrabold tracking-tight">CDM26</p>
              {group && (
                <p className="text-[11px] text-white/80">
                  {group.name} · <span className="font-mono">{group.code}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {membership && (
              <span className="hidden text-sm sm:inline">
                {membership.username} · <b>{Number(membership.total_points || 0)} pts</b>
              </span>
            )}
            <button
              onClick={async () => {
                await signOut()
                navigate('/auth')
              }}
              className="rounded-lg bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25"
            >
              Quitter
            </button>
          </div>
        </div>
      </header>

      {/* Bottom nav (mobile-first) */}
      <nav className="fixed bottom-0 left-0 z-20 w-full border-t border-slate-200 bg-white sm:static sm:border-0 sm:bg-transparent">
        <div className="mx-auto flex max-w-3xl items-center justify-around sm:justify-center sm:gap-6 sm:py-2">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              <span className="text-base">{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
