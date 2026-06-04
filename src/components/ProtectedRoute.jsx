import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGroup } from '../context/GroupContext'

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
    </div>
  )
}

// Requiert une session. Si requireGroup, requiert aussi l'appartenance à un groupe.
export default function ProtectedRoute({ children, requireGroup = true }) {
  const { user, loading: authLoading } = useAuth()
  const { group, loading: groupLoading } = useGroup()

  if (authLoading) return <Loader />
  if (!user) return <Navigate to="/auth" replace />

  if (requireGroup) {
    if (groupLoading) return <Loader />
    if (!group) return <Navigate to="/join" replace />
  }

  return children
}
