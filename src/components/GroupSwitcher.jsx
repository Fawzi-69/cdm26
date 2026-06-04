import { useState } from 'react'
import { useGroup } from '../context/GroupContext'

// Bouton discret pour basculer entre ses groupes (visible si ≥ 2 groupes).
// Le changement recharge automatiquement les pronos/classement du groupe choisi.
export default function GroupSwitcher() {
  const { group, memberships, selectGroup } = useGroup()
  const [open, setOpen] = useState(false)

  if (!memberships || memberships.length < 2) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Changer de groupe"
        className="rounded-lg bg-white/15 px-2.5 py-1.5 text-sm hover:bg-white/25"
      >
        🔀
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl bg-white text-slate-700 shadow-lg ring-1 ring-slate-200">
            <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Mes groupes
            </p>
            {memberships.map((m) => {
              const active = m.group_id === group?.id
              return (
                <button
                  key={m.group_id}
                  onClick={() => {
                    selectGroup(m.group_id)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${
                    active ? 'font-bold text-brand' : ''
                  }`}
                >
                  <span className="truncate">{m.groups?.name}</span>
                  {active ? (
                    <span>✓</span>
                  ) : (
                    <span className="font-mono text-[11px] text-slate-400">{m.groups?.code}</span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
