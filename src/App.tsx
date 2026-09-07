import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { TeamProvider } from './contexts/TeamContext'
import { AttendancePage } from './routes/AttendancePage'
import { EventDetailPage } from './routes/EventDetailPage'
import { ForgotPasswordPage } from './routes/ForgotPasswordPage'
import { LineupsPage } from './routes/LineupsPage'
import { LoginPage } from './routes/LoginPage'
import { PlayerDetailPage } from './routes/PlayerDetailPage'
import { SignupPage } from './routes/SignupPage'
import { SquadPage } from './routes/SquadPage'
import { TeamDashboardPage } from './routes/TeamDashboardPage'
import { TeamSettingsPage } from './routes/TeamSettingsPage'
import { TeamsListPage } from './routes/TeamsListPage'

function TeamLayout() {
  return (
    <TeamProvider>
      <AppShell />
    </TeamProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/teams" element={<TeamsListPage />} />

            <Route path="/teams/:teamId" element={<TeamLayout />}>
              <Route index element={<TeamDashboardPage />} />
              <Route path="squad" element={<SquadPage />} />
              <Route path="squad/:playerId" element={<PlayerDetailPage />} />
              <Route path="events/:eventId" element={<EventDetailPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="attendance/:eventId" element={<AttendancePage />} />
              <Route path="lineup" element={<LineupsPage />} />
              <Route path="lineup/:eventId" element={<LineupsPage />} />
              <Route path="settings" element={<TeamSettingsPage />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/teams" replace />} />
          <Route path="*" element={<Navigate to="/teams" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
