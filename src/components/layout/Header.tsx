import { Link, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '@/services/firebase'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { TrophyMark } from '@/components/shared/Logo'

const NAV = [
  { to: '/',            label: 'Home'         },
  { to: '/tournament',  label: 'Tournament'   },
  { to: '/predictions', label: 'Predict'      },
  { to: '/results',     label: 'Results'      },
  { to: '/participants',label: 'Participants'  },
]

export function Header() {
  const { pathname } = useLocation()
  const { firebaseUser, userRecord, isAdmin } = useCurrentUser()

  const displayName = userRecord?.participantName ?? ''
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <header className="bg-navy-900 text-white sticky top-0 z-50" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
      <div className="max-w-6xl mx-auto px-5 grid grid-cols-[1fr_auto_1fr] items-center h-14">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 text-white">
          <img
            src={`${import.meta.env.BASE_URL}wc2026-logo.png`}
            alt="WC 2026"
            height={38}
            style={{ height: 38, width: 'auto' }}
            onError={e => {
              // Fallback to SVG mark if image not found
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              (e.currentTarget.nextSibling as HTMLElement | null)?.style.setProperty('display', 'flex')
            }}
          />
          <span style={{ display: 'none' }}>
            <TrophyMark height={34} />
          </span>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-display font-bold text-lg tracking-wide text-white leading-none">WC 2026</span>
            <span className="text-[9px] tracking-[0.18em] text-white/50 uppercase leading-none mt-0.5">Sweepstakes</span>
          </div>
          <span className="sm:hidden font-display font-bold text-base text-white">WC26</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center justify-center gap-0.5">
          {NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === to
                  ? 'bg-brand-600 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              }`}
            >
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === '/admin'
                  ? 'bg-brand-600 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        {/* Auth */}
        <div className="flex items-center justify-end gap-3">
          {firebaseUser ? (
            <>
              {displayName && (
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white">
                    {initial}
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {displayName}
                  </span>
                </div>
              )}
              <button
                onClick={() => signOut(auth)}
                className="ml-5 text-xs font-medium transition-colors rounded-md px-2.5 py-1 border"
                style={{ color: 'rgba(255,255,255,0.45)', borderColor: 'rgba(255,255,255,0.12)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'white'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)' }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-md px-3 py-1.5 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
