import { HashRouter, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { HomePage } from '@/pages/HomePage'
import { PredictionsPage } from '@/pages/PredictionsPage'
import { ParticipantsPage } from '@/pages/ParticipantsPage'
import { ResultsPage } from '@/pages/ResultsPage'
import { AdminPage } from '@/pages/AdminPage'
import { LoginPage } from '@/pages/LoginPage'
import { TournamentPage } from '@/pages/TournamentPage'
import { ParticipantClaimModal } from '@/components/auth/ParticipantClaimModal'
import { useCurrentUser } from '@/hooks/useCurrentUser'
function ParticipantClaimGate() {
  const { firebaseUser, userRecord, isLoading } = useCurrentUser()
  if (isLoading || !firebaseUser || !userRecord) return null
  if (userRecord.participantId) return null
  return <ParticipantClaimModal uid={firebaseUser.uid} />
}

export function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ParticipantClaimGate />
        <Routes>
          <Route path="/"             element={<HomePage />} />
          <Route path="/predictions"  element={<PredictionsPage />} />
          <Route path="/participants" element={<ParticipantsPage />} />
          <Route path="/results"      element={<ResultsPage />} />
          <Route path="/tournament"   element={<TournamentPage />} />
          <Route path="/admin"        element={<AdminPage />} />
          <Route path="/login"        element={<LoginPage />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  )
}
