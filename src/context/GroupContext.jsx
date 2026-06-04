import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const GroupContext = createContext(null)
const STORAGE_KEY = 'cdm26_group_id'

export function GroupProvider({ children }) {
  const { user } = useAuth()
  const [group, setGroup] = useState(null)
  const [membership, setMembership] = useState(null) // ma ligne group_members
  const [memberships, setMemberships] = useState([]) // tous mes groupes (pour le switch)
  const [loading, setLoading] = useState(true)

  async function loadGroups(preferredId) {
    if (!user) {
      setGroup(null)
      setMembership(null)
      setMemberships([])
      setLoading(false)
      return
    }
    setLoading(true)
    // Tous mes memberships + le groupe associé
    const { data: rows } = await supabase
      .from('group_members')
      .select('*, groups(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (!rows?.length) {
      setGroup(null)
      setMembership(null)
      setMemberships([])
      setLoading(false)
      return
    }

    const stored = preferredId || localStorage.getItem(STORAGE_KEY)
    const chosen = rows.find((m) => m.group_id === stored) || rows[0]

    setMemberships(rows)
    setMembership(chosen)
    setGroup(chosen.groups)
    localStorage.setItem(STORAGE_KEY, chosen.group_id)
    setLoading(false)
  }

  useEffect(() => {
    loadGroups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const value = {
    group,
    membership,
    memberships,
    loading,
    refreshGroup: loadGroups,
    selectGroup: (id) => loadGroups(id),
  }

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
}

export const useGroup = () => useContext(GroupContext)
