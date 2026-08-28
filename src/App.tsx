import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { TeamProvider } from './contexts/TeamContext'
import { EventDetailPage } from './routes/EventDetailPage'
import { ForgotPasswordPage } from './routes/ForgotPasswordPage'
import { LineupPage } from './routes/LineupPage'
import { LoginPage } from './routes/LoginPage'
import { PlayerDetailPage } from './routes/PlayerDetailPage'
import { RsvpPage } from './routes/RsvpPage'
import { SchedulePage } from './routes/SchedulePage'
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
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="schedule/:eventId" element={<EventDetailPage />} />
              <Route path="schedule/:eventId/rsvp" element={<RsvpPage />} />
              <Route path="schedule/:eventId/lineup" element={<LineupPage />} />
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
