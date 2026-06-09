import { useState, useEffect } from 'react'
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
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const displayName = userRecord?.participantName ?? ''
  const initial = displayName.charAt(0).toUpperCase()

  const allNavLinks = [...NAV, ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : [])]

  return (
    <header className="bg-navy-900 text-white sticky top-0 z-50" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
      <div className="max-w-6xl mx-auto px-5 flex items-center h-14">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 text-white flex-shrink-0">
          <img
            src={`${import.meta.env.BASE_URL}wc2026-logo.png`}
            alt="WC 2026"
            height={38}
            style={{ height: 38, width: 'auto' }}
            onError={e => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              (e.currentTarget.nextSibling as HTMLElement | null)?.style.setProperty('display', 'flex')
            }}
          />
          <span style={{ display: 'none' }}>
            <TrophyMark height={34} />
          </span>
          <div className="flex flex-col leading-none">
            <span className="font-display font-bold text-lg tracking-wide text-white leading-none">WC 2026</span>
            <span className="text-[9px] tracking-[0.18em] text-white/50 uppercase leading-none mt-0.5">Sweepstakes</span>
          </div>
        </Link>

        {/* Desktop navigation — centred */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-0.5">
          {allNavLinks.map(({ to, label }) => (
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
        </nav>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center justify-end gap-3 flex-shrink-0">
          {firebaseUser ? (
            <>
              {displayName && (
                <div className="flex items-center gap-2">
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

        {/* Mobile right — avatar initial + burger */}
        <div className="md:hidden flex items-center gap-3 ml-auto">
          {firebaseUser && displayName && (
            <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {initial}
            </div>
          )}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile overlay drawer */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMenuOpen(false)}
          />
          {/* Drawer panel */}
          <div className="md:hidden fixed top-0 right-0 h-full w-72 bg-navy-900 z-50 flex flex-col shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 h-14 border-b border-white/10 shrink-0">
              <span className="font-display font-bold text-white text-base">Menu</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1.5 rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
              {allNavLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    pathname === to
                      ? 'bg-brand-600 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/8'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Auth at bottom */}
            <div className="px-5 py-4 border-t border-white/10 shrink-0">
              {firebaseUser ? (
                <div className="flex items-center justify-between">
                  {displayName && (
                    <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {displayName}
                    </span>
                  )}
                  <button
                    onClick={() => signOut(auth)}
                    className="text-xs font-medium rounded-md px-2.5 py-1 border transition-colors"
                    style={{ color: 'rgba(255,255,255,0.45)', borderColor: 'rgba(255,255,255,0.12)' }}
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="block w-full text-center text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-md px-3 py-2 transition-colors"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  )
}
