import { Navigate } from 'react-router-dom'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { auth } from '@/services/firebase'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { AppShell } from '@/components/layout/AppShell'

export function LoginPage() {
  const { firebaseUser, isLoading } = useCurrentUser()

  if (!isLoading && firebaseUser) {
    return <Navigate to="/" replace />
  }

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch {
      // sign-in errors are surfaced by Firebase's own UI (e.g. popup closed)
    }
  }

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="card p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">⚽</div>
          <h1 className="text-2xl font-bold text-navy-900 mb-2">WC 2026 Sweepstakes</h1>
          <p className="text-gray-500 text-sm mb-6">
            Sign in to submit predictions and see the leaderboard.
          </p>
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            Sign in with Google
          </button>
          <p className="text-xs text-gray-500 mt-4">
            Only colleagues with a linked account can submit predictions.
          </p>
        </div>
      </div>
    </AppShell>
  )
}
