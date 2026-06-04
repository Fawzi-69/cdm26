import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Auth from './pages/Auth'
import Join from './pages/Join'
import Dashboard from './pages/Dashboard'
import Leaderboard from './pages/Leaderboard'
import MyBets from './pages/MyBets'

function Shell({ children, requireGroup = true }) {
  return (
    <ProtectedRoute requireGroup={requireGroup}>
      <div className="min-h-screen pb-20 sm:pb-8">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
      </div>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/join"
        element={
          <Shell requireGroup={false}>
            <Join />
          </Shell>
        }
      />
      <Route
        path="/dashboard"
        element={
          <Shell>
            <Dashboard />
          </Shell>
        }
      />
      <Route
        path="/leaderboard"
        element={
          <Shell>
            <Leaderboard />
          </Shell>
        }
      />
      <Route
        path="/my-bets"
        element={
          <Shell>
            <MyBets />
          </Shell>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
